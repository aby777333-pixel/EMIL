import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const [markets, user, providers] = await Promise.all([
      prisma.market.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.user.findUnique({ where: { id: userId }, select: { selectedMarkets: true } }),
      prisma.indiaApiProvider.findMany({
        select: { key: true, name: true, vendor: true, status: true, markets: true, isPrimaryData: true, isPrimaryExec: true },
        orderBy: { name: 'asc' },
      }),
    ])
    const allKeys = markets.map((m) => m.key)
    const raw = (user?.selectedMarkets ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    const selected = raw.filter((k) => allKeys.includes(k))
    // null/empty selection = all markets enabled
    return NextResponse.json({ markets, selected: selected.length > 0 ? selected : allKeys, explicit: selected.length > 0, providers })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load markets' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.type === 'set_selection') {
      const markets = await prisma.market.findMany({ select: { key: true } })
      const allKeys = markets.map((m) => m.key)
      const keys: string[] = Array.isArray(body?.keys) ? body.keys.filter((k: any) => typeof k === 'string' && allKeys.includes(k)) : []
      if (keys.length === 0) {
        return NextResponse.json({ error: 'Select at least one market.' }, { status: 400 })
      }
      await prisma.user.update({ where: { id: userId }, data: { selectedMarkets: keys.join(',') } })
      await prisma.auditLog.create({
        data: { userId, actor: 'user', action: 'MARKET SELECTION UPDATED', category: 'markets', detail: `EMIL market scope set to: ${keys.join(', ')}.` },
      })
      return NextResponse.json({ ok: true, selected: keys })
    }
    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
