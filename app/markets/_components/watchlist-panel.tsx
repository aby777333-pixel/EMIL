'use client'

// Personal watchlist (spec §66) — quotes via the cached Data Provider Hub.
// Capped by the current data plan's credit budget, stated honestly.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel } from '@/components/cockpit/panel'
import { Star, Plus, X, CandlestickChart } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WatchlistPanel() {
  const [data, setData] = useState<any>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (retried = false) => {
    try {
      const res = await fetch('/api/watchlist', { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        // Quotes hit the per-minute budget — refresh them once automatically.
        if (d?.quotes?.rateLimited && !retried) {
          setTimeout(() => load(true), (Math.ceil(d.quotes.retryAfterSec ?? 30) + 1) * 1000)
        }
      }
    } catch { /* panel is non-critical */ }
  }, [])
  useEffect(() => { load() }, [load])

  const act = useCallback(async (type: 'add' | 'remove', symbol: string) => {
    if (busy || !symbol.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, symbol }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      if (type === 'add') setInput('')
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Watchlist update failed.')
    } finally {
      setBusy(false)
    }
  }, [busy, load])

  const quoteBySymbol = new Map<string, any>(((data?.quotes?.data ?? []) as any[]).map((q) => [q.symbol, q]))

  return (
    <Panel title={`My Watchlist (${data?.items?.length ?? 0}/${data?.cap ?? 8})`} icon={Star} accent="amber">
      <form onSubmit={(e) => { e.preventDefault(); act('add', input.trim().toUpperCase()) }} className="flex gap-1.5 mb-2.5">
        <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white num" placeholder="Add symbol — AAPL, EUR/USD, BTC/USD…" />
        <button type="submit" disabled={busy} className="rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-3 flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> ADD</button>
      </form>
      {!data ? <LoadingPanel text="Loading watchlist..." /> : (data.items ?? []).length === 0 ? (
        <p className="text-xs text-slate-500">Track up to {data.cap} instruments — quotes refresh through the cached research feed.</p>
      ) : (
        <div className="space-y-1.5">
          {(data.items ?? []).map((it: any) => {
            const q = quoteBySymbol.get(it.symbol)
            return (
              <div key={it.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5">
                <Link href={`/charts?symbol=${encodeURIComponent(it.symbol)}`} className="flex items-center gap-1.5 min-w-0 hover:text-cyan-300 text-slate-200">
                  <CandlestickChart className="h-3 w-3 text-cyan-500 shrink-0" />
                  <span className="num text-[11px] font-semibold truncate">{it.symbol}</span>
                  {q?.name ? <span className="text-[10px] text-slate-500 truncate hidden sm:inline">{q.name}</span> : null}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  {q?.available ? (
                    <span className="num text-[11px] text-white">{q.price?.toLocaleString()} <b className={q.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}>{q.changePct >= 0 ? '+' : ''}{q.changePct?.toFixed(2)}%</b></span>
                  ) : (
                    <span className="text-[9px] text-slate-600" title={q?.reason ?? ''}>unavailable</span>
                  )}
                  <button onClick={() => act('remove', it.symbol)} disabled={busy} className="text-slate-600 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )
          })}
          {data?.quotes?.needsKey ? <p className="text-[10px] text-amber-300">{data.quotes.message}</p> : null}
          {data?.quotes?.fetchedAt ? <p className="text-[10px] text-slate-500">Delayed research quotes · Twelve Data · cached ~5 min{data.quotes.stale ? ' · STALE' : ''}</p> : null}
        </div>
      )}
    </Panel>
  )
}
