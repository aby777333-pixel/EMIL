'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { Activity, ExternalLink, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUSES = ['investigating', 'identified', 'monitoring', 'resolved']

export default function StatusAdminClient() {
  const [data, setData] = useState<any>(null)
  const [pub, setPub] = useState<any>(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState({ title: '', body: '', severity: 'minor' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch('/api/command/incidents', { cache: 'no-store' }), fetch('/api/status', { cache: 'no-store' })])
      if (!a.ok) throw new Error('failed')
      setData(await a.json())
      setPub(b.ok ? await b.json() : null)
    } catch { setError('Failed to load incidents.') }
  }, [])
  useEffect(() => { load() }, [load])

  const post = async (body: any, ok?: string) => {
    setBusy(true)
    try {
      const res = await fetch('/api/command/incidents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j?.error ?? 'Request failed'); return }
      if (ok) toast.success(ok)
      await load()
    } finally { setBusy(false) }
  }

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading status console..." /></div>

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Activity className="h-5 w-5 text-amber-400" /> Status &amp; Incidents</h1>
          <p className="text-xs text-slate-500 mt-1">What customers see on the public status page. Overall right now: <span className="text-white font-semibold">{pub?.overall ?? '—'}</span>. Every incident change also fires a <span className="font-mono">health.changed</span> webhook to subscribed customers.</p>
        </div>
        <a href="/status" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-slate-200 hover:text-white">Open public page <ExternalLink className="h-3.5 w-3.5" /></a>
      </div>

      <Panel title="Open an incident" icon={Plus} accent="amber">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Title, e.g. Twelve Data quotes delayed" className="rounded-md bg-background border border-border px-3 py-2 text-xs text-white" />
          <select value={draft.severity} onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))} className="rounded-md bg-background border border-border px-2 py-2 text-xs text-white">
            <option value="minor">minor</option><option value="major">major</option><option value="maintenance">maintenance</option>
          </select>
        </div>
        <textarea value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} placeholder="What is affected, what customers should expect, next update time." rows={3} className="mt-2 w-full rounded-md bg-background border border-border px-3 py-2 text-xs text-white" />
        <button disabled={busy || !draft.title.trim()} onClick={async () => { await post({ type: 'create', ...draft }, 'Incident opened.'); setDraft({ title: '', body: '', severity: 'minor' }) }} className="mt-2 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2">OPEN INCIDENT</button>
      </Panel>

      <Panel title={`Incidents (${data.incidents.length})`} icon={Activity} accent="cyan">
        {data.incidents.length === 0 ? <p className="text-xs text-slate-500">No incidents on record.</p> : (
          <div className="space-y-2">
            {data.incidents.map((i: any) => (
              <div key={i.id} className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm text-white font-semibold">{i.title} <span className="text-[10px] uppercase text-slate-500 ml-1">{i.severity}</span></p>
                  <div className="flex items-center gap-1.5">
                    <select value={i.status} disabled={busy} onChange={(e) => post({ type: 'update', id: i.id, status: e.target.value }, `Status → ${e.target.value}`)} className="rounded-md bg-background border border-border px-2 py-1 text-[11px] text-white">
                      {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                    <button disabled={busy} onClick={() => { if (window.confirm('Delete this incident from the record?')) post({ type: 'delete', id: i.id }, 'Deleted.') }} className="text-[11px] text-slate-500 hover:text-red-400">delete</button>
                  </div>
                </div>
                {i.body ? <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{i.body}</p> : null}
                <p className="text-[10px] text-slate-600 mt-1">opened {String(i.createdAt).slice(0, 16).replace('T', ' ')} UTC{i.resolvedAt ? ` · resolved ${String(i.resolvedAt).slice(0, 16).replace('T', ' ')} UTC` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
