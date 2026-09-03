// Circuit breakers (spec §30–31). Deterministic rules evaluated against LIVE
// conditions — the account's P/L and drawdown, margin, open-position count,
// consecutive losses, the high-impact news window, broker and data health.
// A TRIPPED breaker with action "disarm" stops automation (armed → false),
// records an emergency event, audits and notifies admins. Kill switches are
// never permission-walled and never gated by a flag; enforcement here is
// gated by `circuit_breakers` so the owner can watch before it acts.

import { prisma } from '@/lib/db'
import { flagEnabled } from '@/lib/flags'
import { economicCalendar } from '@/lib/data/calendar'
import { deliverNotification } from '@/lib/notify'

export type BreakerState = 'ok' | 'warn' | 'tripped' | 'n/a'
export type Breaker = {
  key: string
  label: string
  state: BreakerState
  value: string
  threshold: string
  detail: string
  action: 'disarm' | 'alert'
}
export type BreakerReport = {
  evaluatedAt: string
  armed: boolean
  enforcement: boolean
  breakers: Breaker[]
  tripped: string[]
  enforced: { key: string; label: string }[]
  recentTrips: { id: string; detail: string; resolved: boolean; createdAt: Date }[]
}

let memo: { at: number; report: BreakerReport } | null = null
const MEMO_MS = 45_000

const pct = (n: number) => `${n.toFixed(2)}%`

export async function evaluateBreakers(opts: { enforce?: boolean; force?: boolean } = {}): Promise<BreakerReport> {
  if (!opts.force && memo && Date.now() - memo.at < MEMO_MS) return memo.report

  const [state, account, profile, conn, providers, recentClosed, openCount, cal, enforcement] = await Promise.all([
    prisma.emilState.findFirst(),
    prisma.tradingAccount.findFirst(),
    prisma.riskProfile.findFirst({ where: { isActive: true } }),
    prisma.brokerConnection.findFirst(),
    prisma.dataProvider.findMany({ where: { key: { in: ['twelve_data', 'gdelt', 'coingecko', 'frankfurter'] } }, select: { key: true, status: true, lastCheckedAt: true, lastError: true } }),
    prisma.position.findMany({ where: { status: 'closed', closedPL: { not: null } }, orderBy: { closedAt: 'desc' }, take: 6, select: { closedPL: true } }),
    prisma.position.count({ where: { status: 'open' } }),
    economicCalendar().catch(() => null),
    flagEnabled('circuit_breakers', true),
  ])

  const breakers: Breaker[] = []
  const balance = account?.balance ?? 0
  const equity = account?.equity ?? 0

  // 1. Daily loss limit
  if (account && profile) {
    const limit = balance * (profile.dailyLossLimitPct / 100)
    const loss = Math.max(0, -(account.dailyPL ?? 0))
    const ratio = limit > 0 ? loss / limit : 0
    breakers.push({ key: 'daily_loss', label: 'Daily loss limit', state: ratio >= 1 ? 'tripped' : ratio >= 0.75 ? 'warn' : 'ok', value: `${loss.toFixed(2)} ${account.currency}`, threshold: `${limit.toFixed(2)} ${account.currency} (${profile.dailyLossLimitPct}%)`, detail: `Today's realised + floating loss vs ${profile.dailyLossLimitPct}% of balance.`, action: 'disarm' })
    // 2. Weekly loss limit
    const wLimit = balance * (profile.weeklyLossLimitPct / 100)
    const wLoss = Math.max(0, -(account.weeklyPL ?? 0))
    const wRatio = wLimit > 0 ? wLoss / wLimit : 0
    breakers.push({ key: 'weekly_loss', label: 'Weekly loss limit', state: wRatio >= 1 ? 'tripped' : wRatio >= 0.75 ? 'warn' : 'ok', value: `${wLoss.toFixed(2)} ${account.currency}`, threshold: `${wLimit.toFixed(2)} ${account.currency} (${profile.weeklyLossLimitPct}%)`, detail: 'This week\'s loss vs the weekly limit.', action: 'disarm' })
    // 3. Drawdown from high-water mark
    const dd = account.highWaterMark > 0 ? ((account.highWaterMark - equity) / account.highWaterMark) * 100 : 0
    breakers.push({ key: 'drawdown', label: 'Drawdown from high-water mark', state: dd >= profile.maxDrawdownPct ? 'tripped' : dd >= profile.maxDrawdownPct * 0.75 ? 'warn' : 'ok', value: pct(dd), threshold: pct(profile.maxDrawdownPct), detail: 'Equity below the account high-water mark.', action: 'disarm' })
    // 4. Margin utilisation
    const mu = equity > 0 ? ((account.marginUsed ?? 0) / equity) * 100 : 0
    breakers.push({ key: 'margin', label: 'Margin utilisation', state: mu >= profile.maxMarginUtilPct ? 'tripped' : mu >= profile.maxMarginUtilPct * 0.75 ? 'warn' : 'ok', value: pct(mu), threshold: pct(profile.maxMarginUtilPct), detail: 'Margin used vs equity.', action: 'disarm' })
    // 5. Open positions
    breakers.push({ key: 'open_positions', label: 'Open positions', state: openCount > profile.maxOpenPositions ? 'tripped' : openCount === profile.maxOpenPositions ? 'warn' : 'ok', value: String(openCount), threshold: `≤ ${profile.maxOpenPositions}`, detail: 'Open positions vs the profile maximum; at the cap no new entries.', action: 'alert' })
    // 6. Consecutive losses
    let streak = 0
    for (const p of recentClosed) { if ((p.closedPL ?? 0) < 0) streak += 1; else break }
    breakers.push({ key: 'loss_streak', label: 'Consecutive losses', state: streak >= profile.pauseAfterConsecutiveLosses ? 'tripped' : streak === profile.pauseAfterConsecutiveLosses - 1 ? 'warn' : 'ok', value: String(streak), threshold: `< ${profile.pauseAfterConsecutiveLosses}`, detail: 'Most recent closed trades, newest first, until the first winner.', action: 'disarm' })
  } else {
    breakers.push({ key: 'account', label: 'Account limits', state: 'n/a', value: '—', threshold: '—', detail: 'No trading account / active risk profile found.', action: 'alert' })
  }

  // 7. High-impact news window (±30 min) — pause_before_high_impact behaviour
  const now = Date.now()
  const highSoon = (((cal as any)?.data ?? []) as any[]).filter((e) => e.impact === 'High' && Math.abs(Date.parse(e.date) - now) <= 30 * 60e3)
  const newsBehaviour = profile?.newsBehavior ?? 'pause_before_high_impact'
  breakers.push({
    key: 'news_window', label: 'High-impact news window',
    state: cal ? (highSoon.length && newsBehaviour !== 'ignore' ? 'tripped' : 'ok') : 'n/a',
    value: cal ? (highSoon.length ? highSoon.map((e) => `${e.country} ${e.title}`).slice(0, 2).join(' · ') : 'clear') : 'calendar unavailable',
    threshold: '±30 min of a High event', detail: `Profile behaviour: ${newsBehaviour.replace(/_/g, ' ')}.`, action: newsBehaviour === 'ignore' ? 'alert' : 'disarm',
  })

  // 8. Broker connectivity
  breakers.push({ key: 'broker', label: 'Broker connection', state: !conn ? 'n/a' : conn.status === 'connected' ? (conn.latencyMs > 800 ? 'warn' : 'ok') : 'tripped', value: conn ? `${conn.status} · ${conn.latencyMs} ms` : '—', threshold: 'connected, < 800 ms', detail: 'Execution venue link as reported by the connection monitor.', action: 'disarm' })

  // 9. Market-data health (Twelve Data primary + open feeds)
  const stale = (d: { lastCheckedAt: Date | null }) => !d.lastCheckedAt || now - d.lastCheckedAt.getTime() > 15 * 60e3
  const td = providers.find((p) => p.key === 'twelve_data')
  const bad = providers.filter((p) => p.status === 'error' && !stale(p))
  breakers.push({
    key: 'data_health', label: 'Market-data health',
    state: td && td.status === 'error' && !stale(td) ? 'tripped' : bad.length ? 'warn' : 'ok',
    value: bad.length ? bad.map((p) => `${p.key}: ${p.status}`).join(' · ') : 'all feeds healthy',
    threshold: 'primary quote feed healthy', detail: td?.lastError && td.status === 'error' ? `Twelve Data: ${td.lastError}` : 'Recent provider health stamps from the Data Provider Hub.', action: 'disarm',
  })

  const tripped = breakers.filter((b) => b.state === 'tripped')
  const enforced: { key: string; label: string }[] = []

  // ---- enforcement: stop automation on any disarm-class trip ----
  if (opts.enforce && enforcement && state?.armed && tripped.some((b) => b.action === 'disarm')) {
    const hits = tripped.filter((b) => b.action === 'disarm')
    const detail = `[${hits.map((h) => h.key).join(',')}] Circuit breaker: ${hits.map((h) => `${h.label} (${h.value} vs ${h.threshold})`).join('; ')}. Automation stopped — positions untouched, broker-side stops remain.`
    await prisma.emilState.update({ where: { id: state.id }, data: { armed: false, guardianDecision: `CIRCUIT BREAKER — ${hits[0].label.toUpperCase()}`, guardianStatus: 'intervened' } })
    await prisma.emergencyEvent.create({ data: { eventType: 'circuit_breaker', triggeredBy: 'EMIL Guardian', detail: detail.slice(0, 1500) } })
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
    for (const a of admins) {
      await prisma.auditLog.create({ data: { userId: a.id, actor: 'system', action: 'CIRCUIT BREAKER TRIPPED', category: 'risk', detail: detail.slice(0, 1500) } }).catch(() => {})
      await deliverNotification(a.id, { title: `Circuit breaker: ${hits[0].label}`, body: detail.slice(0, 400), href: '/risk' }).catch(() => {})
    }
    enforced.push(...hits.map((h) => ({ key: h.key, label: h.label })))
  }

  const recentTrips = await prisma.emergencyEvent.findMany({ where: { eventType: 'circuit_breaker' }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, detail: true, resolved: true, createdAt: true } })
  const report: BreakerReport = {
    evaluatedAt: new Date().toISOString(), armed: !!state?.armed && enforced.length === 0, enforcement,
    breakers, tripped: tripped.map((b) => b.key), enforced, recentTrips,
  }
  memo = { at: Date.now(), report }
  return report
}
