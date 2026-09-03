# -*- coding: utf-8 -*-
"""Regenerates EMIL-How-To-Work-On-EMIL.pdf (the operator manual).
Run from the repo root:  python scripts/build-manual.py
Keep the outline in sync with GAPS.md when rounds ship."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, ListFlowable, ListItem

VERSION = "Universe Round 15"
DATE = "4 September 2026"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "EMIL-How-To-Work-On-EMIL.pdf")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Heading1"], fontSize=15, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#0e7490"))
H2 = ParagraphStyle("H2", parent=ss["Heading2"], fontSize=11.5, spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#155e75"))
P = ParagraphStyle("P", parent=ss["BodyText"], fontSize=9.2, leading=12.5)
SM = ParagraphStyle("SM", parent=P, fontSize=8.2, leading=11, textColor=colors.HexColor("#334155"))
MONO = ParagraphStyle("MONO", parent=P, fontName="Courier", fontSize=8.2, leading=11, backColor=colors.HexColor("#f1f5f9"), leftIndent=4, borderPadding=3)
TITLE = ParagraphStyle("TITLE", parent=ss["Title"], fontSize=24, textColor=colors.HexColor("#0e7490"), spaceAfter=6)
SUB = ParagraphStyle("SUB", parent=P, fontSize=11, textColor=colors.HexColor("#475569"))

def bullets(items, style=P):
    return ListFlowable([ListItem(Paragraph(i, style), leftIndent=10) for i in items], bulletType="bullet", start="•", leftIndent=12)

def table(rows, widths):
    t = Table([[Paragraph(c, SM) for c in r] for r in rows], colWidths=widths)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(18 * mm, 287 * mm, f"EMIL · How to Work on EMIL · {VERSION} · 2026-09-04")
    canvas.drawRightString(192 * mm, 287 * mm, f"Page {doc.page}")
    canvas.restoreState()

story = []
story += [Spacer(1, 40 * mm), Paragraph("EMIL", TITLE), Paragraph("Evolutionary Market Intelligence Layer", SUB), Spacer(1, 8 * mm),
          Paragraph("HOW TO WORK ON EMIL", ParagraphStyle("t2", parent=TITLE, fontSize=18)),
          Paragraph("The operating manual for developing, extending and deploying the EMIL platform — cockpit, Command Center and EMIL Trade.", SUB),
          Spacer(1, 6 * mm), Paragraph(f"Version: {VERSION} · {DATE}", P),
          Paragraph("Prepared for the EMIL owner/operator. Keep alongside GAPS.md, README.md, STYLE_GUIDE.md and emil-trade/README.EMIL-TRADE.md in the repo.", SM), PageBreak()]

story += [Paragraph("1 · What EMIL is", H1), Paragraph(
    "EMIL is a professional financial intelligence, research and (authorization-gated) trading cockpit: a multi-agent trading brain with a "
    "Bloomberg-style research terminal around it, a separate Super-Admin Command Center, and — since 3 September 2026 — its own native trading "
    "platform, <b>EMIL Trade</b> (a rebranded clone of the Raptor terminal living inside this repo). The Universe loop: OBSERVE → VERIFY → UNDERSTAND → "
    "RESEARCH → SIMULATE → HEDGE → AUTHORIZE → EXECUTE → MONITOR → LEARN.", P), Spacer(1, 3 * mm),
    table([
        ["Cockpit (live)", "https://serene-frangollo-a3c59c.netlify.app · Netlify site 8d9e2863-26ee-48c4-8e0f-a4a6f0448fb1 (serene-frangollo-a3c59c), team slug aby777333"],
        ["Super admin", "/command on the live site — admin role required, verified server-side per request"],
        ["EMIL Trade (live)", "https://emil-trade.netlify.app · Netlify site 56cac256-2896-473c-b43a-dd8105162792, git-connected with base directory emil-trade; Supabase leumpgkfillgeyyfptef (shared with Raptor: same logins/accounts)"],
        ["GitHub", "https://github.com/aby777333-pixel/EMIL.git — branch main; a push builds BOTH Netlify sites (EMIL Trade only when emil-trade/ changed)"],
        ["Local folder", "C:\\Users\\GIO4X\\Documents\\EMIL SEP 26 (cockpit at the root, terminal in emil-trade/)"],
        ["Cockpit database", "Supabase jnjxudsjyrftehwwdufs (Postgres + Prisma); app role emil_app via the transaction pooler (:6543, pgbouncer=true)"],
        ["Key repo docs", "GAPS.md = spec gap assessment + round log · STYLE_GUIDE.md = design system · README.md = setup · emil-trade/README.EMIL-TRADE.md = terminal provenance + deploy"],
    ], [38 * mm, 136 * mm])]

story += [Paragraph("2 · The golden rules (non-negotiable)", H1), bullets([
    "<b>Do not break existing behaviour.</b> Every change is additive; verify the adjacent features after you touch anything.",
    "<b>Research data ≠ execution data.</b> Hub feeds are labelled (source, freshness, fetched-at, STALE, ETF PROXY) and never drive an order.",
    "<b>Research availability ≠ trading availability. Paper ≠ live ≠ demo.</b> Never label a future feature as live.",
    "<b>Free/open-first data, never scraping, never licence violations.</b> Twelve Data free tier = 8 credits/min: EMIL budgets 7, caches server-side, refuses locally with retry-after.",
    "<b>EMIL never tells anyone to buy or sell.</b> Briefs, reports, news scores and Ask EMIL are model assessments; the UI says so every time.",
    "<b>Kill switches are never permission-walled or flag-gated.</b> DISARM and EMERGENCY STOP stay available to every signed-in user; ARM, mode change and close-all are owner-only.",
    "<b>Secrets never reach the browser.</b> Provider/broker credentials are encrypted at rest (EMIL_SECRETS_KEY); API keys are stored as SHA-256 hashes and shown once.",
    "<b>Honest states everywhere:</b> add-a-key, coming soon, unavailable, cached, stale, proxy, paper.",
])]

story += [Paragraph("3 · Architecture", H1),
    Paragraph("<b>Stack.</b> Next.js 14 App Router (cockpit) · Prisma 6 on Supabase Postgres · NextAuth v4 credentials + JWT · Tailwind + shadcn/radix · TradingView Lightweight Charts v5 · Abacus chat-completions (gpt-5.4-mini, env ABACUSAI_API_KEY) for all LLM work · Netlify with @netlify/plugin-nextjs. EMIL Trade: Next.js 16 / React 19 / Tailwind 4 / Supabase (its own package.json, node_modules and netlify.toml inside emil-trade/).", P),
    Paragraph("Surfaces", H2), bullets([
        "<b>Cockpit</b> (cyan): dashboard (+Morning Brief), /markets (+named watchlists, share links), /instruments (Instrument Master), /heatmap, /charts (compare, Bollinger, RSI pane, levels, layouts, research report), /correlation, /news (+AI impact scores), /alerts, /arm, /trades, /portfolio (consolidated exposure), /agents, /api-hub, /paper (protections shown), /backtest (+walk-forward, Monte Carlo), /options, /calendar, /journal, /risk (+circuit breakers), /capital, /strategies, /lab, /teach (Ask EMIL with live context), /trust, /settings. Sidebar deep links open EMIL Trade, Live TV and Live Chat in a new tab.",
        "<b>Command Center</b> (amber, admin-only): overview, customers·CRM, broker connections, data providers, API keys (+rotate), feature flags, demo environment, research ops, audit trail. Gated in app/command/layout.tsx by a per-request DB role check.",
        "<b>EMIL Trade</b> (emil-trade/): the terminal (/terminal), Live TV (📺 chip + /terminal/tv), Live Chat (💬 chip + /terminal/chat, Supabase realtime, 6 rooms), ABIN, scanner, hedge, EA builder, dealer desk… Every EMIL surface inside it opens the cockpit in a new tab (src/lib/emil-link.ts).",
        "<b>Platform API</b> /api/v1/[...path] — customer API keys issued and rotated from the Command Center.",
        "<b>Data layer</b> lib/data/hub.ts (fetch, cache, budgets, health) · lib/data/catalog.ts (providers) · lib/data/calendar.ts · lib/data/heat.ts · lib/instruments/* (master + normalisation) · research_cache table.",
        "<b>Intelligence layer</b> lib/brief.ts (Morning Brief) · lib/news-impact.ts · lib/report.ts (instrument reports) · lib/live-context.ts (Ask EMIL grounding) · lib/teach/llm.ts (llmJson).",
        "<b>Safety layer</b> lib/breakers.ts (circuit breakers, enforced on every /api/state read) · lib/execution/guards.ts (pre-trade protections) · lib/execution/router.ts (the only order path) · lib/flags.ts.",
    ]),
    Paragraph("Key conventions", H2), bullets([
        "Pages: app/&lt;route&gt;/page.tsx wraps app/&lt;route&gt;/_components/&lt;name&gt;-client.tsx in CockpitShell; export const dynamic = 'force-dynamic'.",
        "<b>Navigation trio:</b> a new page goes into components/cockpit/nav-items.ts AND command-palette.tsx (and components/command/shell.tsx for admin pages). External items carry external: true (new tab).",
        "<b>Any spelling resolves through the instrument master</b> (lib/instruments/catalog.ts): EURUSD, EUR/USD, gold, SPX, nifty… Research routes, watchlist adds and charts call toTwelveData()/resolveInstrument().",
        "New feature flags start OFF unless the feature is deliberately shipped ON (alerts_center, options_analytics, paper_trading_desk, morning_brief, news_impact_scoring, circuit_breakers, research_reports are ON; live_crypto_execution and autonomous_trading are OFF).",
    ])]

story += [Paragraph("4 · Database practice", H1), bullets([
    "Schema first: edit prisma/schema.prisma → npx prisma generate → apply the DDL on Supabase (Supabase MCP apply_migration / SQL editor as the postgres role) → code. <b>Never</b> prisma db push against the pooler (it hangs on pgbouncer).",
    "Tables created by the postgres role inherit emil_app grants through default privileges; when in doubt add explicit GRANT SELECT, INSERT, UPDATE, DELETE … TO emil_app.",
    "Migrations are additive. Use IF NOT EXISTS / ON CONFLICT DO NOTHING so a re-run is harmless. Recent examples: watchlists, chart_layouts, chart_levels, instrument_master, demo_environment, venue_orders guard columns.",
    "Feature flags live in feature_flags (id, key, label, description, enabled) — id is a required text; use ff_&lt;key&gt;.",
    "EMIL Trade's tables (chat_rooms, chat_messages) live in the Raptor Supabase project with RLS; the terminal repo itself was not changed.",
])]

story += [Paragraph("5 · The standard change workflow", H1), table([
    ["1. Inspect", "Read GAPS.md and the code you will touch. Trace reuse. Understand before editing."],
    ["2. Extend", "Smallest safe change. New feature = new files + minimal wiring, never rewrites of stable logic."],
    ["3. Schema first", "schema.prisma → prisma generate → DDL on Supabase → code (section 4)."],
    ["4. Type-check + build", "npx tsc --noEmit -p tsconfig.json, then npx next build must exit clean. NEVER run next build while next dev is running (they share .next)."],
    ["5. Verify live", "Cockpit dev server: launch config emil-dev (port 3470). EMIL Trade dev: emil-trade-terminal (port 3461; needs emil-trade/.env.local with the Supabase vars). Sign in, exercise the feature and its neighbours, check the console."],
    ["6. Regression", "Dashboard, /markets, /arm, /command load clean? Mobile not overflowing? Old features untouched?"],
    ["7. Update GAPS.md", "Move shipped items, add the round section, keep the roadmap honest."],
    ["8. Commit + push", "Descriptive commit to main. CRLF warnings on Windows are normal."],
    ["9. Deploy cockpit", "npx netlify api createSiteBuild --data '{\"site_id\":\"8d9e2863-26ee-48c4-8e0f-a4a6f0448fb1\",\"clear_cache\":true}' — never deploy a locally built .next from Windows."],
    ["10. Deploy EMIL Trade", "A push that touches emil-trade/ builds it automatically; force one with the same command and site_id 56cac256-2896-473c-b43a-dd8105162792. NEVER netlify deploy --build from the subfolder (the CLI takes the git root as project root and drops the server function → every page 404s)."],
    ["11. Verify prod", "Sign in on the live site (admin), spot-check the changed pages; same-origin fetches from the browser console are a fast way to prove APIs."],
], [36 * mm, 138 * mm])]

story += [Paragraph("6 · Environment & secrets", H1), table([
    ["DATABASE_URL", "Supabase transaction pooler (:6543/postgres?pgbouncer=true&connection_limit=1) as emil_app — session mode hits its client cap under Lambda."],
    ["NEXTAUTH_SECRET / NEXTAUTH_URL", "Auth; set on Netlify."],
    ["ABACUSAI_API_KEY", "All LLM work (Ask EMIL, briefs, reports, news scoring, journal reviews). Missing key = honest 503, never a fake answer."],
    ["EMIL_SECRETS_KEY", "AES-256-GCM key for credentials at rest (enc:v1: prefix). Rotating it requires re-encrypting rows."],
    ["TELEGRAM_BOT_TOKEN / RESEND_API_KEY / EMAIL_FROM", "Alert delivery (Telegram + email). Still unset by the owner → in-app only."],
    ["EMIL_PAPER_MAX_NOTIONAL_USD / EMIL_LIVE_MAX_NOTIONAL_USD", "Per-order caps (defaults 25 000 / 1 000)."],
    ["EMIL_MAX_QUOTE_AGE_MS, EMIL_MAX_QUOTE_LATENCY_MS, EMIL_MAX_SPREAD_BPS, EMIL_MAX_LIMIT_DEVIATION_PCT, EMIL_SLIPPAGE_ALERT_BPS, EMIL_MAX_ORDERS_PER_DAY", "Execution protections (defaults 10 000 ms, 3 000 ms, 60 bps, 5 %, 25 bps, 200/day). Quote age refuses LIVE orders only — sandbox tickers stamp the last trade."],
    ["EMIL Trade (emil-trade/netlify.toml)", "NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (Raptor project), NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_EMIL_COCKPIT_URL, Twelve Data key. Local dev needs the same in emil-trade/.env.local (gitignored)."],
], [58 * mm, 116 * mm])]

story += [Paragraph("7 · Data Provider Hub rules", H1), bullets([
    "Free/open-first, modular, honest. Providers are catalogued in lib/data/catalog.ts with licence notes, priority, fallback and health tests; all fetching goes through lib/data/hub.ts (timeout fetch, health stamps, research_cache, stale-serve labelled STALE).",
    "Twelve Data: 8 credits/min free. The board is 6 symbols (ETF proxies, labelled), watchlists cap at 8 DISTINCT symbols across all named lists, alerts ride watchlist quotes, charts/reports cost 1 credit per uncached series. A budget hit is a 429 with retry-after — and a WARN, not a trip, for the market-data breaker.",
    "Frankfurter (ECB fixings) powers FX rates and the FX heatmap (time series /v1/{from}..{to}?base=USD); CoinGecko powers crypto boards/heat; Forex Factory JSON powers the calendar (next-week feed 404s — handled); GDELT → Google News RSS for headlines.",
    "LLM cost is bounded by caching: ≤1 Morning Brief per user per 6 h, ≤1 news-scoring call per distinct headline batch per 30 min, ≤1 research report per user per symbol per 6 h, Ask EMIL live context cached 60 s.",
    "Adding a provider: catalog entry → bespoke health test in testProvider() → fetch through cachedFetch with an explicit TTL → label source + freshness in the UI.",
])]

story += [Paragraph("8 · Auth, roles & safety systems", H1), bullets([
    "Roles: trader | admin. requireAdmin() is a per-request DB check; the JWT role is a UI hint only. EmilState is ONE global row: ARM, mode change and close-all are admin-only; DISARM and EMERGENCY STOP are open to all.",
    "<b>Circuit breakers</b> (lib/breakers.ts): daily/weekly loss, drawdown from HWM, margin utilisation, open-position cap, consecutive losses, ±30 min high-impact news window, broker link, market-data health. Evaluated on every /api/state read (memo 45 s); a disarm-class trip sets armed=false, writes an emergency_events row (circuit_breaker), audits and notifies admins. Enforcement gated by flag circuit_breakers; positions are never touched.",
    "<b>Execution protections</b> (lib/execution/guards.ts) run inside the guarded router for every order: duplicate window, daily budget, breaker gate (live refused, paper noted), quote latency/age, spread cap for market orders, fat-finger limit deviation, realised slippage per fill with an audit alert.",
    "Live venue orders additionally need flag live_crypto_execution ON + ARMED + admin; paper venues (Deribit testnet, Gemini sandbox, Delta demo) are always allowed within the paper cap.",
    "2FA (TOTP) and DB-backed rate limits on sign-in/sign-up exist. API keys rotate from Command → API Keys (old key revoked the moment the new one is issued).",
    "Demo environment (Command → Demo Environment): a dedicated demo TRADER login — rotate its password, reset its portfolio to the baseline; every action audited.",
])]

story += [Paragraph("9 · Gotchas that cost hours", H1), bullets([
    "The dev server talks to the PRODUCTION database. Test artefacts are real — clean them up.",
    "next build while next dev runs corrupts .next. Scripted import edits can produce ',,' or duplicate imports — always tsc --noEmit after them.",
    "EMIL Trade inside the repo: two lockfiles → Next infers the PARENT as root unless turbopack.root/outputFileTracingRoot are pinned (they are, in emil-trade/next.config.ts). Stale .next/dev after a root change → rm -rf .next.",
    "netlify deploy --build from emil-trade/ silently drops the Next server function (pages 404, static + edge middleware work). Use the git-connected build.",
    "Supabase Realtime: the sender's own INSERT can land before the channel is SUBSCRIBED — echo the inserted row optimistically (Live Chat does).",
    "Gemini sandbox: crossed/stale book, ticker ts = last trade, order ids > MAX_SAFE_INTEGER. Delta demo keys need EMIL's egress IP whitelisted (Netlify IPs vary).",
    "Netlify functions time out ~26 s: keep LLM batches small (news scoring caps at 24 headlines; brief ~18 s).",
    "Twelve Data free plan also has a DAILY cap (800 credits): on 2026-09-03 the account burned 2 652 in a day (chart retry loops + testing). EMIL now reserves against a per-day counter (TD_DAILY_BUDGET, default 760) and refused reservations no longer count; a daily refusal carries a retry-after to 00:00 UTC.",
    "Windows CRLF warnings on commit are normal; do not 'fix' them repo-wide.",
])]

story += [Paragraph("10 · Where EMIL stands (Round 15, 2026-09-04)", H1), Paragraph("Shipped and live", H2), bullets([
    "Rounds 1–5: hub, markets, charts, correlation, news, alerts, flags, paper desk, connect wizard, encryption, options, calendar, backtests, journal, 2FA.",
    "Round 6: EMIL Trade (terminal clone with Live TV + Live Chat, cockpit ↔ terminal links), named watchlists + share links, API key rotation, Demo Environment.",
    "Round 7: Instrument Master + symbol normalisation + ⌘K instrument search. Round 8: charting compare/Bollinger/RSI/levels/layouts.",
    "Round 9: Morning Brief + AI news impact scoring. Round 10: Portfolio & Exposure + circuit breakers. Round 11: walk-forward + Monte Carlo.",
    "Round 12: execution protections. Round 13: Ask EMIL grounded in live context. Round 14: instrument research reports. Round 15: Heatmap & Breadth.",
]), Paragraph("Still open (and why)", H2), bullets([
    "SSO between cockpit and EMIL Trade — needs the Raptor Supabase service-role key to mint sessions; today it is a second sign-in.",
    "Alert delivery (Telegram/email) — envs unset. Company intelligence & screeners, country terminals — need FMP/Finnhub/EIA/FRED keys in Command → Data Providers.",
    "Payments/wallet/billing — no provider yet (flag crypto_payments OFF). Institutional workspaces/teams — large, not started. Agent-driven live order flow — deliberately not built (autonomous_trading OFF).",
    "Owner actions: rotate the Gemini/Delta keys pasted in chat, whitelist EMIL's IP on the Delta demo key, set the alert envs, add free data keys.",
])]

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm, title="EMIL — How to Work on EMIL", author="EMIL")
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print("wrote", OUT)
