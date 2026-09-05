import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { findClient, issueCode, redirectAllowed } from '@/lib/oauth'
import { parseScopes } from '@/lib/entitlements'

export const dynamic = 'force-dynamic'

// Consent decision from /oauth/authorize (signed-in user). Approve → code.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const b = await req.json().catch(() => ({}))
  const client = await findClient(String(b?.client_id ?? ''))
  const redirectUri = String(b?.redirect_uri ?? '')
  if (!client || client.status !== 'active') return NextResponse.json({ error: 'Unknown client' }, { status: 400 })
  if (!redirectAllowed(client, redirectUri)) return NextResponse.json({ error: 'redirect_uri is not registered for this client' }, { status: 400 })
  const state = String(b?.state ?? '')
  const url = new URL(redirectUri)
  if (!b?.approve) {
    url.searchParams.set('error', 'access_denied')
    if (state) url.searchParams.set('state', state)
    return NextResponse.json({ redirect: url.toString() })
  }
  // Requested scopes ∩ client's allowed scopes.
  const allowed = new Set(parseScopes(client.scopes))
  const scopes = parseScopes(String(b?.scope ?? 'read').replace(/\s+/g, ',')).filter((s) => allowed.has(s))
  if (scopes.length === 0) return NextResponse.json({ error: 'No permitted scopes requested' }, { status: 400 })
  const code = await issueCode(client.id, userId, scopes)
  url.searchParams.set('code', code)
  if (state) url.searchParams.set('state', state)
  await prisma.auditLog.create({ data: { userId, actor: 'user', action: 'OAUTH CONSENT GRANTED', category: 'platform_api', detail: `${session.user.email} authorised "${client.name}" for ${scopes.join(', ')}` } }).catch(() => {})
  return NextResponse.json({ redirect: url.toString() })
}
