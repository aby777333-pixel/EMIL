import { decryptSecret } from '@/lib/secrets'
// EMIL Data Provider Hub — server-side fetch layer.
// RESEARCH DATA ONLY: these feeds power dashboards, news and analysis. They
// must never drive autonomous execution (execution-quality data comes from
// broker/exchange connections). Every response carries source, freshness and
// a fetch timestamp so the UI can label LIVE / DELAYED / DAILY honestly.

import { prisma } from '@/lib/db'
import { emitEvent } from '@/lib/webhooks'

const UA = 'EMIL-Research/1.0 (contact: admin@emil.app)'

export const timeoutFetch = async (url: string, init: RequestInit = {}, ms = 12000): Promise<Response> => {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store', headers: { 'User-Agent': UA, Accept: 'application/json,text/csv,*/*', ...(init.headers ?? {}) } })
  } finally {
    clearTimeout(t)
  }
}

// Best-effort provider health stamp — never blocks or fails the data path.
export function stampHealth(key: string, ok: boolean, latencyMs: number, error?: string) {
  const status = ok ? 'healthy' : 'error'
  prisma.dataProvider.findUnique({ where: { key }, select: { status: true, name: true } }).then(async (prev) => {
    await prisma.dataProvider.update({
      where: { key },
      data: { status, lastCheckedAt: new Date(), lastLatencyMs: Math.round(latencyMs), lastError: ok ? null : (error ?? 'request failed').slice(0, 500) },
    })
    // Outbound webhook on a real transition only (healthy ↔ error), broadcast to every subscriber.
    if (prev && prev.status !== status && (prev.status === 'healthy' || status === 'healthy')) {
      emitEvent(null, 'health.changed', { kind: 'data_provider', key, name: prev.name, from: prev.status, to: status, latencyMs: Math.round(latencyMs), error: ok ? null : (error ?? 'request failed').slice(0, 200) }).catch(() => {})
    }
  }).catch(() => {})
}

async function timed<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  try {
    const out = await fn()
    stampHealth(key, true, Date.now() - start)
    return out
  } catch (e: any) {
    stampHealth(key, false, Date.now() - start, e?.message)
    throw e
  }
}

// Server-side research cache: one upstream fetch per TTL regardless of user
// count, so free-tier rate limits (Twelve Data: 8 credits/min) are respected.
// On upstream failure a stale cached copy is served, clearly stamped stale.
export async function cachedFetch<T extends { fetchedAt: string }>(cacheKey: string, ttlSec: number, fn: () => Promise<T>): Promise<T & { cached?: boolean; stale?: boolean }> {
  const row = await prisma.cacheEntry.findUnique({ where: { key: cacheKey } }).catch(() => null)
  if (row && Date.now() - row.fetchedAt.getTime() < ttlSec * 1000) {
    try {
      return { ...JSON.parse(row.payload), cached: true }
    } catch { /* corrupt cache — refetch */ }
  }
  try {
    const fresh = await fn()
    prisma.cacheEntry.upsert({
      where: { key: cacheKey },
      update: { payload: JSON.stringify(fresh), fetchedAt: new Date() },
      create: { key: cacheKey, payload: JSON.stringify(fresh) },
    }).catch(() => {})
    // Opportunistic eviction (~2% of writes): the cache would otherwise grow
    // without bound. Entries older than 7 days are past every TTL and only
    // useful as stale-serve fallbacks, which a week-old quote no longer is.
    if (Math.random() < 0.02) {
      prisma.cacheEntry.deleteMany({ where: { fetchedAt: { lt: new Date(Date.now() - 7 * 86400e3) } } }).catch(() => {})
    }
    return fresh
  } catch (e) {
    if (row) {
      try {
        // Honest degradation: serve the stale copy, labeled stale.
        return { ...JSON.parse(row.payload), cached: true, stale: true }
      } catch { /* fall through */ }
    }
    throw e
  }
}

// ---- Crypto — CoinGecko (free public API, attribution required) ----
export async function cryptoMarkets(perPage = 25) {
  return cachedFetch(`crypto_markets_${perPage}`, 90, () => timed('coingecko', async () => {
    const res = await timeoutFetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&price_change_percentage=24h,7d`)
    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`)
    const rows = await res.json()
    return {
      provider: 'coingecko', attribution: 'Data by CoinGecko', freshness: 'realtime' as const, fetchedAt: new Date().toISOString(),
      data: (Array.isArray(rows) ? rows : []).map((c: any) => ({
        id: c.id, symbol: c.symbol?.toUpperCase(), name: c.name, price: c.current_price,
        change24hPct: c.price_change_percentage_24h_in_currency, change7dPct: c.price_change_percentage_7d_in_currency,
        marketCap: c.market_cap, volume24h: c.total_volume, high24h: c.high_24h, low24h: c.low_24h,
      })),
    }
  }))
}

// ---- FX — Frankfurter (ECB daily reference rates) ----
export async function fxRates(base = 'USD') {
  return cachedFetch(`fx_rates_${base}`, 1800, () => timed('frankfurter', async () => {
    const res = await timeoutFetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`)
    if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`)
    const d = await res.json()
    return {
      provider: 'frankfurter', attribution: 'ECB reference rates via Frankfurter', freshness: 'daily' as const,
      fetchedAt: new Date().toISOString(), referenceDate: d?.date, base: d?.base, data: d?.rates ?? {},
    }
  }))
}

// ---- Indices / metals / energy board — Twelve Data (free key required).
// Stooq's public quote-CSV endpoint now 404s (verified 2026-09-01), so the
// hub's designed fallback becomes the primary: Twelve Data with an owner key.
// Symbols the free tier cannot serve come back marked unavailable — honest,
// never faked.
// Free tier budget: 8 API credits/minute, one credit per symbol in a batch.
// The board carries 6 symbols (leaving 2 credits/min headroom for charts and
// correlation) and is cached server-side for 10 minutes — one upstream call
// per TTL for ALL users combined. More symbols return with a paid data plan.
// Index/commodity symbols are gated behind paid Twelve Data plans, so the
// free-tier board uses spot gold plus clearly-labeled ETF PROXIES (verified
// serving real prices on this key). Never present a proxy as the index itself.
export const MARKET_BOARD: { symbol: string; label: string; group: string }[] = [
  { symbol: 'SPY', label: 'S&P 500 (SPY ETF proxy)', group: 'Indices' },
  { symbol: 'QQQ', label: 'Nasdaq-100 (QQQ ETF proxy)', group: 'Indices' },
  { symbol: 'DIA', label: 'Dow Jones (DIA ETF proxy)', group: 'Indices' },
  { symbol: 'XAU/USD', label: 'Gold (XAU/USD spot)', group: 'Metals' },
  { symbol: 'SLV', label: 'Silver (SLV ETF proxy)', group: 'Metals' },
  { symbol: 'USO', label: 'WTI Crude (USO ETF proxy)', group: 'Energy' },
]

async function tdKey(): Promise<string | null> {
  const provider = await prisma.dataProvider.findUnique({ where: { key: 'twelve_data' } })
  return provider?.enabled && provider?.apiKey ? decryptSecret(provider.apiKey) : null
}

// ---- Twelve Data credit budgeter -------------------------------------------
// Free tier: 8 credits/minute, one per symbol. Instead of burning calls into
// guaranteed 429s, EMIL reserves credits in a shared DB counter (atomic, so it
// works across serverless instances) and refuses locally when the minute's
// budget is spent — returning exactly how long to wait. Doomed upstream calls
// are never made.
const TD_BUDGET_PER_MINUTE = 7 // keep 1 credit spare for admin tests

const secToNextMinute = () => 61 - new Date().getSeconds()

// Free-plan daily cap: reserve a little under 800 so the last credits stay for health checks.
const TD_DAILY_BUDGET = Number(process.env.TD_DAILY_BUDGET ?? 760)
function dailyBudgetError(): Error {
  const now = new Date(); const reset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  const e: any = rateLimitedError(`The market-data feed reached its DAILY credit budget (free plan: 800 credits/day) — quotes and series resume at 00:00 UTC.`)
  e.retryAfterSec = Math.max(60, Math.round((reset - now.getTime()) / 1000))
  e.daily = true
  return e
}

function rateLimitedError(message: string): Error {
  const e: any = new Error(message)
  e.rateLimited = true
  e.retryAfterSec = secToNextMinute()
  return e
}

async function reserveTdCredits(n: number): Promise<void> {
  const minuteKey = `td_budget_${Math.floor(Date.now() / 60000)}`
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `INSERT INTO research_cache (id, key, payload, "fetchedAt")
       VALUES ('bud_' || $1, $1, $2, now())
       ON CONFLICT (key) DO UPDATE SET payload = ((research_cache.payload)::int + $3)::text
       RETURNING payload`,
      minuteKey, String(n), n,
    )
    const used = parseInt(rows?.[0]?.payload ?? '0', 10)
    // Fire-and-forget cleanup of spent budget minutes — one counter row is
    // written per wall-clock minute and would otherwise accumulate forever.
    prisma.cacheEntry.deleteMany({
      where: { key: { startsWith: 'td_budget_' }, fetchedAt: { lt: new Date(Date.now() - 180e3) } },
    }).catch(() => {})
    if (used > TD_BUDGET_PER_MINUTE) {
      // A refused reservation must not count — otherwise a client that retries every
      // countdown keeps the counter saturated and the budget never recovers.
      prisma.$executeRawUnsafe(`UPDATE research_cache SET payload = GREATEST(0, (payload)::int - $1)::text WHERE key = $2`, n, minuteKey).catch(() => {})
      throw rateLimitedError(`The market-data feed reached its per-minute budget (free plan: 8 credits/min).`)
    }
    // Daily budget (free plan: 800 credits/day). Reserve against a per-UTC-day counter as well; when it is
    // spent, refuse with a retry-after that points at the 00:00 UTC reset instead of the next minute.
    const dayKey = `td_daily_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
    const dayRows: any[] = await prisma.$queryRawUnsafe(
      `INSERT INTO research_cache (id, key, payload, "fetchedAt")
       VALUES ('bud_' || $1, $1, $2, now())
       ON CONFLICT (key) DO UPDATE SET payload = ((research_cache.payload)::int + $3)::text
       RETURNING payload`,
      dayKey, String(n), n,
    )
    const usedToday = parseInt(dayRows?.[0]?.payload ?? '0', 10)
    if (usedToday > TD_DAILY_BUDGET) {
      prisma.$executeRawUnsafe(`UPDATE research_cache SET payload = GREATEST(0, (payload)::int - $1)::text WHERE key = $2 OR key = $3`, n, minuteKey, dayKey).catch(() => {})
      throw dailyBudgetError()
    }
    prisma.cacheEntry.deleteMany({ where: { key: { startsWith: 'td_daily_' }, fetchedAt: { lt: new Date(Date.now() - 2 * 86400e3) } } }).catch(() => {})
  } catch (e: any) {
    if (e?.rateLimited) throw e
    // Budget table unavailable — proceed; TD's own 429 handling still applies.
  }
}

// Convert TD's own 429/credit messages into structured rate-limit errors.
function tdError(message: string): Error {
  // Daily cap (free plan: 800 credits/day) resets at 00:00 UTC — say so and hand back a long retry-after.
  if (/day|daily/i.test(message) && /credit|limit|exceed/i.test(message)) return dailyBudgetError()
  if (/run out of API credits|429/i.test(message)) return rateLimitedError('The market-data feed reached its per-minute budget (free plan: 8 credits/min).')
  return new Error(message)
}

async function tdQuoteBatch(symbols: string[], apiKey: string) {
  await reserveTdCredits(symbols.length)
  const res = await timeoutFetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${apiKey}`)
  if (!res.ok) throw tdError(`Twelve Data responded ${res.status}`)
  const body = await res.json()
  // A top-level {code,message} means the whole call failed (bad key, plan
  // limit, rate limit) — surface it honestly instead of an all-unavailable board.
  if (body?.code && body?.message) throw tdError(`Twelve Data: ${String(body.message).slice(0, 200)}`)
  // Batch responses are keyed by symbol; single-symbol responses are flat.
  return (body?.symbol ? { [body.symbol]: body } : body ?? {}) as Record<string, any>
}

export async function marketBoard() {
  const apiKey = await tdKey()
  if (!apiKey) {
    return {
      provider: 'twelve_data', needsKey: true,
      attribution: 'Indices, metals & energy need a market-data key',
      freshness: 'delayed' as const, fetchedAt: new Date().toISOString(),
      message: 'Add a free Twelve Data API key in Command Center → Data Providers to light up this board (the previous free source, Stooq, retired its public quote endpoint).',
      data: [] as any[],
    }
  }
  return cachedFetch('market_board_v4', 600, () => timed('twelve_data', async () => {
    const bySymbol = await tdQuoteBatch(MARKET_BOARD.map((b) => b.symbol), apiKey)
    const data = MARKET_BOARD.map((b) => {
      const q = bySymbol[b.symbol]
      const price = parseFloat(q?.close)
      const changePct = parseFloat(q?.percent_change)
      return {
        ...b,
        price: isFinite(price) ? price : null,
        changePct: isFinite(changePct) ? changePct : null,
        available: isFinite(price),
      }
    })
    return { provider: 'twelve_data', attribution: 'Research quotes via Twelve Data (delayed; cached ~10 min). Index/commodity rows are ETF proxies on the current free data plan — direct index symbols unlock with a paid plan.', freshness: 'delayed' as const, fetchedAt: new Date().toISOString(), data }
  }))
}

// ---- Watchlist quotes (spec §66) — capped by the free-tier credit budget ----
export async function watchlistQuotes(symbols: string[]) {
  const apiKey = await tdKey()
  const capped = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))).slice(0, 8)
  if (capped.length === 0) return { provider: 'twelve_data', freshness: 'delayed' as const, fetchedAt: new Date().toISOString(), data: [] as any[] }
  if (!apiKey) {
    return { provider: 'twelve_data', needsKey: true, message: 'Add a Twelve Data API key in Command Center → Data Providers to quote your watchlist.', freshness: 'delayed' as const, fetchedAt: new Date().toISOString(), data: [] as any[] }
  }
  const cacheKey = `wl_quotes_${capped.slice().sort().join('|')}`
  return cachedFetch(cacheKey, 300, () => timed('twelve_data', async () => {
    const bySymbol = await tdQuoteBatch(capped, apiKey)
    const data = capped.map((s) => {
      const q = bySymbol[s]
      const price = parseFloat(q?.close)
      const changePct = parseFloat(q?.percent_change)
      return {
        symbol: s, name: q?.name ?? null, exchange: q?.exchange ?? null, currency: q?.currency ?? null,
        price: isFinite(price) ? price : null, changePct: isFinite(changePct) ? changePct : null,
        available: isFinite(price), reason: !isFinite(price) ? String(q?.message ?? 'not available on the current data plan').slice(0, 120) : null,
      }
    })
    return { provider: 'twelve_data', attribution: 'Quotes via Twelve Data (delayed; cached ~5 min)', freshness: 'delayed' as const, fetchedAt: new Date().toISOString(), data }
  }))
}

// ---- Time series — Twelve Data (charting groundwork) ----
const TS_INTERVALS = ['1min', '5min', '15min', '30min', '1h', '4h', '1day', '1week', '1month']

const TS_TTL: Record<string, number> = { '1min': 120, '5min': 180, '15min': 300, '30min': 300, '1h': 900, '4h': 1800, '1day': 3600, '1week': 21600, '1month': 43200 }

// `startDate` (YYYY-MM-DD) switches the request to a calendar window: Twelve
// Data returns every bar from that date onward (outputsize raised to fit), so a
// "2 years" request covers two years whether the instrument trades 5 or 7 days
// a week. One credit either way.
// Bring-your-own key (round F): a customer's own Twelve Data key runs their
// request on THEIR plan — no house budget reservation, same shared cache.
async function userTdKey(userId?: string): Promise<string | null> {
  if (!userId) return null
  try {
    const row = await prisma.userProviderKey.findUnique({ where: { userId_providerKey: { userId, providerKey: 'twelve_data' } } })
    return row && row.status !== 'error' ? decryptSecret(row.apiKey) : null
  } catch { return null }
}

export async function timeSeries(symbol: string, interval = '1day', outputsize = 90, startDate?: string, userId?: string) {
  const ownKey = await userTdKey(userId)
  const apiKey = ownKey ?? (await tdKey())
  if (!apiKey) {
    return { provider: 'twelve_data', needsKey: true, message: 'Add a free Twelve Data API key in Command Center → Data Providers to enable time series.', freshness: 'delayed' as const, fetchedAt: new Date().toISOString(), data: [] as any[] }
  }
  const iv = TS_INTERVALS.includes(interval) ? interval : '1day'
  const start = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : null
  const size = Math.max(2, Math.min(start ? 1200 : 500, Math.round(outputsize) || 90))
  const sym = symbol.trim().toUpperCase()
  return cachedFetch(`ts_${sym}_${iv}_${size}${start ? `_${start}` : ''}`, TS_TTL[iv] ?? 900, () => timed('twelve_data', async () => {
    if (!ownKey) await reserveTdCredits(1)
    const res = await timeoutFetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=${iv}&outputsize=${size}${start ? `&start_date=${start}` : ''}&apikey=${apiKey}`)
    if (!res.ok) throw tdError(`Twelve Data responded ${res.status}`)
    const body = await res.json()
    if (body?.status !== 'ok' || !Array.isArray(body?.values)) throw tdError(`Twelve Data: ${String(body?.message ?? 'no data for this symbol/interval').slice(0, 200)}`)
    return {
      provider: 'twelve_data', attribution: 'Time series via Twelve Data (research data)', freshness: 'delayed' as const, fetchedAt: new Date().toISOString(),
      symbol: body?.meta?.symbol ?? sym, interval: iv, exchange: body?.meta?.exchange ?? null, currency: body?.meta?.currency ?? null,
      data: body.values.map((v: any) => ({ time: v.datetime, open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: v.volume ? +v.volume : null })).reverse(),
    }
  }))
}

// ---- Correlation engine (spec §97–98): CALCULATED analytics from cached
// daily series — Pearson, rolling window, beta, relative volatility, and
// current-vs-period comparison. Two TD credits max per uncached pair.
// `days` (calendar days back from today) is the honest window: a bar count
// spans very different periods for a 7-day crypto series and a 5-day equity
// series, which made the old "2Y" (500 bars) stop at ~16 months on crypto pairs.
export async function correlationPair(symbolA: string, symbolB: string, bars = 180, days?: number, userId?: string) {
  const win = days && Number.isFinite(days) ? Math.max(30, Math.min(1100, Math.round(days))) : null
  const startDate = win ? new Date(Date.now() - win * 86400000).toISOString().slice(0, 10) : undefined
  const size = win ? win + 10 : Math.max(30, Math.min(500, bars))
  const [a, b] = await Promise.all([timeSeries(symbolA, '1day', size, startDate, userId), timeSeries(symbolB, '1day', size, startDate, userId)])
  if ((a as any).needsKey || (b as any).needsKey) return { needsKey: true, message: (a as any).message ?? (b as any).message }
  const mapA = new Map((a as any).data.map((x: any) => [x.time, x.close]))
  const joined: { time: string; ra: number; rb: number }[] = []
  let prevA: number | null = null
  let prevB: number | null = null
  for (const row of (b as any).data) {
    const ca = mapA.get(row.time) as number | undefined
    if (ca === undefined) continue
    if (prevA !== null && prevB !== null && prevA !== 0 && prevB !== 0) {
      joined.push({ time: row.time, ra: Math.log(ca / prevA), rb: Math.log(row.close / prevB) })
    }
    prevA = ca
    prevB = row.close
  }
  if (joined.length < 20) throw new Error(`Only ${joined.length} overlapping sessions between ${symbolA} and ${symbolB} — not enough for a reliable correlation.`)

  const pearson = (xs: number[], ys: number[]) => {
    const n = xs.length
    const mx = xs.reduce((s, v) => s + v, 0) / n
    const my = ys.reduce((s, v) => s + v, 0) / n
    let num = 0, dx = 0, dy = 0
    for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2 }
    return dx && dy ? num / Math.sqrt(dx * dy) : 0
  }
  const ras = joined.map((j) => j.ra)
  const rbs = joined.map((j) => j.rb)
  const overall = pearson(ras, rbs)
  const W = 30
  const rolling = joined.slice(W - 1).map((_, i) => ({
    time: joined[i + W - 1].time,
    corr: pearson(ras.slice(i, i + W), rbs.slice(i, i + W)),
  }))
  const std = (xs: number[]) => {
    const m = xs.reduce((s, v) => s + v, 0) / xs.length
    return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length)
  }
  const volA = std(ras) * Math.sqrt(252) * 100
  const volB = std(rbs) * Math.sqrt(252) * 100
  const beta = std(rbs) > 0 ? overall * (std(ras) / std(rbs)) : 0
  const recent = rolling.length ? rolling[rolling.length - 1].corr : overall
  const avgRolling = rolling.length ? rolling.reduce((s, r) => s + r.corr, 0) / rolling.length : overall
  const regime = Math.abs(recent - avgRolling) < 0.15 ? 'stable' : recent > avgRolling ? (recent * avgRolling < 0 ? 'inverting' : 'strengthening') : (recent * avgRolling < 0 ? 'inverting' : 'weakening')

  return {
    provider: 'twelve_data', dataClass: 'CALCULATED',
    attribution: 'Calculated by EMIL from Twelve Data daily closes (log returns). Correlations change — never treat them as permanent facts.',
    fetchedAt: new Date().toISOString(),
    symbolA: (a as any).symbol, symbolB: (b as any).symbol,
    sessions: joined.length,
    windowDays: win,
    firstSession: joined[0]?.time ?? null,
    lastSession: joined[joined.length - 1]?.time ?? null,
    overallCorrelation: overall,
    recentCorrelation: recent,
    averageRollingCorrelation: avgRolling,
    regime,
    rollingWindow: W,
    rolling,
    annualizedVolA: volA, annualizedVolB: volB,
    betaAonB: beta,
  }
}

// ---- News — GDELT DOC 2.0 (open global news index) ----
const NEWS_QUERIES: Record<string, string> = {
  markets: '(("stock market" OR equities OR "wall street" OR nasdaq OR "s&p 500") (rally OR selloff OR earnings OR outlook))',
  forex: '(forex OR "currency market" OR "exchange rate" OR dollar OR euro OR rupee) (central bank OR market)',
  commodities: '(gold OR "crude oil" OR copper OR "natural gas" OR wheat) (price OR market OR supply)',
  central_banks: '("federal reserve" OR ECB OR "bank of england" OR "bank of japan" OR "reserve bank of india") (rate OR policy OR decision)',
  crypto: '(bitcoin OR ethereum OR cryptocurrency) (market OR regulation OR price)',
  economy: '(inflation OR GDP OR recession OR employment OR "interest rates") (data OR report OR economy)',
  geopolitics: '(sanctions OR tariffs OR "trade war" OR OPEC OR geopolitical) (market OR economy OR oil)',
  earnings: '(earnings OR "quarterly results" OR guidance) (beat OR miss OR forecast OR profit)',
}

// Plain-language queries for the Google News RSS fallback.
const NEWS_QUERIES_SIMPLE: Record<string, string> = {
  markets: 'stock market rally OR selloff OR earnings',
  forex: 'forex currency dollar euro exchange rate',
  commodities: 'gold OR "crude oil" OR copper price market',
  central_banks: '"federal reserve" OR ECB OR "bank of england" OR RBI rate policy',
  crypto: 'bitcoin OR ethereum cryptocurrency market',
  economy: 'inflation OR GDP OR recession economic data',
  geopolitics: 'sanctions OR tariffs OR OPEC markets',
  earnings: 'quarterly earnings results guidance',
}

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()

async function gdeltNews(category: string, maxRecords: number) {
  const query = NEWS_QUERIES[category] ?? NEWS_QUERIES.markets
  return timed('gdelt', async () => {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`${query} sourcelang:english`)}&mode=ArtList&format=json&maxrecords=${maxRecords}&sort=DateDesc`
    const res = await timeoutFetch(url)
    if (!res.ok) throw new Error(`GDELT responded ${res.status}`)
    const body = await res.json().catch(() => ({}))
    const seen = new Set<string>()
    const data = (body?.articles ?? []).filter((a: any) => {
      const t = (a?.title ?? '').trim()
      if (!t || seen.has(t)) return false
      seen.add(t)
      return true
    }).map((a: any) => ({
      title: a.title, url: a.url, domain: a.domain, sourceCountry: a.sourcecountry,
      seenDate: a.seendate, image: a.socialimage || null, language: a.language,
    }))
    if (data.length === 0) throw new Error('GDELT returned no articles')
    return { provider: 'gdelt', attribution: 'News index via the GDELT Project — headlines link to the original publishers', freshness: 'realtime' as const, fetchedAt: new Date().toISOString(), category, data }
  })
}

async function googleNewsRss(category: string, maxRecords: number) {
  const query = NEWS_QUERIES_SIMPLE[category] ?? NEWS_QUERIES_SIMPLE.markets
  return timed('google_news_rss', async () => {
    const res = await timeoutFetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`, { headers: { Accept: 'application/rss+xml,text/xml,*/*' } })
    if (!res.ok) throw new Error(`Google News RSS responded ${res.status}`)
    const xml = await res.text()
    const data = xml.split('<item>').slice(1, maxRecords + 1).map((it) => {
      const pick = (re: RegExp) => decodeEntities((it.match(re) ?? [])[1] ?? '')
      const pub = pick(/<pubDate>([\s\S]*?)<\/pubDate>/)
      const d = pub ? new Date(pub) : null
      const seenDate = d && !isNaN(d.getTime())
        ? `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}00`
        : ''
      return {
        title: pick(/<title>([\s\S]*?)<\/title>/),
        url: pick(/<link>([\s\S]*?)<\/link>/),
        domain: pick(/<source[^>]*>([\s\S]*?)<\/source>/),
        sourceCountry: null, seenDate, image: null, language: 'English',
      }
    }).filter((a) => a.title && a.url)
    if (data.length === 0) throw new Error('Google News RSS returned no items')
    return { provider: 'google_news_rss', attribution: 'Headlines via Google News RSS — links open the original publishers', freshness: 'realtime' as const, fetchedAt: new Date().toISOString(), category, data }
  })
}

// PRIMARY → FALLBACK per the hub design: GDELT first, Google News RSS second.
// Cached 5 minutes per category so free feeds are never hammered.
export async function newsFeed(category = 'markets', maxRecords = 30) {
  return cachedFetch(`news_${category}_${maxRecords}`, 300, async () => {
    try {
      return await gdeltNews(category, maxRecords)
    } catch {
      return await googleNewsRss(category, maxRecords)
    }
  })
}

// ---- Health tests for the admin console ----
export async function testProvider(key: string, apiKey?: string | null): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const start = Date.now()
  const done = (ok: boolean, message: string) => ({ ok, message, latencyMs: Date.now() - start })
  try {
    switch (key) {
      case 'coingecko': {
        const r = await timeoutFetch('https://api.coingecko.com/api/v3/ping')
        return done(r.ok, r.ok ? 'CoinGecko ping OK.' : `Responded ${r.status}`)
      }
      case 'frankfurter': {
        const r = await timeoutFetch('https://api.frankfurter.dev/v1/latest?base=USD')
        const d = r.ok ? await r.json() : null
        return done(!!d?.rates, d?.rates ? `ECB reference rates for ${d.date}.` : `Responded ${r.status}`)
      }
      case 'gdelt': {
        const r = await timeoutFetch('https://api.gdeltproject.org/api/v2/doc/doc?query=markets&mode=ArtList&format=json&maxrecords=1')
        return done(r.ok, r.ok ? 'GDELT DOC API reachable.' : `Responded ${r.status}`)
      }
      case 'google_news_rss': {
        const r = await timeoutFetch('https://news.google.com/rss/search?q=markets&hl=en-US&gl=US&ceid=US:en')
        const t = r.ok ? await r.text() : ''
        return done(t.includes('<item>'), t.includes('<item>') ? 'Google News RSS OK.' : `Responded ${r.status}`)
      }
      case 'stooq': {
        // Stooq retired its public quote-CSV endpoint (verified 2026-09-01).
        // The catalog entry is kept for reference only — no data path uses it.
        return done(false, 'Retired: Stooq shut down its public quote-CSV endpoint (verified 2026-09-01). Kept for reference — Twelve Data serves this role now.')
      }
      case 'worldbank': {
        const r = await timeoutFetch('https://api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json&per_page=1')
        return done(r.ok, r.ok ? 'World Bank API OK.' : `Responded ${r.status}`)
      }
      case 'sec_edgar': {
        const r = await timeoutFetch('https://data.sec.gov/submissions/CIK0000320193.json')
        return done(r.ok, r.ok ? 'EDGAR reachable (Apple CIK test).' : `Responded ${r.status} — EDGAR requires a declared User-Agent.`)
      }
      case 'gleif': {
        const r = await timeoutFetch('https://api.gleif.org/api/v1/lei-records?page[size]=1')
        return done(r.ok, r.ok ? 'GLEIF LEI API OK.' : `Responded ${r.status}`)
      }
      case 'open_meteo': {
        const r = await timeoutFetch('https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=0&current=temperature_2m')
        return done(r.ok, r.ok ? 'Open-Meteo OK.' : `Responded ${r.status}`)
      }
      case 'fred': {
        if (!apiKey) return done(false, 'API key required — free at fred.stlouisfed.org (API Keys).')
        const r = await timeoutFetch(`https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`)
        const d = r.ok ? await r.json() : null
        return done(!!d?.observations, d?.observations ? `FRED OK — US 10Y latest: ${d.observations[0]?.value}.` : `Responded ${r.status} — check the key.`)
      }
      case 'eia': {
        if (!apiKey) return done(false, 'API key required — free at eia.gov/opendata.')
        const r = await timeoutFetch(`https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${apiKey}&frequency=daily&data[0]=value&length=1`)
        const d = r.ok ? await r.json() : null
        return done(!!d?.response, d?.response ? 'EIA API OK.' : `Responded ${r.status} — check the key.`)
      }
      case 'alpha_vantage': {
        if (!apiKey) return done(false, 'API key required — free at alphavantage.co.')
        const r = await timeoutFetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${apiKey}`)
        const d = r.ok ? await r.json() : null
        if (d?.Note || d?.Information) return done(false, 'Key accepted but rate-limited — free tier is ~25 requests/day.')
        return done(!!d?.['Global Quote'], d?.['Global Quote'] ? 'Alpha Vantage OK.' : `Responded ${r.status}.`)
      }
      case 'twelve_data': {
        if (!apiKey) return done(false, 'API key required — free at twelvedata.com.')
        const r = await timeoutFetch(`https://api.twelvedata.com/quote?symbol=AAPL&apikey=${apiKey}`)
        const d = r.ok ? await r.json() : null
        return done(!!d?.symbol, d?.symbol ? 'Twelve Data OK.' : d?.message ?? `Responded ${r.status}.`)
      }
      case 'finnhub': {
        if (!apiKey) return done(false, 'API key required — free at finnhub.io.')
        const r = await timeoutFetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${apiKey}`)
        const d = r.ok ? await r.json() : null
        return done(typeof d?.c === 'number', typeof d?.c === 'number' ? 'Finnhub OK.' : `Responded ${r.status}.`)
      }
      case 'fmp': {
        if (!apiKey) return done(false, 'API key required — free at financialmodelingprep.com.')
        const r = await timeoutFetch(`https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=${apiKey}`)
        const d = r.ok ? await r.json() : null
        return done(Array.isArray(d) && d.length > 0, Array.isArray(d) && d.length ? 'FMP OK.' : `Responded ${r.status}.`)
      }
      default: {
        // Generic reachability check for providers without a bespoke tester.
        const provider = await prisma.dataProvider.findUnique({ where: { key } })
        if (!provider) return done(false, 'Unknown provider.')
        if (provider.authType === 'api_key' && !apiKey) return done(false, 'API key required — see the Docs link for where to generate one.')
        const r = await timeoutFetch(provider.baseUrl, {}, 10000)
        return done(r.status < 500, r.status < 500 ? `Endpoint reachable (HTTP ${r.status}) — generic check only.` : `Responded ${r.status}.`)
      }
    }
  } catch (e: any) {
    return done(false, e?.name === 'AbortError' ? 'Timed out.' : `Failed: ${e?.message ?? 'network error'}.`)
  }
}
