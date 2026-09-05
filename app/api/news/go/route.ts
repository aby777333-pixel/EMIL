import { NextResponse } from 'next/server'
import { cachedFetch, timeoutFetch } from '@/lib/data/hub'
import { isHttpUrl, verifyNewsSig } from '@/lib/news-link'

export const dynamic = 'force-dynamic'

// Outbound headline gateway (see lib/news-link.ts). Checks the publisher once
// per hour per URL and forwards the reader to the article when it answers, or
// to EMIL's "source unavailable" page when it blocks or times out.

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
const CHECK_TIMEOUT_MS = 7000
// Statuses that mean a human will also hit a wall.
const BLOCKED_STATUSES = new Set([401, 403, 404, 410, 451])

type Probe = { fetchedAt: string; reachable: boolean; status: number; reason: string }

async function probe(url: string): Promise<Probe> {
  const key = `newsgo_${Buffer.from(url).toString('base64url').slice(0, 120)}`
  return cachedFetch<Probe>(key, 3600, async () => {
    const fetchedAt = new Date().toISOString()
    try {
      const res = await timeoutFetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
      }, CHECK_TIMEOUT_MS)
      const status = res.status
      if (status >= 200 && status < 400) return { fetchedAt, reachable: true, status, reason: 'ok' }
      if (status === 403 || status === 503) {
        // Bot challenges (Cloudflare "Just a moment…") pass for real browsers —
        // do not report those as blocked.
        const body = (await res.text().catch(() => '')).slice(0, 20000).toLowerCase()
        if (body.includes('cf-chl') || body.includes('just a moment') || body.includes('challenge-platform') || body.includes('_cf_chl')) {
          return { fetchedAt, reachable: true, status, reason: 'bot-challenge' }
        }
      }
      if (BLOCKED_STATUSES.has(status)) return { fetchedAt, reachable: false, status, reason: `blocked_${status}` }
      if (status >= 500) return { fetchedAt, reachable: false, status, reason: `server_error_${status}` }
      return { fetchedAt, reachable: true, status, reason: `status_${status}` }
    } catch (e: any) {
      const aborted = e?.name === 'AbortError'
      return { fetchedAt, reachable: false, status: 0, reason: aborted ? 'timeout' : 'unreachable' }
    }
  })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const target = (url.searchParams.get('u') ?? '').trim()
  const sig = url.searchParams.get('s')
  const title = (url.searchParams.get('t') ?? '').slice(0, 200)
  if (!target || !isHttpUrl(target) || target.length > 2048) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })
  if (!verifyNewsSig(target, sig)) return NextResponse.json({ error: 'Link signature invalid — open the headline from EMIL News.' }, { status: 403 })

  let result: Probe
  try {
    result = await probe(target)
  } catch {
    result = { fetchedAt: new Date().toISOString(), reachable: false, status: 0, reason: 'unreachable' }
  }

  if (result.reachable) return NextResponse.redirect(target, 302)

  const fallback = new URL('/news/unavailable', url.origin)
  fallback.searchParams.set('u', target)
  fallback.searchParams.set('s', sig ?? '')
  fallback.searchParams.set('r', result.reason)
  if (title) fallback.searchParams.set('t', title)
  return NextResponse.redirect(fallback.toString(), 302)
}
