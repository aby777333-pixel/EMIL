import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { activateFromInvoice, createPaymentLink, gatewayName, generateInvoice, razorpayConfigured, runBillingCycle, stripeConfigured } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// Admin billing console: gateway status, subscriptions, invoices, manual
// settlement (mark paid / void), regenerate links, run the cycle now.
async function admin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const a = await requireAdmin((session.user as any).id)
  return a ? { id: a.id, email: a.email } : null
}

export async function GET() {
  const a = await admin()
  if (!a) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  const [subs, invoices, events] = await Promise.all([
    prisma.subscription.findMany({ orderBy: { updatedAt: 'desc' }, take: 200 }),
    prisma.invoice.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.paymentEvent.findMany({ orderBy: { processedAt: 'desc' }, take: 30, select: { id: true, gateway: true, eventId: true, type: true, processedAt: true } }),
  ])
  const users = await prisma.user.findMany({ where: { id: { in: Array.from(new Set([...subs.map((s) => s.userId), ...invoices.map((i) => i.userId)])) } }, select: { id: true, email: true } })
  const emailOf = new Map(users.map((u) => [u.id, u.email]))
  const mrr = subs.filter((s) => s.status === 'active').reduce((acc, s) => acc + (s.planKey === 'starter' ? 49 : s.planKey === 'pro' ? 149 : s.planKey === 'institutional' ? 499 : 0), 0)
  return NextResponse.json({
    gateway: { active: gatewayName(), razorpay: razorpayConfigured(), stripe: stripeConfigured(), razorpayWebhook: !!process.env.RAZORPAY_WEBHOOK_SECRET, stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET, cron: !!process.env.CRON_SECRET },
    summary: { subscriptions: subs.length, active: subs.filter((s) => s.status === 'active').length, pastDue: subs.filter((s) => s.status === 'past_due').length, openInvoices: invoices.filter((i) => i.status === 'open').length, openAmount: invoices.filter((i) => i.status === 'open').reduce((x, i) => x + i.total, 0), paid30d: invoices.filter((i) => i.status === 'paid' && i.paidAt && Date.now() - i.paidAt.getTime() < 30 * 86_400_000).reduce((x, i) => x + i.total, 0), mrr },
    subscriptions: subs.map((s) => ({ ...s, email: emailOf.get(s.userId) ?? s.userId })),
    invoices: invoices.map((i) => ({ ...i, email: emailOf.get(i.userId) ?? i.userId })),
    events,
  })
}

export async function POST(req: Request) {
  const a = await admin()
  if (!a) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const type = String(body?.type ?? '')
  try {
    if (type === 'run_cycle') return NextResponse.json({ ok: true, ...(await runBillingCycle()) })
    if (type === 'mark_paid' || type === 'void' || type === 'relink') {
      const inv = await prisma.invoice.findUnique({ where: { id: String(body?.invoiceId ?? '') } })
      if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      if (type === 'mark_paid') {
        await activateFromInvoice(inv.id, `manual:${a.email}${body?.note ? `:${String(body.note).slice(0, 80)}` : ''}`, 'manual')
        await prisma.auditLog.create({ data: { userId: a.id, actor: 'user', action: 'INVOICE MARKED PAID (ADMIN)', category: 'billing', detail: `${a.email} settled ${inv.number} manually${body?.note ? ` — ${String(body.note).slice(0, 200)}` : ''}` } }).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      if (type === 'void') {
        await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'void' } })
        await prisma.auditLog.create({ data: { userId: a.id, actor: 'user', action: 'INVOICE VOIDED', category: 'billing', detail: `${a.email} voided ${inv.number}` } }).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      await prisma.invoice.update({ where: { id: inv.id }, data: { payUrl: null, gatewayRef: null } })
      const link = await createPaymentLink(inv.id)
      return link.ok ? NextResponse.json({ ok: true, payUrl: link.url }) : NextResponse.json({ error: link.error }, { status: 400 })
    }
    if (type === 'issue_invoice') {
      const user = await prisma.user.findFirst({ where: { OR: [{ id: String(body?.userId ?? '') }, { email: String(body?.email ?? '').toLowerCase() }] } })
      if (!user) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      const inv = await generateInvoice(user.id, { planKey: String(body?.planKey ?? 'starter'), periodStart: new Date(), periodEnd: new Date(Date.now() + 30 * 86_400_000), reason: 'admin' })
      const link = inv.status === 'open' ? await createPaymentLink(inv.id) : { ok: true }
      return NextResponse.json({ ok: true, invoice: inv, link })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Request failed' }, { status: 500 })
  }
}
