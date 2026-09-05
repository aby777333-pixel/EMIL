import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Privacy & data (GDPR / DPDP): export everything EMIL holds about the
// signed-in customer as JSON, or delete the account (credentials, keys,
// links and personal rows purged; audit rows anonymised and kept).
async function me() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const userId = (session.user as any).id as string
  return { userId, email: (session.user.email ?? '').toLowerCase(), isAdmin: !!(await requireAdmin(userId)) }
}

export async function GET() {
  const u = await me()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const w = { where: { userId: u.userId } }
  const [user, profile, subscription, invoices, apiKeys, usage, webhooks, brokerLinks, bridges, signals, deals, watchlist, alerts, notifications, journal, orders, orgs, feedQuotes, feedOrders, feedPnl, channels, embeds, oauthClients, grants, providerKeys, riskOverrides, audit] = await Promise.all([
    prisma.user.findUnique({ where: { id: u.userId }, select: { id: true, email: true, name: true, role: true, createdAt: true, selectedMarkets: true, notifyEmail: true, notifyTelegram: true, totpEnabled: true } }),
    prisma.customerProfile.findUnique({ where: { userId: u.userId } }),
    prisma.subscription.findUnique({ where: { userId: u.userId } }),
    prisma.invoice.findMany(w), prisma.apiKey.findMany({ ...w, select: { id: true, label: true, prefix: true, status: true, environment: true, scopes: true, createdAt: true, lastUsedAt: true } }),
    prisma.apiUsage.findMany(w), prisma.webhookEndpoint.findMany({ ...w, select: { id: true, url: true, events: true, status: true, createdAt: true } }),
    prisma.userBrokerConnection.findMany({ ...w, select: { providerKey: true, status: true, permissionTier: true, createdAt: true } }),
    prisma.bridgeConnection.findMany({ ...w, include: { positions: true } }), prisma.bridgeSignal.findMany(w), prisma.bridgeDeal.findMany(w),
    prisma.watchlistItem.findMany(w), prisma.priceAlert.findMany(w), prisma.notification.findMany(w), prisma.journalEntry.findMany(w), prisma.venueOrder.findMany(w),
    prisma.orgMember.findMany({ where: { OR: [{ userId: u.userId }, { email: u.email }] }, include: { org: { select: { name: true, kind: true } } } }),
    prisma.customerFeedQuote.findMany({ ...w, take: 10000 }), prisma.customerFeedOrder.findMany(w), prisma.customerFeedPnl.findMany(w),
    prisma.notificationChannel.findMany({ ...w, select: { kind: true, label: true, events: true, status: true } }), prisma.embedKey.findMany(w),
    prisma.oAuthClient.findMany({ where: { ownerUserId: u.userId }, select: { name: true, clientId: true, scopes: true, redirectUris: true } }), prisma.oAuthGrant.findMany({ ...w, select: { clientId: true, scopes: true, createdAt: true, revokedAt: true } }),
    prisma.userProviderKey.findMany({ ...w, select: { providerKey: true, status: true, createdAt: true } }), prisma.riskOverride.findMany(w), prisma.auditLog.findMany({ ...w, take: 2000, orderBy: { createdAt: 'desc' } }),
  ])
  const bundle = { exportedAt: new Date().toISOString(), format: 'EMIL account export v1', note: 'Secrets (passwords, API keys, broker credentials, webhook secrets, vendor keys) are never exported — only their metadata.', user, profile, subscription, invoices, apiKeys, usage, webhooks, brokerLinks, bridges, signals, deals, watchlist, alerts, notifications, journal, paperOrders: orders, organizations: orgs, customerFeed: { quotes: feedQuotes, orders: feedOrders, pnl: feedPnl }, channels, embeds, oauthClients, oauthGrants: grants, providerKeys, riskOverrides, audit }
  await prisma.auditLog.create({ data: { userId: u.userId, actor: 'user', action: 'DATA EXPORT', category: 'privacy', detail: `${u.email} exported their account data` } }).catch(() => {})
  return new Response(JSON.stringify(bundle, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="emil-export-${new Date().toISOString().slice(0, 10)}.json"` } })
}

export async function POST(req: Request) {
  const u = await me()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (body?.type !== 'delete_account') return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  if (String(body?.confirm ?? '') !== u.email) return NextResponse.json({ error: 'Type your e-mail address exactly to confirm.' }, { status: 400 })
  if (u.isAdmin) return NextResponse.json({ error: 'Admin accounts cannot self-delete — demote the role first.' }, { status: 403 })
  const owned = await prisma.organization.count({ where: { ownerId: u.userId } })
  if (owned > 0) return NextResponse.json({ error: 'You own an organization. Delete it (Organization → Settings) or hand it over before deleting your account.' }, { status: 409 })
  const id = u.userId
  const w = { where: { userId: id } }
  await prisma.$transaction([
    prisma.apiKey.deleteMany(w), prisma.webhookEndpoint.deleteMany(w), prisma.userBrokerConnection.deleteMany(w), prisma.bridgeConnection.deleteMany(w),
    prisma.watchlistItem.deleteMany(w), prisma.watchlist.deleteMany(w), prisma.priceAlert.deleteMany(w), prisma.notification.deleteMany(w), prisma.journalEntry.deleteMany(w), prisma.venueOrder.deleteMany(w),
    prisma.customerFeedQuote.deleteMany(w), prisma.customerFeedOrder.deleteMany(w), prisma.customerFeedPnl.deleteMany(w), prisma.notificationChannel.deleteMany(w), prisma.embedKey.deleteMany(w),
    prisma.oAuthGrant.deleteMany(w), prisma.oAuthClient.deleteMany({ where: { ownerUserId: id } }), prisma.userProviderKey.deleteMany(w), prisma.chartLayout.deleteMany(w),
    prisma.orgMember.deleteMany({ where: { OR: [{ userId: id }, { email: u.email }] } }), prisma.channelSubscription.deleteMany(w), prisma.subscription.deleteMany(w),
    prisma.customerProfile.updateMany({ where: { userId: id }, data: { status: 'churned', company: null, phone: null, country: null, tags: null, mrr: 0 } }),
    prisma.user.update({ where: { id }, data: { email: `deleted-${id.slice(-8)}@deleted.emil.invalid`, name: null, password: await bcrypt.hash(randomBytes(32).toString('hex'), 10), telegramChatId: null, notifyTelegram: false, notifyEmail: false, totpSecret: null, totpEnabled: false, selectedMarkets: null } }),
  ])
  await prisma.auditLog.create({ data: { userId: id, actor: 'user', action: 'ACCOUNT DELETED', category: 'privacy', detail: `Customer requested deletion — credentials, keys, links and personal rows purged; audit retained anonymised.` } }).catch(() => {})
  return NextResponse.json({ ok: true, note: 'Your account is deleted. Invoices are retained for the statutory period under an anonymised identifier.' })
}
