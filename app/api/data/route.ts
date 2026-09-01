import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cryptoMarkets, fxRates, marketBoard, newsFeed, timeSeries, correlationPair } from '@/lib/data/hub'

export const dynamic = 'force-dynamic'

// Research-data proxy over the Data Provider Hub. Session-gated; provider
// secrets never reach the browser. RESEARCH data — never drives execution.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(req.url)
    const fn = url.searchParams.get('fn') ?? ''

    if (fn === 'crypto_markets') {
      return NextResponse.json({ ok: true, ...(await cryptoMarkets(25)) })
    }
    if (fn === 'fx_rates') {
      const base = (url.searchParams.get('base') ?? 'USD').toUpperCase().slice(0, 3)
      return NextResponse.json({ ok: true, ...(await fxRates(base)) })
    }
    if (fn === 'market_board') {
      return NextResponse.json({ ok: true, ...(await marketBoard()) })
    }
    if (fn === 'news') {
      const category = url.searchParams.get('category') ?? 'markets'
      return NextResponse.json({ ok: true, ...(await newsFeed(category, 30)) })
    }
    if (fn === 'time_series') {
      const symbol = (url.searchParams.get('symbol') ?? '').slice(0, 20)
      if (!symbol) return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 })
      const interval = url.searchParams.get('interval') ?? '1day'
      const outputsize = parseInt(url.searchParams.get('outputsize') ?? '90', 10)
      return NextResponse.json({ ok: true, ...(await timeSeries(symbol, interval, outputsize)) })
    }
    if (fn === 'correlation') {
      const a = (url.searchParams.get('a') ?? '').slice(0, 20)
      const b = (url.searchParams.get('b') ?? '').slice(0, 20)
      if (!a || !b) return NextResponse.json({ error: 'a and b symbol parameters required' }, { status: 400 })
      const bars = parseInt(url.searchParams.get('bars') ?? '180', 10)
      return NextResponse.json({ ok: true, ...(await correlationPair(a, b, bars)) })
    }
    return NextResponse.json({ error: `Unknown function "${fn}". Available: crypto_markets, fx_rates, market_board, news, time_series, correlation.` }, { status: 400 })
  } catch (e: any) {
    if (e?.rateLimited) {
      const retryAfterSec = Math.max(2, Math.min(65, e.retryAfterSec ?? 30))
      return NextResponse.json(
        { error: 'rate_limited', retryAfterSec, message: `Per-minute market-data budget reached (free plan). EMIL will not fake data — it retries automatically in ~${retryAfterSec}s.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      )
    }
    console.error('data hub error', e)
    return NextResponse.json({ error: 'data_unavailable', message: `The research feed is unavailable right now (${(e?.message ?? 'network error').slice(0, 120)}). EMIL never fakes data — try again shortly.` }, { status: 502 })
  }
}
