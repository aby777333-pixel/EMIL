'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import {
  ShieldAlert, Users, Library, SlidersHorizontal, Lightbulb, AlertTriangle,
  ScrollText, FlaskConical, Ban, RotateCcw, Trash2, Gauge,
} from 'lucide-react'
import toast from 'react-hot-toast'

const TONE = {
  ok: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  warn: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  bad: 'text-red-300 border-red-500/40 bg-red-500/10',
  idle: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
}

export default function AdminClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [confTarget, setConfTarget] = useState<any>(null)
  const [confValue, setConfValue] = useState('50')
  const [confReason, setConfReason] = useState('')
  const [resolveTarget, setResolveTarget] = useState<any>(null)
  const [resolveStatus, setResolveStatus] = useState('resolved_regime')
  const [resolveNote, setResolveNote] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin')
      if (res.status === 403) { setForbidden(true); return }
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
      setError('')
    } catch {
      setError('Failed to load the Super Admin console.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = useCallback(async (payload: any, busy: string, msg: string, confirmText?: string) => {
    if (busyKey) return
    if (confirmText && !window.confirm(confirmText)) return
    setBusyKey(busy)
    try {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'action failed')
      toast.success(msg)
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Action failed.')
    } finally {
      setBusyKey('')
    }
  }, [busyKey, load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading the Super Admin console..." /></div>
  if (forbidden) return <div className="p-6"><StatusMessage text="Super Admin role required. Ask an existing admin to grant your account the admin role." /></div>
  if (error || !data) return <div className="p-6"><StatusMessage text={error || 'Failed to load.'} /></div>

  const pendingStrategies = (data.blueprints ?? []).filter((b: any) => b.isCurrent && b.labStage === 'human_review' && !['HUMAN_APPROVED', 'LIVE_ELIGIBLE', 'REJECTED'].includes(b.state))
  const openContradictions = (data.contradictions ?? []).filter((c: any) => ['open', 'investigating'].includes(c.status))

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-400" /> Super Admin Console</h1>
        <p className="text-xs text-slate-500 mt-1">Signed in as {data.adminEmail}. Every action here is verified against the database role and written to the audit trail. Learning, strategy generation and live deployment remain strictly separate.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Users" value={(data.users ?? []).length} />
        <Stat label="Sources" value={(data.sources ?? []).length} sub={`${(data.sources ?? []).filter((s: any) => s.status === 'quarantined').length} quarantined`} />
        <Stat label="Hypotheses" value={(data.hypotheses ?? []).length} valueClass="text-violet-300" />
        <Stat label="Strategies Pending Review" value={pendingStrategies.length} valueClass="text-amber-300" />
        <Stat label="Open Contradictions" value={openContradictions.length} valueClass={openContradictions.length ? 'text-red-300' : 'text-white'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Users & roles */}
        <Panel title="Users & Roles" icon={Users} accent="cyan">
          <div className="space-y-2">
            {(data.users ?? []).map((u: any) => (
              <div key={u.id} className="rounded-md border border-border bg-background/40 p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-200 truncate">{u.email}</p>
                  <p className="text-[10px] text-slate-500">{u.name ?? '—'} · joined {String(u.createdAt).slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${u.role === 'admin' ? TONE.bad : TONE.idle}`}>{u.role}</span>
                  <button
                    onClick={() => act({ type: 'set_user_role', id: u.id, value: u.role === 'admin' ? 'trader' : 'admin' }, `role-${u.id}`, `Role updated for ${u.email}.`, `Change ${u.email} to ${u.role === 'admin' ? 'trader' : 'admin'}?`)}
                    disabled={!!busyKey}
                    className="text-[10px] rounded bg-slate-700/60 hover:bg-slate-600/60 disabled:opacity-50 text-slate-200 px-2 py-1"
                  >{u.role === 'admin' ? 'Demote' : 'Make admin'}</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Strategy approvals */}
        <Panel title="Strategy Approvals & Rollback" icon={FlaskConical} accent="amber">
          {pendingStrategies.length === 0 ? <p className="text-xs text-slate-500 mb-2">No strategies awaiting human review.</p> : null}
          <div className="space-y-2">
            {pendingStrategies.map((b: any) => (
              <div key={b.id} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
                <p className="text-[11px] text-slate-200 font-semibold">{b.code} v{b.version} — {b.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{b.origin === 'emil_generated' ? 'EMIL-GENERATED · ' : ''}robustness {Math.round(b.robustnessScore)}/100 · state {b.state}</p>
                <p className="text-[10px] text-cyan-300/80 mt-1">Approve or reject from the Strategy Lab page — this list is the review queue.</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-slate-400 mb-1.5">Version pointers (rollback preserves all history):</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
              {(data.blueprints ?? []).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-300 truncate">{b.code} v{b.version} — {b.name.slice(0, 40)} <span className="text-slate-600">({b.state}{b.isCurrent ? ' · CURRENT' : ''})</span></span>
                  {!b.isCurrent ? (
                    <button onClick={() => act({ type: 'rollback_strategy', id: b.id }, `rb-${b.id}`, `${b.code} rolled back to v${b.version}.`, `Set ${b.code} current version to v${b.version}?`)} disabled={!!busyKey} className="shrink-0 flex items-center gap-1 rounded bg-slate-700/60 hover:bg-slate-600/60 disabled:opacity-50 text-slate-200 px-2 py-0.5"><RotateCcw className="h-3 w-3" /> Roll back</button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Source control */}
      <Panel title="Source Control — quarantine, reliability, removal" icon={Library} accent="emerald">
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
          {(data.sources ?? []).map((s: any) => (
            <div key={s.id} className="rounded-md border border-border bg-background/40 p-2.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-200 truncate">{s.title}</p>
                <p className="text-[10px] text-slate-500 truncate">{s.sourceType} · {s.status} · {s.claimCount} claims{s.url ? ` · ${s.url}` : ''}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={s.reliability}
                  onChange={(e) => act({ type: 'set_reliability', id: s.id, value: e.target.value }, `rel-${s.id}`, 'Reliability updated.')}
                  className="rounded bg-background border border-border px-1.5 py-1 text-[10px] text-white"
                  disabled={!!busyKey}
                >
                  {['unrated', 'low', 'medium', 'high', 'flagged'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {s.status === 'quarantined' ? (
                  <button onClick={() => act({ type: 'restore_source', id: s.id }, `q-${s.id}`, 'Source restored.')} disabled={!!busyKey} className="flex items-center gap-1 rounded bg-emerald-600/70 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] px-2 py-1"><RotateCcw className="h-3 w-3" /> Restore</button>
                ) : (
                  <button onClick={() => act({ type: 'quarantine_source', id: s.id }, `q-${s.id}`, 'Source quarantined — excluded from analysis until restored.')} disabled={!!busyKey} className="flex items-center gap-1 rounded bg-amber-600/70 hover:bg-amber-600 disabled:opacity-50 text-white text-[10px] px-2 py-1"><Ban className="h-3 w-3" /> Quarantine</button>
                )}
                <button onClick={() => act({ type: 'delete_source', id: s.id }, `d-${s.id}`, 'Source and its claims deleted.', `Permanently delete "${s.title}" and all its claims? The audit log keeps a record.`)} disabled={!!busyKey} className="flex items-center gap-1 rounded bg-red-600/70 hover:bg-red-600 disabled:opacity-50 text-white text-[10px] px-2 py-1"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </div>
          ))}
          {(data.sources ?? []).length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No sources yet.</p> : null}
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Hypothesis approvals */}
        <Panel title="Hypothesis Review" icon={Lightbulb} accent="violet">
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {(data.hypotheses ?? []).map((h: any) => (
              <div key={h.id} className="rounded-md border border-border bg-background/40 p-2.5">
                <p className="text-[11px] text-slate-200">{h.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{h.statement}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <select
                    value={h.status}
                    onChange={(e) => act({ type: 'set_hypothesis_status', id: h.id, value: e.target.value }, `h-${h.id}`, 'Hypothesis status updated.')}
                    disabled={!!busyKey}
                    className="rounded bg-background border border-border px-1.5 py-1 text-[10px] text-white"
                  >
                    {['proposed', 'researching', 'testing', 'supported', 'weak', 'rejected', 'regime_dependent'].map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                  <button onClick={() => { setConfTarget({ targetType: 'hypothesis', id: h.id, name: h.title, current: h.confidence }); setConfValue(String(Math.round(h.confidence))) }} className="flex items-center gap-1 rounded bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 text-[10px] px-2 py-1"><Gauge className="h-3 w-3" /> Confidence {Math.round(h.confidence)}</button>
                </div>
              </div>
            ))}
            {(data.hypotheses ?? []).length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No hypotheses yet.</p> : null}
          </div>
        </Panel>

        {/* Contradiction resolution */}
        <Panel title="Contradiction Resolution" icon={AlertTriangle} accent="red">
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {(data.contradictions ?? []).map((ct: any) => (
              <div key={ct.id} className="rounded-md border border-border bg-background/40 p-2.5">
                <p className="text-[11px] text-slate-200">{ct.topic} <span className="text-[9px] uppercase text-slate-500">({ct.status.replace(/_/g, ' ')})</span></p>
                <p className="text-[10px] text-slate-500 mt-0.5">A: {ct.sideA.slice(0, 120)} · B: {ct.sideB.slice(0, 120)}</p>
                <button onClick={() => { setResolveTarget(ct); setResolveStatus('resolved_regime'); setResolveNote('') }} className="mt-1.5 rounded bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 text-[10px] px-2 py-1">Resolve…</button>
              </div>
            ))}
            {(data.contradictions ?? []).length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No contradictions recorded.</p> : null}
          </div>
        </Panel>
      </div>

      {/* Confidence override + audit trail */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Confidence Event Log" icon={SlidersHorizontal} accent="violet">
          <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {(data.confidenceEvents ?? []).map((e: any) => (
              <p key={e.id} className="text-[10px] text-slate-400">
                <span className="text-slate-600">{String(e.createdAt).slice(0, 16).replace('T', ' ')}</span>{' '}
                <span className={e.actor === 'admin' ? 'text-red-300' : 'text-cyan-300'}>[{e.actor}]</span>{' '}
                {e.targetType} <span className="text-slate-200">{e.targetName}</span>{' '}
                <span className="num">{Math.round(e.previous)} → {Math.round(e.next)}</span> — {e.reason.slice(0, 140)}
              </p>
            ))}
            {(data.confidenceEvents ?? []).length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No confidence changes recorded.</p> : null}
          </div>
        </Panel>

        <Panel title="Audit Trail (last 120 actions)" icon={ScrollText} accent="cyan">
          <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {(data.auditLogs ?? []).map((a: any) => (
              <p key={a.id} className="text-[10px] text-slate-400">
                <span className="text-slate-600">{String(a.createdAt).slice(0, 16).replace('T', ' ')}</span>{' '}
                <span className="text-cyan-300">{a.action}</span>{' '}
                <span className="text-slate-600">[{a.actor}{a.user?.email ? ` · ${a.user.email}` : ''}]</span> — {a.detail.slice(0, 160)}
              </p>
            ))}
          </div>
        </Panel>
      </div>

      {/* Confidence override modal */}
      {confTarget ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfTarget(null)}>
          <div className="rounded-lg border border-border bg-card p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-white">Override confidence — {confTarget.name}</p>
            <p className="text-[11px] text-slate-500 mt-1">Current: {Math.round(confTarget.current)}/100. A reason is mandatory and lands in the audit trail.</p>
            <input type="number" min={0} max={100} value={confValue} onChange={(e) => setConfValue(e.target.value)} className="mt-3 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white" />
            <textarea value={confReason} onChange={(e) => setConfReason(e.target.value)} rows={2} className="mt-2 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white" placeholder="Reason (required)" />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { act({ type: 'set_confidence', targetType: confTarget.targetType, id: confTarget.id, value: Number(confValue), reason: confReason }, 'conf', 'Confidence overridden (audited).'); setConfTarget(null); setConfReason('') }}
                disabled={!confReason.trim() || !!busyKey}
                className="rounded-md bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2"
              >OVERRIDE</button>
              <button onClick={() => setConfTarget(null)} className="rounded-md bg-slate-700/60 text-slate-200 text-xs px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Contradiction resolve modal */}
      {resolveTarget ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setResolveTarget(null)}>
          <div className="rounded-lg border border-border bg-card p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-white">Resolve contradiction</p>
            <p className="text-[11px] text-slate-400 mt-1">{resolveTarget.topic}</p>
            <select value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value)} className="mt-3 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white">
              {['investigating', 'resolved_regime', 'resolved_timeframe', 'resolved_instrument', 'rejected_a', 'rejected_b', 'unresolved', 'open'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={2} className="mt-2 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white" placeholder="Resolution note — when does each side apply?" />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { act({ type: 'resolve_contradiction', id: resolveTarget.id, value: resolveStatus, note: resolveNote }, 'resolve', 'Contradiction updated.'); setResolveTarget(null) }}
                disabled={!!busyKey}
                className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2"
              >SAVE</button>
              <button onClick={() => setResolveTarget(null)} className="rounded-md bg-slate-700/60 text-slate-200 text-xs px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
