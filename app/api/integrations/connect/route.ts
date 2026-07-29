import { NextResponse } from 'next/server'
import { Composio } from '@composio/core'

// Force dynamic rendering — this route must never be statically generated
export const dynamic = 'force-dynamic'

// Lazy-initialize: client is created on first real request, not at build time
let _composio: Composio | null = null
function getClient(): Composio {
  if (!_composio) {
    _composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! })
  }
  return _composio
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { entity_id, app } = body as { entity_id?: string; app?: string }

    if (!entity_id?.trim()) {
      return NextResponse.json({ error: 'entity_id is required' }, { status: 400 })
    }
    if (!app?.trim()) {
      return NextResponse.json({ error: 'app is required' }, { status: 400 })
    }

    console.log(`[connect] entity_id=${entity_id} app=${app}`)

    const composio = getClient()

    // 1. Resolve app name to an actual AuthConfig ID
    const authConfigs = await composio.authConfigs.list()
    const config = authConfigs.items.find(c => c.toolkit?.slug === app.toLowerCase())
    if (!config) {
      return NextResponse.json(
        { error: `Auth config not found for '${app}'. Please enable it in the Composio Dashboard.` },
        { status: 404 }
      )
    }

    // 2. Link the entity to the auth config (v0.14.0 signature)
    const connectionRequest = await composio.connectedAccounts.link(
      entity_id,
      config.id,
    )

    const url =
      (connectionRequest as any).redirectUrl ??
      (connectionRequest as any).redirect_url ??
      (connectionRequest as any).url ??
      null

    if (!url) {
      console.error('[connect] No redirectUrl in response:', JSON.stringify(connectionRequest))
      return NextResponse.json(
        { error: 'Composio did not return a redirect URL' },
        { status: 502 }
      )
    }

    console.log(`[connect] redirectUrl=${url}`)
    return NextResponse.json({ url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[connect] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
