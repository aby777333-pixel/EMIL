import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateApiKey } from '@/lib/api-key'

export const dynamic = 'force-dynamic'

// Command Center CRM — customers, plans, notes, suspension, API keys.

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await requireAdmin((session.user as any).id)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const url = new URL(req.url)
    const detailId = url.searchParams.get('id')

    if (detailId) {
      const user = await prisma.user.findUnique({
        where: { id: detailId },
        select: {
          id: true, email: true, name: true, role: true, createdAt: true, selectedMarkets: true,
          profile: { include: { notes: { orderBy: { createdAt: 'desc' }, take: 30 } } },
          apiKeys: { orderBy: { createdAt: 'desc' } },
          brokerLinks: { orderBy: { updatedAt: 'desc' } },
        },
      })
      if (!user) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      const activity = await prisma.auditLog.findMany({ where: { userId: detailId }, orderBy: { createdAt: 'desc' }, take: 40 })
      const brokerLinks = user.brokerLinks.map((b) => ({
        id: b.id, providerKey: b.providerKey, status: b.status, lastCheckedAt: b.lastCheckedAt, lastError: b.lastError, updatedAt: b.updatedAt,
        hasApiKey: !!b.apiKey, hasApiSecret: !!b.apiSecret, hasAccessToken: !!b.accessToken,
      }))
      const apiKeys = user.apiKeys.map((k) => ({ id: k.id, label: k.label, prefix: k.prefix, status: k.status, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt }))
      return NextResponse.json({ customer: { ...user, brokerLinks, apiKeys }, activity })
    }

    const [users, plans] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, role: true, createdAt: true,
          profile: true,
          _count: { select: { apiKeys: true, brokerLinks: true } },
        },
      }),
      prisma.billingPlan.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])
    return NextResponse.json({ users, plans })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminId = (session.user as any).id as string
  const admin = await requireAdmin(adminId)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const audit = (action: string, detail: string, userId?: string) =>
      prisma.auditLog.create({ data: { userId: userId ?? adminId, actor: 'user', action, category: 'crm', detail: `${detail} (by ${admin.email})`.slice(0, 1500) } })

    const getProfile = async (userId: string) => {
      const existing = await prisma.customerProfile.findUnique({ where: { userId } })
      if (existing) return existing
      return prisma.customerProfile.create({ data: { userId } })
    }

    if (body?.type === 'update_profile') {
      const profile = await getProfile(body?.userId ?? '')
      const data: any = {}
      for (const f of ['company', 'phone', 'country', 'tags'] as const) {
        if (typeof body?.[f] === 'string') data[f] = body[f].slice(0, 300) || null
      }
      await prisma.customerProfile.update({ where: { id: profile.id }, data })
      await audit('CRM PROFILE UPDATED', `Profile fields updated for customer ${body.userId}`, body.userId)
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'set_status') {
      const status = ['lead', 'trial', 'active', 'suspended', 'churned'].includes(body?.value) ? body.value : null
      if (!status) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      const target = await prisma.user.findUnique({ where: { id: body?.userId ?? '' } })
      if (!target) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      if (target.role === 'admin' && (status === 'suspended' || status === 'churned')) {
        return NextResponse.json({ error: 'Admins cannot be suspended from the CRM — demote the role first.' }, { status: 409 })
      }
      const profile = await getProfile(target.id)
      const plans = await prisma.billingPlan.findMany()
      const price = plans.find((p) => p.key === profile.planKey)?.priceMonthly ?? 0
      await prisma.customerProfile.update({ where: { id: profile.id }, data: { status, mrr: status === 'active' ? price : 0 } })
      await audit(`CUSTOMER ${status.toUpperCase()}`, `${target.email} set to ${status}.${status === 'suspended' ? ' Sign-in and API access blocked.' : ''}`, target.id)
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'set_plan') {
      const plan = await prisma.billingPlan.findUnique({ where: { key: body?.value ?? '' } })
      if (!plan) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
      const profile = await getProfile(body?.userId ?? '')
      await prisma.customerProfile.update({
        where: { id: profile.id },
        data: { planKey: plan.key, mrr: profile.status === 'active' ? plan.priceMonthly : 0 },
      })
      await audit('CUSTOMER PLAN SET', `Customer ${body.userId} moved to plan "${plan.name}" ($${plan.priceMonthly}/mo).`, body.userId)
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'add_note') {
      const note = String(body?.note ?? '').trim().slice(0, 2000)
      if (!note) return NextResponse.json({ error: 'Note text required' }, { status: 400 })
      const profile = await getProfile(body?.userId ?? '')
      await prisma.crmNote.create({ data: { profileId: profile.id, authorEmail: admin.email, note } })
      await audit('CRM NOTE ADDED', `Note added for customer ${body.userId}: ${note.slice(0, 200)}`, body.userId)
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'set_role') {
      const target = await prisma.user.findUnique({ where: { id: body?.userId ?? '' } })
      if (!target) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      const role = body?.value === 'admin' ? 'admin' : 'trader'
      if (target.id === admin.id && role !== 'admin') {
        const otherAdmins = await prisma.user.count({ where: { role: 'admin', id: { not: admin.id } } })
        if (otherAdmins === 0) return NextResponse.json({ error: 'Cannot demote the last remaining admin.' }, { status: 409 })
      }
      await prisma.user.update({ where: { id: target.id }, data: { role } })
      await audit('USER ROLE SET', `${target.email} → ${role}.`, target.id)
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'issue_api_key') {
      const target = await prisma.user.findUnique({ where: { id: body?.userId ?? '' } })
      if (!target) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      const label = String(body?.label ?? '').trim().slice(0, 100) || 'Default key'
      const { key, prefix, hash } = generateApiKey()
      await prisma.apiKey.create({ data: { userId: target.id, label, prefix, keyHash: hash } })
      await audit('API KEY ISSUED', `API key "${label}" (${prefix}…) issued for ${target.email}. Key shown once, only its hash is stored.`, target.id)
      // The plaintext key is returned exactly once and never persisted.
      return NextResponse.json({ ok: true, apiKey: key, prefix })
    }

    if (body?.type === 'rotate_api_key') {
      // Rotation = issue a replacement under the same label, then revoke the old
      // key in the same transaction. The new plaintext is returned exactly once.
      const keyRow = await prisma.apiKey.findUnique({ where: { id: body?.keyId ?? '' }, include: { user: { select: { email: true } } } })
      if (!keyRow) return NextResponse.json({ error: 'Key not found' }, { status: 404 })
      if (keyRow.status !== 'active') return NextResponse.json({ error: 'Only active keys can be rotated' }, { status: 409 })
      const { key, prefix, hash } = generateApiKey()
      await prisma.$transaction([
        prisma.apiKey.create({ data: { userId: keyRow.userId, label: keyRow.label, prefix, keyHash: hash } }),
        prisma.apiKey.update({ where: { id: keyRow.id }, data: { status: 'revoked', revokedAt: new Date() } }),
      ])
      await audit('API KEY ROTATED', `API key "${keyRow.label}" rotated for ${keyRow.user.email}: ${keyRow.prefix}… revoked, ${prefix}… issued. New key shown once.`, keyRow.userId)
      return NextResponse.json({ ok: true, apiKey: key, prefix, email: keyRow.user.email, label: keyRow.label })
    }

    if (body?.type === 'revoke_api_key') {
      const keyRow = await prisma.apiKey.findUnique({ where: { id: body?.keyId ?? '' }, include: { user: { select: { email: true } } } })
      if (!keyRow) return NextResponse.json({ error: 'Key not found' }, { status: 404 })
      await prisma.apiKey.update({ where: { id: keyRow.id }, data: { status: 'revoked', revokedAt: new Date() } })
      await audit('API KEY REVOKED', `API key "${keyRow.label}" (${keyRow.prefix}…) revoked for ${keyRow.user.email}.`, keyRow.userId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'CRM action failed' }, { status: 500 })
  }
}
