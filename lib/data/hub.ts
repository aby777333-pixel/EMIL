// EMIL Data Provider Hub — server-side fetch layer.
// RESEARCH DATA ONLY: these feeds power dashboards, news and analysis. They
// must never drive autonomous execution (execution-quality data comes from
// broker/exchange connections). Every response carries source, freshness and
// a fetch timestamp so the UI can label LIVE / DELAYED / DAILY honestly.

import { prisma } from '@/lib/db'

const UA = 'EMIL-Research/1.0 (contact: admin@emil.app)'

const timeoutFetch = async (url: string, init: RequestInit = {}, ms = 12000): Promise<Response> => {
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
  prisma.dataProvider.update({
    where: { key },
    data: { status: ok ? 'healthy' : 'error', lastCheckedAt: new Date(), lastLatencyMs: Math.round(latencyMs), lastError: ok ? null : (error ?? 'request failed').slice(0, 500) },
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

// ---- Crypto — CoinGecko (free public API, attribution required) ----
export async function cryptoMarkets(perPage = 25) {
  return timed('coingecko', async () => {
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
  })
}

// ---- FX — Frankfurter (ECB daily reference rates) ----
export async function fxRates(base = 'USD') {
  return timed('frankfurter', async () => {
    const res = await timeoutFetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`)
    if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`)
    const d = await res.json()
    return {
      provider: 'frankfurter', attribution: 'ECB reference rates via Frankfurter', freshness: 'daily' as const,
      fetchedAt: new Date().toISOString(), referenceDate: d?.date, base: d?.base, data: d?.rates ?? {},
    }
  })
}

// ---- Indices / metals / energy board — Twelve Data (free key required).
// Stooq's public quote-CSV endpoint now 404s (verified 2026-09-01), so the
// hub's designed fallback becomes the primary: Twelve Data with an owner key.
// Symbols the free tier cannot serve come back marked unavailable — honest,
// never faked.
export const MARKET_BOARD: { symbol: string; label: string; group: string }[] = [
  { symbol: 'SPX', label: 'S&P 500', group: 'Indices' },
  { symbol: 'DJI', label: 'Dow Jones', group: 'Indices' },
  { symbol: 'IXIC', label: 'Nasdaq Comp.', group: 'Indices' },
  { symbol: 'DAX', label: 'DAX', group: 'Indices' },
  { symbol: 'FTSE', label: 'FTSE 100', group: 'Indices' },
  { symbol: 'N225', label: 'Nikkei 225', group: 'Indices' },
  { symbol: 'XAU/USD', label: 'Gold (XAU/USD)', group: 'Metals' },
  { symbol: 'XAG/USD', label: 'Silver (XAG/USD)', group: 'Metals' },
  { symbol: 'WTI/USD', label: 'WTI Crude', group: 'Energy' },
  { symbol: 'BRN/USD', label: 'Brent Crude', group: 'Energy' },
  { symbol: 'NG/USD', label: 'Natural Gas', group: 'Energy' },
]

export async function marketBoard() {
  const provider = await prisma.dataProvider.findUnique({ where: { key: 'twelve_data' } })
  if (!provider?.enabled || !provider?.apiKey) {
    return {
      provider: 'twelve_data', needsKey: true,
      attribution: 'Indices, metals & energy need a market-data key',
      freshness: 'delayed' as const, fetchedAt: new Date().toISOString(),
      message: 'Add a free Twelve Data API key in Command Center → Data Providers to light up this board (the previous free source, Stooq, retired its public quote endpoint).',
      data: [] as any[],
    }
  }
  return timed('twelve_data', async () => {
    const symbols = MARKET_BOARD.map((b) => b.symbol).join(',')
    const res = await timeoutFetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${provider.apiKey}`)
    if (!res.ok) throw new Error(`Twelve Data responded ${res.status}`)
    const body = await res.json()
    // A top-level {code,message} means the whole call failed (bad key, plan
    // limit, rate limit) — surface it honestly instead of an all-unavailable board.
    if (body?.code && body?.message) throw new Error(`Twelve Data: ${String(body.message).slice(0, 200)}`)
    // Batch responses are keyed by symbol; single-symbol responses are flat.
    const bySymbol: Record<string, any> = body?.symbol ? { [body.symbol]: body } : body ?? {}
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
    return { provider: 'twelve_data', attribution: 'Research quotes via Twelve Data (delayed; plan-dependent coverage)', freshness: 'delayed' as const, fetchedAt: new Date().toISOString(), data }
  })
}

// ---- Time series — Twelve Data (charting groundwork) ----
const TS_INTERVALS = ['1min', '5min', '15min', '30min', '1h', '4h', '1day', '1week', '1month']

export async function timeSeries(symbol: string, interval = '1day', outputsize = 90) {
  const provider = await prisma.dataProvider.findUnique({ where: { key: 'twelve_data' } })
  if (!provider?.enabled || !provider?.apiKey) {
    return { provider: 'twelve_data', needsKey: true, message: 'Add a free Twelve Data API key in Command Center → Data Providers to enable time series.', freshness: 'delayed' as const, fetchedAt: new Date().toISOString(), data: [] as any[] }
  }
  const iv = TS_INTERVALS.includes(interval) ? interval : '1day'
  const size = Math.max(2, Math.min(500, Math.round(outputsize) || 90))
  return timed('twelve_data', async () => {
    const res = await timeoutFetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${iv}&outputsize=${size}&apikey=${provider.apiKey}`)
    if (!res.ok) throw new Error(`Twelve Data responded ${res.status}`)
    const body = await res.json()
    if (body?.status !== 'ok' || !Array.isArray(body?.values)) throw new Error(`Twelve Data: ${String(body?.message ?? 'no data for this symbol/interval').slice(0, 200)}`)
    return {
      provider: 'twelve_data', attribution: 'Time series via Twelve Data (research data)', freshness: 'delayed' as const, fetchedAt: new Date().toISOString(),
      symbol: body?.meta?.symbol ?? symbol, interval: iv, exchange: body?.meta?.exchange ?? null, currency: body?.meta?.currency ?? null,
      data: body.values.map((v: any) => ({ time: v.datetime, open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: v.volume ? +v.volume : null })).reverse(),
    }
  })
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
export async function newsFeed(category = 'markets', maxRecords = 30) {
  try {
    return await gdeltNews(category, maxRecords)
  } catch {
    return await googleNewsRss(category, maxRecords)
  }
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
        const r = await timeoutFetch('https://stooq.com/q/l/?s=%5Espx&f=sd2t2ohlcv&h&e=csv')
        const t = r.ok ? await r.text() : ''
        return done(t.includes(','), t.includes(',') ? 'Stooq quote CSV OK.' : `Responded ${r.status}`)
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
