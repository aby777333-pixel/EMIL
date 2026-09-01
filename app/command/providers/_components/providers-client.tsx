'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Database, KeyRound, Activity, ExternalLink, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_TONE: Record<string, string> = {
  healthy: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  degraded: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  error: 'text-red-300 border-red-500/40 bg-red-500/10',
  needs_key: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  unknown: 'text-slate-400 border-slate-600/50 bg-slate-700/30',
}

const CATEGORY_LABELS: Record<string, string> = {
  macro: 'Macroeconomics', market_data: 'Market Data', fundamentals: 'Fundamentals', fx: 'FX',
  crypto: 'Crypto', news: 'News & Events', energy: 'Energy', agriculture: 'Agriculture',
  trade: 'Global Trade', weather: 'Weather', identifiers: 'Identifiers', regulatory: 'Regulatory & Filings',
}

export default function ProvidersClient() {
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/command/providers', { cache: 'no-store' })
      if (!res?.ok) throw new Error('failed')
      const d = await res.json()
      setProviders(d?.providers ?? [])
    } catch {
      setError('Failed to load the Data Provider Hub.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const act = useCallback(async (payload: any, busy: string, msg?: string) => {
    if (busyKey) return
    setBusyKey(busy)
    try {
      const res = await fetch('/api/command/providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (payload.type === 'test') {
        ;(d?.ok ? toast.success : toast.error)(`${payload.key}: ${d?.message ?? d?.error ?? 'test finished'}${d?.latencyMs ? ` (${d.latencyMs}ms)` : ''}`, { duration: 6000 })
      } else if (!res.ok) {
        throw new Error(d?.error ?? 'action failed')
      } else if (msg) toast.success(msg)
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Action failed.')
    } finally {
      setBusyKey('')
    }
  }, [busyKey, load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading the Data Provider Hub..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  const byCategory: Record<string, any[]> = {}
  for (const p of providers) byCategory[p.category] = [...(byCategory[p.category] ?? []), p]
  const healthy = providers.filter((p) => p.status === 'healthy').length
  const needKeys = providers.filter((p) => p.status === 'needs_key' || (p.authType === 'api_key' && !p.hasApiKey)).length

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Database className="h-5 w-5 text-amber-400" /> Data Provider Hub</h1>
        <p className="text-xs text-slate-500 mt-1">
          Free/open-first global data layer — official APIs and legitimate free tiers, each with license notes, freshness, priority and a fallback.
          RESEARCH data only: autonomous execution never runs on these feeds.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Providers" value={providers.length} valueClass="text-amber-300" />
        <Stat label="Healthy" value={healthy} valueClass="text-emerald-300" />
        <Stat label="Need An API Key" value={needKeys} valueClass="text-cyan-300" />
        <Stat label="Disabled" value={providers.filter((p) => !p.enabled).length} />
      </div>

      {Object.entries(byCategory).map(([cat, list]) => (
        <Panel key={cat} title={`${CATEGORY_LABELS[cat] ?? cat} (${list.length})`} icon={Database} accent="cyan">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {list.map((p) => (
              <div key={p.key} className={`rounded-md border p-3 ${p.enabled ? 'border-border bg-background/40' : 'border-border/50 bg-background/20 opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200">{p.name} <span className="text-slate-500 font-normal">· priority {p.priority}{p.fallbackKey ? ` · fallback → ${p.fallbackKey}` : ''}</span></p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{p.coverage}</p>
                  </div>
                  <span className={`shrink-0 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_TONE[p.status] ?? STATUS_TONE.unknown}`}>{p.status.replace('_', ' ')}</span>
                </div>
                <p className="text-[10px] text-amber-300/70 mt-1.5">{p.license}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Freshness: <span className="uppercase text-slate-300">{p.freshness}</span>
                  {p.lastCheckedAt ? ` · checked ${String(p.lastCheckedAt).slice(5, 16).replace('T', ' ')}${p.lastLatencyMs ? ` (${p.lastLatencyMs}ms)` : ''}` : ' · never checked'}
                </p>
                {p.lastError ? <p className="text-[10px] text-red-300/80 mt-1">{p.lastError}</p> : null}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {p.authType === 'api_key' ? (
                    <>
                      <input
                        type="password"
                        placeholder={p.hasApiKey ? `Key saved (${p.apiKeyMasked}) — paste to replace` : 'Paste API key'}
                        value={drafts[p.key] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
                        className="flex-1 min-w-[10rem] rounded-md bg-secondary/60 border border-border px-2 py-1 text-[11px] text-white"
                      />
                      <button onClick={() => { act({ type: 'save_key', key: p.key, apiKey: drafts[p.key] }, `sk-${p.key}`, 'Key saved server-side.'); setDrafts((d) => ({ ...d, [p.key]: '' })) }} disabled={!!busyKey || !(drafts[p.key] ?? '').trim()} className="flex items-center gap-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[10px] font-bold px-2 py-1"><KeyRound className="h-3 w-3" /> Save</button>
                      {p.hasApiKey ? <button onClick={() => act({ type: 'clear_key', key: p.key }, `ck-${p.key}`, 'Key cleared.')} disabled={!!busyKey} className="flex items-center gap-1 rounded bg-slate-700/60 hover:bg-slate-600/60 disabled:opacity-50 text-slate-200 text-[10px] px-2 py-1"><Trash2 className="h-3 w-3" /></button> : null}
                    </>
                  ) : <span className="text-[10px] text-emerald-300/80">No key required</span>}
                  <button onClick={() => act({ type: 'test', key: p.key }, `t-${p.key}`)} disabled={!!busyKey} className="flex items-center gap-1 rounded bg-slate-700/60 hover:bg-slate-600/60 disabled:opacity-50 text-slate-200 text-[10px] px-2 py-1"><Activity className="h-3 w-3" /> {busyKey === `t-${p.key}` ? 'Testing…' : 'Test'}</button>
                  <button onClick={() => act({ type: 'toggle_enabled', key: p.key }, `e-${p.key}`, p.enabled ? 'Provider disabled.' : 'Provider enabled.')} disabled={!!busyKey} className={`rounded text-[10px] font-bold px-2 py-1 ${p.enabled ? 'bg-amber-600/70 hover:bg-amber-600 text-white' : 'bg-emerald-600/70 hover:bg-emerald-600 text-white'}`}>{p.enabled ? 'Disable' : 'Enable'}</button>
                  <a href={p.docsUrl} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300">Docs <ExternalLink className="h-3 w-3" /></a>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  )
}
