import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { activateFromInvoice, verifyStripeSignature } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// Stripe webhook: checkout.session.completed (paid) → invoice paid → plan active.
// Configure the endpoint in Stripe with STRIPE_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifyStripeSignature(raw, req.headers.get('stripe-signature'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  const evt = (() => { try { return JSON.parse(raw) } catch { return null } })()
  if (!evt?.id || !evt?.type) return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  try {
    await prisma.paymentEvent.create({ data: { gateway: 'stripe', eventId: evt.id, type: evt.type, payload: raw.slice(0, 20000) } })
  } catch {
    return NextResponse.json({ ok: true, duplicate: true })
  }
  if (evt.type === 'checkout.session.completed' || evt.type === 'checkout.session.async_payment_succeeded') {
    const s = evt.data?.object ?? {}
    if (s.payment_status === 'paid' || evt.type === 'checkout.session.async_payment_succeeded') {
      const reference = s.client_reference_id ?? s.metadata?.invoice
      if (reference) {
        const inv = await prisma.invoice.findUnique({ where: { number: String(reference) } })
        if (inv) await activateFromInvoice(inv.id, String(s.payment_intent ?? s.id), 'stripe')
      }
    }
  }
  return NextResponse.json({ ok: true })
}
