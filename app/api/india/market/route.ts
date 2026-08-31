import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Server-side proxy to the primary India market-data provider (IndianAPI.in).
// The API key never reaches the browser. Read-only market data — no orders.
const ALLOWED: Record<string, { path: string; params: string[] }> = {
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
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(req.url)
    const fn = url.searchParams.get('fn') ?? ''
    const spec = ALLOWED[fn]
    if (!spec) return NextResponse.json({ error: `Unknown function "${fn}"` }, { status: 400 })

    const provider = await prisma.indiaApiProvider.findFirst({
      where: { key: 'indianapi', apiKey: { not: null } },
    })
    if (!provider?.apiKey) {
      return NextResponse.json({ error: 'not_configured', message: 'Add your IndianAPI.in key in the India API Hub first.' }, { status: 409 })
    }

    const target = new URL(provider.baseUrl + spec.path)
    for (const p of spec.params) {
      const v = url.searchParams.get(p)
      if (v) target.searchParams.set(p, v)
    }

    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    let res: Response
    try {
      res = await fetch(target.toString(), {
        headers: { 'X-Api-Key': provider.apiKey, Accept: 'application/json' },
        signal: ctrl.signal,
        cache: 'no-store',
      })
    } finally {
      clearTimeout(t)
    }
    if (res.status === 429) {
      return NextResponse.json({ error: 'rate_limited', message: 'IndianAPI rate limit / credits exhausted (HTTP 429).' }, { status: 429 })
    }
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error', status: res.status, message: body?.message ?? `IndianAPI responded ${res.status}` }, { status: 502 })
    }
    return NextResponse.json({ ok: true, fn, data: body })
  } catch (e: any) {
    if (e?.name === 'AbortError') return NextResponse.json({ error: 'timeout', message: 'IndianAPI request timed out.' }, { status: 504 })
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch India market data' }, { status: 500 })
  }
}
