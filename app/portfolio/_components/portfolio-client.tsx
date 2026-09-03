'use client'

// Portfolio & Exposure (spec §28–29) — every account EMIL can see (the EMIL
// account + linked venues) consolidated into one exposure map with linear
// shock scenarios. CALCULATED, approximate USD, research view.

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Briefcase, RefreshCw, PieChart, Layers, Activity, AlertTriangle } from 'lucide-react'

type Data = {
  fetchedAt: string
  accounts: { source: string; key: string; label: string; paper: boolean; currency: string; balanceUsd: number | null; equityUsd: number | null; unconverted: { asset: string; total: number }[]; positions: number; error: string | null }[]
  positions: { source: string; venue: string; paper: boolean; symbol: string; canonical: string; assetClass: string; qty: number; side: string; entry: number | null; mark: number | null; upnl: number | null; notionalUsd: number | null }[]
  exposure: { byAssetClass: Agg[]; bySymbol: Agg[]; byVenue: Agg[]; grossTotal: number; netTotal: number; equityTotal: number; leverage: number | null; concentration: number; unpriced: number }
  scenarios: { assetClass: string; net: number; pnl: { shock: number; pnl: number }[] }[]
  shocks: number[]
  notes: string[]
  cached?: boolean; stale?: boolean
}
type Agg = { key: string; gross: number; net: number; count: number }

const usd = (n: number | null | undefined, d = 0) => (n === null || n === undefined || !isFinite(n) ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: d }))

export default function PortfolioClient() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (refresh = false) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/portfolio${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      setData(d); setError('')
    } catch (e: any) {
      setError(e?.message ?? 'Portfolio unavailable')
    } finally { setBusy(false) }
  }, [])
  useEffect(() => { load() }, [load])

  if (error && !data) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Consolidating accounts and venues…" /></div>

  const ex = data.exposure
  const bar = (v: number, max: number) => `${Math.max(2, Math.min(100, (v / (max || 1)) * 100))}%`
  const maxGross = ex.byAssetClass[0]?.gross ?? 0

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Briefcase className="h-5 w-5 text-cyan-400" /> Portfolio &amp; Exposure</h1>
          <p className="text-xs text-slate-500 mt-1">Every account EMIL can see — the EMIL account plus each venue you linked with an API key — consolidated into one exposure map. Approximate USD, calculated, research view.</p>
        </div>
        <button onClick={() => load(true)} disabled={busy} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh venues</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Equity (approx USD)" value={usd(ex.equityTotal)} valueClass="text-cyan-300" />
        <Stat label="Gross exposure" value={usd(ex.grossTotal)} />
        <Stat label="Net exposure" value={`${ex.netTotal >= 0 ? '+' : ''}${usd(ex.netTotal)}`} valueClass={ex.netTotal >= 0 ? 'text-emerald-300' : 'text-red-300'} />
        <Stat label="Gross / equity" value={ex.leverage === null ? '—' : `${ex.leverage.toFixed(2)}×`} valueClass={ex.leverage !== null && ex.leverage > 3 ? 'text-amber-300' : 'text-slate-200'} />
        <Stat label="Top-symbol concentration" value={`${(ex.concentration * 100).toFixed(0)}%`} valueClass={ex.concentration > 0.5 ? 'text-amber-300' : 'text-slate-200'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title={`Accounts · ${data.accounts.length}`} icon={Layers} accent="cyan">
          <div className="space-y-2">
            {data.accounts.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 font-semibold truncate">{a.label} <span className={`ml-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${a.paper ? 'text-amber-300 border-amber-500/40 bg-amber-500/10' : 'text-red-300 border-red-500/40 bg-red-500/10'}`}>{a.paper ? 'paper / demo' : 'live'}</span></p>
                  <p className="text-[10px] text-slate-500">{a.positions} position{a.positions === 1 ? '' : 's'}{a.unconverted.length ? ` · unconverted: ${a.unconverted.map((u) => `${u.total} ${u.asset}`).join(', ')}` : ''}{a.error ? <span className="text-red-300"> · {a.error}</span> : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="num text-sm text-white">{usd(a.equityUsd ?? a.balanceUsd)}</p>
                  <p className="text-[10px] text-slate-500">{a.equityUsd !== null ? 'equity' : a.balanceUsd !== null ? 'balance' : 'no USD value'}</p>
                </div>
              </div>
            ))}
            {data.accounts.length === 0 ? <p className="text-xs text-slate-500">No accounts yet — link a venue on the Global API Hub (an API key + secret at any tier is enough to read balances).</p> : null}
          </div>
        </Panel>

        <Panel title="Exposure by asset class" icon={PieChart} accent="amber">
          {ex.byAssetClass.length === 0 ? <p className="text-xs text-slate-500">No priced open positions.</p> : (
            <div className="space-y-2">
              {ex.byAssetClass.map((r) => (
                <div key={r.key}>
                  <div className="flex items-center justify-between text-[11px]"><span className="text-slate-200 capitalize">{r.key} <span className="text-slate-500">· {r.count}</span></span><span className="num text-slate-300">gross {usd(r.gross)} · net <b className={r.net >= 0 ? 'text-emerald-300' : 'text-red-300'}>{r.net >= 0 ? '+' : ''}{usd(r.net)}</b></span></div>
                  <div className="h-1.5 rounded bg-slate-800 mt-1"><div className="h-1.5 rounded bg-amber-500/70" style={{ width: bar(r.gross, maxGross) }} /></div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">By venue</p>
                  {ex.byVenue.map((r) => <p key={r.key} className="text-[11px] text-slate-300 flex justify-between"><span>{r.key}</span><span className="num">{usd(r.gross)}</span></p>)}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Top symbols</p>
                  {ex.bySymbol.slice(0, 6).map((r) => <p key={r.key} className="text-[11px] text-slate-300 flex justify-between"><span className="num">{r.key}</span><span className="num">{usd(r.gross)}</span></p>)}
                </div>
              </div>
              {ex.unpriced ? <p className="text-[10px] text-amber-300 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {ex.unpriced} position{ex.unpriced === 1 ? '' : 's'} without a mark price are excluded from the map.</p> : null}
            </div>
          )}
        </Panel>
      </div>

      <Panel title={`Open positions · ${data.positions.length}`} icon={Activity} accent="emerald">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">Venue</th><th className="py-1.5 pr-3">Symbol</th><th className="py-1.5 pr-3">Class</th><th className="py-1.5 pr-3">Side</th><th className="py-1.5 pr-3 text-right">Qty</th><th className="py-1.5 pr-3 text-right">Entry</th><th className="py-1.5 pr-3 text-right">Mark</th><th className="py-1.5 pr-3 text-right">Unrealised</th><th className="py-1.5 text-right">Notional (USD)</th></tr></thead>
            <tbody>
              {data.positions.map((p, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="py-1.5 pr-3 text-[11px] text-slate-300">{p.venue}{p.paper ? <span className="ml-1 text-[9px] text-amber-300">paper</span> : null}</td>
                  <td className="py-1.5 pr-3 num text-[11px] text-white">{p.symbol}{p.canonical !== p.symbol.toUpperCase() ? <span className="ml-1 text-[9px] text-slate-500">{p.canonical}</span> : null}</td>
                  <td className="py-1.5 pr-3 text-[10px] text-slate-400 capitalize">{p.assetClass}</td>
                  <td className={`py-1.5 pr-3 text-[10px] font-bold uppercase ${p.side === 'long' ? 'text-emerald-300' : 'text-red-300'}`}>{p.side}</td>
                  <td className="py-1.5 pr-3 num text-[11px] text-slate-300 text-right">{Math.abs(p.qty)}</td>
                  <td className="py-1.5 pr-3 num text-[11px] text-slate-400 text-right">{p.entry ?? '—'}</td>
                  <td className="py-1.5 pr-3 num text-[11px] text-slate-400 text-right">{p.mark ?? '—'}</td>
                  <td className={`py-1.5 pr-3 num text-[11px] text-right ${(p.upnl ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{p.upnl === null ? '—' : usd(p.upnl, 2)}</td>
                  <td className="py-1.5 num text-[11px] text-slate-200 text-right">{usd(p.notionalUsd)}</td>
                </tr>
              ))}
              {data.positions.length === 0 ? <tr><td colSpan={9} className="py-6 text-center text-xs text-slate-500">No open positions across your accounts.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Shock scenarios — linear, per asset class" icon={AlertTriangle} accent="violet">
        {data.scenarios.length === 0 ? <p className="text-xs text-slate-500">Scenarios appear once there are priced open positions.</p> : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left">
              <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">Asset class</th><th className="py-1.5 pr-3 text-right">Net notional</th>{data.shocks.map((s) => <th key={s} className="py-1.5 pr-3 text-right">{s > 0 ? '+' : ''}{s}%</th>)}</tr></thead>
              <tbody>
                {data.scenarios.map((r) => (
                  <tr key={r.assetClass} className="border-b border-border/40">
                    <td className="py-1.5 pr-3 text-[11px] text-slate-200 capitalize">{r.assetClass}</td>
                    <td className={`py-1.5 pr-3 num text-[11px] text-right ${r.net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{r.net >= 0 ? '+' : ''}{usd(r.net)}</td>
                    {r.pnl.map((c) => <td key={c.shock} className={`py-1.5 pr-3 num text-[11px] text-right ${c.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{c.pnl >= 0 ? '+' : ''}{usd(c.pnl)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ul className="mt-3 space-y-0.5 text-[10px] text-slate-500 list-disc pl-4">{data.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        <p className="text-[10px] text-slate-500 mt-1">Fetched {new Date(data.fetchedAt).toLocaleTimeString()}{data.cached ? ' · cached ≤60 s' : ''}{data.stale ? ' · STALE' : ''}.</p>
      </Panel>
    </div>
  )
}
