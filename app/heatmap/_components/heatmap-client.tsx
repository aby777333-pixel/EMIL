'use client'

// Heatmap & Breadth (spec §12–13) — free, cached feeds only: ECB FX fixings
// (Frankfurter), CoinGecko top-25, the Twelve Data research board. Colour =
// move; tile size = weight (market cap for crypto, G10 vs EM for FX).
// Daily/delayed research data, never execution prices.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { Grid3X3, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

type Tile = { key: string; label: string; group: string; change1: number | null; change2: number | null; weight: number; price: number | null; note?: string }
type Breadth = { group: string; count: number; up: number; down: number; flat: number; avgChange: number | null; best: Tile | null; worst: Tile | null }
type Data = { fetchedAt: string; tiles: Tile[]; breadth: Breadth[]; sources: any }

const pct = (v: number | null) => (v === null || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`)
function heatColor(v: number | null, scale: number) {
  if (v === null || !Number.isFinite(v)) return 'rgba(71,85,105,0.35)'
  const t = Math.max(-1, Math.min(1, v / scale))
  const a = 0.15 + Math.abs(t) * 0.6
  return t >= 0 ? `rgba(52,211,153,${a})` : `rgba(248,113,113,${a})`
}
const SCALE: Record<string, number> = { 'G10 FX': 1, 'EM & other FX': 1.5, 'Crypto (24h / 7d)': 8, 'Indices · Metals · Energy (research board)': 2 }
const GROUP_ORDER = ['Indices · Metals · Energy (research board)', 'G10 FX', 'EM & other FX', 'Crypto (24h / 7d)']

export default function HeatmapClient() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [horizon, setHorizon] = useState<'change1' | 'change2'>('change1')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/data?fn=heat', { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      setData(d); setError('')
    } catch (e: any) { setError(e?.message ?? 'Heatmap unavailable') } finally { setBusy(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const groups = useMemo(() => {
    if (!data) return []
    const m = new Map<string, Tile[]>()
    for (const t of data.tiles) { if (!m.has(t.group)) m.set(t.group, []); m.get(t.group)!.push(t) }
    return Array.from(m.entries()).sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0])).map(([g, tiles]) => [g, [...tiles].sort((a, b) => ((b[horizon] ?? -999) as number) - ((a[horizon] ?? -999) as number))] as [string, Tile[]])
  }, [data, horizon])

  if (error && !data) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Heating up the map…" /></div>

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Grid3X3 className="h-5 w-5 text-cyan-400" /> Heatmap &amp; Breadth</h1>
          <p className="text-xs text-slate-500 mt-1">Where the money moved — FX strength vs the dollar from ECB fixings, crypto from CoinGecko, indices/metals/energy from the research board. Calculated from cached free feeds; daily/delayed, never execution prices.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button onClick={() => setHorizon('change1')} className={`rounded px-2 py-1 text-[10px] font-bold border ${horizon === 'change1' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-secondary/40 text-slate-400 border-border'}`}>1 day / 24h</button>
            <button onClick={() => setHorizon('change2')} className={`rounded px-2 py-1 text-[10px] font-bold border ${horizon === 'change2' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-secondary/40 text-slate-400 border-border'}`}>1 week / 7d</button>
          </div>
          <button onClick={load} disabled={busy} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </div>

      {/* breadth */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {data.breadth.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)).map((b) => {
          const upPct = b.count ? (b.up / b.count) * 100 : 0
          return (
            <div key={b.group} className="rounded-lg border border-border bg-black/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 truncate">{b.group}</p>
              <div className="flex items-baseline gap-2 mt-1"><span className="num text-lg text-white">{Math.round(upPct)}%</span><span className="text-[10px] text-slate-500">advancing · {b.up}↑ {b.down}↓ {b.flat}→ of {b.count}</span></div>
              <div className="h-1.5 rounded bg-red-500/30 mt-1.5 overflow-hidden"><div className="h-1.5 bg-emerald-500/70" style={{ width: `${upPct}%` }} /></div>
              <p className="text-[10px] text-slate-400 mt-1.5">avg {pct(b.avgChange)} · <span className="text-emerald-300 inline-flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{b.best?.key} {pct(b.best?.change1 ?? null)}</span> · <span className="text-red-300 inline-flex items-center gap-0.5"><TrendingDown className="h-3 w-3" />{b.worst?.key} {pct(b.worst?.change1 ?? null)}</span></p>
            </div>
          )
        })}
      </div>

      {groups.map(([g, tiles]) => (
        <Panel key={g} title={`${g} · ${tiles.length}`} icon={Grid3X3} accent={g.startsWith('Crypto') ? 'amber' : g.includes('FX') ? 'emerald' : 'cyan'}>
          <div className="flex flex-wrap gap-1.5">
            {tiles.map((t) => {
              const v = t[horizon]
              return (
                <Link key={t.key} href={`/charts?symbol=${encodeURIComponent(g.includes('FX') ? `USD/${t.key}` : g.startsWith('Crypto') ? `${t.key}/USD` : t.key)}`} title={`${t.label}${t.note ? ` · ${t.note}` : ''}${t.price ? ` · ${t.price}` : ''}`}
                  className="rounded-md border border-border/60 px-2 py-1.5 text-left hover:border-cyan-500/50 transition-colors"
                  style={{ backgroundColor: heatColor(v, SCALE[g] ?? 2), minWidth: `${Math.round(84 + t.weight * 22)}px`, flexGrow: t.weight }}>
                  <div className="num text-[11px] font-bold text-white">{t.key}</div>
                  <div className={`num text-[11px] ${v === null ? 'text-slate-400' : v >= 0 ? 'text-emerald-100' : 'text-red-100'}`}>{pct(v)}</div>
                  <div className="text-[9px] text-white/60 truncate">{t.label.split(' · ')[1] ?? ''}{t.note ? ` · ${t.note}` : ''}</div>
                </Link>
              )
            })}
            {tiles.length === 0 ? <p className="text-xs text-slate-500">No data right now.</p> : null}
          </div>
        </Panel>
      ))}

      <p className="text-[10px] text-slate-500">
        {data.sources.fx ? `FX: ${data.sources.fx.attribution} — fixing ${data.sources.fx.referenceDate} vs ${data.sources.fx.previousDate} (1d) and ${data.sources.fx.weekDate} (1w); positive = currency stronger vs USD${data.sources.fx.stale ? ' · STALE' : ''}. ` : 'FX unavailable. '}
        {data.sources.crypto ? `Crypto: ${data.sources.crypto.attribution} (24h / 7d)${data.sources.crypto.stale ? ' · STALE' : ''}. ` : 'Crypto unavailable. '}
        {data.sources.board ? (data.sources.board.needsKey ? 'Board: needs a Twelve Data key. ' : `Board: ${data.sources.board.attribution}${data.sources.board.stale ? ' · STALE' : ''}. `) : ''}
        Fetched {new Date(data.fetchedAt).toLocaleTimeString()}.
      </p>
    </div>
  )
}
