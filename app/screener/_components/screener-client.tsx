'use client'

// Equity screener (spec §22–23) over the instrument master's US companies.
// Reads what the hub already holds; "Scan" pulls more SEC summaries, "Fetch
// prices" spends a few research credits per click and backs off honestly.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { Filter, RefreshCw, Database, Coins, ArrowUpDown } from 'lucide-react'

type Row = {
  symbol: string; name: string; exchange: string; cik: number | null
  fundamentals: { asOf: string | null; revenueTtm: number | null; netIncomeTtm: number | null; epsTtm: number | null; revenueYoY: number | null; netIncomeYoY: number | null; netMargin: number | null; ocfMargin: number | null; debtToEquity: number | null; ageSec: number } | null
  price: { last: number; asOf: string; ret1m: number | null; ret3m: number | null; ret1y: number | null; vol20: number | null; rangePos: number; rsi14: number | null; aboveSma200: boolean | null } | null
  valuation: { marketCap: number | null; pe: number | null; ps: number | null; pb: number | null }
  status: 'ready' | 'needs_fundamentals' | 'needs_price' | 'needs_both' | 'not_sec_registrant'
}
type Data = { rows: Row[]; counts: { total: number; ready: number; needsFundamentals: number; needsPrice: number }; fetchedAt: string; edgarMapReady: boolean }

const big = (n: number | null | undefined) => { if (n === null || n === undefined || !isFinite(n)) return '—'; const a = Math.abs(n); return a >= 1e12 ? `${(n / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(n / 1e6).toFixed(0)}M` : n.toFixed(0) }
const pct = (n: number | null | undefined) => (n === null || n === undefined || !isFinite(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`)
const num = (n: number | null | undefined, d = 1) => (n === null || n === undefined || !isFinite(n) ? '—' : n.toFixed(d))
const tone = (n: number | null | undefined) => (n === null || n === undefined ? 'text-slate-400' : n >= 0 ? 'text-emerald-300' : 'text-red-300')

type SortKey = 'symbol' | 'marketCap' | 'pe' | 'ps' | 'revenueYoY' | 'netMargin' | 'ret1y' | 'ret3m' | 'rsi14' | 'debtToEquity'
const get = (r: Row, k: SortKey): number | string | null => {
  switch (k) {
    case 'symbol': return r.symbol
    case 'marketCap': return r.valuation.marketCap
    case 'pe': return r.valuation.pe
    case 'ps': return r.valuation.ps
    case 'revenueYoY': return r.fundamentals?.revenueYoY ?? null
    case 'netMargin': return r.fundamentals?.netMargin ?? null
    case 'ret1y': return r.price?.ret1y ?? null
    case 'ret3m': return r.price?.ret3m ?? null
    case 'rsi14': return r.price?.rsi14 ?? null
    case 'debtToEquity': return r.fundamentals?.debtToEquity ?? null
  }
}

export default function ScreenerClient() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'' | 'scan' | 'prices' | 'load'>('')
  const [msg, setMsg] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'marketCap', dir: -1 })
  const [flt, setFlt] = useState({ minRevYoY: '', minMargin: '', maxPe: '', minRet1y: '', aboveSma200: false, readyOnly: false })

  const load = useCallback(async () => {
    setBusy('load')
    try {
      const res = await fetch('/api/company?fn=screener', { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      setData(d); setError('')
    } catch (e: any) { setError(e?.message ?? 'Screener unavailable') } finally { setBusy('') }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (countdown <= 0) return; const t = setTimeout(() => setCountdown((c) => c - 1), 1000); return () => clearTimeout(t) }, [countdown])

  const act = async (type: 'scan' | 'prices') => {
    setBusy(type); setMsg('')
    try {
      const res = await fetch('/api/company', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, n: 4 }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      if (type === 'scan') setMsg(`SEC summaries pulled: ${d.scanned.join(', ') || 'none'}${d.failed?.length ? ` · failed: ${d.failed.map((f: any) => `${f.symbol} (${f.error})`).join('; ')}` : ''} · ${d.remaining} still unscanned.`)
      else {
        if (d.rateLimited) { setCountdown(Math.min(90, d.retryAfterSec ?? 60)); setMsg(d.daily ? 'Daily market-data budget reached — prices resume at 00:00 UTC.' : `Per-minute market-data budget reached — try again in ~${d.retryAfterSec ?? 60}s.`) }
        else setMsg(`Series fetched: ${d.fetched.join(', ') || 'none'}${d.failed?.length ? ` · failed: ${d.failed.map((f: any) => `${f.symbol} (${f.error})`).join('; ')}` : ''} · ${d.remaining} without prices.`)
      }
      await load()
    } catch (e: any) { setMsg(e?.message ?? 'Request failed') } finally { setBusy('') }
  }

  const rows = useMemo(() => {
    if (!data) return []
    const n = (s: string) => (s.trim() === '' ? null : Number(s))
    const minRev = n(flt.minRevYoY), minM = n(flt.minMargin), maxPe = n(flt.maxPe), minR = n(flt.minRet1y)
    const out = data.rows.filter((r) => {
      if (flt.readyOnly && r.status !== 'ready') return false
      if (minRev !== null && !((r.fundamentals?.revenueYoY ?? -Infinity) >= minRev)) return false
      if (minM !== null && !((r.fundamentals?.netMargin ?? -Infinity) >= minM)) return false
      if (maxPe !== null && !(r.valuation.pe !== null && r.valuation.pe <= maxPe)) return false
      if (minR !== null && !((r.price?.ret1y ?? -Infinity) >= minR)) return false
      if (flt.aboveSma200 && r.price?.aboveSma200 !== true) return false
      return true
    })
    out.sort((a, b) => {
      const va = get(a, sort.key), vb = get(b, sort.key)
      if (va === null && vb === null) return 0
      if (va === null) return 1
      if (vb === null) return -1
      return (typeof va === 'string' ? va.localeCompare(String(vb)) : (va as number) - (vb as number)) * sort.dir
    })
    return out
  }, [data, flt, sort])

  const th = (label: string, key: SortKey, right = true) => (
    <th className={`py-1.5 pr-3 ${right ? 'text-right' : ''} cursor-pointer select-none hover:text-slate-300`} onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))}>
      {label}{sort.key === key ? <ArrowUpDown className="inline h-3 w-3 ml-0.5 text-cyan-400" /> : null}
    </th>
  )

  if (error && !data) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Reading cached fundamentals and series…" /></div>

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Filter className="h-5 w-5 text-cyan-400" /> Equity Screener</h1>
          <p className="text-xs text-slate-500 mt-1">US companies in the instrument master, screened on SEC XBRL fundamentals and hub price statistics. Rows say what is still missing rather than guessing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => act('scan')} disabled={!!busy || !data.edgarMapReady} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 disabled:opacity-50"><Database className={`h-3.5 w-3.5 ${busy === 'scan' ? 'animate-pulse' : ''}`} /> Scan 4 more (SEC, free)</button>
          <button onClick={() => act('prices')} disabled={!!busy || countdown > 0} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 disabled:opacity-50"><Coins className={`h-3.5 w-3.5 ${busy === 'prices' ? 'animate-pulse' : ''}`} /> {countdown > 0 ? `Prices in ${countdown}s` : 'Fetch 4 prices (4 credits)'}</button>
          <button onClick={load} disabled={!!busy} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy === 'load' ? 'animate-spin' : ''}`} /> Reload</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">{data.counts.ready} ready</span>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-300">{data.counts.needsFundamentals} need SEC scan</span>
        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-cyan-300">{data.counts.needsPrice} need prices</span>
        <span className="text-slate-500 self-center">{data.counts.total} companies in the universe{!data.edgarMapReady ? ' · SEC ticker registry unreachable right now' : ''}</span>
      </div>
      {msg ? <p className="text-[11px] text-slate-300 rounded-md border border-border bg-background/40 px-3 py-2">{msg}</p> : null}

      <Panel title="Filters" icon={Filter} accent="amber">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
          {([['minRevYoY', 'Min revenue YoY %'], ['minMargin', 'Min net margin %'], ['maxPe', 'Max P/E'], ['minRet1y', 'Min 1Y return %']] as const).map(([k, label]) => (
            <label key={k} className="text-[10px] uppercase tracking-wider text-slate-500">{label}<input value={(flt as any)[k]} onChange={(e) => setFlt({ ...flt, [k]: e.target.value })} inputMode="decimal" className="mt-1 w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs text-white num focus:outline-none focus:border-cyan-500/60" placeholder="any" /></label>
          ))}
          <label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={flt.aboveSma200} onChange={(e) => setFlt({ ...flt, aboveSma200: e.target.checked })} /> Above SMA200</label>
          <label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={flt.readyOnly} onChange={(e) => setFlt({ ...flt, readyOnly: e.target.checked })} /> Complete rows only</label>
        </div>
      </Panel>

      <Panel title={`Results · ${rows.length}`} icon={Database} accent="cyan">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
              {th('Company', 'symbol', false)}{th('Mkt cap', 'marketCap')}{th('P/E', 'pe')}{th('P/S', 'ps')}{th('Rev YoY', 'revenueYoY')}{th('Net margin', 'netMargin')}{th('D/E', 'debtToEquity')}{th('3M', 'ret3m')}{th('1Y', 'ret1y')}{th('RSI', 'rsi14')}<th className="py-1.5 text-right">Status</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="border-b border-border/40 hover:bg-secondary/30">
                  <td className="py-1.5 pr-3 text-[11px]"><Link href={`/company?symbol=${r.symbol}`} className="text-white hover:text-cyan-300 num font-semibold">{r.symbol}</Link> <span className="text-slate-500 hidden md:inline">{r.name}</span></td>
                  <td className="py-1.5 pr-3 text-[11px] num text-right text-slate-200">{big(r.valuation.marketCap)}</td>
                  <td className="py-1.5 pr-3 text-[11px] num text-right text-slate-200">{num(r.valuation.pe)}</td>
                  <td className="py-1.5 pr-3 text-[11px] num text-right text-slate-200">{num(r.valuation.ps)}</td>
                  <td className={`py-1.5 pr-3 text-[11px] num text-right ${tone(r.fundamentals?.revenueYoY)}`}>{pct(r.fundamentals?.revenueYoY)}</td>
                  <td className={`py-1.5 pr-3 text-[11px] num text-right ${tone(r.fundamentals?.netMargin)}`}>{pct(r.fundamentals?.netMargin)}</td>
                  <td className="py-1.5 pr-3 text-[11px] num text-right text-slate-300">{num(r.fundamentals?.debtToEquity, 2)}</td>
                  <td className={`py-1.5 pr-3 text-[11px] num text-right ${tone(r.price?.ret3m)}`}>{pct(r.price?.ret3m)}</td>
                  <td className={`py-1.5 pr-3 text-[11px] num text-right ${tone(r.price?.ret1y)}`}>{pct(r.price?.ret1y)}</td>
                  <td className="py-1.5 pr-3 text-[11px] num text-right text-slate-300">{num(r.price?.rsi14, 0)}{r.price ? <span className={`ml-1 text-[9px] ${r.price.aboveSma200 ? 'text-emerald-400' : 'text-red-400'}`}>{r.price.aboveSma200 === null ? '' : r.price.aboveSma200 ? '↑200' : '↓200'}</span> : null}</td>
                  <td className="py-1.5 text-right"><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${r.status === 'ready' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : r.status === 'not_sec_registrant' ? 'text-slate-400 border-slate-600 bg-slate-800/40' : 'text-amber-300 border-amber-500/40 bg-amber-500/10'}`}>{r.status.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={11} className="py-6 text-center text-xs text-slate-500">No rows match — loosen a filter, scan more companies or fetch prices.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Fundamentals: SEC XBRL company facts (TTM = last four calendar quarters). Prices: delayed hub series, statistics calculated by EMIL. Market cap = cover-page shares × last price. Missing cells are missing, never estimated.</p>
      </Panel>
    </div>
  )
}
