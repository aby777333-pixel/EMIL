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
| API security (§11) | ROUND 4 + 5 | Secrets encrypted at rest (Round 4). **Round 5:** TOTP two-factor authentication (Settings → Two-Factor; enforced at sign-in), DB-backed rate limiting on sign-in (10/email, 30/IP per 15 min) and signup (5/IP, 60 global per hour). **Round 6:** API key **rotation** from Command → API Keys (replacement issued under the same label + old key revoked in one transaction; new plaintext shown once; audited). |
| Research terminal / global market dashboard (§12–13) | ROUND 1 (v1) + ROUND 5 crypto | **Round 5:** "Crypto — live from the venues" board on /markets: Deribit + Delta India perps (last/mark/index, 24h, 8h funding, OI, volume) and Gemini spot from public tickers, no key, cached 30 s. | /markets: global market clock, indices/metals/energy board (LIVE with the owner's Twelve Data key, 8-symbol free-tier budget, 10-min server cache), FX reference, crypto, personal watchlist. Country terminals, heatmaps, breadth: MISSING. |
| Professional charting (§14, §253) | ROUND 2 + ROUND 8 | /charts on TradingView Lightweight Charts v5: candles/line/area, 5m–1W, SMA20/50 + EMA20 + **Bollinger 20·2σ** + **RSI 14 in its own pane** (all computed in-app, §252), volume, **compare mode** (second instrument rebased to the main series' first bar), **price levels** placed by click or typed and persisted per symbol (`chart_levels`, cap 20), **saved layouts** with a default applied on first visit (`chart_layouts`, cap 12), symbol box resolves any spelling through the instrument master. Freehand drawing (trendlines/fibs) still MISSING — Lightweight Charts has no native drawing layer. |
| EMIL AI Analyst (§15) | ROUND 13 | Ask EMIL now answers from stored knowledge **plus a live context block** (`lib/live-context.ts`: market board, the user's watchlist quotes, consolidated portfolio, EMIL state, circuit breakers, next-12h calendar, latest headlines — cached 60 s per user), cited as [LIVE] with its timestamp; the client shows the grounding line. Never gives buy/sell instructions. Morning Brief (Round 9) uses the same data. |
| News intelligence (§16–17) | ROUND 1 + ROUND 9 | /news with 8 categories, publisher links, GDELT → Google News RSS fallback. **AI impact scoring**: impact (high/medium/low), tone (risk-on/off/neutral) and up to 3 affected assets per headline from ONE cached LLM call per headline batch (`lib/news-impact.ts`, research_cache 30 min, shared by all users), "High impact only" filter; labeled model assessment, never an execution trigger. Flag `news_impact_scoring`. |
| Economic calendar (§18) | ROUND 5 | /calendar: this week + next from the free Forex Factory JSON feed (cached 15 min), impact/currency filters, actual/forecast/previous, local times. No key needed. |
| Central bank monitor (§19) | ROUND 5 | /calendar top panel: 10 banks — current rate derived from the scheduled decision events (never guessed), next decision + forecast, last release, related speeches/minutes; FRED series (Fed/ECB/BoE/BoJ) added automatically once the FRED key is set. |
| Company intelligence / screeners (§21–23) | MISSING | Requires keyed providers (FMP/Finnhub/Alpha Vantage) — rows seeded, keys pending. |
| Portfolio intelligence & AI (§28–29) | ROUND 10 | **/portfolio**: the EMIL account + every venue linked with an API key (read-only tier is enough) consolidated — balances in approx USD, positions normalised through the instrument master, exposure by asset class / symbol / venue, gross/net/leverage/concentration, linear shock table (±1/3/5%). Cached 60 s. Portfolio AI commentary: MISSING. |
| Risk center & circuit breakers (§30–31) | ROUND 10 | **Circuit breakers live**: daily/weekly loss, drawdown from HWM, margin utilisation, open-position cap, consecutive losses, ±30 min high-impact news window, broker link, market-data health — evaluated on every `/api/state` read (memo 45 s) and shown on Risk Management. Disarm-class trips stop automation (armed → false, emergency event `circuit_breaker`, audit, admin notification); positions untouched. Enforcement gated by flag `circuit_breakers` (ON). |
| Strategy Center / Lab / lifecycle (§32–34, §203) | ROUND 5 | Blueprint pipeline with versioning + estimated-data lab, and now a **real-history Backtest Engine** (/backtest, `lib/backtest`): Deribit + Gemini free candles, Twelve Data when keyed; SMA cross / Donchian breakout / RSI reversion; next-open fills, fees + slippage, stop/target, long/short; honest metrics + pass/weak/fail rule; journals into lab_runs as dataMode "historical" and stamps the blueprint metrics. **Round 11:** walk-forward analysis (sequential folds, ±25% parameter grid re-tuned in-sample and traded out-of-sample, per-fold efficiency, OOS aggregate, robust/fragile/insufficient) + Monte Carlo (seeded bootstrap of trade returns: return and drawdown percentiles, P(loss), P(ruin), histogram) on the same real candles; summary journaled into lab_runs. |
| Trade journal & performance analytics (§35–36) | ROUND 5 | /journal: entries from Paper Desk fills and agent trade orders (one click) or manual; setup, tags, mistakes, exit/P&L; tag win-rates + most common mistakes; **AI post-trade review** grades the PROCESS (A–F, right/wrong, recurring patterns across history, rules for next time, risk flag). |
| Alerts / notification center (§37, §65) | ROUND 3 + ROUND 5 delivery | **Round 5:** Telegram (bot + one-time link code, no webhook) and email (Resend) delivery, opt-in per user in Settings → Alert Delivery; fan-out from the same evaluator. | /alerts + top-bar bell: price alerts on watchlist symbols (evaluated against the same cached delayed quotes — zero extra credits), race-safe triggering, in-app notification center with unread counts. Delivery is in-app only (stated honestly); email/push/Telegram: MISSING. Behind the `alerts_center` flag. |
| Institutional workspaces & roles (§38–39, §219) | MISSING | Only trader/admin roles today. |
| Navigation & global search (§40–42) | ROUND 1 + ROUND 7 | Ctrl+K command palette across cockpit + command center; **instrument-level search** live in the palette (type gold / EURUSD / SPX / nifty → chart) and as autocomplete on the watchlist add box. |
| Billing/subscriptions/wallet/crypto payments (§44–49) | PARTIAL | Plans + MRR tracked in CRM; **no payment gateway, wallet or crypto payments yet.** |
| Demo environment (§50–51) | ROUND 6 | Command → **Demo Environment**: a dedicated demo TRADER login (never the admin) — set/rotate its password (random or custom, shown once), reset its simulated portfolio to a fixed baseline (10 000 USD, open/pending positions closed at 0 P/L), operator note, reset counter; every action audited (category `demo`). Table `demo_environment`. |
| Admin panel expansion (§52) | PARTIAL | Command Center covers users/CRM/keys (+rotation)/connections/providers/feature flags/research/audit/**demo environment**; billing config, AI governance: MISSING. |
| Compliance & consent records (§53–54) | EXISTS | Consent logs with checkboxes/versions/timestamps; contextual disclaimers partially. |
| Status bar & data timestamps (§55–56, §270) | ROUND 1 (v1) | Top status bar existed; all new data boards carry source + freshness + fetched-at labels. |
| Data provider architecture (§57, §230–231, §276) | ROUND 1 | **Data Provider Hub shipped**: 23 free/open-first providers (FRED, World Bank, IMF, OECD, BIS, Eurostat, SEC EDGAR, EIA, USDA, FAOSTAT, UN Comtrade, GDELT, Open-Meteo, CoinGecko, Frankfurter, Stooq, Alpha Vantage, Twelve Data, Finnhub, FMP, Nasdaq DL, OpenFIGI, GLEIF) with license notes, freshness, priority, fallback, health tests and admin key management. |
| AI explainability / confidence (§58–59) | EXISTS | Agent votes, reasons for/against, confidence with "model assessment" framing. |
| Execution protection / idempotency (§61–62) | ROUND 4 (paper) | **First real execution loop**: `lib/execution/*` venue adapters (Deribit, Gemini, Delta) behind a guarded router — trading-tier link required, paper venues always allowed, live venues need `live_crypto_execution` + ARM + owner, per-order notional cap, every order journaled in `venue_orders` + audit. `/paper` Paper Trading Desk: instruments, ticker, ticket, balances, positions, open orders (cancel), journal. **Round 12 — execution protections** (`lib/execution/guards.ts`): duplicate-order window, per-day order budget, live orders refused while a disarm-class circuit breaker is tripped, quote latency/age limits, spread cap for market orders, fat-finger limit deviation cap, realised slippage per fill (bps, audit alert above threshold); shown on the desk. Agent-driven order flow: still to build (deliberately — autonomous_trading flag stays OFF). |
| Audit log (§64) | EXISTS | |
| Watchlists (§66) | ROUND 6 | **Named watchlists**: up to 6 lists per user (tabs on /markets), a symbol may sit on several lists, cap = 8 DISTINCT symbols across all lists (one cached quote fetch per symbol — the free-plan budget is unchanged), rename/delete, read-only **share links** `/w/<token>` (symbols only — no quotes spent on anonymous traffic, nothing about the owner). Price alerts accept a symbol on ANY list. Legacy rows adopted into "My Watchlist". |
| Correlation engine (§97–98) | ROUND 2 | /correlation: any pair, 3M–2Y, Pearson + 30-session rolling chart + beta + annualized vols + current-vs-historical regime detection (stable/strengthening/weakening/inverting), CALCULATED labeling. Matrices, lead/lag, cointegration: MISSING. |
| Server-side research cache (§73, §282) | ROUND 2 | research_cache table — one upstream fetch per TTL for all users; stale-serve-on-failure labeled STALE; free-tier credit budgets (Twelve Data 8/min) respected by design. |
| Research notebook / reports / briefs (§67–69) | ROUND 9 (briefs) | **Morning Brief** on the dashboard (`lib/brief.ts`, `/api/brief`): headline, one-liner, market pulse, the user's watchlist notes, next-30h High/Medium calendar, risks, research questions — composed strictly from hub data (board, watchlist quotes, calendar, crypto 24h, headlines), one LLM call per user per UTC day cached 6h, regenerate button, honest inputs footer. Flag `morning_brief`. **Round 14 — instrument research reports**: `/api/report?symbol=` (`lib/report.ts`) computes 1y daily statistics (returns 1d–1y, 52w range position, realised vol 20/60d, max drawdown, SMA50/200 state, RSI14, ATR14) and blends portfolio exposure, related high-impact calendar and matched headlines into one structured write-up (trend, volatility, context, catalysts, news read-through, risks, what to watch, research questions); saved to the research notebook; one LLM call per user per symbol per 6h. Buttons on /charts and /instruments. Flag `research_reports`. |
| EMIL native platform integration (§127–134, §166) | ROUND 1 + **EMIL TRADE (2026-09-03)** — the Raptor terminal cloned into this repo (`emil-trade/`, own Netlify site `emil-trade.netlify.app`, same Supabase as Raptor), rebranded; its in-terminal EMIL console removed in favour of new-tab links to this cockpit; cockpit links back (sidebar EMIL Trade / Live TV / Live Chat, Trade-With-EMIL card, ⌘K). Terminal gained **Live TV** (📺 chip, YouTube live channels) and a real **Live Chat** (💬 chip, Supabase realtime, 6 market rooms, presence, $SYMBOL links). | "Trade With EMIL" card: Option A (connect broker) vs Option B (EMIL platform → Raptor terminal) with honest LIVE vs COMING SOON labels and the demo-feed disclosure. Smart routing/venue display: MISSING (no live execution engine yet). |
| Intermarket/correlation/hedging/scenario engines (§96–§115, §138) | MISSING | Flagship institutional layer — build after historical data + keys land. |
| Instrument master & symbol normalization (§150–151) | ROUND 7 | `lib/instruments/catalog.ts` (~120 instruments: forex majors/minors/exotics, metals, index CFDs, energies, crypto, US stocks/ETFs, India NSE/BSE/MCX) with the symbol every provider knows them by — Twelve Data (ETF **PROXY** flagged honestly), TradingView, EMIL Trade, Deribit/Gemini/Delta — plus aliases, lot/tick sizes, `dataStatus`, `tradable`. Synced idempotently into `instrument_master`; `/api/instruments` (search / detail / list / resolve); `/instruments` page. `/api/data` time series + correlation and watchlist adds resolve ANY spelling (EURUSD, EUR/USD, gold, SPX, nifty…). |
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

## Round 5 (2026-09-03) — items 4–10

- Live venue crypto board (/markets), Deribit options analytics (/options, flag `options_analytics` now ON), economic calendar + central bank monitor (/calendar), Telegram/email alert delivery, real-history Backtest Engine (/backtest), Trade Journal with AI review (/journal), TOTP 2FA + sign-in/signup rate limiting.

## Round 6 (2026-09-03 evening) — EMIL Trade + community + admin hygiene

- **EMIL Trade** shipped as its own app inside this repo (see the row above and `emil-trade/README.EMIL-TRADE.md`): Live TV + Live Chat in the terminal, cockpit ↔ terminal links both ways (always new tab).
- **Named watchlists + share links** (§66) — `watchlists` table, `/w/<token>` public page, alerts accept any listed symbol.
- **API key rotation** (§11) — Command → API Keys.
- **Demo Environment** (§50–51) — Command → Demo Environment.
- Not built (blocked): **SSO between cockpit and EMIL Trade** needs the terminal Supabase project's service-role key to mint sessions — not available to the build; today it is a second sign-in. Alert delivery envs (`TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`) still unset by the owner.

## Round 7 (2026-09-03 night) — Instrument Master

- Canonical instrument catalog + normalization (`lib/instruments/*`), `instrument_master` table, `/api/instruments`, `/instruments` page, ⌘K instrument search, watchlist autocomplete, research routes accept any spelling.
- Still to grow: per-exchange instrument-master SYNC from providers (Twelve Data `/stocks`, NSE masters) — today the catalog is curated code, versioned (`CATALOG_VERSION`).

## Round 8 (2026-09-03 night) — Charting upgrades

- Compare mode, Bollinger, RSI pane, click-to-place levels, saved layouts + default (`/api/charts`, tables `chart_layouts`, `chart_levels`).

## Round 9 (2026-09-03 night) — Morning Brief + news impact scoring

- `lib/brief.ts` + `/api/brief` + dashboard card; `lib/news-impact.ts` + `score=1` on the news feed + chips/filter on /news. Both behind ON flags, both labeled model assessments, both cached in research_cache so LLM cost is bounded (≤1 brief per user per 6h; ≤1 scoring call per distinct headline batch per 30 min).

## Round 10 (2026-09-03 night) — Portfolio & Exposure + circuit breakers

- `lib/portfolio.ts` (+ `resolveVenueForRead` in the execution router), `/api/portfolio`, `/portfolio` page; `lib/breakers.ts`, `/api/breakers`, Risk page panel; state route enforces before returning.

## Round 11 (2026-09-03 night) — Backtest robustness

- `lib/backtest/robustness.ts` (walkForward, monteCarlo), `/api/backtest` `robustness` flag, two new panels on the Backtest Engine; `scripts/robustness-smoke.ts` synthetic smoke test.
- Circuit breakers: Twelve Data budget/rate-limit errors are warn-only (a budget event is not a feed outage).

## Round 12 (2026-09-03 night) — Execution protections

- Pre-trade guards + slippage accounting in the guarded router; `venue_orders` gains refPrice/slippageBps/quoteLatencyMs/guardNotes; guard config exposed on `/api/execution`; Paper Trading Desk shows the protections line and per-fill slippage. Thresholds via `EMIL_MAX_QUOTE_AGE_MS`, `EMIL_MAX_QUOTE_LATENCY_MS`, `EMIL_MAX_SPREAD_BPS`, `EMIL_MAX_LIMIT_DEVIATION_PCT`, `EMIL_SLIPPAGE_ALERT_BPS`, `EMIL_MAX_ORDERS_PER_DAY`.

## Round 13 (2026-09-03 night) — Ask EMIL with live context

- `lib/live-context.ts` + `/api/teach/ask` (body `live:false` opts out) + `X-Emil-Live` header + indicator in the Ask tab.

## Round 14 (2026-09-03 night) — Instrument research reports

- `lib/report.ts`, `/api/report`, `app/charts/_components/report-panel.tsx` (deep link `/charts?symbol=…&report=1` from the Instrument Master).

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
