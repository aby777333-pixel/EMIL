// EMIL NEWS — outbound link handling.
//
// Headlines come from open indexes (GDELT / Google News RSS) and some
// publishers block direct visitors (403 geo/bot walls) or simply time out.
// Instead of sending a user straight into a dead page, every headline links
// through /api/news/go, which checks the publisher first and either forwards
// to the article or lands on EMIL's "source unavailable" page with working
// alternatives (archived copy, headline search, try anyway).
//
// The go-link carries an HMAC of the destination so the endpoint can never be
// used as an open redirector.

import { createHmac, timingSafeEqual } from 'crypto'

const secret = () => process.env.NEXTAUTH_SECRET || process.env.EMIL_SECRETS_KEY || 'emil-news-link-dev-secret'

export function signNewsUrl(url: string): string {
  return createHmac('sha256', secret()).update(url).digest('hex').slice(0, 24)
}

export function verifyNewsSig(url: string, sig: string | null | undefined): boolean {
  if (!sig || sig.length !== 24) return false
  const expected = Buffer.from(signNewsUrl(url))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function isHttpUrl(u: string): boolean {
  try {
    const p = new URL(u)
    return p.protocol === 'https:' || p.protocol === 'http:'
  } catch {
    return false
  }
}

/** Build the /api/news/go href for a headline. */
export function newsGoLink(url: string, title?: string): string {
  const qs = new URLSearchParams({ u: url, s: signNewsUrl(url) })
  if (title) qs.set('t', title.slice(0, 200))
  return `/api/news/go?${qs.toString()}`
}

/** Attach `go` links to a feed's headline list (no-op for items without a valid URL). */
export function withGoLinks<T extends { url?: string; title?: string }>(items: T[]): (T & { go?: string })[] {
  return items.map((a) => (a?.url && isHttpUrl(a.url) ? { ...a, go: newsGoLink(a.url, a.title) } : a))
}
