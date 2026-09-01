import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Command Center overview — the business + platform pulse.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await requireAdmin((session.user as any).id)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const [statusCounts, plans, profiles, recentCustomers, apiKeyCount, connectionCount, recentAudit, health] = await Promise.all([
      prisma.customerProfile.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.billingPlan.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.customerProfile.findMany({ select: { planKey: true, status: true, createdAt: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, email: true, name: true, role: true, createdAt: true, profile: { select: { status: true, planKey: true, lastSeenAt: true } } } }),
      prisma.apiKey.count({ where: { status: 'active' } }),
      prisma.userBrokerConnection.count(),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30, include: { user: { select: { email: true } } } }),
      prisma.systemHealth.findMany({ orderBy: { component: 'asc' } }),
    ])

    const byStatus: Record<string, number> = {}
    for (const s of statusCounts) byStatus[s.status] = s._count._all
    const priceByPlan = new Map(plans.map((p) => [p.key, p.priceMonthly]))
    const mrr = profiles.filter((p) => p.status === 'active').reduce((acc, p) => acc + (priceByPlan.get(p.planKey) ?? 0), 0)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const newThisWeek = profiles.filter((p) => p.createdAt >= weekAgo).length
    const planCounts: Record<string, number> = {}
    for (const p of profiles) planCounts[p.planKey] = (planCounts[p.planKey] ?? 0) + 1

    return NextResponse.json({
      byStatus, mrr, newThisWeek, planCounts, plans,
      totalCustomers: profiles.length,
      apiKeyCount, connectionCount,
      recentCustomers, recentAudit, health,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load command overview' }, { status: 500 })
  }
}
