// ═══════════════════════════════════════════════════════════════
// GIO4X RAPTOR — EA runtime
//
// Web-native execution engine for the EA library. Each attached EA
// evaluates its strategy on the platform's own OHLCV bars (the same
// data the RAPTOR chart renders) and trades through place_market_order
// / close_position — the exact path the manual BUY/SELL buttons use.
//
// Strategies are faithful web ports of each MQL5 expert's core entry
// logic (EA BACK UP JULY 2026), computed with the platform indicator
// library. Position policy: one 0.01-lot position per EA instance,
// entered on attach if the strategy has an active regime, flipped when
// the regime reverses on a closed bar, ATR-based SL/TP on every entry.
// ═══════════════════════════════════════════════════════════════

import { orderService } from './order-service';
import type { OHLCVBar } from '@/types/trading';
import type { Resolution } from './ohlcv-builder';
import {
  sma, ema, rsi, macd, bollingerBands, atr, parabolicSAR, ichimoku,
} from './indicators';

export type EARegime = 'BUY' | 'SELL' | null;

const TF_TO_RES: Record<string, Resolution> = {
  '1m': '1', '5m': '5', '15m': '15', '30m': '30', '1H': '60', '4H': '240', '1D': '1D',
};

// ─── Strategy implementations ─────────────────────────────────────
// Each receives the CLOSED bars (oldest → newest) and returns the
// regime the EA wants to be positioned in right now.

// §3 (EA parameter engine): every strategy takes an optional numeric
// parameter map. Missing keys fall back to the historical defaults, so
// behavior is IDENTICAL until a trader edits an input in EA Properties.
type Strategy = (bars: OHLCVBar[], p?: Record<string, number>) => EARegime;

const last = <T,>(arr: (T | null)[]): T | null => (arr.length ? arr[arr.length - 1] : null);

function series(bars: OHLCVBar[]) {
  return {
    closes: bars.map((b) => b.close),
    highs: bars.map((b) => b.high),
    lows: bars.map((b) => b.low),
  };
}

/**
 * Faithful 9/21 EMA pullback (EMA_Pullback_EA / Kondacheval_EA source):
 *   BUY  = uptrend(EMA9>EMA21) && low<=EMA9 && close>=EMA21 && bullish candle
 *   SELL = downtrend             && high>=EMA9 && close<=EMA21 && bearish candle
 * Falls back to the trend bias so the EA holds a position between pullbacks.
 */
const stratEmaPullback: Strategy = (bars, p) => {
  const { closes } = series(bars);
  const e9arr = ema(closes, p?.FastEMA ?? 9);
  const e21arr = ema(closes, p?.SlowEMA ?? 21);
  const i = bars.length - 1;
  const e9 = e9arr[i]; const e21 = e21arr[i];
  const b = bars[i];
  if (e9 == null || e21 == null) return null;
  const uptrend = e9 > e21;
  const downtrend = e9 < e21;
  const bullPullback = uptrend && b.low <= e9 && b.close >= e21 && b.close > b.open;
  const bearPullback = downtrend && b.high >= e9 && b.close <= e21 && b.close < b.open;
  if (bullPullback) return 'BUY';
  if (bearPullback) return 'SELL';
  // Between pullbacks, stay aligned with the EMA trend.
  if (uptrend && b.close > e21) return 'BUY';
  if (downtrend && b.close < e21) return 'SELL';
  return null;
};

/** RSI + MACD momentum (ProHybridTrendReversal source: rsi>=min && macdMain>signal). */
const stratRsiMacdMomentum: Strategy = (bars, p) => {
  const { closes } = series(bars);
  const r = last(rsi(closes, p?.RSIPeriod ?? 14));
  const m = macd(closes, p?.MACDFast ?? 12, p?.MACDSlow ?? 26, p?.MACDSignal ?? 9);
  const i = closes.length - 1;
  const line = m.macd[i]; const signal = m.signal[i];
  const mid = p?.RSIMidline ?? 50;
  if (r == null || line == null || signal == null) return null;
  if (r >= mid && line > signal) return 'BUY';
  if (r <= mid && line < signal) return 'SELL';
  return null;
};

/** RSI-driven adaptive engine (Profit Predator source: RSI bands + trend). */
const stratRsiAdaptive: Strategy = (bars, p) => {
  const { closes } = series(bars);
  const r = last(rsi(closes, p?.RSIPeriod ?? 14));
  const e50 = last(ema(closes, p?.TrendEMA ?? 50));
  const c = closes[closes.length - 1];
  if (r == null || e50 == null) return null;
  // Momentum with trend: RSI leaving the midline in the trend direction.
  if (r > (p?.BuyLevel ?? 52) && c > e50) return 'BUY';
  if (r < (p?.SellLevel ?? 48) && c < e50) return 'SELL';
  return null;
};

/** Parabolic SAR flip confirmed by EMA trend + RSI (Naughty Girl, SAR VI). */
const stratSarFlip: Strategy = (bars, p) => {
  const { closes, highs, lows } = series(bars);
  const sar = last(parabolicSAR(highs, lows, p?.SARStep ?? 0.02, p?.SARMax ?? 0.2));
  const e50 = last(ema(closes, p?.TrendEMA ?? 50));
  const r = last(rsi(closes, p?.RSIPeriod ?? 14));
  const c = closes[closes.length - 1];
  if (sar == null || e50 == null || r == null) return null;
  if (sar < c && c > e50 && r > 48) return 'BUY';
  if (sar > c && c < e50 && r < 52) return 'SELL';
  return null;
};

/** Bollinger band + MACD confluence, mean-reversion (BOLCD). */
const stratBollMacd: Strategy = (bars, p) => {
  const { closes } = series(bars);
  const bb = bollingerBands(closes, p?.BBPeriod ?? 20, p?.BBDeviation ?? 2);
  const m = macd(closes, p?.MACDFast ?? 12, p?.MACDSlow ?? 26, p?.MACDSignal ?? 9);
  const i = closes.length - 1;
  const lower = bb.lower[i]; const upper = bb.upper[i]; const mid = bb.middle[i];
  const h = m.histogram[i]; const hPrev = m.histogram[i - 1];
  const c = closes[i];
  if (lower == null || upper == null || mid == null || h == null || hPrev == null) return null;
  if (c <= lower * 1.001 && h > hPrev) return 'BUY';
  if (c >= upper * 0.999 && h < hPrev) return 'SELL';
  // exit zone: middle band — no directional edge
  return null;
};

/** EMA 20/50 regime flip (Bad Boy, Gentleman, Pro Hybrid, Paruthiveeran, Walter Vetrivel). */
const stratTrendReversal: Strategy = (bars, p) => {
  const { closes } = series(bars);
  const e20 = last(ema(closes, p?.FastEMA ?? 20));
  const e50 = last(ema(closes, p?.SlowEMA ?? 50));
  if (e20 == null || e50 == null) return null;
  if (e20 > e50) return 'BUY';
  if (e20 < e50) return 'SELL';
  return null;
};

/** Fast/slow smoothing crossover, Kalman-style (BLUEBIRD, Karakattakaran, Padayappa). */
const stratKalmanTrend: Strategy = (bars, p) => {
  const { closes } = series(bars);
  const fast = last(ema(closes, p?.FastEMA ?? 3));
  const slow = last(ema(closes, p?.SlowEMA ?? 30));
  if (fast == null || slow == null) return null;
  if (fast > slow) return 'BUY';
  if (fast < slow) return 'SELL';
  return null;
};

/** LinReg-candle colour ≈ short EMA slope (GIOLINEREG, Linegration V1/V2). */
const stratLinReg: Strategy = (bars, p) => {
  const { closes } = series(bars);
  const e = ema(closes, p?.EMAPeriod ?? 11);
  const cur = e[e.length - 1]; const prev = e[e.length - 2];
  if (cur == null || prev == null) return null;
  if (cur > prev) return 'BUY';
  if (cur < prev) return 'SELL';
  return null;
};

/** Ichimoku cloud + TK cross (Ichimokuthadi, SuperIchi, SuperIchi Annamalai). */
const stratIchimoku: Strategy = (bars, p) => {
  const { closes, highs, lows } = series(bars);
  const ic = ichimoku(highs, lows, closes, p?.Tenkan ?? 9, p?.Kijun ?? 26, p?.SenkouB ?? 52, p?.Displacement ?? 26);
  const i = closes.length - 1;
  const conv = ic.conversion[i]; const base = ic.base[i];
  const spanA = ic.spanA[i]; const spanB = ic.spanB[i];
  const c = closes[i];
  if (conv == null || base == null || spanA == null || spanB == null) return null;
  const cloudTop = Math.max(spanA, spanB);
  const cloudBot = Math.min(spanA, spanB);
  if (c > cloudTop && conv > base) return 'BUY';
  if (c < cloudBot && conv < base) return 'SELL';
  return null;
};

/** SSL channel flip (SSL Hybrid, LNL GIO, Gulliver). */
const stratSslChannel: Strategy = (bars, p) => {
  const { closes, highs, lows } = series(bars);
  const hi = last(sma(highs, p?.ChannelPeriod ?? 10));
  const lo = last(sma(lows, p?.ChannelPeriod ?? 10));
  const c = closes[closes.length - 1];
  if (hi == null || lo == null) return null;
  if (c > hi) return 'BUY';
  if (c < lo) return 'SELL';
  return null;
};

/** Engulfing pattern at N-bar extremes (Pattern GIO, Fibonacci Bands). */
const stratPattern: Strategy = (bars, p) => {
  const lookback = Math.max(5, Math.round(p?.ExtremeLookback ?? 20));
  if (bars.length < lookback + 2) return null;
  const cur = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const window = bars.slice(-(lookback + 1), -1);
  const winHigh = Math.max(...window.map((b) => b.high));
  const winLow = Math.min(...window.map((b) => b.low));
  const bullishEngulf = cur.close > cur.open && prev.close < prev.open && cur.close > prev.open && cur.open < prev.close;
  const bearishEngulf = cur.close < cur.open && prev.close > prev.open && cur.close < prev.open && cur.open > prev.close;
  if (bullishEngulf && cur.low <= winLow * 1.001) return 'BUY';
  if (bearishEngulf && cur.high >= winHigh * 0.999) return 'SELL';
  return null;
};

// Named strategy kinds — used to run uploaded/custom EAs after the
// MQL5 source is mapped to the closest platform engine (see custom-ea.ts).
export type StrategyKind =
  | 'ema_pullback' | 'sar_flip' | 'boll_macd' | 'trend_reversal'
  | 'kalman' | 'linreg' | 'ichimoku' | 'ssl' | 'pattern'
  | 'rsi_macd' | 'rsi_adaptive';

export const STRATEGY_KINDS: Record<StrategyKind, Strategy> = {
  ema_pullback: stratEmaPullback,
  sar_flip: stratSarFlip,
  boll_macd: stratBollMacd,
  trend_reversal: stratTrendReversal,
  kalman: stratKalmanTrend,
  linreg: stratLinReg,
  ichimoku: stratIchimoku,
  ssl: stratSslChannel,
  pattern: stratPattern,
  rsi_macd: stratRsiMacdMomentum,
  rsi_adaptive: stratRsiAdaptive,
};

// strategyId (EA_LIBRARY id) → strategy
const STRATEGIES: Record<string, Strategy> = {
  '1da5f188-c659-4843-b91d-4fdc003002dc': stratTrendReversal, // Bad Boy v3.0
  '24fa1777-47b0-48bd-af9a-2044d1010a70': stratKalmanTrend,   // BLUEBIRD
  'f689e46f-b6b2-4be8-9ed8-978ef2147d4e': stratBollMacd,      // BOLCD v1.0
  'c11d80f8-c68a-42fc-8ada-04055df910a4': stratEmaPullback,   // EMA Pullback
  'b042aa5e-3cec-44c3-914d-ccae0bc4740c': stratPattern,       // Fibonacci Bands
  '7a5eb3b5-ff39-4559-a057-050386a820f0': stratTrendReversal, // Gentleman
  '3fcc4545-7c16-497b-bed1-f6afc0d18f37': stratLinReg,        // GIOLINEREG V1
  '2d99660e-4168-4457-bc2d-5f121bd02a62': stratSslChannel,    // Gulliver
  'bf858c10-157f-40f1-915a-ceb23d6d162e': stratIchimoku,      // Ichimokuthadi
  '88bbb135-579c-418c-8795-23f6970b306b': stratKalmanTrend,   // Karakattakaran
  '1a2a7591-b872-489e-afe9-ecae05f676d9': stratEmaPullback,   // Kondacheval v1.1
  'a1cc822a-87d9-4c24-9735-8311402b3601': stratLinReg,        // Linegration V-02
  'c6dd62fa-6d15-4d8e-b577-f93642e75b0a': stratLinReg,        // Linegration V-01
  '05b87485-7f6f-46f4-b522-8f51fc90f704': stratSslChannel,    // LNL GIO
  'fd4b518d-c248-4889-92a5-c50394556571': stratSarFlip,       // Naughty Girl v1.1
  'be1030dc-47fa-4b9a-a176-8368ff8332f5': stratKalmanTrend,   // Padayappa
  '8717afe9-36dd-4ada-824d-07f2fed0c9eb': stratTrendReversal, // Paruthiveeran (LinReg+Kalman+ADX)
  '6fb4b3e9-20e4-45cd-b3e8-911d01036a14': stratPattern,       // Pattern GIO
  'd85d1178-de66-4ed4-8349-39a98c5edc7d': stratRsiAdaptive,   // Profit Predator v1.0 (RSI+stoch)
  '8cd15b06-2e6c-4e40-bbe8-1c33e7471bbf': stratRsiMacdMomentum, // Pro Hybrid (RSI+MACD)
  '5792de3d-317f-4fb3-a6f0-b69f7b47be71': stratSarFlip,       // SAR VI v1.1
  '2c83500d-ffa7-4a28-9f0e-deaa07fcd347': stratSslChannel,    // SSL Hybrid
  'bbaec02d-b5e9-45c0-a44a-e91433a120d9': stratIchimoku,      // SuperIchi Annamalai
  '7e6cedd9-6e9f-4a33-b2b6-838c647edff2': stratIchimoku,      // SuperIchi
  '8be4d74d-e25d-4a9e-b596-66c7d226cb3a': stratTrendReversal, // Walter Vetrivel
};

// strategyId → StrategyKind (same table as STRATEGIES) so the parameter
// layer can declare/resolve the engine inputs for built-in EAs.
export const STRATEGY_ID_KINDS: Record<string, StrategyKind> = {
  '1da5f188-c659-4843-b91d-4fdc003002dc': 'trend_reversal',
  '24fa1777-47b0-48bd-af9a-2044d1010a70': 'kalman',
  'f689e46f-b6b2-4be8-9ed8-978ef2147d4e': 'boll_macd',
  'c11d80f8-c68a-42fc-8ada-04055df910a4': 'ema_pullback',
  'b042aa5e-3cec-44c3-914d-ccae0bc4740c': 'pattern',
  '7a5eb3b5-ff39-4559-a057-050386a820f0': 'trend_reversal',
  '3fcc4545-7c16-497b-bed1-f6afc0d18f37': 'linreg',
  '2d99660e-4168-4457-bc2d-5f121bd02a62': 'ssl',
  'bf858c10-157f-40f1-915a-ceb23d6d162e': 'ichimoku',
  '88bbb135-579c-418c-8795-23f6970b306b': 'kalman',
  '1a2a7591-b872-489e-afe9-ecae05f676d9': 'ema_pullback',
  'a1cc822a-87d9-4c24-9735-8311402b3601': 'linreg',
  'c6dd62fa-6d15-4d8e-b577-f93642e75b0a': 'linreg',
  '05b87485-7f6f-46f4-b522-8f51fc90f704': 'ssl',
  'fd4b518d-c248-4889-92a5-c50394556571': 'sar_flip',
  'be1030dc-47fa-4b9a-a176-8368ff8332f5': 'kalman',
  '8717afe9-36dd-4ada-824d-07f2fed0c9eb': 'trend_reversal',
  '6fb4b3e9-20e4-45cd-b3e8-911d01036a14': 'pattern',
  'd85d1178-de66-4ed4-8349-39a98c5edc7d': 'rsi_adaptive',
  '8cd15b06-2e6c-4e40-bbe8-1c33e7471bbf': 'rsi_macd',
  '5792de3d-317f-4fb3-a6f0-b69f7b47be71': 'sar_flip',
  '2c83500d-ffa7-4a28-9f0e-deaa07fcd347': 'ssl',
  'bbaec02d-b5e9-45c0-a44a-e91433a120d9': 'ichimoku',
  '7e6cedd9-6e9f-4a33-b2b6-838c647edff2': 'ichimoku',
  '8be4d74d-e25d-4a9e-b596-66c7d226cb3a': 'trend_reversal',
};

// ─── Runtime ──────────────────────────────────────────────────────

export interface EAStats {
  trades: number;
  direction: EARegime;
  lastAction: string;
}

// Full per-EA diagnostics snapshot (§9 / §14).
export interface EAInfo {
  key: string;
  name: string;
  symbol: string;
  timeframe: string;
  enabled: boolean;
  trades: number;
  direction: EARegime;
  hasPosition: boolean;
  magic: number;
  lastBarTime: number;
}

// Editable EA settings (subset the web runtime honors on execution). Additional
// fields (risk caps, notifications, logging) are persisted per-EA in the UI.
export interface EASettings {
  lot: number;            // fixed lot size per entry
  slAtrMult: number;      // stop-loss = slAtrMult × ATR(14)
  tpAtrMult: number;      // take-profit = tpAtrMult × ATR(14)
  direction: 'both' | 'long' | 'short';  // trade direction filter
}

export const DEFAULT_EA_SETTINGS: EASettings = { lot: 0.01, slAtrMult: 2, tpAtrMult: 3, direction: 'both' };

// Stable 6-digit "magic number" derived from the instance key (MT5-style).
function magicFromKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (Math.abs(h) % 900000) + 100000;
}

interface InstanceState {
  key: string;
  strategyId: string;
  strategyKind?: StrategyKind;
  name: string;
  symbol: string;
  resolution: Resolution;
  lastBarTime: number;
  positionId: string | null;
  direction: EARegime;
  trades: number;
  busy: boolean;
  enabled: boolean;   // per-EA on/off, independent of the global Algo switch
  settings: EASettings;
}

export interface EARuntimeDeps {
  getBars: (symbol: string, resolution: Resolution) => OHLCVBar[];
  getTick: (symbol: string) => { bid: number; ask: number } | undefined;
  getAccountId: () => string | null;
  onStats: (key: string, stats: EAStats) => void;
  onRefresh: () => void;
  /** Effective engine parameters for a strategy instance (EA Properties
   *  overrides). Optional — absent means the declared defaults. */
  getParams?: (strategyId: string, kind?: StrategyKind) => Record<string, number>;
}

// Default lot lives in DEFAULT_EA_SETTINGS; per-EA lot is read from inst.settings.

export class EARuntime {
  private instances = new Map<string, InstanceState>();
  // Global Algo Trading switch. When OFF, no EA evaluation or automated orders
  // occur (OnTick pauses); manual trading via the order ticket is unaffected.
  private globalEnabled = true;

  constructor(private deps: EARuntimeDeps) {}

  isGlobalEnabled(): boolean {
    return this.globalEnabled;
  }

  setGlobalEnabled(on: boolean) {
    this.globalEnabled = on;
  }

  has(key: string): boolean {
    return this.instances.has(key);
  }

  keys(): string[] {
    return Array.from(this.instances.keys());
  }

  attach(key: string, strategyId: string, name: string, symbol: string, timeframes: string[], strategyKind?: StrategyKind) {
    if (this.instances.has(key)) return;
    // Trade the EA's shortest timeframe so activity is visible quickly.
    const tf = [...(timeframes ?? [])].sort(
      (a, b) => (Object.keys(TF_TO_RES).indexOf(a)) - (Object.keys(TF_TO_RES).indexOf(b))
    )[0];
    const resolution = TF_TO_RES[tf] ?? '15';
    const inst: InstanceState = {
      key, strategyId, strategyKind, name, symbol, resolution,
      lastBarTime: 0, positionId: null, direction: null, trades: 0, busy: false, enabled: true,
      settings: { ...DEFAULT_EA_SETTINGS },
    };
    this.instances.set(key, inst);
    // Enter immediately if the strategy already has an active regime — but only
    // when Algo Trading is globally enabled AND this EA is enabled.
    if (this.globalEnabled && inst.enabled) void this.evaluate(inst, true);
  }

  isInstanceEnabled(key: string): boolean {
    return this.instances.get(key)?.enabled ?? false;
  }

  setInstanceEnabled(key: string, on: boolean) {
    const inst = this.instances.get(key);
    if (!inst) return;
    inst.enabled = on;
    if (on && this.globalEnabled) void this.evaluate(inst, true);
  }

  // Restart an EA: reset its evaluation state so it re-scans from scratch and
  // re-enters on the next signal. The open position (if any) is kept and gets
  // managed/flipped by the strategy on the next evaluation.
  restart(key: string) {
    const inst = this.instances.get(key);
    if (!inst) return;
    inst.lastBarTime = 0;
    inst.direction = null;
    inst.trades = 0;
    inst.busy = false;
    if (this.globalEnabled && inst.enabled) void this.evaluate(inst, true);
  }

  getInstanceSettings(key: string): EASettings | null {
    const inst = this.instances.get(key);
    return inst ? { ...inst.settings } : null;
  }

  setInstanceSettings(key: string, settings: EASettings) {
    const inst = this.instances.get(key);
    if (inst) inst.settings = { ...settings };
  }

  getInstanceInfo(key: string): EAInfo | null {
    const inst = this.instances.get(key);
    if (!inst) return null;
    return {
      key: inst.key, name: inst.name, symbol: inst.symbol, timeframe: inst.resolution,
      enabled: inst.enabled, trades: inst.trades, direction: inst.direction,
      hasPosition: !!inst.positionId, magic: magicFromKey(inst.key), lastBarTime: inst.lastBarTime,
    };
  }

  detach(key: string) {
    this.instances.delete(key);
  }

  detachAll() {
    this.instances.clear();
  }

  /** Call on every price tick; evaluates instances whose bar closed. */
  onTick() {
    // Global Algo Trading OFF → pause all automated evaluation/orders.
    if (!this.globalEnabled) return;
    for (const inst of this.instances.values()) {
      if (!inst.enabled) continue; // per-EA switch is OFF
      void this.evaluate(inst, false);
    }
  }

  private closedBars(inst: InstanceState): OHLCVBar[] {
    const all = this.deps.getBars(inst.symbol, inst.resolution);
    // getAllBars includes the in-progress bar — evaluate on closed bars only.
    return all.length > 1 ? all.slice(0, -1) : [];
  }

  private async evaluate(inst: InstanceState, initial: boolean) {
    if (inst.busy) return;
    const bars = this.closedBars(inst);
    if (bars.length < 60) return;
    const newestClosed = bars[bars.length - 1].time;
    if (!initial && newestClosed <= inst.lastBarTime) return; // no new closed bar yet
    inst.lastBarTime = newestClosed;

    // Built-in EA → mapped strategy; uploaded EA → its detected kind.
    const strategy =
      STRATEGIES[inst.strategyId] ??
      (inst.strategyKind ? STRATEGY_KINDS[inst.strategyKind] : undefined) ??
      stratTrendReversal;
    const regime = strategy(bars, this.deps.getParams?.(inst.strategyId, inst.strategyKind));
    if (regime === null || regime === inst.direction) return;
    // Direction filter (Long only / Short only / Long & Short).
    if (inst.settings.direction === 'long' && regime === 'SELL') return;
    if (inst.settings.direction === 'short' && regime === 'BUY') return;

    inst.busy = true;
    try {
      const accountId = this.deps.getAccountId();
      const tick = this.deps.getTick(inst.symbol);
      if (!accountId || !tick) return;

      // Flip: close the opposing position first.
      if (inst.positionId) {
        const closePrice = inst.direction === 'BUY' ? tick.bid : tick.ask;
        try { await orderService.closePosition(inst.positionId, closePrice); } catch { /* may already be closed by SL/TP */ }
        inst.positionId = null;
        inst.direction = null;
      }

      // ATR-based protective levels.
      const { highs, lows, closes } = {
        highs: bars.map((b) => b.high), lows: bars.map((b) => b.low), closes: bars.map((b) => b.close),
      };
      const atrArr = atr(highs, lows, closes, 14);
      const a = atrArr[atrArr.length - 1] ?? 0;
      const { slAtrMult, tpAtrMult, lot } = inst.settings;
      const fillPrice = regime === 'BUY' ? tick.ask : tick.bid;
      const sl = a > 0 ? (regime === 'BUY' ? fillPrice - slAtrMult * a : fillPrice + slAtrMult * a) : undefined;
      const tp = a > 0 ? (regime === 'BUY' ? fillPrice + tpAtrMult * a : fillPrice - tpAtrMult * a) : undefined;

      let result: { success?: boolean; position_id?: string } | null = null;
      try {
        result = await orderService.placeMarketOrder({
          accountId,
          symbol: inst.symbol,
          direction: regime,
          size: lot,
          sl, tp,
          fillPrice,
          comment: `EA:${inst.name}`,
        }) as { success?: boolean; position_id?: string } | null;
      } catch (err) {
        // Order rejected (Shield protection rule or broker-side control) —
        // surface it on the EA chip instead of an unhandled rejection.
        this.deps.onStats(inst.key, {
          trades: inst.trades,
          direction: inst.direction,
          lastAction: `Order blocked: ${err instanceof Error ? err.message.slice(0, 120) : 'rejected'}`,
        });
        return;
      }

      if (result?.success && result.position_id) {
        inst.positionId = result.position_id;
        inst.direction = regime;
        inst.trades += 1;
        this.deps.onStats(inst.key, {
          trades: inst.trades,
          direction: regime,
          lastAction: `${regime} ${lot} ${inst.symbol}`,
        });
        this.deps.onRefresh();
      }
    } finally {
      inst.busy = false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Strategy Tester (§11) — bar-level backtest of an EA's strategy over
// historical bars. Reuses the SAME strategy functions the live runtime uses,
// so the tester reflects real entry/exit logic. Entries flip on opposite
// signals; ATR-scaled SL/TP (from the EA's settings) close intrabar. Returns
// are computed per trade (asset-agnostic %), then a fixed-notional equity curve.
// ═══════════════════════════════════════════════════════════════

export interface BTTrade {
  entryTime: number; exitTime: number; direction: 'BUY' | 'SELL';
  entry: number; exit: number; retPct: number; pnl: number; reason: string;
}

export interface BacktestResult {
  trades: BTTrade[];
  equity: number[];
  barsTested: number;
  netProfit: number; grossProfit: number; grossLoss: number; profitFactor: number;
  maxDrawdownPct: number; winRate: number; numTrades: number; wins: number; losses: number;
  avgTradePct: number; largestWinPct: number; largestLossPct: number;
  sharpe: number; expectancy: number;
}

const BT_NOTIONAL = 10000; // fixed notional per trade for P&L in $

export function backtestStrategy(
  bars: OHLCVBar[],
  strategyId: string,
  strategyKind: StrategyKind | undefined,
  settings: EASettings,
  params?: Record<string, number>,
): BacktestResult {
  const strat = STRATEGIES[strategyId] ?? (strategyKind ? STRATEGY_KINDS[strategyKind] : undefined) ?? stratTrendReversal;
  const START = 60;
  const trades: BTTrade[] = [];
  const highs = bars.map((b) => b.high), lows = bars.map((b) => b.low), closes = bars.map((b) => b.close);
  const atrArr = atr(highs, lows, closes, 14);

  let pos: { dir: 'BUY' | 'SELL'; entry: number; entryTime: number; sl: number | null; tp: number | null } | null = null;
  const close = (exit: number, time: number, reason: string) => {
    if (!pos) return;
    const ret = ((exit - pos.entry) / pos.entry) * (pos.dir === 'BUY' ? 1 : -1);
    trades.push({ entryTime: pos.entryTime, exitTime: time, direction: pos.dir, entry: pos.entry, exit, retPct: ret * 100, pnl: ret * BT_NOTIONAL, reason });
    pos = null;
  };

  for (let i = START; i < bars.length; i++) {
    const bar = bars[i];
    // Intrabar SL/TP on the open position.
    if (pos) {
      if (pos.dir === 'BUY') {
        if (pos.sl != null && bar.low <= pos.sl) close(pos.sl, bar.time, 'SL');
        else if (pos.tp != null && bar.high >= pos.tp) close(pos.tp, bar.time, 'TP');
      } else {
        if (pos.sl != null && bar.high >= pos.sl) close(pos.sl, bar.time, 'SL');
        else if (pos.tp != null && bar.low <= pos.tp) close(pos.tp, bar.time, 'TP');
      }
    }
    const regime = strat(bars.slice(0, i + 1), params);
    if (regime === null) continue;
    if (settings.direction === 'long' && regime === 'SELL') continue;
    if (settings.direction === 'short' && regime === 'BUY') continue;
    if (!pos || pos.dir !== regime) {
      if (pos) close(bar.close, bar.time, 'flip');
      const a = atrArr[i] ?? 0;
      const entry = bar.close;
      pos = {
        dir: regime, entry, entryTime: bar.time,
        sl: a > 0 ? (regime === 'BUY' ? entry - settings.slAtrMult * a : entry + settings.slAtrMult * a) : null,
        tp: a > 0 ? (regime === 'BUY' ? entry + settings.tpAtrMult * a : entry - settings.tpAtrMult * a) : null,
      };
    }
  }
  if (pos && bars.length) close(bars[bars.length - 1].close, bars[bars.length - 1].time, 'end');

  // Metrics
  const rets = trades.map((t) => t.retPct);
  const pnls = trades.map((t) => t.pnl);
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const netProfit = grossProfit - grossLoss;
  const equity: number[] = [BT_NOTIONAL];
  let eq = BT_NOTIONAL, peak = BT_NOTIONAL, maxDD = 0;
  for (const p of pnls) { eq += p; equity.push(eq); peak = Math.max(peak, eq); maxDD = Math.max(maxDD, (peak - eq) / peak); }
  const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
  const variance = rets.length ? rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length : 0;
  const std = Math.sqrt(variance);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    trades, equity, barsTested: bars.length,
    netProfit: round2(netProfit), grossProfit: round2(grossProfit), grossLoss: round2(grossLoss),
    profitFactor: grossLoss > 0 ? round2(grossProfit / grossLoss) : (grossProfit > 0 ? 999 : 0),
    maxDrawdownPct: round2(maxDD * 100),
    winRate: trades.length ? round2((wins.length / trades.length) * 100) : 0,
    numTrades: trades.length, wins: wins.length, losses: losses.length,
    avgTradePct: round2(mean),
    largestWinPct: round2(Math.max(0, ...rets)),
    largestLossPct: round2(Math.min(0, ...rets)),
    sharpe: std > 0 ? round2((mean / std) * Math.sqrt(Math.max(rets.length, 1))) : 0,
    expectancy: round2(pnls.length ? netProfit / pnls.length : 0),
  };
}
