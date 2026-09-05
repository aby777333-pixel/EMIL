'use client'

// Your Data Feed (round F): the business's own quotes, orders and P&L pushed
// through /api/v1/ingest, shown separately from EMIL research data.

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Database, LineChart, ListOrdered, Activity } from 'lucide-react'

const ts = (s?: string | null) => (s ? String(s).slice(0, 16).replace('T', ' ') : '—')

export default function FeedClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const chartRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    try { const res = await fetch('/api/feed', { cache: 'no-store' }); if (!res.ok) throw new Error('failed'); setData(await res.json()) } catch { setError('Failed to load your feed.') }
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

  useEffect(() => {
    if (!data?.equity?.length || !chartRef.current) return
    let chart: any
    ;(async () => {
      const { createChart, ColorType, AreaSeries } = await import('lightweight-charts')
      chartRef.current!.innerHTML = ''
      chart = createChart(chartRef.current!, { height: 240, layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8', fontSize: 11 }, grid: { vertLines: { color: 'rgba(51,65,85,0.35)' }, horzLines: { color: 'rgba(51,65,85,0.35)' } }, timeScale: { borderColor: '#1e293b', timeVisible: true }, rightPriceScale: { borderColor: '#1e293b' } })
      const s = chart.addSeries(AreaSeries, { lineColor: '#f59e0b', topColor: 'rgba(245,158,11,0.25)', bottomColor: 'rgba(245,158,11,0.02)', lineWidth: 2 })
      const seen = new Set<number>()
      const pts = data.equity.map((p: any) => ({ time: Math.floor(new Date(p.ts).getTime() / 1000) as any, value: p.equity })).filter((p: any) => { if (seen.has(p.time)) return false; seen.add(p.time); return true }).sort((a: any, b: any) => a.time - b.time)
      s.setData(pts)
      chart.timeScale().fitContent()
    })()
    return () => { chart?.remove?.() }
  }, [data])

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading your data feed..." /></div>
  const empty = data.counts.quotes + data.counts.orders + data.counts.pnl === 0

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Database className="h-5 w-5 text-amber-400" /> Your Data Feed <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border text-amber-300 border-amber-500/40">customer feed</span></h1>
        <p className="text-xs text-slate-500 mt-1">{data.label}. Push rows with <span className="font-mono">POST /api/v1/ingest/quotes | orders | pnl</span> (ingest scope) — see <Link href="/developers/docs" className="text-cyan-400 hover:underline">the API reference</Link>.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Quotes" value={data.counts.quotes.toLocaleString()} valueClass="text-amber-300" sub={data.span.last ? `latest ${ts(data.span.last)}` : 'none yet'} />
        <Stat label="Orders / fills" value={data.counts.orders.toLocaleString()} />
        <Stat label="P&L points" value={data.counts.pnl.toLocaleString()} />
        <Stat label="Equity change" value={data.stats.changePct === null ? '—' : `${data.stats.changePct > 0 ? '+' : ''}${data.stats.changePct.toFixed(2)}%`} valueClass={(data.stats.changePct ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'} sub={data.stats.lastEquity !== null ? `now ${Number(data.stats.lastEquity).toLocaleString()}` : ''} />
        <Stat label="Max drawdown" value={`${data.stats.maxDrawdownPct.toFixed(2)}%`} valueClass={data.stats.maxDrawdownPct > 10 ? 'text-red-300' : 'text-white'} sub="calculated from your equity points" />
        <Stat label="Realised P&L (sum)" value={data.stats.realized.toLocaleString(undefined, { maximumFractionDigits: 2 })} valueClass={data.stats.realized >= 0 ? 'text-emerald-300' : 'text-red-300'} />
      </div>
      {empty ? (
        <Panel title="Nothing pushed yet" icon={Activity} accent="amber">
          <pre className="text-[10px] leading-relaxed text-slate-300 bg-background/60 border border-border rounded-md p-3 overflow-x-auto whitespace-pre">{`curl -X POST -H "x-api-key: emil_live_…" -H "Content-Type: application/json" \\
  ${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/ingest/pnl \\
  -d '{"rows":[{"account":"desk-1","equity":1250000,"realized":1820,"ts":"${new Date().toISOString()}"}]}'`}</pre>
          <p className="text-[10px] text-slate-500 mt-2">Issue a live key with the <span className="font-mono">ingest</span> scope in Developers &amp; Integrations. Rows stay yours; EMIL only calculates summaries over them.</p>
        </Panel>
      ) : null}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Equity (your P&L points)" icon={LineChart} accent="amber">
          {data.equity.length ? <div ref={chartRef} className="w-full rounded-md border border-border bg-background/40 min-h-[240px]" /> : <p className="text-xs text-slate-500">No equity points yet.</p>}
        </Panel>
        <Panel title={`Latest quotes (${data.latestQuotes.length} symbols)`} icon={Activity} accent="amber">
          <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-left text-[11px]"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">Symbol</th><th className="py-1.5 pr-3">Bid</th><th className="py-1.5 pr-3">Ask</th><th className="py-1.5 pr-3">Last</th><th className="py-1.5">As of</th></tr></thead>
            <tbody>{data.latestQuotes.map((q: any) => <tr key={q.id} className="border-b border-border/40"><td className="py-1.5 pr-3 text-white font-semibold">{q.symbol}</td><td className="py-1.5 pr-3 num">{q.bid ?? '—'}</td><td className="py-1.5 pr-3 num">{q.ask ?? '—'}</td><td className="py-1.5 pr-3 num">{q.last ?? '—'}</td><td className="py-1.5 num text-slate-500">{ts(q.ts)}</td></tr>)}{data.latestQuotes.length === 0 ? <tr><td colSpan={5} className="py-2 text-xs text-slate-500">No quotes yet.</td></tr> : null}</tbody></table></div>
        </Panel>
      </div>
      <Panel title={`Orders & fills (${data.orders.length} latest)`} icon={ListOrdered} accent="amber" collapsible chevron="right" headerExtra={<span className="text-[10px] text-slate-500 normal-case tracking-normal">{data.bySymbol.slice(0, 5).map((s: any) => `${s.symbol} ×${s.orders}`).join(' · ')}</span>}>
        <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-left text-[11px]"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">Time</th><th className="py-1.5 pr-3">External id</th><th className="py-1.5 pr-3">Account</th><th className="py-1.5 pr-3">Symbol</th><th className="py-1.5 pr-3">Side</th><th className="py-1.5 pr-3">Qty</th><th className="py-1.5 pr-3">Price</th><th className="py-1.5">Status</th></tr></thead>
          <tbody>{data.orders.map((o: any) => <tr key={o.id} className="border-b border-border/40"><td className="py-1.5 pr-3 num text-slate-500">{ts(o.ts)}</td><td className="py-1.5 pr-3 font-mono text-slate-400">{o.externalId}</td><td className="py-1.5 pr-3 text-slate-400">{o.account ?? '—'}</td><td className="py-1.5 pr-3 text-white">{o.symbol}</td><td className={`py-1.5 pr-3 uppercase ${o.side === 'buy' ? 'text-emerald-300' : 'text-red-300'}`}>{o.side}</td><td className="py-1.5 pr-3 num">{o.qty}</td><td className="py-1.5 pr-3 num">{o.price ?? '—'}</td><td className="py-1.5 text-slate-400">{o.status}</td></tr>)}{data.orders.length === 0 ? <tr><td colSpan={8} className="py-2 text-xs text-slate-500">No orders yet.</td></tr> : null}</tbody></table></div>
      </Panel>
    </div>
  )
}
