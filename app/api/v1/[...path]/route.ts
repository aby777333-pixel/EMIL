import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decryptSecret, encryptFields, encryptSecret } from '@/lib/secrets'
import { authenticateApiKey, hasScope, recordApiUsage, type ApiAuthResult } from '@/lib/api-key'
import { testProviderConnection } from '@/lib/india/adapter'
import { toTwelveData } from '@/lib/instruments/catalog'
import { cryptoMarkets, fxRates, marketBoard, newsFeed, timeSeries, correlationPair, watchlistQuotes } from '@/lib/data/hub'
import { centralBankMonitor, economicCalendar } from '@/lib/data/calendar'
import { instrumentReport } from '@/lib/report'
import { morningBrief } from '@/lib/brief'
import { consolidatedPortfolio } from '@/lib/portfolio'
import { scoreHeadlines } from '@/lib/news-impact'
import { flagEnabled } from '@/lib/flags'
import { ExecError, cancelGuarded, isPaperVenue, listExecutionVenues, placeGuarded } from '@/lib/execution/router'
import { WEBHOOK_EVENTS, createEndpoint, dispatchDue, emitEvent, validateWebhookUrl } from '@/lib/webhooks'
import { buildOpenApi, buildPostman, ENDPOINTS } from '@/lib/openapi'
import { SCOPES, type Scope } from '@/lib/entitlements'

export const dynamic = 'force-dynamic'

// EMIL Platform API v1 — the public REST surface customers integrate against.
// Auth: an EMIL API key (self-serve from /developers, or issued by the
// Command Center CRM) via `x-api-key` or `Authorization: Bearer emil_live_…`.
// The endpoint table in lib/openapi.ts is the reference; this file implements
// it. Standing rules: research data is delayed and never an execution
// trigger; the API reaches PAPER venues only — live execution is not exposed.

type Auth = Extract<ApiAuthResult, { ok: true }>
const mask = (v?: string | null) => (v ? `${v.slice(0, 3)}••••${v.slice(-2)}` : null)
const json = (body: any, status = 200, headers?: Record<string, string>) => NextResponse.json(body, { status, headers })
const numOrNull = (v: any) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v))
const WATCHLIST_SYMBOL_CAP = 8 // Twelve Data free tier: mirrors /api/watchlist

function needScope(auth: Auth, scope: Scope) {
  if (hasScope(auth, scope)) return null
  return json({ error: `This endpoint needs the "${scope}" scope (${SCOPES[scope]}). Issue a key with that scope in EMIL → Developers.` }, 403)
}

async function defaultWatchlist(userId: string) {
  const list = await prisma.watchlist.findFirst({ where: { userId }, orderBy: { sortOrder: 'asc' } })
  return list ?? prisma.watchlist.create({ data: { userId, name: 'Watchlist' } })
}

function sse(auth: Auth, symbols: string[]) {
  const enc = new TextEncoder()
  let closed = false
  let seq = 0
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        if (closed) return
        seq += 1
        controller.enqueue(enc.encode(`id: ${seq}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      send('hello', { account: auth.email, symbols, windowSec: 25, note: 'Delayed research quotes; reconnect when the stream ends (EventSource does this automatically).' })
      const started = Date.now()
      while (!closed && Date.now() - started < 25_000) {
        try {
          const [state, quotes] = await Promise.all([
            prisma.emilState.findFirst(),
            symbols.length ? watchlistQuotes(symbols).catch((e: any) => ({ error: e?.message })) : Promise.resolve(null),
          ])
          send('state', state ? { armed: state.armed, mode: state.mode, guardianStatus: state.guardianStatus, trustScore: state.trustScore, marketDataHealth: state.marketDataHealth, updatedAt: state.updatedAt } : null)
          if (quotes) send('quotes', quotes)
        } catch (e: any) {
          send('error', { message: e?.message ?? 'tick failed' })
        }
        await new Promise((r) => setTimeout(r, 5000))
      }
      send('end', { reason: 'window', reconnect: true })
      closed = true
      controller.close()
    },
    cancel() { closed = true },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } })
}

async function handle(req: Request, params: { path?: string[] }) {
  const segments = params.path ?? []
  const path = segments.join('/')
  const method = req.method
  const url = new URL(req.url)
  const base = `${url.protocol}//${url.host}`

  // Public meta endpoints — no key required.
  if (path === 'openapi.json' && method === 'GET') return json(buildOpenApi(base), 200, { 'Cache-Control': 'public, max-age=300' })
  if (path === 'postman.json' && method === 'GET') return json(buildPostman(base), 200, { 'Cache-Control': 'public, max-age=300' })
  if (path === 'endpoints' && method === 'GET') return json({ ok: true, version: 'v1', endpoints: ENDPOINTS })

  // EventSource cannot send headers, so the stream also accepts ?key=.
  if (path === 'stream' && url.searchParams.get('key') && !req.headers.get('x-api-key')) {
    req = new Request(req, { headers: { ...Object.fromEntries(req.headers), 'x-api-key': url.searchParams.get('key') as string } })
  }

  const auth = await authenticateApiKey(req)
  if (!auth.ok) return json({ error: auth.error, ...(auth.retryAfterSec ? { retryAfterSec: auth.retryAfterSec } : {}) }, auth.status, auth.retryAfterSec ? { 'Retry-After': String(auth.retryAfterSec) } : undefined)
  recordApiUsage(auth.keyId, auth.userId, `${method} /${segments.slice(0, 2).join('/')}`)
  const { userId } = auth
  const s = (k: string, d = '') => (url.searchParams.get(k) ?? d).trim()

  try {
    // ---- Account ---------------------------------------------------------
    if (path === 'ping' && method === 'GET') {
      return json({ ok: true, service: 'EMIL Platform API', version: 'v1', account: auth.email, plan: auth.planKey, environment: auth.environment, scopes: auth.scopes })
    }
    if (path === 'me' && method === 'GET') {
      const profile = await prisma.customerProfile.findUnique({ where: { userId } })
      const plan = profile ? await prisma.billingPlan.findUnique({ where: { key: profile.planKey } }) : null
      return json({
        ok: true,
        account: { email: auth.email, status: profile?.status ?? 'trial', plan: plan ? { key: plan.key, name: plan.name, priceMonthly: plan.priceMonthly } : { key: 'trial' }, trialEndsAt: profile?.trialEndsAt ?? null },
        key: { environment: auth.environment, scopes: auth.scopes },
        quota: { perMinute: auth.limits.apiPerMinute, perDay: auth.limits.apiPerDay, webhooks: auth.limits.maxWebhooks, streaming: auth.limits.streaming, sandboxOnly: auth.limits.sandboxOnly },
      })
    }
    if (path === 'usage' && method === 'GET') {
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)
      const rows = await prisma.apiUsage.findMany({ where: { userId, day: { gte: since } }, orderBy: [{ day: 'asc' }, { endpoint: 'asc' }] })
      return json({ ok: true, since, total: rows.reduce((a, r) => a + r.count, 0), rows: rows.map((r) => ({ day: r.day, keyId: r.keyId, endpoint: r.endpoint, count: r.count })) })
    }

    // ---- EMIL state / knowledge -----------------------------------------
    if (path === 'state' && method === 'GET') {
      const state = await prisma.emilState.findFirst()
      return json({ ok: true, state: state ? { armed: state.armed, mode: state.mode, guardianStatus: state.guardianStatus, trustScore: state.trustScore, agentConsensus: state.agentConsensus, volatilityStatus: state.volatilityStatus, marketDataHealth: state.marketDataHealth, updatedAt: state.updatedAt } : null })
    }
    if (path === 'strategies' && method === 'GET') {
      const blueprints = await prisma.strategyBlueprint.findMany({ where: { isCurrent: true }, orderBy: { updatedAt: 'desc' }, take: 50, select: { code: true, version: true, name: true, origin: true, market: true, instruments: true, timeframe: true, completeness: true, state: true, labStage: true, robustnessScore: true, metrics: true, updatedAt: true } })
      return json({ ok: true, disclaimer: 'Research output under validation — lab metrics are estimates, never a guarantee of profitability, and nothing here is investment advice.', strategies: blueprints.map((b) => ({ ...b, metrics: b.metrics ? JSON.parse(b.metrics) : null })) })
    }
    if (path === 'knowledge/concepts' && method === 'GET') {
      const concepts = await prisma.knowledgeConcept.findMany({ orderBy: [{ sourceCount: 'desc' }, { updatedAt: 'desc' }], take: 100, select: { name: true, category: true, summary: true, instruments: true, timeframes: true, validationStatus: true, confidence: true, sourceCount: true } })
      return json({ ok: true, concepts })
    }
    if (path === 'knowledge/claims' && method === 'GET') {
      const claims = await prisma.knowledgeClaim.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { claimText: true, claimType: true, instrument: true, timeframe: true, regime: true, validationStatus: true, confidence: true, createdAt: true, source: { select: { title: true, url: true, sourceType: true, author: true } } } })
      return json({ ok: true, note: 'Every claim is attributed and starts untested — validation status and confidence reflect independent evidence only.', claims })
    }

    // ---- Market data (delayed research feeds) ----------------------------
    if (path.startsWith('market/') && method === 'GET') {
      const deny = needScope(auth, 'market_data'); if (deny) return deny
      if (path === 'market/board') return json({ ok: true, ...(await marketBoard()) })
      if (path === 'market/quotes') {
        const symbols = Array.from(new Set(s('symbols').split(',').map((x) => toTwelveData(x.trim()).symbol).filter(Boolean))).slice(0, 10)
        if (symbols.length === 0) return json({ error: 'symbols parameter required (comma-separated, max 10)' }, 400)
        return json({ ok: true, ...(await watchlistQuotes(symbols)) })
      }
      if (path === 'market/candles') {
        const symbol = toTwelveData(s('symbol').slice(0, 24)).symbol
        if (!symbol) return json({ error: 'symbol parameter required' }, 400)
        return json({ ok: true, ...(await timeSeries(symbol, s('interval', '1day'), parseInt(s('outputsize', '90'), 10))) })
      }
      if (path === 'market/correlation') {
        const a = toTwelveData(s('a').slice(0, 24)).symbol
        const b = toTwelveData(s('b').slice(0, 24)).symbol
        if (!a || !b) return json({ error: 'a and b symbol parameters required' }, 400)
        const days = parseInt(s('days', '365'), 10)
        return json({ ok: true, ...(await correlationPair(a, b, 180, Math.max(30, Math.min(730, days || 365)))) })
      }
      if (path === 'market/fx') return json({ ok: true, ...(await fxRates(s('base', 'USD').toUpperCase().slice(0, 3))) })
      if (path === 'market/crypto') return json({ ok: true, ...(await cryptoMarkets(25)) })
    }

    // ---- News & calendar --------------------------------------------------
    if (path === 'news' && method === 'GET') {
      const deny = needScope(auth, 'news'); if (deny) return deny
      const feed: any = await newsFeed(s('category', 'markets').slice(0, 20), 30)
      if (s('score') === '1' && process.env.ABACUSAI_API_KEY && (await flagEnabled('news_impact_scoring', true))) {
        const scored = await scoreHeadlines(feed?.data ?? []).catch(() => null)
        if (scored?.items) {
          const byIdx = new Map(scored.items.map((x: any) => [x.i, x]))
          return json({ ok: true, ...feed, data: (feed?.data ?? []).map((a: any, i: number) => ({ ...a, impact: byIdx.get(i) ?? null })), scoring: { model: scored.model, fetchedAt: scored.fetchedAt, label: 'model assessment' } })
        }
      }
      return json({ ok: true, ...feed })
    }
    if (path === 'calendar' && method === 'GET') { const d = needScope(auth, 'calendar'); if (d) return d; return json({ ok: true, ...(await economicCalendar()) }) }
    if (path === 'calendar/central-banks' && method === 'GET') { const d = needScope(auth, 'calendar'); if (d) return d; return json({ ok: true, ...(await centralBankMonitor()) }) }

    // ---- Research (AI) ----------------------------------------------------
    if (path === 'research/report' && method === 'GET') {
      const deny = needScope(auth, 'research'); if (deny) return deny
      if (!s('symbol')) return json({ error: 'symbol parameter required' }, 400)
      return json({ ok: true, ...(await instrumentReport(userId, auth.isAdmin, s('symbol').slice(0, 24))) })
    }
    if (path === 'research/brief' && method === 'GET') { const d = needScope(auth, 'research'); if (d) return d; return json({ ok: true, ...(await morningBrief(userId)) }) }

    // ---- Watchlist & alerts ----------------------------------------------
    if (path === 'watchlist' && method === 'GET') {
      const deny = needScope(auth, 'alerts'); if (deny) return deny
      const items = await prisma.watchlistItem.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
      return json({ ok: true, cap: WATCHLIST_SYMBOL_CAP, symbols: Array.from(new Set(items.map((i) => i.symbol))) })
    }
    if (path === 'watchlist' && method === 'POST') {
      const deny = needScope(auth, 'alerts'); if (deny) return deny
      const body = await req.json().catch(() => ({}))
      const resolved = toTwelveData(String(body?.symbol ?? '').trim().slice(0, 24))
      const symbol = resolved.symbol.toUpperCase()
      if (!symbol) return json({ error: 'symbol required' }, 400)
      const existing = new Set((await prisma.watchlistItem.findMany({ where: { userId }, select: { symbol: true } })).map((i) => i.symbol))
      if (!existing.has(symbol) && existing.size >= WATCHLIST_SYMBOL_CAP) return json({ error: `You track ${existing.size} symbols — the cap is ${WATCHLIST_SYMBOL_CAP} on the current data plan. Remove one first.` }, 409)
      const list = await defaultWatchlist(userId)
      const dup = await prisma.watchlistItem.findFirst({ where: { watchlistId: list.id, symbol } })
      if (!dup) await prisma.watchlistItem.create({ data: { userId, symbol, label: resolved.def?.name ?? null, watchlistId: list.id } })
      return json({ ok: true, symbol, known: resolved.known, proxy: resolved.proxy })
    }
    if (segments[0] === 'watchlist' && segments.length === 2 && method === 'DELETE') {
      const deny = needScope(auth, 'alerts'); if (deny) return deny
      const symbol = toTwelveData(decodeURIComponent(segments[1])).symbol.toUpperCase()
      const r = await prisma.watchlistItem.deleteMany({ where: { userId, symbol } })
      return json({ ok: true, removed: r.count })
    }
    if (path === 'alerts' && method === 'GET') {
      const deny = needScope(auth, 'alerts'); if (deny) return deny
      const alerts = await prisma.priceAlert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 })
      return json({ ok: true, note: 'Alerts evaluate against delayed research quotes (~5 min cache) whenever the account polls — research signals, never execution triggers.', alerts })
    }
    if (path === 'alerts' && method === 'POST') {
      const deny = needScope(auth, 'alerts'); if (deny) return deny
      const body = await req.json().catch(() => ({}))
      const resolved = toTwelveData(String(body?.symbol ?? '').trim().slice(0, 24))
      const symbol = resolved.symbol.toUpperCase()
      const condition = body?.condition === 'below' ? 'below' : body?.condition === 'above' ? 'above' : null
      const threshold = Number(body?.threshold)
      if (!symbol || !condition || !isFinite(threshold) || threshold <= 0) return json({ error: 'symbol, condition (above|below) and a positive threshold are required' }, 400)
      const active = await prisma.priceAlert.count({ where: { userId, status: 'active' } })
      if (active >= 20) return json({ error: 'Alert cap reached (20 active). Delete one first.' }, 409)
      const existing = new Set((await prisma.watchlistItem.findMany({ where: { userId }, select: { symbol: true } })).map((i) => i.symbol))
      if (!existing.has(symbol)) {
        if (existing.size >= WATCHLIST_SYMBOL_CAP) return json({ error: `Alerts evaluate on watchlist symbols and you track ${existing.size} (cap ${WATCHLIST_SYMBOL_CAP}). Remove one first.` }, 409)
        const list = await defaultWatchlist(userId)
        await prisma.watchlistItem.create({ data: { userId, symbol, label: resolved.def?.name ?? null, watchlistId: list.id } }).catch(() => {})
      }
      const alert = await prisma.priceAlert.create({ data: { userId, symbol, condition, threshold, note: String(body?.note ?? '').slice(0, 200) || null } })
      return json({ ok: true, alert })
    }
    if (segments[0] === 'alerts' && segments.length === 2 && method === 'DELETE') {
      const deny = needScope(auth, 'alerts'); if (deny) return deny
      const r = await prisma.priceAlert.deleteMany({ where: { userId, id: segments[1] } })
      return r.count ? json({ ok: true }) : json({ error: 'Alert not found' }, 404)
    }
    if (path === 'notifications' && method === 'GET') {
      const deny = needScope(auth, 'alerts'); if (deny) return deny
      const notifications = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 })
      return json({ ok: true, notifications })
    }

    // ---- Journal ----------------------------------------------------------
    if (path === 'journal' && method === 'GET') {
      const deny = needScope(auth, 'journal'); if (deny) return deny
      const entries = await prisma.journalEntry.findMany({ where: { userId }, orderBy: { tradedAt: 'desc' }, take: Math.min(500, parseInt(s('limit', '100'), 10) || 100) })
      return json({ ok: true, entries })
    }
    if (path === 'journal' && method === 'POST') {
      const deny = needScope(auth, 'journal'); if (deny) return deny
      const body = await req.json().catch(() => ({}))
      const symbol = String(body?.symbol ?? '').trim().toUpperCase().slice(0, 24)
      if (!symbol) return json({ error: 'symbol required' }, 400)
      const entry = await prisma.journalEntry.create({
        data: {
          userId, sourceType: 'manual', symbol,
          side: body?.side === 'sell' || body?.side === 'short' ? 'sell' : body?.side === 'buy' || body?.side === 'long' ? 'buy' : null,
          qty: numOrNull(body?.qty), entryPrice: numOrNull(body?.entryPrice), exitPrice: numOrNull(body?.exitPrice), pnl: numOrNull(body?.pnl),
          notes: String(body?.notes ?? '').slice(0, 4000), tags: Array.isArray(body?.tags) ? body.tags.join(',').slice(0, 400) : String(body?.tags ?? '').slice(0, 400) || null,
          setup: String(body?.setup ?? '').slice(0, 400) || null, tradedAt: body?.tradedAt && !isNaN(Date.parse(body.tradedAt)) ? new Date(body.tradedAt) : new Date(),
        },
      })
      emitEvent(userId, 'journal.created', { id: entry.id, symbol: entry.symbol, side: entry.side, pnl: entry.pnl, tradedAt: entry.tradedAt, via: 'api' }).catch(() => {})
      return json({ ok: true, entry })
    }

    // ---- Portfolio --------------------------------------------------------
    if (path === 'portfolio' && method === 'GET') {
      const deny = needScope(auth, 'portfolio'); if (deny) return deny
      return json({ ok: true, ...(await consolidatedPortfolio(userId, auth.isAdmin, s('refresh') === '1')) })
    }

    if (path === 'bridge' && method === 'GET') {
      const deny = needScope(auth, 'portfolio'); if (deny) return deny
      const conns = await prisma.bridgeConnection.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { positions: true, signals: { orderBy: { receivedAt: 'desc' }, take: 20 } } })
      return json({ ok: true, label: 'Mirrored platform accounts — the trader\'s real numbers, read-only', connections: conns.map((c) => ({ id: c.id, kind: c.kind, label: c.label, mode: c.mode, status: c.status, accountNumber: c.accountNumber, broker: c.broker, currency: c.currency, balance: c.balance, equity: c.equity, margin: c.margin, freeMargin: c.freeMargin, floatingPnl: c.floatingPnl, lastHeartbeatAt: c.lastHeartbeatAt, positions: c.positions, signals: c.signals })) })
    }

    // ---- Paper trading (sandbox venues only) ------------------------------
    if (segments[0] === 'paper') {
      const deny = needScope(auth, 'paper_trade'); if (deny) return deny
      if (auth.limits.sandboxOnly && auth.planKey === 'trial' && method !== 'GET') return json({ error: 'Trial plans can read paper venues but not place orders through the API. Upgrade to Starter or place paper orders from the EMIL Paper Trading Desk.' }, 403)
      if (!(await flagEnabled('paper_trading_desk', true))) return json({ error: 'The trading desk is switched off by the administrator.' }, 403)
      if (path === 'paper/venues' && method === 'GET') {
        const venues = (await listExecutionVenues(userId, false)).filter((v: any) => isPaperVenue(v.key))
        return json({ ok: true, note: 'The Platform API reaches PAPER venues only. Live execution is never exposed programmatically.', venues })
      }
      if (path === 'paper/orders' && method === 'GET') {
        const venue = s('venue')
        const orders = await prisma.venueOrder.findMany({ where: { userId, paper: true, ...(venue ? { providerKey: venue } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 })
        return json({ ok: true, orders })
      }
      if (path === 'paper/orders' && method === 'POST') {
        const body = await req.json().catch(() => ({}))
        const venueKey = String(body?.venue ?? '')
        if (!isPaperVenue(venueKey)) return json({ error: `"${venueKey}" is not a paper venue. GET /api/v1/paper/venues lists what you can use.` }, 400)
        const result = await placeGuarded({ userId, isAdmin: false, venueKey, req: { symbol: String(body?.symbol ?? '').trim(), side: body?.side, type: body?.orderType, qty: Number(body?.qty), price: body?.price !== undefined && body?.price !== '' && body?.price !== null ? Number(body.price) : undefined, reduceOnly: !!body?.reduceOnly } })
        emitEvent(userId, 'paper.order.placed', { venue: venueKey, order: result.order, recordId: result.record?.id ?? null, via: 'api' }).catch(() => {})
        return json({ ok: true, paper: true, order: result.order, record: result.record })
      }
      if (segments[1] === 'orders' && segments.length === 3 && method === 'DELETE') {
        const venueKey = s('venue')
        if (!isPaperVenue(venueKey)) return json({ error: 'venue query parameter must be a paper venue' }, 400)
        await cancelGuarded({ userId, isAdmin: false, venueKey, orderId: decodeURIComponent(segments[2]), symbol: s('symbol') || undefined })
        emitEvent(userId, 'paper.order.cancelled', { venue: venueKey, orderId: segments[2], via: 'api' }).catch(() => {})
        return json({ ok: true })
      }
    }

    // ---- Broker links -----------------------------------------------------
    if (path === 'broker-connections' && method === 'GET') {
      const deny = needScope(auth, 'broker_link'); if (deny) return deny
      const links = await prisma.userBrokerConnection.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } })
      return json({ ok: true, connections: links.map((l) => ({ providerKey: l.providerKey, status: l.status, lastCheckedAt: l.lastCheckedAt, lastError: l.lastError, apiKey: mask(decryptSecret(l.apiKey)), hasApiSecret: !!l.apiSecret, hasAccessToken: !!l.accessToken, clientCode: decryptSecret(l.clientCode), permissionTier: l.permissionTier ?? null })) })
    }
    if (path === 'broker-connections' && method === 'POST') {
      const deny = needScope(auth, 'broker_link'); if (deny) return deny
      if (auth.environment === 'sandbox') return json({ error: 'Sandbox keys cannot link broker accounts. Use a live key with the broker_link scope.' }, 403)
      const body = await req.json().catch(() => ({}))
      const providerKey = String(body?.providerKey ?? '').trim()
      const provider = providerKey ? await prisma.indiaApiProvider.findUnique({ where: { key: providerKey } }) : null
      if (!provider) return json({ error: `Unknown providerKey "${providerKey}". GET /api/v1/broker-connections lists yours; the provider catalog is in the app's Markets & API Hub.` }, 400)
      const data: any = {}
      for (const f of ['apiKey', 'apiSecret', 'accessToken', 'clientCode'] as const) if (typeof body?.[f] === 'string' && body[f].trim() !== '') data[f] = body[f].trim()
      if (Object.keys(data).length === 0) return json({ error: 'Provide at least one credential field: apiKey, apiSecret, accessToken, clientCode.' }, 400)
      const link = await prisma.userBrokerConnection.upsert({ where: { userId_providerKey: { userId, providerKey } }, update: { ...encryptFields(data), status: 'configured', lastError: null }, create: { userId, providerKey, ...encryptFields(data) } })
      const result = await testProviderConnection({ key: providerKey, baseUrl: provider.baseUrl, apiKey: decryptSecret(link.apiKey), apiSecret: decryptSecret(link.apiSecret), accessToken: decryptSecret(link.accessToken), clientCode: decryptSecret(link.clientCode) })
      await prisma.userBrokerConnection.update({ where: { id: link.id }, data: { status: result.ok ? 'connected' : 'error', lastCheckedAt: new Date(), lastError: result.ok ? null : result.message } })
      await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'BROKER LINKED VIA API', category: 'platform_api', detail: `${auth.email} linked ${provider.name} via the Platform API — ${result.ok ? 'CONNECTED' : `FAILED: ${result.message}`}` } })
      return json({ ok: result.ok, providerKey, status: result.ok ? 'connected' : 'error', message: result.message })
    }

    // ---- Webhooks ---------------------------------------------------------
    if (segments[0] === 'webhooks') {
      const deny = needScope(auth, 'webhooks'); if (deny) return deny
      if (path === 'webhooks/events' && method === 'GET') return json({ ok: true, events: WEBHOOK_EVENTS, signature: 'X-EMIL-Signature: t=<unix>,v1=<hex hmac-sha256(secret, "<t>.<raw body>")>' })
      if (path === 'webhooks' && method === 'GET') {
        const eps = await prisma.webhookEndpoint.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
        return json({ ok: true, webhooks: eps.map((e) => ({ id: e.id, url: e.url, events: e.events.split(','), description: e.description, status: e.status, failCount: e.failCount, lastDeliveryAt: e.lastDeliveryAt, lastStatusCode: e.lastStatusCode, createdAt: e.createdAt })) })
      }
      if (path === 'webhooks' && method === 'POST') {
        const count = await prisma.webhookEndpoint.count({ where: { userId } })
        if (count >= auth.limits.maxWebhooks) return json({ error: `Your ${auth.limits.label} plan allows ${auth.limits.maxWebhooks} webhook endpoints.` }, 403)
        const body = await req.json().catch(() => ({}))
        const bad = validateWebhookUrl(String(body?.url ?? ''))
        if (bad) return json({ error: bad }, 400)
        const events = (Array.isArray(body?.events) ? body.events : ['*']).map((x: any) => String(x).trim()).filter((x: string) => x === '*' || x in WEBHOOK_EVENTS)
        const { endpoint, secret } = await createEndpoint(userId, String(body.url).trim(), events, body?.description)
        return json({ ok: true, id: endpoint.id, secret, note: 'Store the secret now — it is not shown again.' }, 201)
      }
      const ep = segments[1] ? await prisma.webhookEndpoint.findFirst({ where: { id: segments[1], userId } }) : null
      if (!ep) return json({ error: 'Endpoint not found' }, 404)
      if (segments.length === 2 && method === 'DELETE') { await prisma.webhookEndpoint.delete({ where: { id: ep.id } }); return json({ ok: true }) }
      if (segments[2] === 'test' && method === 'POST') {
        const payload = JSON.stringify({ id: `evt_test_${Date.now()}`, event: 'test.ping', createdAt: new Date().toISOString(), data: { message: 'Hello from EMIL — your endpoint is wired.', account: auth.email } })
        await prisma.webhookDelivery.create({ data: { endpointId: ep.id, userId, event: 'test.ping', payload } })
        await dispatchDue(5)
        const last = await prisma.webhookDelivery.findFirst({ where: { endpointId: ep.id, event: 'test.ping' }, orderBy: { createdAt: 'desc' } })
        return json({ ok: last?.status === 'delivered', delivery: last })
      }
      if (segments[2] === 'deliveries' && method === 'GET') {
        const deliveries = await prisma.webhookDelivery.findMany({ where: { endpointId: ep.id }, orderBy: { createdAt: 'desc' }, take: 100 })
        return json({ ok: true, deliveries })
      }
    }

    // ---- Bring-your-own data (customer feed) ------------------------------
    if (segments[0] === 'ingest') {
      const deny = needScope(auth, 'ingest'); if (deny) return deny
      if (path === 'ingest/summary' && method === 'GET') {
        const [q, o, p, latestQ, latestP] = await Promise.all([
          prisma.customerFeedQuote.count({ where: { userId } }),
          prisma.customerFeedOrder.count({ where: { userId } }),
          prisma.customerFeedPnl.count({ where: { userId } }),
          prisma.customerFeedQuote.findMany({ where: { userId }, orderBy: { ts: 'desc' }, take: 50, distinct: ['symbol'] }),
          prisma.customerFeedPnl.findFirst({ where: { userId }, orderBy: { ts: 'desc' } }),
        ])
        return json({ ok: true, label: 'CUSTOMER FEED — your own pushed data, isolated to your account, never mixed with EMIL research feeds', counts: { quotes: q, orders: o, pnl: p }, latestQuotes: latestQ, latestPnl: latestP })
      }
      if (method !== 'POST') return json({ error: 'POST rows to ingest/quotes, ingest/orders or ingest/pnl' }, 405)
      const body = await req.json().catch(() => ({}))
      const rows: any[] = Array.isArray(body?.rows) ? body.rows.slice(0, 1000) : []
      if (rows.length === 0) return json({ error: 'rows[] required (max 1000 per request)' }, 400)
      const day = new Date().toISOString().slice(0, 10)
      const usedToday = await prisma.$queryRaw<{ n: bigint }[]>`select coalesce(sum(count),0)::bigint as n from api_usage where "userId" = ${userId} and day = ${day} and endpoint like 'POST /ingest/%'`.then((r) => Number(r?.[0]?.n ?? 0)).catch(() => 0)
      if (usedToday * 100 > auth.limits.maxIngestRowsPerDay) return json({ error: `Daily ingest budget reached for the ${auth.limits.label} plan.` }, 429)
      const ts = (v: any) => (v && !isNaN(Date.parse(v)) ? new Date(v) : new Date())
      let accepted = 0
      if (path === 'ingest/quotes') {
        const data = rows.filter((r) => r?.symbol).map((r) => ({ userId, symbol: String(r.symbol).toUpperCase().slice(0, 24), bid: numOrNull(r.bid), ask: numOrNull(r.ask), last: numOrNull(r.last), ts: ts(r.ts) }))
        accepted = (await prisma.customerFeedQuote.createMany({ data })).count
      } else if (path === 'ingest/orders') {
        for (const r of rows) {
          if (!r?.externalId || !r?.symbol || !r?.side || !isFinite(Number(r?.qty))) continue
          await prisma.customerFeedOrder.upsert({
            where: { userId_externalId: { userId, externalId: String(r.externalId).slice(0, 80) } },
            update: { status: String(r.status ?? 'filled').slice(0, 20), price: numOrNull(r.price), qty: Number(r.qty), ts: ts(r.ts) },
            create: { userId, externalId: String(r.externalId).slice(0, 80), symbol: String(r.symbol).toUpperCase().slice(0, 24), side: String(r.side).toLowerCase() === 'sell' ? 'sell' : 'buy', qty: Number(r.qty), price: numOrNull(r.price), status: String(r.status ?? 'filled').slice(0, 20), account: r.account ? String(r.account).slice(0, 60) : null, ts: ts(r.ts) },
          })
          accepted += 1
        }
      } else if (path === 'ingest/pnl') {
        const data = rows.map((r) => ({ userId, account: r?.account ? String(r.account).slice(0, 60) : null, equity: numOrNull(r?.equity), balance: numOrNull(r?.balance), realized: numOrNull(r?.realized), unrealized: numOrNull(r?.unrealized), ts: ts(r?.ts) })).filter((r) => r.equity !== null || r.balance !== null || r.realized !== null || r.unrealized !== null)
        accepted = (await prisma.customerFeedPnl.createMany({ data })).count
      } else {
        return json({ error: 'Unknown ingest endpoint' }, 404)
      }
      emitEvent(userId, 'ingest.received', { endpoint: path, accepted, received: rows.length }).catch(() => {})
      return json({ ok: true, accepted, received: rows.length, label: 'CUSTOMER FEED' }, 202)
    }

    // ---- Streaming --------------------------------------------------------
    if (path === 'stream' && method === 'GET') {
      const deny = needScope(auth, 'stream'); if (deny) return deny
      if (!auth.limits.streaming) return json({ error: `Streaming is available on Pro and Institutional plans (current: ${auth.limits.label}).` }, 403)
      const symbols = Array.from(new Set(s('symbols').split(',').map((x) => toTwelveData(x.trim()).symbol).filter(Boolean))).slice(0, 5)
      return sse(auth, symbols)
    }

    return json({ error: `Unknown endpoint ${method} /api/v1/${path}. See /api/v1/openapi.json.` }, 404)
  } catch (e: any) {
    if (e instanceof ExecError) return json({ error: e.message }, e.status)
    if (e?.rateLimited) return json({ error: 'market_data_budget', message: e.message, retryAfterSec: e.retryAfterSec ?? 30 }, 429, { 'Retry-After': String(Math.max(2, Math.round(e.retryAfterSec ?? 30))) })
    console.error('platform api error', e)
    return json({ error: e?.message ?? 'Internal error' }, 500)
  }
}

export async function GET(req: Request, ctx: { params: { path?: string[] } }) { return handle(req, ctx.params) }
export async function POST(req: Request, ctx: { params: { path?: string[] } }) { return handle(req, ctx.params) }
export async function DELETE(req: Request, ctx: { params: { path?: string[] } }) { return handle(req, ctx.params) }

// keep the encrypt helper referenced for tree-shaking safety in some bundlers
void encryptSecret
