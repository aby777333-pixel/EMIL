'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { fmtNum, healthColor } from '@/lib/format'
import { Settings, ToggleRight, SlidersHorizontal, ScrollText, FileClock, HeartPulse, Siren } from 'lucide-react'
import toast from 'react-hot-toast'

const PROFILE_FIELDS: { key: string; label: string; step?: string }[] = [
  { key: 'baseLot', label: 'Base lot', step: '0.01' },
  { key: 'maxAggregateExposure', label: 'Max aggregate exposure (lots)', step: '0.01' },
  { key: 'maxRiskPerTradePct', label: 'Max risk per trade (%)', step: '0.1' },
  { key: 'dailyLossLimitPct', label: 'Daily loss limit (%)', step: '0.1' },
  { key: 'weeklyLossLimitPct', label: 'Weekly loss limit (%)', step: '0.1' },
  { key: 'maxDrawdownPct', label: 'Max drawdown (%)', step: '0.5' },
  { key: 'maxMarginUtilPct', label: 'Max margin utilization (%)', step: '1' },
  { key: 'maxOpenPositions', label: 'Max open positions', step: '1' },
  { key: 'pauseAfterConsecutiveLosses', label: 'Pause after consecutive losses', step: '1' },
]

const fmtDate = (s: string | null | undefined) => s ? new Date(s).toLocaleString('en-US', { timeZone: 'UTC' }) : '-'

export default function SettingsClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [profileDraft, setProfileDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' })
      if (!res?.ok) throw new Error('failed')
      const d = await res.json()
      setData(d)
      const draft: Record<string, string> = {}
      for (const f of PROFILE_FIELDS) draft[f.key] = String(d?.profile?.[f.key] ?? '')
      setProfileDraft(draft)
    } catch {
      setError('Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const togglePermission = useCallback(async (key: string) => {
    setBusyKey(key)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'toggle_permission', key }),
      })
      if (!res?.ok) throw new Error('failed')
      // Flip the switch immediately — no page refresh required.
      setData((prev: any) => ({
        ...prev,
        permissions: (prev?.permissions ?? []).map((p: any) => (p?.key === key ? { ...p, granted: !p?.granted } : p)),
      }))
      toast.success('Permission updated and logged.')
      await load()
    } catch {
      toast.error('Failed to update permission.')
    } finally {
      setBusyKey('')
    }
  }, [load])

  const saveProfile = useCallback(async () => {
    setBusyKey('profile')
    try {
      const payload: Record<string, number> = {}
      for (const f of PROFILE_FIELDS) {
        const v = parseFloat(profileDraft?.[f.key] ?? '')
        if (!Number.isNaN(v)) payload[f.key] = v
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update_risk_profile', ...payload }),
      })
      if (!res?.ok) throw new Error('failed')
      toast.success('Risk profile updated. Change written to audit trail.')
      await load()
    } catch {
      toast.error('Failed to update risk profile.')
    } finally {
      setBusyKey('')
    }
  }, [profileDraft, load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading settings..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  const permissions = data?.permissions ?? []
  const permsByCat: Record<string, any[]> = {}
  for (const p of permissions) permsByCat[p?.category ?? 'other'] = [...(permsByCat?.[p?.category ?? 'other'] ?? []), p]
  const consents = data?.consents ?? []
  const audits = data?.audits ?? []
  const health = data?.health ?? []
  const emergencies = data?.emergencies ?? []

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="h-5 w-5 text-cyan-400" /> Settings & Permissions</h1>
        <p className="text-xs text-slate-500 mt-1">EMIL never acts outside granted permissions. Every change is consent-logged and auditable.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Permission Grants" icon={ToggleRight} accent="cyan">
          <div className="space-y-4">
            {Object.entries(permsByCat).map(([cat, list]) => (
              <div key={cat}>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{cat}</h4>
                <div className="space-y-2">
                  {(list ?? []).map((p: any) => (
                    <div key={p?.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 p-2.5">
                      <div>
                        <p className="text-xs font-medium text-slate-200">{p?.label}</p>
                        <p className="text-[10px] text-slate-500 leading-snug">{p?.description}</p>
                      </div>
                      <button
                        onClick={() => togglePermission(p?.key)}
                        disabled={busyKey === p?.key}
                        role="switch"
                        aria-checked={p?.granted ?? false}
                        className={`relative shrink-0 h-5 w-10 rounded-full transition-colors ${p?.granted ? 'bg-emerald-500/70' : 'bg-slate-700'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${p?.granted ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Risk Profile Editor" icon={SlidersHorizontal} accent="amber">
            <p className="text-[11px] text-slate-500 mb-3">Active profile: <span className="text-slate-200 font-semibold">{data?.profile?.name ?? '-'}</span></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PROFILE_FIELDS.map((f) => (
                <label key={f.key} className="text-[10px] text-slate-500">{f.label}
                  <input
                    type="number"
                    step={f.step ?? '0.1'}
                    value={profileDraft?.[f.key] ?? ''}
                    onChange={(e) => setProfileDraft((prev) => ({ ...(prev ?? {}), [f.key]: e?.target?.value ?? '' }))}
                    className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white num"
                  />
                </label>
              ))}
            </div>
            <button onClick={saveProfile} disabled={busyKey === 'profile'} className="mt-3 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-colors">SAVE RISK PROFILE</button>
            <p className="text-[10px] text-slate-500 mt-2">Raising the aggregate exposure above 0.05 lots additionally requires the full override workflow on the Risk page.</p>
          </Panel>

          <Panel title="System Health" icon={HeartPulse} accent="emerald">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {health.map((h: any) => (
                <div key={h?.id} className="flex items-center justify-between rounded-md border border-border bg-background/40 p-2.5">
                  <div>
                    <p className="text-xs font-medium text-slate-200">{h?.component}</p>
                    {h?.message ? <p className="text-[10px] text-slate-500">{h.message}</p> : null}
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold uppercase ${healthColor(h?.status)}`}>{h?.status}</span>
                    <p className="text-[10px] text-slate-500 num">{fmtNum(h?.latencyMs, 0)} ms</p>
                  </div>
                </div>
              ))}
              {health.length === 0 ? <p className="text-xs text-slate-500">No health data.</p> : null}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title={`Emergency Events (${emergencies.length})`} icon={Siren} accent="red">
        <div className="space-y-2">
          {emergencies.map((e: any) => (
            <div key={e?.id} className="flex items-start justify-between gap-3 rounded-md border border-red-500/20 bg-red-500/5 p-2.5">
              <div>
                <p className="text-xs font-semibold text-red-300 uppercase">{(e?.eventType ?? '').replace(/_/g, ' ')} <span className="text-slate-500 normal-case font-normal">by {e?.triggeredBy}</span></p>
                <p className="text-[11px] text-slate-400 mt-0.5">{e?.detail}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold ${e?.resolved ? 'text-emerald-400' : 'text-red-400'}`}>{e?.resolved ? 'RESOLVED' : 'ACTIVE'}</span>
                <p className="text-[10px] text-slate-600 num">{fmtDate(e?.createdAt)}</p>
              </div>
            </div>
          ))}
          {emergencies.length === 0 ? <p className="text-xs text-slate-500">No emergency events recorded.</p> : null}
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title={`Consent Log (${consents.length})`} icon={ScrollText} accent="violet">
          <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-2">
            {consents.map((c: any) => (
              <div key={c?.id} className="rounded-md border border-border bg-background/40 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-violet-300 uppercase">{(c?.action ?? '').replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-slate-600 num">{fmtDate(c?.createdAt)}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{c?.detail}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Auth: {(c?.authMethod ?? '').replace(/_/g, ' ')}{c?.mode ? ` · mode: ${c.mode}` : ''}</p>
              </div>
            ))}
            {consents.length === 0 ? <p className="text-xs text-slate-500">No consent entries.</p> : null}
          </div>
        </Panel>

        <Panel title={`Audit Trail (${audits.length})`} icon={FileClock} accent="cyan">
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                  <th className="py-1.5 pr-2">Time</th><th className="py-1.5 pr-2">Actor</th><th className="py-1.5 pr-2">Action</th><th className="py-1.5">Detail</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a: any) => (
                  <tr key={a?.id} className="border-b border-border/40 text-[11px] text-slate-300">
                    <td className="py-1.5 pr-2 text-slate-500 num whitespace-nowrap">{fmtDate(a?.createdAt)}</td>
                    <td className="py-1.5 pr-2"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${a?.actor === 'emil' ? 'bg-cyan-500/15 text-cyan-300' : a?.actor === 'guardian' ? 'bg-red-500/15 text-red-300' : a?.actor === 'system' ? 'bg-slate-700/50 text-slate-300' : 'bg-violet-500/15 text-violet-300'}`}>{a?.actor}</span></td>
                    <td className="py-1.5 pr-2 font-medium text-slate-200">{a?.action}</td>
                    <td className="py-1.5 text-slate-500">{a?.detail}</td>
                  </tr>
                ))}
                {audits.length === 0 ? <tr><td colSpan={4} className="py-3 text-center text-xs text-slate-500">No audit entries.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}
