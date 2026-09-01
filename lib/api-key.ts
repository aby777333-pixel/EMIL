// EMIL customer API keys — how external systems authenticate against the
// public /api/v1 platform API. The full key is shown ONCE at issue time;
// only a SHA-256 hash and a display prefix are stored.

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'

export const API_KEY_PREFIX = 'emil_live_'

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `${API_KEY_PREFIX}${randomBytes(24).toString('hex')}`
  return { key, prefix: key.slice(0, API_KEY_PREFIX.length + 6), hash: hashApiKey(key) }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export type ApiAuthResult =
  | { ok: true; userId: string; email: string; planKey: string; keyId: string }
  | { ok: false; status: number; error: string }

// Authenticate a public-API request via `x-api-key` or `Authorization: Bearer`.
export async function authenticateApiKey(req: Request): Promise<ApiAuthResult> {
  const headerKey = req.headers.get('x-api-key') ?? (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!headerKey || !headerKey.startsWith(API_KEY_PREFIX)) {
    return { ok: false, status: 401, error: 'Missing API key. Send it as an "x-api-key" header or "Authorization: Bearer <key>".' }
  }
  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(headerKey) },
    include: { user: { include: { profile: true } } },
  })
  if (!record || record.status !== 'active') {
    return { ok: false, status: 401, error: 'Invalid or revoked API key.' }
  }
  const profileStatus = record.user.profile?.status ?? 'trial'
  if (profileStatus === 'suspended' || profileStatus === 'churned') {
    return { ok: false, status: 403, error: `Account is ${profileStatus}. Contact support to restore access.` }
  }
  // Best-effort usage stamp — never blocks the request.
  prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
  return { ok: true, userId: record.userId, email: record.user.email, planKey: record.user.profile?.planKey ?? 'trial', keyId: record.id }
}
