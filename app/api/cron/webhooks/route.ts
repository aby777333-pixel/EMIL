import { NextResponse } from 'next/server'
import { dispatchDue } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

// External-scheduler entry point for webhook retries (serverless has no
// background worker). Protect with CRON_SECRET: GET /api/cron/webhooks?token=…
// Deliveries also drain opportunistically on every emit and alert poll, so
// this is a safety net, not a requirement.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? req.headers.get('x-cron-token') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret || token !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await dispatchDue(50)
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() })
}
