import { ENGINES, type EngineId } from '../engines'
import { ATR_PERIOD, MIN_BARS } from '../strategies'
import type { EmilStrategySpec, Timeframe } from '../spec'
import { codeHeader, formatNumber } from './shared'

/**
 * Generates a TradingView Pine Script v5 strategy that trades the spec the way
 * EMIL Trade's runtime does: one evaluation per closed bar, a new position
 * only when the regime changes (reversing any opposite position), a fixed
 * order size, ATR(14) stop and target from the fill, and the direction
 * filter. The indicator functions reproduce EMIL Trade's formulas — SMA-seeded
 * EMA, Wilder RSI and ATR, EMIL Trade's Parabolic SAR — instead of ta.* where
 * those differ.
 */

/** timeframe.period values a chart reports for each timeframe (Pine v5). */
const PINE_PERIODS: Record<Timeframe, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1H': '60',
  '4H': '240',
  '1D': 'D',
}

type Fn = 'ema' | 'rsi' | 'atr' | 'sar'

const FUNCTIONS: Record<Fn, string> = {
  ema: `// EMA seeded with the SMA of its first 'len' values; na inputs are skipped.
emilEma(float src, int len) =>
    var float value = na
    var float seedSum = 0.0
    var int count = 0
    if not na(src)
        count += 1
        if count <= len
            seedSum += src
            if count == len
                value := seedSum / len
        else
            value := (src - value) * (2.0 / (len + 1)) + value
    value`,
  rsi: `// RSI with Wilder smoothing, seeded with the simple average of the first 'len' changes.
emilRsi(float src, int len) =>
    var float avgGain = 0.0
    var float avgLoss = 0.0
    var int changes = 0
    var float value = na
    change = src - src[1]
    if not na(change)
        changes += 1
        up = math.max(change, 0.0)
        down = math.max(-change, 0.0)
        if changes <= len
            avgGain += up
            avgLoss += down
            if changes == len
                avgGain := avgGain / len
                avgLoss := avgLoss / len
                value := avgLoss == 0 ? 100.0 : 100.0 - 100.0 / (1.0 + avgGain / avgLoss)
        else
            avgGain := (avgGain * (len - 1) + up) / len
            avgLoss := (avgLoss * (len - 1) + down) / len
            value := avgLoss == 0 ? 100.0 : 100.0 - 100.0 / (1.0 + avgGain / avgLoss)
    value`,
  atr: `// ATR with Wilder smoothing; the first true range is high - low.
emilAtr(int len) =>
    var float trSum = 0.0
    var int count = 0
    var float value = na
    trueRange = na(close[1]) ? high - low : math.max(high - low, math.abs(high - close[1]), math.abs(low - close[1]))
    count += 1
    if count <= len
        trSum += trueRange
        if count == len
            value := trSum / len
    else
        value := (value * (len - 1) + trueRange) / len
    value`,
  sar: `// Parabolic SAR as EMIL Trade computes it (extreme point updated before the reversal test).
emilSar(float stepSize, float maxStep) =>
    var bool isLong = true
    var float af = na
    var float ep = na
    var float sar = na
    float value = na
    if na(sar)
        af := stepSize
        ep := high
        sar := low
    else
        prevSar = sar
        if isLong
            sar := prevSar + af * (ep - prevSar)
            sar := math.min(sar, low[1], na(low[2]) ? low[1] : low[2])
            if high > ep
                ep := high
                af := math.min(af + stepSize, maxStep)
            if low < sar
                isLong := false
                sar := ep
                ep := low
                af := stepSize
        else
            sar := prevSar + af * (ep - prevSar)
            sar := math.max(sar, high[1], na(high[2]) ? high[1] : high[2])
            if low < ep
                ep := low
                af := math.min(af + stepSize, maxStep)
            if high > sar
                isLong := true
                sar := ep
                ep := high
                af := stepSize
        value := sar
    value`,
}

/** Each engine's custom functions and the Pine lines that set `regime` (1, -1 or 0). */
const ENGINE_CODE: Record<EngineId, { fns: Fn[]; body: string }> = {
  ema_pullback: {
    fns: ['ema'],
    body: `fastLine = emilEma(close, FastEMA)
slowLine = emilEma(close, SlowEMA)
plot(fastLine, "Fast EMA", color.new(color.aqua, 0))
plot(slowLine, "Slow EMA", color.new(color.orange, 0))
int regime = 0
if not na(fastLine) and not na(slowLine)
    uptrend = fastLine > slowLine
    downtrend = fastLine < slowLine
    if uptrend and low <= fastLine and close >= slowLine and close > open
        regime := 1
    else if downtrend and high >= fastLine and close <= slowLine and close < open
        regime := -1
    else if uptrend and close > slowLine
        regime := 1
    else if downtrend and close < slowLine
        regime := -1`,
  },
  rsi_macd: {
    fns: ['ema', 'rsi'],
    body: `rsiValue = emilRsi(close, RSIPeriod)
macdFastLine = emilEma(close, MACDFast)
macdSlowLine = emilEma(close, MACDSlow)
macdLine = na(macdFastLine) or na(macdSlowLine) ? na : macdFastLine - macdSlowLine
signalLine = emilEma(macdLine, MACDSignal)
int regime = 0
if not na(rsiValue) and not na(macdLine) and not na(signalLine)
    if rsiValue >= RSIMidline and macdLine > signalLine
        regime := 1
    else if rsiValue <= RSIMidline and macdLine < signalLine
        regime := -1`,
  },
  rsi_adaptive: {
    fns: ['ema', 'rsi'],
    body: `rsiValue = emilRsi(close, RSIPeriod)
trendLine = emilEma(close, TrendEMA)
plot(trendLine, "Trend EMA", color.new(color.orange, 0))
int regime = 0
if not na(rsiValue) and not na(trendLine)
    if rsiValue > BuyLevel and close > trendLine
        regime := 1
    else if rsiValue < SellLevel and close < trendLine
        regime := -1`,
  },
  sar_flip: {
    fns: ['ema', 'rsi', 'sar'],
    body: `sarValue = emilSar(SARStep, SARMax)
trendLine = emilEma(close, TrendEMA)
rsiValue = emilRsi(close, RSIPeriod)
plot(sarValue, "Parabolic SAR", color.new(color.gray, 0), style=plot.style_cross)
plot(trendLine, "Trend EMA", color.new(color.orange, 0))
int regime = 0
if not na(sarValue) and not na(trendLine) and not na(rsiValue)
    if sarValue < close and close > trendLine and rsiValue > 48
        regime := 1
    else if sarValue > close and close < trendLine and rsiValue < 52
        regime := -1`,
  },
  boll_macd: {
    fns: ['ema'],
    body: `bandBasis = ta.sma(close, BBPeriod)
bandDev = ta.stdev(close, BBPeriod)
upperBand = bandBasis + BBDeviation * bandDev
lowerBand = bandBasis - BBDeviation * bandDev
macdFastLine = emilEma(close, MACDFast)
macdSlowLine = emilEma(close, MACDSlow)
macdLine = na(macdFastLine) or na(macdSlowLine) ? na : macdFastLine - macdSlowLine
signalLine = emilEma(macdLine, MACDSignal)
histogram = na(signalLine) ? na : macdLine - signalLine
plot(upperBand, "Upper band", color.new(color.gray, 0))
plot(bandBasis, "Basis", color.new(color.gray, 50))
plot(lowerBand, "Lower band", color.new(color.gray, 0))
int regime = 0
if not na(lowerBand) and not na(upperBand) and not na(histogram) and not na(histogram[1])
    if close <= lowerBand * 1.001 and histogram > histogram[1]
        regime := 1
    else if close >= upperBand * 0.999 and histogram < histogram[1]
        regime := -1`,
  },
  trend_reversal: {
    fns: ['ema'],
    body: `fastLine = emilEma(close, FastEMA)
slowLine = emilEma(close, SlowEMA)
plot(fastLine, "Fast EMA", color.new(color.aqua, 0))
plot(slowLine, "Slow EMA", color.new(color.orange, 0))
int regime = 0
if not na(fastLine) and not na(slowLine)
    regime := fastLine > slowLine ? 1 : fastLine < slowLine ? -1 : 0`,
  },
  kalman: {
    fns: ['ema'],
    body: `fastLine = emilEma(close, FastEMA)
slowLine = emilEma(close, SlowEMA)
plot(fastLine, "Fast smoothing", color.new(color.aqua, 0))
plot(slowLine, "Slow smoothing", color.new(color.orange, 0))
int regime = 0
if not na(fastLine) and not na(slowLine)
    regime := fastLine > slowLine ? 1 : fastLine < slowLine ? -1 : 0`,
  },
  linreg: {
    fns: ['ema'],
    body: `slopeLine = emilEma(close, EMAPeriod)
plot(slopeLine, "Slope EMA", color.new(color.aqua, 0))
int regime = 0
if not na(slopeLine) and not na(slopeLine[1])
    regime := slopeLine > slopeLine[1] ? 1 : slopeLine < slopeLine[1] ? -1 : 0`,
  },
  ichimoku: {
    fns: [],
    body: `conversionLine = math.avg(ta.highest(high, Tenkan), ta.lowest(low, Tenkan))
baseLine = math.avg(ta.highest(high, Kijun), ta.lowest(low, Kijun))
spanBRaw = math.avg(ta.highest(high, SenkouB), ta.lowest(low, SenkouB))
spanA = (conversionLine[Displacement] + baseLine[Displacement]) / 2
spanB = spanBRaw[Displacement]
plot(conversionLine, "Tenkan", color.new(color.aqua, 0))
plot(baseLine, "Kijun", color.new(color.orange, 0))
int regime = 0
if not na(conversionLine) and not na(baseLine) and not na(spanA) and not na(spanB)
    if close > math.max(spanA, spanB) and conversionLine > baseLine
        regime := 1
    else if close < math.min(spanA, spanB) and conversionLine < baseLine
        regime := -1`,
  },
  ssl: {
    fns: [],
    body: `channelHigh = ta.sma(high, ChannelPeriod)
channelLow = ta.sma(low, ChannelPeriod)
plot(channelHigh, "Channel high", color.new(color.teal, 0))
plot(channelLow, "Channel low", color.new(color.red, 0))
int regime = 0
if not na(channelHigh) and not na(channelLow)
    regime := close > channelHigh ? 1 : close < channelLow ? -1 : 0`,
  },
  pattern: {
    fns: [],
    body: `lookback = math.max(5, ExtremeLookback)
windowHigh = ta.highest(high, lookback)[1]
windowLow = ta.lowest(low, lookback)[1]
bullishEngulf = close > open and close[1] < open[1] and close > open[1] and open < close[1]
bearishEngulf = close < open and close[1] > open[1] and close < open[1] and open > close[1]
int regime = 0
if bar_index >= lookback + 1 and not na(windowHigh) and not na(windowLow)
    if bullishEngulf and low <= windowLow * 1.001
        regime := 1
    else if bearishEngulf and high >= windowHigh * 0.999
        regime := -1`,
  },
}

export function generatePine(spec: EmilStrategySpec, brand = 'EMIL Strategy Builder'): string {
  const engine = ENGINES[spec.engine]
  const code = ENGINE_CODE[spec.engine]
  const fns = (['ema', 'rsi', 'sar', 'atr'] as Fn[]).filter((fn) => fn === 'atr' || code.fns.includes(fn))
  const inputs = engine.inputs
    .map((input) => {
      const value = formatNumber(spec.params[input.name], input.type)
      return input.type === 'int'
        ? `${input.name} = input.int(${value}, "${input.label}", minval=${input.min}, maxval=${input.max}, group="${input.group}")`
        : `${input.name} = input.float(${value}, "${input.label}", minval=${input.min}, maxval=${input.max}, step=${input.step}, group="${input.group}")`
    })
    .join('\n')
  const direction = spec.risk.direction === 'long' ? 'Long only' : spec.risk.direction === 'short' ? 'Short only' : 'Long and short'
  const title = spec.name.replace(/"/g, "'")

  return `//@version=5
${codeHeader(spec, brand, '//')}
strategy("${title}", shorttitle="EMIL", overlay=true, initial_capital=10000, default_qty_type=strategy.fixed, default_qty_value=1, pyramiding=0, calc_on_every_tick=false, max_bars_back=1000)

// ─── Inputs ───────────────────────────────────────────────────────────────
${inputs}
OrderSize = input.float(1.0, "Order size (contracts or units)", minval=0.000001, group="Execution")
SLAtrMult = input.float(${formatNumber(spec.risk.slAtrMult, 'double')}, "Stop-loss (× ATR ${ATR_PERIOD})", minval=0.1, maxval=20, step=0.1, group="Execution")
TPAtrMult = input.float(${formatNumber(spec.risk.tpAtrMult, 'double')}, "Take-profit (× ATR ${ATR_PERIOD})", minval=0.1, maxval=50, step=0.1, group="Execution")
TradeDirection = input.string("${direction}", "Trade direction", options=["Long and short", "Long only", "Short only"], group="Execution")

// ─── EMIL Trade indicator formulas ────────────────────────────────────────
${fns.map((fn) => FUNCTIONS[fn]).join('\n\n')}

// ─── ${engine.label} ───
// Long:  ${engine.rules(spec.params).long}
// Short: ${engine.rules(spec.params).short}
${code.body}

atrValue = emilAtr(${ATR_PERIOD})

// ─── Execution, as EMIL Trade's runtime trades ────────────────────────────
// Evaluated once per closed bar. A position opens only when the regime changes
// from the last one acted on; after a stop or target the strategy waits for
// the regime to change. EMIL Trade's runtime needs ${MIN_BARS} closed bars first.
var int lastRegime = 0
allowed = TradeDirection == "Long and short" or (TradeDirection == "Long only" and regime == 1) or (TradeDirection == "Short only" and regime == -1)
enterLong = bar_index >= ${MIN_BARS - 1} and regime == 1 and regime != lastRegime and allowed
enterShort = bar_index >= ${MIN_BARS - 1} and regime == -1 and regime != lastRegime and allowed

if enterLong
    lastRegime := 1
    strategy.entry("EMIL Long", strategy.long, qty=OrderSize)
    if not na(atrValue) and atrValue > 0
        strategy.exit("EMIL Long exit", from_entry="EMIL Long", loss=SLAtrMult * atrValue / syminfo.mintick, profit=TPAtrMult * atrValue / syminfo.mintick)

if enterShort
    lastRegime := -1
    strategy.entry("EMIL Short", strategy.short, qty=OrderSize)
    if not na(atrValue) and atrValue > 0
        strategy.exit("EMIL Short exit", from_entry="EMIL Short", loss=SLAtrMult * atrValue / syminfo.mintick, profit=TPAtrMult * atrValue / syminfo.mintick)

plotshape(enterLong, "Long signal", shape.triangleup, location.belowbar, color.new(color.teal, 0), size=size.tiny)
plotshape(enterShort, "Short signal", shape.triangledown, location.abovebar, color.new(color.red, 0), size=size.tiny)

// ─── Timeframe check ───
var table tfNotice = table.new(position.top_right, 1, 1)
if barstate.islast and timeframe.period != "${PINE_PERIODS[spec.timeframe]}"
    table.cell(tfNotice, 0, 0, "Built for the ${spec.timeframe} timeframe; this chart is " + timeframe.period, text_color=color.white, bgcolor=color.new(color.orange, 20))
`
}
