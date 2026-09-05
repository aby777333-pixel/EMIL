import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  ORG_KINDS, ORG_ROLES, acceptInvite, appendRecord, canApprove, canManage, canRecommend, canTrade, hashInvite, membershipsOf, newInviteToken, newPortalToken,
  notifyApprovers, orderGuard, parseJson, requireMember, sendInviteEmail, slugify, trackRecord, verifyArchive, type OrgBranding, type OrgRole, type OrgSettings,
} from '@/lib/org'
import { emitEvent } from '@/lib/webhooks'
import { deliverNotification } from '@/lib/notify'
import { planLimits } from '@/lib/entitlements'
import { requireAdmin } from '@/lib/auth'
import { isPaperVenue, placeGuarded } from '@/lib/execution/router'

export const dynamic = 'force-dynamic'

// Organization backend (session): memberships, roles, invites, settings,
// clients, recommendations workflow, compliance archive, restricted list,
// position limits, maker-checker approvals, signal channels.

const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })
const RECO_STATUSES = ['draft', 'sent', 'approved', 'declined', 'executed', 'expired']

async function me() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const userId = (session.user as any).id as string
  const email = (session.user.email ?? '').toLowerCase()
  const [admin, profile] = await Promise.all([requireAdmin(userId), prisma.customerProfile.findUnique({ where: { userId } })])
  return { userId, email, isAdmin: !!admin, planKey: profile?.planKey ?? 'trial', limits: planLimits(profile?.planKey, !!admin) }
}

export async function GET(req: Request) {
  const u = await me()
  if (!u) return bad('Unauthorized', 401)
  try {
    const url = new URL(req.url)
    const orgId = url.searchParams.get('org')
    const memberships = await membershipsOf(u.userId, u.email)
    const invites = await prisma.orgMember.findMany({ where: { email: u.email, status: 'invited' }, include: { org: { select: { id: true, name: true, kind: true } } } })
    const publicChannels = await prisma.signalChannel.findMany({ where: { visibility: 'public' }, include: { org: { select: { name: true } }, posts: { select: { status: true, outcomePct: true } }, subscribers: { where: { userId: u.userId } } }, take: 50 })
    const base = { roles: ORG_ROLES, kinds: ORG_KINDS, account: { email: u.email, plan: u.planKey, organizationsAllowed: u.limits.organizations, memberLimit: u.limits.members },
      memberships: memberships.map((m) => ({ id: m.id, orgId: m.orgId, role: m.role, desk: m.desk, org: { id: m.org.id, name: m.org.name, slug: m.org.slug, kind: m.org.kind } })),
      invites: invites.map((i) => ({ id: i.id, org: i.org, role: i.role, invitedBy: i.invitedBy })),
      discover: publicChannels.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, org: c.org.name, subscribed: c.subscribers.length > 0, track: trackRecord(c.posts) })),
    }
    if (!orgId) return NextResponse.json(base)

    const m = await requireMember(u.userId, u.email, orgId)
    if (!m) return bad('Not a member of that organization', 403)
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: { orderBy: { createdAt: 'asc' } }, clients: { orderBy: { createdAt: 'desc' } },
        recommendations: { orderBy: { createdAt: 'desc' }, take: 200, include: { client: { select: { name: true } } } },
        restricted: { orderBy: { symbol: 'asc' } }, limits: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' }, take: 100 },
        channels: { include: { posts: { orderBy: { postedAt: 'desc' }, take: 50 }, subscribers: true } },
        records: { orderBy: { seq: 'desc' }, take: 60 },
      },
    })
    if (!org) return bad('Organization not found', 404)
    const archive = await verifyArchive(orgId)
    return NextResponse.json({
      ...base,
      me: { role: m.role, desk: m.desk, canManage: canManage(m.role), canApprove: canApprove(m.role), canRecommend: canRecommend(m.role), canTrade: canTrade(m.role) },
      org: {
        id: org.id, name: org.name, slug: org.slug, kind: org.kind, ownerId: org.ownerId, ssoDomain: org.ssoDomain,
        settings: parseJson<OrgSettings>(org.settings, {}), branding: parseJson<OrgBranding>(org.branding, {}),
        members: org.members.map((x) => ({ id: x.id, email: x.email, role: x.role, status: x.status, desk: x.desk, joinedAt: x.joinedAt, invitedBy: x.invitedBy })),
        clients: org.clients.map((c) => ({ id: c.id, name: c.name, email: c.email, externalRef: c.externalRef, riskProfile: parseJson(c.riskProfile, {}), notes: c.notes, status: c.status, hasPortal: !!c.portalHash, createdAt: c.createdAt })),
        recommendations: org.recommendations.map((r) => ({ ...r, clientName: r.client?.name ?? null, client: undefined })),
        restricted: org.restricted, limits: org.limits, approvals: org.approvals.map((a) => ({ ...a, payload: parseJson(a.payload, {}) })),
        channels: org.channels.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, visibility: c.visibility, subscribers: c.subscribers.length, subscribed: c.subscribers.some((s) => s.userId === u.userId), track: trackRecord(c.posts), posts: c.posts })),
        archive: { ...archive, recent: org.records.map((r) => ({ seq: r.seq, kind: r.kind, actor: r.actor, refId: r.refId, payload: parseJson(r.payload, {}), hash: r.hash.slice(0, 16), createdAt: r.createdAt })) },
      },
    })
  } catch (e) {
    console.error(e)
    return bad('Failed to load organization', 500)
  }
}

export async function POST(req: Request) {
  const u = await me()
  if (!u) return bad('Unauthorized', 401)
  try {
    const body = await req.json().catch(() => ({}))
    const type = String(body?.type ?? '')

    if (type === 'accept_invite') {
      const r = await acceptInvite(u.userId, u.email, String(body?.token ?? ''))
      return r.ok ? NextResponse.json({ ok: true, org: { id: r.org!.id, name: r.org!.name } }) : bad(r.error!, 400)
    }
    if (type === 'accept_invite_id') {
      const inv = await prisma.orgMember.findFirst({ where: { id: String(body?.id ?? ''), email: u.email, status: 'invited' }, include: { org: true } })
      if (!inv) return bad('Invitation not found', 404)
      await prisma.orgMember.update({ where: { id: inv.id }, data: { userId: u.userId, status: 'active', joinedAt: new Date(), inviteHash: null } })
      await appendRecord(inv.orgId, 'member.joined', u.email, { role: inv.role }, inv.id)
      return NextResponse.json({ ok: true, org: { id: inv.org.id, name: inv.org.name } })
    }
    if (type === 'subscribe' || type === 'unsubscribe') {
      const ch = await prisma.signalChannel.findUnique({ where: { id: String(body?.channelId ?? '') } })
      if (!ch) return bad('Channel not found', 404)
      if (ch.visibility !== 'public') { const mm = await requireMember(u.userId, u.email, ch.orgId); if (!mm) return bad('This channel is private to its organization', 403) }
      if (type === 'subscribe') await prisma.channelSubscription.upsert({ where: { channelId_userId: { channelId: ch.id, userId: u.userId } }, update: {}, create: { channelId: ch.id, userId: u.userId } })
      else await prisma.channelSubscription.deleteMany({ where: { channelId: ch.id, userId: u.userId } })
      return NextResponse.json({ ok: true })
    }

    if (type === 'create_org') {
      if (!u.limits.organizations) return bad(`Organizations are available on Pro and Institutional plans (current: ${u.limits.label}).`, 403)
      const owned = await prisma.organization.count({ where: { ownerId: u.userId } })
      if (owned >= 5) return bad('You already own 5 organizations.', 403)
      const name = String(body?.name ?? '').trim().slice(0, 80)
      if (!name) return bad('Name required')
      const kind = String(body?.kind ?? 'trading_firm') in ORG_KINDS ? String(body.kind) : 'trading_firm'
      const org = await prisma.organization.create({ data: { name, slug: slugify(name), kind, ownerId: u.userId, settings: JSON.stringify({ killSwitch: false, requireApprovals: kind === 'institution' || kind === 'trading_firm' }) } })
      await prisma.orgMember.create({ data: { orgId: org.id, userId: u.userId, email: u.email, role: 'owner', status: 'active', joinedAt: new Date() } })
      await appendRecord(org.id, 'org.created', u.email, { name, kind })
      await prisma.auditLog.create({ data: { userId: u.userId, actor: 'user', action: 'ORGANIZATION CREATED', category: 'org', detail: `${u.email} created ${ORG_KINDS[kind as keyof typeof ORG_KINDS]} "${name}"` } }).catch(() => {})
      return NextResponse.json({ ok: true, orgId: org.id })
    }

    // Everything below needs an org + membership.
    const orgId = String(body?.orgId ?? '')
    const m = orgId ? await requireMember(u.userId, u.email, orgId) : null
    if (!m) return bad('Not a member of that organization', 403)
    const role = m.role as OrgRole
    const org = m.org
    const settings = parseJson<OrgSettings>(org.settings, {})

    if (type === 'update_org') {
      if (!canManage(role)) return bad('Admin role required', 403)
      const data: any = {}
      if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 80)
      if (typeof body?.kind === 'string' && body.kind in ORG_KINDS) data.kind = body.kind
      if (body?.ssoDomain !== undefined) data.ssoDomain = String(body.ssoDomain ?? '').trim().toLowerCase().replace(/^@/, '').slice(0, 80) || null
      if (body?.settings && typeof body.settings === 'object') data.settings = JSON.stringify({ ...settings, ...body.settings, killSwitch: settings.killSwitch })
      if (body?.branding && typeof body.branding === 'object') data.branding = JSON.stringify({ ...parseJson<OrgBranding>(org.branding, {}), ...body.branding })
      await prisma.organization.update({ where: { id: orgId }, data })
      await appendRecord(orgId, 'org.updated', u.email, { fields: Object.keys(data), settings: data.settings ? parseJson(data.settings, {}) : undefined })
      return NextResponse.json({ ok: true })
    }
    if (type === 'kill_switch') {
      if (!canApprove(role)) return bad('Admin or compliance role required', 403)
      const on = !!body?.on
      await prisma.organization.update({ where: { id: orgId }, data: { settings: JSON.stringify({ ...settings, killSwitch: on }) } })
      await appendRecord(orgId, on ? 'kill_switch.on' : 'kill_switch.off', u.email, { on })
      const members = await prisma.orgMember.findMany({ where: { orgId, status: 'active', userId: { not: null } } })
      for (const x of members) {
        const n = { title: `${org.name}: kill switch ${on ? 'ON — all orders blocked' : 'OFF — orders allowed again'}`, body: `Flipped by ${u.email}.`, href: '/org' }
        await prisma.notification.create({ data: { userId: x.userId as string, kind: 'risk', ...n } }).catch(() => {})
        deliverNotification(x.userId as string, n).catch(() => {})
      }
      return NextResponse.json({ ok: true })
    }
    if (type === 'invite') {
      if (!canManage(role)) return bad('Admin role required', 403)
      const email = String(body?.email ?? '').trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('Valid e-mail required')
      const invRole = String(body?.role ?? 'viewer') in ORG_ROLES && body.role !== 'owner' ? String(body.role) : 'viewer'
      const count = await prisma.orgMember.count({ where: { orgId } })
      if (count >= u.limits.members && !u.isAdmin) return bad(`Your plan allows ${u.limits.members} members per organization.`, 403)
      const tok = newInviteToken()
      const existingUser = await prisma.user.findUnique({ where: { email } })
      await prisma.orgMember.upsert({
        where: { orgId_email: { orgId, email } },
        update: { role: invRole, desk: String(body?.desk ?? '').slice(0, 40) || null, status: 'invited', inviteHash: tok.hash, invitedBy: u.email, userId: existingUser?.id ?? null },
        create: { orgId, email, role: invRole, desk: String(body?.desk ?? '').slice(0, 40) || null, status: 'invited', inviteHash: tok.hash, invitedBy: u.email, userId: existingUser?.id ?? null },
      })
      await appendRecord(orgId, 'member.invited', u.email, { email, role: invRole })
      const mail = await sendInviteEmail(email, org.name, tok.token)
      if (existingUser) await prisma.notification.create({ data: { userId: existingUser.id, kind: 'admin', title: `Invitation: join ${org.name}`, body: `${u.email} invited you as ${invRole}. Accept from Organization.`, href: '/org' } }).catch(() => {})
      const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
      return NextResponse.json({ ok: true, joinLink: `${base}/org/join/${tok.token}`, emailSent: mail.sent, emailNote: mail.reason ?? null })
    }
    if (type === 'set_member' || type === 'remove_member') {
      if (!canManage(role)) return bad('Admin role required', 403)
      const target = await prisma.orgMember.findFirst({ where: { id: String(body?.memberId ?? ''), orgId } })
      if (!target) return bad('Member not found', 404)
      if (target.role === 'owner') return bad('The owner cannot be changed or removed.')
      if (type === 'remove_member') {
        await prisma.orgMember.delete({ where: { id: target.id } })
        await appendRecord(orgId, 'member.removed', u.email, { email: target.email })
        emitEvent(org.ownerId, 'org.member.changed', { orgId, email: target.email, change: 'removed' }).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      const data: any = {}
      if (typeof body?.role === 'string' && body.role in ORG_ROLES && body.role !== 'owner') data.role = body.role
      if (body?.desk !== undefined) data.desk = String(body.desk ?? '').slice(0, 40) || null
      if (body?.status === 'suspended' || body?.status === 'active') data.status = body.status
      await prisma.orgMember.update({ where: { id: target.id }, data })
      await appendRecord(orgId, 'member.updated', u.email, { email: target.email, ...data })
      emitEvent(org.ownerId, 'org.member.changed', { orgId, email: target.email, change: 'updated', ...data }).catch(() => {})
      return NextResponse.json({ ok: true })
    }
    if (type === 'leave_org') {
      if (role === 'owner') return bad('Owners cannot leave — transfer ownership is not available yet; delete the organization instead.')
      await prisma.orgMember.deleteMany({ where: { id: m.id } })
      return NextResponse.json({ ok: true })
    }
    if (type === 'delete_org') {
      if (role !== 'owner') return bad('Owner only', 403)
      await prisma.organization.delete({ where: { id: orgId } })
      await prisma.auditLog.create({ data: { userId: u.userId, actor: 'user', action: 'ORGANIZATION DELETED', category: 'org', detail: `${u.email} deleted "${org.name}"` } }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    // ---- Clients ----
    if (type === 'add_client' || type === 'update_client') {
      if (!canRecommend(role)) return bad('Analyst role or higher required', 403)
      const data: any = {}
      if (typeof body?.name === 'string') data.name = body.name.trim().slice(0, 80)
      if (body?.email !== undefined) data.email = String(body.email ?? '').trim().toLowerCase().slice(0, 120) || null
      if (body?.externalRef !== undefined) data.externalRef = String(body.externalRef ?? '').slice(0, 60) || null
      if (body?.notes !== undefined) data.notes = String(body.notes ?? '').slice(0, 2000) || null
      if (body?.riskProfile && typeof body.riskProfile === 'object') data.riskProfile = JSON.stringify(body.riskProfile)
      if (body?.status === 'active' || body?.status === 'archived') data.status = body.status
      if (type === 'add_client') {
        if (!data.name) return bad('Client name required')
        const c = await prisma.clientAccount.create({ data: { orgId, ...data } })
        await appendRecord(orgId, 'client.created', u.email, { name: c.name }, c.id)
        return NextResponse.json({ ok: true, clientId: c.id })
      }
      const c = await prisma.clientAccount.findFirst({ where: { id: String(body?.clientId ?? ''), orgId } })
      if (!c) return bad('Client not found', 404)
      await prisma.clientAccount.update({ where: { id: c.id }, data })
      await appendRecord(orgId, 'client.updated', u.email, { fields: Object.keys(data) }, c.id)
      return NextResponse.json({ ok: true })
    }
    if (type === 'client_portal_link') {
      if (!canRecommend(role)) return bad('Analyst role or higher required', 403)
      const c = await prisma.clientAccount.findFirst({ where: { id: String(body?.clientId ?? ''), orgId } })
      if (!c) return bad('Client not found', 404)
      const tok = newPortalToken()
      await prisma.clientAccount.update({ where: { id: c.id }, data: { portalHash: tok.hash } })
      await appendRecord(orgId, 'client.portal_link_issued', u.email, { client: c.name }, c.id)
      const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
      return NextResponse.json({ ok: true, link: `${base}/c/${tok.token}` })
    }

    // ---- Recommendations ----
    if (type === 'create_reco') {
      if (!canRecommend(role)) return bad('Analyst role or higher required', 403)
      const symbol = String(body?.symbol ?? '').trim().toUpperCase().slice(0, 24)
      const thesis = String(body?.thesis ?? '').trim().slice(0, 4000)
      const direction = ['buy', 'sell', 'hold', 'reduce'].includes(body?.direction) ? body.direction : 'buy'
      if (!symbol || !thesis) return bad('Symbol and thesis are required')
      const clientId = body?.clientId ? String(body.clientId) : null
      if (clientId) { const c = await prisma.clientAccount.findFirst({ where: { id: clientId, orgId } }); if (!c) return bad('Client not found', 404) }
      const num = (v: any) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v))
      const r = await prisma.recommendation.create({ data: { orgId, clientId, authorId: u.userId, authorEmail: u.email, symbol, direction, thesis, entry: num(body?.entry), stop: num(body?.stop), target: num(body?.target), horizon: String(body?.horizon ?? '').slice(0, 40) || null, riskNote: String(body?.riskNote ?? '').slice(0, 1000) || null, suitability: String(body?.suitability ?? '').slice(0, 1000) || null } })
      await appendRecord(orgId, 'recommendation.created', u.email, { symbol, direction, clientId, entry: r.entry, stop: r.stop, target: r.target }, r.id)
      return NextResponse.json({ ok: true, recoId: r.id })
    }
    if (type === 'reco_status') {
      const r = await prisma.recommendation.findFirst({ where: { id: String(body?.recoId ?? ''), orgId } })
      if (!r) return bad('Recommendation not found', 404)
      const status = String(body?.status ?? '')
      if (!RECO_STATUSES.includes(status)) return bad('Unknown status')
      const isAuthor = r.authorId === u.userId
      if (status === 'sent' && !(isAuthor || canManage(role))) return bad('Only the author or an admin can send', 403)
      if ((status === 'approved' || status === 'declined') && !canApprove(role)) return bad('Compliance or admin role required to record a decision', 403)
      if (status === 'executed' && !canTrade(role)) return bad('Trader role or higher required to mark executed', 403)
      if (r.symbol && (status === 'sent' || status === 'approved')) {
        const restricted = await prisma.restrictedInstrument.findFirst({ where: { orgId, symbol: r.symbol } })
        if (restricted) return bad(`${r.symbol} is on the restricted list${restricted.reason ? ` (${restricted.reason})` : ''}.`, 403)
      }
      const note = String(body?.note ?? '').slice(0, 1000) || null
      await prisma.recommendation.update({ where: { id: r.id }, data: { status, ...(status === 'sent' ? { sentAt: new Date() } : {}), ...(status === 'approved' || status === 'declined' ? { decidedAt: new Date(), decidedBy: `${u.email} (${role})${note ? ` — ${note}` : ''}` } : {}), ...(status === 'executed' ? { executionNote: note } : {}) } })
      await appendRecord(orgId, `recommendation.${status}`, u.email, { symbol: r.symbol, direction: r.direction, note }, r.id)
      return NextResponse.json({ ok: true })
    }

    // ---- Desk controls ----
    if (type === 'add_restricted' || type === 'remove_restricted') {
      if (!canApprove(role)) return bad('Compliance or admin role required', 403)
      if (type === 'remove_restricted') {
        const row = await prisma.restrictedInstrument.findFirst({ where: { id: String(body?.id ?? ''), orgId } })
        if (!row) return bad('Not found', 404)
        await prisma.restrictedInstrument.delete({ where: { id: row.id } })
        await appendRecord(orgId, 'restricted.removed', u.email, { symbol: row.symbol })
        return NextResponse.json({ ok: true })
      }
      const symbol = String(body?.symbol ?? '').trim().toUpperCase().slice(0, 24)
      if (!symbol) return bad('Symbol required')
      await prisma.restrictedInstrument.upsert({ where: { orgId_symbol: { orgId, symbol } }, update: { reason: String(body?.reason ?? '').slice(0, 200) || null }, create: { orgId, symbol, reason: String(body?.reason ?? '').slice(0, 200) || null, createdBy: u.email } })
      await appendRecord(orgId, 'restricted.added', u.email, { symbol, reason: body?.reason ?? null })
      return NextResponse.json({ ok: true })
    }
    if (type === 'add_limit' || type === 'remove_limit') {
      if (!canApprove(role)) return bad('Compliance or admin role required', 403)
      if (type === 'remove_limit') {
        const row = await prisma.positionLimit.findFirst({ where: { id: String(body?.id ?? ''), orgId } })
        if (!row) return bad('Not found', 404)
        await prisma.positionLimit.delete({ where: { id: row.id } })
        await appendRecord(orgId, 'limit.removed', u.email, { scope: row.scope, scopeRef: row.scopeRef, symbol: row.symbol })
        return NextResponse.json({ ok: true })
      }
      const scope = ['org', 'desk', 'member'].includes(body?.scope) ? body.scope : 'org'
      const maxNotionalUsd = Number(body?.maxNotionalUsd) > 0 ? Number(body.maxNotionalUsd) : null
      const maxQty = Number(body?.maxQty) > 0 ? Number(body.maxQty) : null
      if (!maxNotionalUsd && !maxQty) return bad('Set a max notional (USD) or a max quantity')
      const l = await prisma.positionLimit.create({ data: { orgId, scope, scopeRef: String(body?.scopeRef ?? '').slice(0, 80) || null, symbol: String(body?.symbol ?? '').trim().toUpperCase().slice(0, 24) || null, maxNotionalUsd, maxQty, createdBy: u.email } })
      await appendRecord(orgId, 'limit.added', u.email, { scope, scopeRef: l.scopeRef, symbol: l.symbol, maxNotionalUsd, maxQty }, l.id)
      return NextResponse.json({ ok: true })
    }

    // ---- Maker-checker approvals ----
    if (type === 'decide_approval') {
      if (!canApprove(role)) return bad('Compliance or admin role required', 403)
      const a = await prisma.approvalRequest.findFirst({ where: { id: String(body?.requestId ?? ''), orgId, status: 'pending' } })
      if (!a) return bad('Request not found or already decided', 404)
      if (a.requesterId === u.userId && !u.isAdmin) return bad('Maker-checker: you cannot approve your own request', 403)
      const approve = !!body?.approve
      const note = String(body?.note ?? '').slice(0, 500) || null
      if (!approve) {
        await prisma.approvalRequest.update({ where: { id: a.id }, data: { status: 'rejected', approverEmail: u.email, note, decidedAt: new Date() } })
        await appendRecord(orgId, 'approval.rejected', u.email, { kind: a.kind, note }, a.id)
        await prisma.notification.create({ data: { userId: a.requesterId, kind: 'admin', title: `${org.name}: request rejected`, body: note ?? 'Rejected by compliance.', href: '/org?tab=approvals' } }).catch(() => {})
        return NextResponse.json({ ok: true })
      }
      let result = 'approved'
      let status = 'approved'
      if (a.kind === 'paper_order') {
        const order = parseJson<any>(a.payload, {})
        try {
          if (!isPaperVenue(String(order.venue))) throw new Error('Only paper venues can be executed through approvals.')
          await orderGuard(a.requesterId, a.requesterEmail, order, { skipApproval: true })
          const r = await placeGuarded({ userId: a.requesterId, isAdmin: false, venueKey: order.venue, req: { symbol: order.symbol, side: order.side, type: order.type, qty: Number(order.qty), price: order.price ?? undefined } })
          result = `executed as paper order ${r.record?.id ?? ''} (${r.order?.status ?? 'submitted'})`
          status = 'executed'
        } catch (e: any) {
          result = `approved but execution failed: ${String(e?.message ?? e).slice(0, 300)}`
          status = 'failed'
        }
      }
      await prisma.approvalRequest.update({ where: { id: a.id }, data: { status, approverEmail: u.email, note, result, decidedAt: new Date() } })
      await appendRecord(orgId, `approval.${status}`, u.email, { kind: a.kind, note, result }, a.id)
      await prisma.notification.create({ data: { userId: a.requesterId, kind: 'admin', title: `${org.name}: request ${status}`, body: result, href: '/org?tab=approvals' } }).catch(() => {})
      return NextResponse.json({ ok: true, status, result })
    }

    // ---- Signal channels ----
    if (type === 'create_channel') {
      if (!canRecommend(role)) return bad('Analyst role or higher required', 403)
      const name = String(body?.name ?? '').trim().slice(0, 60)
      if (!name) return bad('Name required')
      const visibility = ['org', 'subscribers', 'public'].includes(body?.visibility) ? body.visibility : 'org'
      const ch = await prisma.signalChannel.create({ data: { orgId, name, slug: slugify(name), description: String(body?.description ?? '').slice(0, 400) || null, visibility, createdBy: u.email } })
      await appendRecord(orgId, 'channel.created', u.email, { name, visibility }, ch.id)
      return NextResponse.json({ ok: true, channelId: ch.id })
    }
    if (type === 'post_signal') {
      if (!canRecommend(role)) return bad('Analyst role or higher required', 403)
      const ch = await prisma.signalChannel.findFirst({ where: { id: String(body?.channelId ?? ''), orgId }, include: { subscribers: true } })
      if (!ch) return bad('Channel not found', 404)
      const symbol = String(body?.symbol ?? '').trim().toUpperCase().slice(0, 24)
      if (!symbol) return bad('Symbol required')
      const restricted = await prisma.restrictedInstrument.findFirst({ where: { orgId, symbol } })
      if (restricted) return bad(`${symbol} is on the restricted list.`, 403)
      const num = (v: any) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v))
      const p = await prisma.signalPost.create({ data: { channelId: ch.id, authorEmail: u.email, symbol, direction: body?.direction === 'short' ? 'short' : 'long', entry: num(body?.entry), stop: num(body?.stop), target: num(body?.target), timeframe: String(body?.timeframe ?? '').slice(0, 20) || null, rationale: String(body?.rationale ?? '').slice(0, 2000) || null } })
      await appendRecord(orgId, 'signal.published', u.email, { channel: ch.name, symbol, direction: p.direction, entry: p.entry, stop: p.stop, target: p.target }, p.id)
      const n = { title: `${ch.name}: ${p.direction.toUpperCase()} ${symbol}${p.entry ? ` @ ${p.entry}` : ''}`, body: `${p.rationale ?? ''} Research signal from ${org.name} — not advice, not an execution trigger.`.trim(), href: '/org?tab=channels' }
      for (const s of ch.subscribers) {
        await prisma.notification.create({ data: { userId: s.userId, kind: 'system', ...n } }).catch(() => {})
        deliverNotification(s.userId, n).catch(() => {})
        emitEvent(s.userId, 'signal.published', { channel: ch.name, org: org.name, symbol, direction: p.direction, entry: p.entry, stop: p.stop, target: p.target, timeframe: p.timeframe, rationale: p.rationale }).catch(() => {})
      }
      return NextResponse.json({ ok: true, postId: p.id, notified: ch.subscribers.length })
    }
    if (type === 'close_signal') {
      if (!canRecommend(role)) return bad('Analyst role or higher required', 403)
      const p = await prisma.signalPost.findFirst({ where: { id: String(body?.postId ?? ''), channel: { orgId } } })
      if (!p) return bad('Post not found', 404)
      const outcomePct = isFinite(Number(body?.outcomePct)) ? Number(body.outcomePct) : null
      await prisma.signalPost.update({ where: { id: p.id }, data: { status: body?.cancel ? 'cancelled' : 'closed', outcomePct, closedAt: new Date() } })
      await appendRecord(orgId, body?.cancel ? 'signal.cancelled' : 'signal.closed', u.email, { symbol: p.symbol, outcomePct }, p.id)
      return NextResponse.json({ ok: true })
    }

    if (type === 'verify_archive') return NextResponse.json(await verifyArchive(orgId))

    if (type === 'request_enterprise') {
      if (!canManage(role)) return bad('Admin role required', 403)
      const reqd = { residency: String(body?.residency ?? '').slice(0, 60), sla: String(body?.sla ?? '').slice(0, 40), privateDeploy: !!body?.privateDeploy, notes: String(body?.notes ?? '').slice(0, 1000) }
      await prisma.organization.update({ where: { id: orgId }, data: { settings: JSON.stringify({ ...settings, enterpriseRequest: { ...reqd, requestedBy: u.email, at: new Date().toISOString() } }) } })
      await appendRecord(orgId, 'enterprise.requested', u.email, reqd)
      await prisma.auditLog.create({ data: { userId: u.userId, actor: 'user', action: 'ENTERPRISE OPTIONS REQUESTED', category: 'org', detail: `${org.name} (${u.email}): residency ${reqd.residency || '—'}, SLA ${reqd.sla || '—'}, private deploy ${reqd.privateDeploy ? 'yes' : 'no'}. ${reqd.notes}` } }).catch(() => {})
      const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
      for (const a of admins) await prisma.notification.create({ data: { userId: a.id, kind: 'admin', title: `Enterprise request from ${org.name}`, body: `${u.email}: residency ${reqd.residency || '—'}, SLA ${reqd.sla || '—'}, private deployment ${reqd.privateDeploy ? 'requested' : 'no'}.`, href: '/command/customers' } }).catch(() => {})
      await notifyApprovers(orgId, { title: 'Enterprise options requested', body: 'EMIL will follow up with the organization owner.', href: '/org?tab=settings' })
      return NextResponse.json({ ok: true, note: 'Request recorded. Data residency, private deployment and SLA tiers are commercial arrangements — EMIL follows up with the owner; nothing changes automatically.' })
    }

    return bad('Unknown request')
  } catch (e: any) {
    console.error(e)
    return bad(e?.message ?? 'Request failed', 500)
  }
}

void hashInvite
