'use client'

// Developer portal (platform round A): self-serve API keys (scopes, sandbox,
// IP allow-list, expiry, rotation), usage metering, plan quotas, outbound
// webhooks with a delivery log, quickstart snippets, SDKs and OpenAPI links.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { KeyRound, Webhook, BookOpenText, Copy, Plus, Trash2, RefreshCcw, Play, Pause, Activity, Download, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

const copy = async (text: string, what = 'Copied') => { try { await navigator.clipboard.writeText(text); toast.success(what) } catch { toast.error('Clipboard blocked — select and copy manually.') } }
const ts = (s?: string | null) => (s ? String(s).slice(0, 16).replace('T', ' ') : '—')

export default function DevelopersClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [reveal, setReveal] = useState<{ kind: 'key' | 'secret'; value: string; label: string } | null>(null)
  const [keyDraft, setKeyDraft] = useState({ label: '', environment: 'sandbox', scopes: ['read', 'market_data', 'news', 'calendar', 'alerts'] as string[], ipAllowlist: '', expiresInDays: '' })
  const [hookDraft, setHookDraft] = useState({ url: '', events: ['*'] as string[], description: '' })
  const [openHook, setOpenHook] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/developers', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      setData(await res.json())
    } catch { setError('Failed to load the developer portal.') }
  }, [])
  useEffect(() => { load() }, [load])

  const post = async (body: any, key: string, ok?: string) => {
    setBusy(key)
    try {
      const res = await fetch('/api/developers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j?.error ?? 'Request failed'); return null }
      if (ok) toast.success(ok)
      await load()
      return j
    } finally { setBusy('') }
  }

  const base = data?.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const days = useMemo(() => {
    const out: { day: string; n: number }[] = []
    for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10); out.push({ day: d, n: data?.usage?.byDay?.[d] ?? 0 }) }
    return out
  }, [data])
  const maxDay = Math.max(1, ...days.map((d) => d.n))

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading the developer portal..." /></div>

  const L = data.limits
  const activeKeys = data.keys.filter((k: any) => k.status === 'active')
  const sampleKey = activeKeys[0]?.prefix ? `${activeKeys[0].prefix}…` : 'emil_test_…'

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><KeyRound className="h-5 w-5 text-cyan-400" /> Developers &amp; Integrations</h1>
          <p className="text-xs text-slate-500 mt-1">Connect your platform to EMIL, or EMIL to your platform. Keys are shown once. Research data is delayed and never an execution trigger; the API reaches paper venues only.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/developers/docs" className="flex items-center gap-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3 py-2"><BookOpenText className="h-3.5 w-3.5" /> API reference &amp; quickstarts</Link>
          <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer" className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-slate-200 hover:text-white">OpenAPI</a>
          <a href="/api/v1/postman.json" target="_blank" rel="noreferrer" className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-slate-200 hover:text-white">Postman</a>
          <a href="/sdk/emil.js" download className="flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-slate-200 hover:text-white"><Download className="h-3 w-3" /> JS SDK</a>
          <a href="/sdk/emil.py" download className="flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-slate-200 hover:text-white"><Download className="h-3 w-3" /> Python SDK</a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Plan" value={L.label} valueClass="text-amber-300" sub={data.account.isAdmin ? 'admin — no limits' : `${data.account.planKey}`} />
        <Stat label="Requests / minute" value={L.apiPerMinute.toLocaleString()} sub={`${L.apiPerDay.toLocaleString()} / day`} />
        <Stat label="Active keys" value={`${activeKeys.length} / ${L.maxKeys}`} valueClass="text-cyan-300" />
        <Stat label="Webhook endpoints" value={`${data.webhooks.length} / ${L.maxWebhooks}`} valueClass="text-cyan-300" />
        <Stat label="Calls (14 days)" value={data.usage.total.toLocaleString()} valueClass="text-emerald-300" />
        <Stat label="Streaming" value={L.streaming ? 'ON' : 'Pro+'} valueClass={L.streaming ? 'text-emerald-300' : 'text-slate-400'} sub="SSE quotes + state" />
      </div>

      {reveal ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-200 font-semibold flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> Copy your new {reveal.kind === 'key' ? 'API key' : 'webhook signing secret'} now — it will not be shown again. ({reveal.label})</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <code className="font-mono text-[11px] text-white bg-background/60 border border-border rounded px-2 py-1.5 break-all">{reveal.value}</code>
            <button onClick={() => copy(reveal.value)} className="flex items-center gap-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5"><Copy className="h-3 w-3" /> Copy</button>
            <button onClick={() => setReveal(null)} className="text-[11px] text-slate-400 hover:text-white">I have stored it</button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title={`API keys (${data.keys.length})`} icon={KeyRound} accent="cyan">
          <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1"><Plus className="h-3 w-3" /> Issue a key</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={keyDraft.label} onChange={(e) => setKeyDraft((d) => ({ ...d, label: e.target.value }))} placeholder="Label, e.g. Trading desk bot" className="rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
              <select value={keyDraft.environment} onChange={(e) => setKeyDraft((d) => ({ ...d, environment: e.target.value }))} className="rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white">
                <option value="sandbox">Sandbox key (emil_test_…) — cannot link brokers</option>
                <option value="live">Live key (emil_live_…)</option>
              </select>
              <input value={keyDraft.ipAllowlist} onChange={(e) => setKeyDraft((d) => ({ ...d, ipAllowlist: e.target.value }))} placeholder="IP allow-list (optional, comma-separated; prefix with trailing dot)" className="rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
              <input value={keyDraft.expiresInDays} onChange={(e) => setKeyDraft((d) => ({ ...d, expiresInDays: e.target.value }))} placeholder="Expires in N days (optional)" inputMode="numeric" className="rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.scopes.map((sc: string) => {
                const on = keyDraft.scopes.includes(sc)
                return <button key={sc} type="button" onClick={() => setKeyDraft((d) => ({ ...d, scopes: on ? d.scopes.filter((x) => x !== sc) : [...d.scopes, sc] }))} className={`rounded px-2 py-0.5 text-[10px] border font-mono ${on ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-border text-slate-500 hover:text-slate-300'}`}>{sc}</button>
              })}
            </div>
            <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'create_key', ...keyDraft, expiresInDays: keyDraft.expiresInDays || undefined }, 'create', 'Key issued.'); if (r?.key) setReveal({ kind: 'key', value: r.key, label: keyDraft.label || `${keyDraft.environment} key` }) }} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold px-4 py-1.5">ISSUE KEY</button>
          </div>

          <div className="mt-3 space-y-2">
            {data.keys.map((k: any) => (
              <div key={k.id} className={`rounded-md border p-3 ${k.status === 'active' ? 'border-border bg-background/40' : 'border-border/50 bg-background/20 opacity-60'}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-slate-200 font-semibold"><span className="font-mono text-cyan-300">{k.prefix}…</span> {k.label} <span className={`ml-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${k.environment === 'sandbox' ? 'text-amber-300 border-amber-500/40' : 'text-emerald-300 border-emerald-500/40'}`}>{k.environment}</span> <span className="text-[9px] uppercase text-slate-500 ml-1">{k.status}</span></p>
                  {k.status === 'active' ? (
                    <div className="flex gap-1.5">
                      <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'rotate_key', id: k.id }, `rot-${k.id}`, 'Rotated — old key valid 24h.'); if (r?.key) setReveal({ kind: 'key', value: r.key, label: `${k.label} (rotated)` }) }} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white"><RefreshCcw className="h-3 w-3" /> Rotate</button>
                      <button disabled={!!busy} onClick={() => { if (window.confirm(`Revoke ${k.prefix}…? Integrations using it stop immediately.`)) post({ type: 'revoke_key', id: k.id }, `rev-${k.id}`, 'Key revoked.') }} className="flex items-center gap-1 rounded border border-red-500/40 px-2 py-1 text-[10px] text-red-300"><Trash2 className="h-3 w-3" /> Revoke</button>
                    </div>
                  ) : null}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">{k.scopes.join(' · ')}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{k.calls14d.toLocaleString()} calls / 14d · last used {ts(k.lastUsedAt)}{k.ipAllowlist ? ` · IPs ${k.ipAllowlist}` : ''}{k.expiresAt ? ` · expires ${String(k.expiresAt).slice(0, 10)}` : ''}</p>
              </div>
            ))}
            {data.keys.length === 0 ? <p className="text-xs text-slate-500">No keys yet. Sandbox keys are the safe way to start.</p> : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Usage — last 14 days" icon={Activity} accent="emerald">
            <div className="flex items-end gap-1 h-24">
              {days.map((d) => (
                <div key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 bg-emerald-500/60 rounded-t min-h-[2px]" style={{ height: `${Math.max(2, (d.n / maxDay) * 100)}%` }} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>{days[0].day}</span><span>{days[days.length - 1].day}</span></div>
            {Object.keys(data.usage.byEndpoint).length > 0 ? (
              <div className="mt-2 space-y-1">
                {Object.entries(data.usage.byEndpoint).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8).map(([ep, n]: any) => (
                  <div key={ep} className="flex justify-between text-[10px]"><span className="font-mono text-slate-400">{ep}</span><span className="num text-slate-300">{n.toLocaleString()}</span></div>
                ))}
              </div>
            ) : <p className="text-[10px] text-slate-500 mt-2">No API calls yet. Metering starts with your first request.</p>}
          </Panel>

          <Panel title="Quickstart" icon={BookOpenText} accent="cyan">
            <pre className="text-[10px] leading-relaxed text-slate-300 bg-background/60 border border-border rounded-md p-3 overflow-x-auto whitespace-pre">{`# curl
curl -H "x-api-key: ${sampleKey}" ${base}/api/v1/state

# JavaScript (Node 18+)
import { EmilClient } from '${base}/sdk/emil.js'
const emil = new EmilClient({ apiKey: '${sampleKey}', baseUrl: '${base}' })
console.log(await emil.quotes(['EUR/USD', 'XAU/USD']))

# Python
from emil import EmilClient   # ${base}/sdk/emil.py
emil = EmilClient(api_key="${sampleKey}", base_url="${base}")
print(emil.brief())`}</pre>
            <p className="text-[10px] text-slate-500 mt-2">Honour <span className="font-mono">Retry-After</span> on 429 — quotas are per plan and the market-data budget is shared. Full reference with persona guides: <Link href="/developers/docs" className="text-cyan-400 hover:underline">API reference</Link>.</p>
          </Panel>
        </div>
      </div>

      <Panel title={`Webhooks (${data.webhooks.length})`} icon={Webhook} accent="amber">
        <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1"><Plus className="h-3 w-3" /> Add an endpoint — EMIL POSTs signed JSON to it</p>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2">
            <input value={hookDraft.url} onChange={(e) => setHookDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://your-platform.example.com/emil/webhook" className="rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
            <input value={hookDraft.description} onChange={(e) => setHookDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Description (optional)" className="rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['*', ...Object.keys(data.events)].map((ev) => {
              const on = hookDraft.events.includes(ev)
              return <button key={ev} type="button" title={data.events[ev] ?? 'All events'} onClick={() => setHookDraft((d) => ({ ...d, events: ev === '*' ? ['*'] : (on ? d.events.filter((x) => x !== ev) : [...d.events.filter((x) => x !== '*'), ev]) }))} className={`rounded px-2 py-0.5 text-[10px] border font-mono ${on ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-border text-slate-500 hover:text-slate-300'}`}>{ev}</button>
            })}
          </div>
          <button disabled={!!busy || !hookDraft.url.trim()} onClick={async () => { const r = await post({ type: 'create_webhook', ...hookDraft }, 'hook', 'Endpoint added.'); if (r?.secret) { setReveal({ kind: 'secret', value: r.secret, label: hookDraft.url }); setHookDraft({ url: '', events: ['*'], description: '' }) } }} className="rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold px-4 py-1.5">ADD ENDPOINT</button>
          <p className="text-[10px] text-slate-500">Verify deliveries with <span className="font-mono">X-EMIL-Signature: t=&lt;unix&gt;,v1=&lt;hex hmac-sha256(secret, &quot;&lt;t&gt;.&lt;raw body&gt;&quot;)&gt;</span>. Both SDKs ship a <span className="font-mono">verifyWebhook</span> helper. Failed deliveries retry at 1m, 5m, 30m, 2h, 6h; five consecutive failures mark the endpoint failing (deliveries continue).</p>
        </div>

        <div className="mt-3 space-y-2">
          {data.webhooks.map((w: any) => (
            <div key={w.id} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 font-mono truncate">{w.url}</p>
                  <p className="text-[10px] text-slate-500">{w.description ? `${w.description} · ` : ''}{w.events.join(', ')} · last {w.lastStatusCode ?? '—'} at {ts(w.lastDeliveryAt)}{w.failCount ? ` · ${w.failCount} consecutive failures` : ''}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${w.status === 'active' ? 'text-emerald-300 border-emerald-500/40' : w.status === 'failing' ? 'text-red-300 border-red-500/40' : 'text-slate-400 border-slate-600/50'}`}>{w.status}</span>
                  <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'test_webhook', id: w.id }, `t-${w.id}`); if (r) toast[r.ok ? 'success' : 'error'](r.ok ? `Delivered (${r.delivery?.responseCode})` : `Failed: ${r.delivery?.responseCode ?? ''} ${r.delivery?.responseBody ?? ''}`) }} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white"><Play className="h-3 w-3" /> Test</button>
                  {w.status === 'paused' ? <button disabled={!!busy} onClick={() => post({ type: 'resume_webhook', id: w.id }, `r-${w.id}`, 'Resumed.')} className="rounded border border-border px-2 py-1 text-[10px] text-slate-300">Resume</button> : <button disabled={!!busy} onClick={() => post({ type: 'pause_webhook', id: w.id }, `p-${w.id}`, 'Paused.')} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-slate-300"><Pause className="h-3 w-3" /> Pause</button>}
                  <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'reveal_webhook_secret', id: w.id }, `s-${w.id}`); if (r?.secret) setReveal({ kind: 'secret', value: r.secret, label: w.url }) }} className="rounded border border-border px-2 py-1 text-[10px] text-slate-300">Secret</button>
                  <button disabled={!!busy} onClick={() => { if (window.confirm('Delete this endpoint and its delivery log?')) post({ type: 'delete_webhook', id: w.id }, `d-${w.id}`, 'Deleted.') }} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setOpenHook((o) => (o === w.id ? '' : w.id))} className="text-[10px] text-cyan-400 hover:underline">{openHook === w.id ? 'hide log' : `log (${w.deliveries.length})`}</button>
                </div>
              </div>
              {openHook === w.id ? (
                <div className="mt-2 overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left">
                    <thead><tr className="text-[9px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1 pr-2">When</th><th className="py-1 pr-2">Event</th><th className="py-1 pr-2">Status</th><th className="py-1 pr-2">Attempt</th><th className="py-1 pr-2">Code</th><th className="py-1">Response / next try</th></tr></thead>
                    <tbody>
                      {w.deliveries.map((d: any) => (
                        <tr key={d.id} className="border-b border-border/40 text-[10px]">
                          <td className="py-1 pr-2 num text-slate-500">{ts(d.createdAt)}</td>
                          <td className="py-1 pr-2 font-mono text-slate-300">{d.event}</td>
                          <td className={`py-1 pr-2 uppercase font-bold ${d.status === 'delivered' ? 'text-emerald-300' : d.status === 'dead' ? 'text-red-300' : 'text-amber-300'}`}>{d.status}</td>
                          <td className="py-1 pr-2 num text-slate-400">{d.attempt}</td>
                          <td className="py-1 pr-2 num text-slate-400">{d.responseCode ?? '—'}</td>
                          <td className="py-1 text-slate-500 truncate max-w-[24rem]">{d.status === 'failed' ? `retry ${ts(d.nextAttemptAt)} · ` : ''}{d.responseBody ?? ''}</td>
                        </tr>
                      ))}
                      {w.deliveries.length === 0 ? <tr><td colSpan={6} className="py-2 text-[10px] text-slate-500">No deliveries yet — press Test.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ))}
          {data.webhooks.length === 0 ? <p className="text-xs text-slate-500">No endpoints yet. Add one to receive alerts, risk events, paper fills and health changes in your own systems.</p> : null}
        </div>
      </Panel>
    </div>
  )
}
