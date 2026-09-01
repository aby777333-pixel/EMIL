'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { ScrollText } from 'lucide-react'

const CATEGORIES = ['all', 'crm', 'platform_api', 'india_api_hub', 'learning', 'super_admin', 'general']

export default function AuditClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin', { cache: 'no-store' })
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError('Failed to load the audit trail.')
    }
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading audit trail..." /></div>

  const logs = (data.auditLogs ?? []).filter((a: any) => {
    if (cat !== 'all' && a.category !== cat) return false
    if (!q.trim()) return true
    const needle = q.toLowerCase()
    return [a.action, a.detail, a.user?.email, a.actor].some((v: string) => (v ?? '').toLowerCase().includes(needle))
  })

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><ScrollText className="h-5 w-5 text-amber-400" /> Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-1">Every administrative, CRM, learning and platform action, immutable and attributable.</p>
      </div>

      <Panel title={`Entries (${logs.length})`} icon={ScrollText} accent="amber">
        <div className="flex gap-2 flex-wrap mb-3">
          <input value={q} onChange={(e) => setQ(e?.target?.value ?? '')} className="flex-1 min-w-[12rem] rounded-md bg-background border border-border px-3 py-2 text-xs text-white" placeholder="Search action, detail, email..." />
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded px-2.5 py-1.5 text-[10px] font-semibold border transition-colors ${cat === c ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-secondary/40 text-slate-400 border-border'}`}>{c.replace(/_/g, ' ')}</button>
          ))}
        </div>
        <div className="space-y-1.5 max-h-[36rem] overflow-y-auto scrollbar-thin pr-1">
          {logs.map((a: any) => (
            <div key={a.id} className="rounded-md border border-border bg-background/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-amber-300/90">{a.action}</span>
                <span className="num text-[10px] text-slate-600 shrink-0">{String(a.createdAt).slice(0, 16).replace('T', ' ')}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{a.detail}</p>
              <p className="text-[9px] text-slate-600 mt-0.5 uppercase">{a.actor}{a.user?.email ? ` · ${a.user.email}` : ''} · {a.category}</p>
            </div>
          ))}
          {logs.length === 0 ? <p className="text-xs text-slate-500 text-center py-6">No entries match.</p> : null}
        </div>
      </Panel>
    </div>
  )
}
