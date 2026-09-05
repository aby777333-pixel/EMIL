'use client'

// Organization console (round C): memberships & roles, invites (SSO domain
// auto-join), client book + tokenised white-label portals, recommendation
// workflow (draft → sent → client/compliance decision → executed), desk
// controls (kill switch, restricted list, position limits), maker-checker
// approvals, signal channels with calculated track records, and the
// hash-chained compliance archive.

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Building2, Users, Briefcase, FileSignature, ShieldAlert, CheckSquare, Radio, Archive, Settings2, Copy, Trash2, Plus, Power, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'overview', label: 'Overview', icon: Building2 }, { key: 'members', label: 'Members', icon: Users }, { key: 'clients', label: 'Clients', icon: Briefcase },
  { key: 'recommendations', label: 'Recommendations', icon: FileSignature }, { key: 'desk', label: 'Desk controls', icon: ShieldAlert }, { key: 'approvals', label: 'Approvals', icon: CheckSquare },
  { key: 'channels', label: 'Signal channels', icon: Radio }, { key: 'archive', label: 'Compliance archive', icon: Archive }, { key: 'settings', label: 'Settings & branding', icon: Settings2 },
]
const ts = (s?: string | null) => (s ? String(s).slice(0, 16).replace('T', ' ') : '—')
const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast.success('Copied') } catch { toast.error('Clipboard blocked') } }
const inp = 'rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white'
const btn = (tone = 'cyan') => `rounded-md bg-${tone}-600 hover:bg-${tone}-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5`
const STATUS_TONE: Record<string, string> = { draft: 'text-slate-400 border-slate-600/50', sent: 'text-cyan-300 border-cyan-500/40', approved: 'text-emerald-300 border-emerald-500/40', executed: 'text-emerald-300 border-emerald-500/40', declined: 'text-red-300 border-red-500/40', rejected: 'text-red-300 border-red-500/40', expired: 'text-slate-500 border-slate-600/50', pending: 'text-amber-300 border-amber-500/40', failed: 'text-red-300 border-red-500/40', active: 'text-emerald-300 border-emerald-500/40', invited: 'text-amber-300 border-amber-500/40', suspended: 'text-red-300 border-red-500/40' }
const Badge = ({ s }: { s: string }) => <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_TONE[s] ?? 'text-slate-400 border-slate-600/50'}`}>{s}</span>

export default function OrgClient() {
  const params = useSearchParams()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [orgId, setOrgId] = useState(params.get('org') ?? '')
  const [tab, setTab] = useState(params.get('tab') ?? 'overview')
  const [busy, setBusy] = useState('')
  const [f, setF] = useState<Record<string, any>>({})
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }))

  const load = useCallback(async (id?: string) => {
    try {
      const res = await fetch(`/api/org${id ? `?org=${encodeURIComponent(id)}` : ''}`, { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error ?? 'failed')
      setData(j)
      if (!id && j.memberships?.length && !orgId) setOrgId(j.memberships[0].orgId)
    } catch (e: any) { setError(e?.message ?? 'Failed to load organization.') }
  }, [orgId])
  useEffect(() => { load(orgId || undefined) }, [orgId, load])

  const post = async (body: any, key: string, ok?: string) => {
    setBusy(key)
    try {
      const res = await fetch('/api/org', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId, ...body }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j?.error ?? 'Request failed'); return null }
      if (ok) toast.success(ok)
      await load(orgId || undefined)
      return j
    } finally { setBusy('') }
  }

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading organization..." /></div>
  const org = data.org
  const me = data.me

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Building2 className="h-5 w-5 text-cyan-400" /> Organization</h1>
          <p className="text-xs text-slate-500 mt-1">Institutions, advisories and trading firms run EMIL as a team: roles, client books, recommendation workflow, desk controls, approvals and a tamper-evident archive.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {data.memberships.length > 0 ? (
            <select value={orgId} onChange={(e) => { setOrgId(e.target.value); setTab('overview') }} className={inp}>
              {data.memberships.map((m: any) => <option key={m.orgId} value={m.orgId}>{m.org.name} · {m.role}</option>)}
            </select>
          ) : null}
        </div>
      </div>

      {data.invites.length > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          {data.invites.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between gap-2 flex-wrap text-xs text-amber-100">
              <span>Invitation to <strong>{i.org.name}</strong> as {i.role}{i.invitedBy ? ` from ${i.invitedBy}` : ''}</span>
              <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'accept_invite_id', id: i.id }, 'acc', 'Joined.'); if (r?.org?.id) setOrgId(r.org.id) }} className={btn('amber')}>Accept</button>
            </div>
          ))}
        </div>
      ) : null}

      {!org ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="Create an organization" icon={Plus} accent="cyan">
            {!data.account.organizationsAllowed ? <p className="text-xs text-amber-300 mb-2">Organizations are available on Pro and Institutional plans (you are on {data.account.plan}). Members can still accept invitations from an organization on any plan.</p> : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={f.orgName ?? ''} onChange={(e) => set('orgName', e.target.value)} placeholder="Organization name" className={inp} />
              <select value={f.orgKind ?? 'trading_firm'} onChange={(e) => set('orgKind', e.target.value)} className={inp}>{Object.entries(data.kinds).map(([k, v]: any) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <button disabled={!!busy || !data.account.organizationsAllowed} onClick={async () => { const r = await post({ type: 'create_org', name: f.orgName, kind: f.orgKind ?? 'trading_firm' }, 'create', 'Organization created.'); if (r?.orgId) setOrgId(r.orgId) }} className={`mt-2 ${btn()}`}>CREATE</button>
          </Panel>
          <Discover data={data} post={post} busy={busy} />
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold border ${tab === t.key ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-secondary/40 text-slate-400 border-border hover:text-slate-200'}`}><t.icon className="h-3.5 w-3.5" /> {t.label}{t.key === 'approvals' && org.approvals.filter((a: any) => a.status === 'pending').length ? <span className="ml-1 rounded-full bg-amber-500/20 text-amber-300 px-1.5">{org.approvals.filter((a: any) => a.status === 'pending').length}</span> : null}</button>)}
          </div>

          {org.settings.killSwitch ? <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2"><Power className="h-4 w-4" /> KILL SWITCH ON — every paper order from members of {org.name} is blocked until an admin or compliance officer lifts it.</div> : null}

          {tab === 'overview' ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <Stat label="Members" value={org.members.filter((m: any) => m.status === 'active').length} sub={`${org.members.filter((m: any) => m.status === 'invited').length} invited`} valueClass="text-cyan-300" />
                <Stat label="Clients" value={org.clients.filter((c: any) => c.status === 'active').length} />
                <Stat label="Recommendations" value={org.recommendations.length} sub={`${org.recommendations.filter((r: any) => r.status === 'sent').length} awaiting decision`} />
                <Stat label="Pending approvals" value={org.approvals.filter((a: any) => a.status === 'pending').length} valueClass={org.approvals.some((a: any) => a.status === 'pending') ? 'text-amber-300' : 'text-white'} />
                <Stat label="Restricted / limits" value={`${org.restricted.length} / ${org.limits.length}`} />
                <Stat label="Archive" value={org.archive.ok ? 'INTACT' : 'BROKEN'} valueClass={org.archive.ok ? 'text-emerald-300' : 'text-red-300'} sub={`${org.archive.records} chained records`} />
              </div>
              <Panel title="Your role" icon={Users} accent="cyan">
                <p className="text-xs text-slate-300"><span className="font-semibold text-white capitalize">{me.role}</span>{me.desk ? ` · desk ${me.desk}` : ''} — {data.roles[me.role]}</p>
                <p className="text-[10px] text-slate-500 mt-1">Approvals: {me.canApprove ? 'yes' : 'no'} · Recommend & post signals: {me.canRecommend ? 'yes' : 'no'} · Trade (paper): {me.canTrade ? 'yes' : 'no'} · Manage: {me.canManage ? 'yes' : 'no'}</p>
              </Panel>
              <Discover data={data} post={post} busy={busy} />
            </>
          ) : null}

          {tab === 'members' ? (
            <Panel title={`Members (${org.members.length})`} icon={Users} accent="cyan">
              {me.canManage ? (
                <div className="rounded-md border border-border bg-background/40 p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input value={f.invEmail ?? ''} onChange={(e) => set('invEmail', e.target.value)} placeholder="colleague@firm.com" className={inp} />
                  <select value={f.invRole ?? 'trader'} onChange={(e) => set('invRole', e.target.value)} className={inp}>{Object.keys(data.roles).filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{r}</option>)}</select>
                  <input value={f.invDesk ?? ''} onChange={(e) => set('invDesk', e.target.value)} placeholder="Desk (optional)" className={inp} />
                  <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'invite', email: f.invEmail, role: f.invRole ?? 'trader', desk: f.invDesk }, 'inv'); if (r?.joinLink) { set('lastJoin', r.joinLink); toast.success(r.emailSent ? 'Invitation e-mailed.' : `Invitation created — ${r.emailNote ?? 'share the link'}`) } }} className={btn()}>INVITE</button>
                  {f.lastJoin ? <p className="sm:col-span-4 text-[10px] text-slate-400">Join link: <span className="font-mono text-white break-all">{f.lastJoin}</span> <button onClick={() => copy(f.lastJoin)} className="text-cyan-400 hover:underline">copy</button></p> : null}
                </div>
              ) : null}
              <div className="mt-3 overflow-x-auto scrollbar-thin"><table className="w-full text-left text-[11px]"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">Member</th><th className="py-1.5 pr-3">Role</th><th className="py-1.5 pr-3">Desk</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Joined</th><th className="py-1.5" /></tr></thead>
                <tbody>{org.members.map((m: any) => (
                  <tr key={m.id} className="border-b border-border/40">
                    <td className="py-1.5 pr-3 text-slate-200">{m.email}{m.invitedBy ? <span className="text-slate-600"> · by {m.invitedBy}</span> : null}</td>
                    <td className="py-1.5 pr-3">{me.canManage && m.role !== 'owner' ? <select value={m.role} disabled={!!busy} onChange={(e) => post({ type: 'set_member', memberId: m.id, role: e.target.value }, `r-${m.id}`, 'Role updated.')} className="rounded bg-background border border-border px-1.5 py-0.5 text-[11px] text-white">{Object.keys(data.roles).filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{r}</option>)}</select> : <span className="capitalize">{m.role}</span>}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{me.canManage && m.role !== 'owner' ? <input defaultValue={m.desk ?? ''} onBlur={(e) => { if (e.target.value !== (m.desk ?? '')) post({ type: 'set_member', memberId: m.id, desk: e.target.value }, `d-${m.id}`, 'Desk updated.') }} className="w-24 rounded bg-background border border-border px-1.5 py-0.5 text-[11px] text-white" /> : (m.desk ?? '—')}</td>
                    <td className="py-1.5 pr-3"><Badge s={m.status} /></td>
                    <td className="py-1.5 pr-3 num text-slate-500">{ts(m.joinedAt)}</td>
                    <td className="py-1.5 text-right">{me.canManage && m.role !== 'owner' ? <><button disabled={!!busy} onClick={() => post({ type: 'set_member', memberId: m.id, status: m.status === 'suspended' ? 'active' : 'suspended' }, `s-${m.id}`)} className="text-[10px] text-slate-400 hover:text-white mr-2">{m.status === 'suspended' ? 'reinstate' : 'suspend'}</button><button disabled={!!busy} onClick={() => { if (window.confirm(`Remove ${m.email}?`)) post({ type: 'remove_member', memberId: m.id }, `rm-${m.id}`, 'Removed.') }} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5 inline" /></button></> : null}</td>
                  </tr>
                ))}</tbody></table></div>
              <p className="text-[10px] text-slate-500 mt-2">Roles: {Object.entries(data.roles).map(([k, v]: any) => <span key={k} className="mr-2"><span className="text-slate-300 capitalize">{k}</span> — {v.split('—')[1]}</span>)}</p>
            </Panel>
          ) : null}

          {tab === 'clients' ? (
            <Panel title={`Client book (${org.clients.length})`} icon={Briefcase} accent="emerald">
              {me.canRecommend ? (
                <div className="rounded-md border border-border bg-background/40 p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input value={f.cName ?? ''} onChange={(e) => set('cName', e.target.value)} placeholder="Client name" className={inp} />
                  <input value={f.cEmail ?? ''} onChange={(e) => set('cEmail', e.target.value)} placeholder="E-mail (optional)" className={inp} />
                  <input value={f.cRef ?? ''} onChange={(e) => set('cRef', e.target.value)} placeholder="Reference / account no." className={inp} />
                  <button disabled={!!busy} onClick={async () => { if (await post({ type: 'add_client', name: f.cName, email: f.cEmail, externalRef: f.cRef, riskProfile: { maxRiskPct: Number(f.cRisk) || null } }, 'ac', 'Client added.')) setF((x) => ({ ...x, cName: '', cEmail: '', cRef: '' })) }} className={btn('emerald')}>ADD CLIENT</button>
                </div>
              ) : null}
              <div className="mt-3 space-y-2">
                {org.clients.map((c: any) => (
                  <div key={c.id} className="rounded-md border border-border bg-background/40 p-3 flex items-center justify-between gap-2 flex-wrap">
                    <div><p className="text-xs text-white font-semibold">{c.name} <Badge s={c.status} /></p><p className="text-[10px] text-slate-500">{c.email ?? '—'}{c.externalRef ? ` · ${c.externalRef}` : ''} · {org.recommendations.filter((r: any) => r.clientId === c.id).length} recommendations · portal {c.hasPortal ? 'issued' : 'not issued'}</p></div>
                    {me.canRecommend ? <div className="flex gap-1.5"><button disabled={!!busy} onClick={async () => { const r = await post({ type: 'client_portal_link', clientId: c.id }, `pl-${c.id}`); if (r?.link) { copy(r.link); toast.success('Portal link copied — previous link is now invalid.') } }} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white"><Link2 className="h-3 w-3" /> {c.hasPortal ? 'New portal link' : 'Issue portal link'}</button><button disabled={!!busy} onClick={() => post({ type: 'update_client', clientId: c.id, status: c.status === 'active' ? 'archived' : 'active' }, `ar-${c.id}`)} className="rounded border border-border px-2 py-1 text-[10px] text-slate-400">{c.status === 'active' ? 'archive' : 'reactivate'}</button></div> : null}
                  </div>
                ))}
                {org.clients.length === 0 ? <p className="text-xs text-slate-500">No clients yet.</p> : null}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">A portal link opens a white-label page (your branding) where the client reads recommendations, approves or declines them, and prints a PDF. Issuing a new link invalidates the old one.</p>
            </Panel>
          ) : null}

          {tab === 'recommendations' ? (
            <Panel title={`Recommendations (${org.recommendations.length})`} icon={FileSignature} accent="cyan">
              {me.canRecommend ? (
                <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <input value={f.rSym ?? ''} onChange={(e) => set('rSym', e.target.value)} placeholder="Symbol" className={inp} />
                    <select value={f.rDir ?? 'buy'} onChange={(e) => set('rDir', e.target.value)} className={inp}><option value="buy">buy</option><option value="sell">sell</option><option value="hold">hold</option><option value="reduce">reduce</option></select>
                    <select value={f.rClient ?? ''} onChange={(e) => set('rClient', e.target.value)} className={inp}><option value="">No client (house view)</option>{org.clients.filter((c: any) => c.status === 'active').map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    <input value={f.rEntry ?? ''} onChange={(e) => set('rEntry', e.target.value)} placeholder="Entry" className={inp} />
                    <input value={f.rStop ?? ''} onChange={(e) => set('rStop', e.target.value)} placeholder="Stop" className={inp} />
                    <input value={f.rTarget ?? ''} onChange={(e) => set('rTarget', e.target.value)} placeholder="Target" className={inp} />
                  </div>
                  <textarea value={f.rThesis ?? ''} onChange={(e) => set('rThesis', e.target.value)} placeholder="Thesis — what, why, what invalidates it" rows={2} className={`${inp} w-full`} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input value={f.rHorizon ?? ''} onChange={(e) => set('rHorizon', e.target.value)} placeholder="Horizon, e.g. 2–4 weeks" className={inp} />
                    <input value={f.rRisk ?? ''} onChange={(e) => set('rRisk', e.target.value)} placeholder="Risk note" className={inp} />
                    <input value={f.rSuit ?? ''} onChange={(e) => set('rSuit', e.target.value)} placeholder="Suitability note" className={inp} />
                  </div>
                  <button disabled={!!busy} onClick={async () => { if (await post({ type: 'create_reco', symbol: f.rSym, direction: f.rDir ?? 'buy', clientId: f.rClient || null, entry: f.rEntry, stop: f.rStop, target: f.rTarget, thesis: f.rThesis, horizon: f.rHorizon, riskNote: f.rRisk, suitability: f.rSuit }, 'cr', 'Draft saved.')) setF((x) => ({ ...x, rSym: '', rThesis: '', rEntry: '', rStop: '', rTarget: '' })) }} className={btn()}>SAVE DRAFT</button>
                </div>
              ) : null}
              <div className="mt-3 space-y-2">
                {org.recommendations.map((r: any) => (
                  <div key={r.id} className="rounded-md border border-border bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-xs text-white font-semibold">{r.direction.toUpperCase()} {r.symbol} <Badge s={r.status} /> <span className="text-[10px] text-slate-500 font-normal">{r.clientName ? `for ${r.clientName}` : 'house view'} · by {r.authorEmail} · {ts(r.createdAt)}</span></p>
                      <div className="flex gap-1.5 flex-wrap">
                        {r.status === 'draft' ? <button disabled={!!busy} onClick={() => post({ type: 'reco_status', recoId: r.id, status: 'sent' }, `s-${r.id}`, 'Sent.')} className={btn()}>SEND</button> : null}
                        {r.status === 'sent' && me.canApprove ? <><button disabled={!!busy} onClick={() => post({ type: 'reco_status', recoId: r.id, status: 'approved', note: window.prompt('Decision note (optional):') ?? '' }, `a-${r.id}`, 'Approved.')} className={btn('emerald')}>RECORD APPROVAL</button><button disabled={!!busy} onClick={() => post({ type: 'reco_status', recoId: r.id, status: 'declined', note: window.prompt('Reason (optional):') ?? '' }, `d-${r.id}`, 'Declined.')} className="rounded-md border border-red-500/40 px-3 py-1.5 text-[11px] text-red-300">DECLINE</button></> : null}
                        {r.status === 'approved' && me.canTrade ? <button disabled={!!busy} onClick={() => post({ type: 'reco_status', recoId: r.id, status: 'executed', note: window.prompt('Execution note (venue, fills):') ?? '' }, `e-${r.id}`, 'Marked executed.')} className={btn('emerald')}>MARK EXECUTED</button> : null}
                        {(r.status === 'sent' || r.status === 'draft') && me.canManage ? <button disabled={!!busy} onClick={() => post({ type: 'reco_status', recoId: r.id, status: 'expired' }, `x-${r.id}`)} className="text-[10px] text-slate-500 hover:text-white">expire</button> : null}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 whitespace-pre-wrap">{r.thesis}</p>
                    <p className="text-[10px] text-slate-500 mt-1">entry {r.entry ?? '—'} · stop {r.stop ?? '—'} · target {r.target ?? '—'} · {r.horizon ?? '—'}{r.decidedBy ? ` · decided: ${r.decidedBy} (${ts(r.decidedAt)})` : ''}{r.executionNote ? ` · executed: ${r.executionNote}` : ''}</p>
                  </div>
                ))}
                {org.recommendations.length === 0 ? <p className="text-xs text-slate-500">No recommendations yet.</p> : null}
              </div>
            </Panel>
          ) : null}

          {tab === 'desk' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Panel title="Kill switch" icon={Power} accent="red">
                <p className="text-xs text-slate-300">Blocks every paper order from every member instantly. Lifting it is recorded in the archive and every member is notified.</p>
                {me.canApprove ? <button disabled={!!busy} onClick={() => { if (window.confirm(org.settings.killSwitch ? 'Lift the kill switch?' : 'Engage the kill switch for the whole organization?')) post({ type: 'kill_switch', on: !org.settings.killSwitch }, 'ks', org.settings.killSwitch ? 'Kill switch lifted.' : 'Kill switch engaged.') }} className={`mt-2 ${org.settings.killSwitch ? btn('emerald') : btn('red')}`}>{org.settings.killSwitch ? 'LIFT KILL SWITCH' : 'ENGAGE KILL SWITCH'}</button> : <p className="text-[10px] text-slate-500 mt-1">Admin or compliance role required.</p>}
                <label className="mt-3 flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={!!org.settings.requireApprovals} disabled={!me.canManage || !!busy} onChange={(e) => post({ type: 'update_org', settings: { requireApprovals: e.target.checked } }, 'ra', 'Updated.')} className="accent-amber-500" /> Maker-checker: traders&apos; paper orders need approval from admin or compliance</label>
              </Panel>
              <Panel title={`Restricted list (${org.restricted.length})`} icon={ShieldAlert} accent="amber">
                {me.canApprove ? <div className="flex gap-2 flex-wrap"><input value={f.rsSym ?? ''} onChange={(e) => set('rsSym', e.target.value)} placeholder="Symbol" className={inp} /><input value={f.rsReason ?? ''} onChange={(e) => set('rsReason', e.target.value)} placeholder="Reason" className={`${inp} flex-1`} /><button disabled={!!busy} onClick={async () => { if (await post({ type: 'add_restricted', symbol: f.rsSym, reason: f.rsReason }, 'rs', 'Restricted.')) setF((x) => ({ ...x, rsSym: '', rsReason: '' })) }} className={btn('amber')}>RESTRICT</button></div> : null}
                <div className="mt-2 space-y-1">{org.restricted.map((r: any) => <div key={r.id} className="flex items-center justify-between text-[11px]"><span className="text-white font-mono">{r.symbol} <span className="text-slate-500 font-sans">{r.reason ?? ''} · {r.createdBy}</span></span>{me.canApprove ? <button disabled={!!busy} onClick={() => post({ type: 'remove_restricted', id: r.id }, `rr-${r.id}`)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button> : null}</div>)}{org.restricted.length === 0 ? <p className="text-xs text-slate-500">Nothing restricted.</p> : null}</div>
              </Panel>
              <Panel title={`Position limits (${org.limits.length})`} icon={ShieldAlert} accent="cyan" className="xl:col-span-2">
                {me.canApprove ? <div className="grid grid-cols-2 sm:grid-cols-6 gap-2"><select value={f.lScope ?? 'org'} onChange={(e) => set('lScope', e.target.value)} className={inp}><option value="org">whole org</option><option value="desk">desk</option><option value="member">member</option></select><input value={f.lRef ?? ''} onChange={(e) => set('lRef', e.target.value)} placeholder="Desk name / member e-mail" className={inp} /><input value={f.lSym ?? ''} onChange={(e) => set('lSym', e.target.value)} placeholder="Symbol (blank = any)" className={inp} /><input value={f.lNot ?? ''} onChange={(e) => set('lNot', e.target.value)} placeholder="Max notional USD" className={inp} /><input value={f.lQty ?? ''} onChange={(e) => set('lQty', e.target.value)} placeholder="Max qty" className={inp} /><button disabled={!!busy} onClick={async () => { if (await post({ type: 'add_limit', scope: f.lScope ?? 'org', scopeRef: f.lRef, symbol: f.lSym, maxNotionalUsd: f.lNot, maxQty: f.lQty }, 'al', 'Limit added.')) setF((x) => ({ ...x, lRef: '', lSym: '', lNot: '', lQty: '' })) }} className={btn()}>ADD LIMIT</button></div> : null}
                <div className="mt-2 space-y-1">{org.limits.map((l: any) => <div key={l.id} className="flex items-center justify-between text-[11px]"><span className="text-slate-200">{l.scope}{l.scopeRef ? ` ${l.scopeRef}` : ''} · {l.symbol ?? 'any symbol'} · {l.maxNotionalUsd ? `≤ $${l.maxNotionalUsd.toLocaleString()}` : ''} {l.maxQty ? `≤ qty ${l.maxQty}` : ''} <span className="text-slate-500">· {l.createdBy}</span></span>{me.canApprove ? <button disabled={!!busy} onClick={() => post({ type: 'remove_limit', id: l.id }, `rl-${l.id}`)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button> : null}</div>)}{org.limits.length === 0 ? <p className="text-xs text-slate-500">No limits — venue caps still apply.</p> : null}</div>
                <p className="text-[10px] text-slate-500 mt-2">Limits are enforced on every paper order from the desk and the API, in addition to EMIL&apos;s own execution guards. Live execution is never exposed.</p>
              </Panel>
            </div>
          ) : null}

          {tab === 'approvals' ? (
            <Panel title={`Approval requests (${org.approvals.length})`} icon={CheckSquare} accent="amber">
              <div className="space-y-2">
                {org.approvals.map((a: any) => (
                  <div key={a.id} className="rounded-md border border-border bg-background/40 p-3 flex items-center justify-between gap-2 flex-wrap">
                    <div><p className="text-xs text-white font-semibold">{a.kind.replace('_', ' ')} <Badge s={a.status} /> <span className="text-[10px] text-slate-500 font-normal">by {a.requesterEmail} · {ts(a.createdAt)}</span></p><p className="text-[10px] text-slate-400 font-mono">{a.kind === 'paper_order' ? `${a.payload.side} ${a.payload.qty} ${a.payload.symbol} ${a.payload.type}${a.payload.price ? ` @ ${a.payload.price}` : ''} on ${a.payload.venue}` : JSON.stringify(a.payload)}</p>{a.result ? <p className="text-[10px] text-slate-500 mt-0.5">{a.approverEmail}: {a.result}{a.note ? ` — ${a.note}` : ''}</p> : null}</div>
                    {a.status === 'pending' && me.canApprove ? <div className="flex gap-1.5"><button disabled={!!busy} onClick={() => post({ type: 'decide_approval', requestId: a.id, approve: true, note: window.prompt('Note (optional):') ?? '' }, `ap-${a.id}`)} className={btn('emerald')}>APPROVE &amp; EXECUTE</button><button disabled={!!busy} onClick={() => post({ type: 'decide_approval', requestId: a.id, approve: false, note: window.prompt('Reason:') ?? '' }, `rj-${a.id}`)} className="rounded-md border border-red-500/40 px-3 py-1.5 text-[11px] text-red-300">REJECT</button></div> : null}
                  </div>
                ))}
                {org.approvals.length === 0 ? <p className="text-xs text-slate-500">No requests. With maker-checker on, traders&apos; paper orders land here.</p> : null}
              </div>
            </Panel>
          ) : null}

          {tab === 'channels' ? (
            <div className="space-y-4">
              {me.canRecommend ? (
                <Panel title="Create a signal channel" icon={Radio} accent="violet">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2"><input value={f.chName ?? ''} onChange={(e) => set('chName', e.target.value)} placeholder="Channel name" className={inp} /><input value={f.chDesc ?? ''} onChange={(e) => set('chDesc', e.target.value)} placeholder="Description" className={inp} /><select value={f.chVis ?? 'org'} onChange={(e) => set('chVis', e.target.value)} className={inp}><option value="org">org members only</option><option value="subscribers">invited subscribers</option><option value="public">public (discoverable)</option></select><button disabled={!!busy} onClick={async () => { if (await post({ type: 'create_channel', name: f.chName, description: f.chDesc, visibility: f.chVis ?? 'org' }, 'cc', 'Channel created.')) setF((x) => ({ ...x, chName: '', chDesc: '' })) }} className={btn('violet')}>CREATE</button></div>
                </Panel>
              ) : null}
              {org.channels.map((c: any) => (
                <Panel key={c.id} title={`${c.name} · ${c.visibility} · ${c.subscribers} subscribers`} icon={Radio} accent="violet" collapsible chevron="right" headerExtra={<span className="text-[10px] text-slate-400 normal-case tracking-normal">track record: {c.track.closed} closed · win {c.track.winRate === null ? '—' : `${Math.round(c.track.winRate * 100)}%`} · avg {c.track.avgPct === null ? '—' : `${c.track.avgPct.toFixed(2)}%`} · cum {c.track.cumPct.toFixed(2)}%</span>}>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <button disabled={!!busy} onClick={() => post({ type: c.subscribed ? 'unsubscribe' : 'subscribe', channelId: c.id }, `sub-${c.id}`)} className="rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white">{c.subscribed ? 'Unsubscribe' : 'Subscribe (bell, Telegram, e-mail, webhooks)'}</button>
                    {c.description ? <span className="text-[10px] text-slate-500">{c.description}</span> : null}
                  </div>
                  {me.canRecommend ? <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 mb-2"><input value={f[`p-${c.id}-sym`] ?? ''} onChange={(e) => set(`p-${c.id}-sym`, e.target.value)} placeholder="Symbol" className={inp} /><select value={f[`p-${c.id}-dir`] ?? 'long'} onChange={(e) => set(`p-${c.id}-dir`, e.target.value)} className={inp}><option value="long">long</option><option value="short">short</option></select><input value={f[`p-${c.id}-e`] ?? ''} onChange={(e) => set(`p-${c.id}-e`, e.target.value)} placeholder="Entry" className={inp} /><input value={f[`p-${c.id}-s`] ?? ''} onChange={(e) => set(`p-${c.id}-s`, e.target.value)} placeholder="Stop" className={inp} /><input value={f[`p-${c.id}-t`] ?? ''} onChange={(e) => set(`p-${c.id}-t`, e.target.value)} placeholder="Target" className={inp} /><input value={f[`p-${c.id}-r`] ?? ''} onChange={(e) => set(`p-${c.id}-r`, e.target.value)} placeholder="Rationale" className={inp} /><button disabled={!!busy} onClick={() => post({ type: 'post_signal', channelId: c.id, symbol: f[`p-${c.id}-sym`], direction: f[`p-${c.id}-dir`] ?? 'long', entry: f[`p-${c.id}-e`], stop: f[`p-${c.id}-s`], target: f[`p-${c.id}-t`], rationale: f[`p-${c.id}-r`] }, `ps-${c.id}`, 'Published to subscribers.')} className={btn('violet')}>PUBLISH</button></div> : null}
                  <div className="space-y-1">{c.posts.map((p: any) => <div key={p.id} className="flex items-center justify-between gap-2 text-[11px] flex-wrap"><span><span className={`font-bold ${p.direction === 'long' ? 'text-emerald-300' : 'text-red-300'}`}>{p.direction.toUpperCase()}</span> <span className="text-white">{p.symbol}</span> <span className="text-slate-500">entry {p.entry ?? '—'} · stop {p.stop ?? '—'} · target {p.target ?? '—'} · {p.authorEmail} · {ts(p.postedAt)}</span> <Badge s={p.status} />{p.outcomePct !== null && p.outcomePct !== undefined ? <span className={`ml-1 num ${p.outcomePct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{p.outcomePct > 0 ? '+' : ''}{p.outcomePct}%</span> : null}</span>{p.status === 'open' && me.canRecommend ? <span className="flex gap-1"><button disabled={!!busy} onClick={() => { const v = window.prompt('Outcome in % (e.g. 2.5 or -1.2):'); if (v !== null) post({ type: 'close_signal', postId: p.id, outcomePct: Number(v) }, `cl-${p.id}`, 'Closed.') }} className="text-[10px] text-cyan-400 hover:underline">close</button><button disabled={!!busy} onClick={() => post({ type: 'close_signal', postId: p.id, cancel: true }, `cn-${p.id}`)} className="text-[10px] text-slate-500 hover:underline">cancel</button></span> : null}</div>)}{c.posts.length === 0 ? <p className="text-xs text-slate-500">No posts yet.</p> : null}</div>
                  <p className="text-[10px] text-slate-500 mt-2">Track record is CALCULATED from closed posts and the outcome the author entered — research signals, not advice, never an execution trigger.</p>
                </Panel>
              ))}
              {org.channels.length === 0 ? <p className="text-xs text-slate-500">No channels yet.</p> : null}
            </div>
          ) : null}

          {tab === 'archive' ? (
            <Panel title={`Compliance archive — ${org.archive.records} records, chain ${org.archive.ok ? 'INTACT' : `BROKEN at #${org.archive.brokenAt}`}`} icon={Archive} accent={org.archive.ok ? 'emerald' : 'red'} headerExtra={<button onClick={async () => { const r = await post({ type: 'verify_archive' }, 'va'); if (r) toast[r.ok ? 'success' : 'error'](r.ok ? `Verified ${r.records} records — chain intact` : `Chain broken at #${r.brokenAt}`) }} className="text-[10px] text-cyan-400 hover:underline normal-case tracking-normal">re-verify</button>}>
              <p className="text-[10px] text-slate-500 mb-2">Append-only. Each record hashes its content plus the previous record&apos;s hash, so any edit or deletion breaks the chain. Head: <span className="font-mono text-slate-300">{org.archive.head?.slice(0, 24) ?? '—'}</span></p>
              <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-left text-[10px]"><thead><tr className="text-slate-500 border-b border-border uppercase tracking-wider"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">When</th><th className="py-1 pr-2">Event</th><th className="py-1 pr-2">Actor</th><th className="py-1 pr-2">Detail</th><th className="py-1">Hash</th></tr></thead>
                <tbody>{org.archive.recent.map((r: any) => <tr key={r.seq} className="border-b border-border/40"><td className="py-1 pr-2 num text-slate-500">{r.seq}</td><td className="py-1 pr-2 num text-slate-500">{ts(r.createdAt)}</td><td className="py-1 pr-2 font-mono text-cyan-300">{r.kind}</td><td className="py-1 pr-2 text-slate-300">{r.actor}</td><td className="py-1 pr-2 text-slate-400 truncate max-w-[24rem]">{JSON.stringify(r.payload)}</td><td className="py-1 font-mono text-slate-600">{r.hash}…</td></tr>)}</tbody></table></div>
            </Panel>
          ) : null}

          {tab === 'settings' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Panel title="Organization" icon={Settings2} accent="cyan">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 block">Name<input defaultValue={org.name} disabled={!me.canManage} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== org.name) post({ type: 'update_org', name: e.target.value }, 'nm', 'Renamed.') }} className={`${inp} w-full mt-0.5`} /></label>
                  <label className="text-[10px] text-slate-500 block">Kind<select defaultValue={org.kind} disabled={!me.canManage} onChange={(e) => post({ type: 'update_org', kind: e.target.value }, 'kd', 'Updated.')} className={`${inp} w-full mt-0.5`}>{Object.entries(data.kinds).map(([k, v]: any) => <option key={k} value={k}>{v}</option>)}</select></label>
                  <label className="text-[10px] text-slate-500 block">SSO e-mail domain (auto-join as viewer on first sign-in)<input defaultValue={org.ssoDomain ?? ''} disabled={!me.canManage} placeholder="yourfirm.com" onBlur={(e) => { if ((e.target.value || '') !== (org.ssoDomain || '')) post({ type: 'update_org', ssoDomain: e.target.value }, 'sso', 'SSO domain saved.') }} className={`${inp} w-full mt-0.5`} /></label>
                  <label className="text-[10px] text-slate-500 block">Client-facing disclaimer<textarea defaultValue={org.settings.disclaimer ?? ''} disabled={!me.canManage} rows={3} onBlur={(e) => { if ((e.target.value || '') !== (org.settings.disclaimer || '')) post({ type: 'update_org', settings: { disclaimer: e.target.value } }, 'dc', 'Disclaimer saved.') }} className={`${inp} w-full mt-0.5`} /></label>
                  <p className="text-[10px] text-slate-500">Enterprise sign-in: Google Workspace and Microsoft Entra buttons appear on the login page when the owner configures them (GOOGLE_CLIENT_ID / AZURE_AD_CLIENT_ID). SAML is not available yet — do not promise it to clients.</p>
                  {me.role === 'owner' ? <button disabled={!!busy} onClick={() => { if (window.confirm(`Delete ${org.name}? Members, clients, recommendations and the archive are removed. This cannot be undone.`)) post({ type: 'delete_org' }, 'del', 'Deleted.').then(() => setOrgId('')) }} className="rounded-md border border-red-500/40 px-3 py-1.5 text-[11px] text-red-300">Delete organization</button> : null}
                </div>
              </Panel>
              <Panel title="White-label branding (client portal & reports)" icon={Settings2} accent="amber">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[['logoUrl', 'Logo URL'], ['primary', 'Primary colour (#hex)'], ['accent', 'Accent colour (#hex)'], ['reportTitle', 'Report title'], ['domain', 'Client domain (informational)'], ['footer', 'Footer line']].map(([k, label]) => (
                    <label key={k} className="text-[10px] text-slate-500 block">{label}<input defaultValue={org.branding[k] ?? ''} disabled={!me.canManage} onBlur={(e) => { if ((e.target.value || '') !== (org.branding[k] || '')) post({ type: 'update_org', branding: { [k]: e.target.value } }, `b-${k}`, 'Branding saved.') }} className={`${inp} w-full mt-0.5`} /></label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Applied to every client portal link and its printable PDF. A custom domain for the portal is a hosting change — request it under enterprise options.</p>
              </Panel>
              <Panel title="Enterprise options" icon={Building2} accent="violet" className="xl:col-span-2">
                <p className="text-xs text-slate-300">Data residency, private deployment and SLA tiers are commercial arrangements. Submit what you need; EMIL follows up with the owner. Nothing changes automatically.</p>
                {org.settings.enterpriseRequest ? <p className="text-[10px] text-amber-300 mt-1">Requested by {org.settings.enterpriseRequest.requestedBy} on {ts(org.settings.enterpriseRequest.at)}: residency {org.settings.enterpriseRequest.residency || '—'}, SLA {org.settings.enterpriseRequest.sla || '—'}, private deployment {org.settings.enterpriseRequest.privateDeploy ? 'yes' : 'no'}.</p> : null}
                {me.canManage ? <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-2"><select value={f.enRes ?? ''} onChange={(e) => set('enRes', e.target.value)} className={inp}><option value="">Data residency…</option><option value="india">India</option><option value="eu">European Union</option><option value="uk">United Kingdom</option><option value="us">United States</option><option value="singapore">Singapore</option><option value="uae">UAE</option></select><select value={f.enSla ?? ''} onChange={(e) => set('enSla', e.target.value)} className={inp}><option value="">SLA tier…</option><option value="standard">Standard</option><option value="business">Business (99.9%)</option><option value="enterprise">Enterprise (99.95% + support)</option></select><label className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={!!f.enPriv} onChange={(e) => set('enPriv', e.target.checked)} className="accent-violet-500" /> Private deployment</label><button disabled={!!busy} onClick={() => post({ type: 'request_enterprise', residency: f.enRes, sla: f.enSla, privateDeploy: !!f.enPriv, notes: f.enNotes }, 'en', 'Request recorded.')} className={btn('violet')}>SUBMIT REQUEST</button><textarea value={f.enNotes ?? ''} onChange={(e) => set('enNotes', e.target.value)} placeholder="Notes: regulators, volumes, dedicated rate limits, custom domain…" rows={2} className={`${inp} sm:col-span-4`} /></div> : null}
              </Panel>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function Discover({ data, post, busy }: { data: any; post: (b: any, k: string, ok?: string) => Promise<any>; busy: string }) {
  return (
    <Panel title="Public signal channels" icon={Radio} accent="violet" collapsible defaultOpen={false} chevron="right">
      <div className="space-y-1.5">
        {data.discover.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between gap-2 text-[11px] flex-wrap">
            <span><span className="text-white font-semibold">{c.name}</span> <span className="text-slate-500">· {c.org} · {c.description ?? ''} · {c.track.closed} closed · win {c.track.winRate === null ? '—' : `${Math.round(c.track.winRate * 100)}%`}</span></span>
            <button disabled={!!busy} onClick={() => post({ type: c.subscribed ? 'unsubscribe' : 'subscribe', channelId: c.id }, `ds-${c.id}`)} className="rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white">{c.subscribed ? 'Unsubscribe' : 'Subscribe'}</button>
          </div>
        ))}
        {data.discover.length === 0 ? <p className="text-xs text-slate-500">No public channels yet.</p> : null}
      </div>
    </Panel>
  )
}
