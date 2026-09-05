'use client'

// Privacy & data: export everything, delete the account, and the retention
// policy in plain language.

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Panel } from '@/components/cockpit/panel'
import { Shield, Download, Trash2 } from 'lucide-react'

export default function PrivacyPanel() {
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Panel title="Privacy & your data" icon={Shield} accent="violet" className="min-w-0 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 min-w-0">
        <div className="rounded-lg border border-border bg-secondary/30 p-3 min-w-0">
          <p className="text-sm font-semibold text-white flex items-center gap-2"><Download className="h-4 w-4 text-cyan-400" /> Export my data</p>
          <p className="text-[11px] text-slate-400 mt-1">One JSON file with your profile, plan and invoices, keys and links (metadata only, never secrets), journal, alerts, bridged accounts, organization memberships, your pushed data feed and your audit trail.</p>
          <a href="/api/account" download className="inline-block mt-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold px-3 py-1.5">DOWNLOAD EXPORT</a>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 min-w-0">
          <p className="text-sm font-semibold text-white flex items-center gap-2"><Trash2 className="h-4 w-4 text-red-400" /> Delete my account</p>
          <p className="text-[11px] text-slate-400 mt-1">Purges credentials, API keys, webhook endpoints, broker links, bridges, watchlists, alerts, journal, paper orders, your data feed, channels, embeds, OAuth apps and vendor keys. Invoices and the audit trail are kept under an anonymised identifier for the statutory period. Cannot be undone.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type your e-mail to confirm" className="rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white min-w-0 flex-1" />
            <button disabled={busy || !confirm} onClick={async () => { if (!window.confirm('Delete your EMIL account permanently?')) return; setBusy(true); try { const res = await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'delete_account', confirm }) }); const j = await res.json().catch(() => ({})); if (!res.ok) { toast.error(j?.error ?? 'Failed'); return } toast.success(j.note ?? 'Deleted'); setTimeout(() => signOut({ callbackUrl: '/login' }), 1500) } finally { setBusy(false) } }} className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-300 disabled:opacity-50">DELETE ACCOUNT</button>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 mt-3 [overflow-wrap:anywhere]">Retention: research caches expire automatically (minutes to hours); notifications, signals and API usage rows are kept 12 months; journal, invoices and the compliance archive are kept until you delete them or the statutory period ends. Broker, vendor and webhook secrets are encrypted at rest with a server-side key and are never exported or shown twice. Enterprise data-residency choices are commercial arrangements requested from Organization → Settings.</p>
    </Panel>
  )
}
