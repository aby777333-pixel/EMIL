import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { flagEnabled } from '@/lib/flags'
import { instrumentReport } from '@/lib/report'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Instrument research report (spec §67–69): GET /api/report?symbol=XAUUSD[&refresh=1]
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  if (!(await flagEnabled('research_reports', true))) return NextResponse.json({ disabled: true })
  if (!process.env.ABACUSAI_API_KEY) return NextResponse.json({ error: 'AI engine not configured — set ABACUSAI_API_KEY in the server environment.' }, { status: 503 })
  try {
    const url = new URL(req.url)
    const symbol = (url.searchParams.get('symbol') ?? '').trim().slice(0, 24)
    if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
    const refresh = url.searchParams.get('refresh') === '1'
    const isAdmin = !!(await requireAdmin(userId))
    const report = await instrumentReport(userId, isAdmin, symbol, refresh)
    return NextResponse.json({ ok: true, report, disclaimer: 'Model assessment from delayed research data and calculated statistics. Research, not advice.' })
  } catch (e: any) {
    console.error(e)
    if (e?.rateLimited) return NextResponse.json({ error: 'Market-data budget reached — retry in a minute.', retryAfterSec: e.retryAfterSec ?? 30 }, { status: 429 })
    return NextResponse.json({ error: e?.message ?? 'Report unavailable' }, { status: 502 })
  }
}
