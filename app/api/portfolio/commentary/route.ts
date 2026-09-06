import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { flagEnabled } from '@/lib/flags'
import { portfolioCommentary } from '@/lib/portfolio-commentary'

export const dynamic = 'force-dynamic'

// Portfolio AI commentary (spec §28–29). One LLM call per user per hour;
// `?refresh=1` regenerates. Model assessment from calculated data — not advice.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await flagEnabled('portfolio_commentary', true))) return NextResponse.json({ disabled: true })
  const userId = (session.user as any).id as string
  const isAdmin = !!(await requireAdmin(userId))
  try {
    const refresh = new URL(req.url).searchParams.get('refresh') === '1'
    const c = await portfolioCommentary(userId, isAdmin, refresh)
    return NextResponse.json({ ok: true, ...c })
  } catch (e: any) {
    const msg = String(e?.message ?? 'Commentary unavailable')
    return NextResponse.json({ error: msg }, { status: /not configured/i.test(msg) ? 503 : 500 })
  }
}
