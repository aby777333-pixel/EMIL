// ═══════════════════════════════════════════════════════════════
// NEXUS market-state classification (NEXUS super-prompt: Market State
// Detection). Rule-based, computed from REAL platform bars — every
// classification carries a confidence %, the concrete evidence behind it,
// and heuristic expected scenarios. Presented as an evidence-based
// assessment, never as certainty.
// ═══════════════════════════════════════════════════════════════

import { adx, atr, ema } from '@/lib/trading/indicators';
import type { OHLCVBar } from '@/types/trading';

export interface MarketStateAssessment {
  state: string;             // e.g. "Strong Uptrend", "Range Bound", …
  volatility: 'High Volatility' | 'Normal Volatility' | 'Low Volatility';
  confidence: number;        // 0-100, from signal agreement
  evidence: string[];        // concrete indicator readings backing the call
  scenarios: string[];       // heuristic expected paths (clearly labelled)
}

function last<T>(arr: (T | null)[]): T | null {
  for (let i = arr.length - 1; i >= 0; i--) { if (arr[i] != null) return arr[i]; }
  return null;
}

export function classifyMarketState(bars: OHLCVBar[]): MarketStateAssessment | null {
  if (bars.length < 60) return null;
  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const price = closes[closes.length - 1];

  const ema20 = last(ema(closes, 20));
  const ema50 = last(ema(closes, 50));
  const a = adx(highs, lows, closes, 14);
  const adxNow = last(a.adx);
  const plusDI = last(a.plusDI);
  const minusDI = last(a.minusDI);
  const atrSeries = atr(highs, lows, closes, 14).filter((v): v is number => v != null);
  const atrNow = atrSeries[atrSeries.length - 1];
  const atrMedian = [...atrSeries].sort((x, y) => x - y)[Math.floor(atrSeries.length / 2)];
  if (ema20 == null || ema50 == null || adxNow == null || plusDI == null || minusDI == null || atrNow == null || atrMedian == null) return null;

  const up = ema20 > ema50;
  const priceAligned = up ? price > ema20 : price < ema20;
  const diAligned = up ? plusDI > minusDI : minusDI > plusDI;
  const trending = adxNow >= 22;
  const weaklyTrending = adxNow >= 16 && adxNow < 22;

  // State
  let state: string;
  if (trending && diAligned) state = up ? 'Strong Uptrend' : 'Strong Downtrend';
  else if ((trending || weaklyTrending)) state = up ? 'Weak Uptrend' : 'Weak Downtrend';
  else state = Math.abs(ema20 - ema50) / atrNow < 0.5 ? 'Range Bound' : 'Sideways / Consolidation';

  // Volatility regime
  const volRatio = atrNow / atrMedian;
  const volatility = volRatio > 1.35 ? 'High Volatility' : volRatio < 0.75 ? 'Low Volatility' : 'Normal Volatility';

  // Confidence = agreement among the four independent signals
  const signals = [trending || weaklyTrending, diAligned, priceAligned, up === (plusDI > minusDI)];
  const agree = signals.filter(Boolean).length;
  const confidence = Math.min(95, Math.round(35 + agree * 12 + Math.min(20, adxNow - 15)));

  const dp = price < 20 ? 5 : 2;
  const evidence = [
    `ADX(14) = ${adxNow.toFixed(1)} (${trending ? 'trending' : weaklyTrending ? 'weak trend' : 'no trend'})`,
    `EMA20 ${ema20.toFixed(dp)} ${up ? '>' : '<'} EMA50 ${ema50.toFixed(dp)} (${up ? 'bullish' : 'bearish'} alignment)`,
    `Price ${price.toFixed(dp)} is ${priceAligned ? 'aligned with' : 'against'} the EMA20`,
    `+DI ${plusDI.toFixed(1)} vs -DI ${minusDI.toFixed(1)} (${diAligned ? 'confirms' : 'diverges from'} the trend read)`,
    `ATR(14) ${atrNow.toFixed(dp)} vs median ${atrMedian.toFixed(dp)} → ${volatility.toLowerCase()}`,
  ];

  const scenarios = state.includes('Uptrend')
    ? ['Continuation higher while price holds above EMA20', `Pullback toward EMA20 (${ema20.toFixed(dp)}) is the common counter-move`, 'Trend weakens if ADX rolls below ~18']
    : state.includes('Downtrend')
      ? ['Continuation lower while price holds below EMA20', `Relief bounce toward EMA20 (${ema20.toFixed(dp)}) is the common counter-move`, 'Trend weakens if ADX rolls below ~18']
      : ['Range-trading between recent swing high/low until a breakout', 'A breakout gains credibility if ADX pushes above ~22', volatility === 'Low Volatility' ? 'Volatility compression often precedes expansion' : 'Watch for failed breakouts in choppy conditions'];

  return { state, volatility, confidence, evidence, scenarios };
}

export function marketStateToText(symbol: string, timeframe: string, ms: MarketStateAssessment): string {
  return [
    `Market state for ${symbol} (${timeframe}, computed from real platform bars — heuristic assessment, not certainty):`,
    `  State: ${ms.state} · ${ms.volatility} · confidence ${ms.confidence}%`,
    `  Evidence: ${ms.evidence.join(' | ')}`,
    `  Expected scenarios (heuristic): ${ms.scenarios.join(' | ')}`,
  ].join('\n');
}
