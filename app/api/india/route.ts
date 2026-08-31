import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sessionStatus } from '@/lib/india/market-hours'
import { testProviderConnection } from '@/lib/india/adapter'

export const dynamic = 'force-dynamic'

const mask = (v?: string | null) => (v ? `${v.slice(0, 3)}••••${v.slice(-2)}` : null)

function publicProvider(p: any) {
  return {
    id: p.id, key: p.key, name: p.name, vendor: p.vendor, docsUrl: p.docsUrl, baseUrl: p.baseUrl,
    authType: p.authType, authNote: p.authNote, exchanges: p.exchanges, capabilities: p.capabilities,
    rateLimitNote: p.rateLimitNote, pricingNote: p.pricingNote, status: p.status,
    isPrimaryData: p.isPrimaryData, isPrimaryExec: p.isPrimaryExec,
    hasApiKey: !!p.apiKey, hasApiSecret: !!p.apiSecret, hasAccessToken: !!p.accessToken,
    apiKeyMasked: mask(p.apiKey), clientCode: p.clientCode,
    lastCheckedAt: p.lastCheckedAt, lastError: p.lastError, updatedAt: p.updatedAt,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [providers, sessions, holidays, instruments] = await Promise.all([
      prisma.indiaApiProvider.findMany({ orderBy: { name: 'asc' } }),
      prisma.exchangeSession.findMany({ orderBy: [{ exchange: 'asc' }, { segment: 'asc' }] }),
      prisma.indiaHoliday.findMany({ orderBy: { date: 'asc' } }),
      prisma.instrument.findMany({
        where: { exchange: { not: 'GLOBAL' } },
        include: { spec: true },
        orderBy: [{ exchange: 'asc' }, { symbol: 'asc' }],
      }),
    ])
    const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)))
    const sessionsWithStatus = sessions.map((s) => ({ ...s, live: sessionStatus(s, holidaySet) }))
    return NextResponse.json({
      providers: providers.map(publicProvider),
      sessions: sessionsWithStatus,
      holidays,
      instruments,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load India API hub' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const provider = body?.key ? await prisma.indiaApiProvider.findUnique({ where: { key: body.key } }) : null

    if (body?.type === 'save_credentials') {
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      const data: any = { status: 'configured', lastError: null }
      for (const f of ['apiKey', 'apiSecret', 'accessToken', 'clientCode'] as const) {
        if (typeof body?.[f] === 'string' && body[f].trim() !== '') data[f] = body[f].trim()
      }
      const updated = await prisma.indiaApiProvider.update({ where: { id: provider.id }, data })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'INDIA API CREDENTIALS UPDATED', category: 'india_api_hub', detail: `Credentials updated for ${provider.name} (${provider.vendor}). Secrets stored server-side.` },
      })
      return NextResponse.json({ ok: true, provider: publicProvider(updated) })
    }

    if (body?.type === 'test_connection') {
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      const result = await testProviderConnection(provider)
      const updated = await prisma.indiaApiProvider.update({
        where: { id: provider.id },
        data: {
          status: result.ok ? 'connected' : provider.apiKey || provider.accessToken ? 'error' : 'not_configured',
          lastCheckedAt: new Date(),
          lastError: result.ok ? null : result.message,
        },
      })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'INDIA API CONNECTION TEST', category: 'india_api_hub', detail: `${provider.name}: ${result.ok ? 'CONNECTED' : 'FAILED'} — ${result.message}` },
      })
      return NextResponse.json({ ok: result.ok, message: result.message, provider: publicProvider(updated) })
    }

    if (body?.type === 'set_primary') {
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      const role = body?.role === 'exec' ? 'exec' : 'data'
      const field = role === 'exec' ? 'isPrimaryExec' : 'isPrimaryData'
      await prisma.indiaApiProvider.updateMany({ data: { [field]: false } })
      const updated = await prisma.indiaApiProvider.update({ where: { id: provider.id }, data: { [field]: true } })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'INDIA API PRIMARY PROVIDER SET', category: 'india_api_hub', detail: `${provider.name} set as primary ${role === 'exec' ? 'execution' : 'market-data'} provider for NSE/BSE/MCX.` },
      })
      return NextResponse.json({ ok: true, provider: publicProvider(updated) })
    }

    if (body?.type === 'clear_credentials') {
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      const updated = await prisma.indiaApiProvider.update({
        where: { id: provider.id },
        data: { apiKey: null, apiSecret: null, accessToken: null, clientCode: null, status: 'not_configured', lastError: null, isPrimaryData: false, isPrimaryExec: false },
      })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'INDIA API CREDENTIALS CLEARED', category: 'india_api_hub', detail: `Credentials removed for ${provider.name}.` },
      })
      return NextResponse.json({ ok: true, provider: publicProvider(updated) })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
