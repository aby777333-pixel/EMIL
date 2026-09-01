'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Microscope, Play, GitBranch, Check, X, Sparkles, AlertTriangle, History, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea', rules: 'Rule Extraction', data_validation: 'Data Validation', backtest: 'Backtest',
  out_of_sample: 'Out-of-Sample', walk_forward: 'Walk-Forward', stress: 'Stress Test',
  regime: 'Regime Analysis', risk: 'Risk Analysis', score: 'Strategy Score', paper: 'Paper / Forward', human_review: 'Human Review',
}
const PIPELINE = ['rules', 'data_validation', 'backtest', 'out_of_sample', 'walk_forward', 'stress', 'regime', 'risk', 'score', 'paper', 'human_review']

const STATE_TONE: Record<string, string> = {
  LEARNED: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  UNVERIFIED: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  RESEARCHING: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  BACKTESTED: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
  REJECTED: 'text-red-300 border-red-500/40 bg-red-500/10',
  PAPER_TRADING: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  HUMAN_APPROVED: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  LIVE_ELIGIBLE: 'text-emerald-400 border-emerald-500/60 bg-emerald-500/15',
}

const fmt = (v: any, d = 2) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : '—')

export default function LabClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [versionFor, setVersionFor] = useState('')
  const [changeText, setChangeText] = useState('')
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/lab')
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
      setError('')
    } catch {
      setError('Failed to load the Strategy Lab.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const action = useCallback(async (payload: any, busy: string, successMsg?: string) => {
    if (busyId) return
    setBusyId(busy)
    try {
      const res = await fetch('/api/lab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'action failed')
      if (payload.type === 'run_stage') {
        const v = d?.verdict?.toUpperCase?.() ?? ''
        ;(v === 'FAIL' ? toast.error : toast.success)(`Stage ${v}: ${String(d?.evaluation?.notes ?? '').slice(0, 220)}`, { duration: 7000 })
      } else if (successMsg) toast.success(successMsg)
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Action failed.')
    } finally {
      setBusyId('')
    }
  }, [busyId, load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading the EMIL Strategy Lab..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  const blueprints: any[] = data?.blueprints ?? []
  const history: any[] = data?.history ?? []
  const isAdmin = !!data?.isAdmin

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Microscope className="h-5 w-5 text-cyan-400" /> EMIL Strategy Lab</h1>
        <p className="text-xs text-slate-500 mt-1">
          Learned idea → structured rules → data validation → backtest → out-of-sample → walk-forward → stress → regime → risk → score → paper → human review.
          A backtest is never proof of future profitability, and no strategy ever gains live permission automatically.
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-200/90 leading-snug">
          <span className="font-bold">Data mode: ESTIMATED.</span> No historical tick/candle engine is connected yet, so lab runs are structured quant-research
          estimates from the Knowledge Council — conservative, cost-aware, overfitting-penalized, and clearly labeled. When a historical data engine is
          connected, every surviving strategy must re-run the full pipeline on real data before its results count.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Strategies In Lab" value={blueprints.length} valueClass="text-cyan-300" />
        <Stat label="EMIL-Generated" value={blueprints.filter((b) => b.origin === 'emil_generated').length} valueClass="text-amber-300" />
        <Stat label="Awaiting Human Review" value={blueprints.filter((b) => b.labStage === 'human_review' && !['HUMAN_APPROVED', 'LIVE_ELIGIBLE', 'REJECTED'].includes(b.state)).length} valueClass="text-violet-300" />
        <Stat label="Rejected (kept forever)" value={blueprints.filter((b) => b.state === 'REJECTED').length + history.filter((b) => b.state === 'REJECTED').length} valueClass="text-red-300" />
      </div>

      <Panel title="Generate a new strategy from validated knowledge" icon={Sparkles} accent="amber">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => action({ type: 'generate_strategy' }, 'generate', 'EMIL generated a new candidate strategy — labeled EMIL-GENERATED HYPOTHESIS, full lab validation required.')}
            disabled={!!busyId}
            className="flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 transition-colors"
          >
            <Sparkles className="h-4 w-4" /> {busyId === 'generate' ? 'EMIL COMPOSING...' : 'GENERATE EMIL STRATEGY'}
          </button>
          <p className="text-[11px] text-slate-500 flex-1 min-w-[16rem]">
            EMIL combines validated entry logic, regime filters and risk models it has learned (e.g. A&apos;s entries + B&apos;s trend filter + C&apos;s ATR risk model)
            into one new candidate — never invented from nothing, always traceable to learned components.
          </p>
        </div>
      </Panel>

      {blueprints.map((b) => {
        const metrics = (() => { try { return JSON.parse(b.metrics ?? 'null') } catch { return null } })()
        const regime = (() => { try { return JSON.parse(b.regimeNotes ?? 'null') } catch { return null } })()
        const changeLog = (() => { try { return JSON.parse(b.changeLog ?? '[]') } catch { return [] } })()
        const indicators = (() => { try { return JSON.parse(b.indicators ?? '[]') } catch { return [] } })()
        const stageIdx = PIPELINE.indexOf(b.labStage)
        const versions = history.filter((h) => h.code === b.code)
        return (
          <Panel key={b.id} title={`${b.code} v${b.version} — ${b.name}`} icon={Microscope} accent={b.state === 'REJECTED' ? 'red' : b.origin === 'emil_generated' ? 'amber' : 'cyan'}>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={`text-[9px] uppercase font-bold px-2 py-1 rounded border ${STATE_TONE[b.state] ?? STATE_TONE.LEARNED}`}>{b.state.replace(/_/g, ' ')}</span>
              {b.origin === 'emil_generated' ? <span className="text-[9px] uppercase font-bold px-2 py-1 rounded border text-amber-300 border-amber-500/40 bg-amber-500/10">EMIL-GENERATED HYPOTHESIS</span> : <span className="text-[9px] uppercase px-2 py-1 rounded border text-slate-400 border-slate-600/50 bg-slate-700/30">extracted from source</span>}
              <span className={`text-[9px] uppercase font-bold px-2 py-1 rounded border ${b.completeness === 'complete' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-red-300 border-red-500/40 bg-red-500/10'}`}>{b.completeness}</span>
              {b.market ? <span className="text-[9px] uppercase px-2 py-1 rounded bg-slate-700/50 text-slate-300">{b.market}</span> : null}
              {b.timeframe ? <span className="text-[9px] px-2 py-1 rounded bg-slate-700/50 text-slate-300">{b.timeframe}</span> : null}
              {b.approvedBy ? <span className="text-[9px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">approved by {b.approvedBy}</span> : null}
            </div>

            {b.completeness === 'incomplete' && b.missingFields ? (
              <p className="text-[11px] text-red-300/90 mb-3">⚠ INCOMPLETE — missing: {b.missingFields}. EMIL will not invent missing rules; supply them via a new version.</p>
            ) : null}

            {/* Pipeline ladder */}
            <div className="flex gap-1 flex-wrap mb-4">
              {PIPELINE.map((st, i) => (
                <div key={st} className={`rounded px-2 py-1 text-[9px] font-semibold border ${i < stageIdx ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : i === stageIdx ? 'text-cyan-300 border-cyan-500/50 bg-cyan-500/15' : 'text-slate-500 border-border bg-secondary/30'}`}>
                  {i < stageIdx ? '✓ ' : ''}{STAGE_LABELS[st]}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-[11px] text-slate-300">
                {indicators.length ? <p><span className="text-slate-500">Indicators:</span> {indicators.join(', ')}</p> : null}
                {b.instruments ? <p><span className="text-slate-500">Instruments:</span> {b.instruments}</p> : null}
                {b.entryLong ? <p><span className="text-slate-500">Long entry:</span> {b.entryLong}</p> : null}
                {b.entryShort ? <p><span className="text-slate-500">Short entry:</span> {b.entryShort}</p> : null}
                {b.stopLoss ? <p><span className="text-slate-500">Stop loss:</span> {b.stopLoss}</p> : null}
                {b.takeProfit ? <p><span className="text-slate-500">Take profit:</span> {b.takeProfit}</p> : null}
                {b.positionSizing ? <p><span className="text-slate-500">Sizing:</span> {b.positionSizing}</p> : null}
                {b.filters ? <p><span className="text-slate-500">Filters:</span> {b.filters}</p> : null}
                {b.invalidConditions ? <p><span className="text-slate-500">Do NOT trade when:</span> {b.invalidConditions}</p> : null}
              </div>

              <div>
                {metrics ? (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <Stat label="Win Rate" value={`${fmt(metrics.winRate, 1)}%`} />
                    <Stat label="Profit Factor" value={fmt(metrics.profitFactor)} />
                    <Stat label="Max DD" value={`${fmt(metrics.maxDrawdownPct, 1)}%`} valueClass="text-red-300" />
                    <Stat label="Sharpe-like" value={fmt(metrics.sharpeLike)} />
                    <Stat label="Expectancy" value={fmt(metrics.expectancy)} />
                    <Stat label="Robustness" value={`${Math.round(b.robustnessScore)}/100`} valueClass={b.robustnessScore >= 60 ? 'text-emerald-300' : 'text-amber-300'} />
                  </div>
                ) : <p className="text-[11px] text-slate-500 mb-3">No lab metrics yet — run the pipeline.</p>}
                {regime ? (
                  <div className="text-[10px] space-y-1 mb-3">
                    {regime.worksIn?.length ? <p className="text-emerald-300/90">WORKS IN: {regime.worksIn.join(', ')}</p> : null}
                    {regime.failsIn?.length ? <p className="text-red-300/90">FAILS IN: {regime.failsIn.join(', ')}</p> : null}
                  </div>
                ) : null}
                {(b.labRuns ?? []).length ? (
                  <details>
                    <summary className="text-[10px] text-cyan-300 cursor-pointer flex items-center gap-1"><History className="h-3 w-3" /> Run history ({b.labRuns.length})</summary>
                    <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                      {b.labRuns.map((r: any) => (
                        <p key={r.id} className="text-[10px] text-slate-400">
                          <span className={`uppercase font-bold ${r.verdict === 'pass' ? 'text-emerald-400' : r.verdict === 'fail' ? 'text-red-400' : 'text-amber-400'}`}>{r.verdict ?? r.status}</span>
                          {' '}{STAGE_LABELS[r.runType] ?? r.runType} <span className="text-slate-600">({r.dataMode})</span> — {r.notes?.slice(0, 160)}
                        </p>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {b.state !== 'REJECTED' && b.labStage !== 'human_review' ? (
                <button onClick={() => action({ type: 'run_stage', blueprintId: b.id }, `run-${b.id}`)} disabled={!!busyId} className="flex items-center gap-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold px-4 py-2 transition-colors">
                  <Play className="h-3.5 w-3.5" /> {busyId === `run-${b.id}` ? 'RUNNING...' : `RUN ${(STAGE_LABELS[PIPELINE[Math.max(0, stageIdx + (b.labStage === 'idea' ? 0 : 1))]] ?? 'NEXT STAGE').toUpperCase()}`}
                </button>
              ) : null}
              <button onClick={() => { setVersionFor(versionFor === b.id ? '' : b.id); setFieldDrafts({}) }} className="flex items-center gap-1.5 rounded-md bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 text-[11px] font-semibold px-3 py-2 transition-colors">
                <GitBranch className="h-3.5 w-3.5" /> New Version
              </button>
              {isAdmin && b.labStage === 'human_review' && !['HUMAN_APPROVED', 'LIVE_ELIGIBLE', 'REJECTED'].includes(b.state) ? (
                <>
                  <button onClick={() => action({ type: 'approve', blueprintId: b.id }, `ap-${b.id}`, 'Strategy HUMAN_APPROVED. Live deployment still requires ARM + permissions + risk limits.')} disabled={!!busyId} className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-2 transition-colors"><Check className="h-3.5 w-3.5" /> APPROVE</button>
                  <button onClick={() => action({ type: 'reject', blueprintId: b.id }, `rj-${b.id}`, 'Strategy rejected — kept in memory so EMIL remembers what did not work.')} disabled={!!busyId} className="flex items-center gap-1.5 rounded-md bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-2 transition-colors"><X className="h-3.5 w-3.5" /> REJECT</button>
                </>
              ) : null}
              {isAdmin && b.state === 'HUMAN_APPROVED' ? (
                <button onClick={() => action({ type: 'mark_live_eligible', blueprintId: b.id }, `le-${b.id}`, 'Marked LIVE_ELIGIBLE. Real capital still requires explicit ARM authorization and risk controls.')} disabled={!!busyId} className="flex items-center gap-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-2 transition-colors"><ShieldCheck className="h-3.5 w-3.5" /> MARK LIVE-ELIGIBLE</button>
              ) : null}
            </div>

            {versionFor === b.id ? (
              <div className="mt-3 rounded-md border border-border bg-background/40 p-3">
                <p className="text-[11px] text-slate-400 mb-2">What changed and why? (required — this becomes part of the research lineage; the old version is preserved, never rewritten)</p>
                <textarea value={changeText} onChange={(e) => setChangeText(e?.target?.value ?? '')} rows={2} className="w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white" placeholder="e.g. Added ATR(14) volatility filter after regime analysis showed failures in low-volatility ranges" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {([['entryLong', 'Long entry'], ['entryShort', 'Short entry'], ['stopLoss', 'Stop loss'], ['takeProfit', 'Take profit'], ['positionSizing', 'Position sizing'], ['filters', 'Filters'], ['invalidConditions', 'Do NOT trade when'], ['missingFields', 'Still missing (empty = rules complete)']] as const).map(([f, label]) => (
                    <label key={f} className="text-[10px] text-slate-500 block">{label}
                      <textarea
                        value={fieldDrafts[f] ?? (b[f] ?? '')}
                        onChange={(e) => setFieldDrafts((d) => ({ ...d, [f]: e?.target?.value ?? '' }))}
                        rows={2}
                        className="mt-0.5 w-full rounded-md bg-background border border-border px-2 py-1 text-[11px] text-white scrollbar-thin"
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => { action({ type: 'new_version', blueprintId: b.id, changes: changeText, fields: fieldDrafts }, `nv-${b.id}`, 'New version created — validation restarts from rule extraction.'); setVersionFor(''); setChangeText(''); setFieldDrafts({}) }}
                  disabled={!!busyId || !changeText.trim()}
                  className="mt-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold px-4 py-2 transition-colors"
                >CREATE v{(() => { const [ma, mi] = String(b.version).split('.').map((n: string) => parseInt(n, 10) || 0); return `${ma}.${mi + 1}` })()}</button>
              </div>
            ) : null}

            {changeLog.length > 0 || versions.length > 0 ? (
              <details className="mt-3">
                <summary className="text-[10px] text-slate-400 cursor-pointer">Research lineage ({changeLog.length} entries{versions.length ? `, ${versions.length} archived versions` : ''})</summary>
                <div className="mt-1.5 space-y-1">
                  {changeLog.slice().reverse().map((c: any, i: number) => (
                    <p key={i} className="text-[10px] text-slate-500"><span className="text-slate-300 font-semibold">v{c.version}</span> · {String(c.date).slice(0, 10)} — {c.change}</p>
                  ))}
                </div>
              </details>
            ) : null}
          </Panel>
        )
      })}

      {blueprints.length === 0 ? (
        <Panel title="No strategies in the lab yet" icon={Microscope} accent="cyan">
          <p className="text-xs text-slate-500">Strategies enter the lab automatically when TEACH EMIL extracts a methodology from a source, or when EMIL generates one from accumulated knowledge above.</p>
        </Panel>
      ) : null}
    </div>
  )
}
