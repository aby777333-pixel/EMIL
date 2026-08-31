'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { MODE_LABELS, fmtPct, fmtNum } from '@/lib/format'
import { ShieldAlert, Power, PowerOff, ListChecks, SlidersHorizontal, AlertTriangle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const MODES: { key: string; desc: string; exec: boolean }[] = [
  { key: 'observation', desc: 'Analyze and learn. No trading recommendation required. No execution.', exec: false },
  { key: 'advisory', desc: 'Provides direction, entry, stop, targets, size, risk, confidence and reasoning. No execution.', exec: false },
  { key: 'confirmation', desc: 'EMIL prepares a complete trade. The trader explicitly approves each one.', exec: false },
  { key: 'assisted', desc: 'The trader enters. EMIL manages authorized: stop, TP, break-even, trailing, partial exit, risk alerts, emergency exit.', exec: true },
  { key: 'semi_autonomous', desc: 'EMIL can trade only within approved strategies, assets, sessions, risk and lot limits.', exec: true },
  { key: 'autonomous', desc: 'EMIL may scan, analyse, enter, manage, hedge and exit — but only inside hard permissions.', exec: true },
  { key: 'management_only', desc: 'No new directional trades. EMIL may protect, reduce, manage, hedge and close.', exec: true },
  { key: 'capital_protection', desc: 'Only actions that reduce account risk are permitted.', exec: true },
  { key: 'emergency', desc: 'Stop new exposure immediately.', exec: false },
]

const ACKS = [
  'I understand that trading can produce substantial financial losses.',
  'I understand EMIL may act automatically within the permissions shown above.',
  'I understand 0.05 lots is the current default maximum EMIL-controlled exposure.',
  'I understand hedging can introduce additional risk and costs.',
  'I understand stop-loss orders may experience slippage or gaps.',
  'I understand I remain responsible for the permissions and risk settings I authorize.',
]

const DISARM_OPTIONS = [
  { key: 'pause_new', title: 'Pause New Trades', desc: 'No new entries. Continue managing existing positions.' },
  { key: 'management_only', title: 'Management Only', desc: 'No new directional exposure. Continue defensive management.' },
  { key: 'stop_automation', title: 'Fully Stop Automation', desc: 'No automated modifications. Broker-side SL/TP remain active. Remaining positions stay exposed to the market.' },
  { key: 'stop_close_all', title: 'Stop and Close All', desc: 'Cancel pending orders, close open positions, close hedges, verify fills, report failures.' },
]

const HOLD_MS = 2500

export default function ArmClient() {
  const [state, setState] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('semi_autonomous')
  const [acks, setAcks] = useState<boolean[]>(ACKS.map(() => false))
  const [holdPct, setHoldPct] = useState(0)
  const [busy, setBusy] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdStart = useRef<number>(0)

  const load = useCallback(async () => {
    try {
      const [sRes, rRes] = await Promise.all([fetch('/api/state'), fetch('/api/risk')])
      const sData = await sRes?.json?.()
      const rData = await rRes?.json?.()
      setState(sData?.state ?? null)
      setProfile(rData?.profile ?? null)
      if (sData?.state?.mode) setMode(sData?.state?.mode === 'observation' ? 'semi_autonomous' : sData?.state?.mode)
    } catch {
      setError('Failed to load EMIL state.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const allAcked = acks?.every?.(Boolean) ?? false
  const armed = state?.armed ?? false

  const doArm = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'arm', mode, checkboxes: ACKS }),
      })
      if (!res?.ok) throw new Error('arm failed')
      toast.success(`EMIL armed in ${MODE_LABELS?.[mode] ?? mode} mode. Acceptance logged.`)
      window.dispatchEvent(new Event('emil-state-changed'))
      setAcks(ACKS.map(() => false))
      await load()
    } catch {
      toast.error('Failed to arm EMIL.')
    } finally {
      setBusy(false)
    }
  }, [busy, mode, load])

  const startHold = useCallback(() => {
    if (!allAcked || armed || busy) return
    holdStart.current = Date.now()
    if (holdTimer.current) clearInterval(holdTimer.current)
    holdTimer.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - (holdStart?.current ?? 0)) / HOLD_MS) * 100)
      setHoldPct(pct)
      if (pct >= 100) {
        if (holdTimer.current) clearInterval(holdTimer.current)
        holdTimer.current = null
        setHoldPct(0)
        doArm()
      }
    }, 40)
  }, [allAcked, armed, busy, doArm])

  const cancelHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current)
    holdTimer.current = null
    setHoldPct(0)
  }, [])

  useEffect(() => () => { if (holdTimer.current) clearInterval(holdTimer.current) }, [])

  const doDisarm = useCallback(async (option: string) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disarm', option }),
      })
      if (!res?.ok) throw new Error('disarm failed')
      toast.success('Disarm instruction executed and logged. Turning EMIL off does not automatically remove market risk.')
      window.dispatchEvent(new Event('emil-state-changed'))
      await load()
    } catch {
      toast.error('Failed to execute disarm option.')
    } finally {
      setBusy(false)
    }
  }, [busy, load])

  const changeMode = useCallback(async (m: string) => {
    setMode(m)
    if (!armed) return
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mode_change', mode: m }),
      })
      if (res?.ok) {
        toast.success(`Operating mode changed to ${MODE_LABELS?.[m] ?? m}.`)
        window.dispatchEvent(new Event('emil-state-changed'))
        await load()
      }
    } catch {
      toast.error('Mode change failed.')
    }
  }, [armed, load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading arming console..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  const reviewRows: [string, string][] = [
    ['Mode', MODE_LABELS?.[mode] ?? mode],
    ['Base lot', fmtNum(profile?.baseLot ?? 0.01, 2)],
    ['Maximum aggregate EMIL exposure', `${fmtNum(profile?.maxAggregateExposure ?? 0.05, 2)} lots unless expressly overridden`],
    ['Maximum risk per trade', fmtPct(profile?.maxRiskPerTradePct ?? 0.5)],
    ['Daily loss limit', fmtPct(profile?.dailyLossLimitPct ?? 2)],
    ['Weekly loss limit', fmtPct(profile?.weeklyLossLimitPct ?? 5)],
    ['Maximum drawdown', fmtPct(profile?.maxDrawdownPct ?? 8)],
    ['Maximum margin utilization', fmtPct(profile?.maxMarginUtilPct ?? 25)],
    ['Maximum open positions', String(profile?.maxOpenPositions ?? 4)],
    ['Allowed assets', profile?.allowedAssetClasses ?? 'forex, metals, indices'],
    ['Allowed sessions', profile?.allowedSessions ?? 'London, New York'],
    ['Hedge permission', profile?.hedgePermitted ? 'Granted' : 'Denied'],
    ['News-event behavior', (profile?.newsBehavior ?? 'pause_before_high_impact').replace(/_/g, ' ')],
    ['Profit Capital Mode', 'Off (protected capital preserved)'],
    ['Emergency behavior', 'Stop new exposure immediately; defensive management only'],
  ]

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-cyan-400" /> ARM / DISARM EMIL
          </h1>
          <p className="text-xs text-slate-500 mt-1">EMIL cannot silently turn itself on. Every activation requires explicit disclosure, review and consent.</p>
        </div>
        <div className={`px-3 py-1.5 rounded-md text-xs font-bold tracking-wider ${armed ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700/40 text-slate-400 border border-slate-600/50'}`}>
          {armed ? `ARMED — ${MODE_LABELS?.[state?.mode] ?? state?.mode}` : 'DISARMED'}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Panel title="EMIL Autonomous Trading Disclosure" icon={AlertTriangle} accent="amber">
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>EMIL is an AI-assisted trading system capable of analyzing markets and, depending on the permissions you select, opening, modifying, hedging and closing trades.</p>
              <p className="text-amber-300 font-semibold">Trading carries substantial financial risk.</p>
              <p>EMIL cannot guarantee profit, eliminate losses, predict market movements with certainty, prevent gaps, prevent slippage, guarantee stop-loss execution, eliminate liquidity risk, eliminate broker risk, or eliminate technology failure.</p>
              <p>Historical results, simulations, backtests, AI predictions, strategy confidence and previous profitable trades do not guarantee future performance.</p>
            </div>
          </Panel>

          <Panel title="Operating Mode" icon={SlidersHorizontal} accent="cyan">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => changeMode(m.key)}
                  className={`text-left rounded-md border p-3 transition-all ${mode === m.key ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-border bg-background/40 hover:border-slate-600'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${mode === m.key ? 'text-cyan-300' : 'text-slate-300'}`}>{MODE_LABELS?.[m.key] ?? m.key}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.exec ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>{m.exec ? 'CAN ACT' : 'NO EXECUTION'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{m.desc}</p>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Before Activating EMIL, Review" icon={ListChecks} accent="cyan">
            <div className="divide-y divide-border/60">
              {reviewRows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 gap-4">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs text-slate-200 font-medium text-right num">{v}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Required Acknowledgements" icon={CheckCircle2} accent="amber">
            <div className="space-y-2">
              {ACKS.map((a, i) => (
                <label key={a} className="flex items-start gap-3 cursor-pointer rounded-md border border-border bg-background/40 p-2.5 hover:border-slate-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={acks?.[i] ?? false}
                    onChange={() => setAcks((prev) => (prev ?? []).map((v, j) => (j === i ? !v : v)))}
                    className="mt-0.5 h-4 w-4 accent-cyan-500"
                  />
                  <span className="text-xs text-slate-300 leading-snug">{a}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-3">No checkbox is pre-selected. All six acknowledgements are required. The acceptance is logged with timestamp, mode and risk parameters.</p>

            <div className="mt-4">
              <button
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                disabled={!allAcked || armed || busy}
                className={`relative w-full overflow-hidden rounded-md py-4 text-sm font-bold tracking-widest transition-all select-none ${
                  armed ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : allAcked ? 'bg-cyan-600 hover:bg-cyan-500 text-white terminal-glow' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span className="absolute inset-y-0 left-0 bg-emerald-500/40 transition-none" style={{ width: `${holdPct ?? 0}%` }} />
                <span className="relative flex items-center justify-center gap-2">
                  <Power className="h-4 w-4" />
                  {armed ? 'EMIL IS ARMED' : holdPct > 0 ? `HOLD TO ARM... ${Math.round(holdPct)}%` : 'PRESS AND HOLD TO ARM EMIL'}
                </span>
              </button>
              {!allAcked && !armed ? <p className="text-[11px] text-amber-400/80 mt-2">Complete all acknowledgements to enable the arming control.</p> : null}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Disarm EMIL Safely" icon={PowerOff} accent="red">
        <p className="text-xs text-slate-400 mb-3">OFF is not a blind switch. Choose exactly what should stop. Turning EMIL off does <span className="text-red-400 font-semibold">not</span> automatically remove market risk.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {DISARM_OPTIONS.map((o) => (
            <div key={o.key} className="rounded-md border border-border bg-background/40 p-3 flex flex-col">
              <h3 className="text-xs font-bold text-slate-200">{o.title}</h3>
              <p className="text-[11px] text-slate-500 mt-1 flex-1 leading-snug">{o.desc}</p>
              <button
                onClick={() => doDisarm(o.key)}
                disabled={busy}
                className={`mt-3 rounded-md py-2 text-xs font-semibold transition-colors ${o.key === 'stop_close_all' ? 'bg-red-600/80 hover:bg-red-600 text-white' : 'bg-slate-700/60 hover:bg-slate-600/60 text-slate-200'}`}
              >
                {o.key === 'stop_close_all' ? 'STOP & CLOSE ALL' : 'EXECUTE'}
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
