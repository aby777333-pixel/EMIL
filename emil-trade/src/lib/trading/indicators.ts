// ═══════════════════════════════════════════════════════════════
// GIO4X RAPTOR — Technical Indicators
// Pure functions that calculate popular chart indicators from OHLCV data
// ═══════════════════════════════════════════════════════════════

/**
 * Simple Moving Average
 * Returns array of same length as input with nulls for insufficient data.
 */
export function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period || period < 1) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result[i] = sum / period;
  }

  return result;
}

/**
 * Exponential Moving Average
 * Uses multiplier = 2 / (period + 1)
 */
export function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period || period < 1) return result;

  // Seed with SMA of first 'period' values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let prev = sum / period;
  result[period - 1] = prev;

  const multiplier = 2 / (period + 1);

  for (let i = period; i < data.length; i++) {
    prev = (data[i] - prev) * multiplier + prev;
    result[i] = prev;
  }

  return result;
}

/**
 * Relative Strength Index (RSI)
 * Wilder's smoothing method
 */
export function rsi(data: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period + 1 || period < 1) return result;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // First average gain/loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  // Subsequent values using Wilder's smoothing
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      result[i + 1] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i + 1] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * Returns { macd, signal, histogram } arrays
 */
export function macd(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const length = data.length;
  const macdLine: (number | null)[] = new Array(length).fill(null);
  const signalLine: (number | null)[] = new Array(length).fill(null);
  const histogramLine: (number | null)[] = new Array(length).fill(null);

  const fastEma = ema(data, fastPeriod);
  const slowEma = ema(data, slowPeriod);

  // MACD line = fast EMA - slow EMA
  const macdValues: number[] = [];
  for (let i = 0; i < length; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      const val = fastEma[i]! - slowEma[i]!;
      macdLine[i] = val;
      macdValues.push(val);
    }
  }

  // Signal line = EMA of MACD values
  if (macdValues.length >= signalPeriod) {
    const signalEma = ema(macdValues, signalPeriod);

    // Map signal EMA back to original indices
    let macdIdx = 0;
    for (let i = 0; i < length; i++) {
      if (macdLine[i] !== null) {
        if (signalEma[macdIdx] !== null) {
          signalLine[i] = signalEma[macdIdx];
          histogramLine[i] = macdLine[i]! - signalEma[macdIdx]!;
        }
        macdIdx++;
      }
    }
  }

  return { macd: macdLine, signal: signalLine, histogram: histogramLine };
}

/**
 * Bollinger Bands
 * Returns { upper, middle, lower } arrays
 */
export function bollingerBands(
  data: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const length = data.length;
  const upper: (number | null)[] = new Array(length).fill(null);
  const middle: (number | null)[] = new Array(length).fill(null);
  const lower: (number | null)[] = new Array(length).fill(null);

  const smaValues = sma(data, period);

  for (let i = period - 1; i < length; i++) {
    const mean = smaValues[i]!;
    middle[i] = mean;

    // Calculate standard deviation
    let sumSqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j] - mean;
      sumSqDiff += diff * diff;
    }
    const stdDev = Math.sqrt(sumSqDiff / period);

    upper[i] = mean + stdDevMultiplier * stdDev;
    lower[i] = mean - stdDevMultiplier * stdDev;
  }

  return { upper, middle, lower };
}

/**
 * Average True Range (ATR)
 * Uses Wilder's smoothing
 */
export function atr(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): (number | null)[] {
  const length = high.length;
  const result: (number | null)[] = new Array(length).fill(null);
  if (length < period + 1 || period < 1) return result;

  // Calculate True Range
  const tr: number[] = [high[0] - low[0]]; // First TR is just H-L
  for (let i = 1; i < length; i++) {
    const hl = high[i] - low[i];
    const hpc = Math.abs(high[i] - close[i - 1]);
    const lpc = Math.abs(low[i] - close[i - 1]);
    tr.push(Math.max(hl, hpc, lpc));
  }

  // First ATR is simple average of first 'period' TR values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  let prevAtr = sum / period;
  result[period - 1] = prevAtr;

  // Subsequent ATR uses Wilder's smoothing
  for (let i = period; i < length; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
    result[i] = prevAtr;
  }

  return result;
}

/**
 * Stochastic Oscillator (%K and %D)
 */
export function stochastic(
  high: number[],
  low: number[],
  close: number[],
  kPeriod: number = 14,
  dPeriod: number = 3
): {
  k: (number | null)[];
  d: (number | null)[];
} {
  const length = high.length;
  const kLine: (number | null)[] = new Array(length).fill(null);
  const dLine: (number | null)[] = new Array(length).fill(null);

  if (length < kPeriod || kPeriod < 1) return { k: kLine, d: dLine };

  // Calculate %K
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (high[j] > highestHigh) highestHigh = high[j];
      if (low[j] < lowestLow) lowestLow = low[j];
    }
    const range = highestHigh - lowestLow;
    const k = range === 0 ? 50 : ((close[i] - lowestLow) / range) * 100;
    kLine[i] = k;
    kValues.push(k);
  }

  // %D = SMA of %K
  if (kValues.length >= dPeriod) {
    const dSma = sma(kValues, dPeriod);
    let kIdx = 0;
    for (let i = kPeriod - 1; i < length; i++) {
      if (dSma[kIdx] !== null) {
        dLine[i] = dSma[kIdx];
      }
      kIdx++;
    }
  }

  return { k: kLine, d: dLine };
}

/**
 * Volume Weighted Average Price (VWAP)
 * Calculated cumulatively from the start of the data
 */
export function vwap(
  high: number[],
  low: number[],
  close: number[],
  volume: number[]
): number[] {
  const length = high.length;
  const result: number[] = new Array(length).fill(0);

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < length; i++) {
    const typicalPrice = (high[i] + low[i] + close[i]) / 3;
    const vol = volume[i] || 1;
    cumulativeTPV += typicalPrice * vol;
    cumulativeVolume += vol;
    result[i] = cumulativeTPV / cumulativeVolume;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// Extended Indicators
// ═══════════════════════════════════════════════════════════════

/**
 * Aroon Up & Down
 */
export function aroon(
  high: number[],
  low: number[],
  period: number = 25
): { up: (number | null)[]; down: (number | null)[] } {
  const len = high.length;
  const up: (number | null)[] = new Array(len).fill(null);
  const down: (number | null)[] = new Array(len).fill(null);
  if (len < period) return { up, down };

  for (let i = period; i < len; i++) {
    let highIdx = i - period;
    let lowIdx = i - period;
    for (let j = i - period; j <= i; j++) {
      if (high[j] >= high[highIdx]) highIdx = j;
      if (low[j] <= low[lowIdx]) lowIdx = j;
    }
    up[i] = ((period - (i - highIdx)) / period) * 100;
    down[i] = ((period - (i - lowIdx)) / period) * 100;
  }
  return { up, down };
}

/**
 * Average Directional Index (ADX) with +DI / -DI
 */
export function adx(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): { adx: (number | null)[]; plusDI: (number | null)[]; minusDI: (number | null)[] } {
  const len = high.length;
  const adxResult: (number | null)[] = new Array(len).fill(null);
  const plusDI: (number | null)[] = new Array(len).fill(null);
  const minusDI: (number | null)[] = new Array(len).fill(null);
  if (len < period * 2) return { adx: adxResult, plusDI, minusDI };

  const trArr: number[] = [high[0] - low[0]];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];

  for (let i = 1; i < len; i++) {
    const hl = high[i] - low[i];
    const hpc = Math.abs(high[i] - close[i - 1]);
    const lpc = Math.abs(low[i] - close[i - 1]);
    trArr.push(Math.max(hl, hpc, lpc));

    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Smoothed TR, +DM, -DM using Wilder's smoothing
  let smoothTR = 0, smoothPlusDM = 0, smoothMinusDM = 0;
  for (let i = 0; i < period; i++) {
    smoothTR += trArr[i];
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
  }

  const dxValues: number[] = [];

  for (let i = period; i < len; i++) {
    smoothTR = smoothTR - smoothTR / period + trArr[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

    const pdi = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const mdi = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    plusDI[i] = pdi;
    minusDI[i] = mdi;

    const diSum = pdi + mdi;
    const dx = diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0;
    dxValues.push(dx);

    if (dxValues.length >= period) {
      if (dxValues.length === period) {
        let sum = 0;
        for (const v of dxValues) sum += v;
        adxResult[i] = sum / period;
      } else {
        adxResult[i] = ((adxResult[i - 1]! * (period - 1)) + dx) / period;
      }
    }
  }
  return { adx: adxResult, plusDI, minusDI };
}

/**
 * Donchian Channel
 */
export function donchianChannel(
  high: number[],
  low: number[],
  period: number = 20
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const len = high.length;
  const upper: (number | null)[] = new Array(len).fill(null);
  const middle: (number | null)[] = new Array(len).fill(null);
  const lower: (number | null)[] = new Array(len).fill(null);

  for (let i = period - 1; i < len; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (high[j] > hh) hh = high[j];
      if (low[j] < ll) ll = low[j];
    }
    upper[i] = hh;
    lower[i] = ll;
    middle[i] = (hh + ll) / 2;
  }
  return { upper, middle, lower };
}

/**
 * Envelope (Moving Average Envelope)
 */
export function envelope(
  close: number[],
  period: number = 20,
  percent: number = 2.5
): { upper: (number | null)[]; basis: (number | null)[]; lower: (number | null)[] } {
  const basis = sma(close, period);
  const len = close.length;
  const upper: (number | null)[] = new Array(len).fill(null);
  const lower: (number | null)[] = new Array(len).fill(null);

  for (let i = 0; i < len; i++) {
    if (basis[i] !== null) {
      upper[i] = basis[i]! * (1 + percent / 100);
      lower[i] = basis[i]! * (1 - percent / 100);
    }
  }
  return { upper, basis, lower };
}

/**
 * Fractals (Williams Fractals) — bearish highs & bullish lows
 * Returns arrays of price values at fractal points, null otherwise.
 */
export function fractals(
  high: number[],
  low: number[]
): { up: (number | null)[]; down: (number | null)[] } {
  const len = high.length;
  const up: (number | null)[] = new Array(len).fill(null);
  const down: (number | null)[] = new Array(len).fill(null);

  for (let i = 2; i < len - 2; i++) {
    if (
      high[i] > high[i - 1] && high[i] > high[i - 2] &&
      high[i] > high[i + 1] && high[i] > high[i + 2]
    ) {
      up[i] = high[i];
    }
    if (
      low[i] < low[i - 1] && low[i] < low[i - 2] &&
      low[i] < low[i + 1] && low[i] < low[i + 2]
    ) {
      down[i] = low[i];
    }
  }
  return { up, down };
}

/**
 * Ichimoku Cloud
 */
export function ichimoku(
  high: number[],
  low: number[],
  close: number[],
  conversionPeriod: number = 9,
  basePeriod: number = 26,
  spanBPeriod: number = 52,
  displacement: number = 26
): {
  conversion: (number | null)[];
  base: (number | null)[];
  spanA: (number | null)[];
  spanB: (number | null)[];
  lagging: (number | null)[];
} {
  const len = high.length;

  const calcMidpoint = (h: number[], l: number[], period: number): (number | null)[] => {
    const result: (number | null)[] = new Array(len).fill(null);
    for (let i = period - 1; i < len; i++) {
      let hh = -Infinity, ll = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (h[j] > hh) hh = h[j];
        if (l[j] < ll) ll = l[j];
      }
      result[i] = (hh + ll) / 2;
    }
    return result;
  };

  const conversion = calcMidpoint(high, low, conversionPeriod);
  const base = calcMidpoint(high, low, basePeriod);

  // Span A = (conversion + base) / 2, shifted forward by displacement
  const spanA: (number | null)[] = new Array(len).fill(null);
  const spanB: (number | null)[] = new Array(len).fill(null);
  const rawSpanB = calcMidpoint(high, low, spanBPeriod);

  for (let i = 0; i < len; i++) {
    if (conversion[i] !== null && base[i] !== null) {
      const idx = i + displacement;
      if (idx < len) {
        spanA[idx] = (conversion[i]! + base[i]!) / 2;
      }
    }
    if (rawSpanB[i] !== null) {
      const idx = i + displacement;
      if (idx < len) {
        spanB[idx] = rawSpanB[i];
      }
    }
  }

  // Lagging span = close shifted back by displacement
  const lagging: (number | null)[] = new Array(len).fill(null);
  for (let i = displacement; i < len; i++) {
    lagging[i - displacement] = close[i];
  }

  return { conversion, base, spanA, spanB, lagging };
}

/**
 * Momentum (close - close[n])
 */
export function momentum(
  close: number[],
  period: number = 10
): (number | null)[] {
  const len = close.length;
  const result: (number | null)[] = new Array(len).fill(null);
  for (let i = period; i < len; i++) {
    result[i] = close[i] - close[i - period];
  }
  return result;
}

/**
 * Parabolic SAR
 */
export function parabolicSAR(
  high: number[],
  low: number[],
  step: number = 0.02,
  max: number = 0.2
): (number | null)[] {
  const len = high.length;
  if (len < 2) return new Array(len).fill(null);

  const result: (number | null)[] = new Array(len).fill(null);
  let isLong = true;
  let af = step;
  let ep = high[0];
  let sar = low[0];

  for (let i = 1; i < len; i++) {
    const prevSar = sar;

    if (isLong) {
      sar = prevSar + af * (ep - prevSar);
      sar = Math.min(sar, low[i - 1], i > 1 ? low[i - 2] : low[i - 1]);

      if (high[i] > ep) {
        ep = high[i];
        af = Math.min(af + step, max);
      }

      if (low[i] < sar) {
        isLong = false;
        sar = ep;
        ep = low[i];
        af = step;
      }
    } else {
      sar = prevSar + af * (ep - prevSar);
      sar = Math.max(sar, high[i - 1], i > 1 ? high[i - 2] : high[i - 1]);

      if (low[i] < ep) {
        ep = low[i];
        af = Math.min(af + step, max);
      }

      if (high[i] > sar) {
        isLong = true;
        sar = ep;
        ep = high[i];
        af = step;
      }
    }

    result[i] = sar;
  }

  return result;
}

/**
 * Pivot Points (Standard)
 */
export function pivotPoints(
  high: number[],
  low: number[],
  close: number[]
): {
  pivot: (number | null)[];
  r1: (number | null)[];
  r2: (number | null)[];
  r3: (number | null)[];
  s1: (number | null)[];
  s2: (number | null)[];
  s3: (number | null)[];
} {
  const len = high.length;
  const pivot: (number | null)[] = new Array(len).fill(null);
  const r1: (number | null)[] = new Array(len).fill(null);
  const r2: (number | null)[] = new Array(len).fill(null);
  const r3: (number | null)[] = new Array(len).fill(null);
  const s1: (number | null)[] = new Array(len).fill(null);
  const s2: (number | null)[] = new Array(len).fill(null);
  const s3: (number | null)[] = new Array(len).fill(null);

  for (let i = 1; i < len; i++) {
    const pp = (high[i - 1] + low[i - 1] + close[i - 1]) / 3;
    pivot[i] = pp;
    r1[i] = 2 * pp - low[i - 1];
    s1[i] = 2 * pp - high[i - 1];
    r2[i] = pp + (high[i - 1] - low[i - 1]);
    s2[i] = pp - (high[i - 1] - low[i - 1]);
    r3[i] = high[i - 1] + 2 * (pp - low[i - 1]);
    s3[i] = low[i - 1] - 2 * (high[i - 1] - pp);
  }

  return { pivot, r1, r2, r3, s1, s2, s3 };
}

/**
 * Bulls Bears Power
 */
export function bullsBearsPower(
  high: number[],
  low: number[],
  close: number[],
  period: number = 13
): { bulls: (number | null)[]; bears: (number | null)[] } {
  const emaValues = ema(close, period);
  const len = close.length;
  const bulls: (number | null)[] = new Array(len).fill(null);
  const bears: (number | null)[] = new Array(len).fill(null);

  for (let i = 0; i < len; i++) {
    if (emaValues[i] !== null) {
      bulls[i] = high[i] - emaValues[i]!;
      bears[i] = low[i] - emaValues[i]!;
    }
  }
  return { bulls, bears };
}

/**
 * 1-D Kalman filter on price — faithful port of the GIO_Kalman_Trend /
 * BLUEBIRD MQL5 recursion (measurement noise = R*length, process noise =
 * Q/length). Used by the GIO Kalman Trend and BLUEBIRD indicators.
 */
export function kalmanFilter(
  closes: number[],
  length: number,
  R: number = 0.01,
  Q: number = 0.10
): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n === 0 || length < 1) return out;
  const errMeas = R * length;
  const q = Q / length;
  let est = closes[0];
  let err = 1.0;
  out[0] = est;
  for (let i = 1; i < n; i++) {
    const pred = est;
    const gain = err / (err + errMeas);
    est = pred + gain * (closes[i] - pred);
    err = (1 - gain) * err + q;
    out[i] = est;
  }
  return out;
}

/**
 * Kaufman Adaptive Moving Average (KAMA / AMA) — matches MT5 iAMA(period,
 * fast, slow). Baseline of the GIO "The Equalizer" indicator.
 */
export function kama(
  closes: number[],
  period: number = 10,
  fast: number = 2,
  slow: number = 30
): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < period + 1) return out;
  const fastSC = 2 / (fast + 1);
  const slowSC = 2 / (slow + 1);
  let prev = closes[period];
  out[period] = prev;
  for (let i = period + 1; i < n; i++) {
    const change = Math.abs(closes[i] - closes[i - period]);
    let vol = 0;
    for (let j = i - period + 1; j <= i; j++) vol += Math.abs(closes[j] - closes[j - 1]);
    const er = vol === 0 ? 0 : change / vol;
    const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
    prev = prev + sc * (closes[i] - prev);
    out[i] = prev;
  }
  return out;
}
