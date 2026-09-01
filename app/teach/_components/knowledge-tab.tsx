'use client'

import { useMemo, useState } from 'react'
import { Panel } from '@/components/cockpit/panel'
import { Share2, Braces, AlertTriangle, Filter } from 'lucide-react'

const CAT_COLORS: Record<string, string> = {
  indicator: '#22d3ee', strategy: '#f59e0b', macro: '#a78bfa', instrument: '#34d399',
  regime: '#f87171', risk: '#fb7185', psychology: '#fbbf24', session: '#38bdf8',
  event: '#e879f9', central_bank: '#c084fc', correlation: '#4ade80', other: '#94a3b8',
}

const VALIDATION_TONE: Record<string, string> = {
  untested: 'text-slate-400 border-slate-600/50 bg-slate-700/30',
  testing: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  supported: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  weak: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  rejected: 'text-red-300 border-red-500/40 bg-red-500/10',
  regime_dependent: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
}

const CLAIM_TONE: Record<string, string> = {
  fact: 'text-emerald-300', opinion: 'text-slate-400', prediction: 'text-violet-300',
  trading_rule: 'text-cyan-300', performance_claim: 'text-red-300', psychology: 'text-amber-300', hypothesis: 'text-slate-300',
}

// Circular knowledge-graph layout: nodes on a ring grouped by category, edges as chords.
function GraphSvg({ concepts, edges }: { concepts: any[]; edges: any[] }) {
  const nodes = useMemo(() => {
    const sorted = [...concepts].sort((a, b) => (a.category > b.category ? 1 : -1)).slice(0, 40)
    const R = 180
    return sorted.map((c, i) => {
      const angle = (i / Math.max(1, sorted.length)) * Math.PI * 2 - Math.PI / 2
      return { ...c, x: 240 + R * Math.cos(angle), y: 210 + R * Math.sin(angle) }
    })
  }, [concepts])
  const byName = useMemo(() => new Map(nodes.map((n) => [n.name, n])), [nodes])
  const visibleEdges = edges.filter((e) => byName.has(e?.from?.name) && byName.has(e?.to?.name)).slice(0, 80)

  if (nodes.length === 0) return <p className="text-xs text-slate-500 text-center py-10">The knowledge graph is empty — teach EMIL some sources first.</p>

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <svg viewBox="0 0 480 430" className="w-full min-w-[420px] max-w-3xl mx-auto">
        {visibleEdges.map((e, i) => {
          const a = byName.get(e.from.name)!
          const b = byName.get(e.to.name)!
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.relation === 'contradicts' ? '#f87171' : e.relation === 'inverse' ? '#fb923c' : '#334155'} strokeWidth={0.8 + (e.strength ?? 0.5)} opacity={0.5} />
            </g>
          )
        })}
        {nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={4 + Math.min(6, n.sourceCount)} fill={CAT_COLORS[n.category] ?? CAT_COLORS.other} opacity={0.9}>
              <title>{`${n.name} [${n.category}] — ${n.validationStatus}, confidence ${Math.round(n.confidence)}/100, ${n.sourceCount} sources`}</title>
            </circle>
            <text x={n.x} y={n.y - (8 + Math.min(6, n.sourceCount))} textAnchor="middle" fill="#cbd5e1" fontSize="7.5">{n.name.length > 22 ? `${n.name.slice(0, 20)}…` : n.name}</text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {Object.entries(CAT_COLORS).map(([cat, color]) => (
          <span key={cat} className="flex items-center gap-1 text-[9px] text-slate-400 capitalize"><span className="h-2 w-2 rounded-full inline-block" style={{ background: color }} /> {cat.replace('_', ' ')}</span>
        ))}
      </div>
    </div>
  )
}

export default function KnowledgeTab({ overview }: { overview: any }) {
  const [claimFilter, setClaimFilter] = useState('all')
  const concepts = overview?.concepts ?? []
  const edges = overview?.edges ?? []
  const claims = (overview?.claims ?? []).filter((c: any) => claimFilter === 'all' || c.claimType === claimFilter)
  const contradictions = overview?.contradictions ?? []

  return (
    <div className="space-y-4">
      <Panel title={`Trading Knowledge Graph — ${concepts.length} concepts, ${edges.length} relationships`} icon={Share2} accent="cyan">
        <GraphSvg concepts={concepts} edges={edges} />
        {edges.length > 0 ? (
          <div className="mt-3 max-h-40 overflow-y-auto scrollbar-thin space-y-1">
            {edges.slice(0, 40).map((e: any) => (
              <p key={e.id} className="text-[10px] text-slate-400">
                <span className="text-slate-200">{e.from?.name}</span>
                <span className={`mx-1.5 uppercase font-bold ${e.relation === 'contradicts' ? 'text-red-400' : 'text-cyan-500'}`}>{e.relation.replace('_', ' ')}</span>
                <span className="text-slate-200">{e.to?.name}</span>
                {e.note ? <span className="text-slate-500"> — {e.note}</span> : null}
              </p>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel title="Concepts & Evidence-Based Confidence" icon={Braces} accent="violet">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {concepts.map((c: any) => (
            <div key={c.id} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-200">{c.name}</p>
                <span className={`shrink-0 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${VALIDATION_TONE[c.validationStatus] ?? VALIDATION_TONE.untested}`}>{c.validationStatus.replace('_', ' ')}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{c.category.replace('_', ' ')} · {c.sourceCount} source{c.sourceCount === 1 ? '' : 's'}{c.instruments ? ` · ${c.instruments}` : ''}{c.timeframes ? ` · ${c.timeframes}` : ''}</p>
              {c.summary ? <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-3">{c.summary}</p> : null}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded ${c.confidence >= 65 ? 'bg-emerald-500' : c.confidence >= 40 ? 'bg-amber-500' : 'bg-slate-500'}`} style={{ width: `${c.confidence}%` }} />
                </div>
                <span className="num text-[10px] text-slate-400">{Math.round(c.confidence)}/100</span>
              </div>
            </div>
          ))}
          {concepts.length === 0 ? <p className="text-xs text-slate-500 col-span-3 text-center py-6">No concepts yet.</p> : null}
        </div>
      </Panel>

      <Panel title="Attributed Claims — nothing is believed, everything is traced" icon={Filter} accent="amber">
        <div className="flex gap-1.5 flex-wrap mb-3">
          {['all', 'fact', 'opinion', 'prediction', 'trading_rule', 'performance_claim', 'psychology', 'hypothesis'].map((t) => (
            <button key={t} onClick={() => setClaimFilter(t)} className={`rounded px-2 py-1 text-[10px] font-semibold border capitalize transition-colors ${claimFilter === t ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-secondary/40 text-slate-400 border-border'}`}>{t.replace('_', ' ')}</button>
          ))}
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
          {claims.map((cl: any) => (
            <div key={cl.id} className="rounded-md border border-border bg-background/40 p-2.5">
              <p className="text-[11px] text-slate-300">
                <span className={`uppercase font-bold mr-1.5 ${CLAIM_TONE[cl.claimType] ?? 'text-slate-400'}`}>{cl.claimType.replace('_', ' ')}</span>
                {cl.claimType === 'performance_claim' ? <span className="text-red-400/80">Source claims: </span> : null}
                {cl.claimText}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {cl.concept?.name ? <span className="text-violet-300/80">{cl.concept.name} · </span> : null}
                {cl.instrument ? `${cl.instrument} ` : ''}{cl.timeframe ?? ''}{cl.regime ? ` · ${cl.regime}` : ''}
                {' · '}<span className="text-slate-400">{cl.source?.title?.slice(0, 60)}</span>{cl.locationHint ? ` @ ${cl.locationHint}` : ''}
                {' · '}{cl.validationStatus} · conf {Math.round(cl.confidence)}/100
                {cl.source?.url ? <> · <a className="text-cyan-400 hover:text-cyan-300" href={cl.source.url} target="_blank" rel="noreferrer">source ↗</a></> : null}
              </p>
              {cl.evidenceText ? <p className="text-[10px] text-slate-500 mt-1">Evidence supplied by source: {cl.evidenceText}</p> : null}
            </div>
          ))}
          {claims.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No claims match this filter.</p> : null}
        </div>
      </Panel>

      <Panel title="Contradiction Engine — full record" icon={AlertTriangle} accent="red">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contradictions.map((ct: any) => (
            <div key={ct.id} className={`rounded-md border p-3 ${['open', 'investigating'].includes(ct.status) ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-background/40'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-200">{ct.topic}</p>
                <span className="shrink-0 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border text-slate-300 border-slate-500/40 bg-slate-500/10">{ct.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1.5"><span className="text-slate-500">Side A:</span> {ct.sideA}</p>
              <p className="text-[11px] text-slate-300 mt-1"><span className="text-slate-500">Side B:</span> {ct.sideB}</p>
              {ct.analysisNote ? <p className="text-[10px] text-amber-300/80 mt-1.5">WHEN does each work? {ct.analysisNote}</p> : null}
              {ct.resolutionNote ? <p className="text-[10px] text-emerald-300/80 mt-1">Resolution: {ct.resolutionNote}</p> : null}
            </div>
          ))}
          {contradictions.length === 0 ? <p className="text-xs text-slate-500 col-span-2 text-center py-6">No contradictions recorded yet.</p> : null}
        </div>
      </Panel>
    </div>
  )
}
