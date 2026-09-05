import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public status JSON (no auth): system components, data-provider health and
// open incidents. Nothing customer-specific is exposed.
export async function GET() {
  try {
    const [health, providers, incidents] = await Promise.all([
      prisma.systemHealth.findMany({ orderBy: { component: 'asc' } }),
      prisma.dataProvider.findMany({ where: { enabled: true }, select: { key: true, name: true, category: true, status: true, lastCheckedAt: true, lastLatencyMs: true }, orderBy: { name: 'asc' } }),
      prisma.statusIncident.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ])
    const open = incidents.filter((i) => i.status !== 'resolved')
    const down = health.filter((h) => h.status === 'down').length
    const degraded = health.filter((h) => h.status === 'degraded').length + providers.filter((p) => p.status === 'error' || p.status === 'degraded').length
    const overall = open.some((i) => i.severity === 'major') || down > 0 ? 'major_outage' : degraded > 0 || open.length > 0 ? 'degraded' : 'operational'
    return NextResponse.json({
      overall, checkedAt: new Date().toISOString(),
      components: health.map((h) => ({ component: h.component, status: h.status, latencyMs: h.latencyMs, message: h.message, checkedAt: h.checkedAt })),
      providers,
      incidents: incidents.map((i) => ({ id: i.id, title: i.title, body: i.body, severity: i.severity, status: i.status, createdAt: i.createdAt, updatedAt: i.updatedAt, resolvedAt: i.resolvedAt })),
    }, { headers: { 'Cache-Control': 'public, max-age=30' } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ overall: 'unknown', error: 'Status unavailable' }, { status: 500 })
  }
}
