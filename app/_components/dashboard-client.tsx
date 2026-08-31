'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Wallet, ShieldCheck, TrendingUp, Layers, Gauge, Network, FlaskConical,
  Globe2, BookOpen, XCircle, Link2, Activity, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Panel, Stat, Meter, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { fmtMoney, fmtSigned, fmtPct, fmtNum, plColor, healthColor, volColor, MODE_LABELS } from '@/lib/format'

export function DashboardClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res?.ok) throw new Error('load failed')
      setData(await res.json())
    } catch (e) {
      console.error('dashboard load error', e)
      setError('Unable to load dashboard data. Please refresh.')
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    const onRefresh = () => load()
    window.addEventListener('emil-state-changed', onRefresh)
    return () => { clearInterval(t); window.removeEventListener('emil-state-changed', onRefresh) }
  }, [load])

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <LoadingPanel text="Loading cockpit…" />

  const acc = data?.account ?? {}
  const st = data?.state ?? {}
  const profile = data?.riskProfile ?? {}
  const positions = data?.positions ?? []
  const openPositions = positions?.filter((p: any) => p?.status === 'open' && !p?.isHedge) ?? []
  const pendingPositions = positions?.filter((p: any) => p?.status === 'pending') ?? []
  const hedgePositions = positions?.filter((p: any) => p?.isHedge && p?.status === 'open') ?? []
  const openLots = data?.openLots ?? 0
  const maxExp = profile?.maxAggregateExposure ?? 0.05
  const remaining = Math.max(0, maxExp - openLots)
  const ddFromHwm = acc?.highWaterMark ? ((acc.highWaterMark - (acc?.equity ?? 0)) / acc.highWaterMark) * 100 : 0
  const dailyBudget = (acc?.balance ?? 0) * ((profile?.dailyLossLimitPct ?? 2) / 100)
  const riskUsed = Math.max(0, -(acc?.dailyPL ?? 0))
  const clusters: Record<string, any[]> = {}
  for (const c of data?.correlations ?? []) {
    const key = c?.cluster ?? 'other'
    clusters[key] = [...(clusters[key] ?? []), c]
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1800px] mx-auto">
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Control Cockpit</h1>
          <p className="text-sm text-muted-foreground">
            Mode: <span className="text-cyan-300">{MODE_LABELS?.[st?.mode ?? ''] ?? '—'}</span> · Guardian: <span className="text-emerald-400">{st?.guardianDecision ?? '—'}</span>
          </p>
        </div>
        <Link href="/arm" className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors">
          {st?.armed ? 'Manage ARM / Mode →' : 'ARM EMIL →'}
        </Link>
      </div>

      {/* Account metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Balance" value={fmtMoney(acc?.balance)} />
        <Stat label="Equity" value={fmtMoney(acc?.equity)} valueClass="text-cyan-300" />
        <Stat label="Floating P/L" value={fmtSigned(acc?.floatingPL)} valueClass={plColor(acc?.floatingPL)} />
        <Stat label="Daily P/L" value={fmtSigned(acc?.dailyPL)} valueClass={plColor(acc?.dailyPL)} />
        <Stat label="Weekly P/L" value={fmtSigned(acc?.weeklyPL)} valueClass={plColor(acc?.weeklyPL)} />
        <Stat label="High-Water Mark" value={fmtMoney(acc?.highWaterMark)} sub={`Drawdown from HWM: ${fmtPct(ddFromHwm)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Capital architecture */}
        <Panel title="Capital Architecture" icon={Wallet} accent="emerald">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Protected" value={fmtMoney(acc?.protectedCapital)} valueClass="text-emerald-400" />
              <Stat label="Profit" value={fmtMoney(acc?.profitCapital)} valueClass="text-cyan-300" />
              <Stat label="Working" value={fmtMoney(acc?.workingCapital)} valueClass="text-amber-300" />
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-secondary">
              <div className="bg-emerald-500/80" style={{ width: `${((acc?.protectedCapital ?? 0) / ((acc?.equity ?? 1))) * 100}%` }} />
              <div className="bg-cyan-500/80" style={{ width: `${((acc?.profitCapital ?? 0) / ((acc?.equity ?? 1))) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Profit floor: <span className="num text-slate-300">{fmtMoney(acc?.profitFloor)}</span></span>
              <span>Doubling milestone: <span className="num text-slate-300">{fmtMoney((acc?.protectedCapital ?? 0) * 2)}</span> ({fmtPct(((acc?.equity ?? 0) / ((acc?.protectedCapital ?? 1) * 2)) * 100, 1)})</span>
            </div>
          </div>
        </Panel>

        {/* Exposure */}
        <Panel title="Exposure & Lot Discipline" icon={Layers} accent="cyan">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Base Lot" value={fmtNum(profile?.baseLot ?? 0.01, 2)} />
              <Stat label="Max Exposure" value={`${fmtNum(maxExp, 2)} lots`} valueClass="text-cyan-300" />
              <Stat label="Remaining" value={`${fmtNum(remaining, 2)} lots`} valueClass={remaining <= 0.01 ? 'text-amber-400' : 'text-emerald-400'} />
            </div>
            <Meter label="Current aggregate exposure" value={openLots} max={maxExp} unit=" lots" danger={85} warn={60} />
            <Meter label="Margin utilization" value={Math.round(((acc?.marginUsed ?? 0) / (acc?.equity || 1)) * 1000) / 10} max={profile?.maxMarginUtilPct ?? 25} unit="%" danger={80} warn={55} />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Margin used: <span className="num text-slate-300">{fmtMoney(acc?.marginUsed)}</span></span>
              <span>Free margin: <span className="num text-slate-300">{fmtMoney(acc?.freeMargin)}</span></span>
            </div>
          </div>
        </Panel>

        {/* Risk budget */}
        <Panel title="Risk Budget & Drawdown Guard" icon={Gauge} accent="amber">
          <div className="space-y-3">
            <Meter label={`Daily loss budget (${fmtPct(profile?.dailyLossLimitPct ?? 2, 1)} = ${fmtMoney(dailyBudget)})`} value={Math.round(riskUsed * 100) / 100} max={Math.round(dailyBudget * 100) / 100} unit="$" danger={75} warn={50} />
            <Meter label={`Drawdown from HWM (max ${fmtPct(profile?.maxDrawdownPct ?? 8, 0)})`} value={Math.round(ddFromHwm * 100) / 100} max={profile?.maxDrawdownPct ?? 8} unit="%" danger={75} warn={50} />
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Risk used today" value={fmtMoney(riskUsed)} valueClass={riskUsed > 0 ? 'text-amber-400' : 'text-emerald-400'} />
              <Stat label="Risk remaining" value={fmtMoney(Math.max(0, dailyBudget - riskUsed))} valueClass="text-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-500">Per-trade limit {fmtPct(profile?.maxRiskPerTradePct ?? 0.5, 2)} · ceiling {fmtPct(profile?.riskCeilingPct ?? 5, 0)} (absolute, never a target)</div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Positions */}
        <Panel title={`Positions — ${openPositions.length} open · ${pendingPositions.length} pending · ${hedgePositions.length} hedge`} icon={TrendingUp} className="xl:col-span-2" accent="emerald">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-3">Instrument</th>
                  <th className="text-left py-2 pr-3">Side</th>
                  <th className="text-right py-2 pr-3">Lots</th>
                  <th className="text-right py-2 pr-3">Entry</th>
                  <th className="text-right py-2 pr-3">Current</th>
                  <th className="text-right py-2 pr-3">SL / TP</th>
                  <th className="text-right py-2 pr-3">P/L</th>
                  <th className="text-left py-2">Strategy</th>
                </tr>
              </thead>
              <tbody>
                {(positions?.filter((p: any) => p?.status !== 'closed') ?? []).map((p: any) => (
                  <tr key={p?.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                    <td className="py-2 pr-3 font-semibold text-white num">
                      {p?.instrument?.symbol}
                      {p?.isHedge ? <span className="ml-1.5 rounded bg-violet-500/15 border border-violet-500/30 px-1 py-0.5 text-[9px] text-violet-300">HEDGE</span> : null}
                      {p?.status === 'pending' ? <span className="ml-1.5 rounded bg-sky-500/15 border border-sky-500/30 px-1 py-0.5 text-[9px] text-sky-300">PENDING</span> : null}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${p?.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {p?.direction === 'BUY' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{p?.direction}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right num text-slate-300">{fmtNum(p?.lots, 2)}</td>
                    <td className="py-2 pr-3 text-right num text-slate-300">{p?.entryPrice}</td>
                    <td className="py-2 pr-3 text-right num text-slate-300">{p?.currentPrice}</td>
                    <td className="py-2 pr-3 text-right num text-[11px] text-slate-500">{p?.stopLoss ?? '—'} / {p?.takeProfit ?? '—'}</td>
                    <td className={`py-2 pr-3 text-right num font-semibold ${plColor(p?.floatingPL)}`}>{fmtSigned(p?.floatingPL)}</td>
                    <td className="py-2 text-xs text-slate-400">{p?.strategyName ?? '—'}</td>
                  </tr>
                ))}
                {(positions?.filter((p: any) => p?.status !== 'closed')?.length ?? 0) === 0 ? (
                  <tr><td colSpan={8} className="py-6 text-center text-slate-500 text-sm">No open exposure. Not trading is also a trading decision.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Consensus + Guardian + volatility */}
        <Panel title="Agent Consensus & Guardian" icon={Network} accent="violet">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-secondary/60 border border-border px-3 py-2.5">
              <span className="text-xs text-slate-400">Council consensus</span>
              <span className="num text-sm font-bold text-cyan-300">{data?.state?.agentConsensus ?? 'WAIT'} · {fmtNum(st?.consensusScore ?? 0, 0)}%</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-secondary/60 border border-border px-3 py-2.5">
              <span className="text-xs text-slate-400">Guardian decision</span>
              <span className="text-xs font-semibold text-emerald-400 text-right max-w-[60%]">{st?.guardianDecision ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-secondary/60 border border-border px-3 py-2.5">
              <span className="text-xs text-slate-400">EMIL Trust Score</span>
              <Link href="/trust" className="num text-sm font-bold text-amber-300 hover:text-amber-200">{fmtNum(st?.trustScore ?? 0, 0)} / 100 →</Link>
            </div>
            <div className={`rounded-md border px-3 py-2.5 text-xs ${volColor(st?.volatilityStatus)}`}>
              Volatility regime: <b>{(st?.volatilityStatus ?? 'normal').toUpperCase()}</b>
            </div>
            <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-300">
              Next event: <b>{st?.nextNewsEvent ?? '—'}</b>{(st?.newsCountdownMins ?? 0) < 900 ? ` in ${Math.floor((st?.newsCountdownMins ?? 0) / 60)}h ${(st?.newsCountdownMins ?? 0) % 60}m` : ''}
            </div>
            <Link href="/agents" className="block text-center rounded-md border border-border px-3 py-2 text-xs text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors">
              View full Agent Council →
            </Link>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Strategy health */}
        <Panel title="Active Strategies" icon={FlaskConical} accent="cyan">
          <div className="space-y-2">
            {(data?.strategies ?? []).map((s: any) => (
              <Link key={s?.id} href="/strategies" className="flex items-center justify-between rounded-md bg-secondary/50 border border-border/60 px-3 py-2 hover:border-cyan-500/30 transition-colors">
                <div>
                  <div className="text-sm text-white">{s?.name} <span className="text-slate-500 text-xs">{s?.version}</span></div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">{s?.strategyType?.replace('_', ' ')}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold uppercase ${healthColor(s?.status)}`}>{s?.status?.replace('_', ' ')}</div>
                  <div className="num text-[11px] text-slate-400">score {fmtNum(s?.healthScore, 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        {/* Regimes */}
        <Panel title="Market Regimes" icon={Globe2} accent="emerald">
          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {(data?.regimes ?? []).map((r: any) => (
              <div key={r?.id} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5 text-xs">
                <span className="num font-semibold text-white">{r?.symbol} <span className="text-slate-500">{r?.timeframe}</span></span>
                <span className="text-slate-300">{r?.regime?.replace(/_/g, ' ')}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] ${volColor(r?.volatilityClass)}`}>{r?.volatilityClass}</span>
                <span className="num text-slate-500">{fmtNum(r?.confidence, 0)}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Correlation clusters */}
        <Panel title="Correlation Clusters" icon={Link2} accent="violet">
          <div className="space-y-2">
            {Object.entries(clusters).map(([name, pairs]) => (
              <div key={name} className="rounded-md bg-secondary/50 border border-border/60 px-3 py-2">
                <div className="text-xs font-semibold text-violet-300 uppercase tracking-wide mb-1">{name}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(pairs ?? []).map((c: any) => (
                    <span key={c?.id} className="num rounded bg-background border border-border px-1.5 py-0.5 text-[10px] text-slate-400">
                      {c?.symbolA}×{c?.symbolB} <b className={Math.abs(c?.coefficient ?? 0) > 0.7 ? 'text-amber-400' : 'text-slate-300'}>{fmtNum(c?.coefficient, 2)}</b>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-[11px] text-slate-500">Correlated same-direction exposure is treated as a single cluster against the 0.05-lot cap.</div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Learning feed */}
        <Panel title="Recent Learning" icon={BookOpen} accent="cyan">
          <div className="space-y-2">
            {(data?.learningEvents ?? []).map((e: any) => (
              <div key={e?.id} className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{e?.title}</span>
                  <span className="text-[10px] uppercase text-cyan-400/80">{e?.eventType?.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{e?.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        {/* Rejected trades */}
        <Panel title="Recent Rejected Trades" icon={XCircle} accent="red">
          <div className="space-y-2">
            {(data?.rejected ?? []).map((c: any) => (
              <Link key={c?.id} href="/trades" className="block rounded-md bg-red-500/5 border border-red-500/20 px-3 py-2 hover:border-red-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="num text-sm font-semibold text-white">{c?.instrument?.symbol} {c?.direction}</span>
                  <span className="rounded bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-bold text-red-300">REJECTED</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {(() => { try { return (JSON.parse(c?.reasonsAgainst ?? '[]') ?? [])[0] ?? 'See trade card for reasoning.' } catch { return 'See trade card for reasoning.' } })()}
                </p>
              </Link>
            ))}
            {(data?.rejected?.length ?? 0) === 0 ? <div className="text-sm text-slate-500 py-4 text-center">No recent rejections.</div> : null}
          </div>
        </Panel>
      </div>

      {/* System health strip */}
      <Panel title="System Health" icon={Activity} accent="emerald">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(data?.health ?? []).map((h: any) => (
            <div key={h?.id} className="flex items-center gap-2 rounded-md bg-secondary/40 border border-border/50 px-3 py-2">
              <span className={`h-2 w-2 rounded-full shrink-0 ${h?.status === 'healthy' ? 'bg-emerald-400' : h?.status === 'degraded' ? 'bg-amber-400 pulse-dot' : 'bg-red-500 pulse-dot'}`} />
              <div className="min-w-0">
                <div className="text-xs text-white truncate">{h?.component}</div>
                <div className="num text-[10px] text-slate-500">{h?.latencyMs}ms · {h?.message}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
