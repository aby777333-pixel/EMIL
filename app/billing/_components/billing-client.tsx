'use client'

// Plan & Billing (round D): current plan and effective limits, metered API
// usage with overage estimate, plan picker (payment link when a gateway is
// configured, otherwise an admin-fulfilled request), invoices, billing details.

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { CreditCard, Receipt, Gauge, Building2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const money = (n: number, c = 'USD') => `${c === 'USD' ? '$' : `${c} `}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const d = (s?: string | null) => (s ? String(s).slice(0, 10) : '—')
const TONE: Record<string, string> = { active: 'text-emerald-300 border-emerald-500/40', trialing: 'text-cyan-300 border-cyan-500/40', past_due: 'text-red-300 border-red-500/40', cancelled: 'text-slate-400 border-slate-600/50', open: 'text-amber-300 border-amber-500/40', paid: 'text-emerald-300 border-emerald-500/40', void: 'text-slate-500 border-slate-600/50', failed: 'text-red-300 border-red-500/40' }
const inp = 'rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white'

export default function BillingClient() {
  const params = useSearchParams()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [details, setDetails] = useState<any>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/billing', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      const j = await res.json()
      setData(j)
      setDetails({ billingEmail: j.subscription.billingEmail ?? '', billingName: j.subscription.billingName ?? '', taxId: j.subscription.taxId ?? '', address: j.subscription.address ?? '' })
    } catch { setError('Failed to load billing.') }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (params.get('paid')) toast.success(`Payment received for ${params.get('paid')} — activation follows the gateway confirmation.`) }, [params])

  const post = async (body: any, key: string, ok?: string) => {
    setBusy(key)
    try {
      const res = await fetch('/api/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j?.error ?? 'Request failed'); return null }
      if (ok) toast.success(ok)
      await load()
      return j
    } finally { setBusy('') }
  }

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading billing..." /></div>
  const sub = data.subscription
  const L = data.effective.limits
  const pct = Math.min(100, (data.usage.calls / Math.max(1, data.usage.included)) * 100)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard className="h-5 w-5 text-cyan-400" /> Plan &amp; Billing</h1>
        <p className="text-xs text-slate-500 mt-1">Plans are billed monthly: base price plus metered API overage. {data.gateway ? `Payments run through ${data.gateway === 'razorpay' ? 'Razorpay' : 'Stripe'}.` : 'No payment gateway is configured yet — plan changes create an invoice that EMIL settles with you manually.'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Current plan" value={sub.planKey} valueClass="text-amber-300 capitalize" sub={<span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${TONE[sub.status] ?? ''}`}>{sub.status.replace('_', ' ')}</span>} />
        <Stat label="Effective limits" value={L.label} valueClass={data.effective.planKey === sub.planKey ? 'text-emerald-300' : 'text-red-300'} sub={data.effective.planKey === sub.planKey ? 'plan in good standing' : 'reduced until paid'} />
        <Stat label="Period ends" value={d(sub.currentPeriodEnd)} sub={sub.cancelAtPeriodEnd ? 'cancels at period end' : sub.status === 'trialing' ? 'trial' : 'renews'} />
        <Stat label={`API calls · ${data.usage.month}`} value={data.usage.calls.toLocaleString()} sub={`${data.usage.included.toLocaleString()} included`} />
        <Stat label="Overage so far" value={money(data.usage.amount)} valueClass={data.usage.amount > 0 ? 'text-amber-300' : 'text-white'} sub={`${data.usage.extra.toLocaleString()} extra @ $${data.usage.per1k}/1k`} />
        <Stat label="Open invoices" value={data.invoices.filter((i: any) => i.status === 'open').length} valueClass={data.invoices.some((i: any) => i.status === 'open') ? 'text-amber-300' : 'text-white'} />
      </div>

      <Panel title="Usage this month" icon={Gauge} accent="emerald">
        <div className="h-2 rounded bg-slate-800 overflow-hidden"><div className={`h-full ${pct >= 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} /></div>
        <p className="text-[10px] text-slate-500 mt-1">{data.usage.calls.toLocaleString()} of {data.usage.included.toLocaleString()} included calls ({pct.toFixed(0)}%). Per-minute {L.apiPerMinute.toLocaleString()} · per-day {L.apiPerDay.toLocaleString()} · keys {L.maxKeys} · webhooks {L.maxWebhooks} · streaming {L.streaming ? 'yes' : 'no'} · organizations {L.organizations ? 'yes' : 'no'}.</p>
      </Panel>

      <Panel title="Plans" icon={CreditCard} accent="cyan">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {data.plans.map((p: any) => {
            const current = p.key === sub.planKey
            return (
              <div key={p.key} className={`rounded-md border p-3 flex flex-col ${current ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-border bg-background/40'}`}>
                <p className="text-sm font-bold text-white">{p.name} <span className="text-slate-400 font-normal">{p.priceMonthly ? `${money(p.priceMonthly, p.currency)}/mo` : 'free'}</span></p>
                <ul className="mt-2 space-y-0.5 text-[11px] text-slate-400 flex-1">{p.features.map((f: string) => <li key={f}>· {f}</li>)}{p.limits ? <><li>· {p.limits.apiPerMinute.toLocaleString()} API calls/min</li><li>· {p.limits.includedCallsPerMonth.toLocaleString()} calls/month included{p.limits.overagePer1k ? `, then $${p.limits.overagePer1k}/1k` : ''}</li>{p.limits.organizations ? <li>· Organizations up to {p.limits.members} members</li> : null}{p.limits.streaming ? <li>· SSE streaming</li> : null}</> : null}</ul>
                {current ? <span className="mt-2 text-[10px] uppercase font-bold text-cyan-300">current plan</span> : p.key !== 'trial' ? <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'choose_plan', planKey: p.key }, `cp-${p.key}`); if (r?.payUrl) window.open(r.payUrl, '_blank', 'noopener'); else if (r?.message) toast(r.message) }} className="mt-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">{sub.planKey === 'trial' ? 'Choose' : 'Switch'} — {money(p.priceMonthly, p.currency)}</button> : null}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {sub.status === 'active' && !sub.cancelAtPeriodEnd ? <button disabled={!!busy} onClick={() => { if (window.confirm('Cancel at the end of the current period? Limits fall back to trial afterwards.')) post({ type: 'cancel' }, 'cancel', 'Cancellation scheduled.') }} className="rounded-md border border-red-500/40 px-3 py-1.5 text-[11px] text-red-300">Cancel at period end</button> : null}
          {sub.cancelAtPeriodEnd ? <button disabled={!!busy} onClick={() => post({ type: 'resume' }, 'resume', 'Subscription resumed.')} className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5">Keep my plan</button> : null}
          <p className="text-[10px] text-slate-500">Switching plans issues a 30-day invoice for the new plan; entitlements change once it is paid. Research features stay on trial limits regardless — nothing is switched off.</p>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title={`Invoices (${data.invoices.length})`} icon={Receipt} accent="amber">
          <div className="space-y-2">
            {data.invoices.map((i: any) => (
              <div key={i.id} className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-white font-semibold font-mono">{i.number} <span className={`ml-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${TONE[i.status] ?? ''}`}>{i.status}</span></p>
                  <div className="flex items-center gap-2">
                    <span className="num text-sm text-white">{money(i.total, i.currency)}</span>
                    {i.status === 'open' ? <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'pay_invoice', invoiceId: i.id }, `pay-${i.id}`); if (r?.payUrl) window.open(r.payUrl, '_blank', 'noopener') }} className="flex items-center gap-1 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">Pay <ExternalLink className="h-3 w-3" /></button> : null}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 capitalize">{i.planKey} · {d(i.periodStart)} → {d(i.periodEnd)}{i.paidAt ? ` · paid ${d(i.paidAt)} via ${i.gateway ?? 'manual'}` : ''}</p>
                <ul className="mt-1 text-[10px] text-slate-400">{i.lineItems.map((li: any, idx: number) => <li key={idx} className="flex justify-between"><span>{li.label}</span><span className="num">{money(li.amount, i.currency)}</span></li>)}</ul>
              </div>
            ))}
            {data.invoices.length === 0 ? <p className="text-xs text-slate-500">No invoices yet.</p> : null}
          </div>
        </Panel>
        <Panel title="Billing details" icon={Building2} accent="cyan">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[['billingName', 'Company / name'], ['billingEmail', 'Billing e-mail'], ['taxId', 'Tax ID / GSTIN / VAT'], ['address', 'Address']].map(([k, label]) => (
              <label key={k} className="text-[10px] text-slate-500 block">{label}<input value={details[k] ?? ''} onChange={(e) => setDetails((x: any) => ({ ...x, [k]: e.target.value }))} className={`${inp} w-full mt-0.5`} /></label>
            ))}
          </div>
          <button disabled={!!busy} onClick={() => post({ type: 'update_details', ...details }, 'det', 'Saved.')} className="mt-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">SAVE</button>
          <p className="text-[10px] text-slate-500 mt-2">Shown on invoices and passed to the payment gateway. EMIL never stores card details — payment happens on the gateway's page.</p>
        </Panel>
      </div>
    </div>
  )
}
