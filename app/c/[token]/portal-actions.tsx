'use client'

import { useState } from 'react'

export default function PortalActions({ token, recoId, pendingCount }: { token: string; recoId?: string; pendingCount?: number }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [note, setNote] = useState('')
  const decide = async (decision: 'approve' | 'decline') => {
    setBusy(true)
    try {
      const res = await fetch(`/api/c/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recoId, decision, note }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setDone(j?.error ?? 'Failed'); return }
      setDone(`Recorded: ${j.status}. Refresh to see the updated status.`)
    } finally { setBusy(false) }
  }
  if (!recoId) {
    return (
      <div className="no-print flex items-center gap-2">
        {pendingCount ? <span className="text-xs text-slate-600">{pendingCount} awaiting your decision</span> : null}
        <button onClick={() => window.print()} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Print / Save as PDF</button>
      </div>
    )
  }
  return (
    <div className="no-print mt-3 flex items-center gap-2 flex-wrap">
      {done ? <span className="text-xs text-slate-600">{done}</span> : (
        <>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
          <button disabled={busy} onClick={() => decide('approve')} className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5">Approve</button>
          <button disabled={busy} onClick={() => decide('decline')} className="rounded-md bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 text-xs font-bold px-3 py-1.5">Decline</button>
        </>
      )}
    </div>
  )
}
