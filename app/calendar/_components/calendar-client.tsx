'use client'

// Economic calendar (spec §18) + central bank monitor (spec §19).
// Calendar: Forex Factory weekly feed (this + next week). Central banks:
// derived from the scheduled rate decisions, plus FRED when keyed.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel } from '@/components/cockpit/panel'
import { CalendarDays, Landmark, RefreshCw, ExternalLink, Info } from 'lucide-react'

const IMPACT: Record<string, string> = { High: 'bg-red-500/20 text-red-300 border-red-500/40', Medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40', Low: 'bg-slate-500/20 text-slate-300 border-slate-500/40', Holiday: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
const CCY = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY', 'INR']

export default function CalendarClient() {
  const [cal, setCal] = useState<any>(null)
  const [banks, setBanks] = useState<any>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [impact, setImpact] = useState<'all' | 'high' | 'high_medium'>('high_medium')
  const [ccy, setCcy] = useState('ALL')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    const grab = async (fn: string, set: (v: any) => void, key: string) => {
      try {
        const res = await fetch(`/api/data?fn=${fn}`, { cache: 'no-store' })
        const d = await res.json().catch(() => null)
        if (!res.ok) { setErrors((e) => ({ ...e, [key]: d?.message ?? d?.error ?? 'unavailable' })); return }
        setErrors((e) => ({ ...e, [key]: '' }))
        set(d)
      } catch { setErrors((e) => ({ ...e, [key]: 'network error' })) }
    }
    await Promise.all([grab('econ_calendar', setCal, 'cal'), grab('central_banks', setBanks, 'banks')])
    setBusy(false)
  }, [])
  useEffect(() => { load() }, [load])

  const events = useMemo(() => {
    const list: any[] = cal?.data ?? []
    return list.filter((e) => (ccy === 'ALL' || e.country === ccy) && (impact === 'all' || e.impact === 'High' || (impact === 'high_medium' && e.impact === 'Medium')))
  }, [cal, ccy, impact])

  const days = useMemo(() => {
    const m = new Map<string, any[]>()
    for (const e of events) {
      const d = new Date(e.date)
      const k = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(e)
    }
    return Array.from(m.entries())
  }, [events])

  const now = Date.now()

  return (
    <div className="space-y-4">
      <Panel title="Central Bank Monitor" icon={Landmark} accent="amber" headerExtra={<button onClick={load} disabled={busy} className="rounded-md border border-border bg-secondary/60 px-2 py-1 text-[11px] text-slate-200 flex items-center gap-1"><RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> Refresh</button>}>
        {errors.banks ? <p className="text-xs text-amber-300">{errors.banks}</p> : !banks ? <LoadingPanel text="Loading central banks…" /> : (
          <>
            {!banks.fredSource ? (
              <p className="text-[11px] text-slate-500 mb-3 flex items-start gap-1.5"><Info className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" /> Rates below come from the scheduled decisions in the calendar feed; the FRED series are unreachable right now. Add a free FRED key in <Link href="/command/providers" className="text-cyan-400 hover:underline">Command → Data Providers</Link> for the keyed API.</p>
            ) : banks.fredSource === 'public' ? (
              <p className="text-[11px] text-slate-500 mb-3 flex items-start gap-1.5"><Info className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" /> Official policy-rate series via FRED&apos;s public CSV (no key, refreshed ~6 h). A free FRED key in <Link href="/command/providers" className="text-cyan-400 hover:underline">Command → Data Providers</Link> switches to the hourly keyed API.</p>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(banks.banks ?? []).map((b: any) => (
                <div key={b.key} className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{b.short}</span>
                    <span className="text-[11px] text-slate-500">{b.name} · {b.currency}</span>
                    <a href={b.site} target="_blank" rel="noreferrer" className="ml-auto text-cyan-400"><ExternalLink className="h-3 w-3" /></a>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-amber-200 num">{b.currentRate ?? '—'}</span>
                    <span className="text-[10px] text-slate-500">{b.currentRateSource ?? 'no decision in the next two weeks'}</span>
                  </div>
                  {b.fred ? <div className="text-[10px] text-slate-400 mt-1">FRED {b.fred.series}: <span className="text-slate-200">{b.fred.value}%</span> ({b.fred.date}) · {b.fred.label}</div> : null}
                  {b.nextDecision ? (
                    <div className="mt-2 text-[11px] text-slate-300">Next: <span className="text-white">{b.nextDecision.title}</span> · {new Date(b.nextDecision.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}{b.nextDecision.forecast ? <span className="text-cyan-300"> · forecast {b.nextDecision.forecast}</span> : null}</div>
                  ) : null}
                  {b.lastDecision ? <div className="mt-1 text-[11px] text-slate-400">Last: {b.lastDecision.title} → <span className="text-emerald-300">{b.lastDecision.actual}</span> (prev {b.lastDecision.previous ?? '—'})</div> : null}
                  {b.relatedEvents?.length ? (
                    <ul className="mt-2 space-y-0.5">
                      {b.relatedEvents.slice(0, 3).map((e: any, i: number) => (
                        <li key={i} className="text-[10px] text-slate-500 flex gap-1"><span className={`rounded border px-1 ${IMPACT[e.impact] ?? IMPACT.Low}`}>{e.impact[0]}</span> {new Date(e.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {e.title}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">{banks.attribution}</p>
          </>
        )}
      </Panel>

      <Panel title="Economic Calendar — this week & next" icon={CalendarDays} accent="cyan">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {([['high', 'High only'], ['high_medium', 'High + medium'], ['all', 'All']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setImpact(k)} className={`rounded-md border px-2.5 py-1 text-[11px] ${impact === k ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200' : 'border-border bg-secondary/50 text-slate-400'}`}>{l}</button>
          ))}
          <select value={ccy} onChange={(e) => setCcy(e.target.value)} className="rounded-md bg-secondary/60 border border-border px-2 py-1 text-[11px] text-white">
            {CCY.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-[11px] text-slate-500 ml-auto">{events.length} events · fetched {cal?.fetchedAt ? new Date(cal.fetchedAt).toLocaleTimeString() : '—'}{cal?.stale ? ' · STALE' : ''}</span>
        </div>
        {errors.cal ? <p className="text-xs text-amber-300">{errors.cal}</p> : !cal ? <LoadingPanel text="Loading calendar…" /> : (
          <div className="space-y-3">
            {days.map(([day, list]) => (
              <div key={day}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border pb-1 mb-1">{day}</div>
                <table className="w-full text-[11px]">
                  <tbody>
                    {list.map((e: any) => {
                      const past = Date.parse(e.date) < now
                      return (
                        <tr key={e.id} className={`border-b border-border/30 ${past ? 'opacity-60' : ''}`}>
                          <td className="py-1 pr-2 font-mono text-slate-400 w-16">{new Date(e.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-1 pr-2 font-mono text-slate-300 w-12">{e.country}</td>
                          <td className="py-1 pr-2 w-8"><span className={`rounded border px-1 text-[9px] font-bold ${IMPACT[e.impact] ?? IMPACT.Low}`}>{e.impact[0]}</span></td>
                          <td className="py-1 pr-2 text-slate-200">{e.title}</td>
                          <td className="py-1 pr-2 text-right font-mono text-emerald-300 w-16">{e.actual ?? ''}</td>
                          <td className="py-1 pr-2 text-right font-mono text-cyan-300 w-16">{e.forecast ?? ''}</td>
                          <td className="py-1 text-right font-mono text-slate-500 w-16">{e.previous ?? ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            {days.length === 0 ? <p className="text-xs text-slate-500">No events match the filter.</p> : null}
            <p className="text-[10px] text-slate-500">Columns: actual · forecast · previous. {cal?.attribution}</p>
          </div>
        )}
      </Panel>
    </div>
  )
}
