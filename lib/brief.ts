// EMIL Morning Brief (spec §67–69, §15). A structured, per-user research brief
// composed ONLY from the data the hub already has (market board, the user's
// watchlist quotes, today's calendar, top headlines) — one LLM call, cached
// for the day. MODEL ASSESSMENT from DELAYED research data: never advice,
// never an order.

import { prisma } from '@/lib/db'
import { cachedFetch, marketBoard, watchlistQuotes, newsFeed, cryptoMarkets } from '@/lib/data/hub'
import { economicCalendar } from '@/lib/data/calendar'
import { llmJson } from '@/lib/teach/llm'

export type MorningBrief = {
  fetchedAt: string
  dateKey: string
  model: string
  headline: string
  oneLiner: string
  marketPulse: string[]
  watchlist: { symbol: string; note: string }[]
  calendar: { when: string; title: string; impact: string; country: string }[]
  risks: string[]
  researchIdeas: string[]
  inputs: { board: number; watchlist: number; calendar: number; headlines: number; crypto: number }
}

const MODEL = 'gpt-5.4-mini'

const SYSTEM = `You are EMIL, the research analyst inside a global multi-asset trading cockpit.
Write a concise MORNING BRIEF strictly from the data provided. Do not invent numbers or events.
Plain language, specific, no hype. Mark uncertainty ("may", "watch for"). Never tell the reader to buy or sell.
Return JSON:
{"headline": "<= 12 words", "oneLiner": "<= 30 words summarising the session set-up",
 "marketPulse": ["3-6 bullets, each <= 22 words, citing the moves given (percent changes)"],
 "watchlist": [{"symbol": "...", "note": "<= 18 words on what the data shows for this symbol"}],
 "calendar": [{"when": "HH:MM UTC or 'today'", "title": "...", "impact": "High|Medium", "country": "..."}],
 "risks": ["2-4 bullets on what could go wrong today, <= 20 words each"],
 "researchIdeas": ["2-4 research questions to investigate (NOT trades), <= 18 words each"]}`

function dateKeyUtc(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export async function morningBrief(userId: string, force = false): Promise<MorningBrief & { cached?: boolean; stale?: boolean }> {
  const dateKey = dateKeyUtc()
  const key = force ? `brief_${userId}_${dateKey}_r${Math.floor(Date.now() / 60000)}` : `brief_${userId}_${dateKey}`
  return cachedFetch(key, 6 * 3600, async () => {
    // ---- gather (best effort, parallel; the brief never fails on one feed) ----
    const items = await prisma.watchlistItem.findMany({ where: { userId }, select: { symbol: true } })
    const symbols = Array.from(new Set(items.map((i) => i.symbol))).slice(0, 8)
    const [board, wl, cal, news, crypto] = await Promise.all([
      marketBoard().catch(() => null),
      symbols.length ? watchlistQuotes(symbols).catch(() => null) : Promise.resolve(null),
      economicCalendar().catch(() => null),
      newsFeed('markets', 15).catch(() => null),
      cryptoMarkets(6).catch(() => null),
    ])
    const now = Date.now()
    const boardRows = ((board as any)?.data ?? []).filter((r: any) => r.available).map((r: any) => `${r.label}: ${r.price} (${r.changePct >= 0 ? '+' : ''}${Number(r.changePct).toFixed(2)}%)`)
    const wlRows = ((wl as any)?.data ?? []).filter((q: any) => q.available).map((q: any) => `${q.symbol}${q.name ? ` (${q.name})` : ''}: ${q.price} (${q.changePct >= 0 ? '+' : ''}${Number(q.changePct).toFixed(2)}%)`)
    const calRows = (((cal as any)?.data ?? []) as any[])
      .filter((e) => ['High', 'Medium'].includes(e.impact) && Date.parse(e.date) >= now - 2 * 3600e3 && Date.parse(e.date) <= now + 30 * 3600e3)
      .slice(0, 14)
      .map((e) => `${new Date(e.date).toISOString().slice(11, 16)} UTC · ${e.country} · ${e.title} · ${e.impact}${e.forecast ? ` · forecast ${e.forecast}` : ''}${e.previous ? ` · previous ${e.previous}` : ''}${e.actual ? ` · actual ${e.actual}` : ''}`)
    const newsRows = (((news as any)?.data ?? []) as any[]).slice(0, 15).map((a) => `${a.domain ?? ''}: ${a.title}`)
    const cryptoRows = (((crypto as any)?.data ?? []) as any[]).slice(0, 6).map((c) => `${c.symbol ?? c.name}: ${c.price ?? c.current_price} (${Number(c.changePct ?? c.price_change_percentage_24h ?? 0).toFixed(2)}% 24h)`)

    const user = [
      `Date (UTC): ${dateKey}`,
      `MARKET BOARD (delayed research quotes; index/commodity rows are ETF proxies):\n${boardRows.join('\n') || 'unavailable'}`,
      `USER WATCHLIST:\n${wlRows.join('\n') || 'empty'}`,
      `ECONOMIC CALENDAR (next ~30h, High/Medium):\n${calRows.join('\n') || 'none listed'}`,
      `CRYPTO (24h):\n${cryptoRows.join('\n') || 'unavailable'}`,
      `HEADLINES:\n${newsRows.join('\n') || 'unavailable'}`,
    ].join('\n\n')

    const out = await llmJson<Partial<MorningBrief>>(SYSTEM, user, 1800)
    const str = (v: unknown, n: number) => String(v ?? '').slice(0, n)
    const arr = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : [])
    return {
      fetchedAt: new Date().toISOString(), dateKey, model: MODEL,
      headline: str(out.headline, 120), oneLiner: str(out.oneLiner, 260),
      marketPulse: arr(out.marketPulse, 6).map((s) => str(s, 200)),
      watchlist: arr(out.watchlist, 8).map((w: any) => ({ symbol: str(w?.symbol, 24), note: str(w?.note, 160) })),
      calendar: arr(out.calendar, 10).map((c: any) => ({ when: str(c?.when, 20), title: str(c?.title, 90), impact: str(c?.impact, 10), country: str(c?.country, 8) })),
      risks: arr(out.risks, 4).map((s) => str(s, 160)),
      researchIdeas: arr(out.researchIdeas, 4).map((s) => str(s, 160)),
      inputs: { board: boardRows.length, watchlist: wlRows.length, calendar: calRows.length, headlines: newsRows.length, crypto: cryptoRows.length },
    }
  })
}
