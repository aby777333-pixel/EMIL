import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomBytes } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { watchlistQuotes } from '@/lib/data/hub'
import { evaluateAlerts } from '@/lib/alerts'
import { toTwelveData } from '@/lib/instruments/catalog'

export const dynamic = 'force-dynamic'

// Named watchlists (spec §66). Quotes come from the cached research feed, ONE
// fetch per distinct symbol across all of a user's lists — so the cap that
// protects the free data plan is on DISTINCT symbols, not on list entries.
const SYMBOL_CAP = 8
const LIST_CAP = 6

async function loadLists(userId: string) {
  return prisma.watchlist.findMany({
    where: { userId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { items: { orderBy: { createdAt: 'asc' } } },
  })
}
type ListWithItems = Awaited<ReturnType<typeof loadLists>>[number]

// Every user always has at least one list; legacy list-less rows are adopted.
async function ensureLists(userId: string) {
  let lists = await loadLists(userId)
  if (lists.length === 0) {
    const def = await prisma.watchlist.create({ data: { userId, name: 'My Watchlist' } })
    await prisma.watchlistItem.updateMany({ where: { userId, watchlistId: null }, data: { watchlistId: def.id } })
    lists = await loadLists(userId)
  }
  return lists
}

function distinctSymbols(lists: ListWithItems[]) {
  return Array.from(new Set(lists.flatMap((l) => l.items.map((i) => i.symbol))))
}

function shape(lists: ListWithItems[]) {
  return lists.map((l) => ({
    id: l.id, name: l.name, shareToken: l.shareToken,
    items: l.items.map((i) => ({ id: i.id, symbol: i.symbol, label: i.label, createdAt: i.createdAt })),
  }))
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const lists = await ensureLists(userId)
    const symbols = distinctSymbols(lists)
    let quotes: any = null
    if (symbols.length) {
      try {
        quotes = await watchlistQuotes(symbols)
        // Piggyback price-alert evaluation on the quotes we just fetched —
        // zero extra data-plan credits (spec §37).
        if (Array.isArray(quotes?.data)) await evaluateAlerts(userId, quotes.data)
      } catch (e: any) {
        quotes = e?.rateLimited
          ? { rateLimited: true, retryAfterSec: e.retryAfterSec ?? 30, message: 'Per-minute market-data budget reached — quotes refresh automatically.' }
          : { message: 'Quotes unavailable right now.' }
      }
    }
    // `items` keeps the legacy flat shape (distinct union) for older callers.
    const seen = new Set<string>()
    const items = lists.flatMap((l) => l.items).filter((i) => (seen.has(i.symbol) ? false : (seen.add(i.symbol), true)))
    return NextResponse.json({ lists: shape(lists), items, quotes, cap: SYMBOL_CAP, symbolCap: SYMBOL_CAP, listCap: LIST_CAP, distinctCount: symbols.length })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load watchlists' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    const body = await req.json().catch(() => ({}))
    const type = String(body?.type ?? '')
    // Any spelling resolves through the instrument master to the research symbol the quotes use.
    const rawSymbol = String(body?.symbol ?? '').trim().slice(0, 24)
    const resolved = rawSymbol ? toTwelveData(rawSymbol) : null
    const symbol = (resolved?.symbol ?? '').toUpperCase().slice(0, 24)
    const label = resolved?.def?.name ?? null
    const name = String(body?.name ?? '').trim().slice(0, 40)
    const lists = await ensureLists(userId)
    const pick = (id?: string) => (id ? lists.find((l) => l.id === id) : lists[0])

    if (type === 'add') {
      if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
      const list = pick(body?.listId)
      if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })
      const symbols = distinctSymbols(lists)
      if (!symbols.includes(symbol) && symbols.length >= SYMBOL_CAP) {
        return NextResponse.json({ error: `You track ${symbols.length} distinct symbols — the cap is ${SYMBOL_CAP} on the current data plan (Twelve Data free tier: 8 credits/min). Remove one first, or add a symbol you already track to another list.` }, { status: 409 })
      }
      const exists = await prisma.watchlistItem.findFirst({ where: { watchlistId: list.id, symbol } })
      if (!exists) await prisma.watchlistItem.create({ data: { userId, symbol, label, watchlistId: list.id } })
      return NextResponse.json({ ok: true })
    }

    if (type === 'remove') {
      if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
      await prisma.watchlistItem.deleteMany({ where: { userId, symbol, ...(body?.listId ? { watchlistId: String(body.listId) } : {}) } })
      return NextResponse.json({ ok: true })
    }

    if (type === 'create_list') {
      if (!name) return NextResponse.json({ error: 'List name required' }, { status: 400 })
      if (lists.length >= LIST_CAP) return NextResponse.json({ error: `Up to ${LIST_CAP} lists per account.` }, { status: 409 })
      const created = await prisma.watchlist.create({ data: { userId, name, sortOrder: lists.length } })
      return NextResponse.json({ ok: true, listId: created.id })
    }

    if (type === 'rename_list') {
      const list = pick(body?.listId)
      if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })
      if (!name) return NextResponse.json({ error: 'List name required' }, { status: 400 })
      await prisma.watchlist.update({ where: { id: list.id }, data: { name } })
      return NextResponse.json({ ok: true })
    }

    if (type === 'delete_list') {
      const list = pick(body?.listId)
      if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })
      if (lists.length <= 1) return NextResponse.json({ error: 'Keep at least one list — clear it instead.' }, { status: 409 })
      await prisma.watchlist.delete({ where: { id: list.id } }) // items cascade
      return NextResponse.json({ ok: true })
    }

    if (type === 'share_list') {
      const list = pick(body?.listId)
      if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })
      const enabled = !!body?.enabled
      const shareToken = enabled ? (list.shareToken ?? randomBytes(9).toString('base64url')) : null
      await prisma.watchlist.update({ where: { id: list.id }, data: { shareToken } })
      return NextResponse.json({ ok: true, shareToken })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Watchlist action failed' }, { status: 500 })
  }
}
