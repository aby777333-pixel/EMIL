'use client'

// Paper Trading Desk — EMIL's first end-to-end execution loop. Orders go
// through /api/execution → lib/execution/router (tier check, paper/live gate,
// notional cap, journal + audit) → the venue adapter. Testnet/sandbox rows
// are always PAPER; live rows need the live_crypto_execution flag + ARM.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Beaker, RefreshCw, ShieldAlert, ShieldCheck, Wallet, Layers, ListOrdered, ScrollText, XCircle, Info, Plug } from 'lucide-react'
import { toast } from 'sonner'
import { Panel, LoadingPanel, Stat } from '@/components/cockpit/panel'

type Venue = { key: string; name: string; vendor: string; paper: boolean; connected: boolean; tier: string | null; status: string; eligible: boolean; reason: string | null }
type Inst = { symbol: string; base: string; quote: string; kind: string; tickSize?: number; minQty?: number; qtyStep?: number; contractSize?: number; qtyUnit: string }
type Ticker = { symbol: string; bid?: number; ask?: number; last?: number; mark?: number; ts: number }
type Order = { id: string; symbol: string; side: string; type: string; qty: number; price?: number; filledQty: number; avgFillPrice?: number; status: string; ts: number }
type Position = { symbol: string; qty: number; entryPrice?: number; markPrice?: number; unrealizedPnl?: number }
type Balance = { asset: string; total: number; available: number }
type LogRow = { id: string; symbol: string; side: string; orderType: string; qty: number; price?: number | null; notionalUsd?: number | null; status: string; filledQty: number; avgFillPrice?: number | null; message?: string | null; venueOrderId?: string | null; createdAt: string; refPrice?: number | null; slippageBps?: number | null; quoteLatencyMs?: number | null; guardNotes?: string | null }
type Slot<T> = { data: T | null; error: string | null }
type Desk = {
  disabled?: boolean
  venues: Venue[]; isAdmin: boolean; armed: boolean; mode: string; liveExecutionEnabled: boolean; caps: { paper: number; live: number }
  guards?: { maxQuoteAgeMs: number; maxQuoteLatencyMs: number; maxSpreadBps: number; maxLimitDeviationPct: number; slippageAlertBps: number; duplicateWindowSec: number; maxOrdersPerDay: number }
  venue?: string; venueLabel?: string; paper?: boolean; venueError?: string
  instruments?: Slot<Inst[]>; balances?: Slot<Balance[]>; positions?: Slot<Position[]>; openOrders?: Slot<Order[]>; ticker?: Slot<Ticker | null>; log?: LogRow[]
}

const fmt = (n?: number | null, d = 2) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: d }))
const STATUS: Record<string, string> = {
  filled: 'text-emerald-300', partially_filled: 'text-cyan-300', open: 'text-amber-300', submitted: 'text-amber-300',
  cancelled: 'text-slate-400', rejected: 'text-red-400', error: 'text-red-400',
}

export default function PaperDeskClient() {
  const params = useSearchParams()
  const [desk, setDesk] = useState<Desk | null>(null)
  const [loading, setLoading] = useState(true)
  const [venue, setVenue] = useState<string>(params.get('venue') ?? '')
  const [symbol, setSymbol] = useState('')
  const [search, setSearch] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (venue) qs.set('venue', venue)
      if (venue && symbol) qs.set('symbol', symbol)
      const res = await fetch(`/api/execution?${qs}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) { if (!quiet) toast.error(data?.error ?? 'Failed to load the desk'); return }
      setDesk(data)
      if (!venue && Array.isArray(data?.venues)) {
        const first = data.venues.find((v: Venue) => v.eligible && v.paper) ?? data.venues.find((v: Venue) => v.eligible)
        if (first) setVenue(first.key)
      }
      if (venue && !symbol && data?.instruments?.data?.length) setSymbol(data.instruments.data[0].symbol)
    } finally {
      setLoading(false)
    }
  }, [venue, symbol])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!venue) return
    const t = setInterval(() => load(true), 15000)
    return () => clearInterval(t)
  }, [venue, load])

  const instruments = desk?.instruments?.data ?? []
  const inst = instruments.find((i) => i.symbol === symbol)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? instruments.filter((i) => i.symbol.toLowerCase().includes(q)) : instruments
  }, [instruments, search])
  const ticker = desk?.ticker?.data ?? null
  const current = desk?.venues?.find((v) => v.key === venue)
  const paper = !!desk?.paper
  const liveBlocked = !paper && current ? (!desk?.liveExecutionEnabled ? 'Live execution flag is OFF' : !desk?.armed ? 'EMIL is DISARMED' : !desk?.isAdmin ? 'Owner only' : null) : null

  const estNotional = useMemo(() => {
    const q = Number(qty)
    if (!venue || !Number.isFinite(q) || q <= 0) return null
    const ref = orderType === 'limit' ? Number(price) : (ticker?.mark ?? ticker?.last ?? (side === 'buy' ? ticker?.ask : ticker?.bid))
    if (!ref) return null
    if (venue.startsWith('deribit')) return q
    if (venue.startsWith('delta_exchange')) return q * (inst?.contractSize ?? 0.001) * ref
    return q * ref
  }, [qty, price, orderType, side, ticker, venue, inst])

  const place = async () => {
    if (!venue || !symbol) return
    setBusy(true)
    try {
      const res = await fetch('/api/execution', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'place', venue, symbol, side, orderType, qty: Number(qty), price: orderType === 'limit' ? Number(price) : undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data?.error ?? 'Order rejected'); return }
      const o = data?.order
      toast.success(`${side.toUpperCase()} ${qty} ${symbol} → ${String(o?.status ?? 'sent').replace('_', ' ')}${o?.filledQty ? ` · filled ${o.filledQty}${o.avgFillPrice ? ` @ ${fmt(o.avgFillPrice, 4)}` : ''}` : ''}`)
      setQty('')
      await load(true)
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (o: Order) => {
    setBusy(true)
    try {
      const res = await fetch('/api/execution', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cancel', venue, orderId: o.id, symbol: o.symbol }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data?.error ?? 'Cancel failed'); return }
      toast.success('Order cancelled.')
      await load(true)
    } finally {
      setBusy(false)
    }
  }

  if (loading && !desk) return <LoadingPanel text="Loading the trading desk…" />
  if (desk?.disabled) {
    return (
      <Panel title="Paper Trading Desk" icon={Beaker} accent="amber">
        <p className="text-sm text-slate-400">The trading desk is switched off by the platform owner (feature flag <span className="font-mono">paper_trading_desk</span>).</p>
      </Panel>
    )
  }

  const venues = desk?.venues ?? []
  const eligible = venues.filter((v) => v.eligible)

  return (
    <div className="space-y-4">
      {/* Environment banner */}
      <div className={`rounded-lg border px-4 py-3 flex flex-wrap items-center gap-3 ${paper || !venue ? 'border-amber-500/40 bg-amber-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
        {paper || !venue ? <Beaker className="h-5 w-5 text-amber-300 shrink-0" /> : <ShieldAlert className="h-5 w-5 text-red-300 shrink-0" />}
        <div className="min-w-0">
          <div className={`text-sm font-bold uppercase tracking-wider ${paper || !venue ? 'text-amber-200' : 'text-red-200'}`}>
            {!venue ? 'Paper Trading Desk' : paper ? `PAPER — ${desk?.venueLabel} · test funds only` : `LIVE — ${desk?.venueLabel} · real money`}
          </div>
          <div className="text-xs text-slate-400">
            {paper || !venue
              ? `Every order here runs through the same guarded router EMIL will use live: trading-tier link, per-order cap ($${fmt(desk?.caps?.paper, 0)} paper), journal + audit trail. Nothing touches real money.`
              : `Live orders need the live_crypto_execution flag, EMIL ARMED and the owner account. Per-order cap $${fmt(desk?.caps?.live, 0)}.`}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${desk?.armed ? 'border-emerald-500/40 text-emerald-300' : 'border-slate-500/40 text-slate-400'}`}>
            {desk?.armed ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />} {desk?.armed ? 'ARMED' : 'DISARMED'} · {desk?.mode}
          </span>
          <button onClick={() => load(true)} disabled={busy} className="rounded-md border border-border bg-secondary/60 px-2 py-1 text-slate-200 hover:border-cyan-500/50 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Refresh</button>
        </div>
      </div>

      {/* Venue picker */}
      <Panel title="Venue" icon={Plug} accent="cyan">
        <div className="flex flex-wrap gap-2">
          {venues.map((v) => (
            <button
              key={v.key}
              onClick={() => { if (v.eligible) { setVenue(v.key); setSymbol(''); setSearch('') } }}
              disabled={!v.eligible}
              title={v.reason ?? ''}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${venue === v.key ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-border bg-secondary/40'} ${v.eligible ? 'hover:border-cyan-500/40' : 'opacity-60 cursor-not-allowed'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{v.name}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${v.paper ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'}`}>{v.paper ? 'paper' : 'live'}</span>
              </div>
              <div className="text-[11px] text-slate-500">{v.eligible ? `Trading tier · ${v.status}` : v.reason}</div>
            </button>
          ))}
        </div>
        {eligible.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400 flex items-center gap-2">
            <Info className="h-4 w-4 text-cyan-400 shrink-0" />
            No venue is linked at the Trading tier yet. Open the <Link href="/api-hub" className="text-cyan-400 hover:underline">Global API Hub</Link>, press Connect on a testnet row (Deribit Testnet, Gemini Sandbox or Delta Demo) and choose the Trading tier.
          </p>
        ) : null}
        {desk?.venueError ? <p className="mt-3 text-xs text-red-400">{desk.venueError}</p> : null}
      </Panel>

      {venue && !desk?.venueError ? (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Left: instruments + ticket */}
          <div className="xl:col-span-2 space-y-4">
            <Panel title="Instruments" icon={Layers} accent="violet">
              {desk?.instruments?.error ? <p className="text-xs text-red-400">{desk.instruments.error}</p> : null}
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full mb-2 rounded-md bg-secondary/60 border border-border px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60" />
              <div className="max-h-56 overflow-y-auto flex flex-wrap gap-1.5">
                {filtered.map((i) => (
                  <button key={i.symbol} onClick={() => setSymbol(i.symbol)} className={`rounded-md border px-2 py-1 text-[11px] font-mono ${symbol === i.symbol ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200' : 'border-border bg-secondary/50 text-slate-300 hover:text-white'}`}>
                    {i.symbol}<span className="ml-1 text-[9px] uppercase text-slate-500">{i.kind}</span>
                  </button>
                ))}
                {filtered.length === 0 ? <span className="text-xs text-slate-500">No instruments.</span> : null}
              </div>
            </Panel>

            <Panel title={`Ticket — ${symbol || 'pick an instrument'}`} icon={Beaker} accent={paper ? 'amber' : 'red'}>
              {desk?.guards ? (
                <p className="mb-2 text-[10px] text-slate-500">
                  <span className="uppercase tracking-wider text-emerald-400/90 font-bold">Protections</span> · quote ≤ {desk.guards.maxQuoteAgeMs / 1000}s old · latency ≤ {desk.guards.maxQuoteLatencyMs} ms · spread ≤ {desk.guards.maxSpreadBps} bps for market orders · limit within {desk.guards.maxLimitDeviationPct}% of reference · duplicate window {desk.guards.duplicateWindowSec}s · {desk.guards.maxOrdersPerDay} orders/day · slippage alert &gt; {desk.guards.slippageAlertBps} bps · live orders refused while a circuit breaker is tripped
                </p>
              ) : null}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <Stat label="Bid" value={fmt(ticker?.bid, 4)} size="sm" />
                <Stat label="Ask" value={fmt(ticker?.ask, 4)} size="sm" />
                <Stat label="Last" value={fmt(ticker?.last, 4)} size="sm" />
                <Stat label="Mark" value={fmt(ticker?.mark ?? ticker?.last, 4)} size="sm" />
              </div>
              {desk?.ticker?.error ? <p className="text-[11px] text-red-400 mb-2">{desk.ticker.error}</p> : null}
              {inst ? (
                <p className="text-[11px] text-slate-500 mb-2">
                  Quantity in <span className="text-slate-300">{inst.qtyUnit}</span>{inst.minQty ? ` · min ${inst.minQty}` : ''}{inst.tickSize ? ` · tick ${inst.tickSize}` : ''}
                </p>
              ) : null}
              <div className="flex gap-1.5 mb-2">
                {(['buy', 'sell'] as const).map((s) => (
                  <button key={s} onClick={() => setSide(s)} className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-bold uppercase ${side === s ? (s === 'buy' ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200' : 'border-red-500/60 bg-red-500/15 text-red-200') : 'border-border bg-secondary/50 text-slate-400'}`}>{s}</button>
                ))}
                {(['market', 'limit'] as const).map((t) => (
                  <button key={t} onClick={() => setOrderType(t)} className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold uppercase ${orderType === t ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200' : 'border-border bg-secondary/50 text-slate-400'}`}>{t}</button>
                ))}
              </div>
              <div className="flex gap-1.5 mb-2">
                <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder={`Qty${inst ? ` (${inst.qtyUnit.split(' ')[0]})` : ''}`} className="flex-1 rounded-md bg-secondary/60 border border-border px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60" />
                {orderType === 'limit' ? (
                  <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="Limit price" className="flex-1 rounded-md bg-secondary/60 border border-border px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60" />
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={place}
                  disabled={busy || !symbol || !qty || !!liveBlocked || (orderType === 'limit' && !price)}
                  className={`rounded-md px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${side === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  {busy ? 'Sending…' : `${side === 'buy' ? 'Buy' : 'Sell'} ${paper ? '(paper)' : '(LIVE)'}`}
                </button>
                <span className="text-[11px] text-slate-500">
                  {liveBlocked ? <span className="text-red-400">{liveBlocked}</span> : estNotional !== null ? `≈ $${fmt(estNotional, 0)} notional` : ''}
                </span>
              </div>
              {venue.startsWith('gemini') ? <p className="mt-2 text-[10px] text-slate-500">Gemini has no native market order — “market” sends an immediate-or-cancel limit 2% through the touch.</p> : null}
            </Panel>
          </div>

          {/* Right: account state */}
          <div className="xl:col-span-3 space-y-4">
            <Panel title="Balances" icon={Wallet} accent="emerald">
              {desk?.balances?.error ? <p className="text-xs text-red-400">{desk.balances.error}</p> : null}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(desk?.balances?.data ?? []).slice(0, 8).map((b) => (
                  <Stat key={b.asset} label={b.asset} value={fmt(b.total, 4)} sub={`avail ${fmt(b.available, 4)}`} size="sm" />
                ))}
                {(desk?.balances?.data ?? []).length === 0 && !desk?.balances?.error ? <span className="text-xs text-slate-500">No balances returned.</span> : null}
              </div>
            </Panel>

            <Panel title="Positions" icon={Layers} accent="cyan">
              {desk?.positions?.error ? <p className="text-xs text-red-400">{desk.positions.error}</p> : null}
              {(desk?.positions?.data ?? []).length === 0 ? <p className="text-xs text-slate-500">{venue.startsWith('gemini') ? 'Spot venue — holdings appear under Balances.' : 'No open positions.'}</p> : (
                <Table head={['Symbol', 'Qty', 'Entry', 'Mark', 'Unrealised']} rows={(desk?.positions?.data ?? []).map((p) => [p.symbol, <span className={p.qty > 0 ? 'text-emerald-300' : 'text-red-300'}>{fmt(p.qty, 4)}</span>, fmt(p.entryPrice, 4), fmt(p.markPrice, 4), <span className={(p.unrealizedPnl ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}>{fmt(p.unrealizedPnl, 4)}</span>])} />
              )}
            </Panel>

            <Panel title="Open orders" icon={ListOrdered} accent="amber">
              {desk?.openOrders?.error ? <p className="text-xs text-red-400">{desk.openOrders.error}</p> : null}
              {(desk?.openOrders?.data ?? []).length === 0 ? <p className="text-xs text-slate-500">No open orders.</p> : (
                <Table head={['Symbol', 'Side', 'Type', 'Qty', 'Price', 'Filled', 'Status', '']} rows={(desk?.openOrders?.data ?? []).map((o) => [
                  o.symbol, <span className={o.side === 'buy' ? 'text-emerald-300' : 'text-red-300'}>{o.side}</span>, o.type, fmt(o.qty, 4), fmt(o.price, 4), fmt(o.filledQty, 4),
                  <span className={STATUS[o.status] ?? ''}>{o.status.replace('_', ' ')}</span>,
                  <button onClick={() => cancel(o)} disabled={busy} className="text-red-400 hover:text-red-300 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> cancel</button>,
                ])} />
              )}
            </Panel>

            <Panel title="EMIL order journal" icon={ScrollText} accent="violet">
              {(desk?.log ?? []).length === 0 ? <p className="text-xs text-slate-500">No orders sent from EMIL on this venue yet.</p> : (
                <Table head={['When', 'Symbol', 'Side', 'Type', 'Qty', 'Price', '≈ USD', 'Filled', 'Status']} rows={(desk?.log ?? []).map((o) => [
                  new Date(o.createdAt).toLocaleString(), o.symbol, <span className={o.side === 'buy' ? 'text-emerald-300' : 'text-red-300'}>{o.side}</span>, o.orderType, fmt(o.qty, 4), fmt(o.price, 4), fmt(o.notionalUsd, 0),
                  o.filledQty ? `${fmt(o.filledQty, 4)}${o.avgFillPrice ? ` @ ${fmt(o.avgFillPrice, 4)}` : ''}${o.slippageBps != null ? ` · slip ${o.slippageBps.toFixed(1)} bps` : ''}` : '—',
                  <span className={STATUS[o.status] ?? ''} title={o.message ?? ''}>{o.status.replace('_', ' ')}{o.message ? ' ⓘ' : ''}</span>,
                ])} />
              )}
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
            {head.map((h, i) => <th key={i} className="py-1.5 pr-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {r.map((c, j) => <td key={j} className="py-1.5 pr-3 font-mono text-slate-200 whitespace-nowrap">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
