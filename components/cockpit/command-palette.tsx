'use client'
import { openEmilTrade } from '@/lib/emil-trade'
import { Beaker, Sigma, CalendarDays, FlaskRound, BookOpenText } from 'lucide-react'

// EMIL command palette — Ctrl/⌘+K from anywhere. Navigation for the cockpit,
// the Command Center (admins) and the EMIL native trading platform.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard, ShieldCheck, CandlestickChart, Network, Gauge, Landmark, FlaskConical,
  GraduationCap, BrainCircuit, Settings, Plug, Microscope, Globe2, Newspaper, Crown,
  Users, Database, KeyRound, ExternalLink, MessageCircleQuestion, Radio, BellRing, Cable,
  ScrollText, Flag,
} from 'lucide-react'

const COCKPIT: { href: string; label: string; icon: any; hint?: string }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/markets', label: 'Global Markets', icon: Globe2, hint: 'terminal · indices · fx · crypto · watchlist' },
  { href: '/charts', label: 'Charts', icon: CandlestickChart, hint: 'candles · SMA/EMA · any symbol' },
  { href: '/correlation', label: 'Correlation Engine', icon: Network, hint: 'pairs · rolling · beta' },
  { href: '/news', label: 'EMIL News', icon: Newspaper, hint: 'global headlines' },
  { href: '/alerts', label: 'Alert Center', icon: BellRing, hint: 'price alerts · notifications' },
  { href: '/arm', label: 'ARM / DISARM', icon: ShieldCheck },
  { href: '/trades', label: 'Trade Cards', icon: CandlestickChart },
  { href: '/agents', label: 'Agent Council', icon: Network },
  { href: '/api-hub', label: 'Global API Hub', icon: Plug, hint: 'brokers · live feeds' },
  { href: '/paper', label: 'Paper Trading Desk', icon: Beaker, hint: 'testnet orders · deribit · gemini · delta' },
  { href: '/backtest', label: 'Backtest Engine', icon: FlaskRound, hint: 'real history · sma · breakout · rsi' },
  { href: '/options', label: 'Options Analytics', icon: Sigma, hint: 'deribit chain · iv · max pain · skew' },
  { href: '/calendar', label: 'Calendar & Central Banks', icon: CalendarDays, hint: 'economic events · rate decisions' },
  { href: '/journal', label: 'Trade Journal', icon: BookOpenText, hint: 'post-trade review · tags · mistakes' },
  { href: '/risk', label: 'Risk Management', icon: Gauge },
  { href: '/capital', label: 'Capital & Performance', icon: Landmark },
  { href: '/strategies', label: 'Strategy Center', icon: FlaskConical },
  { href: '/lab', label: 'Strategy Lab', icon: Microscope },
  { href: '/teach', label: 'Teach EMIL', icon: GraduationCap, hint: 'research desk · ask emil' },
  { href: '/trust', label: 'Trust & Metacognition', icon: BrainCircuit },
  { href: '/settings', label: 'Settings & Permissions', icon: Settings },
]

const COMMAND: { href: string; label: string; icon: any }[] = [
  { href: '/command', label: 'Command Center — Overview', icon: Crown },
  { href: '/command/customers', label: 'Command Center — Customers · CRM', icon: Users },
  { href: '/command/connections', label: 'Command Center — Broker Connections', icon: Cable },
  { href: '/command/providers', label: 'Command Center — Data Providers', icon: Database },
  { href: '/command/keys', label: 'Command Center — API Keys', icon: KeyRound },
  { href: '/command/flags', label: 'Command Center — Feature Flags', icon: Flag },
  { href: '/command/research', label: 'Command Center — Research Ops', icon: GraduationCap },
  { href: '/command/audit', label: 'Command Center — Audit Trail', icon: ScrollText },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { data: sessionData } = useSession()
  const isAdmin = (sessionData?.user as any)?.role === 'admin'

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to any EMIL module… (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Cockpit">
          {COCKPIT.map((c) => (
            <CommandItem key={c.href} value={`${c.label} ${c.hint ?? ''}`} onSelect={() => go(c.href)}>
              <c.icon className="mr-2 h-4 w-4 text-cyan-400" />
              <span>{c.label}</span>
              {c.hint ? <span className="ml-2 text-[10px] text-slate-500">{c.hint}</span> : null}
            </CommandItem>
          ))}
        </CommandGroup>
        {isAdmin ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Command Center (admin)">
              {COMMAND.map((c) => (
                <CommandItem key={c.href} value={c.label} onSelect={() => go(c.href)}>
                  <c.icon className="mr-2 h-4 w-4 text-amber-400" />
                  <span>{c.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
        <CommandSeparator />
        <CommandGroup heading="EMIL Trade">
          <CommandItem value="EMIL Trade native trading platform terminal" onSelect={() => { setOpen(false); openEmilTrade() }}>
            <Radio className="mr-2 h-4 w-4 text-emerald-400" />
            <span>Open EMIL Trade (native trading platform)</span>
            <ExternalLink className="ml-2 h-3 w-3 text-slate-500" />
          </CommandItem>
          <CommandItem value="Ask EMIL research question" onSelect={() => go('/teach')}>
            <MessageCircleQuestion className="mr-2 h-4 w-4 text-violet-400" />
            <span>Ask EMIL a research question</span>
            <span className="ml-2 text-[10px] text-slate-500">Teach EMIL → Ask tab</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
