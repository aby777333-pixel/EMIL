import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { appendRecord, hashPortal } from '@/lib/org'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Client portal actions (tokenised, no sign-in): a client approves or declines
// a recommendation that was sent to them. Every decision is archived.
export async function POST(req: Request, ctx: { params: { token: string } }) {
  const gate = await rateLimit(`portal:${clientIp(req)}`, 30, 600)
  if (!gate.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const client = await prisma.clientAccount.findUnique({ where: { portalHash: hashPortal(ctx.params.token) }, include: { org: true } })
  if (!client || client.status !== 'active') return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const r = await prisma.recommendation.findFirst({ where: { id: String(body?.recoId ?? ''), clientId: client.id, status: 'sent' } })
  if (!r) return NextResponse.json({ error: 'Recommendation not found or already decided.' }, { status: 404 })
  const decision = body?.decision === 'approve' ? 'approved' : body?.decision === 'decline' ? 'declined' : null
  if (!decision) return NextResponse.json({ error: 'decision must be approve or decline' }, { status: 400 })
  const note = String(body?.note ?? '').slice(0, 500) || null
  await prisma.recommendation.update({ where: { id: r.id }, data: { status: decision, decidedAt: new Date(), decidedBy: `client ${client.name} via portal${note ? ` — ${note}` : ''}` } })
  await appendRecord(client.orgId, `recommendation.${decision}`, `client:${client.name}`, { symbol: r.symbol, direction: r.direction, via: 'portal', note, ip: clientIp(req) }, r.id)
  const author = await prisma.user.findUnique({ where: { id: r.authorId }, select: { id: true } })
  if (author) await prisma.notification.create({ data: { userId: author.id, kind: 'admin', title: `${client.name} ${decision} ${r.direction.toUpperCase()} ${r.symbol}`, body: note ?? 'Decided in the client portal.', href: '/org?tab=recommendations' } }).catch(() => {})
  return NextResponse.json({ ok: true, status: decision })
}
