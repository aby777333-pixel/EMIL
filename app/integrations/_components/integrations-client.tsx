'use client'

// Integrations Directory (round E/F): chat channels (Slack/Discord/Teams/
// generic), embeddable widgets + embed keys, OAuth applications ("Connect with
// EMIL") and connected apps, bring-your-own vendor/AI keys, plus honest
// recipes for Zapier/Make, Google Sheets, Excel, TradingView and MetaTrader.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { Blocks, MessageSquare, Code2, KeySquare, ShieldCheck, Copy, Trash2, Play, Pause, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'

const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); toast.success('Copied') } catch { toast.error('Clipboard blocked') } }
const inp = 'rounded-md bg-background border border-border px-2.5 py-1.5 text-xs text-white'
const ts = (s?: string | null) => (s ? String(s).slice(0, 16).replace('T', ' ') : '—')

export default function IntegrationsClient() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [reveal, setReveal] = useState<{ label: string; value: string; note?: string } | null>(null)
  const [f, setF] = useState<Record<string, any>>({ chKind: 'slack', embWidgets: ['chart', 'news', 'brief', 'quotes', 'ask'], clScopes: ['read', 'market_data', 'alerts'] })
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }))

  const load = useCallback(async () => {
    try { const res = await fetch('/api/integrations', { cache: 'no-store' }); if (!res.ok) throw new Error('failed'); setData(await res.json()) } catch { setError('Failed to load integrations.') }
  }, [])
  useEffect(() => { load() }, [load])
  const post = async (body: any, key: string, ok?: string) => {
    setBusy(key)
    try { const res = await fetch('/api/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await res.json().catch(() => ({})); if (!res.ok) { toast.error(j?.error ?? 'Request failed'); return null } if (ok) toast.success(ok); await load(); return j } finally { setBusy('') }
  }

  if (error) return <div className="p-6"><StatusMessage text={error} /></div>
  if (!data) return <div className="p-6"><LoadingPanel text="Loading integrations..." /></div>
  const base = data.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')

  const DIRECTORY = [
    { name: 'Slack', how: 'Incoming webhook → notifications land in a channel. Add it below.', status: 'live', anchor: '#channels' },
    { name: 'Discord', how: 'Server → Integrations → Webhooks → paste the URL below.', status: 'live', anchor: '#channels' },
    { name: 'Microsoft Teams', how: 'Channel → Connectors → Incoming Webhook → paste the URL below.', status: 'live', anchor: '#channels' },
    { name: 'Zapier / Make', how: 'No marketplace app yet. Use a Webhooks-by-Zapier / Make HTTP trigger as the target of an EMIL webhook (Developers → Webhooks), and call /api/v1 with your key for actions.', status: 'via REST + webhooks', anchor: '/developers' },
    { name: 'Google Sheets', how: 'Apps Script: UrlFetchApp.fetch(base + "/api/v1/market/quotes?symbols=EUR/USD", { headers: { "x-api-key": KEY } }) on a time trigger. Snippet in the API reference.', status: 'via REST', anchor: '/developers/docs' },
    { name: 'Excel (Power Query)', how: 'Data → From Web → Advanced → add header x-api-key → /api/v1/market/board; refresh on a schedule.', status: 'via REST', anchor: '/developers/docs' },
    { name: 'TradingView', how: 'Alert webhooks into EMIL (notifications, journal, paper copy).', status: 'live', anchor: '/bridge' },
    { name: 'MetaTrader 5 / 4', how: 'Read-only bridge EA mirrors your account into EMIL.', status: 'live', anchor: '/bridge' },
    { name: 'Your website / app', how: 'Embed chart, quotes, news, brief and Ask EMIL widgets; or let users "Connect with EMIL" via OAuth.', status: 'live', anchor: '#embeds' },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Blocks className="h-5 w-5 text-cyan-400" /> Integrations Directory</h1>
        <p className="text-xs text-slate-500 mt-1">Every way EMIL plugs into the tools you already use. Labels are honest: &quot;live&quot; means built and working here; &quot;via REST + webhooks&quot; means it works today through the API without a listing in that vendor&apos;s marketplace.</p>
      </div>

      {reveal ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-200 font-semibold">{reveal.label} — copy now, it is shown once.</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap"><code className="font-mono text-[11px] text-white bg-background/60 border border-border rounded px-2 py-1.5 break-all">{reveal.value}</code><button onClick={() => copy(reveal.value)} className="flex items-center gap-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5"><Copy className="h-3 w-3" /> Copy</button><button onClick={() => setReveal(null)} className="text-[11px] text-slate-400 hover:text-white">Stored</button></div>
          {reveal.note ? <p className="text-[10px] text-slate-400 mt-2">{reveal.note}</p> : null}
        </div>
      ) : null}

      <Panel title="Directory" icon={Blocks} accent="cyan">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {DIRECTORY.map((d) => (
            <div key={d.name} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-white">{d.name}</p><span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${d.status === 'live' ? 'text-emerald-300 border-emerald-500/40' : 'text-cyan-300 border-cyan-500/40'}`}>{d.status}</span></div>
              <p className="text-[10px] text-slate-500 mt-1">{d.how}</p>
              {d.anchor.startsWith('#') ? <a href={d.anchor} className="text-[10px] text-cyan-400 hover:underline mt-1 inline-block">set up below ↓</a> : <Link href={d.anchor} className="text-[10px] text-cyan-400 hover:underline mt-1 inline-block">open →</Link>}
            </div>
          ))}
        </div>
      </Panel>

      <div id="channels" />
      <Panel title={`Chat channels (${data.channels.length})`} icon={MessageSquare} accent="emerald">
        <div className="rounded-md border border-border bg-background/40 p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select value={f.chKind} onChange={(e) => set('chKind', e.target.value)} className={inp}>{data.kinds.map((k: string) => <option key={k} value={k}>{k === 'teams' ? 'Microsoft Teams' : k}</option>)}</select>
          <input value={f.chLabel ?? ''} onChange={(e) => set('chLabel', e.target.value)} placeholder="Label, e.g. #trading-alerts" className={inp} />
          <input value={f.chUrl ?? ''} onChange={(e) => set('chUrl', e.target.value)} placeholder="https://hooks.slack.com/services/…" className={inp} />
          <button disabled={!!busy || !f.chUrl} onClick={async () => { const r = await post({ type: 'add_channel', kind: f.chKind, label: f.chLabel, webhookUrl: f.chUrl }, 'ch'); if (r) { toast[r.test?.ok ? 'success' : 'error'](r.test?.ok ? 'Channel added — a hello message was sent.' : `Added, but the test failed: ${r.test?.error}`); set('chUrl', ''); set('chLabel', '') } }} className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">ADD CHANNEL</button>
        </div>
        <div className="mt-3 space-y-1.5">
          {data.channels.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-2 flex-wrap text-[11px] rounded-md border border-border bg-background/40 p-2.5">
              <span><span className="text-white font-semibold">{c.label}</span> <span className="text-slate-500">· {c.kind} · {c.url} · last {ts(c.lastSentAt)}{c.lastError ? ` · ${c.lastError}` : ''}</span> <span className={`ml-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${c.status === 'active' ? 'text-emerald-300 border-emerald-500/40' : c.status === 'failing' ? 'text-red-300 border-red-500/40' : 'text-slate-400 border-slate-600/50'}`}>{c.status}</span></span>
              <span className="flex gap-1.5"><button disabled={!!busy} onClick={async () => { const r = await post({ type: 'test_channel', id: c.id }, `t-${c.id}`); if (r) toast[r.ok ? 'success' : 'error'](r.ok ? 'Test sent' : `Failed: ${r.error}`) }} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white"><Play className="h-3 w-3" /> Test</button><button disabled={!!busy} onClick={() => post({ type: 'toggle_channel', id: c.id }, `p-${c.id}`)} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-slate-300"><Pause className="h-3 w-3" /> {c.status === 'paused' ? 'Resume' : 'Pause'}</button><button disabled={!!busy} onClick={() => post({ type: 'delete_channel', id: c.id }, `d-${c.id}`, 'Removed.')} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></span>
            </div>
          ))}
          {data.channels.length === 0 ? <p className="text-xs text-slate-500">No channels yet. Every EMIL notification (alerts, risk, broker, org, signals) is posted to each active channel.</p> : null}
        </div>
      </Panel>

      <div id="embeds" />
      <Panel title={`Embeddable widgets — embed keys (${data.embeds.length})`} icon={Code2} accent="violet">
        <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={f.embLabel ?? ''} onChange={(e) => set('embLabel', e.target.value)} placeholder="Label, e.g. Company website" className={inp} />
            <input value={f.embOrigins ?? ''} onChange={(e) => set('embOrigins', e.target.value)} placeholder="Allowed origins, e.g. https://www.yourfirm.com" className={inp} />
            <input value={f.embBrand ?? ''} onChange={(e) => set('embBrand', e.target.value)} placeholder="Brand name shown in widgets (optional)" className={inp} />
          </div>
          <div className="flex flex-wrap gap-1.5 items-center"><span className="text-[10px] text-slate-500">Widgets:</span>{data.widgets.map((w: string) => { const on = f.embWidgets.includes(w); return <button key={w} type="button" onClick={() => set('embWidgets', on ? f.embWidgets.filter((x: string) => x !== w) : [...f.embWidgets, w])} className={`rounded px-2 py-0.5 text-[10px] border font-mono ${on ? 'border-violet-500/50 bg-violet-500/10 text-violet-300' : 'border-border text-slate-500'}`}>{w}</button> })}
            <input value={f.embPrimary ?? ''} onChange={(e) => set('embPrimary', e.target.value)} placeholder="#primary" className={`${inp} w-24`} /><input value={f.embBg ?? ''} onChange={(e) => set('embBg', e.target.value)} placeholder="#background" className={`${inp} w-28`} /><input value={f.embLogo ?? ''} onChange={(e) => set('embLogo', e.target.value)} placeholder="Logo URL" className={`${inp} w-40`} />
          </div>
          <button disabled={!!busy} onClick={async () => { const r = await post({ type: 'create_embed', label: f.embLabel, allowedOrigins: f.embOrigins, widgets: f.embWidgets, theme: { brand: f.embBrand || undefined, primary: f.embPrimary || undefined, background: f.embBg || undefined, logoUrl: f.embLogo || undefined } }, 'emb', 'Embed key created.'); if (r?.publicKey) setReveal({ label: 'Embed key (public — safe in HTML, restrict by origin)', value: r.publicKey, note: `<script src="${base}/sdk/emil-embed.js"></script>\n<div id="emil"></div>\n<script>EmilEmbed.mount('#emil', { key: '${r.publicKey}', widget: 'chart', symbol: 'XAU/USD', height: 360 })</script>` }) }} className="rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">CREATE EMBED KEY</button>
        </div>
        <div className="mt-3 space-y-1.5">
          {data.embeds.map((e: any) => (
            <div key={e.id} className={`rounded-md border border-border bg-background/40 p-2.5 text-[11px] ${e.status !== 'active' ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span><span className="text-white font-semibold">{e.label}</span> <span className="font-mono text-violet-300">{e.publicKey}</span> <span className="text-slate-500">· {e.allowedOrigins ?? 'any origin (restrict this)'} · {e.widgets.join(', ')}</span></span>
                <span className="flex gap-1.5"><button onClick={() => copy(`<script src="${base}/sdk/emil-embed.js"></script>\n<div id="emil"></div>\n<script>EmilEmbed.mount('#emil', { key: '${e.publicKey}', widget: 'chart', symbol: 'XAU/USD', height: 360 })</script>`)} className="rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white">Copy snippet</button><a href={`/embed/chart?key=${e.publicKey}&symbol=XAU/USD`} target="_blank" rel="noreferrer" className="rounded border border-border px-2 py-1 text-[10px] text-cyan-300">Preview</a>{e.status === 'active' ? <button disabled={!!busy} onClick={() => { if (window.confirm('Revoke this embed key? Widgets using it stop rendering.')) post({ type: 'revoke_embed', id: e.id }, `re-${e.id}`, 'Revoked.') }} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button> : null}</span>
              </div>
            </div>
          ))}
          {data.embeds.length === 0 ? <p className="text-xs text-slate-500">No embed keys. Widgets: chart (symbol, interval), quotes (symbols), news (category), brief, ask. Ask EMIL is capped at 50 questions/day per key and runs on your own AI key if you add one below.</p> : null}
        </div>
      </Panel>

      <Panel title={`OAuth applications — "Connect with EMIL" (${data.clients.length})`} icon={ShieldCheck} accent="amber">
        <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={f.clName ?? ''} onChange={(e) => set('clName', e.target.value)} placeholder="Application name" className={inp} />
            <input value={f.clUris ?? ''} onChange={(e) => set('clUris', e.target.value)} placeholder="Redirect URIs (comma separated, https)" className={inp} />
            <input value={f.clLogo ?? ''} onChange={(e) => set('clLogo', e.target.value)} placeholder="Logo URL (optional)" className={inp} />
          </div>
          <div className="flex flex-wrap gap-1.5 items-center"><span className="text-[10px] text-slate-500">Scopes the app may request:</span>{data.scopes.map((s: string) => { const on = f.clScopes.includes(s); return <button key={s} type="button" onClick={() => set('clScopes', on ? f.clScopes.filter((x: string) => x !== s) : [...f.clScopes, s])} className={`rounded px-2 py-0.5 text-[10px] border font-mono ${on ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-border text-slate-500'}`}>{s}</button> })}</div>
          <button disabled={!!busy || !f.clUris} onClick={async () => { const r = await post({ type: 'create_client', name: f.clName, redirectUris: f.clUris, scopes: f.clScopes, logoUrl: f.clLogo }, 'cl', 'Application registered.'); if (r?.clientSecret) setReveal({ label: `Client secret for ${r.clientId}`, value: r.clientSecret, note: `Authorize URL: ${base}/oauth/authorize?client_id=${r.clientId}&redirect_uri=<uri>&scope=read+market_data&state=<random>&response_type=code · Token URL: ${base}/api/oauth/token (grant_type=authorization_code | refresh_token). Use the access token as Bearer on /api/v1.` }) }} className="rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">REGISTER APPLICATION</button>
        </div>
        <div className="mt-3 space-y-1.5">
          {data.clients.map((c: any) => (
            <div key={c.id} className="rounded-md border border-border bg-background/40 p-2.5 text-[11px] flex items-center justify-between gap-2 flex-wrap">
              <span><span className="text-white font-semibold">{c.name}</span> <span className="font-mono text-amber-300">{c.clientId}</span> <span className="text-slate-500">· {c.scopes.join(', ')} · {c.redirectUris.join(', ')} · {c.grants} connections · {c.status}</span></span>
              <span className="flex gap-1.5"><button disabled={!!busy} onClick={async () => { const r = await post({ type: 'rotate_client_secret', id: c.id }, `rs-${c.id}`); if (r?.clientSecret) setReveal({ label: `New client secret for ${c.clientId}`, value: r.clientSecret }) }} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-slate-300 hover:text-white"><RefreshCcw className="h-3 w-3" /> Rotate secret</button><button disabled={!!busy} onClick={() => post({ type: 'toggle_client', id: c.id }, `tc-${c.id}`)} className="rounded border border-border px-2 py-1 text-[10px] text-slate-300">{c.status === 'active' ? 'Disable' : 'Enable'}</button><button disabled={!!busy} onClick={() => { if (window.confirm('Delete this application and revoke all its connections?')) post({ type: 'delete_client', id: c.id }, `dc-${c.id}`, 'Deleted.') }} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></span>
            </div>
          ))}
        </div>
        {data.grants.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Apps connected to YOUR account</p>
            {data.grants.map((g: any) => <div key={g.id} className="flex items-center justify-between text-[11px] rounded-md border border-border bg-background/40 p-2 mb-1"><span><span className="text-white">{g.app}</span> <span className="text-slate-500">· {g.scopes.join(', ')} · since {ts(g.since)}</span></span><button disabled={!!busy} onClick={() => post({ type: 'revoke_grant', id: g.id }, `rg-${g.id}`, 'Access revoked.')} className="text-[10px] text-red-300 hover:underline">Revoke</button></div>)}
          </div>
        ) : null}
      </Panel>

      <Panel title="Bring your own keys" icon={KeySquare} accent="cyan">
        <p className="text-[11px] text-slate-400 mb-2">Run heavy usage on your own vendor accounts. Keys are encrypted at rest and used only for your requests.</p>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
          {Object.entries(data.providers).map(([k, v]: any) => {
            const saved = data.providerKeys.find((x: any) => x.providerKey === k)
            return (
              <div key={k} className="rounded-md border border-border bg-background/40 p-3">
                <p className="text-xs font-semibold text-white">{v.label}</p>
                <p className="text-[10px] text-slate-500">{v.hint}{saved ? ` · saved ${saved.masked} · ${saved.status}${saved.lastError ? ` (${saved.lastError})` : ''}` : ''}</p>
                <div className="mt-2 flex gap-1.5">
                  <input type="password" value={f[`pk-${k}`] ?? ''} onChange={(e) => set(`pk-${k}`, e.target.value)} placeholder={saved ? 'Paste to replace' : 'Paste API key'} className={`${inp} flex-1 min-w-0`} />
                  <button disabled={!!busy || !(f[`pk-${k}`] ?? '').trim()} onClick={async () => { const r = await post({ type: 'save_provider_key', providerKey: k, apiKey: f[`pk-${k}`] }, `pk-${k}`); if (r) { toast[r.test?.ok ? 'success' : 'error'](r.test?.message ?? 'Saved'); set(`pk-${k}`, '') } }} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5">Save</button>
                  {saved ? <button disabled={!!busy} onClick={() => post({ type: 'delete_provider_key', providerKey: k }, `dk-${k}`, 'Removed.')} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button> : null}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Twelve Data key: charts, candles and correlation requests you make (app and API) skip the shared free-tier budget. OpenAI / Abacus key: embedded Ask EMIL runs on it today; the cockpit&apos;s own research reports still use the house engine.</p>
      </Panel>
    </div>
  )
}
