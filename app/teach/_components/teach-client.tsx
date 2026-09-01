'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import {
  GraduationCap, Link2, Library, Share2, Lightbulb, NotebookPen, MessageCircleQuestion,
  BookMarked, AlertTriangle, ListTodo, TrendingUp, TrendingDown,
} from 'lucide-react'
import IngestTab from './ingest-tab'
import SourcesTab from './sources-tab'
import KnowledgeTab from './knowledge-tab'
import HypothesesTab from './hypotheses-tab'
import NotebookTab from './notebook-tab'
import AskTab from './ask-tab'
import LibraryTab from './library-tab'

const TABS = [
  { key: 'overview', label: 'Research Desk', icon: GraduationCap },
  { key: 'ingest', label: 'Ingest', icon: Link2 },
  { key: 'sources', label: 'Source Library', icon: Library },
  { key: 'knowledge', label: 'Knowledge Graph', icon: Share2 },
  { key: 'hypotheses', label: 'Hypotheses', icon: Lightbulb },
  { key: 'notebook', label: 'Research Notebook', icon: NotebookPen },
  { key: 'ask', label: 'Ask EMIL', icon: MessageCircleQuestion },
  { key: 'library', label: 'Manual Uploads', icon: BookMarked },
]

export default function TeachClient() {
  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/teach/overview')
      if (!res?.ok) throw new Error('failed')
      setOverview(await res.json())
      setError('')
    } catch {
      setError('Failed to load the TEACH EMIL research desk.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading the EMIL Research Laboratory..." /></div>
  if (error && !overview) return <div className="p-6"><StatusMessage text={error} /></div>

  const c = overview?.counts ?? {}
  const strat = c?.strategies ?? {}
  const hypo = c?.hypotheses ?? {}
  const sumVals = (o: Record<string, number>, keys?: string[]) =>
    Object.entries(o ?? {}).reduce((acc, [k, v]) => acc + (keys && !keys.includes(k) ? 0 : (v as number)), 0)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><GraduationCap className="h-5 w-5 text-emerald-400" /> Teach EMIL — Research Intelligence</h1>
        <p className="text-xs text-slate-500 mt-1">
          Ingest → attribute → understand → question → structure → test → challenge → validate → remember → hypothesize → retest → monitor → evolve.
          EMIL never confuses <span className="text-slate-300">“I read it”</span> with <span className="text-slate-300">“I know it is true.”</span>
        </p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold border transition-colors ${
              tab === t.key ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-secondary/40 text-slate-400 border-border hover:text-slate-200'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <Stat label="Sources Learned" value={c.sources ?? 0} sub={`${c.youtube ?? 0} YouTube · ${c.documents ?? 0} docs/articles`} valueClass="text-emerald-300" />
            <Stat label="Concepts Extracted" value={c.concepts ?? 0} sub={`${c.edges ?? 0} graph relationships`} valueClass="text-cyan-300" />
            <Stat label="Claims On Record" value={c.claims ?? 0} sub="every one attributed to its source" />
            <Stat label="Active Hypotheses" value={(hypo.proposed ?? 0) + (hypo.researching ?? 0) + (hypo.testing ?? 0)} sub={`${hypo.supported ?? 0} supported · ${hypo.rejected ?? 0} rejected`} valueClass="text-violet-300" />
            <Stat label="Strategies (current)" value={sumVals(strat)} sub={`${strat.HUMAN_APPROVED ?? 0} approved · ${strat.REJECTED ?? 0} rejected`} valueClass="text-amber-300" />
            <Stat label="Open Contradictions" value={c.contradictionsOpen ?? 0} sub="conflicts under investigation" valueClass={c.contradictionsOpen ? 'text-red-300' : 'text-white'} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Panel title="Research Queue" icon={ListTodo} accent="cyan">
              {(overview?.queue ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">Queue is empty. Submit URLs from the Ingest tab.</p>
              ) : (
                <div className="space-y-2">
                  {(overview.queue ?? []).map((s: any) => (
                    <div key={s.id} className="rounded-md border border-border bg-background/40 p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-300 truncate">{s.title}</p>
                        {s.fetchError ? <p className="text-[10px] text-amber-400/80 truncate">{s.fetchError}</p> : null}
                      </div>
                      <span className={`shrink-0 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${s.status === 'error' ? 'text-red-300 border-red-500/40 bg-red-500/10' : 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10'}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Recent Confidence Changes" icon={TrendingUp} accent="violet">
              {(overview?.confidenceEvents ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">No confidence changes yet. Confidence only moves on evidence — never on repetition.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                  {(overview.confidenceEvents ?? []).map((e: any) => (
                    <div key={e.id} className="rounded-md border border-border bg-background/40 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-300 truncate">{e.targetName ?? e.targetId} <span className="text-slate-500">({e.targetType})</span></p>
                        <span className={`num text-[11px] font-bold flex items-center gap-1 ${e.next >= e.previous ? 'text-emerald-400' : 'text-red-400'}`}>
                          {e.next >= e.previous ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.round(e.previous)} → {Math.round(e.next)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{e.reason} <span className="text-slate-600">· {e.actor}</span></p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Open Contradictions — the Contradiction Engine" icon={AlertTriangle} accent="red">
            {(overview?.contradictions ?? []).filter((x: any) => ['open', 'investigating'].includes(x.status)).length === 0 ? (
              <p className="text-xs text-slate-500">No open contradictions. When two sources disagree, EMIL records both sides and investigates WHEN each idea works instead of picking a winner.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(overview.contradictions ?? []).filter((x: any) => ['open', 'investigating'].includes(x.status)).slice(0, 6).map((ct: any) => (
                  <div key={ct.id} className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-[11px] font-semibold text-red-300">{ct.topic}</p>
                    <p className="text-[11px] text-slate-300 mt-1.5"><span className="text-slate-500">A:</span> {ct.sideA}</p>
                    <p className="text-[11px] text-slate-300 mt-1"><span className="text-slate-500">B:</span> {ct.sideB}</p>
                    {ct.analysisNote ? <p className="text-[10px] text-amber-300/80 mt-1.5">When does each work? {ct.analysisNote}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === 'ingest' ? <IngestTab onChanged={load} /> : null}
      {tab === 'sources' ? <SourcesTab onChanged={load} /> : null}
      {tab === 'knowledge' ? <KnowledgeTab overview={overview} /> : null}
      {tab === 'hypotheses' ? <HypothesesTab overview={overview} /> : null}
      {tab === 'notebook' ? <NotebookTab overview={overview} /> : null}
      {tab === 'ask' ? <AskTab /> : null}
      {tab === 'library' ? <LibraryTab /> : null}
    </div>
  )
}
