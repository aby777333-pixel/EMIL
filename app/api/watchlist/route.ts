import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { watchlistQuotes } from '@/lib/data/hub'

export const dynamic = 'force-dynamic'

// Per-user watchlist (spec §66) with cached research quotes.
const FREE_TIER_CAP = 8

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const items = await prisma.watchlistItem.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
    let quotes: any = null
    if (items.length) {
      try {
        quotes = await watchlistQuotes(items.map((i) => i.symbol))
      } catch (e: any) {
        // The list itself always loads; quotes degrade honestly.
        quotes = e?.rateLimited
          ? { rateLimited: true, retryAfterSec: e.retryAfterSec ?? 30, message: 'Per-minute market-data budget reached — quotes refresh automatically.' }
          : { message: 'Quotes unavailable right now.' }
      }
    }
    return NextResponse.json({ items, quotes, cap: FREE_TIER_CAP })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load watchlist' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const symbol = String(body?.symbol ?? '').trim().toUpperCase().slice(0, 20)

    if (body?.type === 'add') {
      if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
      const count = await prisma.watchlistItem.count({ where: { userId } })
      if (count >= FREE_TIER_CAP) {
        return NextResponse.json({ error: `Watchlist is capped at ${FREE_TIER_CAP} symbols on the current data plan (Twelve Data free tier: 8 credits/min).` }, { status: 409 })
      }
      await prisma.watchlistItem.upsert({
        where: { userId_symbol: { userId, symbol } },
        update: {},
        create: { userId, symbol },
      })
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'remove') {
      await prisma.watchlistItem.deleteMany({ where: { userId, symbol } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Watchlist action failed' }, { status: 500 })
  }
}
