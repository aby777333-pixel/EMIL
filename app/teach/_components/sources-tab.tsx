'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel } from '@/components/cockpit/panel'
import { Library, Search, Youtube, FileText, Sparkles, RefreshCcw, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_TONE: Record<string, string> = {
  queued: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  fetching: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  fetched: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  analyzing: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
  analyzed: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  quarantined: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  error: 'text-red-300 border-red-500/40 bg-red-500/10',
}

const REL_TONE: Record<string, string> = {
  high: 'text-emerald-300', medium: 'text-amber-300', low: 'text-red-300', flagged: 'text-red-400', unrated: 'text-slate-500',
}

export default function SourcesTab({ onChanged }: { onChanged: () => void }) {
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState('')
  const [openId, setOpenId] = useState('')

  const load = useCallback(async (query = '') => {
    try {
      const res = await fetch(`/api/teach/sources${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      const d = await res.json()
      setSources(d?.sources ?? [])
    } catch {
      toast.error('Failed to load the source library.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const analyze = useCallback(async (id: string, refetch = false) => {
    if (busyId) return
    setBusyId(id)
    try {
      const res = await fetch('/api/teach/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: id, refetch }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'analysis failed')
      const p = d?.persisted ?? {}
      toast.success(`Analyzed — ${p.claims ?? 0} claims, ${p.concepts ?? 0} new concepts, ${p.strategies ?? 0} strategies, ${p.contradictions ?? 0} contradictions.`)
      await load(q)
      onChanged()
    } catch (e: any) {
      toast.error(e?.message ?? 'Analysis failed.')
      await load(q)
    } finally {
      setBusyId('')
    }
  }, [busyId, q, load, onChanged])

  if (loading) return <LoadingPanel text="Loading source library..." />

  return (
    <Panel title={`Source Library (${sources.length}) — full provenance, nothing untraceable`} icon={Library} accent="cyan">
      <form onSubmit={(e) => { e.preventDefault(); load(q) }} className="flex gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e?.target?.value ?? '')} className="flex-1 rounded-md bg-background border border-border px-3 py-2 text-xs text-white" placeholder="Search titles, URLs, authors..." />
        <button type="submit" className="rounded-md bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 text-xs font-semibold px-4 transition-colors flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> SEARCH</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.map((s) => {
          const meta = (() => { try { return JSON.parse(s.metadata ?? '{}') } catch { return {} } })()
          return (
            <div key={s.id} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {s.sourceType === 'youtube' ? <Youtube className="h-4 w-4 text-red-400 shrink-0 mt-0.5" /> : <FileText className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 line-clamp-2">{s.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {s.author ? <span>{s.author} · </span> : null}
                      {s.publishedAt ? <span>{String(s.publishedAt).slice(0, 10)} · </span> : null}
                      {s.durationSec ? <span>{Math.round(s.durationSec / 60)} min · </span> : null}
                      <span className={REL_TONE[s.reliability] ?? 'text-slate-500'}>reliability: {s.reliability}</span>
                      {s.claimCount ? <span> · {s.claimCount} claims</span> : null}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_TONE[s.status] ?? STATUS_TONE.queued}`}>{s.status}</span>
              </div>
              {s.fetchError ? <p className="text-[10px] text-amber-400/80 mt-1.5">{s.fetchError}</p> : null}
              {meta?.captionLanguage ? <p className="text-[10px] text-slate-500 mt-1">Transcript: {meta.captionLanguage} · {meta.captionChars?.toLocaleString?.() ?? '?'} chars{meta?.chapters?.length ? ` · ${meta.chapters.length} chapters` : ''}</p> : null}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => analyze(s.id)}
                  disabled={!!busyId || s.status === 'quarantined'}
                  className="flex items-center gap-1.5 rounded-md bg-violet-600/80 hover:bg-violet-600 disabled:opacity-50 text-white text-[11px] font-semibold px-3 py-1.5 transition-colors"
                >
                  <Sparkles className="h-3 w-3" /> {busyId === s.id ? 'Knowledge Council analyzing...' : s.status === 'analyzed' ? 'Re-analyze' : 'Analyze & Teach'}
                </button>
                {s.url ? (
                  <>
                    <button onClick={() => analyze(s.id, true)} disabled={!!busyId || s.status === 'quarantined'} title="Refetch content, then analyze" className="flex items-center gap-1 rounded-md bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 text-slate-300 text-[11px] px-2.5 py-1.5 transition-colors"><RefreshCcw className="h-3 w-3" /> Refetch</button>
                    <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"><ExternalLink className="h-3 w-3" /> Open</a>
                  </>
                ) : null}
              </div>
              {s.status === 'analyzed' ? (
                <button onClick={() => setOpenId(openId === s.id ? '' : s.id)} className="mt-1.5 text-[10px] text-violet-300 hover:text-violet-200">{openId === s.id ? 'Hide details' : 'View extraction details'}</button>
              ) : null}
              {openId === s.id ? <SourceDetail id={s.id} /> : null}
            </div>
          )
        })}
        {sources.length === 0 ? <p className="text-xs text-slate-500 col-span-2 text-center py-6">No sources yet — submit URLs from the Ingest tab.</p> : null}
      </div>
    </Panel>
  )
}

function SourceDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<any>(null)
  useEffect(() => {
    fetch(`/api/teach/source-detail?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => setDetail({ error: true }))
  }, [id])
  if (!detail) return <p className="text-[10px] text-slate-500 mt-2">Loading claims...</p>
  if (detail?.error) return <p className="text-[10px] text-red-400 mt-2">Failed to load details.</p>
  return (
    <div className="mt-2 rounded-md border border-violet-500/20 bg-violet-500/5 p-2.5 max-h-64 overflow-y-auto scrollbar-thin space-y-1.5">
      {(detail?.claims ?? []).map((c: any) => (
        <div key={c.id} className="text-[10px] text-slate-300 border-b border-border/40 pb-1.5">
          <span className={`uppercase font-bold mr-1.5 ${c.claimType === 'performance_claim' ? 'text-red-300' : c.claimType === 'fact' ? 'text-emerald-300' : c.claimType === 'trading_rule' ? 'text-cyan-300' : 'text-amber-300'}`}>{c.claimType.replace('_', ' ')}</span>
          {c.claimText}
          <span className="text-slate-500"> {c.instrument ? `· ${c.instrument}` : ''}{c.timeframe ? ` ${c.timeframe}` : ''}{c.locationHint ? ` · ${c.locationHint}` : ''} · {c.validationStatus} · conf {Math.round(c.confidence)}/100</span>
        </div>
      ))}
      {(detail?.claims ?? []).length === 0 ? <p className="text-[10px] text-slate-500">No claims extracted from this source.</p> : null}
    </div>
  )
}
