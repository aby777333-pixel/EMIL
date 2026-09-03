import { decryptSecret, encryptFields } from '@/lib/secrets'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateApiKey } from '@/lib/api-key'
import { testProviderConnection } from '@/lib/india/adapter'

export const dynamic = 'force-dynamic'

// EMIL Platform API v1 — the public REST surface customers integrate against.
// Auth: an EMIL API key (issued from the Command Center CRM) via the
// `x-api-key` header or `Authorization: Bearer emil_live_…`.
//
//   GET  /api/v1/ping                      → key + account check
//   GET  /api/v1/me                        → account, plan, key info
//   GET  /api/v1/state                     → EMIL system state (read-only)
//   GET  /api/v1/strategies                → current strategy blueprints (yours to review — research output, not advice)
//   GET  /api/v1/knowledge/concepts        → knowledge-graph concepts
//   GET  /api/v1/knowledge/claims          → recent attributed claims
//   GET  /api/v1/broker-connections        → the caller's linked broker accounts (masked)
//   POST /api/v1/broker-connections        → link/update a broker: { providerKey, apiKey?, apiSecret?, accessToken?, clientCode? }
//
// This API is read/link only — it never places orders.

const mask = (v?: string | null) => (v ? `${v.slice(0, 3)}••••${v.slice(-2)}` : null)

const json = (body: any, status = 200) => NextResponse.json(body, { status })

async function handle(req: Request, params: { path?: string[] }) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)
  const path = (params.path ?? []).join('/')
  const method = req.method

  try {
    if (path === 'ping' && method === 'GET') {
      return json({ ok: true, service: 'EMIL Platform API', version: 'v1', account: auth.email, plan: auth.planKey })
    }

    if (path === 'me' && method === 'GET') {
      const profile = await prisma.customerProfile.findUnique({ where: { userId: auth.userId } })
      const plan = profile ? await prisma.billingPlan.findUnique({ where: { key: profile.planKey } }) : null
      return json({
        ok: true,
        account: { email: auth.email, status: profile?.status ?? 'trial', plan: plan ? { key: plan.key, name: plan.name, priceMonthly: plan.priceMonthly } : { key: 'trial' }, trialEndsAt: profile?.trialEndsAt ?? null },
      })
    }

    if (path === 'state' && method === 'GET') {
      const state = await prisma.emilState.findFirst()
      return json({
        ok: true,
        state: state ? {
          armed: state.armed, mode: state.mode, guardianStatus: state.guardianStatus,
          trustScore: state.trustScore, agentConsensus: state.agentConsensus,
          volatilityStatus: state.volatilityStatus, marketDataHealth: state.marketDataHealth,
          updatedAt: state.updatedAt,
        } : null,
      })
    }

    if (path === 'strategies' && method === 'GET') {
      const blueprints = await prisma.strategyBlueprint.findMany({
        where: { isCurrent: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          code: true, version: true, name: true, origin: true, market: true, instruments: true,
          timeframe: true, completeness: true, state: true, labStage: true, robustnessScore: true, metrics: true, updatedAt: true,
        },
      })
      return json({
        ok: true,
        disclaimer: 'Research output under validation — lab metrics are estimates, never a guarantee of profitability, and nothing here is investment advice.',
        strategies: blueprints.map((b) => ({ ...b, metrics: b.metrics ? JSON.parse(b.metrics) : null })),
      })
    }

    if (path === 'knowledge/concepts' && method === 'GET') {
      const concepts = await prisma.knowledgeConcept.findMany({
        orderBy: [{ sourceCount: 'desc' }, { updatedAt: 'desc' }],
        take: 100,
        select: { name: true, category: true, summary: true, instruments: true, timeframes: true, validationStatus: true, confidence: true, sourceCount: true },
      })
      return json({ ok: true, concepts })
    }

    if (path === 'knowledge/claims' && method === 'GET') {
      const claims = await prisma.knowledgeClaim.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          claimText: true, claimType: true, instrument: true, timeframe: true, regime: true,
          validationStatus: true, confidence: true, createdAt: true,
          source: { select: { title: true, url: true, sourceType: true, author: true } },
        },
      })
      return json({ ok: true, note: 'Every claim is attributed and starts untested — validation status and confidence reflect independent evidence only.', claims })
    }

    if (path === 'broker-connections' && method === 'GET') {
      const links = await prisma.userBrokerConnection.findMany({ where: { userId: auth.userId }, orderBy: { updatedAt: 'desc' } })
      return json({
        ok: true,
        connections: links.map((l) => ({
          providerKey: l.providerKey, status: l.status, lastCheckedAt: l.lastCheckedAt, lastError: l.lastError,
          apiKey: mask(decryptSecret(l.apiKey)), hasApiSecret: !!l.apiSecret, hasAccessToken: !!l.accessToken, clientCode: decryptSecret(l.clientCode), permissionTier: l.permissionTier ?? null,
        })),
      })
    }

    if (path === 'broker-connections' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const providerKey = String(body?.providerKey ?? '').trim()
      const provider = providerKey ? await prisma.indiaApiProvider.findUnique({ where: { key: providerKey } }) : null
      if (!provider) return json({ error: `Unknown providerKey "${providerKey}". GET /api/v1/broker-connections lists yours; the provider catalog is in the app's Markets & API Hub.` }, 400)
      const data: any = {}
      for (const f of ['apiKey', 'apiSecret', 'accessToken', 'clientCode'] as const) {
        if (typeof body?.[f] === 'string' && body[f].trim() !== '') data[f] = body[f].trim()
      }
      if (Object.keys(data).length === 0) return json({ error: 'Provide at least one credential field: apiKey, apiSecret, accessToken, clientCode.' }, 400)
      const link = await prisma.userBrokerConnection.upsert({
        where: { userId_providerKey: { userId: auth.userId, providerKey } },
        update: { ...encryptFields(data), status: 'configured', lastError: null },
        create: { userId: auth.userId, providerKey, ...encryptFields(data) },
      })
      // Verify with a lightweight read against the broker where supported.
      const result = await testProviderConnection({ key: providerKey, baseUrl: provider.baseUrl, apiKey: decryptSecret(link.apiKey), apiSecret: decryptSecret(link.apiSecret), accessToken: decryptSecret(link.accessToken), clientCode: decryptSecret(link.clientCode) })
      await prisma.userBrokerConnection.update({
        where: { id: link.id },
        data: { status: result.ok ? 'connected' : 'error', lastCheckedAt: new Date(), lastError: result.ok ? null : result.message },
      })
      await prisma.auditLog.create({
        data: { userId: auth.userId, actor: 'user', action: 'BROKER LINKED VIA API', category: 'platform_api', detail: `${auth.email} linked ${provider.name} via the Platform API — ${result.ok ? 'CONNECTED' : `FAILED: ${result.message}`}` },
      })
      return json({ ok: result.ok, providerKey, status: result.ok ? 'connected' : 'error', message: result.message })
    }

    return json({ error: `Unknown endpoint ${method} /api/v1/${path}. Available: ping, me, state, strategies, knowledge/concepts, knowledge/claims, broker-connections.` }, 404)
  } catch (e) {
    console.error('platform api error', e)
    return json({ error: 'Internal error' }, 500)
  }
}

export async function GET(req: Request, ctx: { params: { path?: string[] } }) {
  return handle(req, ctx.params)
}

export async function POST(req: Request, ctx: { params: { path?: string[] } }) {
  return handle(req, ctx.params)
}
