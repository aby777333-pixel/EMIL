'use client'

// Alert & Notification Center (spec §37, §65). Price alerts on watchlist
// symbols, evaluated against the same cached delayed research quotes the
// watchlist uses. In-app delivery only — honest about it.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, Plus, Trash2, RotateCcw, PauseCircle, CheckCheck, Info } from 'lucide-react'
import { toast } from 'sonner'
import { SafeDate } from '@/components/safe-format'

type Alert = {
  id: string; symbol: string; condition: string; threshold: number
  status: string; note?: string | null; lastPrice?: number | null
  triggeredAt?: string | null; createdAt: string
}
type Notif = {
  id: string; kind: string; title: string; body?: string | null
  href?: string | null; readAt?: string | null; createdAt: string
}

export default function AlertsClient() {
  const [loading, setLoading] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [cap, setCap] = useState(20)
  const [symbol, setSymbol] = useState('')
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [threshold, setThreshold] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      if (data?.disabled) { setDisabled(true); return }
      setAlerts(data?.alerts ?? [])
      setNotifications(data?.notifications ?? [])
      setUnread(data?.unread ?? 0)
      setWatchlist(data?.watchlist ?? [])
      setCap(data?.cap ?? 20)
      if (!symbol && (data?.watchlist ?? []).length) setSymbol(data.watchlist[0])
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  const act = async (payload: any, okMsg?: string) => {
    setBusy(true)
    try {
      const res = await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (okMsg) toast.success(okMsg)
        window.dispatchEvent(new Event('emil-notifications-changed'))
        load()
      } else {
        toast.error(data?.error ?? 'Action failed.')
      }
    } catch {
      toast.error('Action failed — connection error.')
    } finally {
      setBusy(false)
    }
  }

  const createAlert = () => {
    const t = parseFloat(threshold)
    if (!symbol) return toast.error('Pick a watchlist symbol first.')
    if (!isFinite(t) || t <= 0) return toast.error('Enter a positive price threshold.')
    act({ type: 'create', symbol, condition, threshold: t, note: note || undefined }, `Alert set: ${symbol} ${condition} ${t}.`)
    setThreshold(''); setNote('')
  }

  if (disabled) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300">
          The Alert Center is currently disabled by the administrator.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <BellRing className="h-6 w-6 text-cyan-400" /> Alert Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Price alerts on your watchlist symbols, checked against delayed research quotes (cached ~5 min).
          Alerts are research signals — they never place, modify or cancel trades. Delivery is in-app only today.
        </p>
      </div>

      {/* Create alert */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Plus className="h-4 w-4 text-cyan-400" /> New price alert</div>
        {watchlist.length === 0 && !loading ? (
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-400 shrink-0" />
            Your watchlist is empty. Add symbols on <Link className="text-cyan-300 underline" href="/markets">Global Markets</Link> first — alerts are limited to watchlist symbols so they ride the same cached quotes (free data plan).
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-slate-400">
              Symbol
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="mt-1 block rounded-md border border-input bg-background px-2 py-1.5 text-sm text-slate-200">
                {watchlist.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Condition
              <select value={condition} onChange={(e) => setCondition(e.target.value as any)} className="mt-1 block rounded-md border border-input bg-background px-2 py-1.5 text-sm text-slate-200">
                <option value="above">Crosses above</option>
                <option value="below">Crosses below</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Price threshold
              <input value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="decimal" placeholder="e.g. 650.00" className="mt-1 block w-32 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-slate-200" />
            </label>
            <label className="text-xs text-slate-400 flex-1 min-w-[160px]">
              Note (optional)
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="why this level matters" className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-slate-200" />
            </label>
            <button onClick={createAlert} disabled={busy} className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors disabled:opacity-50">
              SET ALERT
            </button>
          </div>
        )}
        <div className="text-[11px] text-slate-500">{alerts.filter((a) => a.status !== 'triggered').length}/{cap} alert slots used.</div>
      </div>

      {/* Alerts list */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold text-slate-200">Your alerts</div>
        {loading ? <div className="p-4 text-xs text-slate-500">Loading…</div>
        : alerts.length === 0 ? <div className="p-4 text-xs text-slate-500">No alerts yet.</div>
        : (
          <div className="divide-y divide-border">
            {alerts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <Link href={`/charts?symbol=${encodeURIComponent(a.symbol)}`} className="font-mono font-bold text-cyan-300 hover:underline">{a.symbol}</Link>
                <span className="text-slate-300">{a.condition === 'above' ? '≥' : '≤'} <span className="font-mono">{a.threshold}</span></span>
                {typeof a.lastPrice === 'number' ? <span className="text-[11px] text-slate-500 font-mono">last {a.lastPrice}</span> : null}
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                  a.status === 'active' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5'
                  : a.status === 'triggered' ? 'text-amber-300 border-amber-500/30 bg-amber-500/5'
                  : 'text-slate-400 border-slate-500/30 bg-slate-500/5'}`}>
                  {a.status}
                </span>
                {a.note ? <span className="text-xs text-slate-500 truncate max-w-[200px]">{a.note}</span> : null}
                <span className="ml-auto flex items-center gap-1.5">
                  {a.status !== 'active' ? (
                    <button title="Re-arm" onClick={() => act({ type: 'rearm', id: a.id }, 'Alert re-armed.')} className="p-1.5 rounded text-slate-400 hover:text-emerald-300 hover:bg-accent"><RotateCcw className="h-3.5 w-3.5" /></button>
                  ) : (
                    <button title="Disable" onClick={() => act({ type: 'disable', id: a.id }, 'Alert disabled.')} className="p-1.5 rounded text-slate-400 hover:text-amber-300 hover:bg-accent"><PauseCircle className="h-3.5 w-3.5" /></button>
                  )}
                  <button title="Delete" onClick={() => act({ type: 'delete', id: a.id }, 'Alert deleted.')} className="p-1.5 rounded text-slate-400 hover:text-red-300 hover:bg-accent"><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200">Notifications {unread > 0 ? <span className="ml-1 text-[10px] font-bold text-red-300 border border-red-500/40 bg-red-500/10 rounded px-1.5 py-0.5">{unread} unread</span> : null}</span>
          {unread > 0 ? (
            <button onClick={() => act({ type: 'mark_all_read' }, 'All notifications marked read.')} className="flex items-center gap-1 text-xs text-cyan-300 hover:underline"><CheckCheck className="h-3.5 w-3.5" /> Mark all read</button>
          ) : null}
        </div>
        {notifications.length === 0 ? <div className="p-4 text-xs text-slate-500">Nothing yet — triggered alerts and system notices land here.</div>
        : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div key={n.id} className={`px-4 py-2.5 ${n.readAt ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${n.readAt ? 'bg-slate-600' : 'bg-cyan-400'}`} />
                  {n.href ? <Link href={n.href} className="font-medium text-slate-200 hover:text-cyan-300">{n.title}</Link> : <span className="font-medium text-slate-200">{n.title}</span>}
                  <span className="ml-auto text-[10px] text-slate-500"><SafeDate date={n.createdAt} localize options={{ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }} /></span>
                  {!n.readAt ? (
                    <button onClick={() => act({ type: 'mark_read', id: n.id })} className="text-[10px] text-slate-500 hover:text-cyan-300">mark read</button>
                  ) : null}
                </div>
                {n.body ? <div className="mt-0.5 pl-3.5 text-xs text-slate-400">{n.body}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
