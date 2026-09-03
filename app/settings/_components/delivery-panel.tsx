'use client'

// Alert delivery (spec §37/§65): Telegram link-by-code + email toggle.

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Panel } from '@/components/cockpit/panel'
import { Send, Mail, Link2, Unlink, Info } from 'lucide-react'

export default function DeliveryPanel() {
  const [d, setD] = useState<any>(null)
  const [busy, setBusy] = useState('')
  const [code, setCode] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/notify', { cache: 'no-store' })
    const j = await res.json().catch(() => null)
    if (res.ok) { setD(j); if (j?.pendingCode) setCode(j.pendingCode) }
  }, [])
  useEffect(() => { load() }, [load])

  const post = async (body: any, key: string, ok?: string) => {
    setBusy(key)
    try {
      const res = await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j?.error ?? 'Request failed'); return null }
      if (ok) toast.success(ok)
      await load()
      return j
    } finally { setBusy('') }
  }

  return (
    <Panel title="Alert Delivery — Telegram & Email" icon={Send} accent="amber">
      {!d ? <p className="text-xs text-slate-500">Loading…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Send className="h-4 w-4 text-cyan-400" /> Telegram {d.telegramLinked ? <span className="text-[10px] uppercase text-emerald-300 ml-1">linked</span> : null}</div>
            {!d.telegramConfigured ? (
              <p className="text-[11px] text-slate-500 mt-2 flex gap-1.5"><Info className="h-3.5 w-3.5 shrink-0 text-cyan-400" /> Not configured on the server yet. The owner creates a bot with @BotFather and sets <span className="font-mono">TELEGRAM_BOT_TOKEN</span>.</p>
            ) : d.telegramLinked ? (
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={!!d.notifyTelegram} onChange={(e) => post({ type: 'set_prefs', notifyTelegram: e.target.checked }, 'tg-pref')} className="accent-cyan-500" /> Send price alerts and notifications to Telegram</label>
                <div className="flex gap-1.5">
                  <button onClick={() => post({ type: 'telegram_test' }, 'tg-test', 'Test message sent.')} disabled={!!busy} className="rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-slate-200">Send test</button>
                  <button onClick={() => post({ type: 'telegram_unlink' }, 'tg-unlink', 'Telegram unlinked.')} disabled={!!busy} className="rounded-md border border-border px-2.5 py-1 text-[11px] text-red-400 flex items-center gap-1"><Unlink className="h-3 w-3" /> Unlink</button>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-slate-400">1. Open <a href={d.botName ? `https://t.me/${d.botName}` : '#'} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">@{d.botName ?? 'the EMIL bot'}</a> in Telegram and press Start. 2. Send it the code below. 3. Press Verify.</p>
                {code ? <div className="font-mono text-lg text-amber-200 tracking-widest">{code}</div> : null}
                <div className="flex gap-1.5">
                  <button onClick={async () => { const r = await post({ type: 'telegram_code' }, 'tg-code'); if (r?.code) setCode(r.code) }} disabled={!!busy} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-2.5 py-1 text-[11px] font-semibold text-white flex items-center gap-1"><Link2 className="h-3 w-3" /> {code ? 'New code' : 'Get link code'}</button>
                  {code ? <button onClick={() => post({ type: 'telegram_verify' }, 'tg-verify', 'Telegram linked.')} disabled={!!busy} className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200">Verify</button> : null}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Mail className="h-4 w-4 text-cyan-400" /> Email <span className="text-[11px] text-slate-500 font-normal">{d.email}</span></div>
            {!d.emailConfigured ? (
              <p className="text-[11px] text-slate-500 mt-2 flex gap-1.5"><Info className="h-3.5 w-3.5 shrink-0 text-cyan-400" /> Not configured on the server yet. The owner sets <span className="font-mono">RESEND_API_KEY</span> (and optionally <span className="font-mono">EMAIL_FROM</span>).</p>
            ) : (
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={!!d.notifyEmail} onChange={(e) => post({ type: 'set_prefs', notifyEmail: e.target.checked }, 'em-pref')} className="accent-cyan-500" /> Email me price alerts and notifications</label>
                <button onClick={() => post({ type: 'email_test' }, 'em-test', 'Test email sent.')} disabled={!!busy} className="rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-slate-200">Send test</button>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="text-[10px] text-slate-500 mt-3">The in-app bell always receives every notification; these channels are additional. Alerts are research signals on delayed quotes — never execution triggers.</p>
    </Panel>
  )
}
