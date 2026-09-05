'use client'

// Two-factor authentication (TOTP) enrolment / disable.

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Panel } from '@/components/cockpit/panel'
import { ShieldCheck, KeyRound } from 'lucide-react'

export default function TwoFactorPanel() {
  const [state, setState] = useState<any>(null)
  const [enrol, setEnrol] = useState<{ secret: string; qr: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/security', { cache: 'no-store' })
    const j = await res.json().catch(() => null)
    if (res.ok) setState(j)
  }, [])
  useEffect(() => { load() }, [load])

  const post = async (body: any) => {
    setBusy(true)
    try {
      const res = await fetch('/api/security', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j?.error ?? 'Request failed'); return null }
      return j
    } finally { setBusy(false) }
  }

  return (
    <Panel title="Two-Factor Authentication" icon={ShieldCheck} accent="emerald" className="min-w-0 overflow-hidden">
      {!state ? <p className="text-xs text-slate-500">Loading…</p> : state.totpEnabled ? (
        <div className="space-y-2 min-w-0">
          <p className="text-xs text-emerald-300 font-semibold">2FA is ON — sign-in requires your authenticator code.</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="Current 6-digit code" className="rounded-md bg-secondary/60 border border-border px-2.5 py-1.5 text-xs text-white w-44" />
            <button onClick={async () => { const r = await post({ type: 'totp_disable', code }); if (r?.ok) { toast.success('2FA disabled.'); setCode(''); load() } }} disabled={busy || code.length < 6} className="rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 disabled:opacity-50">Disable 2FA</button>
          </div>
        </div>
      ) : enrol ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 min-w-0">
          <div className="min-w-0">
            <img src={enrol.qr} alt="Scan with your authenticator app" className="rounded-md border border-border bg-white w-44 h-44 max-w-full" />
            <p className="text-[10px] text-slate-500 mt-1">Can&apos;t scan? Enter this key manually:</p>
            <p className="font-mono text-[11px] text-amber-200 break-all">{enrol.secret}</p>
          </div>
          <div className="space-y-2 min-w-0">
            <p className="text-xs text-slate-300">Scan the QR with Google Authenticator, Authy, 1Password or any TOTP app, then enter the 6-digit code it shows to activate.</p>
            <div className="flex flex-wrap gap-1.5">
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="6-digit code" className="rounded-md bg-secondary/60 border border-border px-2.5 py-1.5 text-xs text-white w-36" />
              <button onClick={async () => { const r = await post({ type: 'totp_confirm', code }); if (r?.ok) { toast.success('2FA enabled.'); setEnrol(null); setCode(''); load() } }} disabled={busy || code.length < 6} className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-[11px] font-semibold text-white">Activate</button>
              <button onClick={() => setEnrol(null)} className="rounded-md border border-border px-2.5 py-1.5 text-[11px] text-slate-400">Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Protect the cockpit with a time-based one-time code from an authenticator app. Strongly recommended before linking any live broker key.</p>
          <button onClick={async () => { const r = await post({ type: 'totp_begin' }); if (r?.ok) setEnrol({ secret: r.secret, qr: r.qr }) }} disabled={busy} className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-[11px] font-semibold text-white flex items-center gap-1"><KeyRound className="h-3 w-3" /> Enable 2FA</button>
        </div>
      )}
    </Panel>
  )
}
