// Instrument research report (spec §67–69). CALCULATED statistics from the
// cached daily series (returns, range, volatility, drawdown, trend, RSI) plus
// live context (portfolio exposure, calendar, headlines) → one structured LLM
// write-up, saved to the research notebook. Model assessment from delayed
// research data; nothing here is advice or an order.

import { prisma } from '@/lib/db'
import { cachedFetch, timeSeries, newsFeed } from '@/lib/data/hub'
import { economicCalendar } from '@/lib/data/calendar'
import { resolveInstrument, toTwelveData } from '@/lib/instruments/catalog'
import { consolidatedPortfolio } from '@/lib/portfolio'
import { llmJson } from '@/lib/teach/llm'

export type ReportStats = {
  symbol: string; name: string | null; assetClass: string | null; exchange: string | null; currency: string | null
  last: number; asOf: string; bars: number
  ret1d: number | null; ret1w: number | null; ret1m: number | null; ret3m: number | null; ret1y: number | null
  hi52: number; lo52: number; rangePos: number // 0..1 where in the 52w range
  vol20: number | null; vol60: number | null // annualised realised volatility, %
  maxDd1y: number
  sma50: number | null; sma200: number | null; aboveSma50: boolean | null; aboveSma200: boolean | null; goldenCross: boolean | null
  rsi14: number | null
  atr14Pct: number | null
}

export type InstrumentReport = {
  fetchedAt: string; dateKey: string; model: string; noteId: string | null
  symbol: string; title: string
  summary: string
  sections: { heading: string; bullets: string[] }[]
  watch: string[]
  researchQuestions: string[]
  stats: ReportStats
  inputs: { news: number; calendar: number; portfolioExposureUsd: number | null }
}

const MODEL = 'gpt-5.4-mini'

const SYSTEM = `You are EMIL, the research analyst inside a multi-asset trading cockpit. Write an instrument RESEARCH REPORT strictly from the data provided.
Rules: every number you mention must come from the data; mark calculated statistics as given; never invent events; never tell the reader to buy, sell or size a position; describe what the data shows, what could change it, and what to research.
Return JSON:
{"title":"<= 12 words","summary":"<= 60 words",
 "sections":[{"heading":"Trend & momentum","bullets":["..."]},{"heading":"Volatility & range","bullets":["..."]},{"heading":"Context & positioning","bullets":["..."]},{"heading":"Catalysts (calendar)","bullets":["..."]},{"heading":"News read-through","bullets":["..."]},{"heading":"Risks","bullets":["..."]}],
 "watch":["3-5 concrete things to watch, <= 18 words each"],
 "researchQuestions":["2-4 questions to investigate next, <= 18 words each"]}
Bullets: 2-4 per section, <= 24 words each, plain language.`

function pctChange(closes: number[], back: number): number | null {
  const n = closes.length
  if (n <= back) return null
  const a = closes[n - 1 - back], b = closes[n - 1]
  return a ? ((b - a) / a) * 100 : null
}
function sma(v: number[], n: number) { return v.length >= n ? v.slice(-n).reduce((s, x) => s + x, 0) / n : null }
function annVol(closes: number[], n: number): number | null {
  if (closes.length < n + 1) return null
  const r: number[] = []
  for (let i = closes.length - n; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]))
  const m = r.reduce((s, x) => s + x, 0) / r.length
  const sd = Math.sqrt(r.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, r.length - 1))
  return sd * Math.sqrt(252) * 100
}
function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  let g = 0, l = 0
  for (let i = 1; i <= period; i++) { const d = closes[i] - closes[i - 1]; if (d > 0) g += d; else l -= d }
  g /= period; l /= period
  for (let i = period + 1; i < closes.length; i++) { const d = closes[i] - closes[i - 1]; g = (g * (period - 1) + Math.max(d, 0)) / period; l = (l * (period - 1) + Math.max(-d, 0)) / period }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l)
}
function maxDrawdown(closes: number[]): number {
  let peak = -Infinity, dd = 0
  for (const c of closes) { peak = Math.max(peak, c); dd = Math.max(dd, (peak - c) / peak) }
  return dd * 100
}

export function computeStats(symbol: string, def: ReturnType<typeof resolveInstrument>, bars: { time: string; open: number; high: number; low: number; close: number }[], meta: { exchange?: string | null; currency?: string | null }): ReportStats {
  const closes = bars.map((b) => b.close)
  const last = closes[closes.length - 1]
  const yr = bars.slice(-252)
  const hi52 = Math.max(...yr.map((b) => b.high)), lo52 = Math.min(...yr.map((b) => b.low))
  const s50 = sma(closes, 50), s200 = sma(closes, 200)
  const trs: number[] = []
  for (let i = Math.max(1, bars.length - 14); i < bars.length; i++) trs.push(Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - bars[i - 1].close), Math.abs(bars[i].low - bars[i - 1].close)))
  const atr = trs.length ? trs.reduce((s, x) => s + x, 0) / trs.length : null
  return {
    symbol, name: def?.name ?? null, assetClass: def?.assetClass ?? null, exchange: meta.exchange ?? def?.exchange ?? null, currency: meta.currency ?? def?.currency ?? null,
    last, asOf: bars[bars.length - 1].time, bars: bars.length,
    ret1d: pctChange(closes, 1), ret1w: pctChange(closes, 5), ret1m: pctChange(closes, 21), ret3m: pctChange(closes, 63), ret1y: pctChange(closes, Math.min(251, closes.length - 1)),
    hi52, lo52, rangePos: hi52 > lo52 ? (last - lo52) / (hi52 - lo52) : 0.5,
    vol20: annVol(closes, 20), vol60: annVol(closes, 60), maxDd1y: maxDrawdown(yr.map((b) => b.close)),
    sma50: s50, sma200: s200, aboveSma50: s50 ? last > s50 : null, aboveSma200: s200 ? last > s200 : null, goldenCross: s50 && s200 ? s50 > s200 : null,
    rsi14: rsi(closes, 14), atr14Pct: atr ? (atr / last) * 100 : null,
  }
}

const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? 'n/a' : v.toFixed(d))

export async function instrumentReport(userId: string, isAdmin: boolean, input: string, force = false): Promise<InstrumentReport & { cached?: boolean; stale?: boolean }> {
  const def = resolveInstrument(input)
  const td = toTwelveData(input)
  const key = def?.key ?? td.symbol
  const dateKey = new Date().toISOString().slice(0, 10)
  const cacheKey = `report_${userId}_${key}_${dateKey}${force ? `_r${Math.floor(Date.now() / 60000)}` : ''}`
  return cachedFetch(cacheKey, 6 * 3600, async () => {
    const series: any = await timeSeries(td.symbol, '1day', 300)
    if (series?.needsKey) throw new Error(series.message)
    const bars = (series?.data ?? []).filter((b: any) => Number.isFinite(b.close))
    if (bars.length < 30) throw new Error(`Not enough daily history for ${td.symbol} (${bars.length} bars).`)
    const stats = computeStats(key, def, bars, { exchange: series.exchange, currency: series.currency })

    const [news, cal, pf] = await Promise.all([
      newsFeed(def?.assetClass === 'crypto' ? 'crypto' : def?.assetClass === 'forex' ? 'forex' : def?.assetClass === 'metals' || def?.assetClass === 'energies' || def?.assetClass === 'commodities' ? 'commodities' : 'markets', 30).catch(() => null),
      economicCalendar().catch(() => null),
      consolidatedPortfolio(userId, isAdmin).catch(() => null),
    ])
    const tokens = Array.from(new Set([key, def?.name ?? '', def?.base ?? '', ...(def?.aliases ?? [])].flatMap((t) => t.split(/[\s/]+/)).map((t) => t.toLowerCase()).filter((t) => t.length >= 3 && !['usd', 'the', 'inc', 'corp', 'index', 'dollar'].includes(t))))
    const newsRows = (((news as any)?.data ?? []) as any[]).filter((a) => { const t = String(a.title).toLowerCase(); return tokens.some((k) => t.includes(k)) }).slice(0, 6).map((a) => `"${a.title}" (${a.domain ?? 'source'})`)
    const generalRows = newsRows.length < 3 ? (((news as any)?.data ?? []) as any[]).slice(0, 4).map((a) => `"${a.title}" (${a.domain ?? 'source'})`) : []
    const ccys = new Set([def?.base, def?.quote, def?.currency, def?.country === 'US' ? 'USD' : null, def?.country === 'IN' ? 'INR' : null].filter(Boolean) as string[])
    const now = Date.now()
    const calRows = (((cal as any)?.data ?? []) as any[])
      .filter((e) => e.impact === 'High' && Date.parse(e.date) >= now - 3600e3 && Date.parse(e.date) <= now + 7 * 86400e3 && (ccys.size === 0 || ccys.has(e.country) || e.country === 'All'))
      .slice(0, 8).map((e) => `${new Date(e.date).toISOString().slice(0, 16).replace('T', ' ')}Z ${e.country} ${e.title}${e.forecast ? ` (fcst ${e.forecast}, prev ${e.previous ?? 'n/a'})` : ''}`)
    const exposure = (pf as any)?.exposure?.bySymbol?.find((r: any) => r.key === key)
    const exposureUsd = exposure ? exposure.net : null

    const user = [
      `INSTRUMENT: ${key}${def ? ` — ${def.name} (${def.assetClass}, ${def.exchange}, ${def.currency}; research symbol ${td.symbol}${td.proxy ? ' — ETF PROXY' : ''})` : ` (research symbol ${td.symbol})`}`,
      `CALCULATED STATISTICS (daily closes, ${stats.bars} bars, as of ${stats.asOf}): last ${stats.last}; returns 1d ${f(stats.ret1d)}% · 1w ${f(stats.ret1w)}% · 1m ${f(stats.ret1m)}% · 3m ${f(stats.ret3m)}% · 1y ${f(stats.ret1y)}%; 52-week range ${stats.lo52} – ${stats.hi52} (position ${Math.round(stats.rangePos * 100)}% of range); realised vol 20d ${f(stats.vol20, 1)}% · 60d ${f(stats.vol60, 1)}% annualised; max drawdown 1y ${f(stats.maxDd1y, 1)}%; SMA50 ${f(stats.sma50, 4)} (${stats.aboveSma50 === null ? 'n/a' : stats.aboveSma50 ? 'price above' : 'price below'}); SMA200 ${f(stats.sma200, 4)} (${stats.aboveSma200 === null ? 'n/a' : stats.aboveSma200 ? 'price above' : 'price below'}); SMA50 ${stats.goldenCross === null ? 'n/a' : stats.goldenCross ? 'above' : 'below'} SMA200; RSI14 ${f(stats.rsi14, 1)}; ATR14 ${f(stats.atr14Pct)}% of price.`,
      `PORTFOLIO EXPOSURE TO ${key}: ${exposureUsd === null ? 'none' : `${Math.round(exposureUsd)} USD net (approx)`}.`,
      `HIGH-IMPACT CALENDAR (next 7 days, related currencies ${Array.from(ccys).join('/') || 'any'}): ${calRows.join('; ') || 'none listed'}`,
      `HEADLINES mentioning the instrument: ${newsRows.join('; ') || 'none matched'}${generalRows.length ? `. General market headlines: ${generalRows.join('; ')}` : ''}`,
    ].join('\n\n')

    const out = await llmJson<Partial<InstrumentReport>>(SYSTEM, user, 1800)
    const str = (v: unknown, n: number) => String(v ?? '').slice(0, n)
    const arr = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : [])
    const sections = arr(out.sections, 8).map((s: any) => ({ heading: str(s?.heading, 60), bullets: arr(s?.bullets, 5).map((b) => str(b, 220)) })).filter((s) => s.heading && s.bullets.length)
    const title = str(out.title, 120) || `Research report — ${key}`
    const summary = str(out.summary, 500)
    const watch = arr(out.watch, 5).map((s) => str(s, 160))
    const researchQuestions = arr(out.researchQuestions, 4).map((s) => str(s, 160))

    // Persist to the research notebook (markdown body) so it appears under Teach EMIL → Notebook.
    const md = [`# ${title}`, '', `_${key} · ${dateKey} · model assessment (${MODEL}) from delayed research data · not advice_`, '', summary, '', ...sections.flatMap((s) => [`## ${s.heading}`, ...s.bullets.map((b) => `- ${b}`), '']), '## What to watch', ...watch.map((w) => `- ${w}`), '', '## Research questions', ...researchQuestions.map((q) => `- ${q}`)].join('\n')
    let noteId: string | null = null
    try {
      const note = await prisma.researchNote.create({ data: { title: `${title} (${key}, ${dateKey})`.slice(0, 200), studied: `Instrument report on ${key} — ${stats.bars} daily bars, ${newsRows.length} matched headlines, ${calRows.length} calendar events`, learned: summary, stats: JSON.stringify(stats), content: md } })
      noteId = note.id
    } catch { /* notebook is best-effort */ }

    return {
      fetchedAt: new Date().toISOString(), dateKey, model: MODEL, noteId, symbol: key, title, summary, sections, watch, researchQuestions, stats,
      inputs: { news: newsRows.length, calendar: calRows.length, portfolioExposureUsd: exposureUsd },
    }
  })
}
