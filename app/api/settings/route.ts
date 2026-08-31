import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [permissions, consents, audits, health, profile, emergencies] = await Promise.all([
      prisma.permission.findMany({ orderBy: { category: 'asc' } }),
      prisma.consentLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
      prisma.systemHealth.findMany(),
      prisma.riskProfile.findFirst({ where: { isActive: true } }),
      prisma.emergencyEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ])
    return NextResponse.json({ permissions, consents, audits, health, profile, emergencies })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.type === 'toggle_permission') {
      const perm = await prisma.permission.findUnique({ where: { key: body?.key ?? '' } })
      if (!perm) return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
      const updated = await prisma.permission.update({ where: { id: perm.id }, data: { granted: !perm.granted } })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'PERMISSION CHANGE', category: 'consent', detail: `"${perm.label}" ${updated.granted ? 'GRANTED' : 'REVOKED'}.` },
      })
      return NextResponse.json({ ok: true, permission: updated })
    }
    if (body?.type === 'update_risk_profile') {
      const profile = await prisma.riskProfile.findFirst({ where: { isActive: true } })
      if (!profile) return NextResponse.json({ error: 'No active profile' }, { status: 404 })
      const fields = ['maxRiskPerTradePct', 'dailyLossLimitPct', 'weeklyLossLimitPct', 'maxDrawdownPct', 'maxMarginUtilPct', 'maxOpenPositions'] as const
      const data: any = {}
      for (const f of fields) {
        if (body?.[f] !== undefined && body?.[f] !== null) data[f] = f === 'maxOpenPositions' ? Number(body[f]) : Number(body[f])
      }
      const updated = await prisma.riskProfile.update({ where: { id: profile.id }, data })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'RISK PROFILE UPDATE', category: 'risk', detail: `Risk profile parameters updated: ${JSON.stringify(data)}` } })
      return NextResponse.json({ ok: true, profile: updated })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
