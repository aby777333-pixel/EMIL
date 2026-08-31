'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

export function Panel({ title, icon: Icon, children, className = '', accent = 'cyan' }: {
  title?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
  accent?: 'cyan' | 'red' | 'amber' | 'emerald' | 'violet'
}) {
  const accentColors: Record<string, string> = {
    cyan: 'text-cyan-400', red: 'text-red-400', amber: 'text-amber-400', emerald: 'text-emerald-400', violet: 'text-violet-400',
  }
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`rounded-lg border border-border bg-card hover:border-slate-600/60 transition-colors ${className}`}
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      {title ? (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          {Icon ? <Icon className={`h-4 w-4 ${accentColors?.[accent] ?? 'text-cyan-400'}`} /> : null}
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </motion.section>
  )
}

export function Stat({ label, value, sub, valueClass = 'text-white' }: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  valueClass?: string
}) {
  return (
    <div className="rounded-md bg-secondary/50 border border-border/60 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num text-lg font-semibold leading-tight mt-0.5 ${valueClass}`}>{value}</div>
      {sub ? <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div> : null}
    </div>
  )
}

export function Meter({ value, max, label, danger = 70, warn = 45, unit = '' }: {
  value: number
  max: number
  label?: string
  danger?: number
  warn?: number
  unit?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = pct >= danger ? 'bg-red-500' : pct >= warn ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      {label ? (
        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
          <span>{label}</span>
          <span className="num">{value}{unit} / {max}{unit}</span>
        </div>
      ) : null}
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function LoadingPanel({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
      <span className="h-2 w-2 rounded-full bg-cyan-500 pulse-dot" /> {text}
    </div>
  )
}

export function StatusMessage({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-6 text-center text-sm text-amber-300">
      {text}
    </div>
  )
}
