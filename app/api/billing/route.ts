import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createPaymentLink, ensureSubscription, gatewayName, generateInvoice, monthKey, monthUsage, overageFor, effectivePlanKey } from '@/lib/billing'
import { PLAN_LIMITS, planLimits } from '@/lib/entitlements'

export const dynamic = 'force-dynamic'

// Customer billing portal backend.
async function me() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const userId = (session.user as any).id as string
  return { userId, email: session.user.email ?? '', isAdmin: !!(await requireAdmin(userId)) }
}

export async function GET() {
  const u = await me()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [plans, profile, sub, invoices, calls] = await Promise.all([
      prisma.billingPlan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.customerProfile.findUnique({ where: { userId: u.userId } }),
      ensureSubscription(u.userId),
      prisma.invoice.findMany({ where: { userId: u.userId }, orderBy: { createdAt: 'desc' }, take: 36 }),
      monthUsage(u.userId),
    ])
    const effective = await effectivePlanKey(u.userId, profile?.planKey ?? 'trial', u.isAdmin)
    const ov = overageFor(sub.planKey, calls)
    return NextResponse.json({
      gateway: gatewayName(),
      plans: plans.map((p) => ({ key: p.key, name: p.name, priceMonthly: p.priceMonthly, currency: p.currency, features: (() => { try { return JSON.parse(p.features ?? '[]') } catch { return [] } })(), limits: PLAN_LIMITS[p.key] ?? null })),
      profile: { status: profile?.status ?? 'trial', planKey: profile?.planKey ?? 'trial', trialEndsAt: profile?.trialEndsAt ?? null },
      subscription: sub,
      effective: { planKey: effective, limits: planLimits(effective, u.isAdmin) },
      usage: { month: monthKey(), calls, ...ov },
      invoices: invoices.map((i) => ({ ...i, lineItems: (() => { try { return JSON.parse(i.lineItems ?? '[]') } catch { return [] } })() })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load billing' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const u = await me()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const type = String(body?.type ?? '')
    const sub = await ensureSubscription(u.userId)

    if (type === 'update_details') {
      await prisma.subscription.update({ where: { id: sub.id }, data: { billingEmail: String(body?.billingEmail ?? '').slice(0, 120) || null, billingName: String(body?.billingName ?? '').slice(0, 120) || null, taxId: String(body?.taxId ?? '').slice(0, 40) || null, address: String(body?.address ?? '').slice(0, 400) || null } })
      return NextResponse.json({ ok: true })
    }

    if (type === 'choose_plan') {
      const plan = await prisma.billingPlan.findUnique({ where: { key: String(body?.planKey ?? '') } })
      if (!plan || !plan.active) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
      if (plan.key === 'trial') return NextResponse.json({ error: 'Trial cannot be re-selected. Pick a paid plan or cancel.' }, { status: 400 })
      const inv = await generateInvoice(u.userId, { planKey: plan.key, periodStart: new Date(), periodEnd: new Date(Date.now() + 30 * 86_400_000), usageMonth: monthKey(), reason: 'plan change' })
      if (inv.status === 'paid') return NextResponse.json({ ok: true, invoice: inv, message: 'Plan activated.' })
      const link = await createPaymentLink(inv.id)
      if (!link.ok) {
        // No gateway: record the request for an admin to fulfil.
        await prisma.auditLog.create({ data: { userId: u.userId, actor: 'user', action: 'PLAN CHANGE REQUESTED', category: 'billing', detail: `${u.email} requested ${plan.name} — invoice ${inv.number} ${inv.currency} ${inv.total} awaiting manual settlement (${link.error})` } }).catch(() => {})
        const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
        for (const a of admins) await prisma.notification.create({ data: { userId: a.id, kind: 'admin', title: `Plan request: ${u.email} → ${plan.name}`, body: `Invoice ${inv.number} (${inv.currency} ${inv.total}) needs manual settlement — Command → Billing.`, href: '/command/billing' } }).catch(() => {})
        return NextResponse.json({ ok: true, invoice: inv, payUrl: null, message: `Invoice ${inv.number} created. ${link.error}` })
      }
      return NextResponse.json({ ok: true, invoice: inv, payUrl: link.url })
    }

    if (type === 'pay_invoice') {
      const inv = await prisma.invoice.findFirst({ where: { id: String(body?.invoiceId ?? ''), userId: u.userId } })
      if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      const link = await createPaymentLink(inv.id)
      return link.ok ? NextResponse.json({ ok: true, payUrl: link.url }) : NextResponse.json({ error: link.error }, { status: 400 })
    }

    if (type === 'cancel') {
      await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } })
      await prisma.auditLog.create({ data: { userId: u.userId, actor: 'user', action: 'SUBSCRIPTION CANCEL SCHEDULED', category: 'billing', detail: `${u.email} cancels ${sub.planKey} at period end ${sub.currentPeriodEnd?.toISOString().slice(0, 10) ?? '—'}` } }).catch(() => {})
      return NextResponse.json({ ok: true })
    }
    if (type === 'resume') {
      await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: false } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Request failed' }, { status: 500 })
  }
}
