import { NextResponse } from 'next/server'
import { Composio } from '@composio/core'

export const dynamic = 'force-dynamic'

// Created once in Composio dashboard — covers all apps the user can connect.
// This ID never changes. It is NOT per-user; the URL generated from it IS per-user.
const COMPOSIO_MCP_CONFIG_ID = '6ab87462-3ccb-4533-806c-81d9767f6160'

let _composio: Composio | null = null
function getClient(): Composio {
  if (!_composio) {
    _composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! })
  }
  return _composio
}

/**
 * POST /api/integrations/mcp-url
 * Body: { entity_id: string }
 *
 * Returns a per-user Composio MCP streamable HTTP URL.
 * The URL embeds the entity_id so Composio knows which user's
 * connected accounts to use — the client never sees the API key.
 *
 * The desktop app writes this URL into config.yaml under
 * mcp_servers.composio-integrations.url, using the path resolved
 * by getHermesHome() (mirrors hermes_constants.py resolution order).
 */
export async function POST(request: Request) {
  try {
    const { entity_id } = await request.json()

    if (!entity_id) {
      return NextResponse.json({ error: 'entity_id is required' }, { status: 400 })
    }

    const composio = getClient()

    // generate() returns a per-user-scoped MCP URL tied to the entity_id.
    // manuallyManageConnections: true means we manage connections via our
    // Integrations tab (OAuth flow) rather than Composio's chat-based auth.
    const instance = await composio.mcp.generate(entity_id, COMPOSIO_MCP_CONFIG_ID, {
      manuallyManageConnections: true,
    })

    return NextResponse.json({
      url: instance.url,
      headers: {
        'x-api-key': process.env.COMPOSIO_API_KEY!,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[mcp-url] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
