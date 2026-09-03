// Consolidated portfolio + exposure map (spec §28–29). Pulls the EMIL account
// (agent pipeline positions) and every venue the user has linked with an API
// key + secret (read-only is enough), normalises symbols through the
// instrument master and aggregates exposure by asset class / symbol / venue.
// CALCULATED estimates in approximate USD — research view, not a statement.

import { prisma } from '@/lib/db'
import { cachedFetch, cryptoMarkets } from '@/lib/data/hub'
import { listExecutionVenues, resolveVenueForRead } from '@/lib/execution/router'
import { resolveInstrument } from '@/lib/instruments/catalog'

export type PortfolioPosition = {
  source: 'emil' | 'venue'
  venue: string
  paper: boolean
  symbol: string
  canonical: string
  assetClass: string
  qty: number
  side: 'long' | 'short'
  entry: number | null
  mark: number | null
  upnl: number | null
  notionalUsd: number | null
}

export type PortfolioAccount = {
  source: 'emil' | 'venue'
  key: string
  label: string
  paper: boolean
  currency: string
  balanceUsd: number | null
  equityUsd: number | null
  unconverted: { asset: string; total: number }[]
  positions: number
  error: string | null
}

const STABLE = new Set(['USD', 'USDC', 'USDT', 'USDE', 'DAI', 'BUSD', 'TUSD', 'FDUSD'])

async function usdPrices(): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  try {
    const c: any = await cryptoMarkets(25)
    for (const row of c?.data ?? []) {
      const sym = String(row.symbol ?? '').toUpperCase()
      const px = Number(row.price ?? row.current_price)
      if (sym && isFinite(px)) out[sym] = px
    }
  } catch { /* prices are best effort */ }
  return out
}

function classify(symbol: string, fallback: string) {
  const def = resolveInstrument(symbol)
  return { canonical: def?.key ?? symbol.toUpperCase().replace(/[-_/:]/g, ''), assetClass: def?.assetClass ?? fallback }
}

export async function consolidatedPortfolio(userId: string, isAdmin: boolean, force = false) {
  const key = `portfolio_${userId}_${isAdmin ? 'a' : 'u'}${force ? `_r${Math.floor(Date.now() / 60000)}` : ''}`
  return cachedFetch(key, 60, async () => {
    const accounts: PortfolioAccount[] = []
    const positions: PortfolioPosition[] = []
    const prices = await usdPrices()
    const toUsd = (asset: string, amount: number): number | null => {
      const a = asset.toUpperCase()
      if (STABLE.has(a)) return amount
      if (prices[a]) return amount * prices[a]
      return null
    }

    // ---- EMIL account (agent pipeline / demo) ----
    const acct = await prisma.tradingAccount.findFirst({ where: isAdmin ? {} : { userId }, orderBy: { id: 'asc' } })
    if (acct) {
      const pos = await prisma.position.findMany({ where: { accountId: acct.id, status: 'open' }, include: { instrument: { include: { spec: true } } } })
      for (const p of pos) {
        const contract = p.instrument.spec?.contractSize ?? 1
        const mark = p.currentPrice || p.instrument.currentPrice || null
        const { canonical, assetClass } = classify(p.instrument.symbol, p.instrument.assetClass)
        const short = /^(s|sell|short)/i.test(p.direction)
        positions.push({
          source: 'emil', venue: 'EMIL account', paper: true, symbol: p.instrument.symbol, canonical, assetClass,
          qty: p.lots * (short ? -1 : 1), side: short ? 'short' : 'long', entry: p.entryPrice, mark, upnl: p.floatingPL,
          notionalUsd: mark ? Math.abs(p.lots * contract * mark) : null,
        })
      }
      accounts.push({ source: 'emil', key: 'emil', label: `EMIL account ${acct.accountNumber}`, paper: true, currency: acct.currency, balanceUsd: acct.balance, equityUsd: acct.equity, unconverted: [], positions: pos.length, error: null })
    }

    // ---- linked venues (read-only is enough) ----
    const venues = (await listExecutionVenues(userId, isAdmin).catch(() => [])).filter((v) => v.connected)
    await Promise.all(venues.map(async (v) => {
      try {
        const { adapter } = await resolveVenueForRead(userId, isAdmin, v.key)
        const [bals, pos] = await Promise.all([adapter.balances(), adapter.positions()])
        let balanceUsd = 0; let any = false
        const unconverted: { asset: string; total: number }[] = []
        for (const b of bals) {
          if (!b.total) continue
          const usd = toUsd(b.asset, b.total)
          if (usd === null) unconverted.push({ asset: b.asset, total: b.total })
          else { balanceUsd += usd; any = true }
        }
        for (const p of pos) {
          if (!p.qty) continue
          const { canonical, assetClass } = classify(p.symbol, 'crypto')
          const mark = p.markPrice ?? null
          positions.push({
            source: 'venue', venue: v.name, paper: v.paper, symbol: p.symbol, canonical, assetClass,
            qty: p.qty, side: p.qty < 0 ? 'short' : 'long', entry: p.entryPrice ?? null, mark, upnl: p.unrealizedPnl ?? null,
            notionalUsd: mark ? Math.abs(p.qty * mark) : null,
          })
        }
        accounts.push({ source: 'venue', key: v.key, label: v.name, paper: v.paper, currency: 'USD', balanceUsd: any ? balanceUsd : null, equityUsd: null, unconverted, positions: pos.filter((p) => p.qty).length, error: null })
      } catch (e: any) {
        accounts.push({ source: 'venue', key: v.key, label: v.name, paper: v.paper, currency: 'USD', balanceUsd: null, equityUsd: null, unconverted: [], positions: 0, error: String(e?.message ?? 'venue unreachable').slice(0, 160) })
      }
    }))

    // ---- exposure map ----
    const agg = (by: (p: PortfolioPosition) => string) => {
      const m = new Map<string, { gross: number; net: number; count: number }>()
      for (const p of positions) {
        if (p.notionalUsd === null) continue
        const k = by(p); const cur = m.get(k) ?? { gross: 0, net: 0, count: 0 }
        cur.gross += p.notionalUsd; cur.net += p.notionalUsd * (p.side === 'short' ? -1 : 1); cur.count += 1
        m.set(k, cur)
      }
      return Array.from(m.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.gross - a.gross)
    }
    const byAssetClass = agg((p) => p.assetClass)
    const bySymbol = agg((p) => p.canonical)
    const byVenue = agg((p) => p.venue)
    const grossTotal = bySymbol.reduce((s, r) => s + r.gross, 0)
    const netTotal = byAssetClass.reduce((s, r) => s + r.net, 0)
    const equityTotal = accounts.reduce((s, a) => s + (a.equityUsd ?? a.balanceUsd ?? 0), 0)
    const concentration = grossTotal > 0 && bySymbol[0] ? bySymbol[0].gross / grossTotal : 0
    const unpriced = positions.filter((p) => p.notionalUsd === null).length
    // Linear shock scenarios per asset class (CALCULATED: net notional × move).
    const shocks = [-5, -3, -1, 1, 3, 5]
    const scenarios = byAssetClass.map((r) => ({ assetClass: r.key, net: r.net, pnl: shocks.map((s) => ({ shock: s, pnl: (r.net * s) / 100 })) }))

    return {
      fetchedAt: new Date().toISOString(),
      accounts, positions,
      exposure: { byAssetClass, bySymbol, byVenue, grossTotal, netTotal, equityTotal, leverage: equityTotal > 0 ? grossTotal / equityTotal : null, concentration, unpriced },
      scenarios, shocks,
      notes: [
        'Approximate USD: stablecoins 1:1, BTC/ETH and other majors via CoinGecko reference prices; FX/CFD notionals from contract size × mark (no cross-currency conversion).',
        'Venue positions are in each venue\'s own quantity unit (Deribit inverse perpetuals quote USD notional; linear venues quote coins).',
        'Shock scenarios are linear (net notional × move) — no convexity, no correlation, no funding. Research view, not a risk statement.',
      ],
    }
  })
}
