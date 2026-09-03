// ===============================================================
// EMIL TRADE -- A/B Book Decision Engine
// Computes routing decisions using weighted scoring with Decimal.js
// ===============================================================

import Decimal from 'decimal.js';
import type {
  Trade,
  Client,
  SymbolExposure,
  RoutingDecision,
  RoutingReason,
  RiskFlag,
  NewsEvent,
} from './types';

// -- Scoring weights --------------------------------------------

const WEIGHTS = {
  WIN_RATE: new Decimal('0.30'),
  TRADE_SIZE: new Decimal('0.20'),
  HOLD_TIME: new Decimal('0.20'),
  NEWS_PROXIMITY: new Decimal('0.15'),
  EXPOSURE_BALANCE: new Decimal('0.15'),
} as const;

// -- Thresholds -------------------------------------------------

const THRESHOLD_A_BOOK = new Decimal('0.65');
const THRESHOLD_B_BOOK = new Decimal('0.35');
const TOXIC_SCORE_FORCE_A = 4;
const HIGH_WIN_RATE = new Decimal('0.65');
const SCALPING_HOLD_SECONDS = 120;
const LARGE_TRADE_LOTS = new Decimal('5.0');
const NEWS_PROXIMITY_MINUTES = 30;

// -- Decision context -------------------------------------------

export interface DecisionContext {
  trade: Trade;
  client: Client;
  exposure: SymbolExposure | null;
  activeNews: NewsEvent[];
  symbolMaxLots: number;
}

// -- Main decision function ------------------------------------

/**
 * Compute the routing decision for a trade based on client profile,
 * exposure state, and market conditions.
 *
 * Hard rules override weighted scoring:
 *   - Exposure breach -> force A-book
 *   - Toxic client (score >= 4) -> force A-book
 *
 * Weighted scoring factors:
 *   - Win rate (30%)
 *   - Trade size relative to limits (20%)
 *   - Average hold time (20%)
 *   - News proximity (15%)
 *   - Exposure balance (15%)
 */
export function computeRoutingDecision(ctx: DecisionContext): RoutingDecision {
  const { trade, client, exposure, activeNews } = ctx;
  const reasons: RoutingReason[] = [];
  const riskFlags: RiskFlag[] = [];
  const now = new Date();

  // -- Hard Rule: Exposure breach -> force A-book ---------------

  if (exposure && exposure.is_breached) {
    riskFlags.push({
      type: 'exposure_breach',
      severity: 'critical',
      message: `Exposure breach on ${trade.symbol}: ${exposure.utilization_pct.toFixed(1)}% utilized`,
    });

    return buildHardRuleDecision(
      'a_book',
      'exposure_breach',
      reasons,
      riskFlags,
      `Forced A-book: exposure breach on ${trade.symbol}`,
    );
  }

  // -- Hard Rule: Toxic client -> force A-book ------------------

  if (client.toxic_score >= TOXIC_SCORE_FORCE_A) {
    riskFlags.push({
      type: 'toxic_client',
      severity: 'critical',
      message: `Client toxic score ${client.toxic_score}/5 exceeds threshold ${TOXIC_SCORE_FORCE_A}`,
    });

    return buildHardRuleDecision(
      'a_book',
      'toxic_client',
      reasons,
      riskFlags,
      `Forced A-book: toxic client score ${client.toxic_score}`,
    );
  }

  // -- Weighted scoring -----------------------------------------

  // Factor 1: Win rate (30%) - high win rate pushes toward A-book
  const winRate = new Decimal(client.win_rate);
  const winRateScore = winRate.greaterThan(HIGH_WIN_RATE)
    ? winRate
    : winRate.mul('0.5');
  reasons.push({
    factor: 'win_rate',
    weight: WEIGHTS.WIN_RATE.toNumber(),
    direction: winRate.greaterThanOrEqualTo(HIGH_WIN_RATE) ? 'a_book' : 'b_book',
    score: winRateScore.toNumber(),
    description: `Win rate ${(client.win_rate * 100).toFixed(1)}% ${winRate.greaterThanOrEqualTo(HIGH_WIN_RATE) ? '(high - favors A-book)' : '(normal - favors B-book)'}`,
  });
  if (winRate.greaterThanOrEqualTo(HIGH_WIN_RATE)) {
    riskFlags.push({
      type: 'high_win_rate',
      severity: 'medium',
      message: `Client win rate ${(client.win_rate * 100).toFixed(1)}% above ${HIGH_WIN_RATE.mul(100)}% threshold`,
    });
  }

  // Factor 2: Trade size (20%) - larger trades push toward A-book
  const tradeSize = new Decimal(trade.requested_size);
  const tradeSizeNorm = Decimal.min(tradeSize.div(LARGE_TRADE_LOTS), new Decimal(1));
  reasons.push({
    factor: 'trade_size',
    weight: WEIGHTS.TRADE_SIZE.toNumber(),
    direction: tradeSize.greaterThanOrEqualTo(LARGE_TRADE_LOTS) ? 'a_book' : 'b_book',
    score: tradeSizeNorm.toNumber(),
    description: `Trade size ${trade.requested_size} lots ${tradeSize.greaterThanOrEqualTo(LARGE_TRADE_LOTS) ? '(large - favors A-book)' : '(normal)'}`,
  });
  if (tradeSize.greaterThanOrEqualTo(LARGE_TRADE_LOTS)) {
    riskFlags.push({
      type: 'large_position',
      severity: 'medium',
      message: `Trade size ${trade.requested_size} lots exceeds ${LARGE_TRADE_LOTS} lot threshold`,
    });
  }

  // Factor 3: Hold time (20%) - short hold time = scalping = A-book
  const avgHold = new Decimal(client.avg_hold_time_seconds);
  const holdTimeScore = avgHold.lessThan(SCALPING_HOLD_SECONDS)
    ? new Decimal(1).minus(avgHold.div(SCALPING_HOLD_SECONDS))
    : new Decimal(0);
  reasons.push({
    factor: 'hold_time',
    weight: WEIGHTS.HOLD_TIME.toNumber(),
    direction: avgHold.lessThan(SCALPING_HOLD_SECONDS) ? 'a_book' : 'b_book',
    score: holdTimeScore.toNumber(),
    description: `Avg hold ${client.avg_hold_time_seconds}s ${avgHold.lessThan(SCALPING_HOLD_SECONDS) ? '(scalping - favors A-book)' : '(normal)'}`,
  });
  if (avgHold.lessThan(SCALPING_HOLD_SECONDS)) {
    riskFlags.push({
      type: 'scalping',
      severity: 'medium',
      message: `Average hold time ${client.avg_hold_time_seconds}s below ${SCALPING_HOLD_SECONDS}s scalping threshold`,
    });
  }

  // Factor 4: News proximity (15%) - trade near news = A-book
  let newsScore = new Decimal(0);
  const newsWindow = NEWS_PROXIMITY_MINUTES * 60 * 1000;
  for (const event of activeNews) {
    const eventTime = new Date(event.scheduled_at).getTime();
    const diff = Math.abs(now.getTime() - eventTime);
    if (diff < newsWindow && event.symbols_affected.includes(trade.symbol)) {
      const proximity = new Decimal(1).minus(new Decimal(diff).div(newsWindow));
      if (proximity.greaterThan(newsScore)) {
        newsScore = proximity;
      }
    }
  }
  if (newsScore.greaterThan(0)) {
    riskFlags.push({
      type: 'news_trading',
      severity: 'high',
      message: `Trade placed near high-impact news event`,
    });
  }
  reasons.push({
    factor: 'news_proximity',
    weight: WEIGHTS.NEWS_PROXIMITY.toNumber(),
    direction: newsScore.greaterThan('0.5') ? 'a_book' : 'neutral',
    score: newsScore.toNumber(),
    description: newsScore.greaterThan(0)
      ? `Active news event nearby (proximity ${newsScore.toFixed(2)} - favors A-book)`
      : 'No active news events',
  });

  // Factor 5: Exposure balance (15%) - high utilization = A-book
  let exposureScore = new Decimal(0);
  if (exposure) {
    exposureScore = Decimal.min(
      new Decimal(exposure.utilization_pct).div(100),
      new Decimal(1),
    );
  }
  reasons.push({
    factor: 'exposure_balance',
    weight: WEIGHTS.EXPOSURE_BALANCE.toNumber(),
    direction: exposureScore.greaterThan('0.7') ? 'a_book' : 'neutral',
    score: exposureScore.toNumber(),
    description: exposure
      ? `Symbol exposure at ${exposure.utilization_pct.toFixed(1)}%`
      : 'No existing exposure data',
  });

  // -- Compute weighted final score -----------------------------

  const finalScore = WEIGHTS.WIN_RATE.mul(winRateScore)
    .plus(WEIGHTS.TRADE_SIZE.mul(tradeSizeNorm))
    .plus(WEIGHTS.HOLD_TIME.mul(holdTimeScore))
    .plus(WEIGHTS.NEWS_PROXIMITY.mul(newsScore))
    .plus(WEIGHTS.EXPOSURE_BALANCE.mul(exposureScore));

  // -- Determine routing mode -----------------------------------

  let recommended: RoutingDecision['recommended'];
  let splitRatio: RoutingDecision['split_ratio'];
  let confidence: number;

  if (finalScore.greaterThanOrEqualTo(THRESHOLD_A_BOOK)) {
    recommended = 'a_book';
    splitRatio = { a_book: 1, b_book: 0 };
    confidence = Decimal.min(
      finalScore.div(THRESHOLD_A_BOOK),
      new Decimal(1),
    ).toNumber();
  } else if (finalScore.lessThan(THRESHOLD_B_BOOK)) {
    recommended = 'b_book';
    splitRatio = { a_book: 0, b_book: 1 };
    confidence = new Decimal(1)
      .minus(finalScore.div(THRESHOLD_B_BOOK))
      .toNumber();
  } else {
    recommended = 'hybrid';
    const aRatio = finalScore
      .minus(THRESHOLD_B_BOOK)
      .div(THRESHOLD_A_BOOK.minus(THRESHOLD_B_BOOK));
    const bRatio = new Decimal(1).minus(aRatio);
    splitRatio = {
      a_book: parseFloat(aRatio.toFixed(4)),
      b_book: parseFloat(bRatio.toFixed(4)),
    };
    confidence = parseFloat(
      new Decimal(1)
        .minus(
          finalScore
            .minus(THRESHOLD_B_BOOK)
            .div(THRESHOLD_A_BOOK.minus(THRESHOLD_B_BOOK))
            .minus('0.5')
            .abs()
            .mul(2),
        )
        .toFixed(4),
    );
  }

  return {
    recommended,
    confidence: Math.max(0, Math.min(1, confidence)),
    split_ratio: splitRatio,
    reasons,
    risk_flags: riskFlags,
    override_allowed: true,
    hard_rule_triggered: false,
    hard_rule_name: null,
    computed_at: now.toISOString(),
  };
}

// -- Hard rule decision builder ---------------------------------

function buildHardRuleDecision(
  mode: RoutingDecision['recommended'],
  ruleName: string,
  reasons: RoutingReason[],
  riskFlags: RiskFlag[],
  description: string,
): RoutingDecision {
  reasons.push({
    factor: 'hard_rule',
    weight: 1,
    direction: mode === 'hybrid' ? 'neutral' : mode,
    score: 1,
    description,
  });

  return {
    recommended: mode,
    confidence: 1,
    split_ratio: mode === 'a_book'
      ? { a_book: 1, b_book: 0 }
      : { a_book: 0, b_book: 1 },
    reasons,
    risk_flags: riskFlags,
    override_allowed: false,
    hard_rule_triggered: true,
    hard_rule_name: ruleName,
    computed_at: new Date().toISOString(),
  };
}
