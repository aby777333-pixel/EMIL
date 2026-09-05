'use client'

// Connect Your Platform (round B): MT5/MT4 bridge EA (read-only mirror),
// TradingView / generic alert webhooks, statement import. Everything the
// trader's own platform pushes INTO EMIL. Honest labels: mirrored numbers are
// real, EMIL never sends orders back to the terminal.

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Cable, Download, Copy, Trash2, RefreshCcw, Upload, Radio, Webhook, FileSpreadsheet, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success('Copied') } catch { toast.error('Clipboard blocked') } }
const ts = (s?: string | null) => (s ? String(s).slice(0, 19).replace('T', ' ') : '—')
const ago = (s?: string | null) => { if (!s) return 'never'; const m = Math.round((Date.now() - new Date(s).getTime()) / 1000); return m < 60 ? `${m}s ago` : m < 3600 ? `${Math.round(m / 60)}m ago` : `${Math.round(m / 3600)}h ago` }
const STATUS_TONE: Record<string, string> = { connected: 'text-emerald-300 border-emerald-500/40', pending: 'text-slate-400 border-slate-600/50', stale: 'text-amber-300 border-amber-500/40', error: 'text-red-300 border-red-500/40' }

export default function BridgeClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [reveal, setReveal] = useState<{ token: string; kind: string; label: string } | null>(null)
  const [draft, setDraft] = useState({ kind: 'mt5', label: '', mode: 'mirror', venue: 'deribit_testnet', qty: '' })
  const [csv, setCsv] = useState('')
  const [csvLabel, setCsvLabel] = useState('')
  const [open, setOpen] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/bridge', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      setData(await res.json())
    } catch { setError('Failed to load your platform connections.') }
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])

  const post = async (body: any, key: string, ok?: string) => {
    setBusy(key)
    try {
      const res = await fetch('/api/bridge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j?.error ?? 'Request failed'); return null }
      if (ok) toast.success(ok)
      await load()
      return j
    } finally { setBusy('') }
  }

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading your platform connections..." /></div>

  const base = data.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const mt = data.connections.filter((c: any) => c.kind === 'mt5' || c.kind === 'mt4')
  const hooks = data.connections.filter((c: any) => c.kind === 'tradingview' || c.kind === 'generic')
  const live = mt.filter((c: any) => c.status === 'connected')
  const equity = live.reduce((s: number, c: any) => s + (c.equity ?? 0), 0)
  const isMt = draft.kind === 'mt5' || draft.kind === 'mt4'

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Cable className="h-5 w-5 text-cyan-400" /> Connect Your Platform</h1>
        <p className="text-xs text-slate-500 mt-1">Bring the platform you already trade on into EMIL. MetaTrader mirrors your real account (read-only), TradingView and any other system send alerts to a private webhook, and statements import into the journal. EMIL never sends orders back to your terminal.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Platforms connected" value={data.connections.length} valueClass="text-cyan-300" sub={`${live.length} sending now`} />
        <Stat label="Mirrored equity" value={live.length ? equity.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'} valueClass="text-emerald-300" sub="real account numbers" />
        <Stat label="Open positions (mirrored)" value={mt.reduce((s: number, c: any) => s + c.positions.length, 0)} />
        <Stat label="Signals received" value={data.signals.length} sub={`${data.importedEntries} journal rows imported`} />
      </div>

      {reveal ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-200 font-semibold flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> Copy this token now — it is shown once. ({reveal.label})</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <code className="font-mono text-[11px] text-white bg-background/60 border border-border rounded px-2 py-1.5 break-all">{reveal.token}</code>
            <button onClick={() => copy(reveal.token)} className="flex items-center gap-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5"><Copy className="h-3 w-3" /> Copy</button>
            <button onClick={() => setReveal(null)} className="text-[11px] text-slate-400 hover:text-white">Stored</button>
          </div>
          {reveal.kind === 'mt5' || reveal.kind === 'mt4' ? (
            <ol className="mt-3 text-[11px] text-slate-300 list-decimal pl-5 space-y-1">
              <li>Download the EA: <a href={reveal.kind === 'mt5' ? '/bridge/EMIL_Bridge_MT5.mq5' : '/bridge/EMIL_Bridge_MT4.mq4'} download className="text-cyan-400 hover:underline">{reveal.kind === 'mt5' ? 'EMIL_Bridge_MT5.mq5' : 'EMIL_Bridge_MT4.mq4'}</a> and place it in <span className="font-mono">MQL{reveal.kind === 'mt5' ? '5' : '4'}/Experts</span>, then compile in MetaEditor (F7).</li>
              <li>In MetaTrader: Tools → Options → Expert Advisors → tick <em>Allow WebRequest for listed URL</em> and add <span className="font-mono text-white">{base}</span>.</li>
              <li>Attach the EA to any chart. Set <span className="font-mono">EmilUrl</span> = <span className="font-mono text-white">{base}/api/bridge/mt</span> and <span className="font-mono">EmilToken</span> = the token above. Enable Algo Trading.</li>
              <li>Within ~10 seconds this page shows the account as <span className="text-emerald-300">connected</span>.</li>
            </ol>
          ) : (
            <ol className="mt-3 text-[11px] text-slate-300 list-decimal pl-5 space-y-1">
              <li>Webhook URL: <span className="font-mono text-white break-all">{base}/api/hooks/tv/{reveal.token}</span> <button onClick={() => copy(`${base}/api/hooks/tv/${reveal.token}`)} className="text-cyan-400 hover:underline">copy URL</button></li>
              <li>TradingView → alert → Notifications → Webhook URL → paste. Message (recommended): <span className="font-mono text-white">{'{"symbol":"{{ticker}}","action":"buy","price":{{close}},"message":"{{strategy.order.comment}}"}'}</span>. Plain-text messages also work (EMIL extracts symbol, action and price).</li>
              <li>Any other system can POST the same JSON to that URL.</li>
            </ol>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Add a platform" icon={Radio} accent="cyan">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.kinds).map(([k, label]: any) => (
              <button key={k} onClick={() => setDraft((d) => ({ ...d, kind: k, mode: k === 'mt5' || k === 'mt4' ? 'mirror' : 'alerts' }))} className={`rounded-md border p-3 text-left ${draft.kind === k ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-border bg-background/40 hover:border-slate-600'}`}>
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{k === 'mt5' || k === 'mt4' ? 'Read-only EA streams account, positions, deals' : k === 'tradingview' ? 'Alerts → notifications, journal or paper copy' : 'JSON POST from any system'}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} placeholder="Label, e.g. IC Markets live" className="rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
            <select value={draft.mode} onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value }))} className="rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white">
              {Object.entries(data.modes).filter(([k]) => (isMt ? k === 'mirror' : k !== 'mirror')).map(([k, label]: any) => <option key={k} value={k}>{label}</option>)}
            </select>
            {draft.mode === 'paper_copy' ? (
              <>
                <select value={draft.venue} onChange={(e) => setDraft((d) => ({ ...d, venue: e.target.value }))} className="rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white">
                  {data.paperVenues.map((v: string) => <option key={v} value={v}>{v} (paper)</option>)}
                </select>
                <input value={draft.qty} onChange={(e) => setDraft((d) => ({ ...d, qty: e.target.value }))} placeholder="Default qty when the signal has none" inputMode="decimal" className="rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
              </>
            ) : null}
          </div>
          <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'create', ...draft }, 'create', 'Connection created.'); if (r?.token) setReveal({ token: r.token, kind: draft.kind, label: draft.label || data.kinds[draft.kind] }) }} className="mt-3 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold px-4 py-1.5">CREATE CONNECTION</button>
          <p className="text-[10px] text-slate-500 mt-2">Paper copy only ever reaches sandbox venues. Not available yet: cTrader, NinjaTrader, Interactive Brokers and Zerodha native sync — use the generic webhook or statement import for those today.</p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <a href="/bridge/EMIL_Bridge_MT5.mq5" download className="flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-[11px] text-slate-200 hover:text-white"><Download className="h-3 w-3" /> MT5 EA</a>
            <a href="/bridge/EMIL_Bridge_MT4.mq4" download className="flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-[11px] text-slate-200 hover:text-white"><Download className="h-3 w-3" /> MT4 EA</a>
          </div>
        </Panel>

        <Panel title={`Import a statement (${data.importedEntries} rows imported so far)`} icon={FileSpreadsheet} accent="emerald">
          <p className="text-[11px] text-slate-400">CSV from MT5 (Deals report), Interactive Brokers (Flex trade confirmations), Zerodha (tradebook) or any export with symbol, time, side, quantity, price and profit columns. Rows become journal entries; re-importing the same file adds nothing twice.</p>
          <div className="mt-2 flex gap-2 flex-wrap items-center">
            <label className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-[11px] text-slate-200 hover:text-white cursor-pointer"><Upload className="h-3 w-3" /> Choose CSV
              <input type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setCsvLabel(f.name); f.text().then(setCsv) }} />
            </label>
            {csvLabel ? <span className="text-[11px] text-slate-400">{csvLabel} · {csv.length.toLocaleString()} chars</span> : null}
          </div>
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="…or paste CSV text here" rows={4} className="mt-2 w-full rounded-md bg-background border border-border px-3 py-2 text-[11px] text-white font-mono" />
          <button disabled={!!busy || !csv.trim()} onClick={async () => { const r = await post({ type: 'import', csv, label: csvLabel || 'pasted statement' }, 'import'); if (r) { toast.success(`Imported ${r.created} trades (${r.duplicates} duplicates, ${r.skipped} skipped)`); setCsv(''); setCsvLabel('') } }} className="mt-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold px-4 py-1.5">IMPORT INTO JOURNAL</button>
        </Panel>
      </div>

      {mt.length > 0 ? (
        <Panel title={`MetaTrader accounts (${mt.length})`} icon={Cable} accent="emerald">
          <div className="space-y-3">
            {mt.map((c: any) => (
              <div key={c.id} className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold text-white">{c.label} <span className="text-[9px] uppercase text-slate-500 ml-1">{c.kind}</span> <span className={`ml-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_TONE[c.status] ?? ''}`}>{c.status}</span></p>
                    <p className="text-[10px] text-slate-500">{c.broker ?? 'awaiting first snapshot'}{c.accountNumber ? ` · #${c.accountNumber}` : ''}{c.server ? ` · ${c.server}` : ''} · last snapshot {ago(c.lastHeartbeatAt)} · token {c.tokenPrefix}…</p>
                    {c.lastError ? <p className="text-[10px] text-red-300 mt-0.5">{c.lastError}</p> : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'rotate', id: c.id }, `rot-${c.id}`, 'Token rotated — update the EA.'); if (r?.token) setReveal({ token: r.token, kind: c.kind, label: c.label }) }} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white"><RefreshCcw className="h-3 w-3" /> New token</button>
                    <button disabled={!!busy} onClick={() => { if (window.confirm(`Remove ${c.label}? Mirrored positions are deleted; the journal keeps imported rows.`)) post({ type: 'delete', id: c.id }, `d-${c.id}`, 'Removed.') }} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setOpen((o) => (o === c.id ? '' : c.id))} className="text-[10px] text-cyan-400 hover:underline">{open === c.id ? 'hide' : 'details'}</button>
                  </div>
                </div>
                {c.balance !== null ? (
                  <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-2">
                    {[['Balance', c.balance], ['Equity', c.equity], ['Floating P/L', c.floatingPnl], ['Margin', c.margin], ['Free margin', c.freeMargin], ['Leverage', c.leverage ? `1:${c.leverage}` : null]].map(([k, v]: any) => (
                      <div key={k} className="rounded bg-secondary/40 border border-border/60 px-2 py-1.5"><p className="text-[9px] uppercase tracking-wider text-slate-500">{k}</p><p className={`num text-sm font-semibold ${k === 'Floating P/L' ? (v >= 0 ? 'text-emerald-300' : 'text-red-300') : 'text-white'}`}>{typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v ?? '—'} {typeof v === 'number' && k !== 'Leverage' ? <span className="text-[9px] text-slate-500">{c.currency}</span> : null}</p></div>
                    ))}
                  </div>
                ) : null}
                {open === c.id ? (
                  <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Open positions ({c.positions.length})</p>
                      <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-left text-[10px]"><thead><tr className="text-slate-500 border-b border-border"><th className="py-1 pr-2">Ticket</th><th className="py-1 pr-2">Symbol</th><th className="py-1 pr-2">Side</th><th className="py-1 pr-2">Lots</th><th className="py-1 pr-2">Entry</th><th className="py-1 pr-2">Now</th><th className="py-1 pr-2">SL/TP</th><th className="py-1">P/L</th></tr></thead>
                        <tbody>{c.positions.map((p: any) => <tr key={p.id} className="border-b border-border/40"><td className="py-1 pr-2 num text-slate-500">{p.ticket}</td><td className="py-1 pr-2 text-white">{p.symbol}</td><td className={`py-1 pr-2 uppercase ${p.side === 'buy' ? 'text-emerald-300' : 'text-red-300'}`}>{p.side}</td><td className="py-1 pr-2 num">{p.volume}</td><td className="py-1 pr-2 num">{p.entryPrice}</td><td className="py-1 pr-2 num">{p.currentPrice ?? '—'}</td><td className="py-1 pr-2 num text-slate-500">{p.sl || '—'} / {p.tp || '—'}</td><td className={`py-1 num ${(p.profit ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{p.profit ?? '—'}</td></tr>)}{c.positions.length === 0 ? <tr><td colSpan={8} className="py-2 text-slate-500">No open positions.</td></tr> : null}</tbody></table></div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Recent deals</p>
                      <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-left text-[10px]"><thead><tr className="text-slate-500 border-b border-border"><th className="py-1 pr-2">Time</th><th className="py-1 pr-2">Symbol</th><th className="py-1 pr-2">Side</th><th className="py-1 pr-2">Lots</th><th className="py-1 pr-2">Price</th><th className="py-1">P/L</th></tr></thead>
                        <tbody>{c.deals.map((d: any) => <tr key={d.id} className="border-b border-border/40"><td className="py-1 pr-2 num text-slate-500">{ts(d.ts)}</td><td className="py-1 pr-2 text-white">{d.symbol}</td><td className={`py-1 pr-2 uppercase ${d.side === 'buy' ? 'text-emerald-300' : 'text-red-300'}`}>{d.side}</td><td className="py-1 pr-2 num">{d.volume}</td><td className="py-1 pr-2 num">{d.price}</td><td className={`py-1 num ${(d.profit ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{d.profit ?? '—'}</td></tr>)}{c.deals.length === 0 ? <tr><td colSpan={6} className="py-2 text-slate-500">No deals received yet.</td></tr> : null}</tbody></table></div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Mirrored accounts also appear in Portfolio &amp; Exposure. When floating drawdown crosses your daily loss limit EMIL warns you (bell, Telegram, email, webhooks) — it never closes positions on your platform.</p>
        </Panel>
      ) : null}

      {hooks.length > 0 ? (
        <Panel title={`Alert webhooks (${hooks.length})`} icon={Webhook} accent="amber">
          <div className="space-y-2">
            {hooks.map((c: any) => (
              <div key={c.id} className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{c.label} <span className="text-[9px] uppercase text-slate-500 ml-1">{c.kind}</span> <span className={`ml-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_TONE[c.status] ?? ''}`}>{c.status}</span></p>
                    <p className="text-[10px] text-slate-500">URL {base}/api/hooks/tv/{c.tokenPrefix}… · mode <span className="text-slate-300">{c.mode}</span>{c.meta?.venue ? ` → ${c.meta.venue}${c.meta.qty ? ` × ${c.meta.qty}` : ''}` : ''} · last signal {ago(c.lastHeartbeatAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select value={c.mode} disabled={!!busy} onChange={(e) => { const mode = e.target.value; const venue = mode === 'paper_copy' ? window.prompt('Sandbox venue for paper copies:', c.meta?.venue ?? 'deribit_testnet') : undefined; const qty = mode === 'paper_copy' ? window.prompt('Default qty when the signal has none:', String(c.meta?.qty ?? '')) : undefined; post({ type: 'set_mode', id: c.id, mode, venue, qty }, `m-${c.id}`, 'Mode updated.') }} className="rounded-md bg-background border border-border px-2 py-1 text-[10px] text-white">
                      {Object.keys(data.modes).filter((k) => k !== 'mirror').map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'rotate', id: c.id }, `rot-${c.id}`, 'New webhook URL — update TradingView.'); if (r?.token) setReveal({ token: r.token, kind: c.kind, label: c.label }) }} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white"><RefreshCcw className="h-3 w-3" /> New URL</button>
                    <button disabled={!!busy} onClick={() => { if (window.confirm(`Remove ${c.label}?`)) post({ type: 'delete', id: c.id }, `d-${c.id}`, 'Removed.') }} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-3 mb-1">Signal log</p>
          <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-left text-[10px]"><thead><tr className="text-slate-500 border-b border-border"><th className="py-1 pr-2">Received</th><th className="py-1 pr-2">Symbol</th><th className="py-1 pr-2">Action</th><th className="py-1 pr-2">Price</th><th className="py-1 pr-2">EMIL did</th><th className="py-1">Message / result</th></tr></thead>
            <tbody>{data.signals.map((s: any) => <tr key={s.id} className="border-b border-border/40"><td className="py-1 pr-2 num text-slate-500">{ts(s.receivedAt)}</td><td className="py-1 pr-2 text-white">{s.symbol ?? '—'}</td><td className="py-1 pr-2 uppercase text-cyan-300">{s.action}</td><td className="py-1 pr-2 num">{s.price ?? '—'}</td><td className="py-1 pr-2 font-mono text-slate-400">{s.handled ?? ''}</td><td className="py-1 text-slate-500 truncate max-w-[26rem]">{s.result ? <span className="text-amber-300">{s.result} · </span> : null}{s.message}</td></tr>)}{data.signals.length === 0 ? <tr><td colSpan={6} className="py-2 text-slate-500">No signals yet — fire a test alert from TradingView.</td></tr> : null}</tbody></table></div>
        </Panel>
      ) : null}
    </div>
  )
}
