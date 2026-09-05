// EMIL customer API keys — how external systems authenticate against the
// public /api/v1 platform API. The full key is shown ONCE at issue time;
// only a SHA-256 hash and a display prefix are stored.
//
// Platform round A: live vs sandbox keys, scopes, IP allow-lists, expiry,
// per-plan rate limits and per-endpoint usage metering.

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { parseScopes, planLimits, type PlanLimits, type Scope } from '@/lib/entitlements'

export const API_KEY_PREFIX = 'emil_live_'
export const SANDBOX_KEY_PREFIX = 'emil_test_'

export type KeyEnvironment = 'live' | 'sandbox'

export function generateApiKey(environment: KeyEnvironment = 'live'): { key: string; prefix: string; hash: string } {
  const p = environment === 'sandbox' ? SANDBOX_KEY_PREFIX : API_KEY_PREFIX
  const key = `${p}${randomBytes(24).toString('hex')}`
  return { key, prefix: key.slice(0, p.length + 6), hash: hashApiKey(key) }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export type ApiAuthResult =
  | { ok: true; userId: string; email: string; planKey: string; keyId: string; environment: KeyEnvironment; scopes: Scope[]; limits: PlanLimits; isAdmin: boolean }
  | { ok: false; status: number; error: string; retryAfterSec?: number }

function ipAllowed(ip: string, csv: string | null | undefined): boolean {
  const entries = String(csv ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (entries.length === 0) return true
  return entries.some((e) => ip === e || ((e.endsWith('.') || e.endsWith(':') || e.endsWith('/')) && ip.startsWith(e.replace(/\/$/, ''))))
}

// Authenticate a public-API request via `x-api-key` or `Authorization: Bearer`.
export async function authenticateApiKey(req: Request): Promise<ApiAuthResult> {
  const headerKey = req.headers.get('x-api-key') ?? (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!headerKey || !(headerKey.startsWith(API_KEY_PREFIX) || headerKey.startsWith(SANDBOX_KEY_PREFIX))) {
    return { ok: false, status: 401, error: 'Missing API key. Send it as an "x-api-key" header or "Authorization: Bearer <key>".' }
  }
  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(headerKey) },
    include: { user: { include: { profile: true } } },
  })
  if (!record || record.status !== 'active') {
    return { ok: false, status: 401, error: 'Invalid or revoked API key.' }
  }
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 401, error: `This API key expired on ${record.expiresAt.toISOString().slice(0, 10)}. Issue a new one in EMIL → Developers.` }
  }
  const ip = clientIp(req)
  if (!ipAllowed(ip, record.ipAllowlist)) {
    return { ok: false, status: 403, error: `This API key is restricted to an IP allow-list; request came from ${ip}.` }
  }
  const profileStatus = record.user.profile?.status ?? 'trial'
  if (profileStatus === 'suspended' || profileStatus === 'churned') {
    return { ok: false, status: 403, error: `Account is ${profileStatus}. Contact support to restore access.` }
  }
  const isAdmin = record.user.role === 'admin'
  const planKey = record.user.profile?.planKey ?? 'trial'
  const limits = planLimits(planKey, isAdmin)
  const [perMin, perDay] = await Promise.all([
    rateLimit(`apikey:min:${record.id}`, limits.apiPerMinute, 60),
    rateLimit(`apikey:day:${record.userId}`, limits.apiPerDay, 86_400),
  ])
  if (!perMin.allowed || !perDay.allowed) {
    const which = !perMin.allowed ? `${limits.apiPerMinute} requests/minute` : `${limits.apiPerDay.toLocaleString()} requests/day`
    const retryAfterSec = !perMin.allowed ? perMin.retryAfterSec : perDay.retryAfterSec
    return { ok: false, status: 429, error: `Plan quota reached (${limits.label}: ${which}). Retry in ${retryAfterSec}s or upgrade the plan.`, retryAfterSec }
  }
  // Best-effort usage stamp — never blocks the request.
  prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
  return {
    ok: true, userId: record.userId, email: record.user.email, planKey, keyId: record.id, isAdmin,
    environment: record.environment === 'sandbox' || headerKey.startsWith(SANDBOX_KEY_PREFIX) ? 'sandbox' : 'live',
    scopes: parseScopes(record.scopes), limits,
  }
}

export function hasScope(auth: Extract<ApiAuthResult, { ok: true }>, scope: Scope): boolean {
  return auth.isAdmin || auth.scopes.includes(scope)
}

// Per-key, per-day, per-endpoint metering (api_usage). Fire-and-forget.
export function recordApiUsage(keyId: string, userId: string, endpoint: string) {
  const day = new Date().toISOString().slice(0, 10)
  const id = `${keyId}:${day}:${endpoint}`.slice(0, 190)
  prisma.$executeRaw`
    insert into api_usage (id, "keyId", "userId", day, endpoint, count, "lastAt")
    values (${id}, ${keyId}, ${userId}, ${day}, ${endpoint}, 1, now())
    on conflict ("keyId", day, endpoint) do update set count = api_usage.count + 1, "lastAt" = now()`
    .catch(() => {})
}
