import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes, createHash } from 'crypto'
import { decryptSecret, encryptSecret } from '@/lib/secrets'
import { sendToChannel } from '@/lib/notify'
import { newClientCredentials } from '@/lib/oauth'
import { ALL_SCOPES, parseScopes } from '@/lib/entitlements'
import { timeoutFetch } from '@/lib/execution/types'

export const dynamic = 'force-dynamic'

// Integrations backend (session): chat channels (Slack/Discord/Teams/generic),
// embed keys, OAuth clients + grants, bring-your-own vendor/AI keys.
const CHANNEL_KINDS = ['slack', 'discord', 'teams', 'generic']
const WIDGETS = ['chart', 'news', 'brief', 'quotes', 'ask']
const PROVIDER_KEYS: Record<string, { label: string; hint: string; test: (key: string) => Promise<{ ok: boolean; message: string }> }> = {
  twelve_data: {
    label: 'Twelve Data (charts, quotes, correlation on your own plan)', hint: 'twelvedata.com → API key',
    test: async (key) => { const r = await timeoutFetch(`https://api.twelvedata.com/api_usage?apikey=${encodeURIComponent(key)}`, {}, 8000); const j: any = await r.json().catch(() => null); return j?.plan_category ? { ok: true, message: `Plan ${j.plan_category} — ${j.daily_usage ?? '?'}/${j.plan_daily_limit ?? '?'} daily credits used` } : { ok: false, message: j?.message ?? `responded ${r.status}` } },
  },
  openai: {
    label: 'OpenAI (Ask EMIL, research reports run on your key)', hint: 'platform.openai.com → API keys',
    test: async (key) => { const r = await timeoutFetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } }, 8000); return r.ok ? { ok: true, message: 'Key accepted by OpenAI.' } : { ok: false, message: `OpenAI responded ${r.status}` } },
  },
  abacus_ai: {
    label: 'Abacus.AI (same engine EMIL uses, on your account)', hint: 'abacus.ai → API keys',
    test: async () => ({ ok: true, message: 'Saved. Abacus keys are verified on first use.' }),
  },
}

async function me() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return { userId: (session.user as any).id as string, email: session.user.email ?? '' }
}
const mask = (v?: string | null) => (v ? `${v.slice(0, 4)}••••${v.slice(-3)}` : null)

export async function GET() {
  const u = await me()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [channels, embeds, clients, grants, keys] = await Promise.all([
    prisma.notificationChannel.findMany({ where: { userId: u.userId }, orderBy: { createdAt: 'desc' } }),
    prisma.embedKey.findMany({ where: { userId: u.userId }, orderBy: { createdAt: 'desc' } }),
    prisma.oAuthClient.findMany({ where: { ownerUserId: u.userId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { grants: true } } } }),
    prisma.oAuthGrant.findMany({ where: { userId: u.userId, revokedAt: null, accessTokenHash: { not: null } }, include: { client: { select: { name: true, clientId: true } } }, orderBy: { updatedAt: 'desc' } }),
    prisma.userProviderKey.findMany({ where: { userId: u.userId } }),
  ])
  return NextResponse.json({
    baseUrl: (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, ''),
    kinds: CHANNEL_KINDS, widgets: WIDGETS, scopes: ALL_SCOPES, providers: Object.fromEntries(Object.entries(PROVIDER_KEYS).map(([k, v]) => [k, { label: v.label, hint: v.hint }])),
    channels: channels.map((c) => ({ id: c.id, kind: c.kind, label: c.label, url: mask(decryptSecret(c.webhookUrl)), events: c.events, status: c.status, failCount: c.failCount, lastSentAt: c.lastSentAt, lastError: c.lastError })),
    embeds: embeds.map((e) => ({ id: e.id, label: e.label, publicKey: e.publicKey, allowedOrigins: e.allowedOrigins, widgets: e.widgets.split(','), theme: (() => { try { return JSON.parse(e.theme ?? '{}') } catch { return {} } })(), status: e.status, createdAt: e.createdAt })),
    clients: clients.map((c) => ({ id: c.id, name: c.name, clientId: c.clientId, redirectUris: c.redirectUris.split(','), scopes: c.scopes.split(','), logoUrl: c.logoUrl, status: c.status, grants: c._count.grants, createdAt: c.createdAt })),
    grants: grants.map((g) => ({ id: g.id, app: g.client.name, clientId: g.client.clientId, scopes: g.scopes.split(','), since: g.createdAt, lastRefreshed: g.updatedAt })),
    providerKeys: keys.map((k) => ({ providerKey: k.providerKey, label: k.label, masked: mask(decryptSecret(k.apiKey)), status: k.status, lastError: k.lastError, updatedAt: k.updatedAt })),
  })
}

export async function POST(req: Request) {
  const u = await me()
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const type = String(body?.type ?? '')
  try {
    // ---- chat channels ----
    if (type === 'add_channel') {
      const kind = CHANNEL_KINDS.includes(body?.kind) ? body.kind : 'generic'
      const url = String(body?.webhookUrl ?? '').trim()
      if (!/^https:\/\//.test(url)) return NextResponse.json({ error: 'Webhook URL must start with https://' }, { status: 400 })
      const count = await prisma.notificationChannel.count({ where: { userId: u.userId } })
      if (count >= 10) return NextResponse.json({ error: 'Maximum 10 channels.' }, { status: 403 })
      const ch = await prisma.notificationChannel.create({ data: { userId: u.userId, kind, label: String(body?.label ?? '').slice(0, 60) || `${kind} channel`, webhookUrl: encryptSecret(url) as string, events: String(body?.events ?? '*').slice(0, 400) || '*' } })
      const test = await sendToChannel(ch, { title: 'EMIL connected', body: `This ${kind} channel now receives your EMIL notifications.` }, (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, ''))
      return NextResponse.json({ ok: true, id: ch.id, test })
    }
    if (type === 'test_channel' || type === 'delete_channel' || type === 'toggle_channel') {
      const ch = await prisma.notificationChannel.findFirst({ where: { id: String(body?.id ?? ''), userId: u.userId } })
      if (!ch) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
      if (type === 'delete_channel') { await prisma.notificationChannel.delete({ where: { id: ch.id } }); return NextResponse.json({ ok: true }) }
      if (type === 'toggle_channel') { await prisma.notificationChannel.update({ where: { id: ch.id }, data: { status: ch.status === 'paused' ? 'active' : 'paused', failCount: 0 } }); return NextResponse.json({ ok: true }) }
      const r = await sendToChannel(ch, { title: 'Test from EMIL', body: 'If you can read this, the channel works.' }, (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, ''))
      return NextResponse.json({ ok: r.ok, error: r.error || null })
    }

    // ---- embed keys ----
    if (type === 'create_embed') {
      const count = await prisma.embedKey.count({ where: { userId: u.userId, status: 'active' } })
      if (count >= 10) return NextResponse.json({ error: 'Maximum 10 embed keys.' }, { status: 403 })
      const widgets = (Array.isArray(body?.widgets) ? body.widgets : WIDGETS).filter((w: string) => WIDGETS.includes(w))
      const theme = body?.theme && typeof body.theme === 'object' ? JSON.stringify(body.theme) : null
      const e = await prisma.embedKey.create({ data: { userId: u.userId, label: String(body?.label ?? '').slice(0, 60) || 'Website', publicKey: `emil_pk_${randomBytes(12).toString('hex')}`, allowedOrigins: String(body?.allowedOrigins ?? '').split(',').map((s: string) => s.trim().replace(/\/$/, '')).filter(Boolean).slice(0, 20).join(',') || null, widgets: (widgets.length ? widgets : WIDGETS).join(','), theme } })
      return NextResponse.json({ ok: true, id: e.id, publicKey: e.publicKey })
    }
    if (type === 'update_embed' || type === 'revoke_embed') {
      const e = await prisma.embedKey.findFirst({ where: { id: String(body?.id ?? ''), userId: u.userId } })
      if (!e) return NextResponse.json({ error: 'Embed key not found' }, { status: 404 })
      if (type === 'revoke_embed') { await prisma.embedKey.update({ where: { id: e.id }, data: { status: 'revoked' } }); return NextResponse.json({ ok: true }) }
      const data: any = {}
      if (body?.allowedOrigins !== undefined) data.allowedOrigins = String(body.allowedOrigins ?? '').split(',').map((s: string) => s.trim().replace(/\/$/, '')).filter(Boolean).slice(0, 20).join(',') || null
      if (Array.isArray(body?.widgets)) data.widgets = body.widgets.filter((w: string) => WIDGETS.includes(w)).join(',') || WIDGETS.join(',')
      if (body?.theme && typeof body.theme === 'object') data.theme = JSON.stringify(body.theme)
      await prisma.embedKey.update({ where: { id: e.id }, data })
      return NextResponse.json({ ok: true })
    }

    // ---- OAuth clients ----
    if (type === 'create_client') {
      const count = await prisma.oAuthClient.count({ where: { ownerUserId: u.userId } })
      if (count >= 10) return NextResponse.json({ error: 'Maximum 10 OAuth applications.' }, { status: 403 })
      const uris = String(body?.redirectUris ?? '').split(/[\s,]+/).map((s: string) => s.trim()).filter((s: string) => /^https?:\/\//.test(s)).slice(0, 10)
      if (uris.length === 0) return NextResponse.json({ error: 'At least one https redirect URI is required' }, { status: 400 })
      if (uris.some((s: string) => s.startsWith('http://') && !/^http:\/\/(localhost|127\.)/.test(s))) return NextResponse.json({ error: 'http:// redirect URIs are allowed only for localhost' }, { status: 400 })
      const cred = newClientCredentials()
      const scopes = parseScopes(Array.isArray(body?.scopes) ? body.scopes.join(',') : String(body?.scopes ?? 'read'))
      const c = await prisma.oAuthClient.create({ data: { ownerUserId: u.userId, name: String(body?.name ?? '').slice(0, 60) || 'My app', clientId: cred.clientId, clientSecretHash: cred.secretHash, redirectUris: uris.join(','), scopes: scopes.join(','), logoUrl: String(body?.logoUrl ?? '').slice(0, 300) || null } })
      return NextResponse.json({ ok: true, id: c.id, clientId: c.clientId, clientSecret: cred.secret })
    }
    if (type === 'rotate_client_secret' || type === 'delete_client' || type === 'toggle_client') {
      const c = await prisma.oAuthClient.findFirst({ where: { id: String(body?.id ?? ''), ownerUserId: u.userId } })
      if (!c) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      if (type === 'delete_client') { await prisma.oAuthClient.delete({ where: { id: c.id } }); return NextResponse.json({ ok: true }) }
      if (type === 'toggle_client') { await prisma.oAuthClient.update({ where: { id: c.id }, data: { status: c.status === 'active' ? 'disabled' : 'active' } }); return NextResponse.json({ ok: true }) }
      const secret = `emil_secret_${randomBytes(24).toString('hex')}`
      await prisma.oAuthClient.update({ where: { id: c.id }, data: { clientSecretHash: createHash('sha256').update(secret).digest('hex') } })
      return NextResponse.json({ ok: true, clientSecret: secret })
    }
    if (type === 'revoke_grant') {
      const g = await prisma.oAuthGrant.findFirst({ where: { id: String(body?.id ?? ''), userId: u.userId } })
      if (!g) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
      await prisma.oAuthGrant.update({ where: { id: g.id }, data: { revokedAt: new Date(), accessTokenHash: null, refreshTokenHash: null } })
      return NextResponse.json({ ok: true })
    }

    // ---- bring-your-own keys ----
    if (type === 'save_provider_key') {
      const pk = String(body?.providerKey ?? '')
      const def = PROVIDER_KEYS[pk]
      if (!def) return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
      const key = String(body?.apiKey ?? '').trim()
      if (key.length < 8) return NextResponse.json({ error: 'Paste the full API key' }, { status: 400 })
      const test = await def.test(key).catch((e: any) => ({ ok: false, message: e?.message ?? 'test failed' }))
      await prisma.userProviderKey.upsert({ where: { userId_providerKey: { userId: u.userId, providerKey: pk } }, update: { apiKey: encryptSecret(key) as string, status: test.ok ? 'verified' : 'error', lastError: test.ok ? null : test.message, label: String(body?.label ?? '').slice(0, 60) || null }, create: { userId: u.userId, providerKey: pk, apiKey: encryptSecret(key) as string, status: test.ok ? 'verified' : 'error', lastError: test.ok ? null : test.message, label: String(body?.label ?? '').slice(0, 60) || null } })
      await prisma.auditLog.create({ data: { userId: u.userId, actor: 'user', action: 'BYO KEY SAVED', category: 'platform_api', detail: `${u.email} saved a ${pk} key — ${test.message}` } }).catch(() => {})
      return NextResponse.json({ ok: true, test })
    }
    if (type === 'delete_provider_key') {
      await prisma.userProviderKey.deleteMany({ where: { userId: u.userId, providerKey: String(body?.providerKey ?? '') } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message ?? 'Request failed' }, { status: 500 })
  }
}
