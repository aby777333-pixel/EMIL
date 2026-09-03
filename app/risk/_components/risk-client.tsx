'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Meter } from '@/components/cockpit/panel'
import { fmtMoney, fmtNum, fmtPct } from '@/lib/format'
import { Shield, Calculator, TrendingDown, GitBranch, PieChart, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import BreakersPanel from './breakers-panel'

const DURATIONS = [
  { key: 'one_order', label: 'One order' },
  { key: 'one_strategy', label: 'One strategy' },
  { key: 'one_instrument', label: 'One instrument' },
  { key: 'one_session', label: 'One session' },
  { key: 'until_time', label: 'Until specified time' },
  { key: 'persistent', label: 'Persistent until changed' },
]

const corrColor = (c: number) => {
  const a = Math.abs(c ?? 0)
  if (a >= 0.8) return 'bg-red-500/25 text-red-300'
  if (a >= 0.6) return 'bg-amber-500/20 text-amber-300'
  if (a >= 0.3) return 'bg-cyan-500/10 text-cyan-300'
  return 'bg-slate-700/30 text-slate-400'
}

export default function RiskClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // calculator state
  const [calcSymbol, setCalcSymbol] = useState('')
  const [stopPips, setStopPips] = useState('20')
  const [riskPct, setRiskPct] = useState('0.5')

  // override state
  const [overrideValue, setOverrideValue] = useState('0.10')
  const [duration, setDuration] = useState('one_session')
  const [acked, setAcked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [expDim, setExpDim] = useState('instrument')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/risk')
      if (!res?.ok) throw new Error('failed')
      const d = await res.json()
      setData(d)
      if (!calcSymbol && (d?.instruments ?? []).length > 0) setCalcSymbol(d?.instruments?.[0]?.symbol ?? '')
    } catch {
      setError('Failed to load risk data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const profile = data?.profile ?? {}
  const account = data?.account ?? {}
  const instruments = data?.instruments ?? []
  const inst = instruments.find((i: any) => i?.symbol === calcSymbol) ?? instruments?.[0] ?? null

  const calc = useMemo(() => {
    const equity = account?.equity ?? 0
    const rp = parseFloat(riskPct) || 0
    const sp = parseFloat(stopPips) || 0
    const pipValue = inst?.spec?.pipValuePerLot ?? 10
    const minLot = inst?.spec?.minLot ?? 0.01
    const lotStep = inst?.spec?.lotStep ?? 0.01
    const riskMoney = equity * (rp / 100)
    if (sp <= 0 || rp <= 0) return { riskMoney: 0, rawLot: 0, lot: 0, minLotRisk: 0, rejected: false, reason: 'Enter a stop distance and risk percentage.' }
    const rawLot = riskMoney / (sp * pipValue)
    const minLotRisk = minLot * sp * pipValue
    if (rawLot < minLot) {
      return { riskMoney, rawLot, lot: 0, minLotRisk, rejected: true, reason: `Even the minimum lot (${minLot}) risks ${fmtMoney(minLotRisk)}, exceeding your permitted risk of ${fmtMoney(riskMoney)}. EMIL rejects this trade rather than exceed risk.` }
    }
    const lot = Math.floor(rawLot / lotStep) * lotStep
    const capped = Math.min(lot, profile?.maxAggregateExposure ?? 0.05)
    return { riskMoney, rawLot, lot: capped, minLotRisk, rejected: false, reason: capped < lot ? `Size capped by the ${fmtNum(profile?.maxAggregateExposure ?? 0.05, 2)}-lot aggregate exposure ceiling.` : '' }
  }, [account?.equity, riskPct, stopPips, inst, profile?.maxAggregateExposure])

  const overrideScenario = useMemo(() => {
    const v = parseFloat(overrideValue) || 0
    const pipValue = 10
    const stop = 30
    return {
      slValue: v * stop * pipValue,
      margin: v * (inst?.spec?.marginPerLot ?? 1000),
      ddPct: account?.equity ? ((v * stop * pipValue) / account.equity) * 100 : 0,
    }
  }, [overrideValue, inst, account?.equity])

  const submitOverride = useCallback(async () => {
    if (!acked) { toast.error('Active acknowledgement is required. No pre-selected checkbox.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lot_override',
          newValue: parseFloat(overrideValue) || 0,
          duration,
          acknowledged: acked,
          scenarioText: `SL value ${fmtMoney(overrideScenario?.slValue)}, margin ${fmtMoney(overrideScenario?.margin)}, drawdown impact ${fmtPct(overrideScenario?.ddPct)}`,
        }),
      })
      const d = await res?.json?.()
      if (!res?.ok) throw new Error(d?.error ?? 'failed')
      toast.success('Exposure override authorized, logged and applied.')
      setAcked(false)
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Override failed.')
    } finally {
      setBusy(false)
    }
  }, [acked, overrideValue, duration, overrideScenario, load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading risk management..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  const correlations = data?.correlations ?? []
  const symbols: string[] = Array.from(new Set(correlations.flatMap((c: any) => [c?.symbolA, c?.symbolB]).filter(Boolean))) as string[]
  const corrMap: Record<string, number> = {}
  for (const c of correlations) {
    corrMap[`${c?.symbolA}|${c?.symbolB}`] = c?.coefficient ?? 0
    corrMap[`${c?.symbolB}|${c?.symbolA}`] = c?.coefficient ?? 0
  }
  const exposures = (data?.exposures ?? []).filter((e: any) => e?.dimension === expDim)
  const dims: string[] = Array.from(new Set((data?.exposures ?? []).map((e: any) => e?.dimension).filter(Boolean))) as string[]
  const drawdowns = data?.drawdowns ?? []
  const overrides = data?.overrides ?? []

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="h-5 w-5 text-red-400" /> Risk Management</h1>
        <p className="text-xs text-slate-500 mt-1">Risk is never a target — 5% is an absolute ceiling. Default aggregate EMIL exposure: {fmtNum(profile?.maxAggregateExposure ?? 0.05, 2)} lots including hedges.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Position Sizing Calculator (Risk-First)" icon={Calculator} accent="cyan">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <label className="text-[11px] text-slate-500">Instrument
              <select value={calcSymbol} onChange={(e) => setCalcSymbol(e?.target?.value ?? '')} className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white">
                {instruments.map((i: any) => <option key={i?.id} value={i?.symbol}>{i?.symbol}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-slate-500">Stop distance (pips)
              <input value={stopPips} onChange={(e) => setStopPips(e?.target?.value ?? '')} type="number" min="1" className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white num" />
            </label>
            <label className="text-[11px] text-slate-500">Risk % of equity
              <input value={riskPct} onChange={(e) => setRiskPct(e?.target?.value ?? '')} type="number" step="0.1" min="0.1" max="5" className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white num" />
            </label>
          </div>
          <div className="rounded-md border border-border bg-background/40 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Account equity</span><span className="num text-slate-200">{fmtMoney(account?.equity)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Monetary risk permitted</span><span className="num text-amber-300">{fmtMoney(calc?.riskMoney)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pip value per lot</span><span className="num text-slate-200">{fmtMoney(inst?.spec?.pipValuePerLot ?? 10)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Raw calculated lot</span><span className="num text-slate-200">{fmtNum(calc?.rawLot, 4)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Risk at minimum lot (0.01)</span><span className="num text-slate-200">{fmtMoney(calc?.minLotRisk)}</span></div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-slate-400 font-semibold">EMIL decision</span>
              {calc?.rejected
                ? <span className="font-bold text-red-400">REJECT — min lot exceeds permitted risk</span>
                : <span className="font-bold text-emerald-400">{fmtNum(calc?.lot, 2)} lots</span>}
            </div>
            {calc?.reason ? <p className="text-[11px] text-slate-500 leading-snug">{calc.reason}</p> : null}
          </div>
        </Panel>

        <BreakersPanel />

        <Panel title="Drawdown Guard" icon={TrendingDown} accent="red">
          <div className="space-y-3 mb-4">
            <Meter label={`Daily loss (limit ${fmtPct(profile?.dailyLossLimitPct ?? 2)})`} value={Math.abs(Math.min(0, account?.dailyPL ?? 0)) / Math.max(1, (account?.equity ?? 1) * ((profile?.dailyLossLimitPct ?? 2) / 100)) * 100} max={100} danger={80} warn={50} unit="%" />
            <Meter label={`Margin utilization (limit ${fmtPct(profile?.maxMarginUtilPct ?? 25)})`} value={(account?.marginUsed ?? 0) / Math.max(1, account?.equity ?? 1) * 100} max={profile?.maxMarginUtilPct ?? 25} danger={70} warn={45} unit="%" />
          </div>
          <table className="w-full text-left">
            <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-2">Level</th><th className="py-1.5 pr-2">Drawdown</th><th className="py-1.5 pr-2">Threshold</th><th className="py-1.5 pr-2">Action</th><th className="py-1.5">Status</th></tr></thead>
            <tbody>
              {drawdowns.map((d: any) => (
                <tr key={d?.id} className="border-b border-border/40 text-[11px] text-slate-300">
                  <td className="py-1.5 pr-2 capitalize">{(d?.level ?? '').replace(/_/g, ' ')}</td>
                  <td className="py-1.5 pr-2 num text-amber-300">{fmtPct(d?.drawdownPct)}</td>
                  <td className="py-1.5 pr-2 num">{fmtPct(d?.thresholdPct)}</td>
                  <td className="py-1.5 pr-2 text-slate-400">{d?.action}</td>
                  <td className="py-1.5">{d?.resolved ? <span className="text-emerald-400">resolved</span> : <span className="text-amber-400">active</span>}</td>
                </tr>
              ))}
              {drawdowns.length === 0 ? <tr><td colSpan={5} className="py-3 text-center text-xs text-slate-500">No drawdown events.</td></tr> : null}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Correlation Matrix (20-day)" icon={GitBranch} accent="violet">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="text-[10px] num">
              <thead>
                <tr><th className="p-1" />{symbols.map((s) => <th key={s} className="p-1 text-slate-400 font-semibold">{s}</th>)}</tr>
              </thead>
              <tbody>
                {symbols.map((a) => (
                  <tr key={a}>
                    <td className="p-1 text-slate-400 font-semibold">{a}</td>
                    {symbols.map((b) => {
                      const v = a === b ? 1 : corrMap?.[`${a}|${b}`]
                      return <td key={b} className="p-0.5">{v != null ? <div className={`rounded px-1.5 py-1 text-center min-w-[42px] ${a === b ? 'bg-slate-700/50 text-slate-300' : corrColor(v)}`}>{v.toFixed(2)}</div> : <div className="rounded px-1.5 py-1 text-center min-w-[42px] bg-background/40 text-slate-700">–</div>}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">|r| ≥ 0.8 counts as concentrated exposure — correlated positions are treated as one risk block.</p>
        </Panel>

        <Panel title="Portfolio Exposure Breakdown" icon={PieChart} accent="cyan">
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {dims.map((d) => (
              <button key={d} onClick={() => setExpDim(d)} className={`rounded px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${expDim === d ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800/60 text-slate-400 border border-border hover:text-slate-200'}`}>{d.replace(/_/g, ' ')}</button>
            ))}
          </div>
          <div className="space-y-2">
            {exposures.map((e: any) => (
              <div key={e?.id}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-300 font-medium">{e?.key} <span className="text-slate-500">({(e?.direction ?? '').replace(/_/g, ' ')})</span></span>
                  <span className="num text-slate-400">{fmtNum(e?.exposureLots, 2)} lots · {fmtPct(e?.exposurePct, 1)}</span>
                </div>
                <div className="h-1.5 rounded bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded ${(e?.exposurePct ?? 0) > 60 ? 'bg-red-500/70' : (e?.exposurePct ?? 0) > 35 ? 'bg-amber-500/70' : 'bg-cyan-500/70'}`} style={{ width: `${Math.min(100, e?.exposurePct ?? 0)}%` }} />
                </div>
              </div>
            ))}
            {exposures.length === 0 ? <p className="text-xs text-slate-500">No exposure recorded for this dimension.</p> : null}
          </div>
        </Panel>
      </div>

      <Panel title="Lot Override Protection — Raise Maximum EMIL Exposure" icon={AlertTriangle} accent="amber">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-background/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Existing limit</p>
                <p className="text-lg font-bold text-white num">{fmtNum(profile?.maxAggregateExposure ?? 0.05, 2)} lots</p>
              </div>
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-amber-400">Proposed limit</p>
                <input value={overrideValue} onChange={(e) => setOverrideValue(e?.target?.value ?? '')} type="number" step="0.01" min="0.01" className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-lg font-bold text-amber-300 num" />
              </div>
            </div>
            <div className="rounded-md border border-border bg-background/40 p-3 text-xs space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Monetary scenario (30-pip stop, $10/pip/lot)</p>
              <div className="flex justify-between"><span className="text-slate-500">Potential stop-loss value</span><span className="num text-red-400">{fmtMoney(overrideScenario?.slValue)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Margin impact (approx.)</span><span className="num text-slate-200">{fmtMoney(overrideScenario?.margin)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Drawdown impact on equity</span><span className="num text-amber-300">{fmtPct(overrideScenario?.ddPct)}</span></div>
            </div>
            <label className="text-[11px] text-slate-500 block">Override duration
              <select value={duration} onChange={(e) => setDuration(e?.target?.value ?? 'one_session')} className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white">
                {DURATIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
            <h3 className="text-sm font-bold text-amber-300 mb-2">Higher Exposure Warning</h3>
            <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
              <p>You are increasing EMIL’s maximum authorized exposure above its default 0.05-lot safety limit.</p>
              <p>Larger positions can increase losses, drawdown, margin consumption, slippage and liquidation risk.</p>
              <p>AI analysis, historical performance, predicted probability, stop-loss orders and hedging cannot eliminate market risk.</p>
              <p className="font-semibold text-slate-200">By proceeding, you confirm that:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>You intentionally requested the higher limit.</li>
                <li>You understand the possible financial loss.</li>
                <li>You understand that stop-loss orders can execute at worse prices.</li>
                <li>You understand that correlated markets can move together unexpectedly.</li>
                <li>You understand that hedges may fail or introduce additional exposure.</li>
                <li>You accept responsibility for this change.</li>
              </ul>
            </div>
            <label className="mt-3 flex items-start gap-2.5 cursor-pointer rounded-md border border-border bg-background/50 p-2.5">
              <input type="checkbox" checked={acked} onChange={() => setAcked((v) => !v)} className="mt-0.5 h-4 w-4 accent-amber-500" />
              <span className="text-[11px] text-slate-200">I understand and authorize a maximum EMIL exposure of <span className="font-bold text-amber-300 num">{fmtNum(parseFloat(overrideValue) || 0, 2)} lots</span> for <span className="font-bold text-amber-300">{DURATIONS.find((d) => d.key === duration)?.label?.toLowerCase() ?? duration}</span>.</span>
            </label>
            <button onClick={submitOverride} disabled={busy || !acked} className="mt-3 w-full rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 transition-colors">
              AUTHORIZE EXPOSURE OVERRIDE
            </button>
            <p className="text-[10px] text-slate-500 mt-2">“EMIL, make it bigger” is never sufficient authorization. Every override is written to the audit log.</p>
          </div>
        </div>
        {overrides.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Override History</h4>
            <div className="space-y-1.5">
              {overrides.map((o: any) => (
                <div key={o?.id} className="text-[11px] text-slate-400 flex flex-wrap gap-x-2">
                  <span className="text-slate-300 font-medium">{o?.parameter}</span>
                  <span className="num">{o?.previousValue} → <span className="text-amber-300">{o?.newValue}</span></span>
                  <span className="capitalize">({(o?.duration ?? '').replace(/_/g, ' ')})</span>
                  <span className="text-slate-600">{o?.createdAt ? new Date(o.createdAt).toLocaleString('en-US', { timeZone: 'UTC' }) : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  )
}
