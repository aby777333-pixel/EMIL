import { decryptSecret, encryptSecret } from '@/lib/secrets'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { testProvider } from '@/lib/data/hub'

export const dynamic = 'force-dynamic'

// Command Center → Data Providers. Keys stored server-side, shown masked.
const mask = (v?: string | null) => (v ? `${v.slice(0, 3)}••••${v.slice(-2)}` : null)
const publicRow = (p: any) => ({
  id: p.id, key: p.key, name: p.name, category: p.category, baseUrl: p.baseUrl, docsUrl: p.docsUrl,
  authType: p.authType, hasApiKey: !!p.apiKey, apiKeyMasked: mask(decryptSecret(p.apiKey)), enabled: p.enabled,
  priority: p.priority, fallbackKey: p.fallbackKey, license: p.license, freshness: p.freshness,
  coverage: p.coverage, status: p.status, lastCheckedAt: p.lastCheckedAt, lastLatencyMs: p.lastLatencyMs, lastError: p.lastError,
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await requireAdmin((session.user as any).id)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const providers = await prisma.dataProvider.findMany({ orderBy: [{ category: 'asc' }, { priority: 'asc' }] })
    return NextResponse.json({ providers: providers.map(publicRow) })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load data providers' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const admin = await requireAdmin(userId)
  if (!admin) return NextResponse.json({ error: 'Super Admin role required' }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const provider = body?.key ? await prisma.dataProvider.findUnique({ where: { key: body.key } }) : null
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    const audit = (action: string, detail: string) =>
      prisma.auditLog.create({ data: { userId, actor: 'user', action, category: 'data_providers', detail: `${detail} (by ${admin.email})`.slice(0, 1000) } })

    if (body?.type === 'save_key') {
      const apiKey = String(body?.apiKey ?? '').trim()
      if (!apiKey) return NextResponse.json({ error: 'API key required' }, { status: 400 })
      const updated = await prisma.dataProvider.update({ where: { id: provider.id }, data: { apiKey: encryptSecret(apiKey), status: 'unknown', lastError: null } })
      await audit('DATA PROVIDER KEY SAVED', `${provider.name}: API key saved server-side.`)
      return NextResponse.json({ ok: true, provider: publicRow(updated) })
    }

    if (body?.type === 'clear_key') {
      const updated = await prisma.dataProvider.update({ where: { id: provider.id }, data: { apiKey: null, status: provider.authType === 'api_key' ? 'needs_key' : 'unknown' } })
      await audit('DATA PROVIDER KEY CLEARED', `${provider.name}: API key removed.`)
      return NextResponse.json({ ok: true, provider: publicRow(updated) })
    }

    if (body?.type === 'toggle_enabled') {
      const updated = await prisma.dataProvider.update({ where: { id: provider.id }, data: { enabled: !provider.enabled } })
      await audit('DATA PROVIDER TOGGLED', `${provider.name} → ${updated.enabled ? 'ENABLED' : 'DISABLED'}.`)
      return NextResponse.json({ ok: true, provider: publicRow(updated) })
    }

    if (body?.type === 'test') {
      const result = await testProvider(provider.key, decryptSecret(provider.apiKey))
      const updated = await prisma.dataProvider.update({
        where: { id: provider.id },
        data: {
          status: result.ok ? 'healthy' : provider.authType === 'api_key' && !provider.apiKey ? 'needs_key' : 'error',
          lastCheckedAt: new Date(), lastLatencyMs: result.latencyMs, lastError: result.ok ? null : result.message,
        },
      })
      await audit('DATA PROVIDER TESTED', `${provider.name}: ${result.ok ? 'HEALTHY' : 'FAILED'} — ${result.message}`)
      return NextResponse.json({ ok: result.ok, message: result.message, latencyMs: result.latencyMs, provider: publicRow(updated) })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Provider action failed' }, { status: 500 })
  }
}
