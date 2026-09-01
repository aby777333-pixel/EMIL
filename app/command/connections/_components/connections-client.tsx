'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Cable, Landmark } from 'lucide-react'

const TONE: Record<string, string> = {
  connected: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  configured: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  error: 'text-red-300 border-red-500/40 bg-red-500/10',
  not_configured: 'text-slate-400 border-slate-600/50 bg-slate-700/30',
}

export default function ConnectionsClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/command/connections', { cache: 'no-store' })
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError('Failed to load connections.')
    }
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading broker connectivity..." /></div>

  const connections = data.connections ?? []
  const providers = data.providers ?? []
  const houseConfigured = providers.filter((p: any) => p.status !== 'not_configured')

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Cable className="h-5 w-5 text-amber-400" /> Broker Connections</h1>
        <p className="text-xs text-slate-500 mt-1">Customer-linked broker accounts (isolated per customer) and the house provider catalog. Brokers integrate the other way through the same provider APIs.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Customer Connections" value={connections.length} valueClass="text-amber-300" />
        <Stat label="Connected" value={connections.filter((c: any) => c.status === 'connected').length} valueClass="text-emerald-300" />
        <Stat label="Errors" value={connections.filter((c: any) => c.status === 'error').length} valueClass={connections.some((c: any) => c.status === 'error') ? 'text-red-300' : 'text-white'} />
        <Stat label="House Providers Configured" value={`${houseConfigured.length} / ${providers.length}`} />
      </div>

      <Panel title={`Customer Broker Links (${connections.length})`} icon={Cable} accent="emerald">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="py-1.5 pr-3">Customer</th>
                <th className="py-1.5 pr-3">Provider</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">Credentials</th>
                <th className="py-1.5 pr-3">Last Check</th>
                <th className="py-1.5">Last Error</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((cn: any) => (
                <tr key={cn.id} className="border-b border-border/40">
                  <td className="py-2 pr-3">
                    <p className="text-[11px] text-slate-200">{cn.user?.email}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{cn.user?.profile?.status ?? 'trial'} · {cn.user?.profile?.planKey ?? 'trial'}</p>
                  </td>
                  <td className="py-2 pr-3 text-[11px] text-slate-300">{cn.providerKey}</td>
                  <td className="py-2 pr-3"><span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${TONE[cn.status] ?? TONE.not_configured}`}>{cn.status}</span></td>
                  <td className="py-2 pr-3 text-[10px] text-slate-500">{[cn.hasApiKey ? 'api key' : null, cn.hasAccessToken ? 'token' : null].filter(Boolean).join(' + ') || '—'}</td>
                  <td className="py-2 pr-3 num text-[10px] text-slate-500">{cn.lastCheckedAt ? String(cn.lastCheckedAt).slice(0, 16).replace('T', ' ') : '—'}</td>
                  <td className="py-2 text-[10px] text-red-300/80">{cn.lastError?.slice(0, 80) ?? ''}</td>
                </tr>
              ))}
              {connections.length === 0 ? <tr><td colSpan={6} className="py-6 text-center text-xs text-slate-500">No customer broker links yet — customers connect from Markets &amp; API Hub or POST /api/v1/broker-connections.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={`House Provider Catalog (${providers.length})`} icon={Landmark} accent="cyan">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {providers.map((p: any) => (
            <div key={p.key} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2.5">
              <div className="min-w-0">
                <p className="text-[11px] text-slate-200 truncate">{p.name} {p.isPrimaryData ? <span className="text-[9px] text-amber-300">★ data</span> : null}{p.isPrimaryExec ? <span className="text-[9px] text-amber-300">★ exec</span> : null}</p>
                <p className="text-[10px] text-slate-500">{p.vendor} · {p.markets}</p>
              </div>
              <span className={`shrink-0 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${TONE[p.status] ?? TONE.not_configured}`}>{p.status?.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">House credentials are edited from Markets &amp; API Hub while signed in as an admin — customers editing the same page only ever touch their own links.</p>
      </Panel>
    </div>
  )
}
