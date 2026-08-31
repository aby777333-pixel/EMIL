import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [state, account, conn, positions, strategies, regimes, correlations, exposures, learningEvents, rejected, riskProfile, health] = await Promise.all([
      prisma.emilState.findFirst(),
      prisma.tradingAccount.findFirst(),
      prisma.brokerConnection.findFirst(),
      prisma.position.findMany({ where: { status: { in: ['open', 'pending'] } }, include: { instrument: true }, orderBy: { openedAt: 'desc' } }),
      prisma.strategyVersion.findMany({ where: { stage: 'production' }, orderBy: { healthScore: 'desc' } }),
      prisma.marketRegime.findMany({ orderBy: { symbol: 'asc' } }),
      prisma.correlationSnapshot.findMany({ where: { cluster: { not: null } } }),
      prisma.portfolioExposure.findMany(),
      prisma.learningEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.tradeCandidate.findMany({ where: { status: 'rejected' }, include: { instrument: true }, orderBy: { createdAt: 'desc' }, take: 3 }),
      prisma.riskProfile.findFirst({ where: { isActive: true } }),
      prisma.systemHealth.findMany(),
    ])
    const openLots = positions?.filter((p: any) => p?.status === 'open')?.reduce((s: number, p: any) => s + (p?.lots ?? 0), 0) ?? 0
    return NextResponse.json({
      state, account, broker: conn, positions, strategies, regimes, correlations, exposures,
      learningEvents, rejected, riskProfile, health, openLots,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
