import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [profile, drawdowns, correlations, exposures, account, positions, overrides, instruments] = await Promise.all([
      prisma.riskProfile.findFirst({ where: { isActive: true } }),
      prisma.drawdownEvent.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.correlationSnapshot.findMany(),
      prisma.portfolioExposure.findMany(),
      prisma.tradingAccount.findFirst(),
      prisma.position.findMany({ where: { status: 'open' }, include: { instrument: true } }),
      prisma.riskOverride.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.instrument.findMany({ include: { spec: true } }),
    ])
    return NextResponse.json({ profile, drawdowns, correlations, exposures, account, positions, overrides, instruments })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load risk data' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.type !== 'lot_override') return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
    const newValue = Number(body?.newValue ?? 0)
    if (!newValue || newValue <= 0) return NextResponse.json({ error: 'Invalid exposure value' }, { status: 400 })
    if (!body?.acknowledged) return NextResponse.json({ error: 'Acknowledgement is required' }, { status: 400 })

    const override = await prisma.riskOverride.create({
      data: {
        userId,
        parameter: 'max_aggregate_exposure',
        previousValue: String(body?.previousValue ?? '0.05'),
        newValue: String(newValue),
        duration: body?.duration ?? 'one_session',
        scenarioText: body?.scenarioText ?? null,
        acknowledged: true,
        active: true,
      },
    })
    const profile = await prisma.riskProfile.findFirst({ where: { isActive: true } })
    if (profile) await prisma.riskProfile.update({ where: { id: profile.id }, data: { maxAggregateExposure: newValue } })
    await prisma.consentLog.create({
      data: {
        userId, action: 'lot_override',
        detail: `Maximum EMIL exposure override: ${body?.previousValue ?? '0.05'} → ${newValue} lots for duration "${body?.duration}". Higher Exposure Warning acknowledged.`,
        checkboxes: JSON.stringify(['higher_exposure_warning']),
        authMethod: 'checkbox_confirmation',
      },
    })
    await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'LOT OVERRIDE', category: 'risk', detail: `Max aggregate exposure changed to ${newValue} lots (${body?.duration}).` } })
    return NextResponse.json({ ok: true, override })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Override failed' }, { status: 500 })
  }
}
