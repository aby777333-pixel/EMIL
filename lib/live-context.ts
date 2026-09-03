// Live context for the EMIL AI Analyst (spec §15) — a compact, labelled block
// of what the cockpit knows RIGHT NOW: delayed research quotes for the board
// and the user's watchlist, the consolidated portfolio, EMIL's state, circuit
// breakers, the next hours of the calendar and the latest headlines. Every
// line is data the hub already cached; assembling it costs no new credits
// beyond the normal cached fetches. Used to ground Ask EMIL and briefs.

import { prisma } from '@/lib/db'
import { cachedFetch, marketBoard, watchlistQuotes, newsFeed } from '@/lib/data/hub'
import { economicCalendar } from '@/lib/data/calendar'
import { consolidatedPortfolio } from '@/lib/portfolio'
import { evaluateBreakers } from '@/lib/breakers'

export type LiveContext = { fetchedAt: string; text: string; sections: string[] }

const pctStr = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : '—' }

export async function liveContext(userId: string, isAdmin: boolean): Promise<LiveContext & { cached?: boolean; stale?: boolean }> {
  return cachedFetch(`live_ctx_${userId}_${isAdmin ? 'a' : 'u'}`, 60, async () => {
    const items = await prisma.watchlistItem.findMany({ where: { userId }, select: { symbol: true } })
    const symbols = Array.from(new Set(items.map((i) => i.symbol))).slice(0, 8)
    const [board, wl, cal, news, pf, br, state] = await Promise.all([
      marketBoard().catch(() => null),
      symbols.length ? watchlistQuotes(symbols).catch(() => null) : Promise.resolve(null),
      economicCalendar().catch(() => null),
      newsFeed('markets', 10).catch(() => null),
      consolidatedPortfolio(userId, isAdmin).catch(() => null),
      evaluateBreakers({ enforce: false }).catch(() => null),
      prisma.emilState.findFirst().catch(() => null),
    ])
    const now = Date.now()
    const sections: string[] = []
    const boardRows = ((board as any)?.data ?? []).filter((r: any) => r.available).map((r: any) => `${r.label}: ${r.price} (${pctStr(r.changePct)})`)
    if (boardRows.length) sections.push(`MARKET BOARD (delayed research quotes; index/commodity rows are ETF proxies): ${boardRows.join('; ')}`)
    const wlRows = ((wl as any)?.data ?? []).filter((q: any) => q.available).map((q: any) => `${q.symbol}: ${q.price} (${pctStr(q.changePct)})`)
    sections.push(`USER WATCHLIST: ${wlRows.join('; ') || 'empty or unavailable'}`)
    if (pf) {
      const ex = (pf as any).exposure
      const accts = ((pf as any).accounts ?? []).map((a: any) => `${a.label}${a.paper ? ' [paper]' : ' [LIVE]'}: ${a.equityUsd ?? a.balanceUsd ?? 'n/a'} USD, ${a.positions} pos${a.error ? ` (error: ${a.error})` : ''}`)
      const top = (ex?.bySymbol ?? []).slice(0, 5).map((r: any) => `${r.key} gross ${Math.round(r.gross)} net ${Math.round(r.net)}`)
      sections.push(`PORTFOLIO (approx USD): equity ${Math.round(ex?.equityTotal ?? 0)}, gross ${Math.round(ex?.grossTotal ?? 0)}, net ${Math.round(ex?.netTotal ?? 0)}, leverage ${ex?.leverage ? ex.leverage.toFixed(2) : 'n/a'}x, concentration ${Math.round((ex?.concentration ?? 0) * 100)}%. Accounts: ${accts.join(' | ') || 'none'}. Top exposures: ${top.join('; ') || 'none'}.`)
    }
    if (state) sections.push(`EMIL STATE: ${state.armed ? 'ARMED' : 'disarmed'}, mode ${state.mode}, guardian "${state.guardianDecision}", consensus ${state.agentConsensus}, volatility ${state.volatilityStatus}.`)
    if (br) sections.push(`CIRCUIT BREAKERS: ${br.tripped.length ? `TRIPPED: ${br.breakers.filter((b) => b.state === 'tripped').map((b) => `${b.label} (${b.value} vs ${b.threshold})`).join('; ')}` : 'all clear'}; warnings: ${br.breakers.filter((b) => b.state === 'warn').map((b) => b.label).join(', ') || 'none'}.`)
    const calRows = (((cal as any)?.data ?? []) as any[])
      .filter((e) => ['High', 'Medium'].includes(e.impact) && Date.parse(e.date) >= now - 3600e3 && Date.parse(e.date) <= now + 12 * 3600e3)
      .slice(0, 8)
      .map((e) => `${new Date(e.date).toISOString().slice(11, 16)}Z ${e.country} ${e.title} [${e.impact}]${e.actual ? ` actual ${e.actual}` : e.forecast ? ` fcst ${e.forecast}` : ''}`)
    sections.push(`CALENDAR next 12h: ${calRows.join('; ') || 'nothing high/medium'}`)
    const newsRows = (((news as any)?.data ?? []) as any[]).slice(0, 8).map((a) => `"${a.title}" (${a.domain ?? 'source'})`)
    if (newsRows.length) sections.push(`HEADLINES: ${newsRows.join('; ')}`)
    const fetchedAt = new Date().toISOString()
    return { fetchedAt, sections, text: `LIVE CONTEXT as of ${fetchedAt} (delayed research data, calculated views — not execution prices):\n${sections.join('\n')}`.slice(0, 7000) }
  })
}
