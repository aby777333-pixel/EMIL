import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UPSTOX_MARKET_FEED_PROTO } from '@/lib/india/upstox-proto'

export const dynamic = 'force-dynamic'

// Upstox live market data (v3) — server-side helper for the Live Feed panel.
//   fn=feed_authorize → one-time authorized wss:// URL for the browser client
//   fn=ltp            → REST last-traded-price snapshot (fallback / testing)
//   fn=proto          → the vendored official .proto schema for the decoder
// The access token never reaches the browser; the authorize endpoint returns a
// short-lived pre-authorized redirect URI, which is how Upstox supports
// browser websocket clients that cannot send Authorization headers.

const timeoutFetch = async (url: string, init: RequestInit = {}, ms = 10000): Promise<Response> => {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(req.url)
    const fn = url.searchParams.get('fn') ?? ''

    if (fn === 'proto') {
      return new Response(UPSTOX_MARKET_FEED_PROTO, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
    }

    const provider = await prisma.indiaApiProvider.findUnique({ where: { key: 'upstox' } })
    if (!provider?.accessToken) {
      return NextResponse.json({ error: 'not_configured', message: 'Add your Upstox daily access token in the Markets & API Hub first (tokens expire 03:30 IST).' }, { status: 409 })
    }
    const headers = { Authorization: `Bearer ${provider.accessToken}`, Accept: 'application/json' }

    if (fn === 'feed_authorize') {
      // v3 authorize endpoint, with v2 fallback for older app scopes.
      for (const endpoint of ['https://api.upstox.com/v3/feed/market-data-feed/authorize', 'https://api.upstox.com/v2/feed/market-data-feed/authorize']) {
        const res = await timeoutFetch(endpoint, { headers })
        const body = await res.json().catch(() => null)
        if (res.ok && body?.data?.authorized_redirect_uri) {
          return NextResponse.json({ ok: true, wssUrl: body.data.authorized_redirect_uri, via: endpoint.includes('/v3/') ? 'v3' : 'v2' })
        }
        if (res.status === 401) {
          await prisma.indiaApiProvider.update({ where: { id: provider.id }, data: { status: 'error', lastError: 'Upstox token rejected (401) — tokens expire daily at 03:30 IST.' } })
          return NextResponse.json({ error: 'token_expired', message: 'Upstox rejected the access token (401). Generate a fresh daily token and save it in the API Hub.' }, { status: 401 })
        }
      }
      return NextResponse.json({ error: 'authorize_failed', message: 'Upstox feed authorize failed on both v3 and v2 endpoints.' }, { status: 502 })
    }

    if (fn === 'ltp') {
      const keys = (url.searchParams.get('keys') ?? '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 50)
      if (keys.length === 0) return NextResponse.json({ error: 'keys parameter required (comma-separated instrument keys)' }, { status: 400 })
      const target = `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodeURIComponent(keys.join(','))}`
      const res = await timeoutFetch(target, { headers })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        return NextResponse.json({ error: 'upstream_error', status: res.status, message: body?.errors?.[0]?.message ?? `Upstox responded ${res.status}` }, { status: 502 })
      }
      return NextResponse.json({ ok: true, data: body?.data ?? {} })
    }

    return NextResponse.json({ error: `Unknown function "${fn}"` }, { status: 400 })
  } catch (e: any) {
    if (e?.name === 'AbortError') return NextResponse.json({ error: 'timeout', message: 'Upstox request timed out.' }, { status: 504 })
    console.error(e)
    return NextResponse.json({ error: 'Upstox request failed' }, { status: 500 })
  }
}
