import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cryptoMarkets, fxRates, marketBoard, newsFeed } from '@/lib/data/hub'

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
    return NextResponse.json({ error: `Unknown function "${fn}". Available: crypto_markets, fx_rates, market_board, news.` }, { status: 400 })
  } catch (e: any) {
    console.error('data hub error', e)
    return NextResponse.json({ error: 'data_unavailable', message: `The research feed is unavailable right now (${(e?.message ?? 'network error').slice(0, 120)}). EMIL never fakes data — try again shortly.` }, { status: 502 })
  }
}
