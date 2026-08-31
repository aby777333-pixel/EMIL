'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { fmtMoney, fmtSigned, fmtNum, fmtPct, plColor, voteColor } from '@/lib/format'
import { CandlestickChart, ShieldCheck, ShieldX, Bot, Sparkles, Layers, Umbrella, XCircle } from 'lucide-react'

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  try { return JSON.parse(s ?? '') ?? fallback } catch { return fallback }
}

function Row({ k, v, vClass = 'text-slate-200' }: { k: string; v: React.ReactNode; vClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-slate-500 shrink-0">{k}</span>
      <span className={`text-[11px] font-medium text-right num ${vClass}`}>{v}</span>
    </div>
  )
}

function decisionBadge(d: string) {
  const map: Record<string, string> = {
    BUY: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    SELL: 'bg-red-500/15 text-red-400 border-red-500/40',
    REJECT: 'bg-red-500/15 text-red-400 border-red-500/40',
    WAIT: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  }
  return map?.[d] ?? 'bg-slate-700/40 text-slate-300 border-slate-600/50'
}

export default function TradesClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [explanations, setExplanations] = useState<Record<string, string>>({})
  const [explaining, setExplaining] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/trades')
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError('Failed to load trade data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const explain = useCallback(async (candidateId: string) => {
    if (explaining) return
    setExplaining(candidateId)
    setExplanations((prev) => ({ ...(prev ?? {}), [candidateId]: '' }))
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      })
      if (!res?.ok || !res?.body) throw new Error('failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setExplanations((prev) => ({ ...(prev ?? {}), [candidateId]: (prev?.[candidateId] ?? '') + chunk }))
      }
    } catch {
      setExplanations((prev) => ({ ...(prev ?? {}), [candidateId]: 'Explanation stream failed. Please try again.' }))
    } finally {
      setExplaining(null)
    }
  }, [explaining])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading trade cards..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  const candidates = data?.candidates ?? []
  const positions = data?.positions ?? []
  const openPositions = positions.filter((p: any) => p?.status === 'open' || p?.status === 'pending')
  const closedPositions = positions.filter((p: any) => p?.status === 'closed')

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><CandlestickChart className="h-5 w-5 text-cyan-400" /> Trade Cards</h1>
        <p className="text-xs text-slate-500 mt-1">Every proposal EMIL produces — approved, waiting or rejected — with full agent votes, risk decisions and survival simulation.</p>
      </div>

      {candidates.map((c: any) => {
        const reasonsFor = parseJson<string[]>(c?.reasonsFor, [])
        const reasonsAgainst = parseJson<string[]>(c?.reasonsAgainst, [])
        const survival = parseJson<Record<string, string>>(c?.survivalResult, {})
        const votes = c?.votes ?? []
        const rejected = c?.finalDecision === 'REJECT' || c?.status === 'rejected'
        return (
          <Panel key={c?.id} accent={rejected ? 'red' : c?.finalDecision === 'WAIT' ? 'amber' : 'emerald'}
            title={`${c?.instrument?.symbol ?? '?'} · ${c?.direction ?? ''} · ${c?.strategy?.name ?? ''} ${c?.strategy?.version ?? ''}`}
            icon={rejected ? ShieldX : ShieldCheck}>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${decisionBadge(c?.finalDecision ?? '')}`}>FINAL: {c?.finalDecision ?? '-'}</span>
              <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${c?.guardianStatus === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : c?.guardianStatus === 'rejected' ? 'bg-red-500/15 text-red-400 border-red-500/40' : 'bg-amber-500/15 text-amber-400 border-amber-500/40'}`}>GUARDIAN: {(c?.guardianStatus ?? 'pending').toUpperCase()}</span>
              <span className="px-2 py-0.5 rounded border border-slate-600/50 bg-slate-700/30 text-[11px] text-slate-300">Consensus {fmtNum(c?.consensusScore ?? 0, 0)}%</span>
              <span className="px-2 py-0.5 rounded border border-slate-600/50 bg-slate-700/30 text-[11px] text-slate-300">Trust {fmtNum(c?.trustScore ?? 0, 0)}/100</span>
              <span className="px-2 py-0.5 rounded border border-slate-600/50 bg-slate-700/30 text-[11px] text-slate-300">Stage: {(c?.pipelineStage ?? '').replace(/_/g, ' ')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-md bg-background/40 border border-border p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Setup & Levels</h4>
                <Row k="Regime" v={c?.regime ?? '-'} />
                <Row k="HTF bias" v={c?.htfBias ?? '-'} />
                <Row k="Entry" v={fmtNum(c?.entry, 5)} />
                <Row k="Stop-loss" v={fmtNum(c?.stopLoss, 5)} vClass="text-red-400" />
                <Row k="TP1 / TP2 / TP3" v={`${c?.tp1 != null ? fmtNum(c?.tp1, 5) : '-'} / ${c?.tp2 != null ? fmtNum(c?.tp2, 5) : '-'} / ${c?.tp3 != null ? fmtNum(c?.tp3, 5) : '-'}`} vClass="text-emerald-400" />
                <Row k="Reward : Risk" v={`${fmtNum(c?.rewardRisk, 2)} : 1`} />
                <Row k="Expected duration" v={c?.expectedDuration ?? '-'} />
                <Row k="Invalidation" v={c?.invalidation ?? '-'} />
              </div>

              <div className="rounded-md bg-background/40 border border-border p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Size & Risk</h4>
                <Row k="Base lot" v={fmtNum(c?.baseLot, 2)} />
                <Row k="Calculated lot" v={fmtNum(c?.calculatedLot, 2)} />
                <Row k="Max EMIL exposure" v={`${fmtNum(c?.maxExposure, 2)} lots`} />
                <Row k="Aggregate before → after" v={`${fmtNum(c?.aggExposureBefore, 2)} → ${fmtNum(c?.aggExposureAfter, 2)} lots`} />
                <Row k="Monetary risk" v={fmtMoney(c?.monetaryRisk)} vClass="text-red-400" />
                <Row k="Risk % of account" v={fmtPct(c?.riskPct)} />
                <Row k="Confidence" v={fmtPct(c?.confidence, 0)} vClass="text-cyan-300" />
                <Row k="Probability scenario" v={c?.probabilityScenario ?? '-'} />
              </div>

              <div className="rounded-md bg-background/40 border border-border p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Conditions</h4>
                <Row k="Trend" v={c?.trendCondition ?? '-'} />
                <Row k="Volatility" v={c?.volatilityCondition ?? '-'} />
                <Row k="Liquidity" v={c?.liquidityCondition ?? '-'} />
                <Row k="Spread" v={`${fmtNum(c?.spreadPips, 1)} pips`} />
                <Row k="Est. slippage" v={`${fmtNum(c?.estSlippagePips, 1)} pips`} />
                <Row k="News risk" v={c?.newsRisk ?? '-'} />
                <Row k="Correlation exposure" v={c?.correlationExposure ?? '-'} />
                <Row k="Hedge required" v={c?.hedgeRequired ? 'YES' : 'No'} vClass={c?.hedgeRequired ? 'text-amber-400' : 'text-slate-200'} />
                <Row k="Exit plan" v={c?.exitPlan ?? '-'} />
              </div>

              <div className="rounded-md bg-background/40 border border-border p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Survival Simulation</h4>
                {Object.keys(survival ?? {}).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(survival ?? {}).map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-2 py-0.5">
                        <span className="text-[11px] text-slate-500">{k.replace(/_/g, ' ')}</span>
                        <span className={`text-[11px] font-medium text-right ${String(v).toLowerCase().includes('survives') || String(v).toLowerCase().includes('ok') ? 'text-emerald-400' : 'text-amber-400'}`}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-slate-500">No survival simulation recorded.</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5">Reasons For</h4>
                <ul className="space-y-1">
                  {reasonsFor.length > 0 ? reasonsFor.map((r) => <li key={r} className="text-[11px] text-slate-300 flex gap-1.5"><span className="text-emerald-500">+</span>{r}</li>) : <li className="text-[11px] text-slate-500">None recorded.</li>}
                </ul>
              </div>
              <div className="rounded-md bg-red-500/5 border border-red-500/20 p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">Reasons Against</h4>
                <ul className="space-y-1">
                  {reasonsAgainst.length > 0 ? reasonsAgainst.map((r) => <li key={r} className="text-[11px] text-slate-300 flex gap-1.5"><span className="text-red-500">−</span>{r}</li>) : <li className="text-[11px] text-slate-500">None recorded.</li>}
                </ul>
              </div>
            </div>

            {votes.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" /> Agent Council Votes ({votes.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {votes.map((v: any) => (
                    <div key={v?.id} className="rounded-md border border-border bg-background/40 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-300">#{v?.agent?.number} {v?.agent?.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${voteColor(v?.vote)}`}>{v?.vote} {fmtNum(v?.confidence, 0)}%</span>
                      </div>
                      {v?.evidenceFor ? <p className="text-[10px] text-slate-500 mt-1">+ {v.evidenceFor}</p> : null}
                      {v?.evidenceAgainst ? <p className="text-[10px] text-slate-600 mt-0.5">− {v.evidenceAgainst}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(c?.riskDecisions ?? []).length > 0 ? (
              <div className="mt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Independent Risk Decisions</h4>
                <div className="space-y-1.5">
                  {(c?.riskDecisions ?? []).map((d: any) => (
                    <div key={d?.id} className="flex items-start gap-2 text-[11px]">
                      <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded ${d?.decision === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : d?.decision === 'rejected' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>{(d?.engine ?? '').replace(/_/g, ' ').toUpperCase()}</span>
                      <span className="text-slate-400">{d?.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <button
                onClick={() => explain(c?.id)}
                disabled={explaining !== null}
                className="flex items-center gap-2 rounded-md bg-violet-600/80 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {explaining === c?.id ? 'EMIL is explaining...' : 'Explain this decision (EMIL, first person)'}
              </button>
              {explanations?.[c?.id] ? (
                <div className="mt-3 rounded-md border border-violet-500/30 bg-violet-500/5 p-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {explanations[c.id]}
                </div>
              ) : null}
            </div>
          </Panel>
        )
      })}

      <Panel title={`Open & Pending Positions (${openPositions.length})`} icon={Layers} accent="cyan">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="py-2 pr-3">Symbol</th><th className="py-2 pr-3">Dir</th><th className="py-2 pr-3">Lots</th><th className="py-2 pr-3">Entry</th><th className="py-2 pr-3">Current</th><th className="py-2 pr-3">SL</th><th className="py-2 pr-3">TP</th><th className="py-2 pr-3">Floating P/L</th><th className="py-2 pr-3">Strategy</th><th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {openPositions.map((p: any) => (
                <tr key={p?.id} className="border-b border-border/40 text-[11px] text-slate-300 hover:bg-slate-800/30">
                  <td className="py-2 pr-3 font-semibold text-white">{p?.instrument?.symbol}{p?.isHedge ? <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-violet-500/20 text-violet-300">HEDGE</span> : null}</td>
                  <td className={`py-2 pr-3 font-bold ${p?.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{p?.direction}</td>
                  <td className="py-2 pr-3 num">{fmtNum(p?.lots, 2)}</td>
                  <td className="py-2 pr-3 num">{fmtNum(p?.entryPrice, 5)}</td>
                  <td className="py-2 pr-3 num">{fmtNum(p?.currentPrice, 5)}</td>
                  <td className="py-2 pr-3 num text-red-400">{p?.stopLoss != null ? fmtNum(p?.stopLoss, 5) : '-'}</td>
                  <td className="py-2 pr-3 num text-emerald-400">{p?.takeProfit != null ? fmtNum(p?.takeProfit, 5) : '-'}</td>
                  <td className={`py-2 pr-3 num font-semibold ${plColor(p?.floatingPL)}`}>{fmtSigned(p?.floatingPL)}</td>
                  <td className="py-2 pr-3 text-slate-400">{p?.strategyName ?? '-'}</td>
                  <td className="py-2 uppercase text-[10px] text-slate-400">{p?.status}</td>
                </tr>
              ))}
              {openPositions.length === 0 ? <tr><td colSpan={10} className="py-4 text-center text-xs text-slate-500">No open positions.</td></tr> : null}
            </tbody>
          </table>
        </div>
        {openPositions.some((p: any) => (p?.hedges ?? []).length > 0) ? (
          <div className="mt-3 space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5"><Umbrella className="h-3.5 w-3.5" /> Active Hedge Links</h4>
            {openPositions.flatMap((p: any) => (p?.hedges ?? []).map((h: any) => (
              <div key={h?.id} className="rounded-md border border-violet-500/30 bg-violet-500/5 p-2.5 text-[11px] text-slate-300">
                <span className="font-semibold text-violet-300">{p?.instrument?.symbol} hedged via {h?.hedgeSymbol} ({fmtNum(h?.hedgeLots, 2)} lots)</span>
                <span className="text-slate-500"> — {h?.reason}. Exit condition: {h?.exitCondition}</span>
              </div>
            )))}
          </div>
        ) : null}
      </Panel>

      <Panel title={`Closed Positions (${closedPositions.length})`} icon={XCircle} accent="violet">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="py-2 pr-3">Symbol</th><th className="py-2 pr-3">Dir</th><th className="py-2 pr-3">Lots</th><th className="py-2 pr-3">Entry</th><th className="py-2 pr-3">Closed P/L</th><th className="py-2">Strategy</th>
              </tr>
            </thead>
            <tbody>
              {closedPositions.map((p: any) => (
                <tr key={p?.id} className="border-b border-border/40 text-[11px] text-slate-300">
                  <td className="py-2 pr-3 font-semibold text-white">{p?.instrument?.symbol}</td>
                  <td className={`py-2 pr-3 font-bold ${p?.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{p?.direction}</td>
                  <td className="py-2 pr-3 num">{fmtNum(p?.lots, 2)}</td>
                  <td className="py-2 pr-3 num">{fmtNum(p?.entryPrice, 5)}</td>
                  <td className={`py-2 pr-3 num font-semibold ${plColor(p?.closedPL)}`}>{fmtSigned(p?.closedPL)}</td>
                  <td className="py-2 text-slate-400">{p?.strategyName ?? '-'}</td>
                </tr>
              ))}
              {closedPositions.length === 0 ? <tr><td colSpan={6} className="py-4 text-center text-xs text-slate-500">No closed positions yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
