import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { flagEnabled } from '@/lib/flags'
import { companyIntel } from '@/lib/company'
import { screenerFetchPrices, screenerRows, screenerScanFundamentals } from '@/lib/company/screener'

export const dynamic = 'force-dynamic'

// Company intelligence + screener (spec §21–23). Session-gated research data.
//   GET  /api/company?fn=intel&symbol=AAPL[&refresh=1]
//   GET  /api/company?fn=screener
//   POST { type: 'scan', n } | { type: 'prices', n }
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await flagEnabled('company_intelligence', true))) return NextResponse.json({ disabled: true, error: 'Company intelligence is switched off by the administrator.' }, { status: 403 })
  const userId = (session.user as any).id as string
  const url = new URL(req.url)
  const fn = url.searchParams.get('fn') ?? 'intel'
  try {
    if (fn === 'screener') return NextResponse.json({ ok: true, ...(await screenerRows()) })
    const symbol = (url.searchParams.get('symbol') ?? '').slice(0, 16)
    if (!symbol) return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 })
    const intel = await companyIntel(symbol, userId, url.searchParams.get('refresh') === '1')
    return NextResponse.json({ ok: true, ...intel })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Company intelligence unavailable' }, { status: 502 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await flagEnabled('company_intelligence', true))) return NextResponse.json({ error: 'Company intelligence is switched off by the administrator.' }, { status: 403 })
  const userId = (session.user as any).id as string
  const body = await req.json().catch(() => ({}))
  const n = Math.max(1, Math.min(6, Number(body?.n) || 4))
  try {
    if (body?.type === 'scan') return NextResponse.json({ ok: true, ...(await screenerScanFundamentals(n)) })
    if (body?.type === 'prices') return NextResponse.json({ ok: true, ...(await screenerFetchPrices(n, userId)) })
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Screener request failed' }, { status: 502 })
  }
}
