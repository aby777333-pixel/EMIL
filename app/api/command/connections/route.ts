import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// All customer broker connections + the house provider catalog state,
// and the roster of active/revoked API keys — the connectivity control plane.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await requireAdmin((session.user as any).id)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const [connections, providers, apiKeys] = await Promise.all([
      prisma.userBrokerConnection.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { email: true, name: true, profile: { select: { status: true, planKey: true } } } } },
      }),
      prisma.indiaApiProvider.findMany({ orderBy: { name: 'asc' }, select: { key: true, name: true, vendor: true, markets: true, status: true, isPrimaryData: true, isPrimaryExec: true, lastCheckedAt: true, lastError: true } }),
      prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' }, include: { user: { select: { email: true } } } }),
    ])
    return NextResponse.json({
      connections: connections.map((c) => ({
        id: c.id, providerKey: c.providerKey, status: c.status, lastCheckedAt: c.lastCheckedAt, lastError: c.lastError, updatedAt: c.updatedAt,
        hasApiKey: !!c.apiKey, hasAccessToken: !!c.accessToken,
        user: c.user,
      })),
      providers,
      apiKeys: apiKeys.map((k) => ({ id: k.id, label: k.label, prefix: k.prefix, status: k.status, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt, email: k.user.email })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
  }
}
