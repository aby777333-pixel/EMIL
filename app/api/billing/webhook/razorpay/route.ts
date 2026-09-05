import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { activateFromInvoice, verifyRazorpaySignature } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// Razorpay webhook: payment_link.paid → invoice paid → plan active.
// Configure in Razorpay Dashboard → Webhooks with RAZORPAY_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifyRazorpaySignature(raw, req.headers.get('x-razorpay-signature'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  const evt = (() => { try { return JSON.parse(raw) } catch { return null } })()
  if (!evt?.event) return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  const eventId = req.headers.get('x-razorpay-event-id') ?? `${evt.event}:${evt?.payload?.payment?.entity?.id ?? evt?.created_at ?? Date.now()}`
  try {
    await prisma.paymentEvent.create({ data: { gateway: 'razorpay', eventId, type: evt.event, payload: raw.slice(0, 20000) } })
  } catch {
    return NextResponse.json({ ok: true, duplicate: true })
  }
  if (evt.event === 'payment_link.paid' || evt.event === 'payment.captured') {
    const reference = evt?.payload?.payment_link?.entity?.reference_id ?? evt?.payload?.payment?.entity?.notes?.invoice
    const paymentId = evt?.payload?.payment?.entity?.id ?? 'razorpay'
    if (reference) {
      const inv = await prisma.invoice.findUnique({ where: { number: String(reference) } })
      if (inv) await activateFromInvoice(inv.id, String(paymentId), 'razorpay')
    }
  }
  return NextResponse.json({ ok: true })
}
