'use client'

// API reference + persona quickstarts, rendered from the same endpoint table
// that produces the OpenAPI document (lib/openapi.ts) — one source of truth.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/cockpit/panel'
import { ENDPOINTS, API_VERSION } from '@/lib/openapi'
import { SCOPES } from '@/lib/entitlements'
import { BookOpenText, User, Building2, Briefcase, Store } from 'lucide-react'

const METHOD_TONE: Record<string, string> = { GET: 'text-emerald-300 border-emerald-500/40', POST: 'text-cyan-300 border-cyan-500/40', DELETE: 'text-red-300 border-red-500/40' }

const PERSONAS = [
  {
    key: 'trader', label: 'Trader', icon: User,
    intro: 'Connect the platform you already trade on. EMIL mirrors your account, watches your instruments and sends alerts where you are.',
    steps: [
      'Issue a sandbox key with market_data, alerts and journal scopes.',
      'Track your instruments: POST /watchlist { symbol } — any spelling resolves through the instrument master.',
      'Create alerts: POST /alerts { symbol, condition, threshold }. They evaluate on delayed research quotes and reach the bell, Telegram, email and your webhooks.',
      'Journal fills from your platform: POST /journal { symbol, side, qty, entryPrice, exitPrice, pnl }.',
      'Coming next round: the MT5 bridge EA and TradingView alert webhooks push your live account into EMIL automatically.',
    ],
    snippet: `const emil = new EmilClient({ apiKey, baseUrl })
await emil.track('XAU/USD')
await emil.createAlert('XAU/USD', 'above', 2450, 'breakout watch')
await emil.journalWrite({ symbol: 'XAU/USD', side: 'buy', qty: 1, entryPrice: 2401.2, exitPrice: 2419.8, pnl: 18.6 })`,
  },
  {
    key: 'advisory', label: 'Advisory', icon: Briefcase,
    intro: 'Pull EMIL research into your client workflow: instrument reports, the morning brief, calendar and central-bank context.',
    steps: [
      'Issue a live key with research, news, calendar and market_data scopes (research uses AI credits).',
      'GET /research/report?symbol=EUR/USD for a structured, calculated write-up; GET /research/brief for the daily brief.',
      'GET /calendar and /calendar/central-banks for the week ahead; GET /news?score=1 for impact-scored headlines.',
      'Every payload carries its data label (delayed research, model assessment). Keep those labels when you show it to clients.',
      'Coming next round: organizations, client sub-accounts, recommendation → approval workflow and white-label PDFs.',
    ],
    snippet: `report = emil.report("EUR/USD")
brief = emil.brief()
banks = emil.central_banks()`,
  },
  {
    key: 'firm', label: 'Trading firm', icon: Building2,
    intro: 'Run desks against EMIL: consolidated portfolio, paper execution for strategy validation, webhooks into your risk systems.',
    steps: [
      'Issue live keys per desk with portfolio, paper_trade and webhooks scopes; pin each key to the desk\'s egress IPs.',
      'GET /portfolio for exposure across every linked venue; POST /paper/orders to validate strategies on sandbox venues (live execution is never exposed).',
      'Add a webhook for alert.triggered, risk.override and paper.order.placed; verify signatures with the SDK helper.',
      'GET /stream (Pro+) for a server-sent-events feed of quotes and EMIL state.',
      'Coming next round: organizations with roles, maker-checker approvals, restricted lists, per-desk position limits and an org kill switch.',
    ],
    snippet: `await emil.createWebhook('https://risk.yourfirm.com/emil', ['alert.triggered', 'risk.override', 'paper.order.placed'])
const venues = await emil.paperVenues()
await emil.paperPlace({ venue: 'deribit_testnet', symbol: 'BTC-PERPETUAL', side: 'buy', orderType: 'limit', qty: 10, price: 60000 })`,
  },
  {
    key: 'business', label: 'Business / platform', icon: Store,
    intro: 'Embed EMIL in your product, or run EMIL analytics on your own live data.',
    steps: [
      'Issue a live key with ingest, market_data and webhooks scopes.',
      'Push your own quotes, orders and P&L: POST /ingest/quotes|orders|pnl { rows }. Rows stay isolated to your account and are labelled CUSTOMER FEED everywhere.',
      'Read EMIL data into your platform with the SDKs, or generate a client from /api/v1/openapi.json.',
      'Subscribe your platform to events via webhooks; use /status and /api/status for uptime.',
      'Coming next round: embeddable widgets (chart, news, Ask EMIL, brief), OAuth2 "Connect with EMIL", and the integrations directory (Slack, Discord, Teams, Zapier, Sheets).',
    ],
    snippet: `emil.ingest_quotes([{ "symbol": "NIFTY", "bid": 24510.5, "ask": 24511.0, "ts": "2026-09-05T09:15:00Z" }])
emil.ingest_pnl([{ "account": "desk-1", "equity": 1250000, "realized": 1820, "ts": "2026-09-05T09:15:00Z" }])
print(emil.ingest_summary())`,
  },
]

export default function DocsClient() {
  const [persona, setPersona] = useState('trader')
  const groups = useMemo(() => {
    const m = new Map<string, typeof ENDPOINTS>()
    for (const e of ENDPOINTS) m.set(e.group, [...(m.get(e.group) ?? []), e])
    return Array.from(m.entries())
  }, [])
  const p = PERSONAS.find((x) => x.key === persona) ?? PERSONAS[0]

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><BookOpenText className="h-5 w-5 text-cyan-400" /> EMIL Platform API — reference v{API_VERSION}</h1>
          <p className="text-xs text-slate-500 mt-1">Base URL <span className="font-mono text-slate-300">/api/v1</span> · auth header <span className="font-mono text-slate-300">x-api-key</span> or <span className="font-mono text-slate-300">Authorization: Bearer</span> · JSON in, JSON out · honour <span className="font-mono">Retry-After</span> on 429.</p>
        </div>
        <Link href="/developers" className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-slate-200 hover:text-white">← Keys &amp; webhooks</Link>
      </div>

      <Panel title="Quickstart by persona" icon={User} accent="cyan">
        <div className="flex gap-1.5 flex-wrap mb-3">
          {PERSONAS.map((x) => <button key={x.key} onClick={() => setPersona(x.key)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold border ${persona === x.key ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-secondary/40 text-slate-400 border-border hover:text-slate-200'}`}><x.icon className="h-3.5 w-3.5" /> {x.label}</button>)}
        </div>
        <p className="text-xs text-slate-300">{p.intro}</p>
        <ol className="mt-2 space-y-1 list-decimal pl-5 text-[11px] text-slate-400">{p.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <pre className="mt-3 text-[10px] leading-relaxed text-slate-300 bg-background/60 border border-border rounded-md p-3 overflow-x-auto whitespace-pre">{p.snippet}</pre>
      </Panel>

      <Panel title="Scopes" icon={BookOpenText} accent="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {Object.entries(SCOPES).map(([k, v]) => <div key={k} className="text-[11px]"><span className="font-mono text-amber-300">{k}</span> <span className="text-slate-400">— {v}</span></div>)}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Sandbox keys (<span className="font-mono">emil_test_…</span>) can read everything their scopes allow and place PAPER orders, but never link broker accounts. Live keys (<span className="font-mono">emil_live_…</span>) add broker linking. Neither can place live orders.</p>
      </Panel>

      {groups.map(([group, list]) => (
        <Panel key={group} title={group} icon={BookOpenText} accent="cyan" collapsible chevron="right" defaultOpen={group === 'Account' || group === 'Market data'}>
          <div className="space-y-2">
            {list.map((e) => (
              <div key={`${e.method} ${e.path}`} className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${METHOD_TONE[e.method]}`}>{e.method}</span>
                  <code className="text-[11px] text-white font-mono">/api/v1{e.path}</code>
                  <span className="text-[9px] uppercase font-mono text-slate-500 ml-auto">{e.scope === 'public' ? 'no auth' : `scope ${e.scope}`}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">{e.summary}</p>
                {e.params?.length ? <p className="text-[10px] text-slate-500 mt-1">{e.params.map((q) => <span key={q.name} className="mr-2"><span className="font-mono text-slate-300">{q.name}</span>{q.required || q.in === 'path' ? '*' : ''} — {q.description}</span>)}</p> : null}
                {e.body ? <p className="text-[10px] text-slate-500 mt-1">Body: {Object.entries(e.body).map(([k, d]) => <span key={k} className="mr-2"><span className="font-mono text-slate-300">{k}</span> — {d}</span>)}</p> : null}
                {e.notes ? <p className="text-[10px] text-amber-300/80 mt-1">{e.notes}</p> : null}
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  )
}
