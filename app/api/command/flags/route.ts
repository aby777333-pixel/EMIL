import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Command Center → Feature Flags (spec §77). Admin-only; every flip audited.

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await requireAdmin((session.user as any).id)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
    return NextResponse.json({ flags })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load feature flags' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const admin = await requireAdmin(userId)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const audit = (action: string, detail: string) =>
      prisma.auditLog.create({ data: { userId, actor: 'user', action, category: 'feature_flags', detail: `${detail} (by ${admin.email})`.slice(0, 1000) } })

    if (body?.type === 'toggle') {
      const flag = await prisma.featureFlag.findUnique({ where: { key: String(body?.key ?? '') } })
      if (!flag) return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
      const updated = await prisma.featureFlag.update({ where: { id: flag.id }, data: { enabled: !flag.enabled } })
      await audit('FEATURE FLAG TOGGLED', `${flag.key}: ${flag.enabled ? 'ON → OFF' : 'OFF → ON'}.`)
      return NextResponse.json({ ok: true, flag: updated })
    }

    if (body?.type === 'create') {
      const key = String(body?.key ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 60)
      const label = String(body?.label ?? '').trim().slice(0, 120)
      const description = body?.description ? String(body.description).slice(0, 500) : null
      if (!key || !label) return NextResponse.json({ error: 'Key and label are required.' }, { status: 400 })
      const existing = await prisma.featureFlag.findUnique({ where: { key } })
      if (existing) return NextResponse.json({ error: 'A flag with that key already exists.' }, { status: 409 })
      const flag = await prisma.featureFlag.create({ data: { key, label, description, enabled: false } })
      await audit('FEATURE FLAG CREATED', `${key} created (OFF by default).`)
      return NextResponse.json({ ok: true, flag })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Feature flag action failed' }, { status: 500 })
  }
}
