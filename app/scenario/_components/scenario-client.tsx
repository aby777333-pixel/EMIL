'use client'

// Scenario & hedge simulator (spec §30, §96–§115, §138). Factor shocks →
// linear P&L per position → net factor exposures → proxy hedges sized to a
// chosen ratio, with the residual shown. CALCULATED research view.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Waves, Play, Shield, Activity, Layers, Save, AlertTriangle, Beaker } from 'lucide-react'

type FactorKey = 'usd' | 'equities' | 'crypto' | 'gold' | 'oil' | 'rates'
type Factor = { key: FactorKey; label: string; unit: '%' | 'bp'; proxy: string; min: number; max: number }
type Preset = { key: string; label: string; description: string; shocks: Partial<Record<FactorKey, number>> }
type Result = {
  fetchedAt: string; preset: string | null; shocks: Record<string, number>; hedgeRatio: number; equity: number
  positions: { venue: string; paper: boolean; symbol: string; canonical: string; assetClass: string; side: string; signedNotional: number; move: number; pnl: number; betas: Record<string, number>; basis: string; overridden: boolean }[]
  byAssetClass: { assetClass: string; net: number; pnl: number }[]
  factorExposures: { factor: FactorKey; label: string; exposure: number; shock: number; pnl: number }[]
  total: { pnl: number; pctOfEquity: number | null; unpriced: number }
  hedges: { factor: FactorKey; label: string; instrument: string; venueHint: string; side: 'buy' | 'sell'; notionalUsd: number; refPrice: number | null; priceBasis: string | null; qty: number | null; qtyUnit: string | null; paperVenue: string | null; paperSymbol: string | null; capped: boolean; pnlInScenario: number; note: string }[]
  afterHedge: { pnl: number; pctOfEquity: number | null; factorExposures: { factor: FactorKey; label: string; exposure: number; pnl: number }[]; hedgeNotional: number }
  notes: string[]
}

const usd = (n: number | null | undefined, d = 0) => (n === null || n === undefined || !isFinite(n) ? '—' : `${n < 0 ? '−' : n > 0 ? '+' : ''}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: d })}`)
const plain = (n: number | null | undefined, d = 0) => (n === null || n === undefined || !isFinite(n) ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: d }))
const tone = (n: number | null | undefined) => (n === null || n === undefined ? 'text-slate-200' : n >= 0 ? 'text-emerald-300' : 'text-red-300')

export default function ScenarioClient() {
  const [factors, setFactors] = useState<Factor[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [shocks, setShocks] = useState<Record<string, number>>({})
  const [preset, setPreset] = useState<string>('risk_off')
  const [hedgeRatio, setHedgeRatio] = useState(0.5)
  const [includePaper, setIncludePaper] = useState(true)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/scenario', { cache: 'no-store' })
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error ?? 'failed')
        setFactors(d.factors); setPresets(d.presets); setResult(d.result); setShocks(d.result.shocks)
      } catch (e: any) { setError(e?.message ?? 'Scenario simulator unavailable') }
    })()
  }, [])

  const run = useCallback(async (save?: string) => {
    setBusy(true); setMsg('')
    try {
      const ov: Record<string, number> = {}
      for (const [k, v] of Object.entries(overrides)) if (v.trim() !== '' && Number.isFinite(Number(v))) ov[k] = Number(v)
      const res = await fetch('/api/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shocks, overrides: ov, hedgeRatio, includePaper, save }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      setResult(d.result); setError('')
      if (save) setMsg(d.noteId ? `Saved to the research notebook (Teach EMIL → Notebook).` : 'Scenario ran, but the notebook write failed.')
    } catch (e: any) { setError(e?.message ?? 'Scenario failed') } finally { setBusy(false) }
  }, [shocks, overrides, hedgeRatio, includePaper])

  const applyPreset = (key: string) => {
    const p = presets.find((x) => x.key === key)
    if (!p) return
    setPreset(key)
    const next: Record<string, number> = {}
    for (const f of factors) next[f.key] = p.shocks[f.key] ?? 0
    setShocks(next)
  }

  if (error && !result) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!result) return <div className="p-6"><LoadingPanel text="Loading positions and running the default risk-off scenario…" /></div>

  const maxAbsExp = Math.max(1, ...result.factorExposures.map((f) => Math.abs(f.exposure)))

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Waves className="h-5 w-5 text-cyan-400" /> Scenario &amp; Hedge Simulator</h1>
          <p className="text-xs text-slate-500 mt-1">Shock six macro factors, see the linear P&amp;L of every open position, then size proxy hedges against the net factor exposures. Calculated research view — nothing here is sent to a venue.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/portfolio" className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white">Portfolio →</Link>
          <button onClick={() => run()} disabled={busy} className="rounded-md bg-cyan-600/80 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"><Play className="h-3.5 w-3.5" /> {busy ? 'Running…' : 'Run scenario'}</button>
        </div>
      </div>
      {error ? <StatusMessage text={error} /> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Factor shocks" icon={Waves} accent="cyan" className="lg:col-span-2">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets.map((p) => <button key={p.key} onClick={() => applyPreset(p.key)} title={p.description} className={`rounded-full border px-2.5 py-1 text-[11px] ${preset === p.key ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200' : 'border-border bg-secondary/40 text-slate-300 hover:text-white'}`}>{p.label}</button>)}
            <button onClick={() => { setPreset(''); const z: Record<string, number> = {}; for (const f of factors) z[f.key] = 0; setShocks(z) }} className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-slate-400 hover:text-white">Clear</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {factors.map((f) => (
              <div key={f.key}>
                <div className="flex items-center justify-between text-[11px]"><span className="text-slate-300">{f.label} <span className="text-slate-600">({f.proxy})</span></span><span className={`num font-semibold ${tone(shocks[f.key])}`}>{(shocks[f.key] ?? 0) > 0 ? '+' : ''}{shocks[f.key] ?? 0}{f.unit}</span></div>
                <input type="range" min={f.min} max={f.max} step={f.unit === 'bp' ? 5 : 0.5} value={shocks[f.key] ?? 0} onChange={(e) => { setPreset(''); setShocks({ ...shocks, [f.key]: Number(e.target.value) }) }} className="w-full accent-cyan-500" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border">
            <label className="text-[11px] text-slate-300 flex items-center gap-2">Hedge ratio <input type="range" min={0} max={1} step={0.05} value={hedgeRatio} onChange={(e) => setHedgeRatio(Number(e.target.value))} className="accent-amber-500" /> <span className="num text-amber-300 w-10">{Math.round(hedgeRatio * 100)}%</span></label>
            <label className="text-[11px] text-slate-300 flex items-center gap-2"><input type="checkbox" checked={includePaper} onChange={(e) => setIncludePaper(e.target.checked)} /> include paper / demo accounts</label>
          </div>
        </Panel>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Equity (approx USD)" value={plain(result.equity)} valueClass="text-cyan-300" size="sm" />
            <Stat label="Scenario P&L" value={usd(result.total.pnl)} sub={result.total.pctOfEquity === null ? 'no equity basis' : `${result.total.pctOfEquity.toFixed(2)}% of equity`} valueClass={tone(result.total.pnl)} size="sm" />
            <Stat label="After hedges" value={usd(result.afterHedge.pnl)} sub={`${Math.round(result.hedgeRatio * 100)}% ratio · ${plain(result.afterHedge.hedgeNotional)} USD hedge notional`} valueClass={tone(result.afterHedge.pnl)} size="sm" />
            <Stat label="Positions priced" value={result.positions.length} sub={result.total.unpriced ? `${result.total.unpriced} unpriced excluded` : 'all priced'} size="sm" />
          </div>
          <Panel title="Save to notebook" icon={Save} accent="violet">
            <div className="flex gap-2">
              <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Scenario name" className="flex-1 rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/60" />
              <button onClick={() => saveName.trim() && run(saveName)} disabled={busy || !saveName.trim()} className="rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 hover:text-white disabled:opacity-50">Run &amp; save</button>
            </div>
            {msg ? <p className="text-[11px] text-slate-300 mt-2">{msg}</p> : null}
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Net factor exposures (USD-equivalent)" icon={Layers} accent="amber">
          <div className="space-y-2">
            {result.factorExposures.map((f) => {
              const after = result.afterHedge.factorExposures.find((a) => a.factor === f.factor)
              return (
                <div key={f.factor}>
                  <div className="flex items-center justify-between text-[11px]"><span className="text-slate-200">{f.label}</span><span className="num text-slate-300">{usd(f.exposure)} <span className="text-slate-600">→ after hedge</span> {usd(after?.exposure ?? f.exposure)} · P&amp;L <b className={tone(f.pnl)}>{usd(f.pnl)}</b></span></div>
                  <div className="relative h-1.5 rounded bg-slate-800 mt-1"><div className={`absolute top-0 h-1.5 rounded ${f.exposure >= 0 ? 'bg-emerald-500/70 left-1/2' : 'bg-red-500/70 right-1/2'}`} style={{ width: `${Math.min(50, (Math.abs(f.exposure) / maxAbsExp) * 50)}%` }} /></div>
                </div>
              )
            })}
            {result.positions.length === 0 ? <p className="text-xs text-slate-500">No priced open positions — link a venue or open paper positions and the exposures appear here.</p> : null}
          </div>
        </Panel>

        <Panel title={`Hedge proposals · ${result.hedges.length}`} icon={Shield} accent="emerald">
          {result.hedges.length === 0 ? <p className="text-xs text-slate-500">No factor exposure above 5% of gross — nothing material to hedge at this ratio.</p> : (
            <div className="space-y-2">
              {result.hedges.map((h) => (
                <div key={h.factor} className="rounded-md border border-border bg-background/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-white"><span className={`font-bold uppercase ${h.side === 'buy' ? 'text-emerald-300' : 'text-red-300'}`}>{h.side}</span> <span className="num">{h.instrument}</span> ≈ <span className="num">{plain(h.notionalUsd)}</span> USD{h.qty !== null ? <span className="text-slate-400"> · qty <span className="num">{h.qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span> {h.qtyUnit}</span> : null}{h.capped ? <span className="ml-1 text-[9px] text-amber-300">CAPPED</span> : null}</p>
                    <span className={`num text-[11px] ${tone(h.pnlInScenario)}`}>{usd(h.pnlInScenario)} in scenario</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{h.note} {h.refPrice ? `Ref ${h.refPrice.toLocaleString()} (${h.priceBasis}).` : 'No reference price cached — quantity not computed.'} {h.venueHint}</p>
                  {h.paperVenue ? <Link href={`/paper?venue=${h.paperVenue}`} className="inline-flex items-center gap-1 mt-1 text-[11px] text-cyan-400 hover:underline"><Beaker className="h-3 w-3" /> Open the Paper Trading Desk on {h.paperSymbol} (testnet — you place the order)</Link> : null}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title={`Position P&L in this scenario · ${result.positions.length}`} icon={Activity} accent="red">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">Venue</th><th className="py-1.5 pr-3">Symbol</th><th className="py-1.5 pr-3">Side</th><th className="py-1.5 pr-3 text-right">Signed notional</th><th className="py-1.5 pr-3 text-right">Implied move</th><th className="py-1.5 pr-3 text-right">P&amp;L</th><th className="py-1.5 pr-3">Betas</th><th className="py-1.5 text-right">Override %</th></tr></thead>
            <tbody>
              {result.positions.map((p, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="py-1.5 pr-3 text-[11px] text-slate-300">{p.venue}{p.paper ? <span className="ml-1 text-[9px] text-amber-300">paper</span> : null}</td>
                  <td className="py-1.5 pr-3 num text-[11px] text-white">{p.symbol}</td>
                  <td className={`py-1.5 pr-3 text-[10px] font-bold uppercase ${p.side === 'long' ? 'text-emerald-300' : 'text-red-300'}`}>{p.side}</td>
                  <td className="py-1.5 pr-3 num text-[11px] text-slate-300 text-right">{usd(p.signedNotional)}</td>
                  <td className={`py-1.5 pr-3 num text-[11px] text-right ${tone(p.move)}`}>{p.move >= 0 ? '+' : ''}{p.move.toFixed(2)}%{p.overridden ? <span className="ml-1 text-[9px] text-violet-300">override</span> : null}</td>
                  <td className={`py-1.5 pr-3 num text-[11px] text-right font-semibold ${tone(p.pnl)}`}>{usd(p.pnl)}</td>
                  <td className="py-1.5 pr-3 text-[10px] text-slate-500" title={p.basis}>{Object.entries(p.betas).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(' · ')}</td>
                  <td className="py-1.5 text-right"><input value={overrides[p.canonical] ?? ''} onChange={(e) => setOverrides({ ...overrides, [p.canonical]: e.target.value })} placeholder="model" inputMode="decimal" className="w-20 rounded border border-border bg-background/60 px-1.5 py-0.5 text-[11px] text-white num text-right focus:outline-none focus:border-violet-500/60" /></td>
                </tr>
              ))}
              {result.positions.length === 0 ? <tr><td colSpan={8} className="py-6 text-center text-xs text-slate-500">No priced open positions.</td></tr> : null}
            </tbody>
          </table>
        </div>
        {result.byAssetClass.length ? <div className="flex flex-wrap gap-2 mt-3">{result.byAssetClass.map((c) => <span key={c.assetClass} className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-slate-300 capitalize">{c.assetClass}: <b className={tone(c.pnl)}>{usd(c.pnl)}</b></span>)}</div> : null}
        <ul className="mt-3 space-y-0.5 text-[10px] text-slate-500 list-disc pl-4">{result.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Type a number in "Override %" to replace the factor model for that symbol, then run again.</p>
      </Panel>
    </div>
  )
}
