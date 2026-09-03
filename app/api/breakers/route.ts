import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { evaluateBreakers } from '@/lib/breakers'

export const dynamic = 'force-dynamic'

// Circuit breakers (spec §30–31): live evaluation (+ enforcement) and trip history.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const force = new URL(req.url).searchParams.get('force') === '1'
    const report = await evaluateBreakers({ enforce: true, force })
    return NextResponse.json({ ok: true, ...report })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Breaker evaluation failed' }, { status: 500 })
  }
}

// Admin: mark a trip event as resolved (re-arming still goes through /arm).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const admin = await requireAdmin(userId)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.type === 'resolve') {
      await prisma.emergencyEvent.updateMany({ where: { id: String(body?.id ?? ''), eventType: 'circuit_breaker' }, data: { resolved: true } })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'CIRCUIT BREAKER RESOLVED', category: 'risk', detail: `Trip ${String(body?.id ?? '')} acknowledged by ${admin.email}.` } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Breaker action failed' }, { status: 500 })
  }
}
