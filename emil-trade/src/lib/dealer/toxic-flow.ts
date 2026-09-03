// ===============================================================
// EMIL TRADE -- Toxic Flow Detection
// Scans a client's trade history for toxic flow signals
// ===============================================================

import type {
  Trade,
  ToxicFlowResult,
  ToxicSignal,
  ToxicSignalSeverity,
  ToxicAction,
  RoutingMode,
} from './types';

// -- Thresholds -------------------------------------------------

const THRESHOLDS = {
  /** Trades per day to be considered high frequency */
  HIGH_FREQUENCY_DAILY: 30,

  /** Average hold time in seconds below which is scalping */
  SCALPING_HOLD_SECONDS: 120,

  /** Win rate above which is suspicious */
  CONSISTENT_WINNER_RATE: 0.65,

  /** Percentage of trades within news window */
  NEWS_TRADING_PCT: 0.40,

  /** Consecutive profitable days to flag */
  CONSECUTIVE_PROFITABLE_DAYS: 5,
} as const;

// -- Main scan function -----------------------------------------

/**
 * Run a toxic flow scan on a client's trade history.
 *
 * Analyzes 5 signals:
 *   1. High frequency trading
 *   2. Scalping (short hold times)
 *   3. Consistent winner (high win rate)
 *   4. News trading (trades clustered around news events)
 *   5. Consecutive profitable days
 *
 * Scoring:
 *   Critical signal = 2 points
 *   Warning signal  = 1 point
 *   Score range: 0-5 (capped)
 *
 * Action:
 *   score >= 3 -> flag
 *   score >= 2 -> watch
 *   score <  2 -> clear
 */
export function runToxicFlowScan(
  clientId: string,
  trades: Trade[],
  newsTimestamps: number[] = [],
): ToxicFlowResult {
  if (trades.length === 0) {
    return {
      score: 0,
      signals: [],
      action: 'clear',
      recommended_routing: 'b_book',
    };
  }

  const signals: ToxicSignal[] = [];

  // -- Signal 1: High frequency trading -------------------------

  const frequencySignal = analyzeFrequency(trades);
  if (frequencySignal) signals.push(frequencySignal);

  // -- Signal 2: Scalping (short hold times) --------------------

  const scalpingSignal = analyzeScalping(trades);
  if (scalpingSignal) signals.push(scalpingSignal);

  // -- Signal 3: Consistent winner ------------------------------

  const winnerSignal = analyzeWinRate(trades);
  if (winnerSignal) signals.push(winnerSignal);

  // -- Signal 4: News trading -----------------------------------

  const newsSignal = analyzeNewsTrading(trades, newsTimestamps);
  if (newsSignal) signals.push(newsSignal);

  // -- Signal 5: Consecutive profitable days --------------------

  const consecutiveSignal = analyzeConsecutiveProfitDays(trades);
  if (consecutiveSignal) signals.push(consecutiveSignal);

  // -- Compute score --------------------------------------------

  let rawScore = 0;
  for (const signal of signals) {
    rawScore += signal.severity === 'critical' ? 2 : 1;
  }
  const score = Math.min(rawScore, 5);

  // -- Determine action -----------------------------------------

  let action: ToxicAction;
  if (score >= 3) {
    action = 'flag';
  } else if (score >= 2) {
    action = 'watch';
  } else {
    action = 'clear';
  }

  // -- Determine recommended routing ----------------------------

  let recommendedRouting: RoutingMode;
  if (score >= 3) {
    recommendedRouting = 'a_book';
  } else if (score >= 2) {
    recommendedRouting = 'hybrid';
  } else {
    recommendedRouting = 'b_book';
  }

  return {
    score,
    signals,
    action,
    recommended_routing: recommendedRouting,
  };
}

// -- Individual signal analyzers --------------------------------

function analyzeFrequency(trades: Trade[]): ToxicSignal | null {
  if (trades.length < 2) return null;

  const sortedTimes = trades
    .map((t) => new Date(t.created_at).getTime())
    .sort((a, b) => a - b);

  const firstDay = sortedTimes[0];
  const lastDay = sortedTimes[sortedTimes.length - 1];
  const daySpan = Math.max((lastDay - firstDay) / (1000 * 60 * 60 * 24), 1);
  const tradesPerDay = trades.length / daySpan;

  if (tradesPerDay >= THRESHOLDS.HIGH_FREQUENCY_DAILY) {
    const severity: ToxicSignalSeverity =
      tradesPerDay >= THRESHOLDS.HIGH_FREQUENCY_DAILY * 2 ? 'critical' : 'warning';

    return {
      type: 'high_frequency',
      severity,
      value: Math.round(tradesPerDay * 100) / 100,
      threshold: THRESHOLDS.HIGH_FREQUENCY_DAILY,
      description: `${tradesPerDay.toFixed(1)} trades/day exceeds ${THRESHOLDS.HIGH_FREQUENCY_DAILY} threshold`,
    };
  }

  return null;
}

function analyzeScalping(trades: Trade[]): ToxicSignal | null {
  const closedTrades = trades.filter(
    (t) => t.status === 'closed' && t.filled_at && t.closed_at,
  );

  if (closedTrades.length < 5) return null;

  let totalHoldSeconds = 0;
  for (const t of closedTrades) {
    const openTime = new Date(t.filled_at!).getTime();
    const closeTime = new Date(t.closed_at!).getTime();
    totalHoldSeconds += (closeTime - openTime) / 1000;
  }

  const avgHold = totalHoldSeconds / closedTrades.length;

  if (avgHold < THRESHOLDS.SCALPING_HOLD_SECONDS) {
    const severity: ToxicSignalSeverity =
      avgHold < THRESHOLDS.SCALPING_HOLD_SECONDS / 2 ? 'critical' : 'warning';

    return {
      type: 'scalping',
      severity,
      value: Math.round(avgHold),
      threshold: THRESHOLDS.SCALPING_HOLD_SECONDS,
      description: `Avg hold time ${Math.round(avgHold)}s below ${THRESHOLDS.SCALPING_HOLD_SECONDS}s scalping threshold`,
    };
  }

  return null;
}

function analyzeWinRate(trades: Trade[]): ToxicSignal | null {
  const closedTrades = trades.filter(
    (t) => t.status === 'closed' && t.realized_pnl !== null,
  );

  if (closedTrades.length < 10) return null;

  const wins = closedTrades.filter((t) => (t.realized_pnl ?? 0) > 0).length;
  const winRate = wins / closedTrades.length;

  if (winRate >= THRESHOLDS.CONSISTENT_WINNER_RATE) {
    const severity: ToxicSignalSeverity =
      winRate >= 0.80 ? 'critical' : 'warning';

    return {
      type: 'consistent_winner',
      severity,
      value: Math.round(winRate * 10000) / 10000,
      threshold: THRESHOLDS.CONSISTENT_WINNER_RATE,
      description: `Win rate ${(winRate * 100).toFixed(1)}% exceeds ${(THRESHOLDS.CONSISTENT_WINNER_RATE * 100).toFixed(0)}% threshold over ${closedTrades.length} trades`,
    };
  }

  return null;
}

function analyzeNewsTrading(
  trades: Trade[],
  newsTimestamps: number[],
): ToxicSignal | null {
  if (newsTimestamps.length === 0 || trades.length < 5) return null;

  const newsWindowMs = 5 * 60 * 1000; // 5 minutes before/after news
  let nearNewsCount = 0;

  for (const trade of trades) {
    const tradeTime = new Date(trade.created_at).getTime();
    for (const newsTime of newsTimestamps) {
      if (Math.abs(tradeTime - newsTime) < newsWindowMs) {
        nearNewsCount++;
        break;
      }
    }
  }

  const newsRatio = nearNewsCount / trades.length;

  if (newsRatio >= THRESHOLDS.NEWS_TRADING_PCT) {
    const severity: ToxicSignalSeverity =
      newsRatio >= 0.60 ? 'critical' : 'warning';

    return {
      type: 'news_trading',
      severity,
      value: Math.round(newsRatio * 10000) / 10000,
      threshold: THRESHOLDS.NEWS_TRADING_PCT,
      description: `${(newsRatio * 100).toFixed(1)}% of trades placed within 5min of news events`,
    };
  }

  return null;
}

function analyzeConsecutiveProfitDays(trades: Trade[]): ToxicSignal | null {
  const closedTrades = trades.filter(
    (t) => t.status === 'closed' && t.realized_pnl !== null && t.closed_at,
  );

  if (closedTrades.length < 5) return null;

  // Group PnL by calendar day
  const dailyPnl = new Map<string, number>();
  for (const t of closedTrades) {
    const day = t.closed_at!.slice(0, 10); // YYYY-MM-DD
    dailyPnl.set(day, (dailyPnl.get(day) ?? 0) + (t.realized_pnl ?? 0));
  }

  // Sort days and find max consecutive profitable streak
  const sortedDays = Array.from(dailyPnl.entries()).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  let maxStreak = 0;
  let currentStreak = 0;

  for (const [, pnl] of sortedDays) {
    if (pnl > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  if (maxStreak >= THRESHOLDS.CONSECUTIVE_PROFITABLE_DAYS) {
    const severity: ToxicSignalSeverity =
      maxStreak >= THRESHOLDS.CONSECUTIVE_PROFITABLE_DAYS * 2 ? 'critical' : 'warning';

    return {
      type: 'consecutive_profitable_days',
      severity,
      value: maxStreak,
      threshold: THRESHOLDS.CONSECUTIVE_PROFITABLE_DAYS,
      description: `${maxStreak} consecutive profitable trading days (threshold: ${THRESHOLDS.CONSECUTIVE_PROFITABLE_DAYS})`,
    };
  }

  return null;
}
