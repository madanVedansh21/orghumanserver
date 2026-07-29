import { NextResponse } from 'next/server'
import { Composio } from '@composio/core'

export const dynamic = 'force-dynamic'

let _composio: Composio | null = null
function getClient(): Composio {
  if (!_composio) {
    _composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! })
  }
  return _composio
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const entity_id = searchParams.get('entity_id')?.trim()

    if (!entity_id) {
      return NextResponse.json({ error: 'entity_id is required' }, { status: 400 })
    }

    console.log(`[status] entity_id=${entity_id}`)

    const composio = getClient()
    const result = await composio.connectedAccounts.list({
      userIds: [entity_id],
    })

    const items: any[] = (result as any).items ?? (Array.isArray(result) ? result : [])

    const connected: string[] = items
      .filter((c: any) => c.status === 'ACTIVE')
      .map((c: any) => String(c.toolkit?.slug ?? c.toolkitSlug ?? c.appName ?? '').toLowerCase())
      .filter(Boolean)

    console.log(`[status] entity_id=${entity_id} connected=`, connected)
    return NextResponse.json({ connected })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[status] error:', message)
    return NextResponse.json({ connected: [], error: message })
  }
}
