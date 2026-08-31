'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { fmtNum, voteColor } from '@/lib/format'
import { Bot, Workflow, ShieldCheck } from 'lucide-react'

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  market_analysis: { label: 'Market Analysis', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' },
  strategy: { label: 'Strategy & Signals', color: 'text-blue-400 border-blue-500/30 bg-blue-500/5' },
  risk: { label: 'Risk & Capital Protection', color: 'text-red-400 border-red-500/30 bg-red-500/5' },
  execution: { label: 'Execution & Broker', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
  learning: { label: 'Learning & Metacognition', color: 'text-violet-400 border-violet-500/30 bg-violet-500/5' },
  knowledge: { label: 'Knowledge & Teaching', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
  guardian: { label: 'Guardian Layer', color: 'text-rose-400 border-rose-500/30 bg-rose-500/5' },
}

const PIPELINE_STEPS = [
  'Market Data Validation', 'Instrument Normalization', 'Regime Classification', 'Multi-Timeframe Analysis',
  'Strategy Eligibility', 'Signal Generation', 'Volatility Check', 'Liquidity Check', 'News Check',
  'Correlation Check', 'Portfolio Exposure Check', 'Stop-Loss Calculation', 'Monetary Risk Calculation',
  'Position Size Calculation', '0.01 Minimum Risk Validation', '0.05 Aggregate Exposure Validation',
  'Margin Check', 'Agent Council', 'Capital Protection Agent', 'Independent Risk Engine', 'Guardian',
  'Permission Engine', 'Confirmation Layer', 'Broker Pre-Trade Validation', 'Execution', 'Fill Verification',
  'Live Management', 'Exit', 'Post-Trade Analysis / Memory / Research Learning',
]

const statusDot = (s: string) => s === 'active' ? 'bg-emerald-500' : s === 'degraded' ? 'bg-amber-500' : 'bg-red-500'

export default function AgentsClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/agents')
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError('Failed to load agent council.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading agent council..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  const agents = data?.agents ?? []
  const active = data?.activeCandidate ?? null
  const grouped: Record<string, any[]> = {}
  for (const a of agents) {
    const cat = a?.category ?? 'market_analysis'
    grouped[cat] = [...(grouped?.[cat] ?? []), a]
  }
  const activeStageIdx = PIPELINE_STEPS.findIndex((s) => s.toLowerCase().replace(/ /g, '_').includes((active?.pipelineStage ?? 'zzz').toLowerCase()))

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Bot className="h-5 w-5 text-cyan-400" /> Agent Council</h1>
        <p className="text-xs text-slate-500 mt-1">{agents.length} specialized agents deliberate on every decision. The Guardian holds unconditional veto power.</p>
      </div>

      <Panel title="Decision Pipeline — 29 Steps Every Trade Must Survive" icon={Workflow} accent="cyan">
        {active ? (
          <p className="text-[11px] text-slate-400 mb-3">Active candidate: <span className="text-white font-semibold">{active?.instrument?.symbol} {active?.direction}</span> — currently at stage <span className="text-cyan-300 font-semibold">{(active?.pipelineStage ?? '').replace(/_/g, ' ')}</span></p>
        ) : <p className="text-[11px] text-slate-500 mb-3">No candidate currently in the pipeline.</p>}
        <div className="flex flex-wrap gap-1.5">
          {PIPELINE_STEPS.map((s, i) => {
            const isActive = activeStageIdx >= 0 && i === activeStageIdx
            const passed = activeStageIdx >= 0 && i < activeStageIdx
            return (
              <div key={s} className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] transition-colors ${
                isActive ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-semibold'
                : passed ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400/80'
                : 'border-border bg-background/40 text-slate-500'}`}>
                <span className="num text-[9px] opacity-60">{String(i + 1).padStart(2, '0')}</span>
                {s}
              </div>
            )
          })}
        </div>
      </Panel>

      {Object.entries(CATEGORY_META).map(([cat, meta]) => {
        const list = grouped?.[cat] ?? []
        if (list.length === 0) return null
        return (
          <Panel key={cat} title={`${meta.label} (${list.length})`} icon={cat === 'guardian' ? ShieldCheck : Bot}
            accent={cat === 'guardian' || cat === 'risk' ? 'red' : cat === 'learning' ? 'violet' : cat === 'knowledge' ? 'emerald' : 'cyan'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {list.map((a: any) => {
                const vote = a?.votes?.[0] ?? null
                return (
                  <div key={a?.id} className={`rounded-md border p-3 ${meta.color} bg-opacity-40`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200">#{a?.number} {a?.name}</span>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot(a?.status ?? '')}`} title={a?.status} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">{a?.description}</p>
                    {a?.currentAssessment ? <p className="text-[11px] text-slate-300 mt-2 leading-snug">“{a.currentAssessment}”</p> : null}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Confidence</span><span className="num">{fmtNum(a?.confidence, 0)}%</span>
                      </div>
                      <div className="h-1 rounded bg-slate-800 overflow-hidden">
                        <div className="h-full rounded bg-cyan-500/70" style={{ width: `${Math.min(100, a?.confidence ?? 0)}%` }} />
                      </div>
                    </div>
                    {vote ? (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-500">Latest vote ({vote?.candidate?.instrument?.symbol ?? '-'}):</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded ${voteColor(vote?.vote)}`}>{vote?.vote} {fmtNum(vote?.confidence, 0)}%</span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </Panel>
        )
      })}
    </div>
  )
}
