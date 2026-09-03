> **This is the EMIL Trade clone.** The in-terminal EMIL layer described below was REMOVED; EMIL now lives in the EMIL Control Cockpit app — see `README.EMIL-TRADE.md` and `src/lib/emil-link.ts`.

# EMIL_INTEGRATION_NOTES.md — Phase 0 Recon

EMIL (Evolving Market Intelligence Lab) is being built as an **additive orchestration layer**
inside the RAPTOR terminal. This document maps the existing systems EMIL coordinates and
records the integration decisions. Nothing existing was modified during recon.

## Existing intelligence engines (all preserved, all reused as-is)

| Engine | Location | What EMIL consumes |
|---|---|---|
| NEXUS market-state | `src/lib/nexus/market-state.ts` | Regime classification + confidence + evidence |
| NEXUS entry-exit | `src/lib/nexus/entry-exit.ts` | Entry zones, stops, targets, no-setup verdicts |
| Trade Scanner | `src/lib/trading/scanner-engine.ts` | Scored opportunities per symbol × TF |
| Hedge Engine | `src/lib/trading/hedge-engine.ts` | Viable hedges, correlations, exposure map |
| Shield / protection | `src/lib/trading/protection.ts` | Rules armed, equity-floor lock (hard veto) |
| News guard | `src/lib/trading/news-guard.ts` | High-impact calendar (ForexFactory proxy, throttled) |
| Trader metrics | `src/lib/trading/trader-metrics.ts` | Tilt, personal edge, discipline (real closes) |
| Order path | `src/lib/trading/order-service.ts` | SINGLE execution gateway; Shield gate runs inside |
| NEXUS assistant | `src/components/nexus/NexusGlobal.tsx` | Opens via `window` CustomEvent `nexus-ask` `{detail:{q}}` |
| Market-data bridge | `src/lib/nexus/market-data-bridge.ts` | `getOhlcvBuilder()` — real bar access anywhere |

## AI Strategy Lab (`/ai-lab/`)

Separate Vite app in `ai-lab-source/` (App.tsx, pages, store, data), built to `public/ai-lab/`.
Its 15-agent pipeline is **demo-simulated** display logic, not live engines. EMIL therefore
anchors on the TERMINAL's real engines (table above); the lab's visual pipeline remains
untouched. A later phase may surface EMIL inside the lab UI, read-only.

## Order flow (single execution path)

Every order from every surface (QuickTrade, ticket, DOM, watchlist, voice, EAs, Scanner,
Hedge) calls `orderService.place*` → `protectionCheck` (Shield) → Supabase RPC
(`place_market_order` / `place_pending_order` on project `leumpgkfillgeyyfptef`).
Scanner orders are tagged `Scanner:<tf>`, hedge orders `Hedge:<primary>`.
**EMIL v1 places NO orders.** When execution phases arrive they will use this same path
with a `source='EMIL'` tag — never a second engine.

## Phase 1 delivered (this commit)

- `src/lib/trading/emil-council.ts` — pure council: 9 live agent votes (regime, entry
  zones, scanner, hedge, news, shield, tilt, edge, exposure), consensus stance
  (BULLISH LEAN / BEARISH LEAN / NO EDGE / STAND ASIDE), Shield/tilt veto, plain-language
  explanation, verbatim EMIL disclaimer + local consent record (observe-only).
- `src/components/trading/emil/EmilPanel.tsx` — console: presence orb (grey inactive /
  blue observing / amber cautious / red capital-lock), onboarding gate (checkbox +
  disclaimer, EMIL fully inert before acceptance), Agent Council grid, Why/What-could-go-
  wrong, Ask NEXUS (dispatches `nexus-ask`), hand-off buttons to Scan & Trade and
  Hedge & Trade. Locked badges for Assist/Confirm/Semi/Autonomous/Away.
- `src/components/trading/emil/EmilStrip.tsx` — one-line council read embedded in the
  Scanner and Hedge panels; silent until EMIL is woken.
- `src/app/terminal/emil/page.tsx` — standalone window (new tab, same login/account).
- `🧠 EMIL` blinking chip (gold⇄ice) in the timeframe bar; `emil` entitlement kill-switch.

## Later phases (await owner approval, per the build plan)

Phase 2+: deeper consensus math + council persistence (Supabase `emil_*` tables,
default-deny RLS, hash-chained audit), modes state machine with typed consent +
`EMIL_LIVE_ENABLED` flag, voice pipeline, command parser, learning store with approval
queue, emergency controller. Money math for any sizing EMIL ever proposes must route
through the existing `ticket-math`/`Decimal`-safe helpers.
