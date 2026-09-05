// Billing (round D): subscriptions, monthly invoices (plan base + metered API
// overage), gateway payment links (Razorpay / Stripe, env-gated, REST via
// fetch — no SDKs), webhook verification and entitlement enforcement.
// Standing rule: nothing charges automatically without a configured gateway;
// with no gateway, plan changes are requests an admin fulfils.

import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db'
import { PLAN_LIMITS, planLimits } from '@/lib/entitlements'
import { timeoutFetch } from '@/lib/execution/types'

export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY
export const gatewayName = (): 'razorpay' | 'stripe' | null => (razorpayConfigured() ? 'razorpay' : stripeConfigured() ? 'stripe' : null)
const USD_INR = Number(process.env.USD_INR_RATE ?? 84)
const GRACE_DAYS = 7
const CHURN_DAYS = 30

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7)
const startOfMonth = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
const addMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))

export async function ensureSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({ where: { userId } })
  if (existing) return existing
  const profile = await prisma.customerProfile.findUnique({ where: { userId } })
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  return prisma.subscription.create({ data: { userId, planKey: profile?.planKey ?? 'trial', status: profile?.status === 'active' ? 'active' : 'trialing', currentPeriodStart: startOfMonth(), currentPeriodEnd: profile?.trialEndsAt ?? addMonth(startOfMonth()), billingEmail: user?.email ?? null, billingName: user?.name ?? null } })
}

// Calls made this calendar month (UTC) across all the user's keys.
export async function monthUsage(userId: string, month = monthKey()) {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`select coalesce(sum(count),0)::bigint as n from api_usage where "userId" = ${userId} and day like ${`${month}-%`}`.catch(() => [{ n: BigInt(0) }])
  return Number(rows?.[0]?.n ?? 0)
}

export function overageFor(planKey: string, calls: number) {
  const l = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.trial
  const extra = Math.max(0, calls - l.includedCallsPerMonth)
  return { included: l.includedCallsPerMonth, extra, amount: Math.round((extra / 1000) * l.overagePer1k * 100) / 100, per1k: l.overagePer1k }
}

// The plan whose limits actually apply: past-due or cancelled subscriptions
// fall back to trial limits until an invoice is paid.
export async function effectivePlanKey(userId: string, profilePlanKey: string, isAdmin: boolean) {
  if (isAdmin) return profilePlanKey
  const sub = await prisma.subscription.findUnique({ where: { userId }, select: { status: true, planKey: true } }).catch(() => null)
  if (!sub) return profilePlanKey
  if (sub.status === 'past_due' || sub.status === 'cancelled') return 'trial'
  return sub.planKey || profilePlanKey
}

async function nextInvoiceNumber() {
  const y = new Date().getUTCFullYear()
  const count = await prisma.invoice.count({ where: { number: { startsWith: `EMIL-${y}-` } } })
  return `EMIL-${y}-${String(count + 1).padStart(5, '0')}`
}

// Generate (or return) the invoice for a subscription period.
export async function generateInvoice(userId: string, opts: { planKey?: string; periodStart?: Date; periodEnd?: Date; usageMonth?: string; reason?: string } = {}) {
  const sub = await ensureSubscription(userId)
  const planKey = opts.planKey ?? sub.planKey
  const plan = await prisma.billingPlan.findUnique({ where: { key: planKey } })
  if (!plan) throw new Error(`Unknown plan ${planKey}`)
  const periodStart = opts.periodStart ?? startOfMonth()
  const periodEnd = opts.periodEnd ?? addMonth(periodStart)
  const existing = await prisma.invoice.findFirst({ where: { userId, planKey, periodStart, status: { in: ['open', 'paid'] } } })
  if (existing) return existing
  const usageMonth = opts.usageMonth ?? monthKey(new Date(periodStart.getTime() - 1))
  const calls = await monthUsage(userId, usageMonth)
  const ov = overageFor(sub.planKey, calls)
  const base = plan.priceMonthly
  const total = Math.round((base + ov.amount) * 100) / 100
  const lineItems = [
    { label: `${plan.name} plan — ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`, amount: base },
    ...(ov.amount > 0 ? [{ label: `API overage ${usageMonth}: ${ov.extra.toLocaleString()} calls above ${ov.included.toLocaleString()} included @ $${ov.per1k}/1k`, amount: ov.amount }] : []),
  ]
  const inv = await prisma.invoice.create({ data: { subscriptionId: sub.id, userId, number: await nextInvoiceNumber(), planKey, periodStart, periodEnd, currency: plan.currency || 'USD', baseAmount: base, usageCalls: calls, overageAmount: ov.amount, total, status: total <= 0 ? 'paid' : 'open', paidAt: total <= 0 ? new Date() : null, lineItems: JSON.stringify(lineItems) } })
  if (inv.status === 'paid') await activateFromInvoice(inv.id, 'zero-amount')
  return inv
}

// ---- Gateways ----------------------------------------------------------------
function formEncode(obj: Record<string, any>, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k
    if (v === undefined || v === null) continue
    if (typeof v === 'object' && !Array.isArray(v)) out.push(...formEncode(v, key))
    else if (Array.isArray(v)) v.forEach((item, i) => out.push(...(typeof item === 'object' ? formEncode(item, `${key}[${i}]`) : [`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`])))
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
  }
  return out
}

export async function createPaymentLink(invoiceId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { subscription: true } })
  if (!inv) return { ok: false, error: 'Invoice not found' }
  if (inv.status !== 'open') return { ok: false, error: `Invoice is ${inv.status}` }
  if (inv.payUrl && inv.gateway === gatewayName()) return { ok: true, url: inv.payUrl }
  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  const email = inv.subscription?.billingEmail ?? (await prisma.user.findUnique({ where: { id: inv.userId }, select: { email: true } }))?.email ?? ''
  try {
    if (razorpayConfigured()) {
      const currency = (process.env.RAZORPAY_CURRENCY ?? 'INR').toUpperCase()
      const amountMajor = currency === 'INR' && inv.currency === 'USD' ? inv.total * USD_INR : inv.total
      const res = await timeoutFetch('https://api.razorpay.com/v1/payment_links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}` },
        body: JSON.stringify({ amount: Math.round(amountMajor * 100), currency, accept_partial: false, description: `EMIL invoice ${inv.number}`, reference_id: inv.number, customer: { email, name: inv.subscription?.billingName ?? undefined }, notify: { email: !!email, sms: false }, reminder_enable: true, callback_url: `${base}/billing?paid=${inv.number}`, callback_method: 'get', notes: { invoice: inv.number, userId: inv.userId } }),
      }, 15000)
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.short_url) return { ok: false, error: j?.error?.description ?? `Razorpay responded ${res.status}` }
      await prisma.invoice.update({ where: { id: inv.id }, data: { gateway: 'razorpay', gatewayRef: j.id, payUrl: j.short_url } })
      return { ok: true, url: j.short_url }
    }
    if (stripeConfigured()) {
      const body = formEncode({
        mode: 'payment', client_reference_id: inv.number, customer_email: email || undefined,
        success_url: `${base}/billing?paid=${inv.number}`, cancel_url: `${base}/billing?cancelled=${inv.number}`,
        line_items: [{ quantity: 1, price_data: { currency: inv.currency.toLowerCase(), unit_amount: Math.round(inv.total * 100), product_data: { name: `EMIL ${inv.planKey} — invoice ${inv.number}` } } }],
        metadata: { invoice: inv.number, userId: inv.userId },
      }).join('&')
      const res = await timeoutFetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }, body }, 15000)
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.url) return { ok: false, error: j?.error?.message ?? `Stripe responded ${res.status}` }
      await prisma.invoice.update({ where: { id: inv.id }, data: { gateway: 'stripe', gatewayRef: j.id, payUrl: j.url } })
      return { ok: true, url: j.url }
    }
    return { ok: false, error: 'No payment gateway is configured (RAZORPAY_KEY_ID/SECRET or STRIPE_SECRET_KEY). An admin can mark the invoice paid manually.' }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'gateway error' }
  }
}

export function verifyRazorpaySignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export function verifyStripeSignature(rawBody: string, header: string | null, toleranceSec = 300) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !header) return false
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]))
  const t = Number(parts.t)
  const v1 = parts.v1
  if (!t || !v1 || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')
  return expected.length === v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
}

// Mark paid → subscription active on the invoice's plan, profile active, MRR set.
export async function activateFromInvoice(invoiceId: string, ref: string, gateway?: string) {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  if (!inv) return null
  if (inv.status !== 'paid') await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'paid', paidAt: new Date(), gatewayRef: ref, ...(gateway ? { gateway } : {}) } })
  const plan = await prisma.billingPlan.findUnique({ where: { key: inv.planKey } })
  await prisma.subscription.upsert({
    where: { userId: inv.userId },
    update: { planKey: inv.planKey, status: 'active', currentPeriodStart: inv.periodStart, currentPeriodEnd: inv.periodEnd, cancelAtPeriodEnd: false, gateway: gateway ?? inv.gateway ?? 'manual' },
    create: { userId: inv.userId, planKey: inv.planKey, status: 'active', currentPeriodStart: inv.periodStart, currentPeriodEnd: inv.periodEnd, gateway: gateway ?? inv.gateway ?? 'manual' },
  })
  await prisma.customerProfile.upsert({ where: { userId: inv.userId }, update: { planKey: inv.planKey, status: 'active', mrr: plan?.priceMonthly ?? 0 }, create: { userId: inv.userId, planKey: inv.planKey, status: 'active', mrr: plan?.priceMonthly ?? 0 } })
  await prisma.auditLog.create({ data: { userId: inv.userId, actor: 'system', action: 'INVOICE PAID', category: 'billing', detail: `${inv.number} ${inv.currency} ${inv.total} via ${gateway ?? inv.gateway ?? 'manual'} (${ref}) — plan ${inv.planKey} active until ${inv.periodEnd.toISOString().slice(0, 10)}` } }).catch(() => {})
  await prisma.notification.create({ data: { userId: inv.userId, kind: 'system', title: `Invoice ${inv.number} paid — thank you`, body: `${inv.planKey} is active until ${inv.periodEnd.toISOString().slice(0, 10)}.`, href: '/billing' } }).catch(() => {})
  return inv
}

// Monthly cycle: renew active subscriptions whose period ended (new invoice +
// payment link), move unpaid ones to past_due after the grace period, churn
// after 30 days. Idempotent; safe to run daily.
export async function runBillingCycle() {
  const now = new Date()
  const out = { renewed: 0, pastDue: 0, churned: 0, trialsEnded: 0 }
  const subs = await prisma.subscription.findMany({ where: { status: { in: ['active', 'trialing', 'past_due'] } } })
  for (const s of subs) {
    if (!s.currentPeriodEnd || s.currentPeriodEnd > now) continue
    if (s.status === 'trialing') {
      // Trial ended: stays on trial limits; the customer picks a plan from /billing.
      await prisma.subscription.update({ where: { id: s.id }, data: { status: 'cancelled' } })
      await prisma.notification.create({ data: { userId: s.userId, kind: 'system', title: 'Your EMIL trial has ended', body: 'Choose a plan to keep Starter/Pro limits. Research features stay available on trial limits.', href: '/billing' } }).catch(() => {})
      out.trialsEnded += 1
      continue
    }
    if (s.cancelAtPeriodEnd) {
      await prisma.subscription.update({ where: { id: s.id }, data: { status: 'cancelled' } })
      await prisma.customerProfile.update({ where: { userId: s.userId }, data: { status: 'churned', mrr: 0 } }).catch(() => {})
      out.churned += 1
      continue
    }
    const open = await prisma.invoice.findFirst({ where: { userId: s.userId, status: 'open', periodStart: s.currentPeriodEnd } })
    if (!open) {
      const inv = await generateInvoice(s.userId, { planKey: s.planKey, periodStart: s.currentPeriodEnd, periodEnd: addMonth(s.currentPeriodEnd), usageMonth: monthKey(new Date(s.currentPeriodEnd.getTime() - 1)), reason: 'renewal' })
      const link = await createPaymentLink(inv.id)
      await prisma.notification.create({ data: { userId: s.userId, kind: 'system', title: `Invoice ${inv.number}: ${inv.currency} ${inv.total}`, body: link.ok ? 'Pay from Plan & Billing to keep your plan active.' : `Payment link unavailable: ${link.error}`, href: '/billing' } }).catch(() => {})
      out.renewed += 1
      continue
    }
    const daysOver = (now.getTime() - s.currentPeriodEnd.getTime()) / 86_400_000
    if (daysOver > CHURN_DAYS) {
      await prisma.subscription.update({ where: { id: s.id }, data: { status: 'cancelled' } })
      await prisma.customerProfile.update({ where: { userId: s.userId }, data: { status: 'churned', mrr: 0 } }).catch(() => {})
      await prisma.invoice.update({ where: { id: open.id }, data: { status: 'void' } })
      out.churned += 1
    } else if (daysOver > GRACE_DAYS && s.status !== 'past_due') {
      await prisma.subscription.update({ where: { id: s.id }, data: { status: 'past_due' } })
      await prisma.notification.create({ data: { userId: s.userId, kind: 'system', title: 'Payment overdue — plan limits reduced', body: `Invoice ${open.number} is unpaid. API and organization limits fall back to trial until it is settled.`, href: '/billing' } }).catch(() => {})
      out.pastDue += 1
    }
  }
  return out
}

export const planCatalog = () => Object.entries(PLAN_LIMITS).map(([key, l]) => ({ key, ...l }))
void planLimits
