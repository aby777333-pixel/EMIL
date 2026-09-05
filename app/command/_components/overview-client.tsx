'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { LayoutDashboard, Users, DollarSign, Activity, ScrollText, UserPlus } from 'lucide-react'

const STATUS_TONE: Record<string, string> = {
  lead: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  trial: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  active: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  suspended: 'text-red-300 border-red-500/40 bg-red-500/10',
  churned: 'text-slate-500 border-slate-600/50 bg-slate-700/30',
}

export default function OverviewClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/command/overview', { cache: 'no-store' })
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError('Failed to load the command overview.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading EMIL Command..." /></div>

  const s = data.byStatus ?? {}

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><LayoutDashboard className="h-5 w-5 text-amber-400" /> Command Overview</h1>
        <p className="text-xs text-slate-500 mt-1">The business and platform pulse — customers, revenue, connectivity and system health in one place.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Stat label="Customers" value={data.totalCustomers ?? 0} sub={`${data.newThisWeek ?? 0} new this week`} valueClass="text-amber-300" />
        <Stat label="Active (paying)" value={s.active ?? 0} valueClass="text-emerald-300" />
        <Stat label="On Trial" value={s.trial ?? 0} valueClass="text-cyan-300" />
        <Stat label="Suspended / Churned" value={(s.suspended ?? 0) + (s.churned ?? 0)} valueClass={(s.suspended ?? 0) ? 'text-red-300' : 'text-white'} />
        <Stat label="MRR (from active plans)" value={`$${Math.round(data.mrr ?? 0).toLocaleString()}`} valueClass="text-emerald-300" />
        <Stat label="Active API Keys" value={data.apiKeyCount ?? 0} valueClass="text-cyan-300" />
        <Stat label="Customer Connections" value={data.connectionCount ?? 0} valueClass="text-amber-300" sub="linked broker accounts" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Recent Signups" icon={UserPlus} accent="cyan">
          <div className="space-y-2">
            {(data.recentCustomers ?? []).map((u: any) => (
              <Link key={u.id} href={`/command/customers?focus=${u.id}`} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2.5 hover:border-amber-500/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-200 truncate">{u.email} {u.role === 'admin' ? <span className="text-[9px] text-red-300 uppercase font-bold">admin</span> : null}</p>
                  <p className="text-[10px] text-slate-500">{u.name || '—'} · joined {String(u.createdAt).slice(0, 10)}{u.profile?.lastSeenAt ? ` · last seen ${String(u.profile.lastSeenAt).slice(0, 10)}` : ''}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 uppercase">{u.profile?.planKey ?? 'trial'}</span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_TONE[u.profile?.status ?? 'trial']}`}>{u.profile?.status ?? 'trial'}</span>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Plan Distribution" icon={DollarSign} accent="emerald">
          <div className="space-y-2">
            {(data.plans ?? []).map((p: any) => {
              const count = data.planCounts?.[p.key] ?? 0
              const max = Math.max(1, data.totalCustomers ?? 1)
              return (
                <div key={p.id} className="rounded-md border border-border bg-background/40 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-200 font-semibold">{p.name} <span className="text-slate-500">${p.priceMonthly}/mo</span></span>
                    <span className="num text-[11px] text-slate-300">{count} customer{count === 1 ? '' : 's'}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded bg-slate-800 overflow-hidden">
                    <div className="h-full rounded bg-amber-500/70" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="System Health" icon={Activity} accent="emerald">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(data.health ?? []).map((h: any) => (
              <div key={h.id} className="flex items-center gap-2 rounded-md bg-secondary/40 border border-border/50 px-3 py-2">
                <span className={`h-2 w-2 rounded-full shrink-0 ${h.status === 'healthy' ? 'bg-emerald-400' : h.status === 'degraded' ? 'bg-amber-400 pulse-dot' : 'bg-red-500 pulse-dot'}`} />
                <div className="min-w-0">
                  <div className="text-xs text-white truncate">{h.component}</div>
                  <div className="num text-[10px] text-slate-500">{h.latencyMs}ms{h.message ? ` · ${h.message}` : ''}</div>
                </div>
              </div>
            ))}
            {(data.health ?? []).length === 0 ? <p className="text-xs text-slate-500">No health data.</p> : null}
          </div>
        </Panel>

        <Panel title="Recent Activity" icon={ScrollText} accent="cyan">
          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {(data.recentAudit ?? []).map((a: any) => (
              <p key={a.id} className="text-[10px] text-slate-400">
                <span className="text-slate-600">{String(a.createdAt).slice(5, 16).replace('T', ' ')}</span>{' '}
                <span className="text-amber-300/90">{a.action}</span>
                {a.user?.email ? <span className="text-slate-600"> · {a.user.email}</span> : null}
                <span className="text-slate-500"> — {a.detail.slice(0, 120)}</span>
              </p>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Selling EMIL — go-live checklist" icon={Users} accent="amber">
        <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
          <li>Customers sign up at <span className="text-slate-200">/login → Create account</span> and land on a 14-day trial automatically (CRM row created).</li>
          <li>Each customer links their <span className="text-slate-200">own broker APIs</span> from Markets &amp; API Hub — credentials are isolated per account; only admins touch the house keys.</li>
          <li>Issue <span className="text-slate-200">EMIL API keys</span> from the Customers page for programmatic access via <span className="num text-cyan-300">/api/v1</span> (ping, me, state, strategies, knowledge, broker-connections).</li>
          <li>Suspend from the CRM to block sign-in and API access instantly.</li>
          <li className="text-amber-300/90">Still open before charging money: payment gateway integration (plans are tracked, not billed), credential encryption at rest, and rate limiting on /api/v1.</li>
        </ul>
      </Panel>
    </div>
  )
}
