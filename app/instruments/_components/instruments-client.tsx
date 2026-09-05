'use client'

// Instrument Master (spec §150–151) — every instrument EMIL knows, the symbol
// each provider/venue calls it, what has a research feed today and what is
// tradable on EMIL Trade. Honest labels: PROXY = an ETF stands in for an index
// on the free data plan; COMING SOON = structure ready, feed not wired.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel } from '@/components/cockpit/panel'
import { Boxes, Search, CandlestickChart, ExternalLink, FileText } from 'lucide-react'
import { EMIL_TRADE_URL } from '@/lib/emil-trade'
import { marketLabel } from '@/lib/instruments/catalog'

type Row = {
  key: string; name: string; assetClass: string; market: string; exchange: string; country: string; currency: string
  tdSymbol: string | null; tdProxy: boolean; tvSymbol: string | null; emilTradeSymbol: string | null
  deribitSymbol: string | null; geminiSymbol: string | null; deltaSymbol: string | null; aliases: string
  lotSize: number | null; tickSize: number | null; dataStatus: string; tradable: boolean
}

const MARKET_ORDER = ['forex', 'metals', 'indices', 'energies', 'crypto', 'us_stocks', 'india']

export default function InstrumentsClient() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [q, setQ] = useState('')
  const [market, setMarket] = useState<string>('all')
  // Collapsed market sections (all expanded by default). A live search or a
  // single-market filter force-expands so matches are never hidden.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/instruments?all=1', { cache: 'no-store' }).then((r) => r.json()).then((d) => setRows(d?.instruments ?? [])).catch(() => setRows([]))
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toUpperCase().replace(/[\s\/\-_.:=]/g, '')
    return rows.filter((r) => (market === 'all' || r.market === market) && (!needle || r.key.includes(needle) || r.name.toUpperCase().replace(/[\s\/\-_.:=]/g, '').includes(needle) || r.aliases.toUpperCase().replace(/[\s\/\-_.:=]/g, '').includes(needle)))
  }, [rows, q, market])

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>()
    for (const r of filtered) { if (!m.has(r.market)) m.set(r.market, []); m.get(r.market)!.push(r) }
    return Array.from(m.entries()).sort((a, b) => MARKET_ORDER.indexOf(a[0]) - MARKET_ORDER.indexOf(b[0]))
  }, [filtered])

  const markets = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.market))).sort((a, b) => MARKET_ORDER.indexOf(a) - MARKET_ORDER.indexOf(b)), [rows])
  const stats = useMemo(() => ({ total: rows?.length ?? 0, live: rows?.filter((r) => r.dataStatus === 'live').length ?? 0, tradable: rows?.filter((r) => r.tradable).length ?? 0 }), [rows])

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Boxes className="h-5 w-5 text-cyan-400" /> Instrument Master</h1>
        <p className="text-xs text-slate-500 mt-1">One canonical symbol per instrument and what every provider calls it. Type any spelling — <span className="num text-slate-300">EUR/USD</span>, <span className="num text-slate-300">gold</span>, <span className="num text-slate-300">SPX</span>, <span className="num text-slate-300">nifty</span> — and EMIL resolves it everywhere (watchlists, charts, ⌘K).</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-black/30 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Instruments</div><div className="num text-lg text-white">{stats.total}</div></div>
        <div className="rounded-lg border border-border bg-black/30 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Research feed live</div><div className="num text-lg text-emerald-300">{stats.live}</div></div>
        <div className="rounded-lg border border-border bg-black/30 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Tradable on EMIL Trade</div><div className="num text-lg text-cyan-300">{stats.tradable}</div></div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol, name or alias…" className="w-full rounded-md bg-background border border-border pl-8 pr-2.5 py-1.5 text-xs text-white num" />
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setMarket('all')} className={`rounded-md px-2 py-1 text-[11px] border ${market === 'all' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-border text-slate-400 hover:text-slate-200'}`}>All</button>
          {markets.map((m) => <button key={m} onClick={() => setMarket(m)} className={`rounded-md px-2 py-1 text-[11px] border ${market === m ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-border text-slate-400 hover:text-slate-200'}`}>{marketLabel(m)}</button>)}
        </div>
      </div>

      {rows && groups.length > 1 ? (
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <button onClick={() => setCollapsed({})} className="hover:text-slate-200">Expand all</button>
          <span className="text-slate-700">·</span>
          <button onClick={() => setCollapsed(Object.fromEntries(groups.map(([m]) => [m, true])))} className="hover:text-slate-200">Collapse all</button>
        </div>
      ) : null}

      {!rows ? <LoadingPanel text="Loading instrument master..." /> : groups.length === 0 ? <p className="text-xs text-slate-500">Nothing matches.</p> : groups.map(([m, list]) => (
        <Panel key={m} title={`${marketLabel(m)} · ${list.length}`} icon={Boxes} accent={m === 'india' ? 'emerald' : m === 'crypto' ? 'amber' : 'cyan'}
          collapsible chevron="right"
          open={q.trim() !== '' || market !== 'all' || !collapsed[m]}
          onToggle={() => setCollapsed((c) => ({ ...c, [m]: !c[m] }))}>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                  <th className="py-1.5 pr-3">Symbol</th><th className="py-1.5 pr-3">Name</th><th className="py-1.5 pr-3">Exchange</th><th className="py-1.5 pr-3">Ccy</th>
                  <th className="py-1.5 pr-3">Twelve Data</th><th className="py-1.5 pr-3">TradingView</th><th className="py-1.5 pr-3">Venues</th><th className="py-1.5 pr-3">Data</th><th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.key} className="border-b border-border/40">
                    <td className="py-1.5 pr-3 num text-[11px] font-semibold text-white">{r.key}</td>
                    <td className="py-1.5 pr-3 text-[11px] text-slate-300">{r.name}{r.lotSize ? <span className="ml-1 text-[9px] text-slate-500">lot {r.lotSize}</span> : null}</td>
                    <td className="py-1.5 pr-3 text-[10px] text-slate-400">{r.exchange} · {r.country}</td>
                    <td className="py-1.5 pr-3 text-[10px] text-slate-400">{r.currency}</td>
                    <td className="py-1.5 pr-3 num text-[10px] text-slate-400">{r.tdSymbol ?? '—'}{r.tdProxy ? <span className="ml-1 rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[8px] font-bold text-amber-300">ETF PROXY</span> : null}</td>
                    <td className="py-1.5 pr-3 num text-[10px] text-slate-400">{r.tvSymbol ?? '—'}</td>
                    <td className="py-1.5 pr-3 num text-[10px] text-slate-500">{[r.deribitSymbol && `Deribit ${r.deribitSymbol}`, r.geminiSymbol && `Gemini ${r.geminiSymbol}`, r.deltaSymbol && `Delta ${r.deltaSymbol}`].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="py-1.5 pr-3"><span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${r.dataStatus === 'live' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-slate-400 border-slate-600/50 bg-slate-700/30'}`}>{r.dataStatus === 'live' ? 'live' : 'coming soon'}</span></td>
                    <td className="py-1.5 whitespace-nowrap">
                      {r.tdSymbol ? <Link href={`/charts?symbol=${encodeURIComponent(r.tdSymbol)}`} title="Open chart" className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:underline mr-2"><CandlestickChart className="h-3 w-3" /> chart</Link> : null}
                      {r.tdSymbol ? <Link href={`/charts?symbol=${encodeURIComponent(r.tdSymbol)}&report=1`} title="Generate a research report" className="inline-flex items-center gap-1 text-[10px] text-violet-300 hover:underline mr-2"><FileText className="h-3 w-3" /> report</Link> : null}
                      {r.tradable ? <a href={`${EMIL_TRADE_URL}/terminal`} target="_blank" rel="noopener noreferrer" title="Tradable on EMIL Trade (opens in a new tab)" className="inline-flex items-center gap-1 text-[10px] text-emerald-300 hover:underline"><ExternalLink className="h-3 w-3" /> EMIL Trade</a> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
      <p className="text-[10px] text-slate-600">Research symbols are not execution symbols. Twelve Data rows marked ETF PROXY quote an exchange-traded fund, not the index. India rows on Twelve Data are plan-gated on the free tier and load through the India API Hub instead.</p>
    </div>
  )
}
