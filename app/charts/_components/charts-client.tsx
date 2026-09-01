'use client'

// EMIL CHARTS — professional charting on TradingView Lightweight Charts
// (Apache-2.0), fed by the Data Provider Hub's cached time series. SMA/EMA
// indicators are computed inside EMIL (spec §252) — no extra API credits.
// RESEARCH DATA — delayed feed, never an execution price.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, LoadingPanel } from '@/components/cockpit/panel'
import { CandlestickChart, Search, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

const QUICK_PICKS = ['EUR/USD', 'XAU/USD', 'SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'BTC/USD', 'USO', 'USD/INR']
const INTERVALS = [
  { key: '5min', label: '5m' }, { key: '15min', label: '15m' }, { key: '1h', label: '1H' },
  { key: '4h', label: '4H' }, { key: '1day', label: '1D' }, { key: '1week', label: '1W' },
]
const CHART_TYPES = ['Candles', 'Line', 'Area'] as const

const sma = (values: number[], period: number) =>
  values.map((_, i) => (i < period - 1 ? null : values.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0) / period))
const ema = (values: number[], period: number) => {
  const k = 2 / (period + 1)
  const out: (number | null)[] = []
  let prev: number | null = null
  values.forEach((v, i) => {
    if (i < period - 1) { out.push(null); return }
    if (prev === null) prev = values.slice(0, period).reduce((s, x) => s + x, 0) / period
    else prev = v * k + prev * (1 - k)
    out.push(prev)
  })
  return out
}

// Lightweight-charts wants unix seconds for intraday and 'yyyy-mm-dd' for daily+.
const toTime = (dt: string, daily: boolean) => (daily ? dt.slice(0, 10) : Math.floor(new Date(dt.replace(' ', 'T') + 'Z').getTime() / 1000))

export default function ChartsClient() {
  const [symbol, setSymbol] = useState('EUR/USD')
  const [input, setInput] = useState('EUR/USD')
  const [interval, setIntervalKey] = useState('1h')
  const [chartType, setChartType] = useState<typeof CHART_TYPES[number]>('Candles')
  const [showSma, setShowSma] = useState(true)
  const [showEma, setShowEma] = useState(false)
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<any>(null)

  const load = useCallback(async (sym: string, iv: string, type: string, wantSma: boolean, wantEma: boolean) => {
    if (!containerRef.current) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/data?fn=time_series&symbol=${encodeURIComponent(sym)}&interval=${iv}&outputsize=300`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.message ?? d?.error ?? 'Feed unavailable')
      if (d?.needsKey) throw new Error(d.message)
      if (!Array.isArray(d?.data) || d.data.length === 0) throw new Error('No data returned for this symbol/interval.')

      const { createChart, ColorType, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries } = await import('lightweight-charts')
      chartRef.current?.remove?.()
      containerRef.current.innerHTML = ''
      const chart = createChart(containerRef.current, {
        height: 460,
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8', fontSize: 11 },
        grid: { vertLines: { color: 'rgba(51,65,85,0.35)' }, horzLines: { color: 'rgba(51,65,85,0.35)' } },
        timeScale: { borderColor: '#1e293b', timeVisible: !iv.includes('day') && !iv.includes('week') },
        rightPriceScale: { borderColor: '#1e293b' },
        crosshair: { mode: 0 },
      })
      chartRef.current = chart
      const daily = ['1day', '1week', '1month'].includes(iv)
      const bars = d.data.filter((b: any) => isFinite(b.close))
      const times = bars.map((b: any) => toTime(b.time, daily))

      if (type === 'Candles') {
        const s = chart.addSeries(CandlestickSeries, { upColor: '#34d399', downColor: '#f87171', borderUpColor: '#34d399', borderDownColor: '#f87171', wickUpColor: '#34d399', wickDownColor: '#f87171' })
        s.setData(bars.map((b: any, i: number) => ({ time: times[i], open: b.open, high: b.high, low: b.low, close: b.close })))
      } else {
        const s = type === 'Area'
          ? chart.addSeries(AreaSeries, { lineColor: '#22d3ee', topColor: 'rgba(34,211,238,0.25)', bottomColor: 'rgba(34,211,238,0.02)', lineWidth: 2 })
          : chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 2 })
        s.setData(bars.map((b: any, i: number) => ({ time: times[i], value: b.close })))
      }
      const closes = bars.map((b: any) => b.close)
      if (wantSma) {
        for (const [period, color] of [[20, '#f59e0b'], [50, '#a78bfa']] as const) {
          const line = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
          line.setData(sma(closes, period).map((v, i) => (v === null ? null : { time: times[i], value: v })).filter(Boolean) as any)
        }
      }
      if (wantEma) {
        const line = chart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        line.setData(ema(closes, 20).map((v, i) => (v === null ? null : { time: times[i], value: v })).filter(Boolean) as any)
      }
      const hasVolume = bars.some((b: any) => b.volume)
      if (hasVolume) {
        const vol = chart.addSeries(HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' } })
        chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
        vol.setData(bars.map((b: any, i: number) => ({ time: times[i], value: b.volume ?? 0, color: b.close >= b.open ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)' })))
      }
      chart.timeScale().fitContent()
      setMeta({ symbol: d.symbol, exchange: d.exchange, currency: d.currency, fetchedAt: d.fetchedAt, cached: d.cached, stale: d.stale, bars: bars.length, last: closes[closes.length - 1] })
    } catch (e: any) {
      setError(e?.message ?? 'Chart data unavailable.')
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Deep link: /charts?symbol=XYZ (watchlist rows link here)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('symbol')
    if (s) { setSymbol(s.toUpperCase()); setInput(s.toUpperCase()) }
  }, [])

  useEffect(() => {
    load(symbol, interval, chartType, showSma, showEma)
    const onResize = () => chartRef.current?.applyOptions?.({ width: containerRef.current?.clientWidth ?? 600 })
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); chartRef.current?.remove?.(); chartRef.current = null }
  }, [symbol, interval, chartType, showSma, showEma, load])

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><CandlestickChart className="h-5 w-5 text-cyan-400" /> EMIL Charts</h1>
        <p className="text-xs text-slate-500 mt-1">Professional research charting — stocks, FX, metals, crypto, indices (plan-dependent). Delayed research data with SMA/EMA computed inside EMIL; never an execution price.</p>
      </div>

      <Panel title="Chart" icon={TrendingUp} accent="cyan">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <form
            onSubmit={(e) => { e.preventDefault(); const s = input.trim().toUpperCase(); if (s) setSymbol(s); else toast.error('Enter a symbol.') }}
            className="flex gap-1.5"
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} className="w-36 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white num" placeholder="AAPL, EUR/USD…" />
            <button type="submit" className="rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 flex items-center gap-1"><Search className="h-3.5 w-3.5" /> LOAD</button>
          </form>
          <div className="flex gap-1">
            {INTERVALS.map((iv) => (
              <button key={iv.key} onClick={() => setIntervalKey(iv.key)} className={`rounded px-2 py-1 text-[10px] font-bold border ${interval === iv.key ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-secondary/40 text-slate-400 border-border'}`}>{iv.label}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {CHART_TYPES.map((t) => (
              <button key={t} onClick={() => setChartType(t)} className={`rounded px-2 py-1 text-[10px] font-bold border ${chartType === t ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-secondary/40 text-slate-400 border-border'}`}>{t}</button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={showSma} onChange={() => setShowSma(!showSma)} className="accent-amber-500" /> SMA 20/50</label>
          <label className="flex items-center gap-1 text-[10px] text-slate-400"><input type="checkbox" checked={showEma} onChange={() => setShowEma(!showEma)} className="accent-sky-500" /> EMA 20</label>
        </div>

        <div className="flex gap-1.5 flex-wrap mb-3">
          {QUICK_PICKS.map((q) => (
            <button key={q} onClick={() => { setInput(q); setSymbol(q) }} className={`rounded-full px-2 py-0.5 text-[10px] border ${symbol === q ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-border bg-secondary/40 text-slate-400 hover:text-slate-200'}`}>{q}</button>
          ))}
        </div>

        {error ? <p className="text-xs text-amber-300 mb-2">{error}</p> : null}
        <div ref={containerRef} className="w-full rounded-md border border-border bg-background/40 min-h-[460px]" />
        {loading ? <LoadingPanel text={`Loading ${symbol} ${interval}...`} /> : null}
        {meta ? (
          <p className="text-[10px] text-slate-500 mt-2">
            <span className="text-slate-300 num">{meta.symbol}</span>{meta.exchange ? ` · ${meta.exchange}` : ''}{meta.currency ? ` · ${meta.currency}` : ''} · {meta.bars} bars · last {typeof meta.last === 'number' ? meta.last.toLocaleString() : '—'} ·{' '}
            <span className="uppercase font-bold text-amber-300">delayed research data</span> · Twelve Data · fetched {new Date(meta.fetchedAt).toLocaleTimeString()}{meta.cached ? ' (cached)' : ''}{meta.stale ? ' · STALE — upstream unavailable' : ''}
          </p>
        ) : null}
      </Panel>
    </div>
  )
}
