// ═══════════════════════════════════════════════════════════════
// Trader Protection engine — self-imposed, trader-controlled risk rules.
// Every rule is OFF by default (except the non-blocking margin ladder);
// the trader opts in from the Shield menu. Enforcement happens at the
// single order choke-point (order-service), so QuickTrade, the order
// ticket, DOM, watchlist, voice trading AND EAs all obey the same rules.
//
// Rules never touch existing positions (closing is always allowed) —
// they only gate NEW orders, exactly like broker-side trading controls,
// but chosen by the trader in calm moments and executed in bad ones.
// ═══════════════════════════════════════════════════════════════

import { useTradingStore } from '@/stores/trading';
import { getInstrumentSpecs, valuePerUnitPerLot } from '@/lib/insights/risk';
import { createClient } from '@/lib/supabase/client';
import { getCalendar, highImpactWithin } from '@/lib/trading/news-guard';

// ── Settings ────────────────────────────────────────────────────

export interface ProtectionSettings {
  dailyLossLimit:   { on: boolean; amount: number };            // stop new orders after -$X realized today
  profitLockIn:     { on: boolean; amount: number };            // bank the win: stop after +$X realized today
  mandatorySL:      { on: boolean };                            // no order without a stop loss
  riskCap:          { on: boolean; pct: number };               // reject orders risking > X% of equity (needs SL)
  lossCooldown:     { on: boolean; losses: number; minutes: number }; // N losses in a row → cooling-off window
  revengeGuard:     { on: boolean; minutes: number };           // bigger order, same symbol, minutes after a loss
  overtradeGovernor:{ on: boolean; maxPerDay: number };         // hard daily trade count limit
  correlationGuard: { on: boolean; maxSameCurrency: number };   // max open positions sharing one currency
  marginLadder:     { on: boolean };                            // early warnings at 300 / 200 / 150% margin level
  spreadGuard:      { on: boolean; maxPips: number };           // refuse fills into an abnormally wide spread
  equityFloor:      { on: boolean; equity: number };            // kill switch: close all + lock trading 24h
  newsGuard:        { on: boolean; minutes: number };           // block new orders around high-impact news
}

export const PROTECTION_DEFAULTS: ProtectionSettings = {
  dailyLossLimit:    { on: false, amount: 500 },
  profitLockIn:      { on: false, amount: 1000 },
  mandatorySL:       { on: false },
  riskCap:           { on: false, pct: 2 },
  lossCooldown:      { on: false, losses: 3, minutes: 30 },
  revengeGuard:      { on: false, minutes: 10 },
  overtradeGovernor: { on: false, maxPerDay: 10 },
  correlationGuard:  { on: false, maxSameCurrency: 3 },
  marginLadder:      { on: true },                 // warnings only — never blocks
  spreadGuard:       { on: false, maxPips: 5 },
  equityFloor:       { on: false, equity: 0 },
  newsGuard:         { on: false, minutes: 30 },
};

const SETTINGS_PREFIX = 'raptor_protection_v1_';
const LOCK_PREFIX = 'raptor_protection_lock_';

function storageKey(accountId: string | null): string {
  return `${SETTINGS_PREFIX}${accountId ?? 'default'}`;
}

export function loadProtectionSettings(accountId: string | null): ProtectionSettings {
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    if (!raw) return structuredClone(PROTECTION_DEFAULTS);
    const saved = JSON.parse(raw) as Partial<ProtectionSettings>;
    // Merge over defaults so new rules added later keep safe defaults.
    const out = structuredClone(PROTECTION_DEFAULTS);
    for (const k of Object.keys(out) as (keyof ProtectionSettings)[]) {
      if (saved[k]) Object.assign(out[k], saved[k]);
    }
    return out;
  } catch {
    return structuredClone(PROTECTION_DEFAULTS);
  }
}

export function saveProtectionSettings(accountId: string | null, s: ProtectionSettings): void {
  try { localStorage.setItem(storageKey(accountId), JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Equity-floor lock ───────────────────────────────────────────

export interface ProtectionLock { until: number; reason: string }

export function getLock(accountId: string | null): ProtectionLock | null {
  try {
    const raw = localStorage.getItem(`${LOCK_PREFIX}${accountId ?? 'default'}`);
    if (!raw) return null;
    const lock = JSON.parse(raw) as ProtectionLock;
    if (Date.now() >= lock.until) return null;
    return lock;
  } catch {
    return null;
  }
}

export function setLock(accountId: string | null, hours: number, reason: string): void {
  try {
    localStorage.setItem(`${LOCK_PREFIX}${accountId ?? 'default'}`,
      JSON.stringify({ until: Date.now() + hours * 3_600_000, reason }));
  } catch { /* ignore */ }
}

// ── Day stats (from real closed positions) ──────────────────────

export interface DayStats {
  realizedToday: number;
  tradesToday: number;
  consecLosses: number;
  lastLossAt: number | null;   // ms epoch of the most recent losing close
  lastLossSymbol: string | null;
  lastLossSize: number;
}

interface ClosedRow {
  symbol: string; size: number | string;
  realized_pnl: number | string | null; closed_at: string | null;
}

let dayStatsCache: { accountId: string; at: number; stats: DayStats } | null = null;

export async function loadDayStats(accountId: string): Promise<DayStats> {
  // Small cache so a burst of EA evaluations doesn't hammer the DB.
  if (dayStatsCache && dayStatsCache.accountId === accountId && Date.now() - dayStatsCache.at < 10_000) {
    return dayStatsCache.stats;
  }
  const empty: DayStats = { realizedToday: 0, tradesToday: 0, consecLosses: 0, lastLossAt: null, lastLossSymbol: null, lastLossSize: 0 };
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('positions')
      .select('symbol, size, realized_pnl, closed_at')
      .eq('account_id', accountId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(120);
    if (error || !data) return empty;
    const rows = data as ClosedRow[];
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const stats: DayStats = { ...empty };
    // rows are newest-first: consecutive losses count from the top.
    let streakBroken = false;
    for (const r of rows) {
      const pnl = Number(r.realized_pnl ?? 0);
      const closedAt = r.closed_at ? new Date(r.closed_at).getTime() : 0;
      if (!streakBroken) {
        if (pnl < 0) stats.consecLosses += 1; else streakBroken = true;
      }
      if (pnl < 0 && stats.lastLossAt == null) {
        stats.lastLossAt = closedAt;
        stats.lastLossSymbol = r.symbol;
        stats.lastLossSize = Number(r.size);
      }
      if (closedAt >= midnight.getTime()) {
        stats.realizedToday += pnl;
        stats.tradesToday += 1;
      }
    }
    dayStatsCache = { accountId, at: Date.now(), stats };
    return stats;
  } catch {
    return empty;
  }
}

export function invalidateDayStats(): void { dayStatsCache = null; }

// ── Symbol currency parsing (correlation guard) ─────────────────

export function symbolCurrencies(symbol: string): string[] {
  if (/^[A-Z]{6}$/.test(symbol)) return [symbol.slice(0, 3), symbol.slice(3)];
  return [symbol]; // indices / energies / metals-with-suffix count as themselves
}

// ── The order gate ──────────────────────────────────────────────

export class ProtectionBlockError extends Error {
  constructor(message: string) { super(message); this.name = 'ProtectionBlockError'; }
}

export interface OrderContext {
  accountId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  size: number;
  sl?: number | null;
  entryPrice: number;      // fill price (market) or order price (pending)
}

/** Throws ProtectionBlockError with a plain-language reason when a
 *  trader-enabled rule blocks this NEW order. Closing positions and
 *  cancelling orders are never gated. */
export async function protectionCheck(ctx: OrderContext): Promise<void> {
  const s = loadProtectionSettings(ctx.accountId);

  // 0 · Equity-floor lock (kill switch already fired)
  const lock = getLock(ctx.accountId);
  if (lock) {
    const hrs = Math.ceil((lock.until - Date.now()) / 3_600_000);
    throw new ProtectionBlockError(
      `⛔ Equity-floor kill switch is active — trading locked ~${hrs}h more. ${lock.reason}`);
  }

  // 1 · Mandatory stop loss
  if (s.mandatorySL.on && (ctx.sl == null || ctx.sl === 0)) {
    throw new ProtectionBlockError(
      '🛡 Mandatory Stop-Loss is ON: this order has no SL, so its downside is unbounded. Attach a stop loss (or turn the rule off in Shield).');
  }

  // 2 · Risk-per-trade cap (needs an SL to measure the risk)
  if (s.riskCap.on && ctx.sl != null && ctx.sl !== 0) {
    const equity = Number(useTradingStore.getState().accountSummary?.equity ?? 0);
    if (equity > 0) {
      const specs = await getInstrumentSpecs();
      const spec = specs[ctx.symbol];
      if (spec) {
        const risk = Math.abs(ctx.entryPrice - ctx.sl) * ctx.size * valuePerUnitPerLot(spec);
        const cap = (s.riskCap.pct / 100) * equity;
        if (risk > cap) {
          throw new ProtectionBlockError(
            `🛡 Risk cap: this order risks ~$${risk.toFixed(0)} to its SL — over your ${s.riskCap.pct}% of equity cap ($${cap.toFixed(0)}). Reduce the lot size or tighten the stop.`);
        }
      }
    }
  }

  // 3 · Spread guard (refuse abnormally wide spreads)
  if (s.spreadGuard.on) {
    const t = useTradingStore.getState().prices[ctx.symbol];
    if (t?.bid != null && t?.ask != null) {
      const specs = await getInstrumentSpecs();
      const spec = specs[ctx.symbol];
      if (spec) {
        const pip = 10 / spec.pricescale; // 1 pip = 10 price units at scale
        const spreadPips = (t.ask - t.bid) / pip;
        if (spreadPips > s.spreadGuard.maxPips) {
          throw new ProtectionBlockError(
            `🛡 Spread guard: ${ctx.symbol} spread is ${spreadPips.toFixed(1)} pips (your limit: ${s.spreadGuard.maxPips}). Filling into a wide spread hands the edge away — wait for it to normalise.`);
        }
      }
    }
  }

  // 3b · News guard (opt-in): refuse new orders around high-impact releases
  // touching either of the symbol's currencies. Real ForexFactory calendar
  // data via /api/calendar; fails open if the feed is unreachable.
  if (s.newsGuard.on) {
    try {
      const events = await getCalendar();
      const hits = highImpactWithin(symbolCurrencies(ctx.symbol), events, s.newsGuard.minutes);
      if (hits.length) {
        const ev = hits[0];
        const mins = Math.round((ev.timeMs - Date.now()) / 60_000);
        throw new ProtectionBlockError(
          `📅 News guard: ${ev.currency} "${ev.title}" ${mins >= 0 ? `in ${mins} min` : `${-mins} min ago`} — high-impact news makes spreads jump and stops slip. Your rule blocks entries within ${s.newsGuard.minutes} min of red-flag events.`);
      }
    } catch (e) {
      if (e instanceof ProtectionBlockError) throw e;
      // calendar unreachable — fail open
    }
  }

  // Rules below need real day stats / open positions.
  const needsStats = s.dailyLossLimit.on || s.profitLockIn.on || s.overtradeGovernor.on || s.lossCooldown.on || s.revengeGuard.on;
  const stats = needsStats ? await loadDayStats(ctx.accountId) : null;

  // 4 · Daily loss circuit-breaker
  if (s.dailyLossLimit.on && stats && stats.realizedToday <= -Math.abs(s.dailyLossLimit.amount)) {
    throw new ProtectionBlockError(
      `⛔ Daily loss circuit-breaker: you are $${Math.abs(stats.realizedToday).toFixed(0)} down today (limit $${s.dailyLossLimit.amount}). New orders are blocked until tomorrow — existing positions can still be managed. The best trade now is no trade.`);
  }

  // 5 · Daily profit lock-in
  if (s.profitLockIn.on && stats && stats.realizedToday >= Math.abs(s.profitLockIn.amount)) {
    throw new ProtectionBlockError(
      `✅ Profit lock-in: +$${stats.realizedToday.toFixed(0)} banked today (target $${s.profitLockIn.amount}). You chose to stop while ahead — giving winnings back in the late session is how green days turn red.`);
  }

  // 6 · Overtrading governor
  if (s.overtradeGovernor.on && stats && stats.tradesToday >= s.overtradeGovernor.maxPerDay) {
    throw new ProtectionBlockError(
      `🛡 Overtrading governor: ${stats.tradesToday} trades today — your daily limit is ${s.overtradeGovernor.maxPerDay}. Quality beats quantity; the limit resets at midnight.`);
  }

  // 7 · Consecutive-loss cooldown
  if (s.lossCooldown.on && stats && stats.consecLosses >= s.lossCooldown.losses && stats.lastLossAt) {
    const elapsed = Date.now() - stats.lastLossAt;
    const windowMs = s.lossCooldown.minutes * 60_000;
    if (elapsed < windowMs) {
      const left = Math.ceil((windowMs - elapsed) / 60_000);
      throw new ProtectionBlockError(
        `🛡 Cooling-off: ${stats.consecLosses} losses in a row — trading paused ${left} more min. Step away from the screen; the market will still be here.`);
    }
  }

  // 8 · Revenge-trade guard
  if (s.revengeGuard.on && stats && stats.lastLossAt) {
    const withinWindow = Date.now() - stats.lastLossAt < s.revengeGuard.minutes * 60_000;
    if (withinWindow && ctx.symbol === stats.lastLossSymbol && ctx.size > stats.lastLossSize) {
      throw new ProtectionBlockError(
        `🛡 Revenge-trade guard: ${Math.round((Date.now() - stats.lastLossAt) / 60_000)} min after a loss on ${ctx.symbol}, you're re-entering the SAME symbol with a BIGGER size (${ctx.size} vs ${stats.lastLossSize}). That pattern is how losses compound. Wait ${s.revengeGuard.minutes} min or size down.`);
    }
  }

  // 9 · Correlation guard
  if (s.correlationGuard.on) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('positions')
        .select('symbol')
        .eq('account_id', ctx.accountId)
        .eq('status', 'open');
      if (data && data.length) {
        const counts: Record<string, number> = {};
        for (const p of data as { symbol: string }[]) {
          for (const c of symbolCurrencies(p.symbol)) counts[c] = (counts[c] ?? 0) + 1;
        }
        for (const c of symbolCurrencies(ctx.symbol)) {
          if ((counts[c] ?? 0) >= s.correlationGuard.maxSameCurrency) {
            throw new ProtectionBlockError(
              `🛡 Correlation guard: you already hold ${counts[c]} positions touching ${c} — this order makes it one oversized ${c} bet, not a new idea. Your limit is ${s.correlationGuard.maxSameCurrency}.`);
          }
        }
      }
    } catch (e) {
      if (e instanceof ProtectionBlockError) throw e;
      // network/RLS hiccup: fail open — protections are self-imposed aids
    }
  }
}
