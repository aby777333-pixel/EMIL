'use client'

// Agent Paper Desk — the council deliberates, the guardian checks, the user
// confirms; orders go through the guarded router to PAPER venues only.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Bot, Play, ShieldCheck, ShieldAlert, Check, X, History, Radar, Trash2, Power, RefreshCw, AlertTriangle } from 'lucide-react'

type Vote = { agent: string; category: string; vote: string; confidence: number; for: string; against: string }
type Check = { key: string; label: string; ok: boolean; required: boolean; detail: string }
type Proposal = {
  id: string; providerKey: string; symbol: string; canonical: string; direction: string; consensusScore: number; agreement: number; confidence: number
  refPrice: number | null; stopPct: number | null; targetPct: number | null; qty: number | null; qtyUnit: string | null; notionalUsd: number | null; riskUsd: number | null
  thesis: string | null; votes: Vote[]; guardian: { approved: boolean; checks: Check[] }; risks: string[]
  status: string; source: string; message: string | null; executedAt: string | null; expiresAt: string; createdAt: string
}
type Desk = {
  enabled: boolean; isAdmin: boolean
  venues: { key: string; name: string; paper: boolean; connected: boolean; tier: string | null; eligible: boolean; reason: string | null }[]
  proposals: Proposal[]
  watches: { id: string; providerKey: string; symbol: string; enabled: boolean; intervalMin: number; maxPerDay: number; lastRunAt: string | null; lastOutcome: string | null }[]
  autopilot: { ok: boolean; reasons: string[]; armed: boolean; mode: string }
  config: { riskPct: number; maxEquityPct: number; minAgreement: number; minConsensus: number; minConfidence: number; proposalTtlMin: number; maxExecutionsPerDay: number }
  caps: { paper: number }
}

const DEFAULT_SYMBOLS: Record<string, string[]> = { deribit_testnet: ['BTC-PERPETUAL', 'ETH-PERPETUAL'], gemini_sandbox: ['btcusd', 'ethusd'], delta_exchange_testnet: ['BTCUSD', 'ETHUSD'] }
const dirTone = (d: string) => (d === 'BUY' ? 'text-emerald-300' : d === 'SELL' ? 'text-red-300' : 'text-slate-300')
const statusTone: Record<string, string> = { proposed: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10', executed: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', rejected: 'text-amber-300 border-amber-500/40 bg-amber-500/10', dismissed: 'text-slate-400 border-slate-600 bg-slate-800/40', expired: 'text-slate-400 border-slate-600 bg-slate-800/40', error: 'text-red-300 border-red-500/40 bg-red-500/10' }

export default function AgentDeskClient() {
  const [desk, setDesk] = useState<Desk | null>(null)
  const [error, setError] = useState('')
  const [venue, setVenue] = useState('')
  const [symbol, setSymbol] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [current, setCurrent] = useState<Proposal | null>(null)
  const [watchInterval, setWatchInterval] = useState('60')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-desk', { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      setDesk(d); setError('')
      setVenue((v) => v || d.venues.find((x: any) => x.eligible)?.key || d.venues[0]?.key || '')
    } catch (e: any) { setError(e?.message ?? 'Agent desk unavailable') }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (venue && !symbol) setSymbol(DEFAULT_SYMBOLS[venue]?.[0] ?? '') }, [venue, symbol])

  const post = async (body: any, label: string) => {
    setBusy(label); setMsg('')
    try {
      const res = await fetch('/api/agent-desk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      return d
    } catch (e: any) { setMsg(e?.message ?? 'Request failed'); return null } finally { setBusy('') }
  }
  const convene = async () => {
    const d = await post({ type: 'convene', venue, symbol }, 'convene')
    if (d?.proposal) { setCurrent(d.proposal); setMsg(d.proposal.guardian.approved ? 'Guardian approved — review and confirm to send the paper order.' : `Guardian rejected: ${d.proposal.message}`) }
    await load()
  }
  const execute = async (id: string) => {
    const d = await post({ type: 'execute', id }, `exec:${id}`)
    if (d?.pendingApproval) setMsg(d.message)
    else if (d?.order) { setMsg(`Paper order sent → ${d.order.status}${d.order.filledQty ? ` · filled ${d.order.filledQty}${d.order.avgFillPrice ? ` @ ${d.order.avgFillPrice}` : ''}` : ''}.`); setCurrent(null) }
    await load()
  }

  if (error && !desk) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!desk) return <div className="p-6"><LoadingPanel text="Loading the agent desk…" /></div>
  if (!desk.enabled) return <div className="p-6"><StatusMessage text="The Agent Paper Desk is switched off by the administrator (feature flag agent_paper_desk)." /></div>

  const eligible = desk.venues.filter((v) => v.eligible)
  const selected = desk.venues.find((v) => v.key === venue)
  const shown = current ?? desk.proposals.find((p) => p.status === 'proposed') ?? null

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Bot className="h-5 w-5 text-cyan-400" /> Agent Paper Desk</h1>
          <p className="text-xs text-slate-500 mt-1">The agent council deliberates one instrument, the guardian checks it deterministically and sizes it to {desk.config.riskPct}% risk, and <b className="text-slate-300">you confirm</b> before anything is sent — through the same guarded router as the Paper Trading Desk, to testnet/sandbox venues only. Live venues are refused in code.</p>
        </div>
        <button onClick={load} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Convene the council" icon={Radar} accent="cyan" className="lg:col-span-2">
          {eligible.length === 0 ? (
            <p className="text-xs text-amber-300">No paper venue is linked at the Trading tier yet. On the <Link href="/api-hub" className="underline">Global API Hub</Link>, run Connect → Trading on Deribit Testnet, Gemini Sandbox or Delta Demo (test funds only).{desk.venues.length ? ` Status: ${desk.venues.map((v) => `${v.name}: ${v.reason ?? 'ready'}`).join(' · ')}` : ''}</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-500">Paper venue<select value={venue} onChange={(e) => { setVenue(e.target.value); setSymbol(DEFAULT_SYMBOLS[e.target.value]?.[0] ?? '') }} className="mt-1 block rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs text-white">{desk.venues.map((v) => <option key={v.key} value={v.key} disabled={!v.eligible}>{v.name}{v.eligible ? '' : ` — ${v.reason}`}</option>)}</select></label>
              <label className="text-[10px] uppercase tracking-wider text-slate-500">Instrument<input list="agent-desk-symbols" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="mt-1 block w-44 rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs text-white num" /><datalist id="agent-desk-symbols">{(DEFAULT_SYMBOLS[venue] ?? []).map((s) => <option key={s} value={s} />)}</datalist></label>
              <button onClick={convene} disabled={!!busy || !selected?.eligible || !symbol} className="rounded-md bg-cyan-600/80 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"><Play className="h-3.5 w-3.5" /> {busy === 'convene' ? 'Deliberating…' : 'Convene council'}</button>
              <label className="text-[10px] uppercase tracking-wider text-slate-500">Watch every<select value={watchInterval} onChange={(e) => setWatchInterval(e.target.value)} className="mt-1 block rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs text-white"><option value="30">30 min</option><option value="60">1 h</option><option value="240">4 h</option><option value="1440">24 h</option></select></label>
              <button onClick={async () => { await post({ type: 'watch_add', venue, symbol, intervalMin: Number(watchInterval) }, 'watch'); await load() }} disabled={!!busy || !selected?.eligible || !symbol} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-50">Add watch</button>
            </div>
          )}
          {msg ? <p className="text-[11px] text-slate-200 mt-3 rounded-md border border-border bg-background/40 px-3 py-2">{msg}</p> : null}
          <p className="text-[10px] text-slate-500 mt-3">Gates: agreement ≥ {Math.round(desk.config.minAgreement * 100)}%, consensus ≥ {desk.config.minConsensus}, confidence ≥ {desk.config.minConfidence}, no disarm-class breaker, no high-impact USD event ±30 min, spread within the router limit, no same-side position, size ≤ {desk.caps.paper.toLocaleString()} USD and ≤ {desk.config.maxEquityPct}% of venue equity, ≤ {desk.config.maxExecutionsPerDay} agent executions/day. Proposals expire after {desk.config.proposalTtlMin} minutes.</p>
        </Panel>

        <Panel title="Autopilot (watches)" icon={desk.autopilot.ok ? ShieldCheck : ShieldAlert} accent={desk.autopilot.ok ? 'emerald' : 'amber'}>
          <p className={`text-xs ${desk.autopilot.ok ? 'text-emerald-300' : 'text-amber-300'}`}>{desk.autopilot.ok ? 'ARMED for paper autopilot — due watches execute approved proposals without a click.' : 'Watches only PROPOSE right now.'}</p>
          {!desk.autopilot.ok ? <ul className="mt-1 text-[11px] text-slate-400 list-disc pl-4">{desk.autopilot.reasons.map((r) => <li key={r}>{r}</li>)}</ul> : null}
          <p className="text-[10px] text-slate-500 mt-2">To enable: flag <span className="num">agent_paper_autopilot</span> ON in Command → Feature Flags, then ARM EMIL in a semi-autonomous or autonomous mode. Still paper only.</p>
          <div className="mt-3 space-y-1.5">
            {desk.watches.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="text-[11px] text-white num">{w.symbol} <span className="text-slate-500">· {w.providerKey} · every {w.intervalMin} min · max {w.maxPerDay}/day</span></p>
                  <p className="text-[10px] text-slate-500 truncate">{w.lastRunAt ? `${new Date(w.lastRunAt).toLocaleString()} — ${w.lastOutcome ?? ''}` : 'not run yet'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={async () => { await post({ type: 'watch_toggle', id: w.id }, 'w'); await load() }} title={w.enabled ? 'Disable' : 'Enable'} className={`rounded p-1 ${w.enabled ? 'text-emerald-300' : 'text-slate-500'} hover:bg-secondary`}><Power className="h-3.5 w-3.5" /></button>
                  <button onClick={async () => { await post({ type: 'watch_delete', id: w.id }, 'w'); await load() }} title="Delete" className="rounded p-1 text-slate-500 hover:text-red-300 hover:bg-secondary"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {desk.watches.length === 0 ? <p className="text-[11px] text-slate-500">No watches.</p> : null}
            {desk.watches.length ? <button onClick={async () => { const d = await post({ type: 'run_watches' }, 'run'); if (d) setMsg(d.ran?.length ? d.ran.map((r: any) => `${r.symbol}: ${r.outcome}`).join(' · ') : (d.gates?.ok ? 'No watch is due.' : `Not run — ${d.gates?.reasons?.join(', ')}`)); await load() }} disabled={!!busy} className="text-[11px] text-cyan-400 hover:underline disabled:opacity-50">Run due watches now</button> : null}
          </div>
        </Panel>
      </div>

      {shown ? (
        <Panel title={`Proposal — ${shown.symbol} on ${shown.providerKey} · ${shown.status}`} icon={shown.guardian.approved ? ShieldCheck : ShieldAlert} accent={shown.guardian.approved ? 'emerald' : 'amber'} headerExtra={<span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${statusTone[shown.status] ?? ''}`}>{shown.source} · {shown.status}</span>}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
            <Stat label="Council" value={<span className={dirTone(shown.direction)}>{shown.direction}</span>} sub={`${Math.round(shown.agreement * 100)}% agree · score ${shown.consensusScore.toFixed(2)}`} size="sm" />
            <Stat label="Confidence" value={shown.confidence.toFixed(2)} size="sm" />
            <Stat label="Reference" value={shown.refPrice ?? '—'} sub="venue mark/last" size="sm" />
            <Stat label="Stop / target" value={`${shown.stopPct ?? '—'}% / ${shown.targetPct ?? '—'}%`} size="sm" />
            <Stat label="Size" value={shown.qty !== null ? `${shown.qty} ${shown.qtyUnit ?? ''}` : '—'} sub={shown.notionalUsd ? `≈ ${Math.round(shown.notionalUsd).toLocaleString()} USD` : 'not sized'} size="sm" />
            <Stat label="Risk to stop" value={shown.riskUsd !== null ? `${Math.round(shown.riskUsd)} USD` : '—'} sub={`${desk.config.riskPct}% of venue equity`} size="sm" />
          </div>
          {shown.thesis ? <p className="text-xs text-slate-200 mb-3"><b className="text-slate-400">Thesis (council, model assessment):</b> {shown.thesis}</p> : null}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Votes</p>
              <div className="space-y-1">
                {shown.votes.map((v, i) => (
                  <div key={i} className="rounded-md border border-border bg-background/40 px-2.5 py-1.5">
                    <div className="flex items-center justify-between text-[11px]"><span className="text-white">{v.agent} <span className="text-slate-500">· {v.category.replace('_', ' ')}</span></span><span className={`font-bold ${dirTone(v.vote)}`}>{v.vote} <span className="text-slate-500 font-normal num">{v.confidence.toFixed(2)}</span></span></div>
                    <div className="h-1 rounded bg-slate-800 mt-1"><div className={`h-1 rounded ${v.vote === 'BUY' ? 'bg-emerald-500/70' : v.vote === 'SELL' ? 'bg-red-500/70' : 'bg-slate-500/70'}`} style={{ width: `${Math.round(v.confidence * 100)}%` }} /></div>
                    <p className="text-[10px] text-slate-400 mt-1"><span className="text-emerald-400">for:</span> {v.for || '—'} <span className="text-red-400 ml-1">against:</span> {v.against || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Guardian checks (deterministic)</p>
              <div className="space-y-1">
                {shown.guardian.checks.map((c) => (
                  <div key={c.key} className="flex items-start gap-2 text-[11px]">
                    {c.ok ? <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> : <X className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${c.required ? 'text-red-400' : 'text-amber-400'}`} />}
                    <span><span className="text-slate-200">{c.label}</span>{!c.required ? <span className="text-[9px] text-slate-500 ml-1">advisory</span> : null}<span className="block text-slate-500">{c.detail}</span></span>
                  </div>
                ))}
              </div>
              {shown.risks?.length ? <><p className="text-[10px] uppercase tracking-wider text-slate-500 mt-3 mb-1">Risks named by the council</p><ul className="text-[11px] text-slate-300 list-disc pl-4">{shown.risks.map((r, i) => <li key={i}>{r}</li>)}</ul></> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
            {shown.status === 'proposed' && shown.guardian.approved ? (
              <>
                <button onClick={() => execute(shown.id)} disabled={!!busy} className="rounded-md bg-emerald-600/80 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"><ShieldCheck className="h-3.5 w-3.5" /> {busy.startsWith('exec') ? 'Sending…' : `Confirm PAPER ${shown.direction} ${shown.qty} ${shown.qtyUnit ?? ''} (market)`}</button>
                <button onClick={async () => { await post({ type: 'dismiss', id: shown.id }, 'dismiss'); setCurrent(null); await load() }} disabled={!!busy} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-50">Dismiss</button>
                <span className="text-[10px] text-slate-500">Expires {new Date(shown.expiresAt).toLocaleTimeString()}. The router re-runs every pre-trade guard when you confirm.</span>
              </>
            ) : <span className="text-[11px] text-slate-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {shown.message ?? (shown.status === 'executed' ? `Executed ${shown.executedAt ? new Date(shown.executedAt).toLocaleString() : ''}` : 'Nothing to execute.')}</span>}
          </div>
        </Panel>
      ) : null}

      <Panel title={`History · ${desk.proposals.length}`} icon={History} accent="violet" collapsible defaultOpen={!shown}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">When</th><th className="py-1.5 pr-3">Venue</th><th className="py-1.5 pr-3">Symbol</th><th className="py-1.5 pr-3">Council</th><th className="py-1.5 pr-3 text-right">Agree</th><th className="py-1.5 pr-3 text-right">Size</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5">Message</th></tr></thead>
            <tbody>
              {desk.proposals.map((p) => (
                <tr key={p.id} className="border-b border-border/40 hover:bg-secondary/30 cursor-pointer" onClick={() => setCurrent(p)}>
                  <td className="py-1.5 pr-3 text-[11px] text-slate-400 num">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-[11px] text-slate-300">{p.providerKey}</td>
                  <td className="py-1.5 pr-3 text-[11px] text-white num">{p.symbol}</td>
                  <td className={`py-1.5 pr-3 text-[11px] font-bold ${dirTone(p.direction)}`}>{p.direction}</td>
                  <td className="py-1.5 pr-3 text-[11px] num text-right text-slate-300">{Math.round(p.agreement * 100)}%</td>
                  <td className="py-1.5 pr-3 text-[11px] num text-right text-slate-300">{p.qty !== null ? `${p.qty} ${p.qtyUnit ?? ''}` : '—'}</td>
                  <td className="py-1.5 pr-3"><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${statusTone[p.status] ?? ''}`}>{p.status}</span>{p.source === 'autopilot' ? <span className="ml-1 text-[9px] text-violet-300">auto</span> : null}</td>
                  <td className="py-1.5 text-[10px] text-slate-500 max-w-[24rem] truncate">{p.message ?? p.thesis ?? ''}</td>
                </tr>
              ))}
              {desk.proposals.length === 0 ? <tr><td colSpan={8} className="py-6 text-center text-xs text-slate-500">No proposals yet — convene the council.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Council output is a model assessment over venue data, free candle history and the live context; the guardian and sizing are deterministic code. Paper/testnet funds only. Executed orders appear on the <Link href="/paper" className="text-cyan-400 hover:underline">Paper Trading Desk</Link> journal and in the audit trail (category agent_desk).</p>
      </Panel>
    </div>
  )
}
