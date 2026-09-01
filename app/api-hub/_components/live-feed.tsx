'use client'

// Live Indian market data over the Upstox Market Data Feed V3 websocket.
// The browser never sees the access token: the server exchanges it for a
// short-lived pre-authorized wss:// URL (fn=feed_authorize). Messages are
// protobuf-encoded per the official MarketDataFeed.proto (served by fn=proto)
// and decoded client-side with protobufjs.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel } from '@/components/cockpit/panel'
import { Radio, Plug, Square, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_KEYS = 'NSE_INDEX|Nifty 50, NSE_INDEX|Nifty Bank, BSE_INDEX|SENSEX, NSE_EQ|INE002A01018'

type Tick = { ltp?: number; cp?: number; ltt?: number; vtt?: number; atp?: number; oi?: number; dir?: 'up' | 'down' | '' }

export default function LiveFeedPanel() {
  const [keys, setKeys] = useState(DEFAULT_KEYS)
  const [mode, setMode] = useState<'ltpc' | 'full'>('ltpc')
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [ticks, setTicks] = useState<Record<string, Tick>>({})
  const [marketStatus, setMarketStatus] = useState<Record<string, string>>({})
  const [restBusy, setRestBusy] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const decoderRef = useRef<any>(null)

  const disconnect = useCallback(() => {
    wsRef.current?.close?.()
    wsRef.current = null
    setStatus('idle')
    setStatusMsg('Disconnected.')
  }, [])

  useEffect(() => () => { wsRef.current?.close?.() }, [])

  const extractTick = (feed: any): Tick => {
    const ltpc = feed?.ltpc ?? feed?.fullFeed?.marketFF?.ltpc ?? feed?.fullFeed?.indexFF?.ltpc ?? feed?.firstLevelWithGreeks?.ltpc
    const ff = feed?.fullFeed?.marketFF
    return {
      ltp: typeof ltpc?.ltp === 'number' ? ltpc.ltp : undefined,
      cp: typeof ltpc?.cp === 'number' ? ltpc.cp : undefined,
      ltt: ltpc?.ltt ? Number(ltpc.ltt) : undefined,
      vtt: ff?.vtt ? Number(ff.vtt) : undefined,
      atp: typeof ff?.atp === 'number' ? ff.atp : undefined,
      oi: typeof ff?.oi === 'number' ? ff.oi : undefined,
    }
  }

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'live') return
    const instrumentKeys = keys.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 100)
    if (instrumentKeys.length === 0) { toast.error('Add at least one instrument key.'); return }
    setStatus('connecting')
    setStatusMsg('Requesting authorized feed URL...')
    try {
      // 1. Load + parse the official proto schema (once).
      if (!decoderRef.current) {
        const [pbMod, protoRes] = await Promise.all([
          import('protobufjs'),
          fetch('/api/india/upstox?fn=proto'),
        ])
        const protobuf: any = (pbMod as any).default ?? pbMod
        if (!protoRes.ok) throw new Error('Failed to load the feed schema.')
        const protoText = await protoRes.text()
        const root = protobuf.parse(protoText).root
        decoderRef.current = root.lookupType('com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse')
      }
      // 2. Server exchanges the stored token for a pre-authorized wss URL.
      const authRes = await fetch('/api/india/upstox?fn=feed_authorize')
      const auth = await authRes.json()
      if (!authRes.ok || !auth?.wssUrl) throw new Error(auth?.message ?? 'Feed authorization failed.')

      setStatusMsg(`Connecting to Upstox feed (${auth.via})...`)
      const ws = new WebSocket(auth.wssUrl)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('live')
        setStatusMsg(`Live — ${instrumentKeys.length} instrument(s), mode ${mode}.`)
        const sub = { guid: `emil-${Math.random().toString(36).slice(2, 12)}`, method: 'sub', data: { mode, instrumentKeys } }
        ws.send(new TextEncoder().encode(JSON.stringify(sub)))
      }
      ws.onmessage = (ev) => {
        try {
          const FeedResponse = decoderRef.current
          const msg = FeedResponse.decode(new Uint8Array(ev.data as ArrayBuffer))
          const obj = FeedResponse.toObject(msg, { enums: String, longs: Number, defaults: false })
          if (obj?.marketInfo?.segmentStatus) setMarketStatus(obj.marketInfo.segmentStatus)
          if (obj?.feeds) {
            setTicks((prev) => {
              const next = { ...prev }
              for (const [k, feed] of Object.entries<any>(obj.feeds)) {
                const t = extractTick(feed)
                const old = prev[k]
                next[k] = { ...old, ...t, dir: t.ltp !== undefined && old?.ltp !== undefined ? (t.ltp > old.ltp ? 'up' : t.ltp < old.ltp ? 'down' : old.dir ?? '') : '' }
              }
              return next
            })
          }
        } catch {
          /* skip undecodable frame */
        }
      }
      ws.onerror = () => {
        setStatus('error')
        setStatusMsg('Websocket error — the feed dropped. Tokens expire daily at 03:30 IST.')
      }
      ws.onclose = (ev) => {
        if (wsRef.current === ws) {
          wsRef.current = null
          setStatus((s) => (s === 'error' ? 'error' : 'idle'))
          setStatusMsg((m) => m || `Feed closed (${ev.code}).`)
        }
      }
    } catch (e: any) {
      setStatus('error')
      setStatusMsg(e?.message ?? 'Connection failed.')
      toast.error(e?.message ?? 'Live feed connection failed.')
    }
  }, [keys, mode, status])

  const restSnapshot = useCallback(async () => {
    if (restBusy) return
    setRestBusy(true)
    try {
      const instrumentKeys = keys.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 50)
      const res = await fetch(`/api/india/upstox?fn=ltp&keys=${encodeURIComponent(instrumentKeys.join(','))}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d?.message ?? d?.error ?? 'Snapshot failed')
      const next: Record<string, Tick> = {}
      for (const [k, v] of Object.entries<any>(d?.data ?? {})) {
        next[v?.instrument_token ?? k] = { ltp: v?.last_price, cp: undefined, dir: '' }
      }
      setTicks((prev) => ({ ...prev, ...next }))
      toast.success(`REST snapshot: ${Object.keys(d?.data ?? {}).length} quotes.`)
    } catch (e: any) {
      toast.error(e?.message ?? 'REST snapshot failed.')
    } finally {
      setRestBusy(false)
    }
  }, [keys, restBusy])

  const rows = Object.entries(ticks)
  const chgPct = (t: Tick) => (t.ltp !== undefined && t.cp ? ((t.ltp - t.cp) / t.cp) * 100 : undefined)

  return (
    <Panel title="Live Market Feed — Upstox V3 Websocket (NSE / BSE / MCX)" icon={Radio} accent="emerald">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
        <label className="text-[11px] text-slate-500 block">Instrument keys (comma-separated, e.g. NSE_INDEX|Nifty 50, NSE_EQ|INE002A01018, MCX_FO|...)
          <textarea value={keys} onChange={(e) => setKeys(e?.target?.value ?? '')} rows={2} disabled={status === 'live'} className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white font-mono" />
        </label>
        <div className="flex lg:flex-col gap-2 pt-1">
          <select value={mode} onChange={(e) => setMode(e.target.value === 'full' ? 'full' : 'ltpc')} disabled={status === 'live'} className="rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white">
            <option value="ltpc">ltpc — price only</option>
            <option value="full">full — depth + OHLC</option>
          </select>
          {status === 'live' ? (
            <button onClick={disconnect} className="flex items-center justify-center gap-1.5 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 transition-colors"><Square className="h-3.5 w-3.5" /> DISCONNECT</button>
          ) : (
            <button onClick={connect} disabled={status === 'connecting'} className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-colors"><Plug className="h-3.5 w-3.5" /> {status === 'connecting' ? 'CONNECTING...' : 'CONNECT LIVE'}</button>
          )}
          <button onClick={restSnapshot} disabled={restBusy} className="flex items-center justify-center gap-1.5 rounded-md bg-slate-700/60 hover:bg-slate-600/60 disabled:opacity-50 text-slate-200 text-[11px] px-3 py-1.5 transition-colors"><RefreshCcw className="h-3 w-3" /> REST snapshot</button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className={`h-2 w-2 rounded-full ${status === 'live' ? 'bg-emerald-500 pulse-dot' : status === 'connecting' ? 'bg-amber-500 pulse-dot' : status === 'error' ? 'bg-red-500' : 'bg-slate-600'}`} />
        <span className="text-[11px] text-slate-400">{statusMsg || 'Idle. Requires the Upstox daily access token saved in the Broker APIs section below.'}</span>
        {Object.entries(marketStatus).slice(0, 6).map(([seg, st]) => (
          <span key={seg} className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${String(st).includes('OPEN') && !String(st).includes('PRE') ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-slate-400 border-slate-600/50 bg-slate-700/30'}`}>{seg}: {String(st).replace(/_/g, ' ')}</span>
        ))}
      </div>

      {rows.length > 0 ? (
        <div className="mt-3 overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="py-1.5 pr-3">Instrument</th>
                <th className="py-1.5 pr-3">LTP</th>
                <th className="py-1.5 pr-3">Chg %</th>
                <th className="py-1.5 pr-3">Prev Close</th>
                {mode === 'full' ? <><th className="py-1.5 pr-3">Volume</th><th className="py-1.5 pr-3">ATP</th><th className="py-1.5 pr-3">OI</th></> : null}
                <th className="py-1.5">Last Trade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, t]) => {
                const pct = chgPct(t)
                return (
                  <tr key={k} className="border-b border-border/40">
                    <td className="py-1.5 pr-3 text-[11px] text-slate-200 font-mono whitespace-nowrap">{k}</td>
                    <td className={`py-1.5 pr-3 num text-[12px] font-semibold ${t.dir === 'up' ? 'text-emerald-400' : t.dir === 'down' ? 'text-red-400' : 'text-white'}`}>{t.ltp?.toLocaleString('en-IN') ?? '—'}</td>
                    <td className={`py-1.5 pr-3 num text-[11px] ${pct === undefined ? 'text-slate-500' : pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pct === undefined ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`}</td>
                    <td className="py-1.5 pr-3 num text-[11px] text-slate-400">{t.cp?.toLocaleString('en-IN') ?? '—'}</td>
                    {mode === 'full' ? <>
                      <td className="py-1.5 pr-3 num text-[11px] text-slate-400">{t.vtt?.toLocaleString('en-IN') ?? '—'}</td>
                      <td className="py-1.5 pr-3 num text-[11px] text-slate-400">{t.atp?.toLocaleString('en-IN') ?? '—'}</td>
                      <td className="py-1.5 pr-3 num text-[11px] text-slate-400">{t.oi?.toLocaleString('en-IN') ?? '—'}</td>
                    </> : null}
                    <td className="py-1.5 num text-[10px] text-slate-500 whitespace-nowrap">{t.ltt ? new Date(t.ltt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-slate-500">
          No ticks yet. Outside NSE/BSE market hours (09:15–15:30 IST) the feed sends the market status and a snapshot only.
          Modes: ltpc (price), full (depth + OHLC). Normal accounts: 2 connections, up to 2,000 combined keys.
        </p>
      )}
    </Panel>
  )
}
