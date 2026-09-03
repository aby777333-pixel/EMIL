'use client'

// Circuit Breakers panel (spec §30–31) — the live rule board. A disarm-class
// trip stops automation (never touches positions); trips are listed until an
// admin acknowledges them. Enforcement is gated by the `circuit_breakers` flag.

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel } from '@/components/cockpit/panel'
import { Zap, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

type Breaker = { key: string; label: string; state: 'ok' | 'warn' | 'tripped' | 'n/a'; value: string; threshold: string; detail: string; action: 'disarm' | 'alert' }
type Report = { evaluatedAt: string; armed: boolean; enforcement: boolean; breakers: Breaker[]; tripped: string[]; enforced: { key: string; label: string }[]; recentTrips: { id: string; detail: string; resolved: boolean; createdAt: string }[] }

const tone: Record<Breaker['state'], string> = {
  ok: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  warn: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  tripped: 'text-red-300 border-red-500/50 bg-red-500/15',
  'n/a': 'text-slate-400 border-slate-600/50 bg-slate-700/30',
}

export default function BreakersPanel() {
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const load = useCallback(async (force = false) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/breakers${force ? '?force=1' : ''}`, { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setReport(d)
        if (d?.enforced?.length) toast.error(`Circuit breaker tripped — automation stopped (${d.enforced.map((e: any) => e.label).join(', ')})`, { duration: 8000 })
      }
    } finally { setBusy(false) }
  }, [])
  useEffect(() => { load(); const t = setInterval(() => load(), 60000); return () => clearInterval(t) }, [load])

  const resolve = async (id: string) => {
    const res = await fetch('/api/breakers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'resolve', id }) })
    if (res.ok) { toast.success('Trip acknowledged'); load(true) } else toast.error('Failed to acknowledge')
  }

  return (
    <Panel title={`Circuit Breakers${report ? ` · ${report.tripped.length ? `${report.tripped.length} TRIPPED` : 'all clear'}` : ''}`} icon={Zap} accent={report?.tripped.length ? 'red' : 'emerald'}>
      {!report ? <LoadingPanel text="Evaluating live conditions..." /> : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
            <span>Evaluated {new Date(report.evaluatedAt).toLocaleTimeString()} · enforcement <b className={report.enforcement ? 'text-emerald-300' : 'text-amber-300'}>{report.enforcement ? 'ON' : 'OFF (watch only — flag circuit_breakers)'}</b> · automation {report.armed ? <b className="text-red-300">ARMED</b> : <b className="text-slate-300">disarmed</b>}</span>
            <button onClick={() => load(true)} disabled={busy} className="flex items-center gap-1 text-slate-400 hover:text-white"><RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> re-evaluate</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {report.breakers.map((b) => (
              <div key={b.key} className={`rounded-md border px-2.5 py-1.5 ${b.state === 'tripped' ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-background/40'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-200 font-semibold">{b.label}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${tone[b.state]}`}>{b.state}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5"><span className="num text-slate-200">{b.value}</span> <span className="text-slate-600">vs</span> <span className="num">{b.threshold}</span> · on trip: <b className={b.action === 'disarm' ? 'text-red-300' : 'text-amber-300'}>{b.action === 'disarm' ? 'stop automation' : 'alert only'}</b></p>
                <p className="text-[10px] text-slate-500">{b.detail}</p>
              </div>
            ))}
          </div>
          {report.recentTrips.length ? (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Trip history</p>
              <div className="space-y-1">
                {report.recentTrips.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5">
                    <p className="text-[10px] text-slate-300"><span className="num text-slate-500">{new Date(t.createdAt).toLocaleString()}</span> · {t.detail}</p>
                    {t.resolved ? <span className="text-[9px] text-emerald-300 flex items-center gap-1 shrink-0"><CheckCircle2 className="h-3 w-3" /> acknowledged</span> : isAdmin ? <button onClick={() => resolve(t.id)} className="text-[9px] text-amber-300 hover:underline shrink-0">acknowledge</button> : <span className="text-[9px] text-amber-300 shrink-0">open</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-[10px] text-slate-500">A tripped breaker stops automation only — open positions and broker-side stops are untouched. Re-arming goes through ARM / DISARM with the usual acknowledgements.</p>
        </div>
      )}
    </Panel>
  )
}
