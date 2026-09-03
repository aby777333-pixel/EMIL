# EMIL Universe — Gap Assessment & Build Sequence

Assessment of the running app against the EMIL Universe master specification.
Statuses: **EXISTS** · **PARTIAL** · **MISSING** · **ROUND n** (shipped in that
Universe increment; Round 3 = 2026-09-02). Rule of the build: extend, never break.

## Core platform

| Area (spec §) | Status | Notes |
|---|---|---|
| ARM/DISARM redesign, always-visible DISARM (§2–5) | ROUND 1 | Armed state now shows "EMIL ARMED — LIVE TRADING ENABLED" + a permanent top-bar DISARM (stop-automation semantics, distinct from disconnect); acknowledgements + press-and-hold retained; EMERGENCY STOP already permanent. |
| Operating modes (§3) | EXISTS | 9 modes incl. research-only (observation), advisory, confirmation, autonomous, emergency. |
| Broker permission wizard + mandatory API disclaimer (§6–7) | ROUND 4 | Connect wizard on every broker card: permission tier (Read-only / Analysis / Trading) → mandatory disclaimer (4 items, 5 for Trading; every acknowledgement written to consent_logs with version `broker-api-v1`) → credentials with provider guide + links → save & connection test. Tier stored on the link (`permissionTier`) and enforced server-side: only TRADING links reach the order router. |
| Global API Hub (§8–10) | EXISTS | 138 providers across 14 markets/regions (incl. live + testnet rows for Deribit, Delta Exchange India and Gemini); color-coded collapsible sections per region (India/Forex/US/UK/Europe/APAC/Canada/MENA/Africa/LatAm/Crypto) with provider + linked counts; region dropdown (selected/all/per-region); brokers without a public API honestly tagged `outreach_target` for BD proposals; per-customer broker links; connection dashboard fields mostly present. |
| API security (§11) | ROUND 4 (partial) | Secrets server-side, masked, audited, and now **encrypted at rest** (AES-256-GCM envelope, `EMIL_SECRETS_KEY`, `lib/secrets.ts`; legacy plaintext read transparently; `scripts/encrypt-secrets.ts` re-encrypts existing rows). Still missing: token rotation, 2FA, rate limiting. |
| Research terminal / global market dashboard (§12–13) | ROUND 1 (v1) | /markets: global market clock, indices/metals/energy board (LIVE with the owner's Twelve Data key, 8-symbol free-tier budget, 10-min server cache), FX reference, crypto, personal watchlist. Country terminals, heatmaps, breadth: MISSING. |
| Professional charting (§14, §253) | ROUND 2 | /charts on TradingView Lightweight Charts: candles/line/area, 5m–1W intervals, SMA20/50 + EMA20 computed in-app (§252), volume, quick picks + any symbol, deep link ?symbol=. Drawing tools, saved layouts, compare: MISSING. |
| EMIL AI Analyst (§15) | PARTIAL | Ask EMIL answers from the attributed knowledge base with citations; not yet wired to live market/portfolio context. |
| News intelligence (§16–17) | ROUND 1 (v1) | /news with 8 categories, publisher links, honest labeling. Primary→fallback per the hub design: GDELT DOC 2.0 → Google News RSS (both health-tested). AI impact scoring: MISSING. |
| Economic calendar (§18) | MISSING | Needs FRED/official-source keys first (provider hub now ready for them). |
| Central bank monitor (§19) | MISSING | |
| Company intelligence / screeners (§21–23) | MISSING | Requires keyed providers (FMP/Finnhub/Alpha Vantage) — rows seeded, keys pending. |
| Portfolio intelligence & AI (§28–29) | PARTIAL | Capital/positions exist for the demo account; multi-broker consolidation, exposure map, scenarios: MISSING. |
| Risk center & circuit breakers (§30–31) | PARTIAL | Risk profile, limits, guardian, emergency events exist; automatic circuit-breaker enforcement on live data conditions: MISSING. |
| Strategy Center / Lab / lifecycle (§32–34, §203) | EXISTS/PARTIAL | Blueprint pipeline with versioning, estimated-data lab, paper stage; real backtesting engine on historical data: MISSING. |
| Trade journal & performance analytics (§35–36) | PARTIAL | Trade cards, audit, learning events; journaling with AI post-trade analysis: MISSING. |
| Alerts / notification center (§37, §65) | ROUND 3 | /alerts + top-bar bell: price alerts on watchlist symbols (evaluated against the same cached delayed quotes — zero extra credits), race-safe triggering, in-app notification center with unread counts. Delivery is in-app only (stated honestly); email/push/Telegram: MISSING. Behind the `alerts_center` flag. |
| Institutional workspaces & roles (§38–39, §219) | MISSING | Only trader/admin roles today. |
| Navigation & global search (§40–42) | ROUND 1 | Ctrl+K command palette across cockpit + command center; instrument-level search: MISSING. |
| Billing/subscriptions/wallet/crypto payments (§44–49) | PARTIAL | Plans + MRR tracked in CRM; **no payment gateway, wallet or crypto payments yet.** |
| Demo environment (§50–51) | PARTIAL | Seeded demo account + simulated portfolio exist; admin-managed demo credentials/reset: MISSING. |
| Admin panel expansion (§52) | PARTIAL | Command Center covers users/CRM/keys/connections/providers/research/audit; billing config, AI governance, feature flags: MISSING. |
| Compliance & consent records (§53–54) | EXISTS | Consent logs with checkboxes/versions/timestamps; contextual disclaimers partially. |
| Status bar & data timestamps (§55–56, §270) | ROUND 1 (v1) | Top status bar existed; all new data boards carry source + freshness + fetched-at labels. |
| Data provider architecture (§57, §230–231, §276) | ROUND 1 | **Data Provider Hub shipped**: 23 free/open-first providers (FRED, World Bank, IMF, OECD, BIS, Eurostat, SEC EDGAR, EIA, USDA, FAOSTAT, UN Comtrade, GDELT, Open-Meteo, CoinGecko, Frankfurter, Stooq, Alpha Vantage, Twelve Data, Finnhub, FMP, Nasdaq DL, OpenFIGI, GLEIF) with license notes, freshness, priority, fallback, health tests and admin key management. |
| AI explainability / confidence (§58–59) | EXISTS | Agent votes, reasons for/against, confidence with "model assessment" framing. |
| Execution protection / idempotency (§61–62) | ROUND 4 (paper) | **First real execution loop**: `lib/execution/*` venue adapters (Deribit, Gemini, Delta) behind a guarded router — trading-tier link required, paper venues always allowed, live venues need `live_crypto_execution` + ARM + owner, per-order notional cap, every order journaled in `venue_orders` + audit. `/paper` Paper Trading Desk: instruments, ticker, ticket, balances, positions, open orders (cancel), journal. Slippage/latency guards and agent-driven order flow: still to build. |
| Audit log (§64) | EXISTS | |
| Watchlists (§66) | ROUND 2 | Per-user watchlist on /markets with cached delayed quotes, add/remove, chart deep links; capped 8 symbols on the free data plan (stated honestly). Multiple named lists, alerts, sharing: MISSING. |
| Correlation engine (§97–98) | ROUND 2 | /correlation: any pair, 3M–2Y, Pearson + 30-session rolling chart + beta + annualized vols + current-vs-historical regime detection (stable/strengthening/weakening/inverting), CALCULATED labeling. Matrices, lead/lag, cointegration: MISSING. |
| Server-side research cache (§73, §282) | ROUND 2 | research_cache table — one upstream fetch per TTL for all users; stale-serve-on-failure labeled STALE; free-tier credit budgets (Twelve Data 8/min) respected by design. |
| Research notebook / reports / briefs (§67–69) | PARTIAL | Research notebook exists (auto sessions); report generation, morning briefs: MISSING. |
| EMIL native platform integration (§127–134, §166) | ROUND 1 | "Trade With EMIL" card: Option A (connect broker) vs Option B (EMIL platform → Raptor terminal) with honest LIVE vs COMING SOON labels and the demo-feed disclosure. Smart routing/venue display: MISSING (no live execution engine yet). |
| Intermarket/correlation/hedging/scenario engines (§96–§115, §138) | MISSING | Flagship institutional layer — build after historical data + keys land. |
| Instrument master & symbol normalization (§150–151) | MISSING | Prerequisite for the equities terminal. |
| Feature flags (§77) | ROUND 3 | Command → Feature Flags: DB-backed flags, audited toggles, ~30s in-process cache, new flags start OFF. Seeded: alerts_center (ON), autonomous_trading / crypto_payments / institutional_workspaces / options_analytics (OFF). |
| Global-state safety (§39, hardening) | ROUND 3 | ARM, mode change and any close-all are now owner(admin)-only — EmilState is a single global row and self-signup is open. DISARM (stop automation) and EMERGENCY STOP deliberately stay available to every signed-in user: a kill switch is never permission-walled. |

## Round 3 fixes (2026-09-02)

- `data_providers` catalog is now seeded idempotently (`scripts/seed.ts`) — a
  fresh DB gets the full hub; owner keys/toggles are never overwritten.
- `research_cache` no longer grows without bound: spent `td_budget_*` counter
  minutes are purged on each reservation, and ~2% of cache writes evict
  entries older than 7 days.
- AI routes (Explain, Knowledge Council, Ask EMIL, Lab LLM) return an honest
  503 "AI engine not configured" when `ABACUSAI_API_KEY` is missing instead of
  sending `Bearer undefined`; the variable is documented in `.env.example`.
- Stooq's admin health test now reports "retired" instead of a fake failure.
- Command palette covers all Command Center sections (connections, flags,
  audit added) and the Alert Center.

## Round 4 (2026-09-03) — Paper execution, connect wizard, encryption at rest

- Paper Trading Desk (`/paper`, flag `paper_trading_desk` ON) on Deribit Testnet / Gemini Sandbox / Delta Demo; live rows gated by `live_crypto_execution` (OFF).
- Broker connect wizard with Read-only / Analysis / Trading tiers + mandatory disclaimer; consent logged.
- Credentials encrypted at rest with `EMIL_SECRETS_KEY`; `scripts/encrypt-secrets.ts` migrates existing rows.

## Recommended next rounds

1. **Keys round** — owner adds free API keys (FRED, EIA, Finnhub/Twelve Data, FMP) in Command → Data Providers; then economic calendar, central-bank monitor, company pages and screeners unlock.
2. **Instrument master + charting** — normalized instrument DB, watchlist growth, global search over instruments.
3. **Portfolio/exposure/scenario layer** — consolidated multi-broker portfolio, exposure map, scenario + hedge simulators.
4. **Commerce round** — payment gateway, billing portal, wallet, admin billing config (feature flags now exist to gate it).
5. **Execution safety round** — circuit breakers on data health, execution protections, real backtesting engine.
6. **Security round (pre-revenue)** — encrypt provider/broker keys at rest, rate-limit /api/signup + login, 2FA, per-user trading state if EMIL ever manages more than the owner's account.

## Standing rules honored

Research data ≠ execution data (every hub feed is labeled and never drives
orders). Research availability ≠ trading availability. Paper ≠ live. Nothing
future is labeled live. Secrets never reach the browser. All changes additive.
