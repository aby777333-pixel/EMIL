'use client'

// Named watchlists (spec §66) — several lists, one cached quote fetch per
// distinct symbol, optional read-only share link. Capped by the current data
// plan's credit budget, stated honestly.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel } from '@/components/cockpit/panel'
import { Star, Plus, X, CandlestickChart, Share2, Pencil, Trash2, Link2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

const LS_ACTIVE = 'emil_watchlist_active_v1'

type Item = { id: string; symbol: string; label?: string | null }
type WList = { id: string; name: string; shareToken: string | null; items: Item[] }

export default function WatchlistPanel() {
  const [data, setData] = useState<any>(null)
  const [active, setActive] = useState<string>('')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (retried = false) => {
    try {
      const res = await fetch('/api/watchlist', { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        if (d?.quotes?.rateLimited && !retried) {
          setTimeout(() => load(true), (Math.ceil(d.quotes.retryAfterSec ?? 30) + 1) * 1000)
        }
      }
    } catch { /* panel is non-critical */ }
  }, [])
  useEffect(() => { load() }, [load])

  const lists: WList[] = useMemo(() => data?.lists ?? [], [data])
  useEffect(() => {
    if (!lists.length) return
    let want = active
    if (!want) { try { want = localStorage.getItem(LS_ACTIVE) ?? '' } catch { /* ignore */ } }
    if (!lists.some((l) => l.id === want)) want = lists[0].id
    if (want !== active) setActive(want)
  }, [lists, active])
  useEffect(() => { if (active) { try { localStorage.setItem(LS_ACTIVE, active) } catch { /* ignore */ } } }, [active])

  const list = lists.find((l) => l.id === active) ?? lists[0]

  const post = useCallback(async (payload: Record<string, unknown>, ok?: string) => {
    if (busy) return null
    setBusy(true)
    try {
      const res = await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      if (ok) toast.success(ok)
      await load()
      return d
    } catch (e: any) {
      toast.error(e?.message ?? 'Watchlist update failed.')
      return null
    } finally {
      setBusy(false)
    }
  }, [busy, load])

  const add = async () => {
    const symbol = input.trim().toUpperCase()
    if (!symbol || !list) return
    const d = await post({ type: 'add', symbol, listId: list.id })
    if (d) setInput('')
  }
  const createList = async () => {
    const name = window.prompt('Name the new list', 'Ideas')
    if (!name?.trim()) return
    const d = await post({ type: 'create_list', name: name.trim() }, 'List created')
    if (d?.listId) setActive(d.listId)
  }
  const renameList = async () => {
    if (!list) return
    const name = window.prompt('Rename list', list.name)
    if (!name?.trim() || name.trim() === list.name) return
    await post({ type: 'rename_list', listId: list.id, name: name.trim() })
  }
  const deleteList = async () => {
    if (!list || !window.confirm(`Delete "${list.name}" and its ${list.items.length} symbols?`)) return
    await post({ type: 'delete_list', listId: list.id }, 'List deleted')
  }
  const copyShare = (token: string) => {
    const url = `${window.location.origin}/w/${token}`
    navigator.clipboard?.writeText(url).then(() => toast.success('Share link copied'), () => toast(url))
  }
  const toggleShare = async () => {
    if (!list) return
    const enabled = !list.shareToken
    const d = await post({ type: 'share_list', listId: list.id, enabled }, enabled ? 'Share link enabled' : 'Share link disabled')
    if (d?.shareToken) copyShare(d.shareToken)
  }

  const quoteBySymbol = useMemo(() => new Map<string, any>(((data?.quotes?.data ?? []) as any[]).map((q) => [q.symbol, q])), [data])

  return (
    <Panel title={`Watchlists · ${data?.distinctCount ?? 0}/${data?.symbolCap ?? 8} symbols`} icon={Star} accent="amber">
      {!data ? <LoadingPanel text="Loading watchlists..." /> : (
        <>
          {/* list tabs */}
          <div className="flex items-center gap-1 flex-wrap mb-2">
            {lists.map((l) => (
              <button key={l.id} onClick={() => setActive(l.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold border transition-colors ${l.id === list?.id ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-border text-slate-400 hover:text-slate-200'}`}>
                {l.name} <span className="text-[9px] opacity-70">{l.items.length}</span>{l.shareToken ? <Link2 className="inline h-3 w-3 ml-1 opacity-70" /> : null}
              </button>
            ))}
            {lists.length < (data?.listCap ?? 6) ? (
              <button onClick={createList} disabled={busy} title="New list" className="rounded-md px-2 py-1 text-[11px] border border-dashed border-border text-slate-500 hover:text-amber-300 hover:border-amber-500/50 flex items-center gap-1"><Plus className="h-3 w-3" /> list</button>
            ) : null}
            {list ? (
              <span className="ml-auto flex items-center gap-1">
                <button onClick={renameList} disabled={busy} title="Rename list" className="text-slate-500 hover:text-white p-1"><Pencil className="h-3 w-3" /></button>
                <button onClick={toggleShare} disabled={busy} title={list.shareToken ? 'Disable share link' : 'Create a read-only share link'} className={`p-1 ${list.shareToken ? 'text-cyan-300' : 'text-slate-500 hover:text-white'}`}><Share2 className="h-3 w-3" /></button>
                {list.shareToken ? <button onClick={() => copyShare(list.shareToken!)} title="Copy share link" className="text-slate-500 hover:text-white p-1"><Copy className="h-3 w-3" /></button> : null}
                {lists.length > 1 ? <button onClick={deleteList} disabled={busy} title="Delete list" className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="h-3 w-3" /></button> : null}
              </span>
            ) : null}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); add() }} className="flex gap-1.5 mb-2.5">
            <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white num" placeholder={`Add to ${list?.name ?? 'list'} — AAPL, EUR/USD, BTC/USD…`} />
            <button type="submit" disabled={busy} className="rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-3 flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> ADD</button>
          </form>

          {!list || list.items.length === 0 ? (
            <p className="text-xs text-slate-500">Track up to {data.symbolCap} distinct instruments across all lists — quotes refresh through the cached research feed. A symbol can live on several lists for free.</p>
          ) : (
            <div className="space-y-1.5">
              {list.items.map((it) => {
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
                      <button onClick={() => post({ type: 'remove', symbol: it.symbol, listId: list.id })} disabled={busy} className="text-slate-600 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )
              })}
              {data?.quotes?.needsKey ? <p className="text-[10px] text-amber-300">{data.quotes.message}</p> : null}
              {data?.quotes?.fetchedAt ? <p className="text-[10px] text-slate-500">Delayed research quotes · Twelve Data · cached ~5 min{data.quotes.stale ? ' · STALE' : ''}</p> : null}
              {list.shareToken ? <p className="text-[10px] text-cyan-300/80 flex items-center gap-1"><Link2 className="h-3 w-3" /> Shared read-only at /w/{list.shareToken} — anyone with the link sees the symbols, not your quotes or account.</p> : null}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
