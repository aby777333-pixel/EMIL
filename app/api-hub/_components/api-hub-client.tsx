'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import {
  Plug, Landmark, Clock3, Database, KeyRound, ShieldCheck, Activity,
  CalendarDays, CandlestickChart, ExternalLink, RefreshCw, Trash2, Star,
  Globe2, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import LiveFeedPanel from './live-feed'

const STATUS_STYLES: Record<string, string> = {
  connected: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  configured: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  error: 'bg-red-500/15 text-red-300 border-red-500/30',
  not_configured: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

const LIVE_STYLES: Record<string, string> = {
  open: 'text-emerald-400',
  pre_open: 'text-cyan-400',
  evening_session: 'text-amber-400',
  post_close: 'text-amber-400',
  closed: 'text-slate-500',
  weekend: 'text-slate-500',
  holiday: 'text-red-400',
}

const CRED_FIELDS: Record<string, { key: string; label: string; secret?: boolean }[]> = {
  api_key: [{ key: 'apiKey', label: 'API key', secret: true }],
  api_key_secret: [
    { key: 'apiKey', label: 'API key', secret: true },
    { key: 'apiSecret', label: 'API secret', secret: true },
    { key: 'clientCode', label: 'Passphrase / client id (if required)' },
  ],
  mt_account: [
    { key: 'clientCode', label: 'Account number' },
    { key: 'apiSecret', label: 'Account password', secret: true },
    { key: 'apiKey', label: 'Server name (e.g. ICMarketsSC-Live04)' },
  ],
  api_key_secret_daily_token: [
    { key: 'apiKey', label: 'API key', secret: true },
    { key: 'apiSecret', label: 'API secret', secret: true },
    { key: 'accessToken', label: 'Daily access / session token', secret: true },
  ],
  oauth2: [
    { key: 'apiKey', label: 'App ID / API key', secret: true },
    { key: 'apiSecret', label: 'App secret', secret: true },
    { key: 'accessToken', label: 'Access token (daily)', secret: true },
  ],
  totp_login: [
    { key: 'apiKey', label: 'API key', secret: true },
    { key: 'clientCode', label: 'Client code' },
    { key: 'accessToken', label: 'JWT token (from TOTP login)', secret: true },
  ],
  static_token: [{ key: 'accessToken', label: 'Access token (30-day)', secret: true }],
}

const PREVIEWS: Record<string, { fn: string; label: string }[]> = {
  dalalai: [
    { fn: 'predictions', label: 'AI predictions' },
    { fn: 'market_regime', label: 'Market regime' },
    { fn: 'smart_money', label: 'Smart money' },
    { fn: 'fii_dii', label: 'FII/DII flows' },
    { fn: 'breakout_scanner', label: 'Breakouts' },
  ],
  indianapi: [
    { fn: 'trending', label: 'Trending' },
    { fn: 'nse_most_active', label: 'NSE most active' },
    { fn: 'bse_most_active', label: 'BSE most active' },
    { fn: 'commodities', label: 'MCX commodities' },
    { fn: 'price_shockers', label: 'Price shockers' },
  ],
}

// Market-data & AI-signal providers and dedicated data vendors (not brokers).
const DATA_KEYS = ['dalalai', 'indianapi', 'truedata', 'gfdl', 'spider_iris']

const BROKER_SECTIONS: { key: string; title: string; note: string }[] = [
  { key: 'india', title: 'India — SEBI-Registered Brokers', note: 'NSE · BSE · MCX execution' },
  { key: 'forex', title: 'Forex & CFDs — Global Brokers', note: 'Forex, metals, indices, energies' },
  { key: 'us_stocks', title: 'US Stocks', note: 'NYSE · NASDAQ' },
  { key: 'europe_stocks', title: 'Europe Stocks', note: 'LSE · Euronext · XETRA' },
  { key: 'asia_stocks', title: 'Asia-Pacific Stocks', note: 'HKEX · TSE · SGX · ASX' },
  { key: 'crypto', title: 'Crypto Exchanges', note: 'Spot & derivatives · 24/7' },
]
// markets whose brokers live under the Forex & CFDs section
const FOREX_ALIAS = ['forex', 'metals', 'indices', 'energies']

const homeSection = (marketsCsv: string) => {
  const keys = (marketsCsv ?? 'india').split(',').map((s) => s.trim())
  for (const k of keys) {
    if (FOREX_ALIAS.includes(k)) return 'forex'
    if (BROKER_SECTIONS.some((s) => s.key === k)) return k
  }
  return 'india'
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_STYLES?.[status] ?? STATUS_STYLES.not_configured}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

function Chips({ csv, tone = 'text-slate-300 bg-secondary/70' }: { csv?: string | null; tone?: string }) {
  if (!csv) return null
  return (
    <div className="flex flex-wrap gap-1">
      {csv.split(',').map((c) => (
        <span key={c} className={`rounded px-1.5 py-0.5 text-[10px] border border-border/60 ${tone}`}>{c.trim()}</span>
      ))}
    </div>
  )
}

export default function ApiHubClient() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [openForm, setOpenForm] = useState('')
  const [previewSel, setPreviewSel] = useState<{ provider: string; fn: string } | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [marketsData, setMarketsData] = useState<any>(null)
  const [marketBusy, setMarketBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [res, mres] = await Promise.all([fetch('/api/india'), fetch('/api/markets')])
      if (!res?.ok) throw new Error('failed')
      setData(await res.json())
      if (mres?.ok) setMarketsData(await mres.json())
    } catch {
      setError('Failed to load the API hub.')
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleMarket = useCallback(async (key: string) => {
    const current: string[] = marketsData?.selected ?? []
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    if (next.length === 0) { toast.error('Keep at least one market selected.'); return }
    setMarketBusy(true)
    try {
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'set_selection', keys: next }),
      })
      const d = await res.json().catch(() => null)
      if (!res?.ok) throw new Error(d?.error ?? 'failed')
      setMarketsData((m: any) => ({ ...m, selected: d?.selected ?? next, explicit: true }))
      toast.success('Market selection saved.')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update markets.')
    } finally {
      setMarketBusy(false)
    }
  }, [marketsData])

  useEffect(() => { load() }, [load])

  const post = useCallback(async (body: any, okMsg: string) => {
    setBusyKey(`${body?.type}:${body?.key}`)
    try {
      const res = await fetch('/api/india', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json().catch(() => null)
      if (!res?.ok) throw new Error(d?.error ?? 'failed')
      if (body?.type === 'test_connection') {
        d?.ok ? toast.success(d?.message ?? okMsg) : toast.error(d?.message ?? 'Connection failed.')
      } else {
        toast.success(okMsg)
      }
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Request failed.')
    } finally {
      setBusyKey('')
    }
  }, [load])

  const saveCreds = useCallback((p: any) => {
    const draft = drafts?.[p?.key] ?? {}
    const filled = Object.fromEntries(Object.entries(draft).filter(([, v]) => String(v ?? '').trim() !== ''))
    if (Object.keys(filled).length === 0) { toast.error('Enter at least one credential field.'); return }
    post({ type: 'save_credentials', key: p?.key, ...filled }, `${p?.name} credentials saved server-side.`)
    setDrafts((d) => ({ ...d, [p?.key]: {} }))
    setOpenForm('')
  }, [drafts, post])

  const runPreview = useCallback(async (provider: string, fn: string) => {
    setPreviewSel({ provider, fn })
    setPreviewBusy(true)
    setPreview(null)
    try {
      const res = await fetch(`/api/india/market?provider=${provider}&fn=${fn}`)
      const d = await res.json().catch(() => null)
      if (res.status === 409) { setPreview({ notConfigured: true, message: d?.message }); return }
      if (!res.ok) { setPreview({ error: d?.message ?? 'Request failed.' }); return }
      setPreview({ data: d?.data })
    } catch {
      setPreview({ error: 'Request failed.' })
    } finally {
      setPreviewBusy(false)
    }
  }, [])

  if (loading) return <LoadingPanel text="Loading India API Hub…" />
  if (error) return <StatusMessage text={error} />

  const providers: any[] = data?.providers ?? []
  const dataProviders = DATA_KEYS.map((k) => providers.find((p) => p?.key === k)).filter(Boolean)
  const brokers = providers.filter((p) => !DATA_KEYS.includes(p?.key))
  const selectedMarkets: string[] = marketsData?.selected ?? []
  const marketVisible = (csv: string) =>
    selectedMarkets.length === 0 || (csv ?? 'india').split(',').some((k) => selectedMarkets.includes(k.trim()))
  const indiaOn = selectedMarkets.length === 0 || selectedMarkets.includes('india')
  const sessions: any[] = data?.sessions ?? []
  const instruments: any[] = data?.instruments ?? []
  const holidays: any[] = data?.holidays ?? []
  const byExchange = (ex: string) => instruments.filter((i) => i?.exchange === ex)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Plug className="h-5 w-5 text-cyan-400" /> Global Markets & API Hub
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Pick the markets EMIL trades — one or many. Forex & CFDs via MT5 brokers, India via DalalAI / IndianAPI + SEBI-registered broker APIs,
            US and other equity markets structure-ready with data feeds to follow. Every market runs through the same EMIL risk pipeline:
            Guardian, the aggregate exposure law and monetary-risk validation apply unchanged.
          </p>
        </div>
      </div>

      {/* Market selection */}
      <Panel title="Your Markets — select one or many" icon={Globe2} accent="cyan">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(marketsData?.markets ?? []).map((m: any) => {
            const selected = (marketsData?.selected ?? []).includes(m?.key)
            return (
              <button
                key={m?.id}
                onClick={() => toggleMarket(m?.key)}
                disabled={marketBusy}
                className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-60 ${selected ? 'border-cyan-500/60 bg-cyan-500/5' : 'border-border bg-secondary/30 hover:border-slate-600'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{m?.name}</span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-cyan-500 bg-cyan-500 text-slate-950' : 'border-slate-600 text-transparent'}`}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{m?.region} · {m?.exchanges}</div>
                <div className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">{m?.description}</div>
                <div className="mt-2">
                  {m?.dataStatus === 'live' ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">Live</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">Data coming soon</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          EMIL scans and proposes trades only in your selected markets. Markets marked “data coming soon” are structure-ready — instruments and
          risk normalization exist, the live feed lands next. Selection is per user and every change is audit-logged.
        </p>
      </Panel>

      {/* Exchange sessions (India) */}
      {indiaOn ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {sessions.map((s) => (
          <div key={s?.id} className="rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">{s?.exchange} <span className="text-slate-500 font-normal">{s?.segment}</span></span>
              <Clock3 className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className={`text-sm font-medium mt-1 ${LIVE_STYLES?.[s?.live?.status] ?? 'text-slate-400'}`}>{s?.live?.label}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 num">
              {s?.open}–{s?.close}{s?.eveningClose ? ` / eve → ${s.eveningClose}` : ''} IST · now {s?.live?.istClock}
            </div>
          </div>
        ))}
      </div>
      ) : null}

      {/* Data providers: DalalAI (primary) + IndianAPI.in */}
      {indiaOn ? (
      <Panel title="Market Data & AI Signals — India" icon={Database} accent="emerald">
        <div className="space-y-4">
          {dataProviders.map((dp: any) => (
            <div key={dp?.id} className="rounded-lg border border-border/70 bg-secondary/20 p-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{dp?.name}</span>
                    <span className="text-[11px] text-slate-500">{dp?.vendor}</span>
                    <StatusBadge status={dp?.status} />
                    {dp?.isPrimaryData ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-300"><Star className="h-3 w-3" /> Primary data</span>
                    ) : (
                      <button
                        onClick={() => post({ type: 'set_primary', key: dp?.key, role: 'data' }, `${dp?.name} is now the primary data provider.`)}
                        disabled={busyKey !== ''}
                        className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-[10px] text-slate-300 hover:border-amber-500/50 flex items-center gap-1"
                      >
                        <Star className="h-3 w-3" /> Set primary
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{dp?.authNote}</p>
                  <Chips csv={dp?.exchanges} tone="text-cyan-300 bg-cyan-500/10" />
                  <Chips csv={dp?.capabilities} />
                  <div className="text-[11px] text-slate-500">{dp?.rateLimitNote}</div>
                  {dp?.lastError ? <div className="text-[11px] text-red-400">Last error: {dp.lastError}</div> : null}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="password"
                      placeholder={dp?.hasApiKey ? `Key saved (${dp?.apiKeyMasked}) — paste to replace` : `Paste ${dp?.vendor} API key`}
                      value={drafts?.[dp?.key]?.apiKey ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [dp?.key]: { ...d?.[dp?.key], apiKey: e.target.value } }))}
                      className="w-full sm:w-60 rounded-md bg-secondary/60 border border-border px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
                    />
                    <button
                      onClick={() => saveCreds(dp)}
                      disabled={busyKey !== ''}
                      className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Save key
                    </button>
                    <button
                      onClick={() => post({ type: 'test_connection', key: dp?.key }, 'Connected.')}
                      disabled={busyKey !== ''}
                      className="rounded-md bg-secondary hover:bg-secondary/70 border border-border px-3 py-1.5 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                    >
                      <Activity className="h-3.5 w-3.5" /> Test connection
                    </button>
                    <a href={dp?.docsUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                      Docs <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(PREVIEWS?.[dp?.key] ?? []).map((pv) => (
                      <button
                        key={pv.fn}
                        onClick={() => runPreview(dp?.key, pv.fn)}
                        className={`rounded-md px-2.5 py-1 text-[11px] border transition-colors ${previewSel?.provider === dp?.key && previewSel?.fn === pv.fn ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300' : 'border-border bg-secondary/50 text-slate-400 hover:text-slate-200'}`}
                      >
                        {pv.label}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const sel = previewSel
                        if (sel && sel.provider === dp?.key) runPreview(sel.provider, sel.fn)
                        else runPreview(dp?.key, PREVIEWS?.[dp?.key]?.[0]?.fn ?? '')
                      }}
                      className="rounded-md px-2 py-1 text-[11px] border border-border bg-secondary/50 text-slate-400 hover:text-slate-200"
                    >
                      <RefreshCw className={`h-3 w-3 ${previewBusy && previewSel?.provider === dp?.key ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="rounded-md border border-border/70 bg-secondary/30 p-2 h-48 overflow-auto">
                    {previewSel?.provider !== dp?.key ? (
                      <div className="text-xs text-slate-500 p-2">Pick a preview above to pull live data through the hub.</div>
                    ) : previewBusy ? (
                      <div className="text-xs text-slate-500 p-2">Fetching live data…</div>
                    ) : preview?.notConfigured ? (
                      <div className="text-xs text-amber-300 p-2">{preview?.message ?? `Save your ${dp?.vendor} key, then run a preview — live data will appear here.`}</div>
                    ) : preview?.error ? (
                      <div className="text-xs text-red-400 p-2">{preview.error}</div>
                    ) : preview?.data ? (
                      <pre className="text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap break-all">{JSON.stringify(preview.data, null, 2)}</pre>
                    ) : (
                      <div className="text-xs text-slate-500 p-2">Pick a preview above to pull live data through the hub.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      ) : null}

      {/* Live websocket feed — Upstox Market Data Feed V3 */}
      {indiaOn ? <LiveFeedPanel /> : null}

      {/* Broker / execution providers, grouped by market and filtered by the user's selection */}
      <Panel title="Broker APIs — Execution & Streaming" icon={Landmark} accent="cyan">
        <p className="text-xs text-slate-500 mb-3">
          Brokers and exchanges from around the world, shown for the markets you selected above — India shows SEBI-registered brokers,
          forex/CFD and crypto venues are global, equity brokers appear under their home market. Configure the one(s) you hold an account
          with and set a primary execution provider. Credentials are stored server-side and never sent to the browser.
        </p>
        {BROKER_SECTIONS.map((sec) => {
          const secBrokers = brokers.filter((p) => homeSection(p?.markets) === sec.key && marketVisible(p?.markets))
          if (secBrokers.length === 0) return null
          return (
        <div key={sec.key} className="mb-5 last:mb-0">
        <div className="flex items-baseline gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{sec.title}</h3>
          <span className="text-[10px] text-slate-500">{sec.note} · {secBrokers.length} providers</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {secBrokers.map((p) => {
            const fields = CRED_FIELDS?.[p?.authType] ?? CRED_FIELDS.api_key_secret_daily_token
            const isOpen = openForm === p?.key
            return (
              <div key={p?.id} className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">{p?.name}</div>
                    <div className="text-[11px] text-slate-500">{p?.vendor}</div>
                  </div>
                  <StatusBadge status={p?.status} />
                </div>
                <Chips csv={p?.exchanges} tone="text-cyan-300 bg-cyan-500/10" />
                <div className="text-[11px] text-slate-500 line-clamp-2">{p?.authNote}</div>
                {p?.isPrimaryExec ? (
                  <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-300"><Star className="h-3 w-3" /> Primary execution</div>
                ) : null}
                {p?.lastError ? <div className="text-[11px] text-red-400">Last: {p.lastError}</div> : null}

                {isOpen ? (
                  <div className="space-y-1.5 pt-1">
                    {fields.map((f) => (
                      <input
                        key={f.key}
                        type={f.secret ? 'password' : 'text'}
                        placeholder={f.label}
                        value={drafts?.[p?.key]?.[f.key] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p?.key]: { ...d?.[p?.key], [f.key]: e.target.value } }))}
                        className="w-full rounded-md bg-secondary/60 border border-border px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
                      />
                    ))}
                    <div className="flex gap-1.5 pt-0.5">
                      <button onClick={() => saveCreds(p)} disabled={busyKey !== ''} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-2.5 py-1 text-[11px] font-semibold text-white">Save</button>
                      <button onClick={() => setOpenForm('')} className="rounded-md border border-border px-2.5 py-1 text-[11px] text-slate-400">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                    <button onClick={() => setOpenForm(p?.key)} className="rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-slate-200 hover:border-cyan-500/50 flex items-center gap-1">
                      <KeyRound className="h-3 w-3" /> {p?.hasApiKey || p?.hasAccessToken ? 'Update keys' : 'Add keys'}
                    </button>
                    <button onClick={() => post({ type: 'test_connection', key: p?.key }, 'Connected.')} disabled={busyKey !== ''} className="rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-slate-200 hover:border-cyan-500/50 flex items-center gap-1">
                      <Activity className="h-3 w-3" /> Test
                    </button>
                    {!p?.isPrimaryExec ? (
                      <button onClick={() => post({ type: 'set_primary', key: p?.key, role: 'exec' }, `${p?.name} is now the primary execution provider.`)} disabled={busyKey !== ''} className="rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-slate-200 hover:border-amber-500/50 flex items-center gap-1">
                        <Star className="h-3 w-3" /> Primary
                      </button>
                    ) : null}
                    {p?.hasApiKey || p?.hasAccessToken ? (
                      <button onClick={() => post({ type: 'clear_credentials', key: p?.key }, 'Credentials cleared.')} disabled={busyKey !== ''} className="rounded-md border border-border bg-secondary/60 px-2 py-1 text-[11px] text-red-400 hover:border-red-500/50 flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                    <a href={p?.docsUrl} target="_blank" rel="noreferrer" className="ml-auto text-[11px] text-cyan-400 hover:underline flex items-center gap-1">
                      Docs <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        </div>
          )
        })}
      </Panel>

      {/* Instruments */}
      <Panel title="Instrument Catalog — India & US (Normalized)" icon={CandlestickChart} accent="violet">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
          <Stat label="NSE" value={byExchange('NSE').length} />
          <Stat label="BSE" value={byExchange('BSE').length} />
          <Stat label="MCX" value={byExchange('MCX').length} />
          <Stat label="NYSE · NASDAQ" value={byExchange('NYSE').length + byExchange('NASDAQ').length} sub="Data feed coming" />
          <Stat label="Currencies" value="INR · USD" sub="Account conversion applies" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="py-2 pr-3">Symbol</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Exchange</th>
                <th className="py-2 pr-3">Segment</th>
                <th className="py-2 pr-3 text-right">Lot size</th>
                <th className="py-2 pr-3 text-right">Tick</th>
                <th className="py-2 pr-3 text-right">Price band</th>
                <th className="py-2 pr-0 text-right">Ref price</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map((i) => (
                <tr key={i?.id} className="border-b border-border/40 text-slate-300">
                  <td className="py-1.5 pr-3 font-medium text-white num">{i?.symbol}</td>
                  <td className="py-1.5 pr-3">{i?.name}</td>
                  <td className="py-1.5 pr-3"><span className="rounded bg-secondary/70 border border-border/60 px-1.5 py-0.5 text-[10px]">{i?.exchange}</span></td>
                  <td className="py-1.5 pr-3 text-slate-400">{i?.segment}</td>
                  <td className="py-1.5 pr-3 text-right num">{i?.lotSize ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-right num">{i?.spec?.tickSize ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-right num">{i?.priceBandPct ? `±${i.priceBandPct}%` : '—'}</td>
                  <td className="py-1.5 pr-0 text-right num">{i?.quoteCurrency === 'INR' ? '₹' : '$'}{i?.currentPrice?.toLocaleString?.(i?.quoteCurrency === 'INR' ? 'en-IN' : 'en-US') ?? i?.currentPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Lot sizes and bands are seed defaults — the instrument master from the connected provider is the source of truth on sync.
          Position sizing for Indian F&O uses exchange lots; EMIL still rejects any order whose smallest lot exceeds permitted monetary risk.
        </p>
      </Panel>

      {/* Holidays + safety note */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {indiaOn ? (
        <Panel title="Market Holidays (fixed-date)" icon={CalendarDays} accent="amber">
          <ul className="space-y-1.5">
            {holidays.map((h) => (
              <li key={h?.id} className="flex items-center justify-between text-xs text-slate-300">
                <span>{h?.name}</span>
                <span className="num text-slate-500">{h?.date ? new Date(h.date).toISOString().slice(0, 10) : ''} · {h?.exchange}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500 mt-2">
            Only fixed-date national holidays are seeded. Lunar-calendar holidays (Holi, Diwali, Eid…) shift yearly — sync the official
            exchange calendar; EMIL treats unknown dates as normal sessions.
          </p>
        </Panel>
        ) : null}
        <Panel title="Risk Law — one pipeline for every market" icon={ShieldCheck} accent="red">
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
            <li>Aggregate EMIL-controlled exposure cap applies across ALL markets — global and Indian positions count toward the same limit.</li>
            <li>Indian F&O trades in exchange lots: if one lot exceeds permitted monetary risk, EMIL rejects the trade — it never rounds up.</li>
            <li>No trades outside exchange sessions; MCX evening session requires the session to be explicitly allowed in the risk profile.</li>
            <li>Order execution stays disabled until a broker provider is connected AND armed via the ARM console — market data alone never trades.</li>
            <li>API credentials live server-side only and every change is written to the audit log.</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
