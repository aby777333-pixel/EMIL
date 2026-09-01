# EMIL Universe — Gap Assessment & Build Sequence

Assessment of the running app against the EMIL Universe master specification.
Statuses: **EXISTS** · **PARTIAL** · **MISSING** · **ROUND 1** (shipped in the
Universe Round 1 increment). Rule of the build: extend, never break.

## Core platform

| Area (spec §) | Status | Notes |
|---|---|---|
| ARM/DISARM redesign, always-visible DISARM (§2–5) | ROUND 1 | Armed state now shows "EMIL ARMED — LIVE TRADING ENABLED" + a permanent top-bar DISARM (stop-automation semantics, distinct from disconnect); acknowledgements + press-and-hold retained; EMERGENCY STOP already permanent. |
| Operating modes (§3) | EXISTS | 9 modes incl. research-only (observation), advisory, confirmation, autonomous, emergency. |
| Broker permission wizard + mandatory API disclaimer (§6–7) | PARTIAL | Per-customer credential isolation and consent logging exist; a dedicated connect-wizard modal with read/analysis/trading permission tiers is still to build. |
| Global API Hub (§8–10) | EXISTS | 43 providers across regions/asset classes; per-customer broker links; connection dashboard fields mostly present. |
| API security (§11) | PARTIAL | Secrets server-side, masked, audited; **still missing: encryption at rest, token rotation, 2FA, rate limiting.** |
| Research terminal / global market dashboard (§12–13) | ROUND 1 (v1) | /markets: global market clock, indices/metals/energy board, FX reference, crypto — all source-labeled. Country terminals, heatmaps, breadth: MISSING. |
| Professional charting (§14) | MISSING | Recharts only; TradingView Lightweight Charts is the intended path. |
| EMIL AI Analyst (§15) | PARTIAL | Ask EMIL answers from the attributed knowledge base with citations; not yet wired to live market/portfolio context. |
| News intelligence (§16–17) | ROUND 1 (v1) | /news over GDELT with 8 categories, publisher links, honest labeling. AI impact scoring: MISSING. |
| Economic calendar (§18) | MISSING | Needs FRED/official-source keys first (provider hub now ready for them). |
| Central bank monitor (§19) | MISSING | |
| Company intelligence / screeners (§21–23) | MISSING | Requires keyed providers (FMP/Finnhub/Alpha Vantage) — rows seeded, keys pending. |
| Portfolio intelligence & AI (§28–29) | PARTIAL | Capital/positions exist for the demo account; multi-broker consolidation, exposure map, scenarios: MISSING. |
| Risk center & circuit breakers (§30–31) | PARTIAL | Risk profile, limits, guardian, emergency events exist; automatic circuit-breaker enforcement on live data conditions: MISSING. |
| Strategy Center / Lab / lifecycle (§32–34, §203) | EXISTS/PARTIAL | Blueprint pipeline with versioning, estimated-data lab, paper stage; real backtesting engine on historical data: MISSING. |
| Trade journal & performance analytics (§35–36) | PARTIAL | Trade cards, audit, learning events; journaling with AI post-trade analysis: MISSING. |
| Alerts / notification center (§37, §65) | MISSING | |
| Institutional workspaces & roles (§38–39, §219) | MISSING | Only trader/admin roles today. |
| Navigation & global search (§40–42) | ROUND 1 | Ctrl+K command palette across cockpit + command center; instrument-level search: MISSING. |
| Billing/subscriptions/wallet/crypto payments (§44–49) | PARTIAL | Plans + MRR tracked in CRM; **no payment gateway, wallet or crypto payments yet.** |
| Demo environment (§50–51) | PARTIAL | Seeded demo account + simulated portfolio exist; admin-managed demo credentials/reset: MISSING. |
| Admin panel expansion (§52) | PARTIAL | Command Center covers users/CRM/keys/connections/providers/research/audit; billing config, AI governance, feature flags: MISSING. |
| Compliance & consent records (§53–54) | EXISTS | Consent logs with checkboxes/versions/timestamps; contextual disclaimers partially. |
| Status bar & data timestamps (§55–56, §270) | ROUND 1 (v1) | Top status bar existed; all new data boards carry source + freshness + fetched-at labels. |
| Data provider architecture (§57, §230–231, §276) | ROUND 1 | **Data Provider Hub shipped**: 23 free/open-first providers (FRED, World Bank, IMF, OECD, BIS, Eurostat, SEC EDGAR, EIA, USDA, FAOSTAT, UN Comtrade, GDELT, Open-Meteo, CoinGecko, Frankfurter, Stooq, Alpha Vantage, Twelve Data, Finnhub, FMP, Nasdaq DL, OpenFIGI, GLEIF) with license notes, freshness, priority, fallback, health tests and admin key management. |
| AI explainability / confidence (§58–59) | EXISTS | Agent votes, reasons for/against, confidence with "model assessment" framing. |
| Execution protection / idempotency (§61–62) | PARTIAL | Idempotency keys on orders; slippage/spread/latency guards are schema-level, not enforced (no live execution yet). |
| Audit log (§64) | EXISTS | |
| Watchlists / research notebook / reports / briefs (§66–69) | PARTIAL | Research notebook exists (auto sessions); watchlists, report generation, morning briefs: MISSING. |
| EMIL native platform integration (§127–134, §166) | ROUND 1 | "Trade With EMIL" card: Option A (connect broker) vs Option B (EMIL platform → Raptor terminal) with honest LIVE vs COMING SOON labels and the demo-feed disclosure. Smart routing/venue display: MISSING (no live execution engine yet). |
| Intermarket/correlation/hedging/scenario engines (§96–§115, §138) | MISSING | Flagship institutional layer — build after historical data + keys land. |
| Instrument master & symbol normalization (§150–151) | MISSING | Prerequisite for the equities terminal. |
| Feature flags (§77) | MISSING | Planned with the next admin round. |

## Recommended next rounds

1. **Keys round** — owner adds free API keys (FRED, EIA, Finnhub/Twelve Data, FMP) in Command → Data Providers; then economic calendar, central-bank monitor, company pages and screeners unlock.
2. **Instrument master + charting** — normalized instrument DB, TradingView Lightweight Charts, watchlists, global search over instruments.
3. **Portfolio/exposure/scenario layer** — consolidated multi-broker portfolio, exposure map, scenario + hedge simulators.
4. **Commerce round** — payment gateway, billing portal, wallet, feature flags, admin billing config.
5. **Execution safety round** — circuit breakers on data health, execution protections, real backtesting engine.

## Standing rules honored

Research data ≠ execution data (every hub feed is labeled and never drives
orders). Research availability ≠ trading availability. Paper ≠ live. Nothing
future is labeled live. Secrets never reach the browser. All changes additive.
