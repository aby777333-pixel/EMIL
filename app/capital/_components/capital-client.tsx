'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { fmtMoney, fmtSigned, fmtPct, plColor } from '@/lib/format'
import { Landmark, LineChart as LineChartIcon, BarChart3, BookOpen, TrendingDown } from 'lucide-react'

const EquityChart = dynamic(() => import('./equity-chart'), { ssr: false, loading: () => <div className="h-72 flex items-center justify-center text-xs text-slate-500">Loading chart...</div> })
const MonthlyChart = dynamic(() => import('./monthly-chart'), { ssr: false, loading: () => <div className="h-60 flex items-center justify-center text-xs text-slate-500">Loading chart...</div> })

export default function CapitalClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/capital')
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
    } catch {
      setError('Failed to load capital data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading capital & performance..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  const account = data?.account ?? {}
  const ledger = data?.ledger ?? []
  const drawdowns = data?.drawdowns ?? []
  const doubleTarget = (account?.protectedCapital ?? 10000) * 2
  const doublePct = Math.min(100, ((account?.equity ?? 0) / Math.max(1, doubleTarget)) * 100)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Landmark className="h-5 w-5 text-emerald-400" /> Capital & Performance</h1>
        <p className="text-xs text-slate-500 mt-1">Protected capital is never risked beyond its floor. Profit capital unlocks only above the high-water mark.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Panel><Stat label="Balance" value={fmtMoney(account?.balance)} /></Panel>
        <Panel><Stat label="Equity" value={fmtMoney(account?.equity)} valueClass="text-cyan-300" /></Panel>
        <Panel><Stat label="Floating P/L" value={fmtSigned(account?.floatingPL)} valueClass={plColor(account?.floatingPL)} /></Panel>
        <Panel><Stat label="Protected Capital" value={fmtMoney(account?.protectedCapital)} valueClass="text-emerald-400" sub="never risked below floor" /></Panel>
        <Panel><Stat label="High-Water Mark" value={fmtMoney(account?.highWaterMark)} valueClass="text-amber-300" /></Panel>
        <Panel><Stat label="Profit Floor" value={fmtMoney(account?.profitFloor)} sub="locked profits" /></Panel>
      </div>

      <Panel title="Equity Curve with Drawdown Overlay (90 days)" icon={LineChartIcon} accent="emerald">
        <div className="h-72">
          <EquityChart points={data?.equityCurve ?? []} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Monthly P/L" icon={BarChart3} accent="cyan">
          <div className="h-60">
            <MonthlyChart monthly={data?.monthly ?? []} />
          </div>
        </Panel>

        <Panel title="Doubling Milestone & Loss Guards" icon={TrendingDown} accent="amber">
          <div className="mb-4">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Progress to capital doubling ({fmtMoney(doubleTarget)})</span>
              <span className="num text-amber-300">{fmtPct(doublePct, 1)}</span>
            </div>
            <div className="h-2 rounded bg-slate-800 overflow-hidden">
              <div className="h-full rounded bg-gradient-to-r from-emerald-500 to-amber-400" style={{ width: `${doublePct}%` }} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">On doubling, EMIL proposes locking the original capital and trading only with profits.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Daily P/L" value={fmtSigned(account?.dailyPL)} valueClass={plColor(account?.dailyPL)} />
            <Stat label="Weekly P/L" value={fmtSigned(account?.weeklyPL)} valueClass={plColor(account?.weeklyPL)} />
            <Stat label="Monthly P/L" value={fmtSigned(account?.monthlyPL)} valueClass={plColor(account?.monthlyPL)} />
          </div>
          <div className="mt-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Drawdown Events</h4>
            <div className="space-y-1.5">
              {drawdowns.map((d: any) => (
                <div key={d?.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 capitalize">{(d?.level ?? '').replace(/_/g, ' ')} · {d?.action}</span>
                  <span className="num text-amber-300">{fmtPct(d?.drawdownPct)} / {fmtPct(d?.thresholdPct)}</span>
                </div>
              ))}
              {drawdowns.length === 0 ? <p className="text-xs text-slate-500">No drawdown events.</p> : null}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Capital Ledger" icon={BookOpen} accent="violet">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Amount</th><th className="py-2 pr-3">Balance After</th><th className="py-2 pr-3">Equity After</th><th className="py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((l: any) => (
                <tr key={l?.id} className="border-b border-border/40 text-[11px] text-slate-300 hover:bg-slate-800/30">
                  <td className="py-2 pr-3 text-slate-500 num">{l?.createdAt ? new Date(l.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '-'}</td>
                  <td className="py-2 pr-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${l?.entryType === 'profit_lock' ? 'bg-emerald-500/15 text-emerald-400' : l?.entryType === 'milestone' ? 'bg-amber-500/15 text-amber-400' : l?.entryType === 'hwm_update' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-slate-700/40 text-slate-300'}`}>{(l?.entryType ?? '').replace(/_/g, ' ')}</span></td>
                  <td className={`py-2 pr-3 num font-semibold ${plColor(l?.amount)}`}>{fmtSigned(l?.amount)}</td>
                  <td className="py-2 pr-3 num">{fmtMoney(l?.balanceAfter)}</td>
                  <td className="py-2 pr-3 num">{fmtMoney(l?.equityAfter)}</td>
                  <td className="py-2 text-slate-500">{l?.note ?? '-'}</td>
                </tr>
              ))}
              {ledger.length === 0 ? <tr><td colSpan={6} className="py-4 text-center text-xs text-slate-500">Ledger is empty.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
