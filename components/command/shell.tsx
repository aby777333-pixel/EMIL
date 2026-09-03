'use client'

// EMIL COMMAND — the separate backend command center. Deliberately distinct
// from the customer-facing cockpit: different brand block, amber/red accent,
// its own navigation. Customers never see this surface; the /command layout
// verifies the admin role server-side before anything renders.

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Menu, X, LogOut, Crown, LayoutDashboard, Users, Cable, KeyRound,
  GraduationCap, ArrowLeftCircle, ScrollText, Database, Flag, FlaskConical } from 'lucide-react'
import { CommandPalette } from '@/components/cockpit/command-palette'

const COMMAND_NAV = [
  { href: '/command', label: 'Overview', icon: LayoutDashboard },
  { href: '/command/customers', label: 'Customers · CRM', icon: Users },
  { href: '/command/connections', label: 'Broker Connections', icon: Cable },
  { href: '/command/providers', label: 'Data Providers', icon: Database },
  { href: '/command/keys', label: 'API Keys', icon: KeyRound },
  { href: '/command/flags', label: 'Feature Flags', icon: Flag },
  { href: '/command/demo', label: 'Demo Environment', icon: FlaskConical },
  { href: '/command/research', label: 'Research Ops', icon: GraduationCap },
  { href: '/command/audit', label: 'Audit Trail', icon: ScrollText },
]

export function CommandShell({ children, adminEmail }: { children: React.ReactNode; adminEmail?: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const sidebar = (
    <div className="flex h-full flex-col bg-[hsl(346,30%,7%)] border-r border-red-950/60">
      <div className="px-5 py-5 border-b border-red-950/60">
        <Link href="/command" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="h-9 w-9 rounded-md bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
            <Crown className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight text-white leading-none">EMIL COMMAND</div>
            <div className="text-[10px] text-amber-500/70 tracking-widest uppercase mt-0.5">Backend Command Center</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-0.5">
        {COMMAND_NAV.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25' : 'text-slate-400 hover:text-slate-200 hover:bg-red-950/40 border border-transparent'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-3 space-y-1.5 border-t border-red-950/60">
        <Link href="/" className="flex items-center justify-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/15 transition-colors">
          <ArrowLeftCircle className="h-4 w-4" /> Back to Cockpit
        </Link>
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
      <aside className="hidden lg:block w-64 shrink-0">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72">{sidebar}</aside>
        </div>
      ) : null}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-red-950/60 bg-background/80 backdrop-blur px-4 py-2">
          <button className="lg:hidden text-slate-400" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 whitespace-nowrap">
            <Crown className="h-3.5 w-3.5" /> SUPER ADMIN CONSOLE
          </div>
          <span className="text-[11px] text-slate-500 truncate">Role-verified per request · every action audited{adminEmail ? ` · ${adminEmail}` : ''}</span>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>
      <CommandPalette />
    </div>
  )
}
