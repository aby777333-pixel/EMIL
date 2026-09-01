'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Menu, X, LogOut, OctagonX, AlertOctagon, Activity, Radio, Newspaper, Wifi, WifiOff, Crown } from 'lucide-react'
import { NAV_ITEMS } from './nav-items'
import { MODE_LABELS, volColor } from '@/lib/format'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface EmilStateLite {
  armed?: boolean
  mode?: string
  guardianStatus?: string
  volatilityStatus?: string
  newsCountdownMins?: number
  nextNewsEvent?: string
  marketDataHealth?: string
  brokerStatus?: string
  brokerLatencyMs?: number
}

export function CockpitShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: sessionData } = useSession()
  const isAdmin = (sessionData?.user as any)?.role === 'admin'
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<EmilStateLite>({})
  const [confirmAction, setConfirmAction] = useState<null | 'close_all' | 'emergency_stop'>(null)
  const [busy, setBusy] = useState(false)
  // The shell remounts on every page navigation, so the sidebar's scroll
  // position is preserved across mounts (report: sidebar jumped to top after
  // clicking a nav item reached by scrolling).
  const navRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    try {
      const saved = sessionStorage.getItem('emil-sidebar-scroll')
      if (saved) el.scrollTop = parseInt(saved, 10) || 0
    } catch { /* storage unavailable */ }
    const onScroll = () => {
      try { sessionStorage.setItem('emil-sidebar-scroll', String(el.scrollTop)) } catch { /* ignore */ }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/state')
      if (res?.ok) {
        const data = await res.json()
        setState(data ?? {})
      }
    } catch (e) {
      console.error('state fetch failed', e)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    const onRefresh = () => load()
    window.addEventListener('emil-state-changed', onRefresh)
    return () => { clearInterval(t); window.removeEventListener('emil-state-changed', onRefresh) }
  }, [load])

  const runEmergency = async (action: 'close_all' | 'emergency_stop') => {
    setBusy(true)
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (res?.ok) {
        toast.success(action === 'close_all' ? 'CLOSE ALL executed — all positions closed, fills verified.' : 'EMERGENCY STOP engaged — EMIL disarmed, no new exposure.')
        window.dispatchEvent(new Event('emil-state-changed'))
        load()
      } else {
        toast.error(data?.error ?? 'Action failed.')
      }
    } catch {
      toast.error('Action failed — connection error.')
    } finally {
      setBusy(false)
      setConfirmAction(null)
    }
  }

  const armed = state?.armed ?? false
  const newsMins = state?.newsCountdownMins ?? 0
  const newsLabel = newsMins > 0 && newsMins < 900 ? `${Math.floor(newsMins / 60)}h ${newsMins % 60}m` : '—'

  const sidebar = (
    <div className="flex h-full flex-col bg-[hsl(216,35%,7%)] border-r border-border">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="h-9 w-9 rounded-md bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center terminal-glow">
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight text-white leading-none">EMIL</div>
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">Control Cockpit</div>
          </div>
        </Link>
      </div>
      <nav ref={navRef} className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-0.5">
        {NAV_ITEMS?.map((item) => {
          const Icon = item?.icon
          const active = pathname === item?.href
          return (
            <Link
              key={item?.href}
              href={item?.href ?? '/'}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-accent border border-transparent'
              }`}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
              <span>{item?.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-3 space-y-2 border-t border-border">
        {isAdmin ? (
          <Link
            href="/command"
            onClick={() => setOpen(false)}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            <Crown className="h-4 w-4" /> COMMAND CENTER
          </Link>
        ) : null}
        <button
          onClick={() => setConfirmAction('close_all')}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-red-950/60 border border-red-500/40 px-3 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-900/60 transition-colors danger-glow"
        >
          <OctagonX className="h-4 w-4" /> CLOSE ALL
        </button>
        <button
          onClick={() => setConfirmAction('emergency_stop')}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-red-600 border border-red-400 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition-colors danger-glow"
        >
          <AlertOctagon className="h-4 w-4" /> EMERGENCY STOP
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">{sidebar}</aside>
      {/* Mobile sidebar */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72">{sidebar}</aside>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 py-2 overflow-x-auto scrollbar-thin">
          <button className="lg:hidden text-slate-400" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${armed ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-slate-500/40 bg-slate-500/10 text-slate-400'}`}>
            <span className={`h-2 w-2 rounded-full ${armed ? 'bg-emerald-400 pulse-dot' : 'bg-slate-500'}`} />
            {armed ? 'EMIL ARMED' : 'EMIL DISARMED'}
          </div>
          <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-300 whitespace-nowrap">
            {MODE_LABELS?.[state?.mode ?? ''] ?? 'Observation'}
          </div>
          <div className={`hidden sm:flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs whitespace-nowrap ${(state?.guardianStatus ?? 'active') === 'active' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
            <ShieldIcon /> Guardian {(state?.guardianStatus ?? 'active') === 'active' ? 'Active' : 'Alert'}
          </div>
          <div className={`hidden md:flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs whitespace-nowrap ${(state?.brokerStatus ?? 'connected') === 'connected' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
            {(state?.brokerStatus ?? 'connected') === 'connected' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            Broker {state?.brokerLatencyMs ?? 0}ms
          </div>
          <div className="hidden md:flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-xs text-emerald-400 whitespace-nowrap">
            <Radio className="h-3 w-3" /> Feed {state?.marketDataHealth ?? 'healthy'}
          </div>
          <div className={`hidden xl:flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs whitespace-nowrap ${volColor(state?.volatilityStatus)}`}>
            Volatility: {(state?.volatilityStatus ?? 'normal').toUpperCase()}
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-xs text-amber-300 whitespace-nowrap">
            <Newspaper className="h-3 w-3" />
            {state?.nextNewsEvent ? `${state.nextNewsEvent} in ${newsLabel}` : 'No high-impact news'}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>

      <AlertDialog open={confirmAction !== null} onOpenChange={(o) => { if (!o) setConfirmAction(null) }}>
        <AlertDialogContent className="border-red-500/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 flex items-center gap-2">
              <AlertOctagon className="h-5 w-5" />
              {confirmAction === 'close_all' ? 'CLOSE ALL POSITIONS' : 'EMERGENCY STOP'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 space-y-2">
              {confirmAction === 'close_all'
                ? 'This will cancel all pending orders, close all open positions and hedges at market, verify fills and report any failures. Market execution may involve slippage.'
                : 'This will immediately stop all new exposure, disarm EMIL and enter Emergency mode. Existing broker-side SL/TP orders remain active. Turning EMIL off does not remove market risk from open positions.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => { if (confirmAction) runEmergency(confirmAction) }}
            >
              {busy ? 'Executing…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
