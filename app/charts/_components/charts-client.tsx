'use client'

// EMIL CHARTS — professional charting on TradingView Lightweight Charts
// (Apache-2.0), fed by the Data Provider Hub's cached time series. Indicators
// (SMA/EMA/Bollinger/RSI) are computed inside EMIL (spec §252) — no extra API
// credits. Compare mode rebases a second instrument onto the main scale so
// relative performance reads at a glance. Levels are the trader's own marks,
// persisted per symbol; layouts persist the whole setup (spec §14, §253).
// RESEARCH DATA — delayed feed, never an execution price.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, LoadingPanel } from '@/components/cockpit/panel'
import { CandlestickChart, Search, TrendingUp, GitCompareArrows, Crosshair, Save, Star, Trash2, X, Minus } from 'lucide-react'
import toast from 'react-hot-toast'

const QUICK_PICKS = ['EUR/USD', 'XAU/USD', 'SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'BTC/USD', 'USO', 'USD/INR']
const INTERVALS = [
  { key: '5min', label: '5m' }, { key: '15min', label: '15m' }, { key: '1h', label: '1H' },
  { key: '4h', label: '4H' }, { key: '1day', label: '1D' }, { key: '1week', label: '1W' },
]
const CHART_TYPES = ['Candles', 'Line', 'Area'] as const
const LEVEL_COLORS = ['#f59e0b', '#34d399', '#f87171', '#a78bfa', '#22d3ee']

type Level = { id: string; symbol: string; price: number; label: string | null; color: string }
type Layout = { id: string; name: string; isDefault: boolean; config: { symbol?: string; interval?: string; chartType?: string; sma?: boolean; ema?: boolean; rsi?: boolean; bb?: boolean; compare?: string | null } }

// ---- indicators (in-app, spec §252) ----
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
const bollinger = (values: number[], period = 20, mult = 2) => {
  const mid = sma(values, period)
  const upper: (number | null)[] = [], lower: (number | null)[] = []
  values.forEach((_, i) => {
    if (mid[i] === null) { upper.push(null); lower.push(null); return }
    const win = values.slice(i - period + 1, i + 1)
    const m = mid[i] as number
    const sd = Math.sqrt(win.reduce((s, v) => s + (v - m) ** 2, 0) / period)
    upper.push(m + mult * sd); lower.push(m - mult * sd)
  })
  return { mid, upper, lower }
}
const rsi = (values: number[], period = 14) => {
  const out: (number | null)[] = []
  let avgGain = 0, avgLoss = 0
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { out.push(null); continue }
    const ch = values[i] - values[i - 1]
    const gain = Math.max(ch, 0), loss = Math.max(-ch, 0)
    if (i <= period) {
      avgGain += gain / period; avgLoss += loss / period
      out.push(i === period ? (avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)) : null)
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
    }
  }
  return out
}

// Lightweight-charts wants unix seconds for intraday and 'yyyy-mm-dd' for daily+.
const toTime = (dt: string, daily: boolean) => (daily ? dt.slice(0, 10) : Math.floor(new Date(dt.replace(' ', 'T') + 'Z').getTime() / 1000))
const pts = (times: any[], vals: (number | null)[]) => vals.map((v, i) => (v === null ? null : { time: times[i], value: v })).filter(Boolean) as any

export default function ChartsClient() {
  const [symbol, setSymbol] = useState('EUR/USD')
  const [input, setInput] = useState('EUR/USD')
  const [interval, setIntervalKey] = useState('1h')
  const [chartType, setChartType] = useState<typeof CHART_TYPES[number]>('Candles')
  const [showSma, setShowSma] = useState(true)
  const [showEma, setShowEma] = useState(false)
  const [showBb, setShowBb] = useState(false)
  const [showRsi, setShowRsi] = useState(false)
  const [compare, setCompare] = useState<string | null>(null)
  const [compareInput, setCompareInput] = useState('')
  const [levels, setLevels] = useState<Level[]>([])
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [placing, setPlacing] = useState(false)
  const [levelPrice, setLevelPrice] = useState('')
  const [levelLabel, setLevelLabel] = useState('')
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<any>(null)
  const mainSeriesRef = useRef<any>(null)
  const priceLinesRef = useRef<any[]>([])
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const placingRef = useRef(false)
  const appliedDefault = useRef(false)
  useEffect(() => { placingRef.current = placing }, [placing])

  // ---- persistence: levels for this symbol + saved layouts ----
  const loadSettings = useCallback(async (sym: string) => {
    try {
      const res = await fetch(`/api/charts?symbol=${encodeURIComponent(sym)}`, { cache: 'no-store' })
      if (!res.ok) return
      const d = await res.json()
      setLevels(d.levels ?? [])
      setLayouts(d.layouts ?? [])
      // First visit without a deep link: apply the default layout once.
      if (!appliedDefault.current) {
        appliedDefault.current = true
        const hasDeepLink = !!new URLSearchParams(window.location.search).get('symbol')
        const def = (d.layouts ?? []).find((l: Layout) => l.isDefault)
        if (def && !hasDeepLink) applyLayout(def, false)
      }
    } catch { /* settings are non-critical */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyLayout = (l: Layout, announce = true) => {
    const c = l.config ?? {}
    if (c.symbol) { setSymbol(c.symbol); setInput(c.symbol) }
    if (c.interval) setIntervalKey(c.interval)
    if (c.chartType && (CHART_TYPES as readonly string[]).includes(c.chartType)) setChartType(c.chartType as any)
    setShowSma(!!c.sma); setShowEma(!!c.ema); setShowRsi(!!c.rsi); setShowBb(!!c.bb)
    setCompare(c.compare ?? null); setCompareInput(c.compare ?? '')
    if (announce) toast.success(`Layout "${l.name}" applied`)
  }

  const postSettings = useCallback(async (payload: Record<string, unknown>, ok?: string) => {
    try {
      const res = await fetch('/api/charts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      if (ok) toast.success(ok)
      return d
    } catch (e: any) {
      toast.error(e?.message ?? 'Chart settings update failed.')
      return null
    }
  }, [])

  const saveLayout = async () => {
    const name = window.prompt('Name this layout', `${symbol} ${INTERVALS.find((i) => i.key === interval)?.label ?? interval}`)
    if (!name?.trim()) return
    const d = await postSettings({ type: 'save_layout', name: name.trim(), config: { symbol, interval, chartType, sma: showSma, ema: showEma, rsi: showRsi, bb: showBb, compare } }, 'Layout saved')
    if (d) loadSettings(symbol)
  }
  const addLevel = async (price: number, label?: string) => {
    if (!isFinite(price) || price <= 0) { toast.error('Enter a valid price.'); return }
    const color = LEVEL_COLORS[levels.length % LEVEL_COLORS.length]
    const d = await postSettings({ type: 'add_level', symbol, price, label: label ?? levelLabel, color })
    if (d?.level) { setLevels((cur) => [...cur, d.level].sort((a, b) => b.price - a.price)); setLevelPrice(''); setLevelLabel('') }
  }
  const removeLevel = async (id: string) => {
    const d = await postSettings({ type: 'delete_level', id })
    if (d) setLevels((cur) => cur.filter((l) => l.id !== id))
  }

  // Draw/refresh horizontal levels on the live main series without a rebuild.
  useEffect(() => {
    const s = mainSeriesRef.current
    if (!s) return
    for (const pl of priceLinesRef.current) { try { s.removePriceLine(pl) } catch { /* series replaced */ } }
    priceLinesRef.current = levels.map((l) => s.createPriceLine({ price: l.price, color: l.color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: l.label ?? '' }))
  }, [levels, meta])

  const load = useCallback(async (sym: string, iv: string, type: string, wantSma: boolean, wantEma: boolean, wantBb: boolean, wantRsi: boolean, cmp: string | null) => {
    if (!containerRef.current) return
    if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null }
    setLoading(true)
    setError('')
    try {
      const fetchSeries = async (s: string) => {
        const res = await fetch(`/api/data?fn=time_series&symbol=${encodeURIComponent(s)}&interval=${iv}&outputsize=300`, { cache: 'no-store' })
        const d = await res.json()
        return { res, d }
      }
      const { res, d } = await fetchSeries(sym)
      if (res.status === 429 && d?.retryAfterSec) {
        let s = Math.ceil(d.retryAfterSec)
        setLoading(false)
        setError(`Per-minute market-data budget reached — loading automatically in ${s}s…`)
        retryTimer.current = setInterval(() => {
          s -= 1
          if (s <= 0) {
            if (retryTimer.current) clearInterval(retryTimer.current)
            retryTimer.current = null
            load(sym, iv, type, wantSma, wantEma, wantBb, wantRsi, cmp)
          } else {
            setError(`Per-minute market-data budget reached — loading automatically in ${s}s…`)
          }
        }, 1000)
        return
      }
      if (!res.ok) throw new Error(d?.message ?? d?.error ?? 'Feed unavailable')
      if (d?.needsKey) throw new Error(d.message)
      if (!Array.isArray(d?.data) || d.data.length === 0) throw new Error('No data returned for this symbol/interval.')

      let cmpData: any[] | null = null
      let cmpNote = ''
      if (cmp) {
        const c = await fetchSeries(cmp)
        if (c.res.ok && Array.isArray(c.d?.data) && c.d.data.length) cmpData = c.d.data
        else cmpNote = `Compare: ${cmp} unavailable (${c.d?.message ?? c.d?.error ?? 'no data'})`
      }

      const { createChart, ColorType, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries } = await import('lightweight-charts')
      chartRef.current?.remove?.()
      containerRef.current.innerHTML = ''
      priceLinesRef.current = []
      const chart = createChart(containerRef.current, {
        height: wantRsi ? 560 : 460,
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8', fontSize: 11, panes: { separatorColor: '#1e293b', separatorHoverColor: 'rgba(34,211,238,0.3)', enableResize: true } },
        grid: { vertLines: { color: 'rgba(51,65,85,0.35)' }, horzLines: { color: 'rgba(51,65,85,0.35)' } },
        timeScale: { borderColor: '#1e293b', timeVisible: !iv.includes('day') && !iv.includes('week') },
        rightPriceScale: { borderColor: '#1e293b' },
        crosshair: { mode: 0 },
      })
      chartRef.current = chart
      const daily = ['1day', '1week', '1month'].includes(iv)
      const bars = d.data.filter((b: any) => isFinite(b.close))
      const times = bars.map((b: any) => toTime(b.time, daily))
      const closes = bars.map((b: any) => b.close)

      let main: any
      if (type === 'Candles') {
        main = chart.addSeries(CandlestickSeries, { upColor: '#34d399', downColor: '#f87171', borderUpColor: '#34d399', borderDownColor: '#f87171', wickUpColor: '#34d399', wickDownColor: '#f87171' })
        main.setData(bars.map((b: any, i: number) => ({ time: times[i], open: b.open, high: b.high, low: b.low, close: b.close })))
      } else {
        main = type === 'Area'
          ? chart.addSeries(AreaSeries, { lineColor: '#22d3ee', topColor: 'rgba(34,211,238,0.25)', bottomColor: 'rgba(34,211,238,0.02)', lineWidth: 2 })
          : chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 2 })
        main.setData(bars.map((b: any, i: number) => ({ time: times[i], value: b.close })))
      }
      mainSeriesRef.current = main

      if (wantSma) {
        for (const [period, color] of [[20, '#f59e0b'], [50, '#a78bfa']] as const) {
          const line = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
          line.setData(pts(times, sma(closes, period)))
        }
      }
      if (wantEma) {
        const line = chart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        line.setData(pts(times, ema(closes, 20)))
      }
      if (wantBb) {
        const bb = bollinger(closes, 20, 2)
        for (const [vals, color] of [[bb.upper, 'rgba(167,139,250,0.7)'], [bb.lower, 'rgba(167,139,250,0.7)'], [bb.mid, 'rgba(167,139,250,0.35)']] as const) {
          const line = chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false })
          line.setData(pts(times, vals as (number | null)[]))
        }
      }
      // Compare: second instrument rebased to the main series' first close so both start together.
      if (cmpData) {
        const byTime = new Map<any, number>()
        cmpData.filter((b: any) => isFinite(b.close)).forEach((b: any) => byTime.set(toTime(b.time, daily), b.close))
        let last: number | null = null
        const aligned: (number | null)[] = times.map((t: any) => { const v = byTime.get(t); if (v !== undefined) last = v; return last })
        const firstIdx = aligned.findIndex((v) => v !== null)
        if (firstIdx >= 0) {
          const base = closes[firstIdx] / (aligned[firstIdx] as number)
          const cmpLine = chart.addSeries(LineSeries, { color: '#fb7185', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: `${cmp} (rebased)` })
          cmpLine.setData(pts(times, aligned.map((v) => (v === null ? null : v * base))))
        }
      }
      const hasVolume = bars.some((b: any) => b.volume)
      if (hasVolume) {
        const vol = chart.addSeries(HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' } })
        chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
        vol.setData(bars.map((b: any, i: number) => ({ time: times[i], value: b.volume ?? 0, color: b.close >= b.open ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)' })))
      }
      if (wantRsi) {
        // RSI(14) in its own pane with 30/70 guides.
        const r = chart.addSeries(LineSeries, { color: '#e879f9', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: 'RSI 14' }, 1)
        r.setData(pts(times, rsi(closes, 14)))
        r.createPriceLine({ price: 70, color: 'rgba(248,113,113,0.6)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' })
        r.createPriceLine({ price: 30, color: 'rgba(52,211,153,0.6)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' })
        try { chart.panes()[1]?.setHeight(120) } catch { /* older API */ }
      }
      // Click-to-place a level when the crosshair tool is armed.
      chart.subscribeClick((param: any) => {
        if (!placingRef.current || !param?.point || !mainSeriesRef.current) return
        const price = mainSeriesRef.current.coordinateToPrice(param.point.y)
        if (typeof price === 'number' && isFinite(price)) {
          setPlacing(false)
          addLevelRef.current(Number(price.toPrecision(6)), '')
        }
      })
      chart.timeScale().fitContent()
      setMeta({ symbol: d.symbol, exchange: d.exchange, currency: d.currency, fetchedAt: d.fetchedAt, cached: d.cached, stale: d.stale, bars: bars.length, last: closes[closes.length - 1], cmpNote })
    } catch (e: any) {
      setError(e?.message ?? 'Chart data unavailable.')
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [])
  const addLevelRef = useRef(addLevel)
  useEffect(() => { addLevelRef.current = addLevel }) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link: /charts?symbol=XYZ (watchlist rows, ⌘K and the instrument master link here)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('symbol')
    if (s) { setSymbol(s.toUpperCase()); setInput(s.toUpperCase()) }
  }, [])

  useEffect(() => { loadSettings(symbol) }, [symbol, loadSettings])

  useEffect(() => {
    load(symbol, interval, chartType, showSma, showEma, showBb, showRsi, compare)
    const onResize = () => chartRef.current?.applyOptions?.({ width: containerRef.current?.clientWidth ?? 600 })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chartRef.current?.remove?.()
      chartRef.current = null
      mainSeriesRef.current = null
      if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null }
    }
  }, [symbol, interval, chartType, showSma, showEma, showBb, showRsi, compare, load])

  const Toggle = ({ on, set, label, accent }: { on: boolean; set: (v: boolean) => void; label: string; accent: string }) => (
    <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer"><input type="checkbox" checked={on} onChange={() => set(!on)} className={accent} /> {label}</label>
  )

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><CandlestickChart className="h-5 w-5 text-cyan-400" /> EMIL Charts</h1>
        <p className="text-xs text-slate-500 mt-1">Professional research charting — stocks, FX, metals, crypto, indices (plan-dependent). Delayed research data with SMA/EMA/Bollinger/RSI computed inside EMIL, compare mode, your own levels and saved layouts; never an execution price.</p>
      </div>

      {layouts.length > 0 ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-1">Layouts</span>
          {layouts.map((l) => (
            <span key={l.id} className="group inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 pl-2 pr-1 py-0.5 text-[10px] text-slate-300">
              <button onClick={() => applyLayout(l)} className="hover:text-cyan-300">{l.name}</button>
              <button onClick={async () => { if (await postSettings({ type: 'set_default', id: l.id }, 'Default layout set')) loadSettings(symbol) }} title={l.isDefault ? 'Default layout' : 'Make default'} className={l.isDefault ? 'text-amber-300' : 'text-slate-600 hover:text-amber-300'}><Star className="h-3 w-3" fill={l.isDefault ? 'currentColor' : 'none'} /></button>
              <button onClick={async () => { if (window.confirm(`Delete layout "${l.name}"?`) && (await postSettings({ type: 'delete_layout', id: l.id }))) loadSettings(symbol) }} title="Delete layout" className="text-slate-600 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      ) : null}

      <Panel title="Chart" icon={TrendingUp} accent="cyan">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <form
            onSubmit={(e) => { e.preventDefault(); const s = input.trim().toUpperCase(); if (s) setSymbol(s); else toast.error('Enter a symbol.') }}
            className="flex gap-1.5"
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} className="w-36 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white num" placeholder="gold, EURUSD, SPX, AAPL…" />
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
          <Toggle on={showSma} set={setShowSma} label="SMA 20/50" accent="accent-amber-500" />
          <Toggle on={showEma} set={setShowEma} label="EMA 20" accent="accent-sky-500" />
          <Toggle on={showBb} set={setShowBb} label="Bollinger 20·2σ" accent="accent-violet-500" />
          <Toggle on={showRsi} set={setShowRsi} label="RSI 14" accent="accent-fuchsia-500" />
          <form onSubmit={(e) => { e.preventDefault(); const c = compareInput.trim().toUpperCase(); setCompare(c || null) }} className="flex items-center gap-1">
            <GitCompareArrows className="h-3.5 w-3.5 text-rose-400" />
            <input value={compareInput} onChange={(e) => setCompareInput(e.target.value)} className="w-28 rounded-md bg-background border border-border px-2 py-1 text-[10px] text-white num" placeholder="compare: SPY…" />
            {compare ? <button type="button" onClick={() => { setCompare(null); setCompareInput('') }} title="Remove compare" className="text-slate-500 hover:text-red-400"><X className="h-3.5 w-3.5" /></button> : <button type="submit" className="text-[10px] text-rose-300 hover:underline">compare</button>}
          </form>
          <button onClick={saveLayout} title="Save this setup as a layout" className="ml-auto rounded px-2 py-1 text-[10px] font-bold border border-border bg-secondary/40 text-slate-300 hover:text-white flex items-center gap-1"><Save className="h-3 w-3" /> Save layout</button>
        </div>

        <div className="flex gap-1.5 flex-wrap mb-3">
          {QUICK_PICKS.map((q) => (
            <button key={q} onClick={() => { setInput(q); setSymbol(q) }} className={`rounded-full px-2 py-0.5 text-[10px] border ${symbol === q ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-border bg-secondary/40 text-slate-400 hover:text-slate-200'}`}>{q}</button>
          ))}
        </div>

        {error ? <p className="text-xs text-amber-300 mb-2">{error}</p> : null}
        {meta?.cmpNote ? <p className="text-xs text-rose-300 mb-2">{meta.cmpNote}</p> : null}
        <div ref={containerRef} className={`w-full rounded-md border border-border bg-background/40 ${showRsi ? 'min-h-[560px]' : 'min-h-[460px]'} ${placing ? 'cursor-crosshair ring-1 ring-amber-500/60' : ''}`} />
        {loading ? <LoadingPanel text={`Loading ${symbol} ${interval}...`} /> : null}
        {meta ? (
          <p className="text-[10px] text-slate-500 mt-2">
            <span className="text-slate-300 num">{meta.symbol}</span>{meta.exchange ? ` · ${meta.exchange}` : ''}{meta.currency ? ` · ${meta.currency}` : ''} · {meta.bars} bars · last {typeof meta.last === 'number' ? meta.last.toLocaleString() : '—'} ·{' '}
            <span className="uppercase font-bold text-amber-300">delayed research data</span> · Twelve Data · fetched {new Date(meta.fetchedAt).toLocaleTimeString()}{meta.cached ? ' (cached)' : ''}{meta.stale ? ' · STALE — upstream unavailable' : ''}{compare ? ` · compare ${compare} rebased to first bar` : ''}
          </p>
        ) : null}

        {/* levels */}
        <div className="mt-3 rounded-md border border-border bg-background/30 p-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1"><Minus className="h-3 w-3" /> Levels · {symbol}</span>
            <button onClick={() => setPlacing((p) => !p)} className={`rounded px-2 py-1 text-[10px] font-bold border flex items-center gap-1 ${placing ? 'bg-amber-500/15 text-amber-300 border-amber-500/50' : 'bg-secondary/40 text-slate-300 border-border hover:text-white'}`}><Crosshair className="h-3 w-3" /> {placing ? 'Click the chart to place…' : 'Place on chart'}</button>
            <form onSubmit={(e) => { e.preventDefault(); addLevel(parseFloat(levelPrice)) }} className="flex items-center gap-1">
              <input value={levelPrice} onChange={(e) => setLevelPrice(e.target.value)} placeholder={typeof meta?.last === 'number' ? String(meta.last) : 'price'} className="w-24 rounded-md bg-background border border-border px-2 py-1 text-[10px] text-white num" />
              <input value={levelLabel} onChange={(e) => setLevelLabel(e.target.value)} placeholder="label (optional)" className="w-32 rounded-md bg-background border border-border px-2 py-1 text-[10px] text-white" />
              <button type="submit" className="rounded px-2 py-1 text-[10px] font-bold border border-border bg-secondary/40 text-slate-300 hover:text-white">Add</button>
            </form>
            {levels.length > 0 ? <button onClick={async () => { if (window.confirm(`Clear all ${levels.length} levels on ${symbol}?`) && (await postSettings({ type: 'clear_levels', symbol }))) setLevels([]) }} className="ml-auto text-[10px] text-slate-500 hover:text-red-400">clear all</button> : null}
          </div>
          {levels.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {levels.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px]" style={{ borderColor: l.color + '66', color: l.color }}>
                  <span className="num font-semibold">{l.price.toLocaleString()}</span>{l.label ? <span className="text-slate-400">{l.label}</span> : null}
                  <button onClick={() => removeLevel(l.id)} title="Remove level" className="text-slate-500 hover:text-red-400"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          ) : <p className="mt-1.5 text-[10px] text-slate-600">No levels on {symbol} yet — arm “Place on chart” and click a price, or type one. Levels are your own marks, saved per symbol.</p>}
        </div>
      </Panel>
    </div>
  )
}
