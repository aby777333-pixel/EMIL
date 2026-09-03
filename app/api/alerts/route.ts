import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { watchlistQuotes } from '@/lib/data/hub'
import { evaluateAlerts } from '@/lib/alerts'
import { flagEnabled } from '@/lib/flags'

export const dynamic = 'force-dynamic'

// Alert & Notification Center (spec §37, §65). Price alerts are limited to
// watchlist symbols so evaluation rides the cached watchlist quotes and never
// spends extra data-plan credits. Delivery is in-app only today.
const ALERT_CAP = 20

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    if (!(await flagEnabled('alerts_center', true))) {
      return NextResponse.json({ disabled: true })
    }
    const [watchlist, activeCount] = await Promise.all([
      prisma.watchlistItem.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.priceAlert.count({ where: { userId, status: 'active' } }),
    ])
    // Evaluate active alerts against the (server-cached) watchlist quotes.
    if (activeCount > 0 && watchlist.length > 0) {
      try {
        const quotes: any = await watchlistQuotes(Array.from(new Set(watchlist.map((w) => w.symbol))))
        if (Array.isArray(quotes?.data)) await evaluateAlerts(userId, quotes.data)
      } catch { /* budget reached or feed down — alerts evaluate next poll */ }
    }
    const [alerts, notifications, unread] = await Promise.all([
      prisma.priceAlert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ])
    return NextResponse.json({
      alerts, notifications, unread, cap: ALERT_CAP,
      watchlist: Array.from(new Set(watchlist.map((w) => w.symbol))),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  try {
    if (!(await flagEnabled('alerts_center', true))) {
      return NextResponse.json({ error: 'The Alert Center is currently disabled by the administrator.' }, { status: 403 })
    }
    const body = await req.json().catch(() => ({}))

    if (body?.type === 'create') {
      const symbol = String(body?.symbol ?? '').trim().toUpperCase().slice(0, 20)
      const condition = body?.condition === 'below' ? 'below' : 'above'
      const threshold = Number(body?.threshold)
      const note = body?.note ? String(body.note).slice(0, 200) : null
      if (!symbol || !isFinite(threshold) || threshold <= 0) {
        return NextResponse.json({ error: 'A symbol and a positive threshold are required.' }, { status: 400 })
      }
      const onList = await prisma.watchlistItem.findFirst({ where: { userId, symbol } })
      if (!onList) {
        return NextResponse.json({ error: `${symbol} is not on your watchlist. Alerts are limited to watchlist symbols so they ride the same cached quotes (free data plan).` }, { status: 400 })
      }
      const count = await prisma.priceAlert.count({ where: { userId, status: { in: ['active', 'disabled'] } } })
      if (count >= ALERT_CAP) {
        return NextResponse.json({ error: `Alert limit reached (${ALERT_CAP}). Delete an alert to add another.` }, { status: 409 })
      }
      const alert = await prisma.priceAlert.create({ data: { userId, symbol, condition, threshold, note } })
      return NextResponse.json({ ok: true, alert })
    }

    if (body?.type === 'delete') {
      await prisma.priceAlert.deleteMany({ where: { userId, id: String(body?.id ?? '') } })
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'rearm') {
      // Re-arm a triggered/disabled alert.
      await prisma.priceAlert.updateMany({ where: { userId, id: String(body?.id ?? '') }, data: { status: 'active', triggeredAt: null } })
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'disable') {
      await prisma.priceAlert.updateMany({ where: { userId, id: String(body?.id ?? '') }, data: { status: 'disabled' } })
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'mark_read') {
      await prisma.notification.updateMany({ where: { userId, id: String(body?.id ?? '') }, data: { readAt: new Date() } })
      return NextResponse.json({ ok: true })
    }

    if (body?.type === 'mark_all_read') {
      await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Alert action failed' }, { status: 500 })
  }
}
