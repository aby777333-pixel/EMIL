// ═══════════════════════════════════════════════════════════════
// NEXUS entry-zone + exit engine (Active-Intelligence super-prompt §5/§6).
// Pure functions over REAL platform bars and positions. Zones are ranges
// with confidence, invalidation and evidence — never presented as
// guaranteed. When the regime doesn't support a setup, the honest answer
// is "no high-quality setup", not an invented level.
// ═══════════════════════════════════════════════════════════════

import { atr, ema } from '@/lib/trading/indicators';
import type { OHLCVBar } from '@/types/trading';
import type { MarketStateAssessment } from '@/lib/nexus/market-state';

function last<T>(arr: (T | null)[]): T | null {
  for (let i = arr.length - 1; i >= 0; i--) { if (arr[i] != null) return arr[i]; }
  return null;
}

export interface EntryZoneAssessment {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  aggressive: number;    // current market
  preferred: number;     // pullback to EMA20
  conservative: number;  // deeper pullback edge
  stop: number;
  target1: number;
  target2: number;
  riskReward1: number;
  confidence: number;
  invalidation: string;
  evidence: string[];
  note: string;
}

export interface NoSetupAssessment {
  symbol: string;
  reason: string;
  evidence: string[];
}

/** Trend-pullback entry zone. Returns a zone only when the regime supports
 *  it; otherwise an honest no-setup with the reason. */
export function computeEntryZone(
  symbol: string,
  bars: OHLCVBar[],
  state: MarketStateAssessment,
  price: number,
): EntryZoneAssessment | NoSetupAssessment {
  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const ema20 = last(ema(closes, 20));
  const atrNow = last(atr(highs, lows, closes, 14));
  if (ema20 == null || atrNow == null || atrNow <= 0) {
    return { symbol, reason: 'Not enough bar history to compute a reliable zone.', evidence: [] };
  }

  const isUp = state.state.includes('Uptrend');
  const isDown = state.state.includes('Downtrend');
  if (!isUp && !isDown) {
    return {
      symbol,
      reason: `Market regime is "${state.state}" — trend-pullback entries carry elevated whipsaw risk here. Waiting for a confirmed breakout or a trending regime is the disciplined play.`,
      evidence: state.evidence,
    };
  }

  const dp = price < 20 ? 5 : 2;
  const r = (x: number) => Number(x.toFixed(dp));
  const dir: 'LONG' | 'SHORT' = isUp ? 'LONG' : 'SHORT';
  const sign = isUp ? 1 : -1;
  const preferred = r(ema20);
  const conservative = r(ema20 - sign * 0.5 * atrNow);
  const aggressive = r(price);
  const stop = r(conservative - sign * 1.5 * atrNow);
  const risk = Math.abs(preferred - stop);
  const target1 = r(preferred + sign * 1.5 * risk);
  const target2 = r(preferred + sign * 2.5 * risk);
  // Weak trends and stretched price reduce confidence below the state's own.
  const stretch = Math.abs(price - ema20) / atrNow; // how far price already ran
  const confidence = Math.max(25, Math.min(85, state.confidence - (state.state.includes('Weak') ? 10 : 0) - Math.round(Math.max(0, stretch - 1) * 8)));

  return {
    symbol,
    direction: dir,
    aggressive, preferred, conservative,
    stop, target1, target2,
    riskReward1: Number((Math.abs(target1 - preferred) / risk).toFixed(1)),
    confidence,
    invalidation: `${isUp ? 'H1 close below' : 'H1 close above'} ${stop} (structure break beyond the pullback zone) invalidates this setup.`,
    evidence: [
      ...state.evidence,
      `Pullback anchor EMA20 = ${preferred}; zone depth 0.5×ATR (${r(0.5 * atrNow)})`,
      `Price is ${stretch.toFixed(1)}×ATR from the EMA20 anchor${stretch > 1.5 ? ' — extended; chasing here worsens the R:R' : ''}`,
    ],
    note: 'Zone-based plan, not a signal: preferred entry is the pullback anchor; aggressive is current market; conservative is the deeper edge. No entry is guaranteed or risk-free.',
  };
}

export interface PositionAssessment {
  headline: string;      // e.g. "HOLD / TRAIL" or "REVIEW — trend opposes"
  action: string;
  reasons: string[];
}

/** §6: reassess an open position against the CURRENT regime of its symbol. */
export function assessPosition(
  p: { symbol: string; direction: string; openPrice: number; currentPrice: number; floatingPnl: number; sl: number | null; tp: number | null },
  state: MarketStateAssessment | null,
  atrNow: number | null,
): PositionAssessment {
  const reasons: string[] = [];
  const isLong = p.direction.toUpperCase() === 'BUY' || p.direction.toUpperCase() === 'LONG';
  const move = (p.currentPrice - p.openPrice) * (isLong ? 1 : -1);

  if (!state || atrNow == null) {
    return {
      headline: 'MONITOR',
      action: 'No bar data for this symbol on the current page — open it on the terminal for a full reassessment.',
      reasons: [`Floating P&L ${p.floatingPnl >= 0 ? '+' : ''}${p.floatingPnl.toFixed(2)}`],
    };
  }

  const aligned = (isLong && state.state.includes('Uptrend')) || (!isLong && state.state.includes('Downtrend'));
  const opposed = (isLong && state.state.includes('Downtrend')) || (!isLong && state.state.includes('Uptrend'));
  const moveAtr = move / atrNow;

  if (p.sl == null || p.sl === 0) reasons.push('No stop loss set — downside is unbounded; defining one is the first priority.');
  reasons.push(`Regime for ${p.symbol}: ${state.state} (confidence ${state.confidence}%)`);
  reasons.push(`Move since entry: ${moveAtr >= 0 ? '+' : ''}${moveAtr.toFixed(1)}×ATR · floating P&L ${p.floatingPnl >= 0 ? '+' : ''}${p.floatingPnl.toFixed(2)}`);

  if (opposed) {
    return {
      headline: 'REVIEW — regime opposes the position',
      action: `The current ${state.state.toLowerCase()} works against this ${isLong ? 'long' : 'short'}. If the entry thesis relied on the prior trend, it may be invalidated — reducing exposure or exiting on strength is the disciplined option. Distinguish this from a pullback: the state engine sees a regime change, not noise.`,
      reasons: [...reasons, ...state.evidence.slice(0, 3)],
    };
  }
  if (aligned && moveAtr >= 1) {
    return {
      headline: 'HOLD — consider break-even / trail',
      action: `Trend remains aligned and the position is ${moveAtr.toFixed(1)}×ATR onside. Moving the stop to break-even removes most downside while keeping the trend runner; an ATR trail (1.5–2×) locks progress without choking normal pullbacks.`,
      reasons,
    };
  }
  if (aligned) {
    return {
      headline: 'HOLD — thesis intact',
      action: 'Regime still supports the position and the move is within normal pullback range. Acting here would be reacting to noise, not information.',
      reasons,
    };
  }
  return {
    headline: 'MONITOR — regime is neutral',
    action: `The market has gone ${state.state.toLowerCase()} — neither confirming nor opposing. Time-based discipline applies: if the setup expected trend continuation and none appears, the position is consuming risk budget without progressing.`,
    reasons,
  };
}
