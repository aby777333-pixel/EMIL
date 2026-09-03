'use client'

// Backtest Engine — real historical candles (Deribit / Gemini free, Twelve
// Data keyed), deterministic rules, honest metrics. Optionally journals the
// run against a Strategy Lab blueprint as dataMode "historical".

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Panel, LoadingPanel, Stat } from '@/components/cockpit/panel'
import { FlaskConical, Play, History, LineChart, ListOrdered } from 'lucide-react'

const fmt = (n?: number | null, d = 2) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: d }))
const VERDICT: Record<string, string> = { pass: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', weak: 'text-amber-300 border-amber-500/40 bg-amber-500/10', fail: 'text-red-300 border-red-500/40 bg-red-500/10' }

function EquityChart({ points, initial }: { points: { time: number; equity: number }[]; initial: number }) {
  if (!points.length) return null
  const w = 800, h = 180, pad = 8
  const min = Math.min(initial, ...points.map((p) => p.equity)), max = Math.max(initial, ...points.map((p) => p.equity))
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (w - 2 * pad)
  const y = (v: number) => h - pad - ((v - min) / Math.max(1e-9, max - min)) * (h - 2 * pad)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.equity).toFixed(1)}`).join(' ')
  const last = points[points.length - 1].equity
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
      <line x1={pad} x2={w - pad} y1={y(initial)} y2={y(initial)} stroke="currentColor" className="text-slate-600" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="currentColor" className={last >= initial ? 'text-emerald-400' : 'text-red-400'} strokeWidth={1.5} />
    </svg>
  )
}

export default function BacktestClient() {
  const params = useSearchParams()
  const [meta, setMeta] = useState<any>(null)
  const [source, setSource] = useState('deribit')
  const [symbol, setSymbol] = useState('BTC-PERPETUAL')
  const [interval, setInterval_] = useState('1h')
  const [bars, setBars] = useState('1000')
  const [strategy, setStrategy] = useState('sma_cross')
  const [p, setP] = useState<Record<string, string>>({})
  const [allowShort, setAllowShort] = useState(true)
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [fee, setFee] = useState('5')
  const [slip, setSlip] = useState('2')
  const [blueprintId, setBlueprintId] = useState(params.get('blueprint') ?? '')
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/backtest')
    const d = await res.json().catch(() => null)
    if (res.ok) setMeta(d)
  }, [])
  useEffect(() => { load() }, [load])

  const def = useMemo(() => (meta?.strategies ?? []).find((s: any) => s.key === strategy), [meta, strategy])
  useEffect(() => {
    if (!def) return
    setP(Object.fromEntries(def.params.map((x: any) => [x.key, String(x.default)])))
  }, [def])
  useEffect(() => {
    const bp = (meta?.blueprints ?? []).find((b: any) => b.id === blueprintId)
    if (bp?.instruments && /btc|eth/i.test(bp.instruments)) setSymbol(/eth/i.test(bp.instruments) ? 'ETH-PERPETUAL' : 'BTC-PERPETUAL')
  }, [blueprintId, meta])

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, symbol, interval, bars: Number(bars), strategy, params: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Number(v)])), allowShort, stopLossPct: sl ? Number(sl) : null, takeProfitPct: tp ? Number(tp) : null, feeBps: Number(fee), slippageBps: Number(slip), blueprintId: blueprintId || null }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(d?.error ?? 'Backtest failed'); return }
      setResult(d)
      toast.success(`${d.verdict.toUpperCase()} — ${d.metrics.trades} trades on ${d.metrics.bars} bars`)
      if (d.labRunId) load()
    } finally {
      setBusy(false)
    }
  }

  if (!meta) return <LoadingPanel text="Loading the backtest engine…" />
  const m = result?.metrics

  return (
    <div className="space-y-4">
      <Panel title="Backtest Engine — real history" icon={FlaskConical} accent="violet">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-500">Data</label>
            <select value={source} onChange={(e) => { setSource(e.target.value); const s = (meta.sources ?? []).find((x: any) => x.key === e.target.value); if (s?.examples?.[0]) setSymbol(s.examples[0]) }} className="w-full rounded-md bg-secondary/60 border border-border px-2 py-1.5 text-xs text-white">
              {(meta.sources ?? []).map((s: any) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <p className="text-[10px] text-slate-500">{(meta.sources ?? []).find((s: any) => s.key === source)?.note}</p>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" className="w-full rounded-md bg-secondary/60 border border-border px-2 py-1.5 text-xs text-white font-mono" />
            <div className="flex gap-1.5">
              {['15m', '1h', '4h', '1d'].map((iv) => <button key={iv} onClick={() => setInterval_(iv)} className={`flex-1 rounded-md border px-2 py-1 text-[11px] ${interval === iv ? 'border-violet-500/60 bg-violet-500/10 text-violet-200' : 'border-border bg-secondary/50 text-slate-400'}`}>{iv}</button>)}
            </div>
            <input value={bars} onChange={(e) => setBars(e.target.value)} inputMode="numeric" placeholder="Bars (50–2000)" className="w-full rounded-md bg-secondary/60 border border-border px-2 py-1.5 text-xs text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-500">Strategy</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="w-full rounded-md bg-secondary/60 border border-border px-2 py-1.5 text-xs text-white">
              {(meta.strategies ?? []).map((s: any) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <p className="text-[10px] text-slate-500">{def?.summary}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(def?.params ?? []).map((x: any) => (
                <label key={x.key} className="text-[10px] text-slate-400">{x.label}
                  <input value={p[x.key] ?? ''} onChange={(e) => setP((d) => ({ ...d, [x.key]: e.target.value }))} inputMode="decimal" className="w-full mt-0.5 rounded-md bg-secondary/60 border border-border px-2 py-1 text-xs text-white" />
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} className="accent-violet-500" /> Allow shorts</label>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-500">Risk & costs</label>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="text-[10px] text-slate-400">Stop loss %<input value={sl} onChange={(e) => setSl(e.target.value)} placeholder="off" className="w-full mt-0.5 rounded-md bg-secondary/60 border border-border px-2 py-1 text-xs text-white" /></label>
              <label className="text-[10px] text-slate-400">Take profit %<input value={tp} onChange={(e) => setTp(e.target.value)} placeholder="off" className="w-full mt-0.5 rounded-md bg-secondary/60 border border-border px-2 py-1 text-xs text-white" /></label>
              <label className="text-[10px] text-slate-400">Fee bps / side<input value={fee} onChange={(e) => setFee(e.target.value)} className="w-full mt-0.5 rounded-md bg-secondary/60 border border-border px-2 py-1 text-xs text-white" /></label>
              <label className="text-[10px] text-slate-400">Slippage bps<input value={slip} onChange={(e) => setSlip(e.target.value)} className="w-full mt-0.5 rounded-md bg-secondary/60 border border-border px-2 py-1 text-xs text-white" /></label>
            </div>
            <label className="text-[10px] text-slate-400">Journal against a Lab strategy (optional)
              <select value={blueprintId} onChange={(e) => setBlueprintId(e.target.value)} className="w-full mt-0.5 rounded-md bg-secondary/60 border border-border px-2 py-1.5 text-xs text-white">
                <option value="">— none —</option>
                {(meta.blueprints ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.code} v{b.version} · {b.name}</option>)}
              </select>
            </label>
            <button onClick={run} disabled={busy || !symbol} className="w-full rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2"><Play className="h-4 w-4" /> {busy ? 'Running…' : 'Run backtest'}</button>
          </div>
        </div>
      </Panel>

      {result ? (
        <>
          <div className={`rounded-lg border px-4 py-3 ${VERDICT[result.verdict]}`}>
            <span className="text-sm font-bold uppercase tracking-wider">{result.verdict}</span>
            <span className="text-xs ml-3">{result.verdictReason}</span>
            <div className="text-[10px] opacity-80 mt-1">{result.source} · {result.symbol} @ {result.interval} · {m.bars} bars · {new Date(m.from).toLocaleDateString()} → {new Date(m.to).toLocaleDateString()} · data fetched {new Date(result.dataFetchedAt).toLocaleTimeString()}{result.stale ? ' (STALE cache)' : ''}{result.labRunId ? ' · journaled to the Strategy Lab' : ''}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <Stat label="Return" value={`${fmt(m.returnPct, 1)}%`} valueClass={m.returnPct >= 0 ? 'text-emerald-300' : 'text-red-300'} sub={`buy & hold ${fmt(m.buyHoldPct, 1)}%`} />
            <Stat label="Trades" value={m.trades} sub={`${m.longTrades}L / ${m.shortTrades}S`} />
            <Stat label="Win rate" value={`${fmt(m.winRate, 1)}%`} />
            <Stat label="Profit factor" value={m.profitFactor === null ? '∞' : fmt(m.profitFactor)} />
            <Stat label="Expectancy" value={`${fmt(m.expectancyPct)}%`} sub="per trade, after costs" />
            <Stat label="Max drawdown" value={`${fmt(m.maxDrawdownPct, 1)}%`} valueClass="text-red-300" />
            <Stat label="Sharpe-like" value={fmt(m.sharpeLike)} sub={`Sortino ${fmt(m.sortinoLike)}`} />
            <Stat label="Exposure" value={`${fmt(m.exposurePct, 0)}%`} sub={`avg hold ${fmt(m.avgHoldingHours, 1)}h`} />
          </div>
          <Panel title="Equity curve" icon={LineChart} accent="emerald">
            <EquityChart points={result.equity ?? []} initial={result.cfg?.initialCapital ?? 10000} />
          </Panel>
          <Panel title={`Trades (last ${(result.trades ?? []).length})`} icon={ListOrdered} accent="cyan">
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1 pr-3 text-left">Entry</th><th className="py-1 pr-3 text-left">Side</th><th className="py-1 pr-3 text-right">In</th><th className="py-1 pr-3 text-right">Out</th><th className="py-1 pr-3 text-right">Bars</th><th className="py-1 pr-3 text-right">Return</th><th className="py-1 text-left">Exit</th></tr></thead>
                <tbody>
                  {[...(result.trades ?? [])].reverse().map((t: any, i: number) => (
                    <tr key={i} className="border-b border-border/30 font-mono">
                      <td className="py-1 pr-3 text-slate-400">{new Date(t.entryTime).toLocaleString()}</td>
                      <td className={`py-1 pr-3 ${t.side === 'long' ? 'text-emerald-300' : 'text-red-300'}`}>{t.side}</td>
                      <td className="py-1 pr-3 text-right text-slate-200">{fmt(t.entryPrice, 4)}</td>
                      <td className="py-1 pr-3 text-right text-slate-200">{fmt(t.exitPrice, 4)}</td>
                      <td className="py-1 pr-3 text-right text-slate-400">{t.bars}</td>
                      <td className={`py-1 pr-3 text-right ${t.returnPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmt(t.returnPct)}%</td>
                      <td className="py-1 text-slate-500">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}

      <Panel title="Recent historical runs" icon={History} accent="amber" collapsible defaultOpen={false}>
        {(meta.runs ?? []).length === 0 ? <p className="text-xs text-slate-500">No journaled runs yet — pick a Lab strategy above to record one.</p> : (
          <div className="space-y-1">
            {(meta.runs ?? []).map((r: any) => (
              <p key={r.id} className="text-[11px] text-slate-400"><span className={`uppercase font-bold ${r.verdict === 'pass' ? 'text-emerald-400' : r.verdict === 'fail' ? 'text-red-400' : 'text-amber-400'}`}>{r.verdict}</span> {r.blueprint?.code} v{r.blueprint?.version} · {new Date(r.createdAt).toLocaleString()} — {r.notes?.slice(0, 200)}</p>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
