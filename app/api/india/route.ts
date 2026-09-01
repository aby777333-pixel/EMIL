import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sessionStatus } from '@/lib/india/market-hours'
import { testProviderConnection } from '@/lib/india/adapter'

export const dynamic = 'force-dynamic'

const mask = (v?: string | null) => (v ? `${v.slice(0, 3)}••••${v.slice(-2)}` : null)

function publicProvider(p: any) {
  return {
    id: p.id, key: p.key, markets: p.markets, name: p.name, vendor: p.vendor, docsUrl: p.docsUrl, baseUrl: p.baseUrl,
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
  const userId = (session.user as any).id as string
  try {
    const isAdmin = !!(await requireAdmin(userId))
    const [providers, sessions, holidays, instruments, userLinks] = await Promise.all([
      prisma.indiaApiProvider.findMany({ orderBy: { name: 'asc' } }),
      prisma.exchangeSession.findMany({ orderBy: [{ exchange: 'asc' }, { segment: 'asc' }] }),
      prisma.indiaHoliday.findMany({ orderBy: { date: 'asc' } }),
      prisma.instrument.findMany({
        where: { exchange: { not: 'GLOBAL' } },
        include: { spec: true },
        orderBy: [{ exchange: 'asc' }, { symbol: 'asc' }],
      }),
      isAdmin ? Promise.resolve([]) : prisma.userBrokerConnection.findMany({ where: { userId } }),
    ])
    const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)))
    const sessionsWithStatus = sessions.map((s) => ({ ...s, live: sessionStatus(s, holidaySet) }))
    // Admins see the house catalog credentials; customers see the same catalog
    // overlaid with THEIR OWN broker links — never the house secrets.
    const linkByKey = new Map(userLinks.map((l) => [l.providerKey, l]))
    const rows = providers.map((p) => {
      if (isAdmin) return publicProvider(p)
      const mine = linkByKey.get(p.key)
      return {
        ...publicProvider({ ...p, apiKey: mine?.apiKey ?? null, apiSecret: mine?.apiSecret ?? null, accessToken: mine?.accessToken ?? null, clientCode: mine?.clientCode ?? null }),
        status: mine ? mine.status : 'not_configured',
        lastCheckedAt: mine?.lastCheckedAt ?? null,
        lastError: mine?.lastError ?? null,
      }
    })
    return NextResponse.json({
      providers: rows,
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
    const isAdmin = !!(await requireAdmin(userId))

    if (body?.type === 'save_credentials') {
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      const data: any = {}
      for (const f of ['apiKey', 'apiSecret', 'accessToken', 'clientCode'] as const) {
        if (typeof body?.[f] === 'string' && body[f].trim() !== '') data[f] = body[f].trim()
      }
      if (isAdmin) {
        // Owner/house credentials live on the catalog row.
        const updated = await prisma.indiaApiProvider.update({ where: { id: provider.id }, data: { ...data, status: 'configured', lastError: null } })
        await prisma.auditLog.create({
          data: { userId, actor: 'user', action: 'INDIA API CREDENTIALS UPDATED', category: 'india_api_hub', detail: `House credentials updated for ${provider.name} (${provider.vendor}). Secrets stored server-side.` },
        })
        return NextResponse.json({ ok: true, provider: publicProvider(updated) })
      }
      // Customers store their OWN broker credentials, isolated per account.
      const link = await prisma.userBrokerConnection.upsert({
        where: { userId_providerKey: { userId, providerKey: provider.key } },
        update: { ...data, status: 'configured', lastError: null },
        create: { userId, providerKey: provider.key, ...data },
      })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'CUSTOMER BROKER LINKED', category: 'india_api_hub', detail: `Customer linked ${provider.name} (${provider.vendor}) to their own account. Secrets stored server-side.` },
      })
      return NextResponse.json({ ok: true, provider: { ...publicProvider({ ...provider, apiKey: link.apiKey, apiSecret: link.apiSecret, accessToken: link.accessToken, clientCode: link.clientCode }), status: link.status, lastError: link.lastError } })
    }

    if (body?.type === 'test_connection') {
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      const link = isAdmin ? null : await prisma.userBrokerConnection.findUnique({ where: { userId_providerKey: { userId, providerKey: provider.key } } })
      const creds = isAdmin
        ? provider
        : { key: provider.key, baseUrl: provider.baseUrl, apiKey: link?.apiKey, apiSecret: link?.apiSecret, accessToken: link?.accessToken, clientCode: link?.clientCode }
      const result = await testProviderConnection(creds)
      let statusRow: any
      if (isAdmin) {
        statusRow = await prisma.indiaApiProvider.update({
          where: { id: provider.id },
          data: {
            status: result.ok ? 'connected' : provider.apiKey || provider.accessToken ? 'error' : 'not_configured',
            lastCheckedAt: new Date(),
            lastError: result.ok ? null : result.message,
          },
        })
        statusRow = publicProvider(statusRow)
      } else if (link) {
        const updatedLink = await prisma.userBrokerConnection.update({
          where: { id: link.id },
          data: { status: result.ok ? 'connected' : 'error', lastCheckedAt: new Date(), lastError: result.ok ? null : result.message },
        })
        statusRow = { ...publicProvider({ ...provider, apiKey: updatedLink.apiKey, apiSecret: updatedLink.apiSecret, accessToken: updatedLink.accessToken, clientCode: updatedLink.clientCode }), status: updatedLink.status, lastError: updatedLink.lastError }
      } else {
        statusRow = { ...publicProvider({ ...provider, apiKey: null, apiSecret: null, accessToken: null, clientCode: null }), status: 'not_configured' }
      }
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'INDIA API CONNECTION TEST', category: 'india_api_hub', detail: `${provider.name}${isAdmin ? ' (house)' : ' (customer link)'}: ${result.ok ? 'CONNECTED' : 'FAILED'} — ${result.message}` },
      })
      return NextResponse.json({ ok: result.ok, message: result.message, provider: statusRow })
    }

    if (body?.type === 'set_primary') {
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      if (!isAdmin) return NextResponse.json({ error: 'Only the platform owner can change the primary providers.' }, { status: 403 })
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
      if (!isAdmin) {
        await prisma.userBrokerConnection.deleteMany({ where: { userId, providerKey: provider.key } })
        await prisma.auditLog.create({
          data: { userId, actor: 'user', action: 'CUSTOMER BROKER UNLINKED', category: 'india_api_hub', detail: `Customer removed their ${provider.name} link.` },
        })
        return NextResponse.json({ ok: true, provider: { ...publicProvider({ ...provider, apiKey: null, apiSecret: null, accessToken: null, clientCode: null }), status: 'not_configured', lastError: null } })
      }
      const updated = await prisma.indiaApiProvider.update({
        where: { id: provider.id },
        data: { apiKey: null, apiSecret: null, accessToken: null, clientCode: null, status: 'not_configured', lastError: null, isPrimaryData: false, isPrimaryExec: false },
      })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'INDIA API CREDENTIALS CLEARED', category: 'india_api_hub', detail: `House credentials removed for ${provider.name}.` },
      })
      return NextResponse.json({ ok: true, provider: publicProvider(updated) })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
