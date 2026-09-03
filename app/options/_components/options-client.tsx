'use client'

// Options terminal (spec §25) on Deribit's public book summary: chain,
// ATM IV term structure, put/call open interest, max pain, strike skew.
// RESEARCH — calculated from venue marks, never an execution feed.

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, Stat } from '@/components/cockpit/panel'
import { Sigma, RefreshCw, Layers, Activity } from 'lucide-react'

const fmt = (n?: number | null, d = 2) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: d }))
const fmtK = (n?: number | null) => (n === null || n === undefined ? '—' : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : n.toFixed(1))

export default function OptionsClient() {
  const [currency, setCurrency] = useState<'BTC' | 'ETH'>('BTC')
  const [expiry, setExpiry] = useState('')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ fn: 'options_chain', currency })
      if (expiry) qs.set('expiry', expiry)
      const res = await fetch(`/api/data?${qs}`, { cache: 'no-store' })
      const d = await res.json().catch(() => null)
      if (!res.ok) { setError(d?.message ?? d?.error ?? 'Options data unavailable'); return }
      if (d?.disabled) { setData({ disabled: true }); return }
      setData(d)
      if (!expiry && d?.selectedExpiry) setExpiry(d.selectedExpiry)
    } finally {
      setLoading(false)
    }
  }, [currency, expiry])

  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])

  if (loading && !data) return <LoadingPanel text="Loading the options book…" />
  if (data?.disabled) return <Panel title="Options Analytics" icon={Sigma} accent="violet"><p className="text-sm text-slate-400">Options analytics is switched off by the platform owner (feature flag <span className="font-mono">options_analytics</span>).</p></Panel>

  const sel = (data?.expiries ?? []).find((e: any) => e.expiry === data?.selectedExpiry)
  const maxIv = Math.max(1, ...(data?.expiries ?? []).map((e: any) => e.atmIv ?? 0))
  const spot = data?.underlying ?? sel?.underlying

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['BTC', 'ETH'] as const).map((c) => (
          <button key={c} onClick={() => { setCurrency(c); setExpiry('') }} className={`rounded-md border px-3 py-1.5 text-xs font-bold ${currency === c ? 'border-violet-500/60 bg-violet-500/15 text-violet-200' : 'border-border bg-secondary/50 text-slate-400'}`}>{c} options</button>
        ))}
        <span className="text-[11px] text-slate-500 ml-2">Deribit · {fmt(data?.totals?.instruments, 0)} listed contracts · fetched {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : '—'}{data?.stale ? ' · STALE' : ''}</span>
        <button onClick={load} className="ml-auto rounded-md border border-border bg-secondary/60 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-500/50 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Refresh</button>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label={`${currency} underlying`} value={`$${fmt(spot, 0)}`} />
        <Stat label="ATM IV (selected)" value={`${fmt(sel?.atmIv, 1)}%`} valueClass="text-violet-300" />
        <Stat label="Put / Call OI" value={fmt(sel?.putCallOi, 2)} sub={`${fmtK(sel?.putOi)} / ${fmtK(sel?.callOi)} ${currency}`} />
        <Stat label="Max pain" value={`$${fmt(sel?.maxPain, 0)}`} sub="strike minimising payout" />
        <Stat label="Skew 90/110" value={`${sel?.skew90_110 === null || sel?.skew90_110 === undefined ? '—' : (sel.skew90_110 >= 0 ? '+' : '') + sel.skew90_110.toFixed(1)} pts`} sub="put IV − call IV" valueClass={(sel?.skew90_110 ?? 0) > 0 ? 'text-amber-300' : 'text-cyan-300'} />
        <Stat label="Total OI (all expiries)" value={`${fmtK((data?.totals?.callOi ?? 0) + (data?.totals?.putOi ?? 0))} ${currency}`} sub={`P/C ${fmt(data?.totals?.callOi ? data.totals.putOi / data.totals.callOi : null, 2)}`} />
      </div>

      <Panel title="Term structure — ATM implied volatility by expiry" icon={Activity} accent="violet">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(data?.expiries ?? []).map((e: any) => (
            <button key={e.expiry} onClick={() => setExpiry(e.expiry)} className={`shrink-0 w-24 rounded-lg border p-2 text-left ${e.expiry === data?.selectedExpiry ? 'border-violet-500/60 bg-violet-500/10' : 'border-border bg-secondary/40 hover:border-violet-500/40'}`}>
              <div className="text-[10px] font-mono text-slate-300">{e.expiry}</div>
              <div className="text-[9px] text-slate-500">{e.daysToExpiry < 1 ? `${Math.round(e.daysToExpiry * 24)}h` : `${Math.round(e.daysToExpiry)}d`} · {e.strikes} strikes</div>
              <div className="mt-1 h-10 flex items-end"><div className="w-full rounded-sm bg-violet-500/50" style={{ height: `${Math.max(4, ((e.atmIv ?? 0) / maxIv) * 100)}%` }} /></div>
              <div className="text-[11px] font-semibold text-violet-200">{fmt(e.atmIv, 1)}%</div>
              <div className="text-[9px] text-slate-500">P/C {fmt(e.putCallOi, 2)} · pain {fmt(e.maxPain, 0)}</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={`Chain — ${currency} ${data?.selectedExpiry ?? ''}`} icon={Layers} accent="cyan">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="py-1.5 pr-2 text-right">C bid</th><th className="py-1.5 pr-2 text-right">C ask</th><th className="py-1.5 pr-2 text-right">C mark $</th><th className="py-1.5 pr-2 text-right">C IV</th><th className="py-1.5 pr-2 text-right">C OI</th>
                <th className="py-1.5 px-3 text-center bg-secondary/40">Strike</th>
                <th className="py-1.5 pl-2 text-right">P OI</th><th className="py-1.5 pl-2 text-right">P IV</th><th className="py-1.5 pl-2 text-right">P mark $</th><th className="py-1.5 pl-2 text-right">P bid</th><th className="py-1.5 pl-2 text-right">P ask</th>
              </tr>
            </thead>
            <tbody>
              {(data?.chain ?? []).map((row: any) => {
                const atm = spot && Math.abs(row.strike - spot) / spot < 0.02
                const itmC = spot && row.strike < spot
                return (
                  <tr key={row.strike} className={`border-b border-border/40 font-mono ${atm ? 'bg-violet-500/10' : ''}`}>
                    <td className={`py-1 pr-2 text-right ${itmC ? 'text-emerald-300/80' : 'text-slate-300'}`}>{fmt(row.call?.bid, 4)}</td>
                    <td className={`py-1 pr-2 text-right ${itmC ? 'text-emerald-300/80' : 'text-slate-300'}`}>{fmt(row.call?.ask, 4)}</td>
                    <td className="py-1 pr-2 text-right text-white">{fmt(row.call?.markUsd, 0)}</td>
                    <td className="py-1 pr-2 text-right text-violet-300">{fmt(row.call?.iv, 1)}</td>
                    <td className="py-1 pr-2 text-right text-slate-400">{fmtK(row.call?.oi)}</td>
                    <td className="py-1 px-3 text-center font-bold text-white bg-secondary/40">{row.strike.toLocaleString()}</td>
                    <td className="py-1 pl-2 text-right text-slate-400">{fmtK(row.put?.oi)}</td>
                    <td className="py-1 pl-2 text-right text-violet-300">{fmt(row.put?.iv, 1)}</td>
                    <td className="py-1 pl-2 text-right text-white">{fmt(row.put?.markUsd, 0)}</td>
                    <td className={`py-1 pl-2 text-right ${!itmC ? 'text-red-300/80' : 'text-slate-300'}`}>{fmt(row.put?.bid, 4)}</td>
                    <td className={`py-1 pl-2 text-right ${!itmC ? 'text-red-300/80' : 'text-slate-300'}`}>{fmt(row.put?.ask, 4)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">{data?.attribution} Bid/ask in {currency}; mark shown in USD.</p>
      </Panel>
    </div>
  )
}
