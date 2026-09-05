import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateApiKey, hashApiKey } from '@/lib/api-key'
import { ALL_SCOPES, planLimits, parseScopes } from '@/lib/entitlements'
import { WEBHOOK_EVENTS, createEndpoint, dispatchDue, emitEvent, validateWebhookUrl } from '@/lib/webhooks'
import { decryptSecret } from '@/lib/secrets'

export const dynamic = 'force-dynamic'

// Developer portal backend (self-serve): API keys with scopes / sandbox /
// IP allow-list / expiry, usage metering, webhook endpoints + delivery log,
// plan quotas. Everything is scoped to the signed-in user.

async function who() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const userId = (session.user as any).id as string
  const [admin, profile] = await Promise.all([requireAdmin(userId), prisma.customerProfile.findUnique({ where: { userId } })])
  return { userId, email: session.user.email ?? '', isAdmin: !!admin, planKey: profile?.planKey ?? 'trial', limits: planLimits(profile?.planKey, !!admin) }
}

export async function GET() {
  const me = await who()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)
    const [keys, usage, endpoints] = await Promise.all([
      prisma.apiKey.findMany({ where: { userId: me.userId }, orderBy: { createdAt: 'desc' } }),
      prisma.apiUsage.findMany({ where: { userId: me.userId, day: { gte: since } }, orderBy: { day: 'asc' } }),
      prisma.webhookEndpoint.findMany({ where: { userId: me.userId }, orderBy: { createdAt: 'desc' }, include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 20 } } }),
    ])
    const byDay: Record<string, number> = {}
    const byEndpoint: Record<string, number> = {}
    const byKey: Record<string, number> = {}
    for (const u of usage) {
      byDay[u.day] = (byDay[u.day] ?? 0) + u.count
      byEndpoint[u.endpoint] = (byEndpoint[u.endpoint] ?? 0) + u.count
      byKey[u.keyId] = (byKey[u.keyId] ?? 0) + u.count
    }
    const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
    return NextResponse.json({
      account: { email: me.email, planKey: me.planKey, isAdmin: me.isAdmin },
      limits: me.limits,
      scopes: ALL_SCOPES,
      events: WEBHOOK_EVENTS,
      baseUrl: base,
      keys: keys.map((k) => ({ id: k.id, label: k.label, prefix: k.prefix, status: k.status, environment: k.environment, scopes: parseScopes(k.scopes), ipAllowlist: k.ipAllowlist, expiresAt: k.expiresAt, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt, revokedAt: k.revokedAt, calls14d: byKey[k.id] ?? 0 })),
      usage: { since, byDay, byEndpoint, total: usage.reduce((a, u) => a + u.count, 0) },
      webhooks: endpoints.map((e) => ({
        id: e.id, url: e.url, events: e.events.split(',').filter(Boolean), description: e.description, status: e.status, failCount: e.failCount, lastDeliveryAt: e.lastDeliveryAt, lastStatusCode: e.lastStatusCode, createdAt: e.createdAt,
        deliveries: e.deliveries.map((d) => ({ id: d.id, event: d.event, status: d.status, attempt: d.attempt, responseCode: d.responseCode, responseBody: d.responseBody?.slice(0, 160), nextAttemptAt: d.nextAttemptAt, deliveredAt: d.deliveredAt, createdAt: d.createdAt })),
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load the developer portal' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const me = await who()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const type = String(body?.type ?? '')

    if (type === 'create_key') {
      const active = await prisma.apiKey.count({ where: { userId: me.userId, status: 'active' } })
      if (active >= me.limits.maxKeys) return NextResponse.json({ error: `Your ${me.limits.label} plan allows ${me.limits.maxKeys} active API keys. Revoke one or upgrade.` }, { status: 403 })
      const environment = body?.environment === 'sandbox' ? 'sandbox' : 'live'
      const scopes = parseScopes(Array.isArray(body?.scopes) ? body.scopes.join(',') : String(body?.scopes ?? 'read'))
      const label = String(body?.label ?? '').trim().slice(0, 60) || `${environment} key`
      const ipAllowlist = String(body?.ipAllowlist ?? '').split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 20).join(',') || null
      const expiresAt = body?.expiresInDays ? new Date(Date.now() + Math.max(1, Math.min(3650, Number(body.expiresInDays))) * 86_400_000) : null
      const gen = generateApiKey(environment)
      const rec = await prisma.apiKey.create({ data: { userId: me.userId, label, prefix: gen.prefix, keyHash: gen.hash, environment, scopes: scopes.join(','), ipAllowlist, expiresAt } })
      await prisma.auditLog.create({ data: { userId: me.userId, actor: 'user', action: 'API KEY ISSUED (SELF-SERVE)', category: 'platform_api', detail: `${me.email} issued ${environment} key "${label}" [${scopes.join(', ')}]${ipAllowlist ? ` IPs ${ipAllowlist}` : ''}${expiresAt ? ` expires ${expiresAt.toISOString().slice(0, 10)}` : ''}` } }).catch(() => {})
      return NextResponse.json({ ok: true, id: rec.id, key: gen.key, prefix: gen.prefix })
    }

    if (type === 'revoke_key') {
      const k = await prisma.apiKey.findFirst({ where: { id: String(body?.id ?? ''), userId: me.userId } })
      if (!k) return NextResponse.json({ error: 'Key not found' }, { status: 404 })
      await prisma.apiKey.update({ where: { id: k.id }, data: { status: 'revoked', revokedAt: new Date() } })
      await prisma.auditLog.create({ data: { userId: me.userId, actor: 'user', action: 'API KEY REVOKED', category: 'platform_api', detail: `${me.email} revoked key ${k.prefix}… (${k.label})` } }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    if (type === 'rotate_key') {
      const k = await prisma.apiKey.findFirst({ where: { id: String(body?.id ?? ''), userId: me.userId, status: 'active' } })
      if (!k) return NextResponse.json({ error: 'Key not found' }, { status: 404 })
      const gen = generateApiKey(k.environment === 'sandbox' ? 'sandbox' : 'live')
      const rec = await prisma.apiKey.create({ data: { userId: me.userId, label: k.label, prefix: gen.prefix, keyHash: gen.hash, environment: k.environment, scopes: k.scopes, ipAllowlist: k.ipAllowlist, expiresAt: k.expiresAt } })
      // Grace period: the old key stays valid for 24 hours so integrations can swap without downtime.
      await prisma.apiKey.update({ where: { id: k.id }, data: { expiresAt: new Date(Date.now() + 86_400_000), label: `${k.label} (rotated — expires in 24h)` } })
      await prisma.auditLog.create({ data: { userId: me.userId, actor: 'user', action: 'API KEY ROTATED', category: 'platform_api', detail: `${me.email} rotated ${k.prefix}… → ${gen.prefix}… (old key valid 24h)` } }).catch(() => {})
      return NextResponse.json({ ok: true, id: rec.id, key: gen.key, prefix: gen.prefix })
    }

    if (type === 'create_webhook') {
      const count = await prisma.webhookEndpoint.count({ where: { userId: me.userId } })
      if (count >= me.limits.maxWebhooks) return NextResponse.json({ error: `Your ${me.limits.label} plan allows ${me.limits.maxWebhooks} webhook endpoints.` }, { status: 403 })
      const url = String(body?.url ?? '').trim()
      const bad = validateWebhookUrl(url)
      if (bad) return NextResponse.json({ error: bad }, { status: 400 })
      const events = (Array.isArray(body?.events) ? body.events : String(body?.events ?? '*').split(',')).map((s: string) => String(s).trim()).filter((s: string) => s === '*' || s in WEBHOOK_EVENTS)
      const { endpoint, secret } = await createEndpoint(me.userId, url, events, body?.description)
      await prisma.auditLog.create({ data: { userId: me.userId, actor: 'user', action: 'WEBHOOK CREATED', category: 'platform_api', detail: `${me.email} added webhook ${url} [${endpoint.events}]` } }).catch(() => {})
      return NextResponse.json({ ok: true, id: endpoint.id, secret })
    }

    if (type === 'delete_webhook' || type === 'pause_webhook' || type === 'resume_webhook' || type === 'test_webhook' || type === 'reveal_webhook_secret') {
      const ep = await prisma.webhookEndpoint.findFirst({ where: { id: String(body?.id ?? ''), userId: me.userId } })
      if (!ep) return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
      if (type === 'delete_webhook') { await prisma.webhookEndpoint.delete({ where: { id: ep.id } }); return NextResponse.json({ ok: true }) }
      if (type === 'pause_webhook') { await prisma.webhookEndpoint.update({ where: { id: ep.id }, data: { status: 'paused' } }); return NextResponse.json({ ok: true }) }
      if (type === 'resume_webhook') { await prisma.webhookEndpoint.update({ where: { id: ep.id }, data: { status: 'active', failCount: 0 } }); return NextResponse.json({ ok: true }) }
      if (type === 'reveal_webhook_secret') return NextResponse.json({ ok: true, secret: decryptSecret(ep.secret) })
      // test: create a single delivery for this endpoint only and try it now
      const payload = JSON.stringify({ id: `evt_test_${Date.now()}`, event: 'test.ping', createdAt: new Date().toISOString(), data: { message: 'Hello from EMIL — your endpoint is wired.', account: me.email } })
      await prisma.webhookDelivery.create({ data: { endpointId: ep.id, userId: me.userId, event: 'test.ping', payload } })
      const r = await dispatchDue(5)
      const last = await prisma.webhookDelivery.findFirst({ where: { endpointId: ep.id, event: 'test.ping' }, orderBy: { createdAt: 'desc' } })
      return NextResponse.json({ ok: last?.status === 'delivered', delivery: last, dispatched: r })
    }

    if (type === 'emit_sample') {
      await emitEvent(me.userId, 'notification.created', { title: 'Sample event', body: 'Emitted from the developer portal.' })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

// Exposed for the admin CRM (which still issues keys on a customer's behalf).
export { hashApiKey }
