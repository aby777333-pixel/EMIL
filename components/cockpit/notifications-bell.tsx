'use client'

// Notification bell (spec §65) — lives in the cockpit top bar. Polls the
// Alert Center every 60s; the badge shows unread notifications. Hidden
// entirely when the admin turns the alerts_center feature flag off.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SafeDate } from '@/components/safe-format'

type Notif = { id: string; title: string; body?: string | null; href?: string | null; readAt?: string | null; createdAt: string }

export function NotificationsBell() {
  const [disabled, setDisabled] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts')
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      if (data?.disabled) { setDisabled(true); return }
      setDisabled(false)
      setUnread(data?.unread ?? 0)
      setItems((data?.notifications ?? []).slice(0, 8))
    } catch { /* next poll */ }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    const onChanged = () => load()
    window.addEventListener('emil-notifications-changed', onChanged)
    return () => { clearInterval(t); window.removeEventListener('emil-notifications-changed', onChanged) }
  }, [load])

  const markAllRead = async () => {
    try {
      await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'mark_all_read' }) })
      load()
    } catch { /* ignore */ }
  }

  if (disabled) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button aria-label="Notifications" className="relative flex items-center rounded-md border border-border bg-card/60 px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-600 border border-red-400 text-[9px] font-bold text-white flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 border-border">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">Notifications</span>
          {unread > 0 ? (
            <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-cyan-300 hover:underline"><CheckCheck className="h-3 w-3" /> Mark all read</button>
          ) : null}
        </div>
        <div className="max-h-72 overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <div className="p-3 text-xs text-slate-500">Nothing yet — triggered price alerts land here.</div>
          ) : items.map((n) => (
            <div key={n.id} className={`px-3 py-2 border-b border-border/60 last:border-b-0 ${n.readAt ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${n.readAt ? 'bg-slate-600' : 'bg-cyan-400'}`} />
                {n.href ? (
                  <Link href={n.href} onClick={() => setOpen(false)} className="text-xs font-medium text-slate-200 hover:text-cyan-300 truncate">{n.title}</Link>
                ) : <span className="text-xs font-medium text-slate-200 truncate">{n.title}</span>}
                <span className="ml-auto text-[9px] text-slate-500 whitespace-nowrap"><SafeDate date={n.createdAt} localize options={{ month: 'short', day: 'numeric' }} /></span>
              </div>
              {n.body ? <div className="mt-0.5 pl-3.5 text-[11px] text-slate-400 line-clamp-2">{n.body}</div> : null}
            </div>
          ))}
        </div>
        <Link href="/alerts" onClick={() => setOpen(false)} className="block px-3 py-2 text-center text-[11px] font-semibold text-cyan-300 hover:bg-accent border-t border-border">
          Open the Alert Center
        </Link>
      </PopoverContent>
    </Popover>
  )
}
