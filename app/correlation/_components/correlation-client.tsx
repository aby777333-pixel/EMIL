'use client'

// EMIL CORRELATION ENGINE (spec §97–98) — CALCULATED analytics from cached
// daily closes: Pearson correlation, 30-session rolling correlation, beta and
// relative volatility, with current-vs-period regime detection. Correlations
// change — EMIL never presents them as permanent facts.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, LoadingPanel, Stat } from '@/components/cockpit/panel'
import { GitCompareArrows, Play } from 'lucide-react'
import toast from 'react-hot-toast'

const PRESETS: { a: string; b: string; label: string }[] = [
  { a: 'XAU/USD', b: 'EUR/USD', label: 'Gold vs EUR/USD' },
  { a: 'BTC/USD', b: 'QQQ', label: 'Bitcoin vs Nasdaq (QQQ)' },
  { a: 'SPY', b: 'XAU/USD', label: 'S&P 500 (SPY) vs Gold' },
  { a: 'USD/JPY', b: 'SPY', label: 'USD/JPY vs S&P 500 (SPY)' },
  { a: 'USO', b: 'USD/CAD', label: 'Oil (USO) vs USD/CAD' },
  { a: 'AAPL', b: 'QQQ', label: 'Apple vs Nasdaq (QQQ)' },
]
const PERIODS = [{ bars: 90, label: '3M' }, { bars: 180, label: '6M' }, { bars: 365, label: '1Y' }, { bars: 500, label: '2Y' }]

const REGIME_TONE: Record<string, string> = {
  stable: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  strengthening: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  weakening: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  inverting: 'text-red-300 border-red-500/40 bg-red-500/10',
}

export default function CorrelationClient() {
  const [a, setA] = useState('XAU/USD')
  const [b, setB] = useState('EUR/USD')
  const [bars, setBars] = useState(180)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<any>(null)
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const run = useCallback(async (symA: string, symB: string, nBars: number) => {
    if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/data?fn=correlation&a=${encodeURIComponent(symA)}&b=${encodeURIComponent(symB)}&bars=${nBars}`, { cache: 'no-store' })
      const d = await res.json()
      if (res.status === 429 && d?.retryAfterSec) {
        let s = Math.ceil(d.retryAfterSec)
        setLoading(false)
        setError(`Per-minute market-data budget reached — calculating automatically in ${s}s…`)
        retryTimer.current = setInterval(() => {
          s -= 1
          if (s <= 0) {
            if (retryTimer.current) clearInterval(retryTimer.current)
            retryTimer.current = null
            run(symA, symB, nBars)
          } else {
            setError(`Per-minute market-data budget reached — calculating automatically in ${s}s…`)
          }
        }, 1000)
        return
      }
      if (!res.ok) throw new Error(d?.message ?? d?.error ?? 'Correlation unavailable')
      if (d?.needsKey) throw new Error(d.message)
      setResult(d)
      // Rolling-correlation chart
      if (containerRef.current) {
        const { createChart, ColorType, LineSeries } = await import('lightweight-charts')
        chartRef.current?.remove?.()
        containerRef.current.innerHTML = ''
        const chart = createChart(containerRef.current, {
          height: 260,
          layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8', fontSize: 11 },
          grid: { vertLines: { color: 'rgba(51,65,85,0.35)' }, horzLines: { color: 'rgba(51,65,85,0.35)' } },
          timeScale: { borderColor: '#1e293b' },
          rightPriceScale: { borderColor: '#1e293b' },
        })
        chartRef.current = chart
        const line = chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 2 })
        line.setData((d.rolling ?? []).map((r: any) => ({ time: r.time.slice(0, 10), value: r.corr })))
        const zero = chart.addSeries(LineSeries, { color: 'rgba(148,163,184,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        zero.setData((d.rolling ?? []).map((r: any) => ({ time: r.time.slice(0, 10), value: 0 })))
        chart.timeScale().fitContent()
      }
    } catch (e: any) {
      setError(e?.message ?? 'Correlation unavailable.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    run(a, b, bars)
    return () => {
      chartRef.current?.remove?.()
      chartRef.current = null
      if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmtC = (v?: number) => (typeof v === 'number' ? v.toFixed(2) : '—')

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><GitCompareArrows className="h-5 w-5 text-cyan-400" /> EMIL Correlation Engine</h1>
        <p className="text-xs text-slate-500 mt-1">Compare any two supported instruments — Pearson &amp; rolling correlation, beta, relative volatility, regime change. CALCULATED analytics from delayed daily closes; correlations change, never treat them as permanent facts.</p>
      </div>

      <Panel title="Pair Analysis" icon={GitCompareArrows} accent="cyan">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <input value={a} onChange={(e) => setA(e.target.value.toUpperCase())} className="w-32 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white num" placeholder="Symbol A" />
          <span className="text-slate-500 text-xs">vs</span>
          <input value={b} onChange={(e) => setB(e.target.value.toUpperCase())} className="w-32 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white num" placeholder="Symbol B" />
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button key={p.bars} onClick={() => setBars(p.bars)} className={`rounded px-2 py-1 text-[10px] font-bold border ${bars === p.bars ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-secondary/40 text-slate-400 border-border'}`}>{p.label}</button>
            ))}
          </div>
          <button onClick={() => { if (a.trim() && b.trim()) run(a.trim(), b.trim(), bars); else toast.error('Both symbols required.') }} disabled={loading} className="flex items-center gap-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5"><Play className="h-3.5 w-3.5" /> {loading ? 'CALCULATING…' : 'ANALYSE'}</button>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => { setA(p.a); setB(p.b); run(p.a, p.b, bars) }} className="rounded-full px-2.5 py-1 text-[10px] border border-cyan-500/25 bg-cyan-500/5 text-cyan-300/90 hover:bg-cyan-500/15">{p.label}</button>
          ))}
        </div>

        {error ? <p className="text-xs text-amber-300 mb-2">{error}</p> : null}

        {result ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
              <Stat size="sm" label="Overall Correlation" value={fmtC(result.overallCorrelation)} valueClass={Math.abs(result.overallCorrelation) > 0.6 ? 'text-amber-300' : 'text-white'} sub={`${result.sessions} overlapping sessions`} />
              <Stat size="sm" label={`Rolling ${result.rollingWindow}-Session (now)`} value={fmtC(result.recentCorrelation)} valueClass="text-cyan-300" />
              <Stat size="sm" label="Historical Normal" value={fmtC(result.averageRollingCorrelation)} sub="avg of rolling windows" />
              <Stat size="sm" label={`Beta (${result.symbolA} on ${result.symbolB})`} value={fmtC(result.betaAonB)} />
              <Stat size="sm" label={`Ann. Vol ${result.symbolA}`} value={`${fmtC(result.annualizedVolA)}%`} />
              <Stat size="sm" label={`Ann. Vol ${result.symbolB}`} value={`${fmtC(result.annualizedVolB)}%`} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${REGIME_TONE[result.regime] ?? REGIME_TONE.stable}`}>Relationship: {result.regime}</span>
              <span className="text-[10px] text-slate-500">current rolling vs historical normal — regime change detection, not a prediction</span>
            </div>
          </>
        ) : null}

        <div ref={containerRef} className={`w-full rounded-md border border-border bg-background/40 ${result ? 'min-h-[260px]' : 'min-h-[60px]'}`} />
        {result ? <p className="text-[10px] text-slate-500 mt-2">Rolling {result.rollingWindow}-session correlation of daily log returns · <span className="uppercase font-bold text-violet-300">calculated</span> by EMIL from Twelve Data closes · computed {new Date(result.fetchedAt).toLocaleTimeString()}</p> : null}
      </Panel>
    </div>
  )
}
