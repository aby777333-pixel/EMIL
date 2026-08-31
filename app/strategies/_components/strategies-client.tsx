'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { fmtNum, fmtPct, fmtMoney } from '@/lib/format'
import { Target, Trophy, FlaskConical, GitCompareArrows, Activity } from 'lucide-react'

const STAGES = ['research', 'backtest', 'paper', 'restricted_live', 'production']

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    healthy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    watch: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    degraded: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
    suspended: 'bg-red-500/15 text-red-400 border-red-500/40',
    research_only: 'bg-violet-500/15 text-violet-400 border-violet-500/40',
  }
  return map?.[s] ?? 'bg-slate-700/40 text-slate-300 border-slate-600/50'
}

const driftBadge = (s: string) => {
  const map: Record<string, string> = {
    stable: 'bg-emerald-500/10 text-emerald-400',
    drifting: 'bg-amber-500/10 text-amber-400',
    drift_alert: 'bg-red-500/15 text-red-400',
  }
  return map?.[s] ?? 'bg-slate-700/40 text-slate-300'
}

const healthBarColor = (v: number) => v >= 70 ? 'bg-emerald-500/80' : v >= 45 ? 'bg-amber-500/80' : 'bg-red-500/80'

function parseRegimes(s: string | null | undefined): { regime: string; winRate: number }[] {
  try {
    const o = JSON.parse(s ?? '')
    if (Array.isArray(o)) return o
    return Object.entries(o ?? {}).map(([regime, winRate]) => ({ regime, winRate: Number(winRate) || 0 }))
  } catch { return [] }
}

export default function StrategiesClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/strategies')
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError('Failed to load strategies.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading strategy center..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  const strategies = data?.strategies ?? []
  const champion = strategies.find((s: any) => s?.isChampion) ?? null
  const challenger = strategies.find((s: any) => s?.isChallenger) ?? null

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Target className="h-5 w-5 text-cyan-400" /> Strategy Center</h1>
        <p className="text-xs text-slate-500 mt-1">Every strategy is versioned, health-scored and monitored for drift. Challengers must earn promotion: research → backtest → paper → restricted live → production.</p>
      </div>

      {champion && challenger ? (
        <Panel title="Champion vs Challenger" icon={GitCompareArrows} accent="amber">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[champion, challenger].map((s: any, idx: number) => (
              <div key={s?.id} className={`rounded-md border p-4 ${idx === 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-violet-500/40 bg-violet-500/5'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    {idx === 0 ? <Trophy className="h-4 w-4 text-amber-400" /> : <FlaskConical className="h-4 w-4 text-violet-400" />}
                    {s?.name} {s?.version}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${idx === 0 ? 'border-amber-500/40 text-amber-300' : 'border-violet-500/40 text-violet-300'}`}>{idx === 0 ? 'CHAMPION · LIVE' : `CHALLENGER · ${(s?.stage ?? '').replace(/_/g, ' ').toUpperCase()}`}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Win rate" value={fmtPct(s?.winRate, 1)} />
                  <Stat label="Profit factor" value={fmtNum(s?.profitFactor, 2)} />
                  <Stat label="Expectancy" value={fmtMoney(s?.expectancy)} />
                  <Stat label="Sharpe-like" value={fmtNum(s?.sharpeLike, 2)} />
                  <Stat label="Max DD" value={fmtPct(s?.maxDrawdownPct, 1)} />
                  <Stat label="Trades" value={String(s?.trades ?? 0)} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3">A challenger replaces the champion only after outperforming across regimes in paper and restricted-live evaluation — never on backtest results alone.</p>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {strategies.map((s: any) => {
          const regimes = parseRegimes(s?.regimePerformance)
          const stageIdx = STAGES.indexOf(s?.stage ?? '')
          return (
            <Panel key={s?.id} title={`${s?.name} ${s?.version}`} icon={Activity}
              accent={s?.status === 'healthy' ? 'emerald' : s?.status === 'suspended' || s?.status === 'degraded' ? 'red' : 'amber'}>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${statusBadge(s?.status ?? '')}`}>{(s?.status ?? '').replace(/_/g, ' ')}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${driftBadge(s?.driftStatus ?? '')}`}>drift: {(s?.driftStatus ?? '').replace(/_/g, ' ')}</span>
                <span className="px-2 py-0.5 rounded bg-slate-700/40 text-slate-300 text-[10px] capitalize">{s?.strategyType}</span>
                {s?.isChampion ? <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold">CHAMPION</span> : null}
                {s?.isChallenger ? <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 text-[10px] font-bold">CHALLENGER</span> : null}
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Health score</span><span className="num text-slate-300">{fmtNum(s?.healthScore, 0)}/100</span>
                </div>
                <div className="h-1.5 rounded bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded ${healthBarColor(s?.healthScore ?? 0)}`} style={{ width: `${Math.min(100, s?.healthScore ?? 0)}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                <div className="rounded bg-background/40 border border-border p-2"><p className="text-[9px] uppercase text-slate-500">Win rate</p><p className="text-xs font-bold text-slate-200 num">{fmtPct(s?.winRate, 1)}</p></div>
                <div className="rounded bg-background/40 border border-border p-2"><p className="text-[9px] uppercase text-slate-500">PF</p><p className="text-xs font-bold text-slate-200 num">{fmtNum(s?.profitFactor, 2)}</p></div>
                <div className="rounded bg-background/40 border border-border p-2"><p className="text-[9px] uppercase text-slate-500">Expectancy</p><p className="text-xs font-bold text-slate-200 num">{fmtMoney(s?.expectancy)}</p></div>
                <div className="rounded bg-background/40 border border-border p-2"><p className="text-[9px] uppercase text-slate-500">Sharpe</p><p className="text-xs font-bold text-slate-200 num">{fmtNum(s?.sharpeLike, 2)}</p></div>
                <div className="rounded bg-background/40 border border-border p-2"><p className="text-[9px] uppercase text-slate-500">Avg win</p><p className="text-xs font-bold text-emerald-400 num">{fmtMoney(s?.avgWin)}</p></div>
                <div className="rounded bg-background/40 border border-border p-2"><p className="text-[9px] uppercase text-slate-500">Avg loss</p><p className="text-xs font-bold text-red-400 num">{fmtMoney(s?.avgLoss)}</p></div>
                <div className="rounded bg-background/40 border border-border p-2"><p className="text-[9px] uppercase text-slate-500">Max DD</p><p className="text-xs font-bold text-amber-300 num">{fmtPct(s?.maxDrawdownPct, 1)}</p></div>
                <div className="rounded bg-background/40 border border-border p-2"><p className="text-[9px] uppercase text-slate-500">Trades</p><p className="text-xs font-bold text-slate-200 num">{s?.trades ?? 0}</p></div>
              </div>

              {regimes.length > 0 ? (
                <div className="mb-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Performance by Regime (win rate)</h4>
                  <div className="space-y-1">
                    {regimes.map((r) => (
                      <div key={r?.regime} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-32 shrink-0 capitalize truncate">{(r?.regime ?? '').replace(/_/g, ' ')}</span>
                        <div className="flex-1 h-1.5 rounded bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded ${r?.winRate >= 55 ? 'bg-emerald-500/70' : r?.winRate >= 45 ? 'bg-amber-500/70' : 'bg-red-500/70'}`} style={{ width: `${Math.min(100, r?.winRate ?? 0)}%` }} />
                        </div>
                        <span className="text-[10px] num text-slate-400 w-9 text-right">{fmtNum(r?.winRate, 0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Promotion Pipeline</h4>
                <div className="flex items-center gap-1">
                  {STAGES.map((st, i) => (
                    <div key={st} className="flex items-center gap-1 flex-1">
                      <div className={`flex-1 rounded px-1 py-1 text-center text-[9px] font-semibold uppercase tracking-wide ${i <= stageIdx ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800/60 text-slate-600 border border-border'}`}>{st.replace(/_/g, ' ')}</div>
                      {i < STAGES.length - 1 ? <span className="text-slate-600 text-[9px]">›</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
