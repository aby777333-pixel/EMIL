'use client'

import { useState } from 'react'

export default function ConsentForm({ clientId, redirectUri, scope, state, disabled }: { clientId: string; redirectUri: string; scope: string; state: string; disabled: boolean }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const decide = async (approve: boolean) => {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/oauth/authorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId, redirect_uri: redirectUri, scope, state, approve }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.redirect) { setErr(j?.error ?? 'Failed'); return }
      window.location.href = j.redirect
    } finally { setBusy(false) }
  }
  return (
    <div className="mt-4 flex gap-2">
      <button disabled={busy || disabled} onClick={() => decide(true)} className="flex-1 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2">Allow</button>
      <button disabled={busy} onClick={() => decide(false)} className="flex-1 rounded-md border border-border px-4 py-2 text-xs text-slate-300">Deny</button>
      {err ? <p className="text-xs text-red-300">{err}</p> : null}
    </div>
  )
}
