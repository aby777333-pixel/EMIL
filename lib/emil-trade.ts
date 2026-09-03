// EMIL Trade — EMIL's native trading platform (a separate Next.js app that lives
// in this repo under /emil-trade and deploys to its own Netlify site).
// Every link to it must open in a NEW TAB so the cockpit stays put.
export const EMIL_TRADE_URL =
  (process.env.NEXT_PUBLIC_EMIL_TRADE_URL || 'https://emil-trade.netlify.app').replace(/\/+$/, '')

/** Deep link into the EMIL Trade terminal (optionally pre-selecting an account). */
export function emilTradeTerminalUrl(account?: string) {
  const u = `${EMIL_TRADE_URL}/terminal`
  return account ? `${u}?account=${encodeURIComponent(account)}` : u
}

export function openEmilTrade(path = '/terminal') {
  if (typeof window === 'undefined') return
  window.open(`${EMIL_TRADE_URL}${path.startsWith('/') ? path : `/${path}`}`, '_blank', 'noopener,noreferrer')
}
