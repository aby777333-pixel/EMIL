// ═══════════════════════════════════════════════════════════════
// EMIL Global Macro Intelligence — honest edition.
// Everything here is computed from data the platform actually has:
// real bars/ticks across the instrument universe and the real economic
// calendar. Risk mood, scenario probabilities, uncertainty and event
// guidance are ESTIMATES with evidence attached; forecast confidence
// decays automatically as uncertainty rises; "No Trade" is always a
// valid output. External macro feeds (CPI/GDP vendors, geopolitical
// news, COT, per-exchange data) are future phases — never faked here.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { classifyMarketState } from '@/lib/nexus/market-state';
import { atr } from '@/lib/trading/indicators';
import { getPipSize } from '@/lib/trading/ticket-math';
import { symbolCurrencies } from '@/lib/trading/protection';
import { upcomingHighImpact, type NewsEvent } from '@/lib/trading/news-guard';

// ── Risk-on / Risk-off mood (real cross-asset 24h returns) ──────

const RISK_ASSETS = ['US30', 'NAS100', 'SPX500', 'BTCUSD', 'ETHUSD', 'AUDUSD', 'NZDUSD'];
const SAFE_HAVENS = ['XAUUSD', 'USDCHF', 'USDJPY']; // havens strengthen risk-off (USD/JPY falls risk-off → invert)

export interface RiskMood { score: number; label: string; color: string; evidence: string[] }

function ret24h(builder: OHLCVBuilder, symbol: string): number | null {
  const bars = builder.getAllBars(symbol, '60');
  if (bars.length < 25) return null;
  const ref = bars[bars.length - 25].close;
  return ref > 0 ? ((bars[bars.length - 1].close - ref) / ref) * 100 : null;
}

export function riskMood(builder: OHLCVBuilder): RiskMood {
  const evidence: string[] = [];
  let riskSum = 0; let riskN = 0;
  for (const s of RISK_ASSETS) {
    const r = ret24h(builder, s);
    if (r != null) { riskSum += r; riskN++; }
  }
  let havenSum = 0; let havenN = 0;
  for (const s of SAFE_HAVENS) {
    const r = ret24h(builder, s);
    if (r == null) continue;
    // Gold up = risk-off; USDJPY down (yen strength) = risk-off → invert JPY/CHF pairs.
    havenSum += s === 'XAUUSD' ? r : -r;
    havenN++;
  }
  const riskAvg = riskN ? riskSum / riskN : 0;
  const havenAvg = havenN ? havenSum / havenN : 0;
  const score = Math.max(-100, Math.min(100, Math.round((riskAvg - havenAvg) * 25)));
  evidence.push(`risk assets 24h avg ${riskAvg >= 0 ? '+' : ''}${riskAvg.toFixed(2)}% (${riskN} instruments)`);
  evidence.push(`safe havens 24h avg ${havenAvg >= 0 ? '+' : ''}${havenAvg.toFixed(2)}% (gold + yen/franc strength, ${havenN} reads)`);
  const label = score >= 30 ? 'RISK-ON' : score <= -30 ? 'RISK-OFF' : 'MIXED';
  const color = score >= 30 ? '#00C27A' : score <= -30 ? '#FF5252' : '#FFB300';
  return { score, label, color, evidence };
}

// ── Uncertainty detection (spread, vol spike, TF conflict, news) ─

export interface UncertaintyRead { score: number; level: 'LOW' | 'ELEVATED' | 'HIGH'; reasons: string[] }

export function uncertaintyScore(
  builder: OHLCVBuilder,
  symbol: string,
  tick: { bid?: number; ask?: number } | undefined,
  calendar: NewsEvent[],
): UncertaintyRead {
  const reasons: string[] = [];
  let pts = 0;

  // Volatility spike: current H1 ATR vs its median.
  const bars = builder.getAllBars(symbol, '60');
  if (bars.length >= 40) {
    const series = atr(bars.map((b) => b.high), bars.map((b) => b.low), bars.map((b) => b.close), 14).filter((v): v is number => v != null);
    const now = series[series.length - 1];
    const median = [...series].sort((a, b) => a - b)[Math.floor(series.length / 2)];
    if (now && median && now / median > 1.6) { pts += 30; reasons.push(`volatility spike: ATR ${(now / median).toFixed(1)}× its median`); }
  }

  // Spread stress vs a rough pip baseline.
  if (tick?.bid != null && tick?.ask != null) {
    const spreadPips = (tick.ask - tick.bid) / getPipSize(symbol);
    if (spreadPips > 6) { pts += 25; reasons.push(`spread stress: ${spreadPips.toFixed(1)} pips`); }
  } else {
    pts += 20; reasons.push('no live quote — stale or missing pricing');
  }

  // Multi-timeframe conflict: H1 vs H4 regime disagreement.
  const h1 = classifyMarketState(bars);
  const h4 = classifyMarketState(builder.getAllBars(symbol, '240'));
  if (h1 && h4) {
    const dir = (s: string) => (s.includes('Uptrend') ? 1 : s.includes('Downtrend') ? -1 : 0);
    if (dir(h1.state) !== 0 && dir(h4.state) !== 0 && dir(h1.state) !== dir(h4.state)) {
      pts += 25; reasons.push(`timeframe conflict: H1 ${h1.state} vs H4 ${h4.state}`);
    }
  }

  // Imminent high-impact news on this symbol's currencies.
  const ev = upcomingHighImpact(symbolCurrencies(symbol), calendar, 1)[0];
  if (ev) {
    const mins = Math.round((ev.timeMs - Date.now()) / 60_000);
    pts += mins <= 30 ? 30 : 15;
    reasons.push(`${ev.currency} "${ev.title}" in ${mins} min — event risk`);
  }

  const score = Math.min(100, pts);
  if (!reasons.length) reasons.push('conditions look orderly: normal volatility, tight spread, aligned timeframes, no imminent red-flag events');
  return { score, level: score >= 60 ? 'HIGH' : score >= 35 ? 'ELEVATED' : 'LOW', reasons };
}

// ── Probabilistic forecast (never certainty) ────────────────────

export interface Scenario { name: string; probability: number; note: string }

export interface ForecastRead {
  symbol: string;
  scenarios: Scenario[];
  confidence: number;         // decays with uncertainty
  evidenceFor: string[];
  evidenceAgainst: string[];
  invalidation: string;
  horizon: string;
  uncertainty: UncertaintyRead;
}

export function forecastScenarios(
  builder: OHLCVBuilder,
  symbol: string,
  tick: { bid?: number; ask?: number } | undefined,
  calendar: NewsEvent[],
): ForecastRead | null {
  const bars = builder.getAllBars(symbol, '60');
  const state = classifyMarketState(bars);
  if (!state) return null;
  const unc = uncertaintyScore(builder, symbol, tick, calendar);

  const trendingUp = state.state.includes('Uptrend');
  const trendingDown = state.state.includes('Downtrend');
  const strong = state.state.includes('Strong');

  let scenarios: Scenario[];
  if (trendingUp || trendingDown) {
    const cont = Math.round(Math.min(72, 34 + state.confidence * 0.38 + (strong ? 6 : 0)));
    const rev = Math.round(Math.max(10, 30 - state.confidence * 0.14));
    const cons = Math.max(5, 100 - cont - rev);
    scenarios = [
      { name: trendingUp ? 'Bullish continuation' : 'Bearish continuation', probability: cont, note: `${state.state} holds while price respects the EMA20 structure` },
      { name: 'Neutral consolidation', probability: cons, note: 'trend pauses into a range; ADX rolls over' },
      { name: trendingUp ? 'Bearish reversal' : 'Bullish reversal', probability: rev, note: 'structure break beyond the pullback zone flips the regime' },
    ];
  } else {
    scenarios = [
      { name: 'Range continuation', probability: 55, note: `${state.state} persists between recent swing extremes` },
      { name: 'Breakout up', probability: 23, note: 'credible only if ADX pushes above ~22 with expansion' },
      { name: 'Breakout down', probability: 22, note: 'credible only if ADX pushes above ~22 with expansion' },
    ];
  }

  // Confidence decays automatically as uncertainty rises (§10/§11).
  const confidence = Math.max(15, Math.round(state.confidence * (1 - unc.score / 140)));

  const price = bars[bars.length - 1].close;
  const dp = price < 20 ? 5 : 2;

  return {
    symbol,
    scenarios,
    confidence,
    evidenceFor: state.evidence.slice(0, 3),
    evidenceAgainst: unc.reasons.filter((r) => !r.startsWith('conditions look orderly')),
    invalidation: trendingUp || trendingDown
      ? `H1 close beyond the pullback structure (~${(trendingUp ? price * 0.995 : price * 1.005).toFixed(dp)} zone) flips the primary scenario`
      : 'a confirmed close outside the range extremes with ADX > 22 invalidates the range scenario',
    horizon: 'hours to a few sessions (H1 basis) — probabilities drift as new bars arrive',
    uncertainty: unc,
  };
}

// ── Market Mood (deterministic mapping over regime + vol + uncertainty) ──

export interface MoodRead { label: string; color: string; note: string }

export function marketMood(builder: OHLCVBuilder, symbol: string, tick: { bid?: number; ask?: number } | undefined, calendar: NewsEvent[]): MoodRead {
  const bars = builder.getAllBars(symbol, '60');
  const state = classifyMarketState(bars);
  const unc = uncertaintyScore(builder, symbol, tick, calendar);
  if (!state) return { label: 'Unreadable', color: '#8B93A7', note: 'not enough data to read the mood' };
  if (unc.level === 'HIGH') return { label: 'Chaotic', color: '#FF5252', note: unc.reasons[0] };
  if (unc.level === 'ELEVATED') return { label: 'Nervous', color: '#FFB300', note: unc.reasons[0] };
  const strong = state.state.includes('Strong');
  const trending = state.state.includes('trend') || state.state.includes('Uptrend') || state.state.includes('Downtrend');
  if (strong && state.volatility === 'High Volatility') return { label: 'Aggressive', color: '#FF7043', note: `${state.state} with expanded ranges` };
  if (strong) return { label: 'Expansion', color: '#00C27A', note: `${state.state}, orderly momentum` };
  if (trending && state.state.includes('Weak')) return { label: state.volatility === 'High Volatility' ? 'Exhausted' : 'Recovering', color: '#9CCC65', note: `${state.state}` };
  if (state.volatility === 'Low Volatility') return { label: 'Compression', color: '#29ABE2', note: 'coiled range — expansion often follows' };
  return { label: 'Calm', color: '#00BFA5', note: `${state.state}, contained volatility` };
}

// ── Economic event guidance (§3) — heuristics, labelled as such ──

export interface EventGuidance {
  ev: NewsEvent;
  impactNote: string;
  waitMin: number;
}

export function eventGuidance(currencies: string[], calendar: NewsEvent[], hours = 24): EventGuidance[] {
  return upcomingHighImpact(currencies, calendar, hours).slice(0, 5).map((ev) => ({
    ev,
    impactNote: 'high impact: expect a volatility burst, spread widening and elevated false-breakout risk around the release (historical tendency, not a certainty)',
    waitMin: 15,
  }));
}
