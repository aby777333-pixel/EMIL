import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { consolidatedPortfolio } from '@/lib/portfolio'

export const dynamic = 'force-dynamic'

// Consolidated portfolio & exposure (spec §28–29). Cached 60 s per user;
// `?refresh=1` forces a fresh pull from every linked venue.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const isAdmin = !!(await requireAdmin(userId))
  try {
    const refresh = new URL(req.url).searchParams.get('refresh') === '1'
    const portfolio = await consolidatedPortfolio(userId, isAdmin, refresh)
    return NextResponse.json({ ok: true, ...portfolio })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Portfolio unavailable' }, { status: 500 })
  }
}
