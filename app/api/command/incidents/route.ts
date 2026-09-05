import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { emitEvent } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

// Admin-managed status-page incidents.
async function admin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return requireAdmin((session.user as any).id)
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  const incidents = await prisma.statusIncident.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json({ incidents })
}

export async function POST(req: Request) {
  const a = await admin()
  if (!a) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const type = String(body?.type ?? '')
  try {
    if (type === 'create') {
      const title = String(body?.title ?? '').trim().slice(0, 140)
      if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
      const inc = await prisma.statusIncident.create({ data: { title, body: String(body?.body ?? '').slice(0, 2000) || null, severity: ['minor', 'major', 'maintenance'].includes(body?.severity) ? body.severity : 'minor', status: 'investigating' } })
      await emitEvent(null, 'health.changed', { kind: 'incident', id: inc.id, title: inc.title, severity: inc.severity, status: inc.status })
      return NextResponse.json({ ok: true, incident: inc })
    }
    if (type === 'update') {
      const status = ['investigating', 'identified', 'monitoring', 'resolved'].includes(body?.status) ? body.status : undefined
      const inc = await prisma.statusIncident.update({ where: { id: String(body?.id ?? '') }, data: { ...(status ? { status, resolvedAt: status === 'resolved' ? new Date() : null } : {}), ...(typeof body?.body === 'string' ? { body: body.body.slice(0, 2000) } : {}) } })
      await emitEvent(null, 'health.changed', { kind: 'incident', id: inc.id, title: inc.title, severity: inc.severity, status: inc.status })
      return NextResponse.json({ ok: true, incident: inc })
    }
    if (type === 'delete') {
      await prisma.statusIncident.delete({ where: { id: String(body?.id ?? '') } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
