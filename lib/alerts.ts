// Alert evaluation (spec §37) — compares a user's active price alerts against
// the same cached, delayed research quotes the watchlist already fetched, so
// alerting never spends extra data-plan credits. Alerts are RESEARCH signals
// on delayed data: they must never trigger execution, only notifications.

import { prisma } from '@/lib/db'
import { deliverNotification } from '@/lib/notify'
import { emitEvent } from '@/lib/webhooks'

type QuoteLike = { symbol: string; price: number | null }

export async function evaluateAlerts(userId: string, quotes: QuoteLike[]) {
  try {
    const alerts = await prisma.priceAlert.findMany({ where: { userId, status: 'active' } })
    if (alerts.length === 0) return
    const bySymbol = new Map<string, number>()
    for (const q of quotes) {
      if (typeof q.price === 'number' && isFinite(q.price)) bySymbol.set(q.symbol, q.price)
    }
    for (const a of alerts) {
      const price = bySymbol.get(a.symbol)
      if (price === undefined) continue
      const hit = a.condition === 'above' ? price >= a.threshold : price <= a.threshold
      if (!hit) {
        prisma.priceAlert.update({ where: { id: a.id }, data: { lastPrice: price } }).catch(() => {})
        continue
      }
      // updateMany with the status guard makes triggering race-safe: only one
      // concurrent request wins, so exactly one notification is created.
      const won = await prisma.priceAlert.updateMany({
        where: { id: a.id, status: 'active' },
        data: { status: 'triggered', triggeredAt: new Date(), lastPrice: price },
      })
      if (won.count === 1) {
        const n = {
          title: `${a.symbol} crossed ${a.condition === 'above' ? 'above' : 'below'} ${a.threshold}`,
          body: `Last delayed research quote: ${price}. Quotes are cached ~5 min — this is a research signal, not an execution trigger.${a.note ? ` Note: ${a.note}` : ''}`,
          href: `/charts?symbol=${encodeURIComponent(a.symbol)}`,
        }
        await prisma.notification.create({ data: { userId, kind: 'price_alert', ...n } }).catch(() => {})
        // Telegram / email fan-out (opt-in per user) — never blocks the data path.
        await deliverNotification(userId, n)
        emitEvent(userId, 'alert.triggered', { alertId: a.id, symbol: a.symbol, condition: a.condition, threshold: a.threshold, price, title: n.title, note: a.note ?? null }).catch(() => {})
      }
    }
  } catch (e) {
    // Alert evaluation is best-effort — it must never break the data path.
    console.error('alert evaluation failed', e)
  }
}
