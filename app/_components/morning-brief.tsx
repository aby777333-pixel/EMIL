'use client'

// Morning Brief card (spec §67–69) — lazy, never blocks the dashboard.
// Everything shown is a model assessment built from delayed research data.

import { useCallback, useEffect, useState } from 'react'
import { Panel } from '@/components/cockpit/panel'
import { Sunrise, RefreshCw, AlertTriangle, CalendarDays, Star, Lightbulb } from 'lucide-react'

type Brief = {
  fetchedAt: string; dateKey: string; model: string; headline: string; oneLiner: string
  marketPulse: string[]; watchlist: { symbol: string; note: string }[]
  calendar: { when: string; title: string; impact: string; country: string }[]
  risks: string[]; researchIdeas: string[]; cached?: boolean; stale?: boolean
  inputs: { board: number; watchlist: number; calendar: number; headlines: number; crypto: number }
}

export default function MorningBrief() {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'disabled'>('loading')
  const [error, setError] = useState('')

  const load = useCallback(async (refresh = false) => {
    setState('loading'); setError('')
    try {
      const res = await fetch(`/api/brief${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      if (d?.disabled) { setState('disabled'); return }
      if (!res.ok) throw new Error(d?.error ?? 'Brief unavailable')
      setBrief(d.brief); setState('ready')
    } catch (e: any) {
      setError(e?.message ?? 'Brief unavailable'); setState('error')
    }
  }, [])
  useEffect(() => { load() }, [load])

  if (state === 'disabled') return null

  return (
    <Panel title={`Morning Brief${brief?.dateKey ? ` · ${brief.dateKey}` : ''}`} icon={Sunrise} accent="amber">
      {state === 'loading' ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 w-2/3 rounded bg-slate-700/40" /><div className="h-3 w-full rounded bg-slate-700/30" /><div className="h-3 w-5/6 rounded bg-slate-700/30" />
          <p className="text-[10px] text-slate-500">EMIL is reading the board, your watchlist, today&apos;s calendar and the headlines…</p>
        </div>
      ) : state === 'error' ? (
        <div className="flex items-start gap-2 text-xs text-amber-300"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{error} <button onClick={() => load()} className="underline">retry</button></span></div>
      ) : brief ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white leading-snug">{brief.headline}</p>
              <p className="text-xs text-slate-400 mt-1">{brief.oneLiner}</p>
            </div>
            <button onClick={() => load(true)} title="Regenerate (one AI call)" className="shrink-0 rounded-md border border-border bg-secondary/40 p-1.5 text-slate-400 hover:text-white"><RefreshCw className="h-3.5 w-3.5" /></button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-background/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Market pulse</p>
              <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">{brief.marketPulse.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div className="rounded-md border border-border bg-background/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" /> Your watchlist</p>
              {brief.watchlist.length ? <ul className="space-y-1 text-[11px] text-slate-300">{brief.watchlist.map((w, i) => <li key={i}><span className="num font-semibold text-white">{w.symbol}</span> — {w.note}</li>)}</ul> : <p className="text-[11px] text-slate-500">Add symbols on Global Markets and the brief covers them tomorrow.</p>}
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-2 mb-1 flex items-center gap-1"><CalendarDays className="h-3 w-3 text-cyan-400" /> Calendar</p>
              {brief.calendar.length ? <ul className="space-y-0.5 text-[11px] text-slate-300">{brief.calendar.map((c, i) => <li key={i}><span className="num text-slate-500">{c.when}</span> <span className={c.impact === 'High' ? 'text-red-300' : 'text-amber-300'}>●</span> {c.country} {c.title}</li>)}</ul> : <p className="text-[11px] text-slate-500">No high/medium events in the next 30 hours.</p>}
            </div>
            <div className="rounded-md border border-border bg-background/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-400" /> Risks</p>
              <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">{brief.risks.map((s, i) => <li key={i}>{s}</li>)}</ul>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-2 mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3 text-violet-400" /> Research questions</p>
              <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">{brief.researchIdeas.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Generated {new Date(brief.fetchedAt).toLocaleTimeString()} from delayed research data ({brief.inputs.board} board rows · {brief.inputs.watchlist} watchlist quotes · {brief.inputs.calendar} calendar events · {brief.inputs.headlines} headlines) · <span className="uppercase font-bold text-amber-300">model assessment ({brief.model})</span> · research, not advice{brief.cached ? ' · cached for today' : ''}{brief.stale ? ' · STALE' : ''}
          </p>
        </div>
      ) : null}
    </Panel>
  )
}
