'use client'

// Walk-forward + Monte Carlo panels for the Backtest Engine (spec §32–34).

import { Panel } from '@/components/cockpit/panel'
import { Shuffle, Route } from 'lucide-react'

const fmt = (n?: number | null, d = 1) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: d }))
const TONE: Record<string, string> = {
  robust: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', sound: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  fragile: 'text-red-300 border-red-500/40 bg-red-500/10', shaky: 'text-red-300 border-red-500/40 bg-red-500/10',
  insufficient: 'text-slate-300 border-slate-600/50 bg-slate-700/30',
}

export function WalkForwardPanel({ wf }: { wf: any }) {
  if (!wf) return null
  return (
    <Panel title={`Walk-forward · ${wf.folds.length} folds · grid ${wf.gridSize}`} icon={Route} accent="violet">
      <div className={`rounded-md border px-3 py-2 mb-3 ${TONE[wf.verdict]}`}><span className="text-xs font-bold uppercase tracking-wider">{wf.verdict}</span><span className="text-[11px] ml-3">{wf.verdictReason}</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-[11px]">
        <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[9px] uppercase text-slate-500">OOS return</div><div className={`num ${wf.oos.returnPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmt(wf.oos.returnPct)}%</div></div>
        <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[9px] uppercase text-slate-500">OOS trades</div><div className="num text-white">{wf.oos.trades}</div></div>
        <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[9px] uppercase text-slate-500">OOS win rate</div><div className="num text-white">{fmt(wf.oos.winRate)}%</div></div>
        <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[9px] uppercase text-slate-500">OOS profit factor</div><div className="num text-white">{wf.oos.profitFactor === null ? '∞' : fmt(wf.oos.profitFactor, 2)}</div></div>
        <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[9px] uppercase text-slate-500">OOS max DD</div><div className="num text-red-300">{fmt(wf.oos.maxDrawdownPct)}%</div></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1 pr-3 text-left">Fold</th><th className="py-1 pr-3 text-left">In-sample</th><th className="py-1 pr-3 text-left">Tuned params</th><th className="py-1 pr-3 text-right">IS ret</th><th className="py-1 pr-3 text-left">Out-of-sample</th><th className="py-1 pr-3 text-right">OOS ret</th><th className="py-1 pr-3 text-right">OOS PF</th><th className="py-1 pr-3 text-right">OOS trades</th><th className="py-1 text-right">Efficiency</th></tr></thead>
          <tbody>
            {wf.folds.map((f: any) => (
              <tr key={f.fold} className="border-b border-border/40">
                <td className="py-1 pr-3 text-slate-300">{f.fold}</td>
                <td className="py-1 pr-3 text-slate-400 num">{new Date(f.isFrom).toLocaleDateString()} → {new Date(f.isTo).toLocaleDateString()} <span className="text-slate-600">({f.isBars})</span></td>
                <td className="py-1 pr-3 num text-slate-300">{Object.entries(f.tunedParams).map(([k, v]) => `${k}=${v}`).join(' ')}</td>
                <td className={`py-1 pr-3 num text-right ${f.isReturnPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmt(f.isReturnPct)}%</td>
                <td className="py-1 pr-3 text-slate-400 num">{new Date(f.oosFrom).toLocaleDateString()} → {new Date(f.oosTo).toLocaleDateString()} <span className="text-slate-600">({f.oosBars})</span></td>
                <td className={`py-1 pr-3 num text-right font-semibold ${f.oosReturnPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmt(f.oosReturnPct)}%</td>
                <td className="py-1 pr-3 num text-right text-slate-300">{f.oosProfitFactor === null ? '∞' : fmt(f.oosProfitFactor, 2)}</td>
                <td className="py-1 pr-3 num text-right text-slate-300">{f.oosTrades}</td>
                <td className={`py-1 num text-right ${f.efficiency === null ? 'text-slate-500' : f.efficiency >= 0.5 ? 'text-emerald-300' : 'text-amber-300'}`}>{f.efficiency === null ? '—' : fmt(f.efficiency, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500 mt-2">Each fold re-tunes the strategy parameters on its in-sample window (±25% grid) and then trades the following out-of-sample window with those parameters. Efficiency = out-of-sample return per bar ÷ in-sample return per bar; below 0.5 the tuned edge decays fast. Calculated on the same real candles — not a forecast.</p>
    </Panel>
  )
}

export function MonteCarloPanel({ mc }: { mc: any }) {
  if (!mc) return null
  const maxCount = Math.max(1, ...mc.histogram.map((h: any) => h.count))
  return (
    <Panel title={`Monte Carlo · ${mc.runs} bootstrapped paths · ${mc.trades} trades`} icon={Shuffle} accent="amber">
      <div className={`rounded-md border px-3 py-2 mb-3 ${TONE[mc.verdict]}`}><span className="text-xs font-bold uppercase tracking-wider">{mc.verdict}</span><span className="text-[11px] ml-3">{mc.verdictReason}</span></div>
      {mc.runs > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Final return distribution</p>
            <svg viewBox="0 0 400 120" className="w-full h-28">
              {mc.histogram.map((h: any, i: number) => {
                const x = (i / mc.histogram.length) * 400
                const w = 400 / mc.histogram.length - 2
                const hh = (h.count / maxCount) * 100
                const neg = h.to <= 0
                return <rect key={i} x={x + 1} y={110 - hh} width={w} height={hh} className={neg ? 'fill-red-400/70' : 'fill-emerald-400/70'} />
              })}
              <line x1={0} x2={400} y1={110} y2={110} stroke="currentColor" className="text-slate-600" />
            </svg>
            <div className="flex justify-between text-[9px] text-slate-500 num"><span>{fmt(mc.histogram[0]?.from)}%</span><span>0%</span><span>{fmt(mc.histogram[mc.histogram.length - 1]?.to)}%</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[9px] uppercase text-slate-500">Return p5 / p50 / p95</div><div className="num text-white">{fmt(mc.finalReturnPct.p5)}% / {fmt(mc.finalReturnPct.p50)}% / {fmt(mc.finalReturnPct.p95)}%</div></div>
            <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[9px] uppercase text-slate-500">Mean return</div><div className={`num ${mc.finalReturnPct.mean >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmt(mc.finalReturnPct.mean)}%</div></div>
            <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[9px] uppercase text-slate-500">Max DD p50 / p95 / worst</div><div className="num text-red-300">{fmt(mc.maxDrawdownPct.p50)}% / {fmt(mc.maxDrawdownPct.p95)}% / {fmt(mc.maxDrawdownPct.worst)}%</div></div>
            <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[9px] uppercase text-slate-500">P(loss) · P(ruin &gt; {mc.ruinPct}% DD)</div><div className="num text-white">{fmt(mc.probLoss * 100, 0)}% · {fmt(mc.probRuin * 100, 1)}%</div></div>
          </div>
        </div>
      ) : null}
      <p className="text-[10px] text-slate-500 mt-2">Trade returns are resampled with replacement (seeded, reproducible) to see how much of the result depends on the order and luck of the actual sequence. Same trades, shuffled history — not a forecast of future performance.</p>
    </Panel>
  )
}
