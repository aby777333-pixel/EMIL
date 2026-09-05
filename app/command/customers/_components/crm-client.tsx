'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { Users, Search, KeyRound, Cable, StickyNote, Copy, Ban, X } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_TONE: Record<string, string> = {
  lead: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  trial: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  active: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  suspended: 'text-red-300 border-red-500/40 bg-red-500/10',
  churned: 'text-slate-500 border-slate-600/50 bg-slate-700/30',
}
const STATUSES = ['lead', 'trial', 'active', 'suspended', 'churned']

export default function CrmClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [busy, setBusy] = useState('')
  const [focusId, setFocusId] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [keyLabel, setKeyLabel] = useState('')
  const [issuedKey, setIssuedKey] = useState('')
  const [profileDraft, setProfileDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/command/customers', { cache: 'no-store' })
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError('Failed to load the CRM.')
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    setDetail(null)
    setIssuedKey('')
    try {
      const res = await fetch(`/api/command/customers?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (!res?.ok) throw new Error('failed')
      const d = await res.json()
      setDetail(d)
      setProfileDraft({
        company: d?.customer?.profile?.company ?? '',
        phone: d?.customer?.profile?.phone ?? '',
        country: d?.customer?.profile?.country ?? '',
        tags: d?.customer?.profile?.tags ?? '',
      })
    } catch {
      toast.error('Failed to load customer detail.')
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const focus = params.get('focus')
    if (focus) { setFocusId(focus); loadDetail(focus) }
  }, [loadDetail])

  const act = useCallback(async (payload: any, busyKey: string, msg: string, confirmText?: string) => {
    if (busy) return
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(busyKey)
    try {
      const res = await fetch('/api/command/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'action failed')
      if (d?.apiKey) setIssuedKey(d.apiKey)
      if (msg) toast.success(msg)
      await load()
      if (focusId) await loadDetail(focusId)
    } catch (e: any) {
      toast.error(e?.message ?? 'Action failed.')
    } finally {
      setBusy('')
    }
  }, [busy, load, focusId, loadDetail])

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading customers..." /></div>

  const users = (data.users ?? []).filter((u: any) => {
    const status = u.profile?.status ?? 'trial'
    if (statusFilter !== 'all' && status !== statusFilter) return false
    if (!q.trim()) return true
    const needle = q.toLowerCase()
    return [u.email, u.name, u.profile?.company, u.profile?.country, u.profile?.tags].some((v: string) => (v ?? '').toLowerCase().includes(needle))
  })
  const c = detail?.customer

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Users className="h-5 w-5 text-amber-400" /> Customers · CRM</h1>
        <p className="text-xs text-slate-500 mt-1">Every EMIL customer — status, plan, notes, broker links and API keys. Suspension blocks sign-in and API access instantly.</p>
      </div>

      <Panel title={`Customer Book (${users.length})`} icon={Search} accent="amber">
        <div className="flex gap-2 flex-wrap mb-3">
          <input value={q} onChange={(e) => setQ(e?.target?.value ?? '')} className="flex-1 min-w-[12rem] rounded-md bg-background border border-border px-3 py-2 text-xs text-white" placeholder="Search email, name, company, country, tags..." />
          {['all', ...STATUSES].map((st) => (
            <button key={st} onClick={() => setStatusFilter(st)} className={`rounded px-2.5 py-1.5 text-[10px] font-semibold border capitalize transition-colors ${statusFilter === st ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-secondary/40 text-slate-400 border-border'}`}>{st}</button>
          ))}
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="py-1.5 pr-3">Customer</th>
                <th className="py-1.5 pr-3">Role</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">Plan</th>
                <th className="py-1.5 pr-3">Company / Country</th>
                <th className="py-1.5 pr-3">Keys · Brokers</th>
                <th className="py-1.5 pr-3">Joined</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-border/40 hover:bg-accent/30 transition-colors">
                  <td className="py-2 pr-3">
                    <p className="text-[11px] text-slate-200">{u.email}</p>
                    <p className="text-[10px] text-slate-500">{u.name || '—'}</p>
                  </td>
                  <td className="py-2 pr-3"><span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${u.role === 'admin' ? 'text-red-300 border-red-500/40 bg-red-500/10' : 'text-slate-300 border-slate-500/40 bg-slate-500/10'}`}>{u.role ?? 'trader'}</span></td>
                  <td className="py-2 pr-3"><span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_TONE[u.profile?.status ?? 'trial']}`}>{u.profile?.status ?? 'trial'}</span></td>
                  <td className="py-2 pr-3 text-[11px] text-slate-300 capitalize">{u.profile?.planKey ?? 'trial'}</td>
                  <td className="py-2 pr-3 text-[10px] text-slate-500">{u.profile?.company || '—'}{u.profile?.country ? ` · ${u.profile.country}` : ''}</td>
                  <td className="py-2 pr-3 num text-[11px] text-slate-400">{u._count?.apiKeys ?? 0} · {u._count?.brokerLinks ?? 0}</td>
                  <td className="py-2 pr-3 num text-[10px] text-slate-500">{String(u.createdAt).slice(0, 10)}</td>
                  <td className="py-2">
                    <button onClick={() => { setFocusId(u.id); loadDetail(u.id) }} className="rounded bg-amber-600/80 hover:bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1">OPEN</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? <tr><td colSpan={8} className="py-6 text-center text-xs text-slate-500">No customers match.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Customer drawer */}
      {focusId ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => { setFocusId(''); setDetail(null) }}>
          <div className="h-full w-full max-w-2xl overflow-y-auto scrollbar-thin bg-card border-l border-amber-500/20 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            {!c ? <LoadingPanel text="Loading customer..." /> : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-white">{c.email}</h2>
                    <p className="text-[11px] text-slate-500">{c.name || '—'} · joined {String(c.createdAt).slice(0, 10)} · role {c.role}</p>
                  </div>
                  <button onClick={() => { setFocusId(''); setDetail(null) }} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={c.profile?.status ?? 'trial'}
                    onChange={(e) => act({ type: 'set_status', userId: c.id, value: e.target.value }, 'status', `Status → ${e.target.value}.`, e.target.value === 'suspended' ? `Suspend ${c.email}? They will be unable to sign in or use API keys.` : undefined)}
                    disabled={!!busy}
                    className="rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white capitalize"
                  >
                    {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                  <select
                    value={c.profile?.planKey ?? 'trial'}
                    onChange={(e) => act({ type: 'set_plan', userId: c.id, value: e.target.value }, 'plan', 'Plan updated.')}
                    disabled={!!busy}
                    className="rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white capitalize"
                  >
                    {(data.plans ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.name} (${p.priceMonthly}/mo)</option>)}
                  </select>
                  <button
                    onClick={() => act({ type: 'set_role', userId: c.id, value: c.role === 'admin' ? 'trader' : 'admin' }, 'role', 'Role updated.', `Change ${c.email} to ${c.role === 'admin' ? 'trader' : 'ADMIN'}?`)}
                    disabled={!!busy}
                    className="rounded-md bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 text-xs px-3 py-1.5"
                  >{c.role === 'admin' ? 'Demote to trader' : 'Make admin'}</button>
                  {c.profile?.status === 'suspended' ? <span className="flex items-center gap-1 text-[10px] text-red-300"><Ban className="h-3 w-3" /> sign-in & API blocked</span> : null}
                </div>

                <Panel title="Profile" accent="amber">
                  <div className="grid grid-cols-2 gap-2">
                    {([['company', 'Company'], ['phone', 'Phone'], ['country', 'Country'], ['tags', 'Tags (comma)']] as const).map(([f, label]) => (
                      <label key={f} className="text-[10px] text-slate-500">{label}
                        <input value={profileDraft[f] ?? ''} onChange={(e) => setProfileDraft((d) => ({ ...d, [f]: e.target.value }))} className="mt-0.5 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white" />
                      </label>
                    ))}
                  </div>
                  <button onClick={() => act({ type: 'update_profile', userId: c.id, ...profileDraft }, 'profile', 'Profile saved.')} disabled={!!busy} className="mt-2 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold px-4 py-1.5">SAVE PROFILE</button>
                </Panel>

                <Panel title={`EMIL API Keys (${(c.apiKeys ?? []).length})`} icon={KeyRound} accent="cyan">
                  <div className="flex gap-2 mb-2">
                    <input value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder="Key label, e.g. Production integration" className="flex-1 rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white" />
                    <button onClick={() => { act({ type: 'issue_api_key', userId: c.id, label: keyLabel }, 'key', 'API key issued — copy it now, it is shown only once.'); setKeyLabel('') }} disabled={!!busy} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">ISSUE KEY</button>
                  </div>
                  {issuedKey ? (
                    <div className="mb-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5">
                      <p className="text-[10px] text-emerald-300 font-bold mb-1">NEW KEY — shown once, save it now:</p>
                      <div className="flex items-center gap-2">
                        <code className="num text-[11px] text-white break-all flex-1">{issuedKey}</code>
                        <button onClick={() => { navigator.clipboard?.writeText(issuedKey).then(() => toast.success('Copied.')) }} className="shrink-0 text-emerald-300 hover:text-emerald-200"><Copy className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    {(c.apiKeys ?? []).map((k: any) => (
                      <div key={k.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-200">{k.label} <code className="text-slate-500">{k.prefix}…</code></p>
                          <p className="text-[10px] text-slate-500">{k.status}{k.lastUsedAt ? ` · last used ${String(k.lastUsedAt).slice(0, 16).replace('T', ' ')}` : ' · never used'}</p>
                        </div>
                        {k.status === 'active' ? (
                          <button onClick={() => act({ type: 'revoke_api_key', keyId: k.id }, `rk-${k.id}`, 'Key revoked.', 'Revoke this API key? Integrations using it stop working immediately.')} disabled={!!busy} className="shrink-0 rounded bg-red-600/70 hover:bg-red-600 text-white text-[10px] px-2 py-1">Revoke</button>
                        ) : null}
                      </div>
                    ))}
                    {(c.apiKeys ?? []).length === 0 ? <p className="text-[10px] text-slate-500">No keys yet. Customers use keys against <code className="text-cyan-300">/api/v1</code> (docs on the Overview page).</p> : null}
                  </div>
                </Panel>

                <Panel title={`Broker Connections (${(c.brokerLinks ?? []).length})`} icon={Cable} accent="emerald">
                  <div className="space-y-1.5">
                    {(c.brokerLinks ?? []).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2">
                        <p className="text-[11px] text-slate-200">{b.providerKey} <span className="text-slate-500">{b.hasApiKey ? 'key' : ''}{b.hasAccessToken ? ' token' : ''}</span></p>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${b.status === 'connected' ? STATUS_TONE.active : b.status === 'error' ? STATUS_TONE.suspended : STATUS_TONE.lead}`}>{b.status}</span>
                      </div>
                    ))}
                    {(c.brokerLinks ?? []).length === 0 ? <p className="text-[10px] text-slate-500">No broker accounts linked yet — customers link theirs from Markets &amp; API Hub or POST /api/v1/broker-connections.</p> : null}
                  </div>
                </Panel>

                <Panel title={`Notes (${(c.profile?.notes ?? []).length})`} icon={StickyNote} accent="violet">
                  <div className="flex gap-2 mb-2">
                    <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a CRM note..." className="flex-1 rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white" />
                    <button onClick={() => { act({ type: 'add_note', userId: c.id, note: noteText }, 'note', 'Note added.'); setNoteText('') }} disabled={!!busy || !noteText.trim()} className="rounded-md bg-violet-600/80 hover:bg-violet-600 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">ADD</button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {(c.profile?.notes ?? []).map((n: any) => (
                      <div key={n.id} className="rounded-md border border-border bg-background/40 p-2">
                        <p className="text-[11px] text-slate-300">{n.note}</p>
                        <p className="text-[9px] text-slate-600 mt-0.5">{n.authorEmail} · {String(n.createdAt).slice(0, 16).replace('T', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Recent Activity" accent="cyan">
                  <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                    {(detail?.activity ?? []).map((a: any) => (
                      <p key={a.id} className="text-[10px] text-slate-400">
                        <span className="text-slate-600">{String(a.createdAt).slice(5, 16).replace('T', ' ')}</span>{' '}
                        <span className="text-cyan-300/90">{a.action}</span>
                        <span className="text-slate-500"> — {a.detail.slice(0, 110)}</span>
                      </p>
                    ))}
                    {(detail?.activity ?? []).length === 0 ? <p className="text-[10px] text-slate-500">No activity recorded.</p> : null}
                  </div>
                </Panel>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
