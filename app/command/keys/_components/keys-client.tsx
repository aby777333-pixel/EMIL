'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { KeyRound, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

export default function KeysClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/command/connections', { cache: 'no-store' })
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError('Failed to load API keys.')
    }
  }, [])
  useEffect(() => { load() }, [load])

  const revoke = useCallback(async (keyId: string) => {
    if (busy || !window.confirm('Revoke this API key? Integrations using it stop working immediately.')) return
    setBusy(keyId)
    try {
      const res = await fetch('/api/command/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'revoke_api_key', keyId }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      toast.success('Key revoked.')
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to revoke.')
    } finally {
      setBusy('')
    }
  }, [busy, load])

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading API keys..." /></div>

  const keys = data.apiKeys ?? []

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-400" /> Platform API Keys</h1>
        <p className="text-xs text-slate-500 mt-1">Every key issued to customers for the /api/v1 Platform API. Keys are issued from a customer&apos;s CRM card; only hashes are stored.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Active Keys" value={keys.filter((k: any) => k.status === 'active').length} valueClass="text-emerald-300" />
        <Stat label="Revoked" value={keys.filter((k: any) => k.status === 'revoked').length} />
        <Stat label="Used In Last 7 Days" value={keys.filter((k: any) => k.lastUsedAt && Date.now() - new Date(k.lastUsedAt).getTime() < 7 * 864e5).length} valueClass="text-cyan-300" />
      </div>

      <Panel title={`Issued Keys (${keys.length})`} icon={KeyRound} accent="cyan">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="py-1.5 pr-3">Customer</th>
                <th className="py-1.5 pr-3">Label</th>
                <th className="py-1.5 pr-3">Key</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">Last Used</th>
                <th className="py-1.5 pr-3">Created</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k: any) => (
                <tr key={k.id} className="border-b border-border/40">
                  <td className="py-2 pr-3 text-[11px] text-slate-200">{k.email}</td>
                  <td className="py-2 pr-3 text-[11px] text-slate-300">{k.label}</td>
                  <td className="py-2 pr-3 num text-[11px] text-slate-400">{k.prefix}…</td>
                  <td className="py-2 pr-3"><span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${k.status === 'active' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-red-300 border-red-500/40 bg-red-500/10'}`}>{k.status}</span></td>
                  <td className="py-2 pr-3 num text-[10px] text-slate-500">{k.lastUsedAt ? String(k.lastUsedAt).slice(0, 16).replace('T', ' ') : 'never'}</td>
                  <td className="py-2 pr-3 num text-[10px] text-slate-500">{String(k.createdAt).slice(0, 10)}</td>
                  <td className="py-2">
                    {k.status === 'active' ? <button onClick={() => revoke(k.id)} disabled={!!busy} className="rounded bg-red-600/70 hover:bg-red-600 disabled:opacity-50 text-white text-[10px] px-2.5 py-1">Revoke</button> : null}
                  </td>
                </tr>
              ))}
              {keys.length === 0 ? <tr><td colSpan={7} className="py-6 text-center text-xs text-slate-500">No keys issued yet — open a customer in the CRM and issue one.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Platform API Reference (/api/v1)" icon={BookOpen} accent="amber">
        <div className="space-y-1.5 text-[11px] text-slate-400">
          <p>Authenticate with <code className="text-cyan-300">x-api-key: emil_live_…</code> or <code className="text-cyan-300">Authorization: Bearer emil_live_…</code></p>
          <p><code className="text-slate-200">GET /api/v1/ping</code> — key and account check</p>
          <p><code className="text-slate-200">GET /api/v1/me</code> — account, plan and trial status</p>
          <p><code className="text-slate-200">GET /api/v1/state</code> — EMIL system state (read-only)</p>
          <p><code className="text-slate-200">GET /api/v1/strategies</code> — current strategy blueprints with lab metrics (research output, never advice)</p>
          <p><code className="text-slate-200">GET /api/v1/knowledge/concepts</code> · <code className="text-slate-200">GET /api/v1/knowledge/claims</code> — the attributed knowledge base</p>
          <p><code className="text-slate-200">GET /api/v1/broker-connections</code> — the caller&apos;s linked brokers (masked)</p>
          <p><code className="text-slate-200">POST /api/v1/broker-connections</code> — link a broker: <code>{'{ "providerKey": "upstox", "accessToken": "…" }'}</code>; the link is verified with a lightweight read</p>
          <p className="text-amber-300/90">The API is read/link only — it never places orders. Rate limiting and credential encryption are on the go-live checklist.</p>
        </div>
      </Panel>
    </div>
  )
}
