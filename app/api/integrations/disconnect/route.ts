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

export async function POST(request: Request) {
  try {
    const { entity_id, app } = await request.json()

    if (!entity_id || !app) {
      return NextResponse.json({ error: 'entity_id and app are required' }, { status: 400 })
    }

    const composio = getClient()

    // 1. Find all active connections for this entity
    const result = await composio.connectedAccounts.list({ userIds: [entity_id] })
    const items: any[] = (result as any).items ?? (Array.isArray(result) ? result : [])
    
    // 2. Find the specific connection matching this app
    const connection = items.find(
      (c: any) =>
        c.status === 'ACTIVE' &&
        String(c.toolkit?.slug ?? c.toolkitSlug ?? c.appName ?? '').toLowerCase() === app.toLowerCase()
    )

    if (!connection) {
      // It's already disconnected or didn't exist
      return NextResponse.json({ ok: true })
    }

    // 3. Delete the connection from Composio
    await composio.connectedAccounts.delete(connection.id)
    
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[disconnect] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
