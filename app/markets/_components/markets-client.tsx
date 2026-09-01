'use client'

// EMIL TERMINAL — Global Markets. Free/open research feeds through the Data
// Provider Hub, every board labeled with its source, freshness and timestamp.
// RESEARCH DATA — never execution data.

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, Stat } from '@/components/cockpit/panel'
import { Globe2, Clock3, Bitcoin, DollarSign, CandlestickChart, RefreshCw } from 'lucide-react'
import WatchlistPanel from './watchlist-panel'

const CENTERS: { city: string; tz: string; open: number; close: number; days: number[] }[] = [
  { city: 'Sydney', tz: 'Australia/Sydney', open: 10, close: 16, days: [1, 2, 3, 4, 5] },
  { city: 'Tokyo', tz: 'Asia/Tokyo', open: 9, close: 15, days: [1, 2, 3, 4, 5] },
  { city: 'Hong Kong', tz: 'Asia/Hong_Kong', open: 9.5, close: 16, days: [1, 2, 3, 4, 5] },
  { city: 'Singapore', tz: 'Asia/Singapore', open: 9, close: 17, days: [1, 2, 3, 4, 5] },
  { city: 'Mumbai', tz: 'Asia/Kolkata', open: 9.25, close: 15.5, days: [1, 2, 3, 4, 5] },
  { city: 'Dubai', tz: 'Asia/Dubai', open: 10, close: 15, days: [1, 2, 3, 4, 5] },
  { city: 'Frankfurt', tz: 'Europe/Berlin', open: 9, close: 17.5, days: [1, 2, 3, 4, 5] },
  { city: 'London', tz: 'Europe/London', open: 8, close: 16.5, days: [1, 2, 3, 4, 5] },
  { city: 'New York', tz: 'America/New_York', open: 9.5, close: 16, days: [1, 2, 3, 4, 5] },
]

function centerStatus(c: typeof CENTERS[number], now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: c.tz, hour: 'numeric', minute: 'numeric', weekday: 'short', hour12: false }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const hour = parseInt(get('hour'), 10) + parseInt(get('minute'), 10) / 60
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  const clock = `${get('hour').padStart(2, '0')}:${get('minute')}`
  if (!c.days.includes(weekday)) return { clock, label: 'WEEKEND', tone: 'text-slate-500' }
  if (hour >= c.open && hour < c.close) return { clock, label: 'OPEN', tone: 'text-emerald-400' }
  if (hour >= c.open - 1 && hour < c.open) return { clock, label: 'PRE-MARKET', tone: 'text-cyan-400' }
  return { clock, label: 'CLOSED', tone: 'text-slate-500' }
}

const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString() : '—')
const pctTone = (v?: number | null) => (typeof v !== 'number' ? 'text-slate-500' : v >= 0 ? 'text-emerald-400' : 'text-red-400')
const fmtPctS = (v?: number | null) => (typeof v !== 'number' ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`)

function SourceTag({ text, freshness }: { text: string; freshness: string }) {
  const tone = freshness === 'realtime' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5' : freshness === 'delayed' ? 'text-amber-300 border-amber-500/30 bg-amber-500/5' : 'text-cyan-300 border-cyan-500/30 bg-cyan-500/5'
  return <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${tone}`}>{freshness}</span>
}

export default function MarketsClient() {
  const [now, setNow] = useState<Date | null>(null)
  const [board, setBoard] = useState<any>(null)
  const [fx, setFx] = useState<any>(null)
  const [crypto, setCrypto] = useState<any>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    const grab = async (fn: string, setter: (d: any) => void, label: string, retried = false) => {
      try {
        const res = await fetch(`/api/data?fn=${fn}`, { cache: 'no-store' })
        const d = await res.json()
        if (res.status === 429 && d?.retryAfterSec && !retried) {
          // Per-minute budget reached — this board retries itself once.
          const s = Math.ceil(d.retryAfterSec)
          setErrors((prev) => ({ ...prev, [label]: `Per-minute market-data budget reached — refreshing automatically in ~${s}s…` }))
          setTimeout(() => grab(fn, setter, label, true), (s + 1) * 1000)
          return
        }
        if (!res.ok) throw new Error(d?.message ?? d?.error ?? 'unavailable')
        setter(d)
        setErrors((prev) => ({ ...prev, [label]: '' }))
      } catch (e: any) {
        setErrors((prev) => ({ ...prev, [label]: e?.message ?? 'Feed unavailable.' }))
      }
    }
    await Promise.all([
      grab('market_board', setBoard, 'board'),
      grab('fx_rates&base=USD', setFx, 'fx'),
      grab('crypto_markets', setCrypto, 'crypto'),
    ])
    setRefreshing(false)
  }, [])

  useEffect(() => {
    setNow(new Date())
    load()
    const clock = setInterval(() => setNow(new Date()), 30_000)
    const data = setInterval(load, 120_000)
    return () => { clearInterval(clock); clearInterval(data) }
  }, [load])

  const groups: Record<string, any[]> = {}
  for (const q of board?.data ?? []) {
    if (!q.group) continue
    groups[q.group] = [...(groups[q.group] ?? []), q]
  }
  const FX_SHOW = ['EUR', 'GBP', 'JPY', 'INR', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD', 'AED']

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Globe2 className="h-5 w-5 text-cyan-400" /> Global Markets</h1>
          <p className="text-xs text-slate-500 mt-1">Research feeds from the Data Provider Hub — every board shows its source, freshness and timestamp. Research data only, never execution data.</p>
        </div>
        <button onClick={load} disabled={refreshing} className="flex items-center gap-1.5 rounded-md bg-slate-700/60 hover:bg-slate-600/60 disabled:opacity-50 text-slate-200 text-xs px-3 py-2 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Global market clock — computed locally, no data feed required */}
      <Panel title="Global Market Clock" icon={Clock3} accent="cyan">
        <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-9 gap-2">
          {now ? CENTERS.map((c) => {
            const s = centerStatus(c, now)
            return (
              <div key={c.city} className="rounded-md border border-border bg-background/40 p-2 text-center">
                <p className="text-[11px] font-semibold text-slate-200">{c.city}</p>
                <p className="num text-sm text-white mt-0.5">{s.clock}</p>
                <p className={`text-[9px] font-bold mt-0.5 ${s.tone}`}>{s.label}</p>
              </div>
            )
          }) : <LoadingPanel text="Loading clock..." />}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Cash-equity core sessions, local exchange time. Holiday calendars are not yet applied — see the India hub for NSE/BSE/MCX holiday-aware sessions.</p>
      </Panel>

      {/* Personal watchlist */}
      <WatchlistPanel />

      {/* Indices / metals / energy — research quotes */}
      <Panel title="Indices · Metals · Energy — research quotes" icon={CandlestickChart} accent="amber">
        {errors.board ? <p className="text-xs text-amber-300">{errors.board}</p> : !board ? <LoadingPanel text="Loading market board..." /> : board.needsKey ? (
          <p className="text-xs text-amber-300">{board.message}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {Object.entries(groups).map(([g, rows]) => (
                <div key={g} className="rounded-md border border-border bg-background/40 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{g}</p>
                  <div className="space-y-1">
                    {rows.map((q: any) => (
                      <div key={q.symbol} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-300 truncate">{q.label}</span>
                        {q.available ? (
                          <span className="num text-[11px] text-white">{q.price?.toLocaleString()} <b className={pctTone(q.changePct)}>{fmtPctS(q.changePct)}</b></span>
                        ) : <span className="text-[10px] text-slate-600">unavailable</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-2 flex-wrap">
              <SourceTag text="stooq" freshness="delayed" /> {board.attribution} · change vs session open · fetched {fmtTime(board.fetchedAt)}
            </p>
          </>
        )}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* FX — ECB daily reference via Frankfurter */}
        <Panel title="FX — USD reference rates" icon={DollarSign} accent="emerald">
          {errors.fx ? <p className="text-xs text-amber-300">{errors.fx}</p> : !fx ? <LoadingPanel text="Loading FX..." /> : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {FX_SHOW.filter((c) => fx.data?.[c]).map((c) => (
                  <Stat key={c} size="sm" label={`USD/${c}`} value={Number(fx.data[c]).toLocaleString(undefined, { maximumFractionDigits: 4 })} />
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-2 flex-wrap">
                <SourceTag text="ecb" freshness="daily" /> {fx.attribution} · reference date {fx.referenceDate} · fetched {fmtTime(fx.fetchedAt)}. Daily fixing — NOT a live tradable price.
              </p>
            </>
          )}
        </Panel>

        {/* Crypto — CoinGecko */}
        <Panel title="Crypto — top market caps" icon={Bitcoin} accent="violet">
          {errors.crypto ? <p className="text-xs text-amber-300">{errors.crypto}</p> : !crypto ? <LoadingPanel text="Loading crypto..." /> : (
            <>
              <div className="overflow-x-auto scrollbar-thin max-h-80 overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                      <th className="py-1 pr-3">Asset</th><th className="py-1 pr-3 text-right">Price</th><th className="py-1 pr-3 text-right">24h</th><th className="py-1 pr-3 text-right">7d</th><th className="py-1 text-right">Mkt Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(crypto.data ?? []).slice(0, 15).map((c: any) => (
                      <tr key={c.id} className="border-b border-border/40">
                        <td className="py-1.5 pr-3 text-[11px] text-slate-200">{c.name} <span className="text-slate-500">{c.symbol}</span></td>
                        <td className="py-1.5 pr-3 num text-[11px] text-white text-right">${c.price?.toLocaleString()}</td>
                        <td className={`py-1.5 pr-3 num text-[11px] text-right ${pctTone(c.change24hPct)}`}>{fmtPctS(c.change24hPct)}</td>
                        <td className={`py-1.5 pr-3 num text-[11px] text-right ${pctTone(c.change7dPct)}`}>{fmtPctS(c.change7dPct)}</td>
                        <td className="py-1.5 num text-[10px] text-slate-400 text-right">${(c.marketCap / 1e9).toFixed(1)}B</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-2 flex-wrap">
                <SourceTag text="coingecko" freshness="realtime" /> {crypto.attribution} · fetched {fmtTime(crypto.fetchedAt)}
              </p>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
