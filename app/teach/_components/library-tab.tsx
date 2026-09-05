'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, LoadingPanel } from '@/components/cockpit/panel'
import { Search, Sparkles, BookMarked } from 'lucide-react'
import toast from 'react-hot-toast'

const TRUST_LEVELS = [
  { level: 0, label: 'Unprocessed', desc: 'Received, not yet parsed' },
  { level: 1, label: 'Parsed', desc: 'Structure extracted' },
  { level: 2, label: 'Understood', desc: 'Semantics analyzed by the Knowledge Council' },
  { level: 3, label: 'Cross-checked', desc: 'Checked against existing knowledge & contradictions' },
  { level: 4, label: 'Backtested', desc: 'Validated on historical data' },
  { level: 5, label: 'Paper-validated', desc: 'Proven in forward paper trading' },
  { level: 6, label: 'Restricted live', desc: 'Small live exposure allowed' },
  { level: 7, label: 'Production', desc: 'Fully trusted, influences live decisions' },
]

const trustColor = (l: number) => l >= 6 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : l >= 4 ? 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' : l >= 2 ? 'text-amber-300 border-amber-500/40 bg-amber-500/10' : 'text-slate-400 border-slate-600/50 bg-slate-700/30'

export default function LibraryTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [analyses, setAnalyses] = useState<Record<string, string>>({})
  const [analyzing, setAnalyzing] = useState<string | null>(null)

  const load = useCallback(async (query = '') => {
    try {
      const res = await fetch(`/api/knowledge${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      if (!res?.ok) throw new Error('failed')
      const d = await res.json()
      setItems(d?.items ?? [])
    } catch {
      toast.error('Failed to load knowledge library.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Search-as-you-type: re-query ~350 ms after the user stops typing. The
  // initial mount is skipped because the effect above already loaded.
  const firstSearch = useRef(true)
  useEffect(() => {
    if (firstSearch.current) { firstSearch.current = false; return }
    const t = setTimeout(() => load(q), 350)
    return () => clearTimeout(t)
  }, [q, load])

  const analyze = useCallback(async (itemId: string) => {
    if (analyzing) return
    setAnalyzing(itemId)
    setAnalyses((prev) => ({ ...(prev ?? {}), [itemId]: '' }))
    try {
      const res = await fetch('/api/knowledge/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      if (!res?.ok || !res?.body) throw new Error('failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setAnalyses((prev) => ({ ...(prev ?? {}), [itemId]: (prev?.[itemId] ?? '') + chunk }))
      }
      await load(q)
    } catch {
      setAnalyses((prev) => ({ ...(prev ?? {}), [itemId]: 'Analysis stream failed. Please try again.' }))
    } finally {
      setAnalyzing(null)
    }
  }, [analyzing, q, load])

  if (loading) return <LoadingPanel text="Loading knowledge library..." />

  return (
    <div className="space-y-4">
      <Panel title="Knowledge Trust Ladder" icon={BookMarked} accent="violet">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
          {TRUST_LEVELS.map((t) => (
            <div key={t.level} className={`rounded-md border p-2 ${trustColor(t.level)}`}>
              <p className="text-[10px] font-bold">L{t.level} · {t.label}</p>
              <p className="text-[9px] opacity-70 mt-0.5 leading-snug">{t.desc}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={`Manual Knowledge Items (${items.length})`} icon={Search} accent="cyan">
        <form onSubmit={(e) => { e.preventDefault(); load(q) }} className="flex gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e?.target?.value ?? '')} className="flex-1 rounded-md bg-background border border-border px-3 py-2 text-xs text-white" placeholder="Search titles, content, tags… (filters as you type)" />
          <button type="submit" className="rounded-md bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 text-xs font-semibold px-4 transition-colors">SEARCH</button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it: any) => (
            <div key={it?.id} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{it?.title}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 uppercase">{it?.knowledgeType}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 capitalize">{it?.factType}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 capitalize">{it?.status}</span>
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded border ${trustColor(it?.trustLevel ?? 0)}`}>L{it?.trustLevel ?? 0} · {TRUST_LEVELS?.[it?.trustLevel ?? 0]?.label ?? ''}</span>
              </div>
              <div className="mt-2 h-1 rounded bg-slate-800 overflow-hidden">
                <div className="h-full rounded bg-gradient-to-r from-slate-500 via-amber-400 to-emerald-400" style={{ width: `${((it?.trustLevel ?? 0) / 7) * 100}%` }} />
              </div>
              {it?.scopeNote ? <p className="text-[10px] text-slate-500 mt-2">Scope: {it.scopeNote}</p> : null}
              {it?.contentText ? <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-3">{it.contentText}</p> : null}
              {it?.fileName ? <p className="text-[10px] text-slate-500 mt-1.5">📎 {it.fileName}</p> : null}
              <button
                onClick={() => analyze(it?.id)}
                disabled={analyzing !== null}
                className="mt-3 flex items-center gap-1.5 rounded-md bg-violet-600/80 hover:bg-violet-600 disabled:opacity-50 text-white text-[11px] font-semibold px-3 py-1.5 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                {analyzing === it?.id ? 'Knowledge Council analyzing...' : 'Analyze with Knowledge Council'}
              </button>
              {analyses?.[it?.id] ? (
                <div className="mt-2 rounded-md border border-violet-500/30 bg-violet-500/5 p-2.5 text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto scrollbar-thin">{analyses[it.id]}</div>
              ) : it?.analysisResult ? (
                <details className="mt-2">
                  <summary className="text-[10px] text-violet-300 cursor-pointer">View previous analysis</summary>
                  <div className="mt-1 rounded-md border border-border bg-background/40 p-2.5 text-[11px] text-slate-400 whitespace-pre-wrap max-h-56 overflow-y-auto scrollbar-thin">{it.analysisResult}</div>
                </details>
              ) : null}
            </div>
          ))}
          {items.length === 0 ? <p className="text-xs text-slate-500 col-span-2 text-center py-6">No knowledge items match your search.</p> : null}
        </div>
      </Panel>
    </div>
  )
}
