// "Connect with EMIL" (round E): OAuth 2.0 authorization-code flow with
// refresh tokens. Third-party apps act on a customer's behalf with scoped
// access tokens (emil_at_…) that the /api/v1 surface accepts as Bearer.
// Secrets and tokens are stored hashed; plain values are returned once.

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { parseScopes } from '@/lib/entitlements'

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
export const ACCESS_TTL_SEC = 3600
export const REFRESH_TTL_SEC = 30 * 86400
export const CODE_TTL_SEC = 600

export function newClientCredentials() {
  const clientId = `emil_client_${randomBytes(8).toString('hex')}`
  const secret = `emil_secret_${randomBytes(24).toString('hex')}`
  return { clientId, secret, secretHash: sha(secret) }
}

export async function findClient(clientId: string) {
  return prisma.oAuthClient.findUnique({ where: { clientId } })
}

export function redirectAllowed(client: { redirectUris: string }, uri: string) {
  return client.redirectUris.split(',').map((s) => s.trim()).filter(Boolean).includes(uri)
}

export async function issueCode(clientDbId: string, userId: string, scopes: string[]) {
  const code = `emil_code_${randomBytes(24).toString('hex')}`
  await prisma.oAuthGrant.create({ data: { clientId: clientDbId, userId, scopes: scopes.join(','), codeHash: sha(code), codeExpiresAt: new Date(Date.now() + CODE_TTL_SEC * 1000) } })
  return code
}

async function issueTokens(grantId: string) {
  const access = `emil_at_${randomBytes(24).toString('hex')}`
  const refresh = `emil_rt_${randomBytes(24).toString('hex')}`
  await prisma.oAuthGrant.update({ where: { id: grantId }, data: { codeHash: null, codeExpiresAt: null, accessTokenHash: sha(access), accessExpiresAt: new Date(Date.now() + ACCESS_TTL_SEC * 1000), refreshTokenHash: sha(refresh) } })
  return { access, refresh }
}

export async function exchangeCode(code: string, clientId: string, clientSecret: string, redirectUri: string) {
  const client = await findClient(clientId)
  if (!client || client.status !== 'active' || client.clientSecretHash !== sha(clientSecret)) return { error: 'invalid_client' }
  if (!redirectAllowed(client, redirectUri)) return { error: 'invalid_grant', description: 'redirect_uri mismatch' }
  const grant = await prisma.oAuthGrant.findUnique({ where: { codeHash: sha(code) } })
  if (!grant || grant.clientId !== client.id || !grant.codeExpiresAt || grant.codeExpiresAt < new Date() || grant.revokedAt) return { error: 'invalid_grant' }
  const t = await issueTokens(grant.id)
  return { access_token: t.access, refresh_token: t.refresh, token_type: 'Bearer', expires_in: ACCESS_TTL_SEC, scope: grant.scopes.replace(/,/g, ' ') }
}

export async function refreshTokens(refreshToken: string, clientId: string, clientSecret: string) {
  const client = await findClient(clientId)
  if (!client || client.status !== 'active' || client.clientSecretHash !== sha(clientSecret)) return { error: 'invalid_client' }
  const grant = await prisma.oAuthGrant.findUnique({ where: { refreshTokenHash: sha(refreshToken) } })
  if (!grant || grant.clientId !== client.id || grant.revokedAt) return { error: 'invalid_grant' }
  if (Date.now() - grant.updatedAt.getTime() > REFRESH_TTL_SEC * 1000) return { error: 'invalid_grant', description: 'refresh token expired' }
  const t = await issueTokens(grant.id)
  return { access_token: t.access, refresh_token: t.refresh, token_type: 'Bearer', expires_in: ACCESS_TTL_SEC, scope: grant.scopes.replace(/,/g, ' ') }
}

export async function revokeToken(token: string) {
  const h = sha(token)
  const grant = await prisma.oAuthGrant.findFirst({ where: { OR: [{ accessTokenHash: h }, { refreshTokenHash: h }] } })
  if (grant) await prisma.oAuthGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date(), accessTokenHash: null, refreshTokenHash: null } })
  return !!grant
}

// Resolve a Bearer access token into { userId, scopes, grantId, clientName }.
export async function authenticateAccessToken(token: string) {
  if (!token.startsWith('emil_at_')) return null
  const grant = await prisma.oAuthGrant.findUnique({ where: { accessTokenHash: sha(token) }, include: { client: true } })
  if (!grant || grant.revokedAt || !grant.accessExpiresAt || grant.accessExpiresAt < new Date() || grant.client.status !== 'active') return null
  return { userId: grant.userId, scopes: parseScopes(grant.scopes), grantId: grant.id, clientName: grant.client.name }
}
