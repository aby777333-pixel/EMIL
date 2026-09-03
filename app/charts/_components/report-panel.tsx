'use client'

// Instrument research report panel (spec §67–69) — generated on demand from
// calculated statistics + live context; saved to the research notebook.

import { useCallback, useEffect, useState } from 'react'
import { Panel } from '@/components/cockpit/panel'
import { FileText, RefreshCw, AlertTriangle, BookOpen } from 'lucide-react'

type Report = {
  fetchedAt: string; dateKey: string; model: string; noteId: string | null; symbol: string; title: string; summary: string
  sections: { heading: string; bullets: string[] }[]; watch: string[]; researchQuestions: string[]
  stats: any; inputs: { news: number; calendar: number; portfolioExposureUsd: number | null }; cached?: boolean
}

const f = (v: any, d = 2) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d }))
const pct = (v: any) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`)

export default function ReportPanel({ symbol, open, onClose }: { symbol: string; open: boolean; onClose: () => void }) {
  const [report, setReport] = useState<Report | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')

  const load = useCallback(async (refresh = false) => {
    setState('loading'); setError('')
    try {
      const res = await fetch(`/api/report?symbol=${encodeURIComponent(symbol)}${refresh ? '&refresh=1' : ''}`, { cache: 'no-store' })
      const d = await res.json().catch(() => ({}))
      if (d?.disabled) { setError('Research reports are switched off (flag research_reports).'); setState('error'); return }
      if (!res.ok) throw new Error(d?.error ?? 'Report unavailable')
      setReport(d.report); setState('ready')
    } catch (e: any) { setError(e?.message ?? 'Report unavailable'); setState('error') }
  }, [symbol])

  useEffect(() => { if (open) load() }, [open, load])
  if (!open) return null
  const s = report?.stats

  return (
    <Panel title={`Research report · ${symbol}`} icon={FileText} accent="violet">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] text-slate-500">Calculated statistics from the daily research series + live context → one structured write-up. <span className="uppercase font-bold text-amber-300">Model assessment</span> · not advice.</p>
        <div className="flex items-center gap-1.5">
          <button onClick={() => load(true)} disabled={state === 'loading'} title="Regenerate (one AI call)" className="rounded-md border border-border bg-secondary/40 p-1.5 text-slate-400 hover:text-white disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} /></button>
          <button onClick={onClose} className="text-[10px] text-slate-400 hover:text-white">close</button>
        </div>
      </div>
      {state === 'loading' ? (
        <div className="space-y-2 animate-pulse"><div className="h-4 w-2/3 rounded bg-slate-700/40" /><div className="h-3 w-full rounded bg-slate-700/30" /><div className="h-3 w-5/6 rounded bg-slate-700/30" /><p className="text-[10px] text-slate-500">EMIL is computing the statistics and reading the context…</p></div>
      ) : state === 'error' ? (
        <div className="flex items-start gap-2 text-xs text-amber-300"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{error} <button onClick={() => load()} className="underline">retry</button></span></div>
      ) : report ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-bold text-white">{report.title}</p>
            <p className="text-xs text-slate-400 mt-1">{report.summary}</p>
          </div>
          {s ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[11px]">
              {[
                ['Last', f(s.last, 4)], ['1d', pct(s.ret1d)], ['1w', pct(s.ret1w)], ['1m', pct(s.ret1m)], ['3m', pct(s.ret3m)], ['1y', pct(s.ret1y)],
                ['52w range pos.', `${Math.round((s.rangePos ?? 0) * 100)}%`], ['Vol 20d / 60d', `${f(s.vol20, 1)}% / ${f(s.vol60, 1)}%`],
                ['Max DD 1y', `${f(s.maxDd1y, 1)}%`], ['RSI 14', f(s.rsi14, 1)], ['vs SMA50', s.aboveSma50 === null ? '—' : s.aboveSma50 ? 'above' : 'below'], ['vs SMA200', s.aboveSma200 === null ? '—' : s.aboveSma200 ? 'above' : 'below'],
                ['SMA50 vs 200', s.goldenCross === null ? '—' : s.goldenCross ? 'golden' : 'death'], ['ATR14', `${f(s.atr14Pct)}%`], ['52w low', f(s.lo52, 4)], ['52w high', f(s.hi52, 4)],
              ].map(([k, v]) => <div key={k as string} className="rounded-md border border-border bg-background/40 px-2 py-1.5"><div className="text-[9px] uppercase tracking-wider text-slate-500">{k}</div><div className="num text-slate-200">{v}</div></div>)}
            </div>
          ) : null}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {report.sections.map((sec) => (
              <div key={sec.heading} className="rounded-md border border-border bg-background/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{sec.heading}</p>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">{sec.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
              </div>
            ))}
            <div className="rounded-md border border-border bg-background/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">What to watch</p>
              <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">{report.watch.map((b, i) => <li key={i}>{b}</li>)}</ul>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-2 mb-1">Research questions</p>
              <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">{report.researchQuestions.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" /> Generated {new Date(report.fetchedAt).toLocaleTimeString()} · {report.stats?.bars} daily bars · {report.inputs.news} matched headlines · {report.inputs.calendar} calendar events · {report.model}{report.cached ? ' · cached for today' : ''}{report.noteId ? ' · saved to the research notebook (Teach EMIL)' : ''}
          </p>
        </div>
      ) : null}
    </Panel>
  )
}
