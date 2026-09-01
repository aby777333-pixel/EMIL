import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// EMIL SUPER ADMIN CONSOLE — every action here is role-gated against the
// database (not just the JWT) and written to the audit log.

const clampConf = (v: any) => Math.max(0, Math.min(100, Number(v) || 0))

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await requireAdmin((session.user as any).id)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const [users, sources, hypotheses, blueprints, contradictions, auditLogs, confidenceEvents, permissions, emilState] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
      prisma.researchSource.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, title: true, url: true, sourceType: true, status: true, reliability: true, claimCount: true, fetchError: true, createdAt: true } }),
      prisma.researchHypothesis.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }),
      prisma.strategyBlueprint.findMany({ orderBy: [{ code: 'asc' }, { createdAt: 'desc' }], take: 120 }),
      prisma.knowledgeContradiction.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 120, include: { user: { select: { email: true } } } }),
      prisma.confidenceEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }),
      prisma.permission.findMany({ orderBy: { category: 'asc' } }),
      prisma.emilState.findFirst(),
    ])
    return NextResponse.json({ users, sources, hypotheses, blueprints, contradictions, auditLogs, confidenceEvents, permissions, emilState, adminEmail: admin.email })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load the admin console' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const admin = await requireAdmin(userId)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const audit = (action: string, detail: string) =>
      prisma.auditLog.create({ data: { userId, actor: 'user', action, category: 'super_admin', detail: detail.slice(0, 1500) } })

    // ---- Source controls ----
    if (body?.type === 'quarantine_source' || body?.type === 'restore_source') {
      const s = await prisma.researchSource.findUnique({ where: { id: body?.id ?? '' } })
      if (!s) return NextResponse.json({ error: 'Source not found' }, { status: 404 })
      const status = body.type === 'quarantine_source' ? 'quarantined' : s.extractedText ? 'fetched' : 'queued'
      await prisma.researchSource.update({ where: { id: s.id }, data: { status } })
      await audit(body.type === 'quarantine_source' ? 'SOURCE QUARANTINED' : 'SOURCE RESTORED', `"${s.title}" (${s.url ?? 'no url'}) → ${status}`)
      return NextResponse.json({ ok: true })
    }
    if (body?.type === 'delete_source') {
      const s = await prisma.researchSource.findUnique({ where: { id: body?.id ?? '' } })
      if (!s) return NextResponse.json({ error: 'Source not found' }, { status: 404 })
      await prisma.researchSource.delete({ where: { id: s.id } }) // claims cascade
      await audit('SOURCE DELETED', `"${s.title}" (${s.url ?? 'no url'}) and its claims removed by ${admin.email}.`)
      return NextResponse.json({ ok: true })
    }
    if (body?.type === 'set_reliability') {
      const s = await prisma.researchSource.findUnique({ where: { id: body?.id ?? '' } })
      if (!s) return NextResponse.json({ error: 'Source not found' }, { status: 404 })
      const reliability = ['unrated', 'low', 'medium', 'high', 'flagged'].includes(body?.value) ? body.value : 'unrated'
      await prisma.researchSource.update({ where: { id: s.id }, data: { reliability } })
      await audit('SOURCE RELIABILITY SET', `"${s.title}" reliability → ${reliability}.`)
      return NextResponse.json({ ok: true })
    }

    // ---- Confidence override with a mandatory reason (audit-trailed) ----
    if (body?.type === 'set_confidence') {
      const reason = String(body?.reason ?? '').trim()
      if (!reason) return NextResponse.json({ error: 'A reason is required for every confidence override.' }, { status: 400 })
      const value = clampConf(body?.value)
      const targetType = String(body?.targetType ?? '')
      let previous = 0
      let name = ''
      if (targetType === 'concept') {
        const t = await prisma.knowledgeConcept.findUnique({ where: { id: body?.id ?? '' } })
        if (!t) return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
        previous = t.confidence; name = t.name
        await prisma.knowledgeConcept.update({ where: { id: t.id }, data: { confidence: value } })
      } else if (targetType === 'claim') {
        const t = await prisma.knowledgeClaim.findUnique({ where: { id: body?.id ?? '' } })
        if (!t) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
        previous = t.confidence; name = t.claimText.slice(0, 80)
        await prisma.knowledgeClaim.update({ where: { id: t.id }, data: { confidence: value } })
      } else if (targetType === 'hypothesis') {
        const t = await prisma.researchHypothesis.findUnique({ where: { id: body?.id ?? '' } })
        if (!t) return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 })
        previous = t.confidence; name = t.title
        await prisma.researchHypothesis.update({ where: { id: t.id }, data: { confidence: value } })
      } else {
        return NextResponse.json({ error: 'Unknown target type' }, { status: 400 })
      }
      await prisma.confidenceEvent.create({
        data: { targetType, targetId: body.id, targetName: name.slice(0, 200), previous, next: value, reason, actor: 'admin' },
      })
      await audit('CONFIDENCE OVERRIDE', `${targetType} "${name}" ${Math.round(previous)} → ${value}. Reason: ${reason}`)
      return NextResponse.json({ ok: true })
    }

    // ---- Hypothesis approvals ----
    if (body?.type === 'set_hypothesis_status') {
      const t = await prisma.researchHypothesis.findUnique({ where: { id: body?.id ?? '' } })
      if (!t) return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 })
      const status = ['proposed', 'researching', 'testing', 'supported', 'weak', 'rejected', 'regime_dependent'].includes(body?.value) ? body.value : t.status
      await prisma.researchHypothesis.update({ where: { id: t.id }, data: { status, approvedBy: ['supported', 'rejected'].includes(status) ? admin.email : t.approvedBy } })
      await audit('HYPOTHESIS STATUS SET', `"${t.title}" → ${status}.`)
      return NextResponse.json({ ok: true })
    }

    // ---- Contradiction resolution ----
    if (body?.type === 'resolve_contradiction') {
      const t = await prisma.knowledgeContradiction.findUnique({ where: { id: body?.id ?? '' } })
      if (!t) return NextResponse.json({ error: 'Contradiction not found' }, { status: 404 })
      const status = ['open', 'investigating', 'resolved_regime', 'resolved_timeframe', 'resolved_instrument', 'rejected_a', 'rejected_b', 'unresolved'].includes(body?.value) ? body.value : t.status
      await prisma.knowledgeContradiction.update({ where: { id: t.id }, data: { status, resolutionNote: String(body?.note ?? '').slice(0, 1500) || t.resolutionNote } })
      await audit('CONTRADICTION RESOLVED', `"${t.topic}" → ${status}. ${String(body?.note ?? '').slice(0, 300)}`)
      return NextResponse.json({ ok: true })
    }

    // ---- Claim correction ----
    if (body?.type === 'correct_claim') {
      const t = await prisma.knowledgeClaim.findUnique({ where: { id: body?.id ?? '' } })
      if (!t) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
      const text = String(body?.value ?? '').trim().slice(0, 2000)
      if (!text) return NextResponse.json({ error: 'Corrected text required' }, { status: 400 })
      await prisma.knowledgeClaim.update({ where: { id: t.id }, data: { claimText: text } })
      await audit('CLAIM CORRECTED', `Claim ${t.id}: "${t.claimText.slice(0, 200)}" → "${text.slice(0, 200)}"`)
      return NextResponse.json({ ok: true })
    }

    // ---- Strategy rollback (version pointer, history preserved) ----
    if (body?.type === 'rollback_strategy') {
      const target = await prisma.strategyBlueprint.findUnique({ where: { id: body?.id ?? '' } })
      if (!target) return NextResponse.json({ error: 'Strategy version not found' }, { status: 404 })
      await prisma.strategyBlueprint.updateMany({ where: { code: target.code }, data: { isCurrent: false } })
      await prisma.strategyBlueprint.update({ where: { id: target.id }, data: { isCurrent: true } })
      await audit('STRATEGY ROLLBACK', `${target.code} current version set to v${target.version} by ${admin.email}. Later versions retained in history.`)
      return NextResponse.json({ ok: true })
    }

    // ---- User roles ----
    if (body?.type === 'set_user_role') {
      const t = await prisma.user.findUnique({ where: { id: body?.id ?? '' } })
      if (!t) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const role = body?.value === 'admin' ? 'admin' : 'trader'
      if (t.id === admin.id && role !== 'admin') {
        const otherAdmins = await prisma.user.count({ where: { role: 'admin', id: { not: admin.id } } })
        if (otherAdmins === 0) return NextResponse.json({ error: 'Cannot demote the last remaining admin.' }, { status: 409 })
      }
      await prisma.user.update({ where: { id: t.id }, data: { role } })
      await audit('USER ROLE SET', `${t.email} → ${role}.`)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Admin action failed' }, { status: 500 })
  }
}
