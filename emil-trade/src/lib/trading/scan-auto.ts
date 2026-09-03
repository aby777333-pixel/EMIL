// ═══════════════════════════════════════════════════════════════
// AUTO SCAN TRADE — the independent Scan Trade engine core.
//
// Independence contract (displayed in the UI, enforced here):
//   · Fully separate from Auto Hedge: its own consent record, params,
//     decision log, daily accounting and position tag (ScanAuto:*).
//     Activating one NEVER activates the other.
//   · EMIL has NO execution authority here — advice only.
//   · Every automated order passes the account-level Risk Governor.
//
// Discipline: Scan Trade must not trade merely because it found a
// signal. Every candidate passes market-condition, cost, exposure,
// margin, risk and permission validation before execution — and a
// hard stop is attached to every position (no stop, no trade).
//
// Runtime honesty: evaluates while a Scan Trade window is open (30s
// cycle). Server-side 24/7 execution is a future phase — not claimed.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { assessOpportunity, SCAN_TFS, type Opportunity, type ScanTF } from '@/lib/trading/scanner-engine';
import { governorCheck, type GovernorPosition } from '@/lib/trading/risk-governor';
import { upcomingHighImpact, type NewsEvent } from '@/lib/trading/news-guard';
import { symbolCurrencies } from '@/lib/trading/protection';

export interface ScanAutoParams {
  mode: 'small-profit' | 'conservative' | 'balanced' | 'custom';
  lotMode: 'fixed' | 'risk';   // fixed = always fixedLot (default); risk = % sizing
  fixedLot: number;            // default 0.01 — the starting lot for every trade
  maxLotPerTrade: number;      // hard cap regardless of sizing mode
  riskPct: number;             // % balance risked per trade vs the stop (risk mode)
  minScore: number;            // opportunity score floor
  minRR: number;               // minimum risk:reward (zone.riskReward1)
  maxPerDay: number;           // engine trades per day
  maxOpenTrades: number;       // engine positions open at once
  maxPerSymbol: number;        // engine positions per instrument
  cooldownMin: number;         // minutes between engine entries
  lossCooldownMin: number;     // pause after a losing engine close
  consecutiveLossStop: number; // engine stops for the day after N straight losses
  dailyLossLimitUsd: number;
  dailyProfitLockUsd: number;  // 0 = off; stop after banking this
  newsFilter: boolean;
  allowedTfs: string[];        // which scan timeframes may auto-trade
}

export const SCAN_MODES: Record<Exclude<ScanAutoParams['mode'], 'custom'>, Partial<ScanAutoParams>> = {
  'small-profit': { riskPct: 0.5, minScore: 75, minRR: 1.5, maxPerDay: 4,  maxOpenTrades: 2, cooldownMin: 30, consecutiveLossStop: 2, newsFilter: true },
  conservative:   { riskPct: 0.75, minScore: 70, minRR: 1.5, maxPerDay: 6, maxOpenTrades: 3, cooldownMin: 20, consecutiveLossStop: 2, newsFilter: true },
  balanced:       { riskPct: 1.0, minScore: 65, minRR: 1.2, maxPerDay: 10, maxOpenTrades: 4, cooldownMin: 10, consecutiveLossStop: 3, newsFilter: true },
};

export const DEFAULT_SCAN_AUTO_PARAMS: ScanAutoParams = {
  mode: 'conservative',
  lotMode: 'fixed',
  fixedLot: 0.01,
  maxLotPerTrade: 0.05,
  riskPct: 0.75,
  minScore: 70,
  minRR: 1.5,
  maxPerDay: 6,
  maxOpenTrades: 3,
  maxPerSymbol: 1,
  cooldownMin: 20,
  lossCooldownMin: 45,
  consecutiveLossStop: 2,
  dailyLossLimitUsd: 30,
  dailyProfitLockUsd: 0,
  newsFilter: true,
  allowedTfs: ['M15', 'H1', 'H4'],
};

const PARAMS_KEY = 'raptor_scanauto_params_v1';
const ON_KEY = 'raptor_scanauto_on_v1';
const CONSENT_KEY = 'raptor_scanauto_consent_v1';
const LOG_KEY = 'raptor_scanauto_log_v1';
const LAST_ENTRY_KEY = 'raptor_scanauto_lastentry_v1';

export function loadScanAutoParams(): ScanAutoParams {
  try { return { ...DEFAULT_SCAN_AUTO_PARAMS, ...(JSON.parse(localStorage.getItem(PARAMS_KEY) || '{}')) }; }
  catch { return { ...DEFAULT_SCAN_AUTO_PARAMS }; }
}
export function saveScanAutoParams(p: ScanAutoParams): void {
  try { localStorage.setItem(PARAMS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function isScanAutoOn(): boolean {
  try { return localStorage.getItem(ON_KEY) === '1'; } catch { return false; }
}
export function setScanAutoOn(on: boolean): void {
  try { localStorage.setItem(ON_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}

export const SCAN_AUTO_DISCLAIMER =
  'Scan Trade is an automated trading tool. It may open, manage and close positions using your account balance. Signals are ' +
  'estimates over market data and can be wrong; no profit outcome is guaranteed and losses can exceed expectations during ' +
  'volatile or illiquid conditions. The trader remains responsible for selecting risk limits, monitoring the account, and ' +
  'deciding whether automated trading is suitable. The broker, Raptor platform provider, liquidity provider and technology ' +
  'partners are not responsible for losses arising from market movement, execution conditions, connectivity failure, user ' +
  'settings, or automated strategy decisions, except where liability cannot legally be excluded.';

export function isScanAutoConsented(): boolean {
  try { return !!localStorage.getItem(CONSENT_KEY); } catch { return false; }
}
export function recordScanAutoConsent(typed: string, params: ScanAutoParams, accountId: string | null): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      version: 1, typed, params, accountId,
      disclaimer: 'scan-auto-v1', acceptedAt: new Date().toISOString(),
      device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'unknown',
    }));
  } catch { /* ignore */ }
}
export function revokeScanAutoConsent(): void {
  try { localStorage.removeItem(CONSENT_KEY); localStorage.setItem(ON_KEY, '0'); } catch { /* ignore */ }
}

export interface ScanAutoLogEntry {
  ts: number;
  kind: 'entry' | 'blocked' | 'consent' | 'toggle' | 'manual' | 'error' | 'halt';
  text: string;
}
export function scanAutoLog(kind: ScanAutoLogEntry['kind'], text: string): void {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]') as ScanAutoLogEntry[];
    log.push({ ts: Date.now(), kind, text });
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-400)));
  } catch { /* ignore */ }
}
export function loadScanAutoLog(): ScanAutoLogEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}

function lastEntryAt(): number {
  try { return Number(localStorage.getItem(LAST_ENTRY_KEY) || '0'); } catch { return 0; }
}
export function markEntry(): void {
  try { localStorage.setItem(LAST_ENTRY_KEY, String(Date.now())); } catch { /* ignore */ }
}

// ── Engine evaluation (pure decision; the panel executes) ───────

export interface ScanLivePosition {
  id: string; symbol: string; direction: string; size: number;
  status: string; comment?: string | null; unrealized_pnl?: number | null;
}
export interface ScanClosedRow { comment?: string | null; realized_pnl?: number | null; closed_at?: string | null }

export type ScanDecision =
  | { kind: 'none'; note: string }
  | { kind: 'halt'; note: string }
  | { kind: 'enter'; opp: Opportunity; lots: number; entry: number; sl: number; tp: number; reason: string };

const isScanAutoRow = (c: string | null | undefined) => (c ?? '').toLowerCase().startsWith('scanauto');
const todayStr = () => new Date().toISOString().slice(0, 10);

/** Engine trades closed today + streak (from history rows, newest last). */
export function scanAutoToday(closed: ScanClosedRow[]): { trades: number; pnl: number; consecutiveLosses: number; lastCloseLoss: boolean; lastCloseAt: number } {
  const rows = closed.filter((r) => isScanAutoRow(r.comment) && (r.closed_at ?? '').slice(0, 10) === todayStr());
  let consecutiveLosses = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (Number(rows[i].realized_pnl ?? 0) < 0) consecutiveLosses++;
    else break;
  }
  const last = rows[rows.length - 1];
  return {
    trades: rows.length,
    pnl: rows.reduce((a, r) => a + Number(r.realized_pnl ?? 0), 0),
    consecutiveLosses,
    lastCloseLoss: last ? Number(last.realized_pnl ?? 0) < 0 : false,
    lastCloseAt: last?.closed_at ? new Date(last.closed_at).getTime() : 0,
  };
}

/** One evaluation cycle. Returns at most ONE decision. */
export function evaluateScanAuto(ctx: {
  builder: OHLCVBuilder;
  positions: ScanLivePosition[];
  closedToday: ScanClosedRow[];
  ticks: Record<string, { bid?: number; ask?: number } | undefined>;
  calendar: NewsEvent[];
  balance: number;
  equity: number;
  realizedToday: number;
  isLiveData: boolean;
}): ScanDecision {
  const p = loadScanAutoParams();
  const open = ctx.positions.filter((x) => x.status === 'open');
  const mine = open.filter((x) => isScanAutoRow(x.comment));
  const today = scanAutoToday(ctx.closedToday);

  // Daily halts — checked before anything else.
  if (today.pnl <= -p.dailyLossLimitUsd) return { kind: 'halt', note: `daily loss limit reached (${today.pnl.toFixed(2)}) — engine stands down until tomorrow` };
  if (p.dailyProfitLockUsd > 0 && today.pnl >= p.dailyProfitLockUsd) return { kind: 'halt', note: `daily profit lock reached (+${today.pnl.toFixed(2)}) — banked and standing down` };
  if (today.consecutiveLosses >= p.consecutiveLossStop) return { kind: 'halt', note: `${today.consecutiveLosses} consecutive losses — engine stops for the day` };
  if (today.trades >= p.maxPerDay) return { kind: 'none', note: `daily trade cap reached (${p.maxPerDay})` };
  if (mine.length >= p.maxOpenTrades) return { kind: 'none', note: `open-trade cap reached (${p.maxOpenTrades})` };

  // Cooldowns
  const sinceEntry = (Date.now() - lastEntryAt()) / 60_000;
  if (sinceEntry < p.cooldownMin) return { kind: 'none', note: `cooldown — ${Math.ceil(p.cooldownMin - sinceEntry)} min until the next entry window` };
  if (today.lastCloseLoss && (Date.now() - today.lastCloseAt) / 60_000 < p.lossCooldownMin) {
    return { kind: 'none', note: `loss cooldown — pausing ${p.lossCooldownMin} min after a losing close` };
  }

  // Sweep the universe for the best opportunity above thresholds.
  const universe = Object.keys(ctx.ticks).filter((s) => ctx.ticks[s]?.bid != null);
  const tfs = SCAN_TFS.filter((t: ScanTF) => p.allowedTfs.includes(t.label));
  const openCcys = [...new Set(open.flatMap((x) => symbolCurrencies(x.symbol)))];

  let best: Opportunity | null = null;
  for (const symbol of universe) {
    if (open.filter((x) => x.symbol === symbol && isScanAutoRow(x.comment)).length >= p.maxPerSymbol) continue;
    for (const tf of tfs) {
      const o = assessOpportunity({ builder: ctx.builder, symbol, tf, tick: ctx.ticks[symbol], calendar: ctx.calendar, openPositionCurrencies: openCcys, balance: ctx.balance, isLiveData: ctx.isLiveData });
      if (o && (!best || o.score > best.score)) best = o;
    }
  }
  if (!best) return { kind: 'none', note: 'no opportunity passes the scanner on the allowed timeframes' };
  if (best.score < p.minScore) return { kind: 'none', note: `best setup ${best.symbol} ${best.tfLabel} scores ${best.score} — below the ${p.minScore} floor` };
  if (best.zone.riskReward1 < p.minRR) return { kind: 'none', note: `${best.symbol}: risk:reward ${best.zone.riskReward1.toFixed(1)} below the ${p.minRR} floor` };

  // News filter on the candidate's currencies.
  if (p.newsFilter) {
    const soon = upcomingHighImpact(symbolCurrencies(best.symbol), ctx.calendar, 1)[0];
    if (soon) return { kind: 'none', note: `${best.symbol}: red-flag ${soon.currency} "${soon.title}" inside 1h — standing aside` };
  }

  // Sizing: fixed-fractional vs the zone stop. No stop → no trade, ever.
  const tick = ctx.ticks[best.symbol];
  const entry = best.direction === 'BUY' ? (tick?.ask ?? 0) : (tick?.bid ?? 0);
  const sl = best.zone.stop;
  const tp = best.zone.target1;
  const stopDist = Math.abs(entry - sl);
  if (!(entry > 0) || !(stopDist > 0)) return { kind: 'none', note: `${best.symbol}: no valid stop distance — refused (no stop, no trade)` };

  // Sizing: FIXED lot is the default (0.01 — small by design); risk-% mode is
  // opt-in. Either way the per-trade lot cap is a hard ceiling.
  let lots = Math.max(0.01, p.fixedLot);
  if (p.lotMode === 'risk' && ctx.balance > 0) {
    const pipSize = best.symbol.includes('JPY') ? 0.01 : best.assetClass === 'forex' ? 0.0001 : stopDist / 50;
    const stopPips = stopDist / pipSize;
    const riskMoney = ctx.balance * p.riskPct / 100;
    const perPipPerLot = 10; // conservative FX approximation on this platform
    lots = Math.max(0.01, Math.floor((riskMoney / Math.max(1, stopPips * perPipPerLot)) * 100) / 100);
  }
  lots = Math.min(lots, Math.max(0.01, p.maxLotPerTrade));

  // Account-level Risk Governor — the final authority.
  const verdict = governorCheck({
    positions: open as GovernorPosition[],
    balance: ctx.balance, equity: ctx.equity, realizedToday: ctx.realizedToday,
    addLots: lots, symbol: best.symbol,
  });
  if (!verdict.allowed) { scanAutoLog('blocked', `governor: ${verdict.reason}`); return { kind: 'none', note: `governor blocked: ${verdict.reason}` }; }

  return {
    kind: 'enter',
    opp: best, lots, entry, sl, tp,
    reason: `${best.symbol} ${best.direction} · ${best.tfLabel} ${best.style} scored ${best.score} (${best.scoreLabel}) with RR ${best.zone.riskReward1.toFixed(1)}; ` +
      `entry ~${entry.toFixed(5)}, stop ${sl.toFixed(5)}, target ${tp.toFixed(5)}; sized ${lots} lots at ${p.riskPct}% risk — governor approved`,
  };
}
