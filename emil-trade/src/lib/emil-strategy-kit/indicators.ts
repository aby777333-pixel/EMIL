/**
 * Indicator formulas, ported line for line from EMIL Trade
 * (emil-trade/src/lib/trading/indicators.ts) so a strategy evaluated here
 * produces the same values the EMIL Trade EA runtime computes. The MQL5 and
 * Pine generators (codegen/) implement these same formulas, not the
 * platforms' built-ins, which seed and smooth differently.
 *
 * Every function returns an array the length of its input, oldest first, with
 * null where there is not yet enough data.
 */

export type Series = (number | null)[]

export function sma(data: readonly number[], period: number): Series {
  const result: Series = new Array(data.length).fill(null)
  if (data.length < period || period < 1) return result
  let sum = 0
  for (let i = 0; i < period; i++) sum += data[i]
  result[period - 1] = sum / period
  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period]
    result[i] = sum / period
  }
  return result
}

/** EMA seeded with the SMA of the first `period` values. */
export function ema(data: readonly number[], period: number): Series {
  const result: Series = new Array(data.length).fill(null)
  if (data.length < period || period < 1) return result
  let sum = 0
  for (let i = 0; i < period; i++) sum += data[i]
  let prev = sum / period
  result[period - 1] = prev
  const multiplier = 2 / (period + 1)
  for (let i = period; i < data.length; i++) {
    prev = (data[i] - prev) * multiplier + prev
    result[i] = prev
  }
  return result
}

/** RSI with Wilder's smoothing, seeded with the simple average of the first `period` changes. */
export function rsi(data: readonly number[], period = 14): Series {
  const result: Series = new Array(data.length).fill(null)
  if (data.length < period + 1 || period < 1) return result
  const gains: number[] = []
  const losses: number[] = []
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? -change : 0)
  }
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    avgGain += gains[i]
    avgLoss += losses[i]
  }
  avgGain /= period
  avgLoss /= period
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    result[i + 1] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }
  return result
}

/** MACD; the signal line is the SMA-seeded EMA of the MACD values that exist. */
export function macd(
  data: readonly number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): { macd: Series; signal: Series; histogram: Series } {
  const length = data.length
  const macdLine: Series = new Array(length).fill(null)
  const signalLine: Series = new Array(length).fill(null)
  const histogramLine: Series = new Array(length).fill(null)
  const fastEma = ema(data, fastPeriod)
  const slowEma = ema(data, slowPeriod)
  const macdValues: number[] = []
  for (let i = 0; i < length; i++) {
    const fast = fastEma[i]
    const slow = slowEma[i]
    if (fast !== null && slow !== null) {
      macdLine[i] = fast - slow
      macdValues.push(fast - slow)
    }
  }
  if (macdValues.length >= signalPeriod) {
    const signalEma = ema(macdValues, signalPeriod)
    let macdIdx = 0
    for (let i = 0; i < length; i++) {
      const line = macdLine[i]
      if (line !== null) {
        const sig = signalEma[macdIdx]
        if (sig !== null) {
          signalLine[i] = sig
          histogramLine[i] = line - sig
        }
        macdIdx++
      }
    }
  }
  return { macd: macdLine, signal: signalLine, histogram: histogramLine }
}

/** Bollinger Bands on an SMA with the population standard deviation. */
export function bollingerBands(
  data: readonly number[],
  period = 20,
  stdDevMultiplier = 2,
): { upper: Series; middle: Series; lower: Series } {
  const length = data.length
  const upper: Series = new Array(length).fill(null)
  const middle: Series = new Array(length).fill(null)
  const lower: Series = new Array(length).fill(null)
  const smaValues = sma(data, period)
  for (let i = period - 1; i < length; i++) {
    const mean = smaValues[i]
    if (mean === null) continue
    middle[i] = mean
    let sumSqDiff = 0
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j] - mean
      sumSqDiff += diff * diff
    }
    const stdDev = Math.sqrt(sumSqDiff / period)
    upper[i] = mean + stdDevMultiplier * stdDev
    lower[i] = mean - stdDevMultiplier * stdDev
  }
  return { upper, middle, lower }
}

/** ATR with Wilder's smoothing; the first true range is high − low. */
export function atr(high: readonly number[], low: readonly number[], close: readonly number[], period = 14): Series {
  const length = high.length
  const result: Series = new Array(length).fill(null)
  if (length < period + 1 || period < 1) return result
  const tr: number[] = [high[0] - low[0]]
  for (let i = 1; i < length; i++) {
    tr.push(Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1])))
  }
  let sum = 0
  for (let i = 0; i < period; i++) sum += tr[i]
  let prevAtr = sum / period
  result[period - 1] = prevAtr
  for (let i = period; i < length; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]) / period
    result[i] = prevAtr
  }
  return result
}

/** Ichimoku; spans are shifted forward by `displacement` bars. */
export function ichimoku(
  high: readonly number[],
  low: readonly number[],
  conversionPeriod = 9,
  basePeriod = 26,
  spanBPeriod = 52,
  displacement = 26,
): { conversion: Series; base: Series; spanA: Series; spanB: Series } {
  const len = high.length
  const midpoint = (period: number): Series => {
    const result: Series = new Array(len).fill(null)
    for (let i = period - 1; i < len; i++) {
      let hh = -Infinity
      let ll = Infinity
      for (let j = i - period + 1; j <= i; j++) {
        if (high[j] > hh) hh = high[j]
        if (low[j] < ll) ll = low[j]
      }
      result[i] = (hh + ll) / 2
    }
    return result
  }
  const conversion = midpoint(conversionPeriod)
  const base = midpoint(basePeriod)
  const rawSpanB = midpoint(spanBPeriod)
  const spanA: Series = new Array(len).fill(null)
  const spanB: Series = new Array(len).fill(null)
  for (let i = 0; i < len; i++) {
    const idx = i + displacement
    if (idx >= len) continue
    const conv = conversion[i]
    const bas = base[i]
    if (conv !== null && bas !== null) spanA[idx] = (conv + bas) / 2
    spanB[idx] = rawSpanB[i]
  }
  return { conversion, base, spanA, spanB }
}

/** Parabolic SAR as EMIL Trade computes it (extreme point updated before the reversal test). */
export function parabolicSAR(high: readonly number[], low: readonly number[], step = 0.02, max = 0.2): Series {
  const len = high.length
  const result: Series = new Array(len).fill(null)
  if (len < 2) return result
  let isLong = true
  let af = step
  let ep = high[0]
  let sar = low[0]
  for (let i = 1; i < len; i++) {
    const prevSar = sar
    if (isLong) {
      sar = prevSar + af * (ep - prevSar)
      sar = Math.min(sar, low[i - 1], i > 1 ? low[i - 2] : low[i - 1])
      if (high[i] > ep) {
        ep = high[i]
        af = Math.min(af + step, max)
      }
      if (low[i] < sar) {
        isLong = false
        sar = ep
        ep = low[i]
        af = step
      }
    } else {
      sar = prevSar + af * (ep - prevSar)
      sar = Math.max(sar, high[i - 1], i > 1 ? high[i - 2] : high[i - 1])
      if (low[i] < ep) {
        ep = low[i]
        af = Math.min(af + step, max)
      }
      if (high[i] > sar) {
        isLong = true
        sar = ep
        ep = high[i]
        af = step
      }
    }
    result[i] = sar
  }
  return result
}
