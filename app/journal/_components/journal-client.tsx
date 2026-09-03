'use client'

// Trade Journal (spec §35–36): pull executed orders in, annotate setup /
// tags / mistakes / P&L, and ask EMIL for a post-trade PROCESS review.

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Panel, LoadingPanel, Stat } from '@/components/cockpit/panel'
import { BookOpenText, Plus, Sparkles, Trash2, Import, Save } from 'lucide-react'

const fmt = (n?: number | null, d = 2) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: d }))
const GRADE: Record<string, string> = { A: 'text-emerald-300', B: 'text-cyan-300', C: 'text-amber-300', D: 'text-orange-300', F: 'text-red-300' }

export default function JournalClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [drafts, setDrafts] = useState<Record<string, any>>({})
  const [manual, setManual] = useState<any>({ symbol: '', side: 'buy', qty: '', entryPrice: '', exitPrice: '', pnl: '', setup: '', tags: '', notes: '' })
  const [showManual, setShowManual] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/journal', { cache: 'no-store' })
      const d = await res.json().catch(() => null)
      if (res.ok) setData(d)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const post = async (body: any, key: string, ok?: string) => {
    setBusy(key)
    try {
      const res = await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(d?.error ?? 'Request failed'); return null }
      if (ok) toast.success(ok)
      await load()
      return d
    } finally { setBusy('') }
  }

  if (loading && !data) return <LoadingPanel text="Loading your journal…" />
  const s = data?.stats ?? {}

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Entries" value={s.entries ?? 0} sub={`${s.reviewed ?? 0} reviewed by EMIL`} />
        <Stat label="Win rate (graded)" value={s.winRate === null || s.winRate === undefined ? '—' : `${fmt(s.winRate, 0)}%`} sub={`${s.graded ?? 0} with P&L`} />
        <Stat label="Net P&L (graded)" value={fmt(s.totalPnl)} valueClass={(s.totalPnl ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'} />
        <Stat label="Top tag" value={s.byTag?.[0]?.tag ?? '—'} sub={s.byTag?.[0] ? `${s.byTag[0].n} trades · ${fmt(s.byTag[0].winRate, 0)}% win` : ''} />
        <Stat label="Most common mistake" value={s.mistakes?.[0]?.mistake ?? '—'} sub={s.mistakes?.[0] ? `${s.mistakes[0].n}×` : ''} valueClass="text-amber-300" />
      </div>

      <Panel title="Add to the journal" icon={Import} accent="cyan" headerExtra={<button onClick={() => setShowManual((v) => !v)} className="rounded-md border border-border bg-secondary/60 px-2 py-1 text-[11px] text-slate-200 flex items-center gap-1"><Plus className="h-3 w-3" /> Manual entry</button>}>
        {showManual ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 rounded-lg border border-border bg-secondary/30 p-3">
            {[['symbol', 'Symbol'], ['qty', 'Qty'], ['entryPrice', 'Entry'], ['exitPrice', 'Exit'], ['pnl', 'P&L'], ['setup', 'Setup'], ['tags', 'Tags (comma)']].map(([k, l]) => (
              <input key={k} value={manual[k]} onChange={(e) => setManual((m: any) => ({ ...m, [k]: e.target.value }))} placeholder={l} className="rounded-md bg-secondary/60 border border-border px-2 py-1.5 text-xs text-white" />
            ))}
            <select value={manual.side} onChange={(e) => setManual((m: any) => ({ ...m, side: e.target.value }))} className="rounded-md bg-secondary/60 border border-border px-2 py-1.5 text-xs text-white"><option value="buy">buy / long</option><option value="sell">sell / short</option></select>
            <textarea value={manual.notes} onChange={(e) => setManual((m: any) => ({ ...m, notes: e.target.value }))} placeholder="What happened, what you were thinking…" className="col-span-2 md:col-span-4 rounded-md bg-secondary/60 border border-border px-2 py-1.5 text-xs text-white min-h-16" />
            <button onClick={async () => { const r = await post({ type: 'create', sourceType: 'manual', ...manual }, 'manual', 'Entry added.'); if (r) setManual({ symbol: '', side: 'buy', qty: '', entryPrice: '', exitPrice: '', pnl: '', setup: '', tags: '', notes: '' }) }} disabled={!!busy || !manual.symbol} className="col-span-2 md:col-span-1 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white">Save entry</button>
          </div>
        ) : null}
        {(data?.candidates ?? []).length === 0 ? <p className="text-xs text-slate-500">No executed orders waiting to be journaled. Fills from the Paper Trading Desk and the agent pipeline appear here automatically.</p> : (
          <div className="flex flex-wrap gap-2">
            {(data?.candidates ?? []).map((c: any) => (
              <button key={`${c.sourceType}:${c.sourceId}`} onClick={() => post({ type: 'create', sourceType: c.sourceType, sourceId: c.sourceId, symbol: c.symbol, side: c.side, qty: c.qty, entryPrice: c.price, tradedAt: c.at }, c.sourceId, 'Added to the journal.')} disabled={!!busy} className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-left hover:border-cyan-500/50">
                <div className="text-xs font-semibold text-white">{c.symbol} <span className={c.side === 'buy' ? 'text-emerald-300' : 'text-red-300'}>{c.side}</span> {fmt(c.qty, 4)} @ {fmt(c.price, 4)}</div>
                <div className="text-[10px] text-slate-500">{c.label} · {new Date(c.at).toLocaleString()}</div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={`Journal (${(data?.entries ?? []).length})`} icon={BookOpenText} accent="violet">
        {(data?.entries ?? []).length === 0 ? <p className="text-xs text-slate-500">Nothing journaled yet.</p> : null}
        <div className="space-y-3">
          {(data?.entries ?? []).map((e: any) => {
            const d = drafts[e.id] ?? { notes: e.notes ?? '', tags: e.tags ?? '', setup: e.setup ?? '', mistakes: e.mistakes ?? '', exitPrice: e.exitPrice ?? '', pnl: e.pnl ?? '' }
            let review: any = null
            try { review = e.aiReview ? JSON.parse(e.aiReview) : null } catch { review = null }
            return (
              <div key={e.id} className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">{e.symbol}</span>
                  {e.side ? <span className={`text-[10px] uppercase font-bold ${e.side === 'buy' ? 'text-emerald-300' : 'text-red-300'}`}>{e.side}</span> : null}
                  <span className="text-[11px] text-slate-500">{fmt(e.qty, 4)} @ {fmt(e.entryPrice, 4)}{e.exitPrice ? ` → ${fmt(e.exitPrice, 4)}` : ''} · {new Date(e.tradedAt).toLocaleString()} · {e.sourceType.replace('_', ' ')}</span>
                  {typeof e.pnl === 'number' ? <span className={`text-xs font-mono ${e.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>P&L {fmt(e.pnl)}</span> : null}
                  {review?.processGrade ? <span className={`ml-auto text-xs font-bold ${GRADE[review.processGrade] ?? ''}`}>Process grade {review.processGrade}</span> : null}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5 mt-2">
                  <input value={d.setup} onChange={(ev) => setDrafts((x) => ({ ...x, [e.id]: { ...d, setup: ev.target.value } }))} placeholder="Setup" className="rounded-md bg-secondary/60 border border-border px-2 py-1 text-[11px] text-white" />
                  <input value={d.tags} onChange={(ev) => setDrafts((x) => ({ ...x, [e.id]: { ...d, tags: ev.target.value } }))} placeholder="Tags (comma)" className="rounded-md bg-secondary/60 border border-border px-2 py-1 text-[11px] text-white" />
                  <input value={d.mistakes} onChange={(ev) => setDrafts((x) => ({ ...x, [e.id]: { ...d, mistakes: ev.target.value } }))} placeholder="Mistakes (comma)" className="rounded-md bg-secondary/60 border border-border px-2 py-1 text-[11px] text-white" />
                  <input value={d.exitPrice} onChange={(ev) => setDrafts((x) => ({ ...x, [e.id]: { ...d, exitPrice: ev.target.value } }))} placeholder="Exit price" className="rounded-md bg-secondary/60 border border-border px-2 py-1 text-[11px] text-white" />
                  <input value={d.pnl} onChange={(ev) => setDrafts((x) => ({ ...x, [e.id]: { ...d, pnl: ev.target.value } }))} placeholder="P&L" className="rounded-md bg-secondary/60 border border-border px-2 py-1 text-[11px] text-white" />
                  <div className="flex gap-1">
                    <button onClick={() => post({ type: 'update', id: e.id, ...d }, `u-${e.id}`, 'Saved.')} disabled={!!busy} className="flex-1 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-2 py-1 text-[11px] font-semibold text-white flex items-center justify-center gap-1"><Save className="h-3 w-3" /> Save</button>
                    <button onClick={() => post({ type: 'delete', id: e.id }, `d-${e.id}`, 'Deleted.')} disabled={!!busy} className="rounded-md border border-border px-2 py-1 text-[11px] text-red-400"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
                <textarea value={d.notes} onChange={(ev) => setDrafts((x) => ({ ...x, [e.id]: { ...d, notes: ev.target.value } }))} placeholder="Notes — what you saw, why you acted, how you felt" className="w-full mt-1.5 rounded-md bg-secondary/60 border border-border px-2 py-1.5 text-[11px] text-white min-h-12" />
                <div className="mt-2 flex items-start gap-2">
                  <button onClick={() => post({ type: 'ai_review', id: e.id }, `ai-${e.id}`, 'EMIL reviewed the trade.')} disabled={!!busy || !data?.aiConfigured} title={data?.aiConfigured ? '' : 'AI engine not configured'} className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200 hover:border-violet-400 disabled:opacity-50 flex items-center gap-1 shrink-0"><Sparkles className="h-3 w-3" /> {busy === `ai-${e.id}` ? 'Reviewing…' : review ? 'Review again' : 'Ask EMIL to review'}</button>
                  {review ? (
                    <div className="text-[11px] text-slate-300 space-y-1">
                      <p>{review.summary}</p>
                      {review.whatWentRight?.length ? <p className="text-emerald-300/90">✓ {review.whatWentRight.join(' · ')}</p> : null}
                      {review.whatWentWrong?.length ? <p className="text-red-300/90">✕ {review.whatWentWrong.join(' · ')}</p> : null}
                      {review.patterns?.length ? <p className="text-amber-300/90">Pattern: {review.patterns.join(' · ')}</p> : null}
                      {review.nextTime?.length ? <p className="text-cyan-300/90">Next time: {review.nextTime.join(' · ')}</p> : null}
                      {review.riskFlag && review.riskFlag !== 'none' ? <p className="text-[10px] uppercase tracking-wider text-red-400">Risk flag: {review.riskFlag.replace('_', ' ')}</p> : null}
                      <p className="text-[10px] text-slate-500">Reviewed {e.aiReviewedAt ? new Date(e.aiReviewedAt).toLocaleString() : ''} · grades the process, not the outcome.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}
