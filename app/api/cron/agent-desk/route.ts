import { NextResponse } from 'next/server'
import { runDueWatches } from '@/lib/agent-desk'

export const dynamic = 'force-dynamic'

// External-scheduler entry point for Agent Paper Desk watches (autopilot).
// Protect with CRON_SECRET: GET /api/cron/agent-desk?token=…  Every gate
// (paper venue, flags, ARMED + semi-autonomous/autonomous mode, guardian,
// router guards) is re-evaluated inside; this only supplies the tick.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? req.headers.get('x-cron-token') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret || token !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await runDueWatches(3)
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() })
}
