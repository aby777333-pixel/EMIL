// ═══════════════════════════════════════════════════════════════
// Trader-metrics engine — pure functions behind the cockpit features:
// Discipline Score, Edge Meter, Trade Grades, Exit IQ, Tilt-O-Meter and
// the Currency Strength ribbon. Everything is computed from the trader's
// OWN closed trades and the platform's real bars — no simulation, no
// external feeds. Consumed by TopBarCockpit and EdgeChips.
// ═══════════════════════════════════════════════════════════════

import { classifyMarketState } from '@/lib/nexus/market-state';
import { ema, atr } from '@/lib/trading/indicators';
import type { OHLCVBar } from '@/types/trading';

export interface ClosedTrade {
  symbol: string;
  direction: string;
  size: number;
  open_price: number;
  close_price: number | null;
  sl: number | null;
  tp: number | null;
  realized_pnl: number | null;
  opened_at: string;
  closed_at: string | null;
}

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

export function todayTrades(rows: ClosedTrade[]): ClosedTrade[] {
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  return rows.filter((r) => ms(r.closed_at) >= midnight.getTime());
}

// ── ⚡ Edge Meter ────────────────────────────────────────────────

export interface EdgeRead { n: number; avgPnl: number; winRate: number }

export function edgeMeter(rows: ClosedTrade[], window = 30): EdgeRead | null {
  const recent = rows.slice(0, window).filter((r) => r.realized_pnl != null);
  if (recent.length < 5) return null;
  const total = recent.reduce((a, r) => a + Number(r.realized_pnl), 0);
  const wins = recent.filter((r) => Number(r.realized_pnl) > 0).length;
  return { n: recent.length, avgPnl: total / recent.length, winRate: (wins / recent.length) * 100 };
}

// ── 🎓 Trade Grade ───────────────────────────────────────────────

export interface TradeGrade { score: number; letter: string; notes: string[] }

function last<T>(arr: (T | null)[]): T | null {
  for (let i = arr.length - 1; i >= 0; i--) { if (arr[i] != null) return arr[i]; }
  return null;
}

/** Grade one closed trade against basic discipline rules. `bars60` = the
 *  symbol's H1 bars (full history available in the builder); `prev` = the
 *  trade closed immediately before this one (for the revenge check). */
export function gradeTrade(t: ClosedTrade, bars60: OHLCVBar[], prev: ClosedTrade | null): TradeGrade {
  let score = 100;
  const notes: string[] = [];
  const openPrice = Number(t.open_price);

  if (t.sl == null || Number(t.sl) === 0) { score -= 40; notes.push('no stop loss (−40)'); }
  else if (t.tp != null && Number(t.tp) !== 0) {
    const risk = Math.abs(openPrice - Number(t.sl));
    const reward = Math.abs(Number(t.tp) - openPrice);
    if (risk > 0 && reward / risk < 1) { score -= 15; notes.push('planned R:R under 1:1 (−15)'); }
  }
  if (t.tp == null || Number(t.tp) === 0) { score -= 10; notes.push('no take profit planned (−10)'); }

  // Regime + chase at entry time, from the bars that existed then.
  const openSec = Math.floor(ms(t.opened_at) / 1000);
  const slice = bars60.filter((b) => b.time <= openSec);
  if (slice.length >= 60) {
    const state = classifyMarketState(slice);
    if (state) {
      const isBuy = t.direction.toUpperCase() === 'BUY';
      const opposed = (isBuy && state.state.includes('Downtrend')) || (!isBuy && state.state.includes('Uptrend'));
      const chop = !state.state.includes('trend') && !state.state.includes('Uptrend') && !state.state.includes('Downtrend');
      if (opposed) { score -= 20; notes.push(`against the H1 ${state.state.toLowerCase()} (−20)`); }
      else if (chop) { score -= 10; notes.push('entered in chop (−10)'); }
    }
    const closes = slice.map((b) => b.close);
    const e20 = last(ema(closes, 20));
    const a14 = last(atr(slice.map((b) => b.high), slice.map((b) => b.low), closes, 14));
    if (e20 != null && a14 != null && a14 > 0 && Math.abs(openPrice - e20) / a14 > 1.5) {
      score -= 15; notes.push('chased extended price (−15)');
    }
  }

  // Revenge pattern: bigger size, same symbol, minutes after a loss.
  if (prev && Number(prev.realized_pnl ?? 0) < 0 && prev.symbol === t.symbol &&
      Number(t.size) > Number(prev.size) && ms(t.opened_at) - ms(prev.closed_at) < 10 * 60_000 &&
      ms(t.opened_at) - ms(prev.closed_at) > 0) {
    score -= 25; notes.push('revenge re-entry after a loss (−25)');
  }

  score = Math.max(0, score);
  const letter = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
  if (!notes.length) notes.push('clean execution — SL, plan and trend all respected');
  return { score, letter, notes };
}

export function gradeLetterColor(letter: string): string {
  return letter === 'A' ? '#00C27A' : letter === 'B' ? '#9CCC65' : letter === 'C' ? '#FFB300' : letter === 'D' ? '#FF7043' : '#FF5252';
}

// ── 🧠 Exit IQ ───────────────────────────────────────────────────

/** % of the available favorable move that the exit captured, measured on
 *  M5 bars from entry until 1h after the close. null = not computable. */
export function exitIQ(t: ClosedTrade, bars5: OHLCVBar[]): number | null {
  if (t.close_price == null || !t.closed_at) return null;
  const openSec = Math.floor(ms(t.opened_at) / 1000);
  const endSec = Math.floor(ms(t.closed_at) / 1000) + 3600;
  const win = bars5.filter((b) => b.time >= openSec && b.time <= endSec);
  if (win.length < 3) return null;
  const dir = t.direction.toUpperCase() === 'BUY' ? 1 : -1;
  const open = Number(t.open_price);
  const best = dir > 0 ? Math.max(...win.map((b) => b.high)) : Math.min(...win.map((b) => b.low));
  const available = (best - open) * dir;
  if (available <= 0) return null; // move never went favorable — no exit to grade
  const captured = (Number(t.close_price) - open) * dir;
  return Math.max(0, Math.min(1, captured / available)) * 100;
}

// ── 🌡️ Tilt-O-Meter ─────────────────────────────────────────────

export interface TiltRead { level: 'CALM' | 'ELEVATED' | 'HIGH'; points: number; reasons: string[] }

export function tiltScore(today: ClosedTrade[]): TiltRead {
  const reasons: string[] = [];
  let pts = 0;
  const newestFirst = [...today].sort((a, b) => ms(b.closed_at) - ms(a.closed_at));
  let consec = 0;
  for (const t of newestFirst) { if (Number(t.realized_pnl ?? 0) < 0) consec++; else break; }
  if (consec >= 3) { pts += 2; reasons.push(`${consec} losses in a row`); }
  else if (consec === 2) { pts += 1; reasons.push('2 losses in a row'); }

  const hourAgo = Date.now() - 3_600_000;
  const lastHour = today.filter((t) => ms(t.opened_at) >= hourAgo).length;
  if (lastHour >= 4) { pts += 1; reasons.push(`${lastHour} entries in the last hour`); }

  if (today.length >= 4) {
    const sizes = today.map((t) => Number(t.size)).sort((a, b) => a - b);
    const median = sizes[Math.floor(sizes.length / 2)];
    const lastSize = Number(newestFirst[0]?.size ?? 0);
    if (median > 0 && lastSize > 1.5 * median) { pts += 1; reasons.push('position size creeping up'); }
  }

  const chrono = [...today].sort((a, b) => ms(a.opened_at) - ms(b.opened_at));
  for (let i = 1; i < chrono.length; i++) {
    const prev = chrono[i - 1];
    if (Number(prev.realized_pnl ?? 0) < 0 && ms(chrono[i].opened_at) - ms(prev.closed_at) < 5 * 60_000 && ms(chrono[i].opened_at) - ms(prev.closed_at) > 0) {
      pts += 2; reasons.push('instant re-entry after a loss'); break;
    }
  }

  return { level: pts >= 4 ? 'HIGH' : pts >= 2 ? 'ELEVATED' : 'CALM', points: pts, reasons: reasons.length ? reasons : ['steady pace, steady size'] };
}

// ── 🎯 Discipline Score ─────────────────────────────────────────

export interface DisciplineRead { score: number; notes: string[] }

export function disciplineScore(today: ClosedTrade[], maxTradesPerDay: number | null): DisciplineRead {
  let score = 100;
  const notes: string[] = [];
  const noSl = today.filter((t) => t.sl == null || Number(t.sl) === 0).length;
  if (noSl) { const d = Math.min(45, noSl * 15); score -= d; notes.push(`${noSl} trade(s) without SL (−${d})`); }

  const limit = maxTradesPerDay ?? 10;
  if (today.length > limit) { score -= 10; notes.push(`overtrading: ${today.length}/${limit} trades (−10)`); }

  const tilt = tiltScore(today);
  if (tilt.level === 'HIGH') { score -= 15; notes.push('tilt signals HIGH (−15)'); }
  else if (tilt.level === 'ELEVATED') { score -= 5; notes.push('tilt signals elevated (−5)'); }

  const chrono = [...today].sort((a, b) => ms(a.opened_at) - ms(b.opened_at));
  let revenge = 0;
  for (let i = 1; i < chrono.length; i++) {
    const prev = chrono[i - 1];
    if (Number(prev.realized_pnl ?? 0) < 0 && prev.symbol === chrono[i].symbol &&
        Number(chrono[i].size) > Number(prev.size) && ms(chrono[i].opened_at) - ms(prev.closed_at) < 10 * 60_000 && ms(chrono[i].opened_at) - ms(prev.closed_at) > 0) revenge++;
  }
  if (revenge) { const d = Math.min(30, revenge * 15); score -= d; notes.push(`${revenge} revenge pattern(s) (−${d})`); }

  if (!notes.length) notes.push(today.length ? 'flawless discipline so far today' : 'no closed trades yet today — score starts perfect');
  return { score: Math.max(0, score), notes };
}

// ── 💪 Currency Strength (bar-based, 24×H1 change) ──────────────

const STRENGTH_PAIRS: Record<string, [string, boolean][]> = {
  USD: [['EURUSD', false], ['GBPUSD', false], ['USDJPY', true], ['USDCHF', true], ['AUDUSD', false], ['USDCAD', true]],
  EUR: [['EURUSD', true], ['EURGBP', true], ['EURJPY', true]],
  GBP: [['GBPUSD', true], ['EURGBP', false], ['GBPJPY', true]],
  JPY: [['USDJPY', false], ['EURJPY', false], ['GBPJPY', false]],
  CHF: [['USDCHF', false]],
  CAD: [['USDCAD', false]],
  AUD: [['AUDUSD', true]],
  NZD: [['NZDUSD', true]],
};

export interface StrengthRead { ccy: string; raw: number }

export function currencyStrength(getBars: (symbol: string) => OHLCVBar[]): StrengthRead[] {
  const out: StrengthRead[] = [];
  for (const ccy of Object.keys(STRENGTH_PAIRS)) {
    let total = 0; let n = 0;
    for (const [pair, isBase] of STRENGTH_PAIRS[ccy]) {
      const bars = getBars(pair);
      if (bars.length < 25) continue;
      const ref = bars[bars.length - 25].close;
      if (!(ref > 0)) continue;
      const chg = ((bars[bars.length - 1].close - ref) / ref) * 100;
      total += isBase ? chg : -chg;
      n++;
    }
    if (n) out.push({ ccy, raw: total / n });
  }
  return out.sort((a, b) => b.raw - a.raw);
}

// ── 📋 Session Game Plan ────────────────────────────────────────

export interface GamePlan { text: string; symbols: string; direction: 'both' | 'long' | 'short'; maxTrades: number | null }

const planKey = () => `raptor_gameplan_${new Date().toISOString().slice(0, 10)}`;

export function loadGamePlan(): GamePlan | null {
  try { return JSON.parse(localStorage.getItem(planKey()) || 'null'); } catch { return null; }
}

export function saveGamePlan(p: GamePlan | null): void {
  try {
    if (p && (p.text.trim() || p.symbols.trim() || p.maxTrades)) localStorage.setItem(planKey(), JSON.stringify(p));
    else localStorage.removeItem(planKey());
  } catch { /* ignore */ }
}

/** Returns plan violations for a just-placed order (empty = compliant). */
export function planViolations(plan: GamePlan, order: { symbol: string; direction: string }, tradesSoFar: number): string[] {
  const v: string[] = [];
  const allow = plan.symbols.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (allow.length && !allow.includes(order.symbol.toUpperCase())) v.push(`${order.symbol} is not in today's plan (${allow.join(', ')})`);
  if (plan.direction === 'long' && order.direction.toUpperCase() === 'SELL') v.push('plan says LONGS only');
  if (plan.direction === 'short' && order.direction.toUpperCase() === 'BUY') v.push('plan says SHORTS only');
  if (plan.maxTrades != null && plan.maxTrades > 0 && tradesSoFar + 1 > plan.maxTrades) v.push(`over your ${plan.maxTrades}-trade limit`);
  return v;
}
