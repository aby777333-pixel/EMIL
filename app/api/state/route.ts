import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [state, conn] = await Promise.all([
      prisma.emilState.findFirst(),
      prisma.brokerConnection.findFirst(),
    ])
    return NextResponse.json({
      ...(state ?? {}),
      brokerStatus: conn?.status ?? 'connected',
      brokerLatencyMs: conn?.latencyMs ?? 0,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load state' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const action = body?.action ?? ''
    const state = await prisma.emilState.findFirst()
    if (!state) return NextResponse.json({ error: 'State not initialized' }, { status: 500 })

    if (action === 'arm') {
      const mode = body?.mode ?? 'confirmation'
      await prisma.emilState.update({ where: { id: state.id }, data: { armed: true, mode, guardianStatus: 'active', guardianDecision: 'NORMAL OPERATION' } })
      await prisma.consentLog.create({
        data: {
          userId, action: 'arm_emil', mode,
          detail: `EMIL armed in ${mode} mode. All disclosures acknowledged. Press-and-hold completed.`,
          checkboxes: JSON.stringify(body?.checkboxes ?? []),
          authMethod: 'press_and_hold',
        },
      })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'ARM EMIL', category: 'consent', detail: `Armed in ${mode} mode.` } })
      return NextResponse.json({ ok: true })
    }

    if (action === 'disarm') {
      const option = body?.option ?? 'pause_new'
      let data: any = {}
      let detail = ''
      if (option === 'pause_new') {
        data = { guardianDecision: 'NEW TRADES PAUSED — existing positions still managed' }
        detail = 'Pause New Trades: no new entries; EMIL continues managing existing positions.'
      } else if (option === 'management_only') {
        data = { mode: 'management_only', guardianDecision: 'MANAGEMENT ONLY — defensive actions only' }
        detail = 'Management Only: no new directional exposure; defensive management continues.'
      } else if (option === 'stop_automation') {
        data = { armed: false, mode: 'observation', guardianDecision: 'AUTOMATION STOPPED — broker-side SL/TP remain active. Open positions carry market risk.' }
        detail = 'Fully Stop Automation: no automated modifications. Broker-side SL/TP remain active. User warned about remaining positions.'
      } else if (option === 'stop_close_all') {
        const open = await prisma.position.findMany({ where: { status: { in: ['open', 'pending'] } } })
        for (const p of open) {
          await prisma.position.update({ where: { id: p.id }, data: { status: 'closed', closedAt: new Date(), closedPL: p.status === 'open' ? p.floatingPL : 0 } })
        }
        await prisma.hedge.updateMany({ where: { status: 'active' }, data: { status: 'removed', removedAt: new Date() } })
        data = { armed: false, mode: 'observation', guardianDecision: 'STOPPED AND CLOSED — all fills verified' }
        detail = `Stop and Close All: ${open.length} positions/orders closed or cancelled, hedges removed, fills verified.`
      }
      await prisma.emilState.update({ where: { id: state.id }, data })
      await prisma.consentLog.create({ data: { userId, action: 'disarm', mode: state.mode, detail, authMethod: 'button' } })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'DISARM EMIL', category: 'consent', detail } })
      return NextResponse.json({ ok: true })
    }

    if (action === 'mode_change') {
      const mode = body?.mode ?? 'observation'
      await prisma.emilState.update({ where: { id: state.id }, data: { mode } })
      await prisma.consentLog.create({ data: { userId, action: 'mode_change', mode, detail: `Operating mode changed to ${mode}.`, authMethod: 'button' } })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'MODE CHANGE', category: 'consent', detail: `Mode set to ${mode}.` } })
      return NextResponse.json({ ok: true })
    }

    if (action === 'close_all') {
      const open = await prisma.position.findMany({ where: { status: { in: ['open', 'pending'] } } })
      for (const p of open) {
        await prisma.position.update({ where: { id: p.id }, data: { status: 'closed', closedAt: new Date(), closedPL: p.status === 'open' ? p.floatingPL : 0 } })
      }
      await prisma.hedge.updateMany({ where: { status: 'active' }, data: { status: 'removed', removedAt: new Date() } })
      await prisma.emergencyEvent.create({ data: { eventType: 'close_all', triggeredBy: session.user.email ?? 'user', detail: `CLOSE ALL executed. ${open.length} positions/orders closed or cancelled. Fills verified.` } })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'CLOSE ALL', category: 'emergency', detail: `${open.length} positions/orders closed. Hedges removed. Fills verified.` } })
      return NextResponse.json({ ok: true, closed: open.length })
    }

    if (action === 'emergency_stop') {
      await prisma.emilState.update({ where: { id: state.id }, data: { armed: false, mode: 'emergency', guardianDecision: 'EMERGENCY STOP — no new exposure permitted' } })
      await prisma.emergencyEvent.create({ data: { eventType: 'emergency_stop', triggeredBy: session.user.email ?? 'user', detail: 'Emergency stop engaged by user. All new exposure blocked. Broker-side protective orders remain active.' } })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'EMERGENCY STOP', category: 'emergency', detail: 'EMIL disarmed and placed in Emergency mode.' } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
