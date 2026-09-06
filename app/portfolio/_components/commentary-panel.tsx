'use client'

// Portfolio AI commentary (spec §28–29) — one cached model read of the
// consolidated portfolio, factor exposures, risk-off scenario and breakers.
// Labelled model assessment; never advice.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/cockpit/panel'
import { BrainCircuit, RefreshCw, Waves } from 'lucide-react'

type C = {
  fetchedAt: string; model: string; headline: string; summary: string
  concentration: string[]; exposures: string[]; scenario: string[]; risks: string[]; hedgingObservations: string[]; researchQuestions: string[]
  inputs: { accounts: number; positions: number; equity: number; grossTotal: number; scenarioPnl: number; breakersTripped: number }
  cached?: boolean; stale?: boolean; disabled?: boolean
}

export default function CommentaryPanel() {
  const [c, setC] = useState<C | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async (refresh = false) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/portfolio/commentary${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      setC(d); setError('')
    } catch (e: any) { setError(e?.message ?? 'Commentary unavailable') } finally { setBusy(false) }
  }, [])
  useEffect(() => { load() }, [load])

  if (c?.disabled) return null
  const List = ({ title, items }: { title: string; items: string[] }) => items?.length ? (
    <div><p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{title}</p><ul className="space-y-0.5 text-[11px] text-slate-300 list-disc pl-4">{items.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
  ) : null

  return (
    <Panel title="EMIL portfolio commentary — model assessment" icon={BrainCircuit} accent="violet" headerExtra={
      <span className="flex items-center gap-2">
        <Link href="/scenario" className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"><Waves className="h-3 w-3" /> Scenario &amp; hedges</Link>
        <button onClick={() => load(true)} disabled={busy} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> regenerate</button>
      </span>
    }>
      {error && !c ? <p className="text-xs text-amber-300">{error}</p> : null}
      {!c && !error ? <p className="text-xs text-slate-500 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500 pulse-dot" /> Reading the portfolio, factor exposures, risk-off scenario and breakers…</p> : null}
      {c ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-white">{c.headline}</p>
            <p className="text-xs text-slate-300 mt-1">{c.summary}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <List title="Concentration" items={c.concentration} />
            <List title="Factor exposures" items={c.exposures} />
            <List title="Risk-off scenario" items={c.scenario} />
            <List title="Risks" items={c.risks} />
            <List title="Hedge proposals (described, not sent)" items={c.hedgingObservations} />
            <List title="Research questions" items={c.researchQuestions} />
          </div>
          <p className="text-[10px] text-slate-500">Model {c.model} over {c.inputs.accounts} account(s), {c.inputs.positions} position(s), equity ≈ {Math.round(c.inputs.equity).toLocaleString()} USD; risk-off scenario P&amp;L {Math.round(c.inputs.scenarioPnl).toLocaleString()} USD; breakers tripped {c.inputs.breakersTripped}. Generated {new Date(c.fetchedAt).toLocaleTimeString()}{c.cached ? ' · cached ≤1h' : ''}{c.stale ? ' · STALE' : ''}. Not advice.</p>
        </div>
      ) : null}
    </Panel>
  )
}
