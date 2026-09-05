'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { CreditCard, Receipt, Play, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const money = (n: number, c = 'USD') => `${c === 'USD' ? '$' : `${c} `}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const d = (s?: string | null) => (s ? String(s).slice(0, 10) : '—')
const TONE: Record<string, string> = { active: 'text-emerald-300 border-emerald-500/40', trialing: 'text-cyan-300 border-cyan-500/40', past_due: 'text-red-300 border-red-500/40', cancelled: 'text-slate-400 border-slate-600/50', open: 'text-amber-300 border-amber-500/40', paid: 'text-emerald-300 border-emerald-500/40', void: 'text-slate-500 border-slate-600/50' }
const inp = 'rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white'

export default function BillingAdminClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [issue, setIssue] = useState({ email: '', planKey: 'starter' })

  const load = useCallback(async () => {
    try { const res = await fetch('/api/command/billing', { cache: 'no-store' }); if (!res.ok) throw new Error('failed'); setData(await res.json()) } catch { setError('Failed to load billing console.') }
  }, [])
  useEffect(() => { load() }, [load])
  const post = async (body: any, key: string, ok?: string) => {
    setBusy(key)
    try { const res = await fetch('/api/command/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await res.json().catch(() => ({})); if (!res.ok) { toast.error(j?.error ?? 'Request failed'); return null } if (ok) toast.success(ok); await load(); return j } finally { setBusy('') }
  }

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading billing console..." /></div>
  const g = data.gateway

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-400" /> Billing</h1>
          <p className="text-xs text-slate-500 mt-1">Gateway: <span className={g.active ? 'text-emerald-300' : 'text-amber-300'}>{g.active ?? 'none configured'}</span> · Razorpay {g.razorpay ? 'keys ✓' : '—'}{g.razorpayWebhook ? ' webhook ✓' : ''} · Stripe {g.stripe ? 'keys ✓' : '—'}{g.stripeWebhook ? ' webhook ✓' : ''} · cron secret {g.cron ? '✓' : 'missing'}. Set RAZORPAY_KEY_ID/SECRET(+WEBHOOK_SECRET) or STRIPE_SECRET_KEY(+WEBHOOK_SECRET) in Netlify to take payments; point a daily scheduler at /api/cron/billing.</p>
        </div>
        <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'run_cycle' }, 'cycle'); if (r) toast.success(`Cycle: ${r.renewed} renewed, ${r.pastDue} past due, ${r.churned} churned, ${r.trialsEnded} trials ended`) }} className="flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2"><Play className="h-3.5 w-3.5" /> Run billing cycle now</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Subscriptions" value={data.summary.subscriptions} valueClass="text-amber-300" />
        <Stat label="Active" value={data.summary.active} valueClass="text-emerald-300" />
        <Stat label="Past due" value={data.summary.pastDue} valueClass={data.summary.pastDue ? 'text-red-300' : 'text-white'} />
        <Stat label="MRR (active subs)" value={money(data.summary.mrr)} valueClass="text-emerald-300" />
        <Stat label="Open invoices" value={`${data.summary.openInvoices} · ${money(data.summary.openAmount)}`} valueClass="text-amber-300" />
        <Stat label="Paid last 30 days" value={money(data.summary.paid30d)} valueClass="text-emerald-300" />
      </div>

      <Panel title="Issue an invoice" icon={Plus} accent="amber">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input value={issue.email} onChange={(e) => setIssue((x) => ({ ...x, email: e.target.value }))} placeholder="customer@email.com" className={inp} />
          <select value={issue.planKey} onChange={(e) => setIssue((x) => ({ ...x, planKey: e.target.value }))} className={inp}><option value="starter">starter</option><option value="pro">pro</option><option value="institutional">institutional</option></select>
          <button disabled={!!busy || !issue.email} onClick={async () => { const r = await post({ type: 'issue_invoice', ...issue }, 'issue', 'Invoice issued.'); if (r?.link?.url) toast(`Pay link: ${r.link.url}`) }} className="rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">ISSUE 30-DAY INVOICE</button>
        </div>
      </Panel>

      <Panel title={`Invoices (${data.invoices.length})`} icon={Receipt} accent="cyan">
        <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-left text-[11px]"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">Number</th><th className="py-1.5 pr-3">Customer</th><th className="py-1.5 pr-3">Plan</th><th className="py-1.5 pr-3">Period</th><th className="py-1.5 pr-3">Total</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Gateway</th><th className="py-1.5" /></tr></thead>
          <tbody>{data.invoices.map((i: any) => (
            <tr key={i.id} className="border-b border-border/40">
              <td className="py-1.5 pr-3 font-mono text-white">{i.number}</td><td className="py-1.5 pr-3 text-slate-300">{i.email}</td><td className="py-1.5 pr-3 capitalize">{i.planKey}</td><td className="py-1.5 pr-3 num text-slate-500">{d(i.periodStart)} → {d(i.periodEnd)}</td><td className="py-1.5 pr-3 num text-white">{money(i.total, i.currency)}{i.overageAmount ? <span className="text-[9px] text-amber-300 ml-1">+ov</span> : null}</td>
              <td className="py-1.5 pr-3"><span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${TONE[i.status] ?? ''}`}>{i.status}</span></td><td className="py-1.5 pr-3 text-slate-500">{i.gateway ?? '—'}{i.payUrl ? <a href={i.payUrl} target="_blank" rel="noreferrer" className="text-cyan-400 ml-1">link</a> : null}</td>
              <td className="py-1.5 text-right whitespace-nowrap">{i.status === 'open' ? <><button disabled={!!busy} onClick={() => { const note = window.prompt('Settlement reference (bank txn / receipt):') ?? ''; post({ type: 'mark_paid', invoiceId: i.id, note }, `mp-${i.id}`, 'Marked paid — plan activated.') }} className="text-[10px] text-emerald-300 hover:underline mr-2">mark paid</button><button disabled={!!busy} onClick={() => post({ type: 'relink', invoiceId: i.id }, `rl-${i.id}`, 'Link regenerated.')} className="text-[10px] text-cyan-400 hover:underline mr-2">relink</button><button disabled={!!busy} onClick={() => { if (window.confirm('Void this invoice?')) post({ type: 'void', invoiceId: i.id }, `v-${i.id}`, 'Voided.') }} className="text-[10px] text-slate-500 hover:text-red-400">void</button></> : null}</td>
            </tr>
          ))}{data.invoices.length === 0 ? <tr><td colSpan={8} className="py-4 text-center text-xs text-slate-500">No invoices yet.</td></tr> : null}</tbody></table></div>
      </Panel>

      <Panel title={`Subscriptions (${data.subscriptions.length})`} icon={CreditCard} accent="emerald" collapsible chevron="right" defaultOpen={false}>
        <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-left text-[11px]"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">Customer</th><th className="py-1.5 pr-3">Plan</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Period</th><th className="py-1.5 pr-3">Gateway</th><th className="py-1.5">Cancel at end</th></tr></thead>
          <tbody>{data.subscriptions.map((s: any) => <tr key={s.id} className="border-b border-border/40"><td className="py-1.5 pr-3 text-slate-300">{s.email}</td><td className="py-1.5 pr-3 capitalize">{s.planKey}</td><td className="py-1.5 pr-3"><span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${TONE[s.status] ?? ''}`}>{s.status.replace('_', ' ')}</span></td><td className="py-1.5 pr-3 num text-slate-500">{d(s.currentPeriodStart)} → {d(s.currentPeriodEnd)}</td><td className="py-1.5 pr-3 text-slate-500">{s.gateway ?? '—'}</td><td className="py-1.5 text-slate-500">{s.cancelAtPeriodEnd ? 'yes' : 'no'}</td></tr>)}</tbody></table></div>
      </Panel>

      <Panel title="Recent gateway events" icon={Receipt} accent="violet" collapsible chevron="right" defaultOpen={false}>
        {data.events.length === 0 ? <p className="text-xs text-slate-500">No webhook events received.</p> : <ul className="text-[10px] text-slate-400 space-y-0.5">{data.events.map((e: any) => <li key={e.id}><span className="text-slate-600">{String(e.processedAt).slice(0, 16).replace('T', ' ')}</span> <span className="text-amber-300">{e.gateway}</span> {e.type} <span className="text-slate-600">{e.eventId}</span></li>)}</ul>}
      </Panel>
    </div>
  )
}
