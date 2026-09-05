import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Your Data Feed (round F): what EMIL holds from /api/v1/ingest — isolated
// per account, labelled CUSTOMER FEED, with CALCULATED summaries only.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const [qCount, oCount, pCount, latestQuotes, pnl, orders, firstQ, lastQ] = await Promise.all([
      prisma.customerFeedQuote.count({ where: { userId } }),
      prisma.customerFeedOrder.count({ where: { userId } }),
      prisma.customerFeedPnl.count({ where: { userId } }),
      prisma.customerFeedQuote.findMany({ where: { userId }, orderBy: { ts: 'desc' }, distinct: ['symbol'], take: 50 }),
      prisma.customerFeedPnl.findMany({ where: { userId }, orderBy: { ts: 'asc' }, take: 1000 }),
      prisma.customerFeedOrder.findMany({ where: { userId }, orderBy: { ts: 'desc' }, take: 200 }),
      prisma.customerFeedQuote.findFirst({ where: { userId }, orderBy: { ts: 'asc' }, select: { ts: true } }),
      prisma.customerFeedQuote.findFirst({ where: { userId }, orderBy: { ts: 'desc' }, select: { ts: true } }),
    ])
    // Calculated: equity path, drawdown, order stats by symbol.
    const eq = pnl.filter((p) => typeof p.equity === 'number').map((p) => ({ ts: p.ts, equity: p.equity as number, account: p.account }))
    let peak = -Infinity; let maxDd = 0
    for (const p of eq) { peak = Math.max(peak, p.equity); if (peak > 0) maxDd = Math.max(maxDd, (peak - p.equity) / peak) }
    const bySymbol = new Map<string, { orders: number; buyQty: number; sellQty: number; notional: number }>()
    for (const o of orders) {
      const cur = bySymbol.get(o.symbol) ?? { orders: 0, buyQty: 0, sellQty: 0, notional: 0 }
      cur.orders += 1; if (o.side === 'buy') cur.buyQty += o.qty; else cur.sellQty += o.qty; cur.notional += (o.price ?? 0) * o.qty
      bySymbol.set(o.symbol, cur)
    }
    return NextResponse.json({
      label: 'CUSTOMER FEED — your own pushed data, isolated to your account, never mixed with EMIL research feeds',
      counts: { quotes: qCount, orders: oCount, pnl: pCount }, span: { first: firstQ?.ts ?? null, last: lastQ?.ts ?? null },
      latestQuotes, orders, equity: eq, stats: { firstEquity: eq[0]?.equity ?? null, lastEquity: eq[eq.length - 1]?.equity ?? null, changePct: eq.length > 1 && eq[0].equity ? ((eq[eq.length - 1].equity - eq[0].equity) / eq[0].equity) * 100 : null, maxDrawdownPct: maxDd * 100, realized: pnl.reduce((s, p) => s + (p.realized ?? 0), 0) },
      bySymbol: Array.from(bySymbol.entries()).map(([symbol, v]) => ({ symbol, ...v })).sort((a, b) => b.orders - a.orders),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load your feed' }, { status: 500 })
  }
}
