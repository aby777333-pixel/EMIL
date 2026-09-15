/**
 * The strategy engines the EMIL universe can run. This list is EMIL Trade's EA
 * engine set (emil-trade/src/lib/trading/ea-engine.ts) and its declared inputs
 * (ea-params.ts STRATEGY_INPUT_DECLS): same ids, same input names, same
 * defaults, same groups. A strategy built on one of these runs in EMIL Trade
 * exactly as written, and the generated MQL5 / Pine code implements the same
 * rule. Add an engine here only after EMIL Trade can run it.
 */

export const ENGINE_IDS = [
  'ema_pullback',
  'rsi_macd',
  'rsi_adaptive',
  'sar_flip',
  'boll_macd',
  'trend_reversal',
  'kalman',
  'linreg',
  'ichimoku',
  'ssl',
  'pattern',
] as const

export type EngineId = (typeof ENGINE_IDS)[number]

export type EngineFamily = 'trend' | 'reversal' | 'breakout' | 'pattern'

export type EngineInput = {
  /** Parameter name — identical to EMIL Trade's input name. */
  name: string
  label: string
  type: 'int' | 'double'
  default: number
  min: number
  max: number
  step: number
  group: string
}

export type Engine = {
  id: EngineId
  label: string
  family: EngineFamily
  /** One line for pickers. */
  summary: string
  /** Indicators the engine reads, for EMIL's knowledge card. */
  indicators: (p: Record<string, number>) => string[]
  /** Plain-language long and short conditions, evaluated on each closed bar. */
  rules: (p: Record<string, number>) => { long: string; short: string }
  inputs: readonly EngineInput[]
}

const int = (name: string, label: string, def: number, group: string, min = 1, max = 500): EngineInput => ({
  name, label, type: 'int', default: def, min, max, step: 1, group,
})
const dbl = (name: string, label: string, def: number, group: string, min: number, max: number, step: number): EngineInput => ({
  name, label, type: 'double', default: def, min, max, step, group,
})

export const ENGINES: Record<EngineId, Engine> = {
  ema_pullback: {
    id: 'ema_pullback',
    label: 'EMA Pullback',
    family: 'trend',
    summary: 'Buys pullbacks to the fast EMA in an uptrend, sells rallies to it in a downtrend.',
    indicators: (p) => [`EMA(${p.FastEMA})`, `EMA(${p.SlowEMA})`],
    rules: (p) => ({
      long: `EMA(${p.FastEMA}) above EMA(${p.SlowEMA}), and either a bullish candle whose low touches EMA(${p.FastEMA}) while closing at or above EMA(${p.SlowEMA}), or the close stays above EMA(${p.SlowEMA}).`,
      short: `EMA(${p.FastEMA}) below EMA(${p.SlowEMA}), and either a bearish candle whose high touches EMA(${p.FastEMA}) while closing at or below EMA(${p.SlowEMA}), or the close stays below EMA(${p.SlowEMA}).`,
    }),
    inputs: [int('FastEMA', 'Fast EMA period', 9, 'Strategy Core'), int('SlowEMA', 'Slow EMA period', 21, 'Strategy Core')],
  },
  rsi_macd: {
    id: 'rsi_macd',
    label: 'RSI + MACD Momentum',
    family: 'trend',
    summary: 'Trades with momentum when RSI and the MACD line agree.',
    indicators: (p) => [`RSI(${p.RSIPeriod})`, `MACD(${p.MACDFast},${p.MACDSlow},${p.MACDSignal})`],
    rules: (p) => ({
      long: `RSI(${p.RSIPeriod}) at or above ${p.RSIMidline} and the MACD line above its signal line.`,
      short: `RSI(${p.RSIPeriod}) at or below ${p.RSIMidline} and the MACD line below its signal line.`,
    }),
    inputs: [
      int('RSIPeriod', 'RSI period', 14, 'Momentum'),
      dbl('RSIMidline', 'RSI midline', 50, 'Momentum', 1, 99, 1),
      int('MACDFast', 'MACD fast EMA', 12, 'MACD'),
      int('MACDSlow', 'MACD slow EMA', 26, 'MACD'),
      int('MACDSignal', 'MACD signal period', 9, 'MACD'),
    ],
  },
  rsi_adaptive: {
    id: 'rsi_adaptive',
    label: 'RSI Adaptive',
    family: 'trend',
    summary: 'RSI leaving its midline in the direction of the trend EMA.',
    indicators: (p) => [`RSI(${p.RSIPeriod})`, `EMA(${p.TrendEMA})`],
    rules: (p) => ({
      long: `RSI(${p.RSIPeriod}) above ${p.BuyLevel} and the close above EMA(${p.TrendEMA}).`,
      short: `RSI(${p.RSIPeriod}) below ${p.SellLevel} and the close below EMA(${p.TrendEMA}).`,
    }),
    inputs: [
      int('RSIPeriod', 'RSI period', 14, 'Momentum'),
      int('TrendEMA', 'Trend EMA period', 50, 'Trend Filter'),
      dbl('BuyLevel', 'RSI buy level', 52, 'Momentum', 1, 99, 1),
      dbl('SellLevel', 'RSI sell level', 48, 'Momentum', 1, 99, 1),
    ],
  },
  sar_flip: {
    id: 'sar_flip',
    label: 'Parabolic SAR Flip',
    family: 'trend',
    summary: 'Follows the Parabolic SAR, confirmed by the trend EMA and RSI.',
    indicators: (p) => [`Parabolic SAR(${p.SARStep},${p.SARMax})`, `EMA(${p.TrendEMA})`, `RSI(${p.RSIPeriod})`],
    rules: (p) => ({
      long: `SAR below the close, the close above EMA(${p.TrendEMA}) and RSI(${p.RSIPeriod}) above 48.`,
      short: `SAR above the close, the close below EMA(${p.TrendEMA}) and RSI(${p.RSIPeriod}) below 52.`,
    }),
    inputs: [
      dbl('SARStep', 'Parabolic SAR step', 0.02, 'SAR', 0.001, 1, 0.001),
      dbl('SARMax', 'Parabolic SAR maximum', 0.2, 'SAR', 0.01, 1, 0.01),
      int('TrendEMA', 'Trend EMA period', 50, 'Trend Filter'),
      int('RSIPeriod', 'RSI period', 14, 'Trend Filter'),
    ],
  },
  boll_macd: {
    id: 'boll_macd',
    label: 'Bollinger + MACD Reversion',
    family: 'reversal',
    summary: 'Fades a band touch once the MACD histogram turns back.',
    indicators: (p) => [`Bollinger Bands(${p.BBPeriod},${p.BBDeviation})`, `MACD(${p.MACDFast},${p.MACDSlow},${p.MACDSignal})`],
    rules: (p) => ({
      long: `Close at or within 0.1% of the lower Bollinger Band(${p.BBPeriod}, ${p.BBDeviation}) and the MACD histogram rising.`,
      short: `Close at or within 0.1% of the upper Bollinger Band(${p.BBPeriod}, ${p.BBDeviation}) and the MACD histogram falling.`,
    }),
    inputs: [
      int('BBPeriod', 'Bollinger period', 20, 'Bands'),
      dbl('BBDeviation', 'Bollinger deviation', 2, 'Bands', 0.1, 10, 0.1),
      int('MACDFast', 'MACD fast EMA', 12, 'MACD'),
      int('MACDSlow', 'MACD slow EMA', 26, 'MACD'),
      int('MACDSignal', 'MACD signal period', 9, 'MACD'),
    ],
  },
  trend_reversal: {
    id: 'trend_reversal',
    label: 'EMA Trend Regime',
    family: 'trend',
    summary: 'Long while the fast EMA is above the slow EMA, short while below.',
    indicators: (p) => [`EMA(${p.FastEMA})`, `EMA(${p.SlowEMA})`],
    rules: (p) => ({
      long: `EMA(${p.FastEMA}) above EMA(${p.SlowEMA}).`,
      short: `EMA(${p.FastEMA}) below EMA(${p.SlowEMA}).`,
    }),
    inputs: [int('FastEMA', 'Fast EMA period', 20, 'Strategy Core'), int('SlowEMA', 'Slow EMA period', 50, 'Strategy Core')],
  },
  kalman: {
    id: 'kalman',
    label: 'Fast/Slow Smoothing',
    family: 'trend',
    summary: 'Kalman-style fast and slow smoothing crossover.',
    indicators: (p) => [`EMA(${p.FastEMA})`, `EMA(${p.SlowEMA})`],
    rules: (p) => ({
      long: `Fast smoothing EMA(${p.FastEMA}) above slow smoothing EMA(${p.SlowEMA}).`,
      short: `Fast smoothing EMA(${p.FastEMA}) below slow smoothing EMA(${p.SlowEMA}).`,
    }),
    inputs: [int('FastEMA', 'Fast smoothing period', 3, 'Strategy Core'), int('SlowEMA', 'Slow smoothing period', 30, 'Strategy Core')],
  },
  linreg: {
    id: 'linreg',
    label: 'EMA Slope',
    family: 'trend',
    summary: 'Follows the direction of a short EMA’s slope.',
    indicators: (p) => [`EMA(${p.EMAPeriod})`],
    rules: (p) => ({
      long: `EMA(${p.EMAPeriod}) higher than on the previous bar.`,
      short: `EMA(${p.EMAPeriod}) lower than on the previous bar.`,
    }),
    inputs: [int('EMAPeriod', 'Slope EMA period', 11, 'Strategy Core')],
  },
  ichimoku: {
    id: 'ichimoku',
    label: 'Ichimoku Cloud',
    family: 'trend',
    summary: 'Price outside the cloud with the Tenkan/Kijun cross agreeing.',
    indicators: (p) => [`Ichimoku(${p.Tenkan},${p.Kijun},${p.SenkouB},${p.Displacement})`],
    rules: (p) => ({
      long: `Close above the cloud (spans displaced ${p.Displacement} bars) and Tenkan(${p.Tenkan}) above Kijun(${p.Kijun}).`,
      short: `Close below the cloud (spans displaced ${p.Displacement} bars) and Tenkan(${p.Tenkan}) below Kijun(${p.Kijun}).`,
    }),
    inputs: [
      int('Tenkan', 'Tenkan-sen period', 9, 'Ichimoku'),
      int('Kijun', 'Kijun-sen period', 26, 'Ichimoku'),
      int('SenkouB', 'Senkou Span B period', 52, 'Ichimoku'),
      int('Displacement', 'Displacement', 26, 'Ichimoku', 1, 200),
    ],
  },
  ssl: {
    id: 'ssl',
    label: 'SSL Channel',
    family: 'breakout',
    summary: 'Breaks of a channel made from the SMA of highs and lows.',
    indicators: (p) => [`SMA(high, ${p.ChannelPeriod})`, `SMA(low, ${p.ChannelPeriod})`],
    rules: (p) => ({
      long: `Close above the SMA(${p.ChannelPeriod}) of highs.`,
      short: `Close below the SMA(${p.ChannelPeriod}) of lows.`,
    }),
    inputs: [int('ChannelPeriod', 'SSL channel period', 10, 'Strategy Core')],
  },
  pattern: {
    id: 'pattern',
    label: 'Engulfing at Extremes',
    family: 'pattern',
    summary: 'Engulfing candles that form at a recent high or low.',
    indicators: (p) => [`${Math.max(5, Math.round(p.ExtremeLookback))}-bar high/low`, 'Engulfing candle'],
    rules: (p) => {
      const n = Math.max(5, Math.round(p.ExtremeLookback))
      return {
        long: `Bullish engulfing candle whose low is at or within 0.1% of the lowest low of the previous ${n} bars.`,
        short: `Bearish engulfing candle whose high is at or within 0.1% of the highest high of the previous ${n} bars.`,
      }
    },
    inputs: [int('ExtremeLookback', 'Extreme lookback (bars)', 20, 'Strategy Core', 5, 500)],
  },
}

/** The engine's declared defaults. */
export function defaultParams(engine: EngineId): Record<string, number> {
  return Object.fromEntries(ENGINES[engine].inputs.map((input) => [input.name, input.default]))
}
