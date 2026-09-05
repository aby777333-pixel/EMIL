import { NextResponse } from 'next/server'
import { runBillingCycle } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// Daily billing cycle for an external scheduler: GET /api/cron/billing?token=CRON_SECRET
// Renews subscriptions whose period ended (invoice + payment link), marks
// past-due after 7 days, churns after 30, ends trials. Idempotent.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? req.headers.get('x-cron-token') ?? ''
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const r = await runBillingCycle()
  return NextResponse.json({ ok: true, ...r, at: new Date().toISOString() })
}
