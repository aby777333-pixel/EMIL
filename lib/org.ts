// Organizations (round C): institutions, advisories and trading firms.
// Membership + roles, hash-chained compliance archive, and the server-side
// desk guards (kill switch, restricted list, position limits, maker-checker
// approvals) that every paper order and recommendation passes through.

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { emitEvent } from '@/lib/webhooks'
import { emailSend, emailConfigured } from '@/lib/notify'

export const ORG_ROLES = {
  owner: 'Owner — everything, including billing and deletion',
  admin: 'Admin — members, settings, limits, approvals',
  compliance: 'Compliance — approvals, restricted list, archive; no trading',
  analyst: 'Analyst — research, recommendations, signal posts',
  trader: 'Trader — paper orders within limits; needs approval when enabled',
  viewer: 'Viewer — read-only',
} as const
export type OrgRole = keyof typeof ORG_ROLES
export const ORG_KINDS = { advisory: 'Advisory', trading_firm: 'Trading firm', institution: 'Institution', business: 'Business / platform', personal: 'Personal workspace' } as const

const RANK: Record<OrgRole, number> = { viewer: 0, trader: 1, analyst: 1, compliance: 2, admin: 3, owner: 4 }
export const canManage = (r: OrgRole) => RANK[r] >= RANK.admin
export const canApprove = (r: OrgRole) => r === 'compliance' || RANK[r] >= RANK.admin
export const canRecommend = (r: OrgRole) => r === 'analyst' || RANK[r] >= RANK.admin
export const canTrade = (r: OrgRole) => r === 'trader' || RANK[r] >= RANK.admin

export type OrgSettings = { killSwitch?: boolean; requireApprovals?: boolean; disclaimer?: string; residency?: string; sla?: string; privateDeploy?: boolean }
export type OrgBranding = { logoUrl?: string; primary?: string; accent?: string; footer?: string; reportTitle?: string; domain?: string }

export const parseJson = <T,>(s: string | null | undefined, fallback: T): T => { try { return s ? { ...fallback, ...JSON.parse(s) } : fallback } catch { return fallback } }

export function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'org'
  return `${base}-${randomBytes(2).toString('hex')}`
}

export async function membershipsOf(userId: string, email: string) {
  // Claim invited rows that match this e-mail (first visit after invitation is accepted elsewhere is handled by acceptInvite).
  return prisma.orgMember.findMany({ where: { OR: [{ userId }, { email: email.toLowerCase(), status: 'active' }], status: { in: ['active'] } }, include: { org: true }, orderBy: { createdAt: 'asc' } })
}

export async function requireMember(userId: string, email: string, orgId: string) {
  const m = await prisma.orgMember.findFirst({ where: { orgId, status: 'active', OR: [{ userId }, { email: email.toLowerCase() }] }, include: { org: true } })
  if (!m) return null
  if (!m.userId) await prisma.orgMember.update({ where: { id: m.id }, data: { userId } }).catch(() => {})
  return { ...m, role: m.role as OrgRole }
}

// ---- Compliance archive: append-only, hash-chained per organization -------
export async function appendRecord(orgId: string, kind: string, actor: string, payload: Record<string, unknown>, refId?: string | null) {
  const last = await prisma.complianceRecord.findFirst({ where: { orgId }, orderBy: { seq: 'desc' } })
  const seq = (last?.seq ?? 0) + 1
  const prevHash = last?.hash ?? 'GENESIS'
  const body = JSON.stringify(payload)
  const createdAt = new Date()
  const hash = createHash('sha256').update(`${orgId}|${seq}|${kind}|${refId ?? ''}|${actor}|${body}|${prevHash}|${createdAt.toISOString()}`).digest('hex')
  return prisma.complianceRecord.create({ data: { orgId, seq, kind, refId: refId ?? null, actor, payload: body, prevHash, hash, createdAt } })
}

export async function verifyArchive(orgId: string) {
  const rows = await prisma.complianceRecord.findMany({ where: { orgId }, orderBy: { seq: 'asc' } })
  let prev = 'GENESIS'
  for (const r of rows) {
    const expected = createHash('sha256').update(`${orgId}|${r.seq}|${r.kind}|${r.refId ?? ''}|${r.actor}|${r.payload}|${prev}|${r.createdAt.toISOString()}`).digest('hex')
    if (r.prevHash !== prev || r.hash !== expected) return { ok: false, records: rows.length, brokenAt: r.seq }
    prev = r.hash
  }
  return { ok: true, records: rows.length, head: prev }
}

// ---- Invites ---------------------------------------------------------------
export function newInviteToken() {
  const token = `emil_invite_${randomBytes(18).toString('hex')}`
  return { token, hash: createHash('sha256').update(token).digest('hex') }
}
export const hashInvite = (token: string) => createHash('sha256').update(token).digest('hex')

export async function sendInviteEmail(email: string, orgName: string, token: string) {
  if (!emailConfigured()) return { sent: false, reason: 'RESEND_API_KEY not configured — share the join link manually.' }
  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  const link = `${base}/org/join/${token}`
  const r = await emailSend(email, `You are invited to ${orgName} on EMIL`, `<p>You have been invited to join <strong>${orgName}</strong> on EMIL.</p><p><a href="${link}">Accept the invitation</a></p><p style="color:#888;font-size:12px">If you do not have an EMIL account yet, create one with this e-mail address first.</p>`)
  return { sent: r.ok, reason: r.error }
}

export async function acceptInvite(userId: string, email: string, token: string) {
  const m = await prisma.orgMember.findUnique({ where: { inviteHash: hashInvite(token) }, include: { org: true } })
  if (!m) return { ok: false, error: 'This invitation link is not valid or was already used.' }
  if (m.email.toLowerCase() !== email.toLowerCase()) return { ok: false, error: `This invitation was sent to ${m.email}. Sign in with that e-mail address to accept it.` }
  await prisma.orgMember.update({ where: { id: m.id }, data: { userId, status: 'active', joinedAt: new Date(), inviteHash: null } })
  await appendRecord(m.orgId, 'member.joined', email, { role: m.role }, m.id)
  emitEvent(m.org.ownerId, 'org.member.changed', { orgId: m.orgId, email, role: m.role, change: 'joined' }).catch(() => {})
  return { ok: true, org: m.org }
}

// SSO auto-join: an org that claims the e-mail domain adds new sign-ins as viewers.
export async function autoJoinByDomain(userId: string, email: string) {
  const domain = email.toLowerCase().split('@')[1]
  if (!domain) return
  const org = await prisma.organization.findFirst({ where: { ssoDomain: domain } })
  if (!org) return
  const existing = await prisma.orgMember.findFirst({ where: { orgId: org.id, email: email.toLowerCase() } })
  if (existing) { if (!existing.userId) await prisma.orgMember.update({ where: { id: existing.id }, data: { userId, status: 'active', joinedAt: new Date() } }); return }
  await prisma.orgMember.create({ data: { orgId: org.id, userId, email: email.toLowerCase(), role: 'viewer', status: 'active', joinedAt: new Date(), invitedBy: 'sso-domain' } })
  await appendRecord(org.id, 'member.autojoined', email, { via: 'sso-domain', role: 'viewer' })
}

// ---- Desk guards -----------------------------------------------------------
export class OrgGuardError extends Error { status = 403 }

export type OrderGuardResult = { requiresApproval: false } | { requiresApproval: true; requestId: string; orgName: string }

// Checked before every paper order (app desk and API). Uses the caller's
// organizations: kill switch blocks, restricted symbols block, position limits
// cap notional/qty, and when approvals are required a trader's order becomes
// an approval request instead of an order.
export async function orderGuard(userId: string, email: string, order: { symbol: string; qty: number; notionalUsd?: number | null; venue: string; side: string; type: string; price?: number }, opts: { skipApproval?: boolean } = {}): Promise<OrderGuardResult> {
  const memberships = await prisma.orgMember.findMany({ where: { status: 'active', OR: [{ userId }, { email: email.toLowerCase() }] }, include: { org: { include: { restricted: true, limits: true } } } })
  const sym = order.symbol.toUpperCase().replace(/[-_/:.]/g, '')
  for (const m of memberships) {
    const s = parseJson<OrgSettings>(m.org.settings, {})
    if (s.killSwitch) throw new OrgGuardError(`${m.org.name}: the organization kill switch is ON — no orders until an admin lifts it.`)
    const restricted = m.org.restricted.find((r) => r.symbol.toUpperCase().replace(/[-_/:.]/g, '') === sym)
    if (restricted) throw new OrgGuardError(`${m.org.name}: ${restricted.symbol} is on the restricted list${restricted.reason ? ` (${restricted.reason})` : ''}.`)
    for (const l of m.org.limits) {
      const applies = (l.scope === 'org') || (l.scope === 'member' && (l.scopeRef ?? '').toLowerCase() === email.toLowerCase()) || (l.scope === 'desk' && !!m.desk && (l.scopeRef ?? '') === m.desk)
      if (!applies) continue
      if (l.symbol && l.symbol.toUpperCase().replace(/[-_/:.]/g, '') !== sym) continue
      if (l.maxQty !== null && l.maxQty !== undefined && order.qty > l.maxQty) throw new OrgGuardError(`${m.org.name}: qty ${order.qty} exceeds the ${l.scope} limit of ${l.maxQty}${l.symbol ? ` on ${l.symbol}` : ''}.`)
      if (l.maxNotionalUsd !== null && l.maxNotionalUsd !== undefined && order.notionalUsd && order.notionalUsd > l.maxNotionalUsd) throw new OrgGuardError(`${m.org.name}: notional $${Math.round(order.notionalUsd).toLocaleString()} exceeds the ${l.scope} limit of $${l.maxNotionalUsd.toLocaleString()}.`)
    }
    if (s.requireApprovals && m.role === 'trader' && !opts.skipApproval) {
      const req = await prisma.approvalRequest.create({ data: { orgId: m.orgId, kind: 'paper_order', requesterId: userId, requesterEmail: email, payload: JSON.stringify(order) } })
      await appendRecord(m.orgId, 'approval.requested', email, { kind: 'paper_order', order }, req.id)
      await notifyApprovers(m.orgId, { title: `${m.org.name}: approval needed — ${order.side} ${order.qty} ${order.symbol}`, body: `Requested by ${email} on ${order.venue} (paper). Review in Organization → Approvals.`, href: '/org?tab=approvals' })
      return { requiresApproval: true, requestId: req.id, orgName: m.org.name }
    }
  }
  return { requiresApproval: false }
}

export async function notifyApprovers(orgId: string, n: { title: string; body: string; href: string }) {
  const approvers = await prisma.orgMember.findMany({ where: { orgId, status: 'active', role: { in: ['owner', 'admin', 'compliance'] }, userId: { not: null } } })
  for (const a of approvers) {
    await prisma.notification.create({ data: { userId: a.userId as string, kind: 'admin', ...n } }).catch(() => {})
  }
}

export function newPortalToken() {
  const token = `emil_client_${randomBytes(16).toString('hex')}`
  return { token, hash: createHash('sha256').update(token).digest('hex') }
}
export const hashPortal = (token: string) => createHash('sha256').update(token).digest('hex')

// Track record for a signal channel — CALCULATED from closed posts only.
export function trackRecord(posts: { status: string; outcomePct: number | null }[]) {
  const closed = posts.filter((p) => p.status === 'closed' && typeof p.outcomePct === 'number')
  const wins = closed.filter((p) => (p.outcomePct as number) > 0).length
  const sum = closed.reduce((a, p) => a + (p.outcomePct as number), 0)
  return { posts: posts.length, closed: closed.length, open: posts.filter((p) => p.status === 'open').length, winRate: closed.length ? wins / closed.length : null, avgPct: closed.length ? sum / closed.length : null, cumPct: sum }
}
