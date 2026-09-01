'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { fmtNum } from '@/lib/format'
import { BrainCircuit, Gauge, Scale, Radar as RadarIcon, Eye } from 'lucide-react'

const TrustRadar = dynamic(() => import('./trust-radar'), { ssr: false, loading: () => <div className="h-80 flex items-center justify-center text-xs text-slate-500">Loading chart...</div> })

const BANDS = [
  { range: '80–100', label: 'High trust', behavior: 'Full permitted autonomy. Normal sizing within all caps.', color: 'text-emerald-400' },
  { range: '60–79', label: 'Moderate trust', behavior: 'Normal operation with tighter filters; marginal setups skipped.', color: 'text-cyan-300' },
  { range: '40–59', label: 'Reduced trust', behavior: 'Risk reduced, fewer trades, confirmation mode preferred.', color: 'text-amber-300' },
  { range: '20–39', label: 'Low trust', behavior: 'Management-only. No new directional exposure.', color: 'text-orange-400' },
  { range: '0–19', label: 'No trust', behavior: 'Capital protection. EMIL stands down and reports why.', color: 'text-red-400' },
]

const FACTOR_LABELS: Record<string, string> = {
  regimeFamiliarity: 'Regime familiarity',
  historicalEvidence: 'Historical evidence',
  recentLiveAccuracy: 'Recent live accuracy',
  strategyHealth: 'Strategy health',
  dataQuality: 'Data quality',
  modelDrift: 'Model drift (inverted)',
  correlationStability: 'Correlation stability',
  executionQuality: 'Execution quality',
  noveltyPenalty: 'Novelty penalty (inverted)',
}

export default function TrustClient() {
  const [state, setState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      if (!res?.ok) throw new Error('failed')
      const d = await res.json()
      // /api/state returns the EmilState fields at the top level, not under .state
      setState(d ?? null)
    } catch {
      setError('Failed to load trust state.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading trust & metacognition..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  let breakdown: Record<string, number> = {}
  try { breakdown = JSON.parse(state?.trustBreakdown ?? '{}') ?? {} } catch { breakdown = {} }
  const score = state?.trustScore ?? 0
  const band = score >= 80 ? BANDS[0] : score >= 60 ? BANDS[1] : score >= 40 ? BANDS[2] : score >= 20 ? BANDS[3] : BANDS[4]
  const radarData = Object.entries(breakdown ?? {}).map(([k, v]) => ({ factor: FACTOR_LABELS?.[k] ?? k, value: Number(v) || 0 }))

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-violet-400" /> Trust & Metacognition</h1>
        <p className="text-xs text-slate-500 mt-1">EMIL continuously asks: “How much should I trust my own judgment right now?” Trust in the environment is separate from confidence in a setup.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="Environment Trust Score" icon={Gauge} accent="violet">
          <div className="flex flex-col items-center py-4">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={score >= 60 ? '#22d3ee' : score >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 326.7} 326.7`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white num">{fmtNum(score, 0)}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">/ 100</span>
              </div>
            </div>
            <p className={`mt-3 text-sm font-bold ${band?.color}`}>{band?.label}</p>
            <p className="text-[11px] text-slate-400 text-center mt-1 leading-snug">{band?.behavior}</p>
          </div>
        </Panel>

        <Panel title="Trust Breakdown" icon={RadarIcon} accent="cyan" className="xl:col-span-2">
          <div className="h-80">
            <TrustRadar data={radarData} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Confidence vs Trust — The Critical Distinction" icon={Scale} accent="amber">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Trade setup confidence</p>
              <p className="text-2xl font-bold text-emerald-400 num mt-1">82%</p>
              <p className="text-[10px] text-slate-500 mt-1">“This pattern looks excellent.”</p>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Environment trust</p>
              <p className="text-2xl font-bold text-amber-400 num mt-1">46%</p>
              <p className="text-[10px] text-slate-500 mt-1">“But I don't trust these conditions.”</p>
            </div>
          </div>
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
            <p className="text-xs text-slate-300 leading-relaxed"><span className="font-bold text-red-400">Rule:</span> high setup confidence can never override low environment trust. In this example EMIL does <span className="font-semibold text-white">not</span> trade — it reduces risk, requires confirmation, or stands down entirely, and tells you why.</p>
          </div>
        </Panel>

        <Panel title="Novelty Detection" icon={Eye} accent="red">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 p-3">
              <span className="text-xs text-slate-300">Novelty Detector (Agent #32)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">MONITORING</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">When current market behavior fails to match any learned regime — unusual correlation breaks, unprecedented volatility signatures, or price action outside historical distributions — the novelty penalty rises and trust falls automatically.</p>
            <div>
              <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>Current novelty penalty</span><span className="num text-slate-300">{fmtNum(breakdown?.noveltyPenalty ?? 0, 0)}/100 (inverted — higher is safer)</span></div>
              <div className="h-1.5 rounded bg-slate-800 overflow-hidden">
                <div className="h-full rounded bg-violet-500/70" style={{ width: `${Math.min(100, breakdown?.noveltyPenalty ?? 0)}%` }} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">On extreme novelty, EMIL enters capital-protection behavior regardless of how attractive any individual setup appears.</p>
          </div>
        </Panel>
      </div>

      <Panel title="Operational Implications by Trust Band" icon={Gauge} accent="cyan">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
              <th className="py-2 pr-3">Score band</th><th className="py-2 pr-3">Level</th><th className="py-2">EMIL behavior</th>
            </tr>
          </thead>
          <tbody>
            {BANDS.map((b) => (
              <tr key={b.range} className={`border-b border-border/40 text-[11px] ${b === band ? 'bg-cyan-500/5' : ''}`}>
                <td className="py-2 pr-3 num text-slate-300">{b.range}{b === band ? <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">CURRENT</span> : null}</td>
                <td className={`py-2 pr-3 font-semibold ${b.color}`}>{b.label}</td>
                <td className="py-2 text-slate-400">{b.behavior}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
