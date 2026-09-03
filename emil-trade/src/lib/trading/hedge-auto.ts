// ═══════════════════════════════════════════════════════════════
// AUTO HEDGE — the independent Hedge Trade engine core.
//
// Independence contract (displayed in the UI, enforced here):
//   · EMIL has NO execution authority in this module — it may explain
//     and suggest, never open/close/modify/pause anything here.
//   · No connection to Scan Trade: separate consent, params, budget
//     accounting, decision log and position tag (HedgeAuto:*).
//   · Every automated order passes the account-level Risk Governor.
//
// Honest objective (never "guaranteed recovery"): reduce uncontrolled
// exposure, seek small net gains where conditions permit, and exit
// failed recovery attempts within predetermined loss limits. Three
// valid outcomes: small net profit · near break-even · controlled loss.
//
// Recovery stages (no unlimited averaging, no martingale):
//   0 Monitor → 1 Protective Hedge → 2 Balanced Recovery (optional,
//   limits permitting) → 3 Exit Management → 4 Forced Closure.
//
// Runtime honesty: the engine evaluates while a Hedge Trade window is
// open (10s cycle). Server-side 24/7 execution is a future phase and
// is NOT claimed before it exists — the UI states this.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import type { InstrumentSpec } from '@/lib/insights/risk';
import { findHedges, type HedgeCandidate } from '@/lib/trading/hedge-engine';
import { governorCheck, type GovernorPosition } from '@/lib/trading/risk-governor';
import { upcomingHighImpact, type NewsEvent } from '@/lib/trading/news-guard';
import { symbolCurrencies } from '@/lib/trading/protection';

// ── Params, presets, capital table ──────────────────────────────

export interface HedgeAutoParams {
  preset: 'micro' | 'conservative' | 'balanced' | 'advanced' | 'custom';
  // Activation — when does a losing position become eligible?
  activationLossUsd: number;     // $ loss before a hedge is considered
  activationAtrMult: number;     // adverse move in ATRs before hedging
  activationMinutes: number;     // minimum time in loss
  // Quality gates
  minCorrelation: number;        // |hedge-horizon correlation| floor
  maxSpreadPoints: number;       // hedge leg max spread
  newsBlackout: boolean;         // no new hedges near red-flag events
  // Basket limits
  maxHedgeInstruments: 1 | 2 | 3;
  maxLevels: number;             // recovery stages that may ADD risk (1-2)
  hedgePct: number;              // exposure fraction to offset (0.25-1)
  maxLotMult: number;            // hedge lots cap = primary lots × this
  maxHedgeLots: number;          // absolute hedge-leg lot cap (default 0.05 — start small)
  // Exits — Bare-Minimum Profit Mode is the default
  basketTargetUsd: number;       // close the basket at this net gain
  basketMaxTargetUsd: number;    // never hold hoping beyond this
  maxBasketLossUsd: number;      // forced closure at this basket loss
  dailyLossLimitUsd: number;     // engine stops for the day at this loss
  maxBasketHours: number;        // maximum basket duration
}

export const HEDGE_PRESETS: Record<Exclude<HedgeAutoParams['preset'], 'custom'>, Partial<HedgeAutoParams>> = {
  micro:        { maxHedgeInstruments: 1, maxLevels: 1, hedgePct: 0.5, maxLotMult: 2.0, minCorrelation: 0.7, newsBlackout: true,  basketTargetUsd: 0.5, basketMaxTargetUsd: 2,  maxBasketLossUsd: 2,   dailyLossLimitUsd: 3,   maxBasketHours: 24 },
  conservative: { maxHedgeInstruments: 1, maxLevels: 1, hedgePct: 0.5, maxLotMult: 2.5, minCorrelation: 0.65, newsBlackout: true, basketTargetUsd: 2,   basketMaxTargetUsd: 7,  maxBasketLossUsd: 10,  dailyLossLimitUsd: 15,  maxBasketHours: 48 },
  balanced:     { maxHedgeInstruments: 2, maxLevels: 2, hedgePct: 0.6, maxLotMult: 3.0, minCorrelation: 0.6, newsBlackout: true,  basketTargetUsd: 5,   basketMaxTargetUsd: 20, maxBasketLossUsd: 30,  dailyLossLimitUsd: 50,  maxBasketHours: 72 },
  advanced:     { maxHedgeInstruments: 3, maxLevels: 2, hedgePct: 0.75, maxLotMult: 3.0, minCorrelation: 0.55, newsBlackout: false, basketTargetUsd: 10, basketMaxTargetUsd: 50, maxBasketLossUsd: 100, dailyLossLimitUsd: 150, maxBasketHours: 120 },
};

export const DEFAULT_HEDGE_AUTO_PARAMS: HedgeAutoParams = {
  preset: 'conservative',
  activationLossUsd: 3,
  activationAtrMult: 0.8,
  activationMinutes: 10,
  minCorrelation: 0.65,
  maxSpreadPoints: 30,
  newsBlackout: true,
  maxHedgeInstruments: 1,
  maxLevels: 1,
  hedgePct: 0.5,
  maxLotMult: 2.5,
  maxHedgeLots: 0.05,
  basketTargetUsd: 2,
  basketMaxTargetUsd: 7,
  maxBasketLossUsd: 10,
  dailyLossLimitUsd: 15,
  maxBasketHours: 48,
};

/** Capital-based starting template (editable, never a promise of return). */
export const CAPITAL_TABLE: Array<{ capital: number; baseLot: string; target: [number, number]; maxTarget: [number, number]; maxBasketLoss: number; dailyLoss: number; lotMult: number; levels: number }> = [
  { capital: 100,     baseLot: '0.01*', target: [0.1, 1],    maxTarget: [2, 3],       maxBasketLoss: 2,     dailyLoss: 3,     lotMult: 2.0, levels: 1 },
  { capital: 200,     baseLot: '0.01',  target: [0.5, 3],    maxTarget: [3, 7],       maxBasketLoss: 4,     dailyLoss: 6,     lotMult: 2.5, levels: 1 },
  { capital: 500,     baseLot: '0.01-0.02', target: [1, 5],  maxTarget: [5, 12],      maxBasketLoss: 10,    dailyLoss: 15,    lotMult: 2.5, levels: 2 },
  { capital: 1_000,   baseLot: '0.01-0.03', target: [2, 10], maxTarget: [10, 25],     maxBasketLoss: 20,    dailyLoss: 30,    lotMult: 3.0, levels: 2 },
  { capital: 2_500,   baseLot: '0.02-0.05', target: [5, 20], maxTarget: [20, 50],     maxBasketLoss: 50,    dailyLoss: 75,    lotMult: 3.0, levels: 2 },
  { capital: 5_000,   baseLot: '0.03-0.10', target: [10, 40], maxTarget: [40, 100],   maxBasketLoss: 100,   dailyLoss: 150,   lotMult: 3.0, levels: 2 },
  { capital: 10_000,  baseLot: '0.05-0.20', target: [20, 80], maxTarget: [80, 200],   maxBasketLoss: 200,   dailyLoss: 300,   lotMult: 3.0, levels: 3 },
  { capital: 25_000,  baseLot: '0.10-0.50', target: [50, 200], maxTarget: [200, 500], maxBasketLoss: 500,   dailyLoss: 750,   lotMult: 3.0, levels: 3 },
  { capital: 50_000,  baseLot: '0.20-1.00', target: [100, 400], maxTarget: [400, 1000], maxBasketLoss: 1000, dailyLoss: 1500, lotMult: 3.0, levels: 3 },
  { capital: 100_000, baseLot: '0.50-2.00', target: [200, 800], maxTarget: [800, 2000], maxBasketLoss: 2000, dailyLoss: 3000, lotMult: 3.0, levels: 3 },
  { capital: 250_000, baseLot: '1.00-5.00', target: [500, 2000], maxTarget: [2000, 5000], maxBasketLoss: 5000, dailyLoss: 7500, lotMult: 2.5, levels: 3 },
  { capital: 500_000, baseLot: '2.00-10.00', target: [1000, 4000], maxTarget: [4000, 10000], maxBasketLoss: 10000, dailyLoss: 15000, lotMult: 2.5, levels: 3 },
  { capital: 1_000_000, baseLot: '5.00-20.00', target: [2000, 8000], maxTarget: [8000, 20000], maxBasketLoss: 20000, dailyLoss: 30000, lotMult: 2.0, levels: 3 },
];

/** Row of the capital table that applies to a balance. */
export function capitalRow(balance: number) {
  let row = CAPITAL_TABLE[0];
  for (const r of CAPITAL_TABLE) if (balance >= r.capital) row = r;
  return row;
}

/** Apply capital-based defaults onto params (keeps preset/quality gates). */
export function applyCapitalDefaults(p: HedgeAutoParams, balance: number): HedgeAutoParams {
  const r = capitalRow(balance);
  return {
    ...p,
    basketTargetUsd: r.target[0],
    basketMaxTargetUsd: r.maxTarget[1],
    maxBasketLossUsd: r.maxBasketLoss,
    dailyLossLimitUsd: r.dailyLoss,
    maxLotMult: r.lotMult,
    maxLevels: Math.min(p.maxLevels, r.levels),
  };
}

const PARAMS_KEY = 'raptor_hedgeauto_params_v1';
const ON_KEY = 'raptor_hedgeauto_on_v1';
const CONSENT_KEY = 'raptor_hedgeauto_consent_v1';
const BASKETS_KEY = 'raptor_hedgeauto_baskets_v1';
const LOG_KEY = 'raptor_hedgeauto_log_v1';

export function loadHedgeAutoParams(): HedgeAutoParams {
  try { return { ...DEFAULT_HEDGE_AUTO_PARAMS, ...(JSON.parse(localStorage.getItem(PARAMS_KEY) || '{}')) }; }
  catch { return { ...DEFAULT_HEDGE_AUTO_PARAMS }; }
}
export function saveHedgeAutoParams(p: HedgeAutoParams): void {
  try { localStorage.setItem(PARAMS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function isHedgeAutoOn(): boolean {
  try { return localStorage.getItem(ON_KEY) === '1'; } catch { return false; }
}
export function setHedgeAutoOn(on: boolean): void {
  try { localStorage.setItem(ON_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}

export const HEDGE_AUTO_DISCLAIMER =
  'Hedge Trade is an automated trading tool. It may reduce, increase, or fail to recover trading losses. Correlations may change ' +
  'without warning, and additional hedge positions increase margin use, transaction costs and potential drawdown. No profit or ' +
  'loss-recovery outcome is guaranteed. The trader remains responsible for selecting risk limits, monitoring the account, and ' +
  'deciding whether automated trading is suitable. The broker, Raptor platform provider, liquidity provider and technology ' +
  'partners are not responsible for losses arising from market movement, execution conditions, connectivity failure, user ' +
  'settings, or automated strategy decisions, except where liability cannot legally be excluded.';

export function isHedgeAutoConsented(): boolean {
  try { return !!localStorage.getItem(CONSENT_KEY); } catch { return false; }
}
export function recordHedgeAutoConsent(typed: string, params: HedgeAutoParams, accountId: string | null): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      version: 1, typed, params, accountId,
      disclaimer: 'hedge-auto-v1', acceptedAt: new Date().toISOString(),
      device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'unknown',
    }));
  } catch { /* ignore */ }
}
export function revokeHedgeAutoConsent(): void {
  try { localStorage.removeItem(CONSENT_KEY); localStorage.setItem(ON_KEY, '0'); } catch { /* ignore */ }
}

// ── Per-position eligibility (the positions-panel A-Hedge toggle) ──
// Default: every position is hedge-eligible while Auto Hedge is on.
// A per-position OFF excludes just that position from monitoring.

const ELIGIBLE_KEY = 'raptor_hedgeauto_eligible_v1';

function loadEligibility(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(ELIGIBLE_KEY) || '{}'); } catch { return {}; }
}
export function isPositionHedgeEligible(positionId: string): boolean {
  return loadEligibility()[positionId] !== false;
}
export function setPositionHedgeEligible(positionId: string, on: boolean): void {
  try {
    const map = loadEligibility();
    map[positionId] = on;
    const keys = Object.keys(map);
    if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete map[k];
    localStorage.setItem(ELIGIBLE_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}
/** Explicit per-position override: true (always hedge) / false (never) / undefined (fall through to scope). */
export function positionHedgeOverride(positionId: string): boolean | undefined {
  const v = loadEligibility()[positionId];
  return typeof v === 'boolean' ? v : undefined;
}

// ── Hedge SCOPE — individual by default, account-wide only on request.
// A widget/panel toggle covers ONLY its instrument unless "account-wide"
// is chosen. This is why enabling Auto Hedge no longer hedges every order.

export type HedgeScope = 'selective' | 'account';
const SCOPE_KEY = 'raptor_hedgeauto_scope_v1';
const SYMS_KEY = 'raptor_hedgeauto_symbols_v1';

export function loadHedgeScope(): HedgeScope {
  try { return localStorage.getItem(SCOPE_KEY) === 'account' ? 'account' : 'selective'; } catch { return 'selective'; }
}
export function setHedgeScope(s: HedgeScope): void {
  try { localStorage.setItem(SCOPE_KEY, s); } catch { /* ignore */ }
}
export function loadEligibleSymbols(): string[] {
  try { const a = JSON.parse(localStorage.getItem(SYMS_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}
export function isSymbolHedgeEligible(symbol: string): boolean {
  return loadEligibleSymbols().includes(symbol);
}
export function addEligibleSymbol(symbol: string): void {
  try { const s = new Set(loadEligibleSymbols()); s.add(symbol); localStorage.setItem(SYMS_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}
export function removeEligibleSymbol(symbol: string): void {
  try { localStorage.setItem(SYMS_KEY, JSON.stringify(loadEligibleSymbols().filter((x) => x !== symbol))); } catch { /* ignore */ }
}
export function setEligibleSymbols(list: string[]): void {
  try { localStorage.setItem(SYMS_KEY, JSON.stringify([...new Set(list)])); } catch { /* ignore */ }
}

/** Is a SYMBOL actively covered by Auto Hedge right now? (consent + engine on + scope) */
export function symbolEffectivelyHedged(symbol: string): boolean {
  if (!isHedgeAutoConsented() || !isHedgeAutoOn()) return false;
  return loadHedgeScope() === 'account' || isSymbolHedgeEligible(symbol);
}
/** Is a specific POSITION covered? Per-position override wins, else falls to scope/symbol. */
export function positionEffectivelyHedged(positionId: string, symbol: string): boolean {
  if (!isHedgeAutoConsented() || !isHedgeAutoOn()) return false;
  const ov = positionHedgeOverride(positionId);
  if (ov === false) return false;
  if (ov === true) return true;
  return loadHedgeScope() === 'account' || isSymbolHedgeEligible(symbol);
}

// ── Baskets ─────────────────────────────────────────────────────

export type BasketStatus = 'monitoring' | 'active' | 'exit' | 'manual' | 'closed';

export interface HedgeLeg {
  positionId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  lots: number;
  openedAt: number;
}

export interface HedgeBasket {
  id: string;
  accountId: string;
  primaryPositionId: string;
  primarySymbol: string;
  primaryDirection: 'BUY' | 'SELL';
  primaryLots: number;
  stage: 0 | 1 | 2 | 3 | 4;
  status: BasketStatus;
  legs: HedgeLeg[];
  targetUsd: number;
  maxLossUsd: number;
  openedAt: number;
  closedAt?: number;
  closeReason?: string;
  manualNote?: string;
}

export function loadBaskets(): HedgeBasket[] {
  try { return JSON.parse(localStorage.getItem(BASKETS_KEY) || '[]'); } catch { return []; }
}
export function saveBaskets(b: HedgeBasket[]): void {
  try { localStorage.setItem(BASKETS_KEY, JSON.stringify(b.slice(-40))); } catch { /* ignore */ }
}

export interface HedgeAutoLogEntry {
  ts: number;
  kind: 'hedge-open' | 'basket-close' | 'blocked' | 'manual' | 'consent' | 'toggle' | 'stage' | 'error';
  text: string;
  basketId?: string;
}
export function hedgeAutoLog(kind: HedgeAutoLogEntry['kind'], text: string, basketId?: string): void {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]') as HedgeAutoLogEntry[];
    log.push({ ts: Date.now(), kind, text, basketId });
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-400)));
  } catch { /* ignore */ }
}
export function loadHedgeAutoLog(): HedgeAutoLogEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}

// ── Engine evaluation (pure decision; the panel executes) ───────

export interface LivePosition {
  id: string;
  symbol: string;
  direction: string;
  size: number;
  open_price: number;
  current_price: number | null;
  unrealized_pnl: number | null;
  realized_pnl?: number | null;
  status: string;
  comment?: string | null;
  opened_at?: string;
}

export type HedgeDecision =
  | { kind: 'none'; note: string }
  | { kind: 'open-hedge'; basket: HedgeBasket | null; primary: LivePosition; candidate: HedgeCandidate; lots: number; reason: string }
  | { kind: 'close-basket'; basket: HedgeBasket; reason: string; stage: 4 | 3 }
  | { kind: 'manual-detected'; basket: HedgeBasket; note: string };

export function basketFloating(basket: HedgeBasket, positions: LivePosition[]): { pnl: number; legsOpen: number; primaryOpen: boolean } {
  const primary = positions.find((p) => p.id === basket.primaryPositionId && p.status === 'open');
  let pnl = primary ? Number(primary.unrealized_pnl ?? 0) : 0;
  let legsOpen = 0;
  for (const leg of basket.legs) {
    const pos = positions.find((p) => p.id === leg.positionId && p.status === 'open');
    if (pos) { pnl += Number(pos.unrealized_pnl ?? 0); legsOpen++; }
  }
  return { pnl, legsOpen, primaryOpen: !!primary };
}

/** One evaluation cycle. Returns at most ONE decision so every action is
 *  deliberate, logged and rate-limited by the cycle cadence. */
export function evaluateHedgeAuto(ctx: {
  builder: OHLCVBuilder;
  accountId: string;
  positions: LivePosition[];
  ticks: Record<string, { bid?: number; ask?: number } | undefined>;
  specs: Record<string, InstrumentSpec>;
  calendar: NewsEvent[];
  balance: number;
  equity: number;
  realizedToday: number;
}): HedgeDecision {
  const p = loadHedgeAutoParams();
  const baskets = loadBaskets().filter((b) => b.accountId === ctx.accountId && b.status !== 'closed');
  const open = ctx.positions.filter((x) => x.status === 'open');

  // Daily engine stop
  if (ctx.realizedToday <= -p.dailyLossLimitUsd) {
    return { kind: 'none', note: `daily loss limit reached (${p.dailyLossLimitUsd.toFixed(2)}) — engine stands down until tomorrow` };
  }

  // 1 · Reconcile active baskets first: manual intervention, exits, forced closure.
  for (const basket of baskets) {
    if (basket.status === 'manual') continue;
    const { pnl, legsOpen, primaryOpen } = basketFloating(basket, ctx.positions);

    // Manual intervention: a leg or the primary vanished without the engine closing it.
    if (basket.status === 'active' && (!primaryOpen || legsOpen < basket.legs.length)) {
      return { kind: 'manual-detected', basket, note: !primaryOpen ? 'primary position was closed outside the engine' : 'a hedge leg was closed or modified outside the engine' };
    }
    if (basket.status !== 'active') continue;

    const ageH = (Date.now() - basket.openedAt) / 3_600_000;
    // Stage 4 — forced closure conditions
    if (pnl <= -basket.maxLossUsd) return { kind: 'close-basket', basket, reason: `maximum basket loss reached (${pnl.toFixed(2)} ≤ -${basket.maxLossUsd})`, stage: 4 };
    if (ageH >= p.maxBasketHours)  return { kind: 'close-basket', basket, reason: `maximum basket duration reached (${ageH.toFixed(1)}h)`, stage: 4 };
    // Stage 3 — bare-minimum profit exit
    if (pnl >= basket.targetUsd)   return { kind: 'close-basket', basket, reason: `net basket target reached (+${pnl.toFixed(2)} ≥ ${basket.targetUsd}) — bare-minimum profit mode books it`, stage: 3 };
  }

  // 2 · Look for a NEW protective hedge (Stage 0 → 1).
  const basketedIds = new Set(baskets.flatMap((b) => [b.primaryPositionId, ...b.legs.map((l) => l.positionId)]));
  const eligible = open.filter((x) =>
    !basketedIds.has(x.id) &&
    !(x.comment ?? '').toLowerCase().startsWith('hedgeauto') &&
    positionEffectivelyHedged(x.id, x.symbol) &&    // scope-aware: individual unless account-wide
    Number(x.unrealized_pnl ?? 0) <= -p.activationLossUsd);

  for (const primary of eligible) {
    const openedAt = primary.opened_at ? new Date(primary.opened_at).getTime() : 0;
    if (openedAt && Date.now() - openedAt < p.activationMinutes * 60_000) continue;

    // News blackout for the primary's currencies
    if (p.newsBlackout) {
      const soon = upcomingHighImpact(symbolCurrencies(primary.symbol), ctx.calendar, 1)[0];
      if (soon) { hedgeAutoLog('blocked', `${primary.symbol}: red-flag ${soon.currency} event inside 1h — hedge deferred`); continue; }
    }

    const { viable } = findHedges(ctx.builder, {
      primary: primary.symbol,
      direction: primary.direction === 'BUY' ? 'BUY' : 'SELL',
      lots: primary.size,
      hedgePct: p.hedgePct,
    }, Object.keys(ctx.ticks).filter((s) => ctx.ticks[s]?.bid != null), ctx.specs, ctx.ticks);

    const best = viable.find((c) => Math.abs(c.corr.avg ?? 0) >= p.minCorrelation);
    if (!best) { continue; }

    // Spread gate on the hedge leg (points via the instrument's pricescale)
    const t = ctx.ticks[best.symbol];
    const spec = ctx.specs[best.symbol];
    if (t?.bid != null && t?.ask != null && spec) {
      const spreadPts = (t.ask - t.bid) * (spec.pricescale || 100000);
      if (spreadPts > p.maxSpreadPoints) { hedgeAutoLog('blocked', `${best.symbol}: spread ${spreadPts.toFixed(0)}pt exceeds cap ${p.maxSpreadPoints}`); continue; }
    }

    // Cost-vs-benefit: expected exposure reduction must exceed entry costs.
    if (best.spreadCost >= Math.max(0.5, (best.riskBefore - best.riskAfter) * 0.5)) {
      hedgeAutoLog('blocked', `${best.symbol}: entry cost $${best.spreadCost.toFixed(2)} eats the expected exposure reduction`); continue;
    }

    // Lot caps: never beyond primary × multiplier AND never beyond the
    // absolute hedge-lot cap (start small — 0.01 upward, never doubling).
    const lots = Math.max(0.01, Math.min(
      best.suggestedLots,
      Math.round(primary.size * p.maxLotMult * 100) / 100,
      Math.max(0.01, p.maxHedgeLots),
    ));

    // Account-level Risk Governor — the final authority.
    const verdict = governorCheck({
      positions: open as GovernorPosition[],
      balance: ctx.balance, equity: ctx.equity, realizedToday: ctx.realizedToday,
      addLots: lots, symbol: best.symbol,
    });
    if (!verdict.allowed) { hedgeAutoLog('blocked', `governor: ${verdict.reason}`); continue; }

    return {
      kind: 'open-hedge',
      basket: null,
      primary, candidate: best, lots,
      reason: `${primary.symbol} ${primary.direction} is ${Number(primary.unrealized_pnl ?? 0).toFixed(2)} in loss past the ${p.activationLossUsd} threshold; ` +
        `${best.symbol} shows ${(best.corr.avg ?? 0).toFixed(2)} hedge-horizon correlation, est. exposure reduction ${best.reductionPct.toFixed(0)}%, ` +
        `entry cost $${best.spreadCost.toFixed(2)}, margin est. $${best.marginEstimate.toFixed(0)} — within governor limits`,
    };
  }

  return { kind: 'none', note: baskets.length ? 'baskets within limits — monitoring' : 'no eligible losing positions — monitoring' };
}
