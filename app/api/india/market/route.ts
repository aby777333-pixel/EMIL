import { decryptSecret } from '@/lib/secrets'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Server-side proxy to the India market-data providers (DalalAI, IndianAPI.in).
// API keys never reach the browser. Read-only market data — no orders.
// `:symbol` in a path is substituted from the ?symbol= query parameter.
const FUNCTIONS: Record<string, Record<string, { path: string; params: string[] }>> = {
  dalalai: {
    predictions: { path: '/predictions', params: [] },
    convergence: { path: '/convergence', params: [] },
    smart_money: { path: '/smart-money', params: [] },
    fii_dii: { path: '/fii-dii', params: [] },
    insider_trading: { path: '/insider-trading', params: [] },
    fundamentals: { path: '/fundamentals', params: ['symbol'] },
    delivery_volume: { path: '/delivery-volume', params: ['symbol'] },
    earnings_calendar: { path: '/earnings-calendar', params: [] },
    market_regime: { path: '/market-regime', params: [] },
    breakout_scanner: { path: '/breakout-scanner', params: [] },
    stock: { path: '/stocks/:symbol', params: [] },
  },
  indianapi: {
    trending: { path: '/trending', params: [] },
    nse_most_active: { path: '/NSE_most_active', params: [] },
    bse_most_active: { path: '/BSE_most_active', params: [] },
    price_shockers: { path: '/price_shockers', params: [] },
    week52: { path: '/fetch_52_week_high_low_data', params: [] },
    commodities: { path: '/commodities', params: [] },
    mutual_funds: { path: '/mutual_funds', params: [] },
    stock: { path: '/stock', params: ['name'] },
    historical: { path: '/historical_data', params: ['stock_name', 'period', 'filter'] },
    industry_search: { path: '/industry_search', params: ['query'] },
    target_price: { path: '/stock_target_price', params: ['stock_id'] },
  },
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(req.url)
    const fn = url.searchParams.get('fn') ?? ''
    let providerKey = url.searchParams.get('provider') ?? ''

    if (!providerKey) {
      const primary = await prisma.indiaApiProvider.findFirst({ where: { isPrimaryData: true } })
      providerKey = primary?.key ?? 'dalalai'
    }
    const spec = FUNCTIONS[providerKey]?.[fn]
    if (!spec) return NextResponse.json({ error: `Unknown function "${fn}" for provider "${providerKey}"` }, { status: 400 })

    const provider = await prisma.indiaApiProvider.findFirst({
      where: { key: providerKey, apiKey: { not: null } },
    })
    if (!provider?.apiKey) {
      return NextResponse.json({ error: 'not_configured', message: `Add your ${providerKey === 'dalalai' ? 'DalalAI' : 'IndianAPI.in'} key in the India API Hub first.` }, { status: 409 })
    }

    let path = spec.path
    if (path.includes(':symbol')) {
      const symbol = url.searchParams.get('symbol')
      if (!symbol) return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 })
      path = path.replace(':symbol', encodeURIComponent(symbol))
    }
    const target = new URL(provider.baseUrl + path)
    for (const p of spec.params) {
      const v = url.searchParams.get(p)
      if (v) target.searchParams.set(p, v)
    }

    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    let res: Response
    try {
      res = await fetch(target.toString(), {
        headers: { 'X-Api-Key': decryptSecret(provider.apiKey) as string, Accept: 'application/json' },
        signal: ctrl.signal,
        cache: 'no-store',
      })
    } finally {
      clearTimeout(t)
    }
    if (res.status === 429) {
      return NextResponse.json({ error: 'rate_limited', message: `${provider.name} rate limit / credits exhausted (HTTP 429).` }, { status: 429 })
    }
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error', status: res.status, message: body?.message ?? `${provider.name} responded ${res.status}` }, { status: 502 })
    }
    return NextResponse.json({ ok: true, provider: providerKey, fn, data: body })
  } catch (e: any) {
    if (e?.name === 'AbortError') return NextResponse.json({ error: 'timeout', message: 'Provider request timed out.' }, { status: 504 })
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch India market data' }, { status: 500 })
  }
}
