'use client'

// Command Center → Demo Environment (spec §50–51): the shared demo trader
// login and its simulated portfolio, both admin-managed. Every action audited.

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { FlaskConical, KeyRound, RotateCcw, Copy, Mail, StickyNote } from 'lucide-react'
import toast from 'react-hot-toast'

type Summary = {
  demoEmail: string; userExists: boolean; userId: string | null
  passwordSetAt: string | null; lastResetAt: string | null; lastResetBy: string | null; resetCount: number; note: string | null
  account: { accountNumber: string; currency: string; balance: number; equity: number; floatingPL: number; openPositions: number; closedPositions: number } | null
  baseline: Record<string, number | string | boolean>
}

export default function DemoClient() {
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [email, setEmail] = useState('')
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')
  const [revealed, setRevealed] = useState<{ email: string; password: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/command/demo', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      const d = (await res.json()) as Summary
      setData(d); setEmail(d.demoEmail); setNote(d.note ?? '')
    } catch {
      setError('Failed to load the demo environment.')
    }
  }, [])
  useEffect(() => { load() }, [load])

  const act = useCallback(async (payload: Record<string, unknown>, key: string, confirmText?: string) => {
    if (busy) return null
    if (confirmText && !window.confirm(confirmText)) return null
    setBusy(key)
    try {
      const res = await fetch('/api/command/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      setData(d); setEmail(d.demoEmail); setNote(d.note ?? '')
      return d
    } catch (e: any) {
      toast.error(e?.message ?? 'Action failed.')
      return null
    } finally {
      setBusy('')
    }
  }, [busy])

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading demo environment..." /></div>

  const fmt = (v?: string | null) => (v ? String(v).slice(0, 16).replace('T', ' ') : 'never')

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><FlaskConical className="h-5 w-5 text-amber-400" /> Demo Environment</h1>
        <p className="text-xs text-slate-500 mt-1">One shared demo <b>trader</b> login for prospects and support. Rotate its password, reset its simulated portfolio to the baseline, hand the credentials out. Demo ≠ paper ≠ live — nothing here touches a real venue.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Demo login" value={data.userExists ? 'provisioned' : 'not created yet'} valueClass={data.userExists ? 'text-emerald-300' : 'text-amber-300'} />
        <Stat label="Balance" value={data.account ? `${data.account.balance.toLocaleString()} ${data.account.currency}` : '—'} valueClass="text-cyan-300" />
        <Stat label="Open positions" value={data.account?.openPositions ?? 0} />
        <Stat label="Resets" value={data.resetCount} />
      </div>

      {revealed ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-1.5">
          <p className="text-xs font-bold text-emerald-300">Demo credentials — shown once, only the hash is stored</p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="num text-[12px] text-white">{revealed.email}</code>
            <code className="num text-[12px] text-white">{revealed.password}</code>
            <button onClick={() => { navigator.clipboard?.writeText(`${revealed.email}\n${revealed.password}`); toast.success('Copied') }} className="rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-1 flex items-center gap-1"><Copy className="h-3 w-3" /> Copy both</button>
            <button onClick={() => setRevealed(null)} className="text-[10px] text-slate-400 hover:text-white">Dismiss</button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Demo credentials" icon={KeyRound} accent="cyan">
          <div className="space-y-3 text-[11px] text-slate-400">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1"><Mail className="h-3 w-3" /> Demo login email</span>
              <div className="flex gap-1.5 mt-1">
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
                <button onClick={() => act({ type: 'set_email', email }, 'email')} disabled={!!busy || email === data.demoEmail} className="rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-[11px] font-bold px-3">Save</button>
              </div>
            </label>
            <p>Password last set: <b className="text-slate-200">{fmt(data.passwordSetAt)}</b>{data.userExists ? '' : ' — the login is created on the first password set.'}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={async () => { const d = await act({ type: 'set_password' }, 'pw', 'Generate a new random password? The current demo password stops working immediately.'); if (d?.password) { setRevealed({ email: d.email, password: d.password }); toast.success('New demo password — copy it now.') } }} disabled={!!busy} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">Generate random password</button>
            </div>
            <div className="flex gap-1.5">
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="…or set a custom password (min 10 chars)" className="flex-1 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
              <button onClick={async () => { const d = await act({ type: 'set_password', password: custom }, 'pw2'); if (d?.password) { setRevealed({ email: d.email, password: d.password }); setCustom(''); toast.success('Demo password set.') } }} disabled={!!busy || custom.length < 10} className="rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-[11px] font-bold px-3">Set</button>
            </div>
          </div>
        </Panel>

        <Panel title="Simulated portfolio" icon={RotateCcw} accent="amber">
          <div className="space-y-3 text-[11px] text-slate-400">
            {data.account ? (
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[10px] uppercase text-slate-500">Account</span><div className="num text-white">{data.account.accountNumber}</div></div>
                <div><span className="text-[10px] uppercase text-slate-500">Equity</span><div className="num text-white">{data.account.equity.toLocaleString()} {data.account.currency}</div></div>
                <div><span className="text-[10px] uppercase text-slate-500">Floating P/L</span><div className={`num ${data.account.floatingPL >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{data.account.floatingPL.toLocaleString()}</div></div>
                <div><span className="text-[10px] uppercase text-slate-500">Closed positions</span><div className="num text-white">{data.account.closedPositions}</div></div>
              </div>
            ) : <p>No demo account yet — created with the first password set or reset.</p>}
            <p>Baseline after a reset: <b className="text-slate-200">{String(data.baseline.balance)} {String(data.baseline.currency)}</b> balance, protected capital {String(data.baseline.protectedCapital)}, working capital {String(data.baseline.workingCapital)}, every open or pending position closed at zero P/L.</p>
            <p>Last reset: <b className="text-slate-200">{fmt(data.lastResetAt)}</b>{data.lastResetBy ? ` by ${data.lastResetBy}` : ''}</p>
            <button onClick={async () => { const d = await act({ type: 'reset_portfolio' }, 'reset', 'Reset the demo portfolio to the baseline and close all its open positions?'); if (d) toast.success(`Demo portfolio reset · ${d.closed} position(s) closed.`) }} disabled={!!busy} className="rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5" /> Reset demo portfolio</button>
          </div>
        </Panel>
      </div>

      <Panel title="Operator note" icon={StickyNote} accent="cyan">
        <div className="flex gap-1.5">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Who has the current demo credentials, when to rotate…" className="flex-1 rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
          <button onClick={() => act({ type: 'set_note', note }, 'note')} disabled={!!busy || note === (data.note ?? '')} className="rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-[11px] font-bold px-3">Save</button>
        </div>
      </Panel>
    </div>
  )
}
