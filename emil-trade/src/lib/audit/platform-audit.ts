// ═══════════════════════════════════════════════════════════════
// RAPTOR Platform Audit — the living systems-audit register.
// Produced by the 2026-07-20 full-platform audit round: module inventory
// with readiness scores, the wiring matrix (surface → gates → RPC → table),
// dependency map, honest gap report, third-party register, LP requirement
// checklist and sign-off states. Facts only: every row reflects what was
// actually tested or found — gaps are named, not hidden. Update this file
// whenever a round changes the platform's shape.
// ═══════════════════════════════════════════════════════════════

export const AUDIT_DATE = '2026-07-20';

// ── §14 Module inventory + production-readiness scores ──────────

export interface ModuleScore {
  module: string;
  functionality: number; integration: number; security: number; reliability: number;
  readiness: number;
  note: string;
}

export const MODULE_SCORES: ModuleScore[] = [
  { module: 'Terminal core (charts, watchlist, order path)', functionality: 92, integration: 95, security: 85, reliability: 90, readiness: 90, note: 'single execution path: every surface → orderService → Shield → Guardian → Supabase RPCs; sim pricing until the real LP' },
  { module: 'QuickTrade + Order Ticket', functionality: 95, integration: 95, security: 85, reliability: 92, readiness: 92, note: '7 order types, TP ladder, partial close RPC, 1-Click flag unified in the store' },
  { module: 'Shield protection suite (12 rules)', functionality: 95, integration: 95, security: 80, reliability: 92, readiness: 90, note: 'client-side gate; RPC-level enforcement is the planned upgrade at the real-LP milestone' },
  { module: 'Guardian (independent order watchdogs)', functionality: 92, integration: 95, security: 90, reliability: 92, readiness: 92, note: 'in the order path itself; EMIL cannot silence it' },
  { module: 'Trade Scanner + Scan&Trade window', functionality: 90, integration: 92, security: 85, reliability: 90, readiness: 90, note: 'trend-pullback core; consent-gated manual mode; Semi/Full auto locked honestly' },
  { module: 'Hedge Engine + Hedge&Trade window', functionality: 88, integration: 92, security: 85, reliability: 88, readiness: 88, note: 'viable cards need real correlations; sim feed keeps some paths compiled-but-unexercised' },
  { module: 'EMIL (council → pilot → modes → adapt → governance)', functionality: 90, integration: 92, security: 88, reliability: 88, readiness: 88, note: 'typed-consent envelope, session-reset modes, acts only while a console is open — server-side 24/7 worker is a future phase' },
  { module: 'EMIL Always-Learning knowledge engine', functionality: 88, integration: 90, security: 90, reliability: 90, readiness: 88, note: 'measures only genuinely connected sources; firewall to live trading' },
  { module: 'Lara language layer (translate + voice STT)', functionality: 85, integration: 90, security: 90, reliability: 82, readiness: 85, note: 'server-proxied key, consent-gated, honest 503 fallback; TTS not built' },
  { module: 'World Command Center + Twin + Studio + Watchdog', functionality: 88, integration: 90, security: 88, reliability: 90, readiness: 88, note: 'all figures measured; IN/CN honestly instrument-less on this feed' },
  { module: 'NEXUS assistant', functionality: 85, integration: 88, security: 85, reliability: 85, readiness: 85, note: 'Anthropic-backed via server routes; conditional-hooks crash bug FIXED this audit' },
  { module: 'Economic calendar pipeline', functionality: 90, integration: 92, security: 90, reliability: 85, readiness: 88, note: 'throttled /api/calendar proxy (30-min cache, stale-serve) — upstream 429s handled' },
  { module: 'Auth + middleware (login, terminal gating)', functionality: 90, integration: 90, security: 88, reliability: 90, readiness: 88, note: 'Next.js patched to 16.2.10 this audit (middleware-bypass advisories closed)' },
  { module: 'Terms & consent gates', functionality: 95, integration: 95, security: 92, reliability: 95, readiness: 94, note: 'platform terms + EMIL onboarding + pilot envelope + adaptation + learning consents, all recorded' },
  { module: 'Legacy areas in this repo (admin/dealer/CRM/IB pages)', functionality: 45, integration: 35, security: 60, reliability: 50, readiness: 40, note: 'demo-grade: several API routes carry TODO mock persistence — production broker tooling lives in the JUNE-2026 staff portal; do NOT treat these as wired' },
];

// ── §14 Wiring matrix: surface → gates → backend → storage ──────

export interface WiringRow { surface: string; via: string; gates: string; backend: string; storage: string; status: 'Wired & tested' | 'Wired' | 'Demo-grade' }

export const WIRING_MATRIX: WiringRow[] = [
  { surface: 'QuickTrade / Order Ticket / DOM / Watchlist', via: 'orderService.placeMarketOrder / placePendingOrder', gates: 'protectionCheck (Shield) → guardianCheck', backend: 'RPC place_market_order / place_pending_order', storage: 'Supabase trades', status: 'Wired & tested' },
  { surface: 'Positions panel (close / partial / modify)', via: 'orderService.closePosition / partialClosePosition / modifyPosition', gates: 'ownership + auth', backend: 'RPC close_position / partial_close_position / modify_position', storage: 'Supabase trades', status: 'Wired & tested' },
  { surface: 'Scanner “Execute” (consented manual mode)', via: 'orderService (tag Scanner:<tf>)', gates: 'consent + automation params + Shield → Guardian', backend: 'same order RPCs', storage: 'Supabase trades + signal log (local)', status: 'Wired & tested' },
  { surface: 'Hedge preview → confirm', via: 'orderService (tag Hedge:<primary>)', gates: 'viability + Shield → Guardian', backend: 'same order RPCs', storage: 'Supabase trades + hedge groups (local)', status: 'Wired & tested' },
  { surface: 'EMIL pilot / confirm ticket', via: 'placeEmilOrder (tags EMIL:AUTO/CONF/HEDGE)', gates: 'typed consent envelope → objectives → budget → Shield → Guardian', backend: 'same order RPCs', storage: 'Supabase trades + replay/identity/log (local)', status: 'Wired & tested' },
  { surface: 'Economic calendar / news guard', via: '/api/calendar proxy (30-min cache, stale-serve)', gates: 'rate-throttle', backend: 'ForexFactory weekly JSON', storage: 'server cache + 10-min client cache', status: 'Wired & tested' },
  { surface: 'Mission Control text + voice', via: '/api/sarvam (translate / speech-to-text-translate)', gates: 'consent + read-back + explicit Apply — language can never trade', backend: 'api.sarvam.ai (server-side key)', storage: 'language audit (local, no secrets)', status: 'Wired & tested' },
  { surface: 'NEXUS chat / analysis', via: '/api/nexus/chat, /api/nexus/analyze', gates: 'auth', backend: 'Anthropic API (server-side key)', storage: 'conversation (client)', status: 'Wired' },
  { surface: 'EMIL learning / knowledge / calibration / shadow', via: 'client sweeps (30-45s) over live builders', gates: 'Knowledge-to-Trading Firewall', backend: '— (client compute)', storage: 'localStorage raptor_emil_* keys (exportable, deletable)', status: 'Wired & tested' },
  { surface: 'Legacy dealer execute/flatten/routing, CRM tasks, IB routes', via: '/api/dealer/*, /api/crm/*, /api/ib/*', gates: 'auth (varies)', backend: 'TODO mock persistence in several handlers', storage: 'NOT persisted in places', status: 'Demo-grade' },
];

// ── §2 Dependency map ───────────────────────────────────────────

export const DEPENDENCY_MAP: Array<{ from: string; to: string; note: string }> = [
  { from: 'Terminal (this repo, dashing-hamster-0028ed)', to: 'Supabase leumpgkfillgeyyfptef', note: 'auth + accounts + trades RPCs (broker-controls pattern, additive migrations)' },
  { from: 'Terminal', to: 'Netlify (site + functions)', note: 'hosting, /api/* serverless, env secrets (SARVAM_API_KEY, ANTHROPIC_API_KEY)' },
  { from: 'Terminal charts', to: 'TradingView widget', note: 'chart rendering; its iframe console noise is known + benign' },
  { from: 'Terminal calendar', to: 'ForexFactory weekly JSON', note: 'via throttled proxy ONLY — direct calls 429 fast' },
  { from: 'EMIL language', to: 'Lara API', note: 'translate + STT via server proxy; rule parser is the permanent fallback' },
  { from: 'NEXUS', to: 'Anthropic API', note: 'server-routed; key never client-side' },
  { from: 'Closed positions', to: 'JUNE-2026 portal (SB tdifcayznqnaduchzfqz)', note: 'trade mirror bridge → portal trades (per infra memory)' },
  { from: 'Staff / broker / dealer production tooling', to: 'JUNE-2026 monorepo portals', note: 'the REAL home of admin/dealer/CRM/IB workflows — this repo’s copies are demo-grade' },
];

// ── §14 Gap report — honest, ranked ─────────────────────────────

export interface Gap { severity: 'Critical' | 'High' | 'Medium' | 'Low'; gap: string; plan: string }

export const GAP_REPORT: Gap[] = [
  { severity: 'Critical', gap: 'Real liquidity provider / price feed not connected — all pricing is the simulated platform feed', plan: 'the keystone milestone; unlocks live prices everywhere, slippage/fill statistics, order simulator, broker comparison, liquidity intelligence, RPC-level Shield enforcement' },
  { severity: 'High', gap: 'Legacy dealer/CRM/IB API routes in this repo carry TODO mock persistence (dealer/execute, dealer/flatten, dealer/routing, crm/tasks, ib)', plan: 'production broker tooling lives in the JUNE-2026 portal; either wire these to real tables or gate/retire the demo pages before broker onboarding' },
  { severity: 'High', gap: 'Shield/Guardian enforcement is client-side', plan: 'planned upgrade: mirror the gates inside place_market_order RPC at the real-LP milestone (client gate stays as UX layer)' },
  { severity: 'High', gap: 'API keys pasted in chat during builds (Lara, Anthropic, others per rotation register)', plan: 'rotate all before public launch — rotation recipes recorded in the operator memory' },
  { severity: 'Medium', gap: 'EMIL pilot + learning run only while a console/window is open', plan: 'server-side 24/7 worker is a designed future phase; never claimed as existing' },
  { severity: 'Medium', gap: 'ROOT CAUSE ISOLATED (2026-07-20 instrumented bisect): the clamped "Maximum update depth" errors are a GLOBAL per-tick subscriber cascade — each ~500ms price batch re-renders every prices-subscribed component and chains enough dependent updates to hit React’s clamp (~1.5 clamps/sec measured on the terminal, panel open or closed). React recovers every time — no component death was confirmed (an earlier crash read was a test-harness string-matching artifact, retracted). UI stays fully functional', plan: 'dedicated fix scheduled: batch/coalesce store price writes (single set per tick batch) in the price-engine → store wiring; touching the tick path needs its own careful round with full order-path regression. New periodic-setState code stays out of popups meanwhile (HedgePanel fallback fetch is standalone-gated + no-op-safe by design)' },
  { severity: 'Medium', gap: '96 legacy lint errors remain (36 set-state-in-effect, 16 purity, 12 refs, 11 unescaped entities, 9 html-link, 7 any, others) in older pages', plan: 'non-breaking style debt; clean opportunistically — mass-fixing legacy pages in one sweep risks regressions' },
  { severity: 'Medium', gap: 'postcss moderate advisory inside Next.js’s own bundled copy', plan: 'accepted: the only downstream “fix” downgrades Next to 9.x; waiting on upstream Next release' },
  { severity: 'Medium', gap: 'No INR/CNY instruments; exchange holidays not integrated into sessions', plan: 'arrives with broader market-data licensing; regions display honestly meanwhile' },
  { severity: 'Low', gap: 'Voice output (TTS), natural voice conversation, per-language alert delivery not built', plan: 'Lara TTS + NEXUS-routed dialogue are next candidates; never claimed early' },
  { severity: 'Low', gap: 'Workspace/layout save-restore and multi-device continuity absent', plan: 'needs backend state sync; scoped for a dedicated round' },
];

// ── §8 Third-party dependency register ──────────────────────────

export interface ThirdParty { vendor: string; purpose: string; status: string; failureImpact: string; backup: string }

export const THIRD_PARTY_REGISTER: ThirdParty[] = [
  { vendor: 'Supabase (leumpgkfillgeyyfptef)', purpose: 'auth, accounts, trades, RPCs', status: 'Production', failureImpact: 'no login/trading — critical', backup: 'Supabase SLA; additive-migration discipline + rollbackable SQL' },
  { vendor: 'Netlify (dashing-hamster-0028ed)', purpose: 'hosting, serverless /api/*, env secrets', status: 'Production (manual CLI deploys, cache-cleared)', failureImpact: 'site down — critical', backup: 'redeploy from git; site is rebuildable from repo' },
  { vendor: 'TradingView', purpose: 'chart widget', status: 'Production', failureImpact: 'charts degrade; trading path unaffected', backup: 'native lightweight-charts fallback exists in repo' },
  { vendor: 'ForexFactory feed', purpose: 'economic calendar', status: 'Production via throttled proxy', failureImpact: 'news guard degrades to stale-serve then honest empty', backup: 'stale cache; alternative licensed calendar is a future line-item' },
  { vendor: 'Sarvam AI (powers Lara)', purpose: 'Indian-language translate + speech', status: 'Production (key set 2026-07-20; rotate before launch)', failureImpact: 'NONE on trading — rule parser continues; UI says so', backup: 'default English engine is the permanent fallback' },
  { vendor: 'Anthropic', purpose: 'NEXUS assistant', status: 'Production (key set; rotate before launch)', failureImpact: 'NEXUS chat degrades; trading unaffected', backup: 'graceful error in chat' },
];

// ── §7 LP requirement checklist (for negotiations) ──────────────

export const LP_CHECKLIST: Array<{ group: string; items: string[] }> = [
  { group: 'Instrument & contract data', items: ['full instrument list + symbol names', 'contract specs (size, min/max/step lots, tick size/value, precision)', 'margin + leverage schedule', 'swap rates + rollover rules', 'trading hours + holiday schedule', 'dividend/corporate-action handling', 'futures expiry + crypto schedule'] },
  { group: 'Connectivity', items: ['FIX API (+ REST/WebSocket where offered)', 'market-data + execution feeds', 'depth of market', 'drop copy + post-trade reporting', 'historical data', 'order/margin/account status', 'rejection reasons', 'heartbeat + failover endpoints', 'demo AND production environments'] },
  { group: 'Operational support', items: ['integration docs + certification/UAT', 'symbol-mapping + bridge support', '24/5 technical support + escalation contacts', 'incident response + maintenance notices', 'price-dispute + trade-bust process', 'slippage/execution-quality/liquidity reports', 'SLA: uptime + latency commitments', 'DR + backup data centre'] },
  { group: 'Commercial & legal', items: ['liquidity agreement + fee/margin schedules', 'credit terms + collateral + deposit', 'minimum volume/fee commitments', 'termination terms', 'jurisdiction + restricted countries', 'product permissions + data-use rights', 'sub-white-label permissions', 'indemnity + dispute resolution'] },
];

// ── §14 Sign-off states (what was actually done) ────────────────

export interface SignOff { check: string; state: 'Done' | 'Partial' | 'Pending'; note: string }

export const SIGN_OFF: SignOff[] = [
  { check: 'Functional testing', state: 'Done', note: 'every round verified live in the browser before deploy (DOM probes + interaction tests)' },
  { check: 'Integration testing', state: 'Done', note: 'order path, calendar proxy, Lara translate/STT, consent flows exercised end-to-end' },
  { check: 'Permission / consent testing', state: 'Done', note: 'terms gate, EMIL onboarding, typed pilot consent, adaptation + learning consents verified' },
  { check: 'Error-path testing', state: 'Done', note: 'Lara 503/failed-translate, stale quotes, Guardian vetoes, budget rejections produce honest messages' },
  { check: 'Security pass', state: 'Partial', note: 'Next.js patched (middleware advisories), ws patched, no secrets client-side, keys server-env only — key ROTATION before launch still owed' },
  { check: 'Regression testing', state: 'Done', note: 'main terminal smoke after every round; single execution path untouched in display-only rounds' },
  { check: 'Mobile validation', state: 'Partial', note: 'terminal is desktop-first by design; standalone windows usable but not mobile-optimised' },
  { check: 'Audit logging', state: 'Done', note: 'activity log, trade identities, decision replay, language audit, signal logs — exportable' },
  { check: 'Load/performance testing', state: 'Pending', note: 'meaningful only with the real LP + production traffic; sweep cadences are deliberately bounded meanwhile' },
  { check: 'Product-owner UAT', state: 'Pending', note: 'the owner’s walkthrough is the final gate before any public launch' },
];
