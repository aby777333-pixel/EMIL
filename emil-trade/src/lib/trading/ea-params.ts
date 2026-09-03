// ═══════════════════════════════════════════════════════════════
// Built-in EA parameter declarations. Every input listed here is READ BY
// THE ENGINE (ea-engine.ts strategies take a params map) — nothing here
// is decorative. Defaults equal the engine's historical hard-coded values,
// so an untouched EA behaves exactly as before. Overrides live in the same
// storage the EA Properties window edits (raptor_ea_input_overrides,
// keyed by the EA's library id), so uploaded and built-in EAs share one
// parameter pipeline, one .set format and one UI.
// ═══════════════════════════════════════════════════════════════

import { STRATEGY_ID_KINDS, type StrategyKind } from '@/lib/trading/ea-engine';
import { loadInputOverrides, validateInputValue, type ExtractedInput } from '@/lib/trading/custom-ea';

const int = (name: string, label: string, def: number, group: string): ExtractedInput =>
  ({ name, label, mqlType: 'int', defaultValue: String(def), group });
const dbl = (name: string, label: string, def: number, group: string): ExtractedInput =>
  ({ name, label, mqlType: 'double', defaultValue: String(def), group });

export const STRATEGY_INPUT_DECLS: Record<StrategyKind, ExtractedInput[]> = {
  ema_pullback: [
    int('FastEMA', 'Fast EMA period', 9, 'Strategy Core'),
    int('SlowEMA', 'Slow EMA period', 21, 'Strategy Core'),
  ],
  rsi_macd: [
    int('RSIPeriod', 'RSI period', 14, 'Momentum'),
    dbl('RSIMidline', 'RSI midline', 50, 'Momentum'),
    int('MACDFast', 'MACD fast EMA', 12, 'MACD'),
    int('MACDSlow', 'MACD slow EMA', 26, 'MACD'),
    int('MACDSignal', 'MACD signal period', 9, 'MACD'),
  ],
  rsi_adaptive: [
    int('RSIPeriod', 'RSI period', 14, 'Momentum'),
    int('TrendEMA', 'Trend EMA period', 50, 'Trend Filter'),
    dbl('BuyLevel', 'RSI buy level', 52, 'Momentum'),
    dbl('SellLevel', 'RSI sell level', 48, 'Momentum'),
  ],
  sar_flip: [
    dbl('SARStep', 'Parabolic SAR step', 0.02, 'SAR'),
    dbl('SARMax', 'Parabolic SAR maximum', 0.2, 'SAR'),
    int('TrendEMA', 'Trend EMA period', 50, 'Trend Filter'),
    int('RSIPeriod', 'RSI period', 14, 'Trend Filter'),
  ],
  boll_macd: [
    int('BBPeriod', 'Bollinger period', 20, 'Bands'),
    dbl('BBDeviation', 'Bollinger deviation', 2, 'Bands'),
    int('MACDFast', 'MACD fast EMA', 12, 'MACD'),
    int('MACDSlow', 'MACD slow EMA', 26, 'MACD'),
    int('MACDSignal', 'MACD signal period', 9, 'MACD'),
  ],
  trend_reversal: [
    int('FastEMA', 'Fast EMA period', 20, 'Strategy Core'),
    int('SlowEMA', 'Slow EMA period', 50, 'Strategy Core'),
  ],
  kalman: [
    int('FastEMA', 'Fast smoothing period', 3, 'Strategy Core'),
    int('SlowEMA', 'Slow smoothing period', 30, 'Strategy Core'),
  ],
  linreg: [
    int('EMAPeriod', 'Slope EMA period', 11, 'Strategy Core'),
  ],
  ichimoku: [
    int('Tenkan', 'Tenkan-sen period', 9, 'Ichimoku'),
    int('Kijun', 'Kijun-sen period', 26, 'Ichimoku'),
    int('SenkouB', 'Senkou Span B period', 52, 'Ichimoku'),
    int('Displacement', 'Displacement', 26, 'Ichimoku'),
  ],
  ssl: [
    int('ChannelPeriod', 'SSL channel period', 10, 'Strategy Core'),
  ],
  pattern: [
    int('ExtremeLookback', 'Extreme lookback (bars)', 20, 'Strategy Core'),
  ],
};

/** Resolve the engine kind for an EA: explicit kind (uploaded EAs) or the
 *  built-in library's strategyId mapping. */
function resolveKind(strategyId?: string, kind?: string): StrategyKind | undefined {
  if (kind && kind in STRATEGY_INPUT_DECLS) return kind as StrategyKind;
  return strategyId ? STRATEGY_ID_KINDS[strategyId] : undefined;
}

/** Declared inputs for an EA's engine (empty if the kind is unknown). */
export function builtinInputsFor(strategyId?: string, kind?: string): ExtractedInput[] {
  const k = resolveKind(strategyId, kind);
  return k ? STRATEGY_INPUT_DECLS[k] : [];
}

/** Effective numeric params for an engine run: declared defaults merged
 *  with the trader's valid overrides from EA Properties. Invalid or
 *  blank overrides fall back to the default — never silently to zero. */
export function effectiveEngineParams(strategyId: string, kind?: string): Record<string, number> {
  const decls = builtinInputsFor(strategyId, kind);
  if (decls.length === 0) return {};
  let overrides: Record<string, string> = {};
  try { overrides = loadInputOverrides(strategyId); } catch { /* defaults */ }
  const out: Record<string, number> = {};
  for (const d of decls) {
    const o = overrides[d.name];
    let v = Number(d.defaultValue);
    if (o !== undefined && o !== '' && validateInputValue(d, o) === null) {
      const n = Number(o);
      if (Number.isFinite(n)) v = n;
    }
    out[d.name] = v;
  }
  return out;
}
