import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function handle(request: Request) {
  try {
    const url = new URL(request.url)
    
    // Reconstruct the destination URL
    // e.g. /api/mcp -> https://connect.composio.dev/mcp
    // /api/mcp/foo -> https://connect.composio.dev/mcp/foo
    const path = url.pathname.replace(/^\/api\/mcp/, '')
    const destUrl = `https://connect.composio.dev/mcp${path}${url.search}`

    console.log(`[mcp-proxy] Forwarding request to: ${destUrl}`)

    const headers = new Headers(request.headers)
    
    // Inject the master API key securely from our environment
    if (process.env.COMPOSIO_API_KEY) {
      headers.set('x-api-key', process.env.COMPOSIO_API_KEY)
    } else {
      console.warn('[mcp-proxy] Warning: COMPOSIO_API_KEY is not defined in environment variables.')
    }

    // Set host header correctly for the outgoing request
    headers.set('host', 'connect.composio.dev')

    // Read the body for forwarding (if applicable)
    let body: any = undefined
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer()
    }

    // Fetch from Composio
    const response = await fetch(destUrl, {
      method: request.method,
      headers: headers,
      body: body,
      // Pass-through credentials/redirects if any
      redirect: 'manual',
    })

    // Return the response as-is (including status, headers, and streamable body)
    const responseHeaders = new Headers(response.headers)
    // Remove headers that might interfere with Next.js/Vercel responses
    responseHeaders.delete('content-encoding')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[mcp-proxy] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH }
