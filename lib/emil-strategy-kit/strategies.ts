import { atr, bollingerBands, ema, ichimoku, macd, parabolicSAR, rsi, sma, type Series } from './indicators'
import type { EngineId } from './engines'
import type { EmilStrategySpec } from './spec'

/**
 * The strategy rules, ported line for line from EMIL Trade's EA engine
 * (emil-trade/src/lib/trading/ea-engine.ts). Each takes the closed bars,
 * oldest first, and returns the regime the EA wants to hold right now.
 */

export type Bar = { time: number; open: number; high: number; low: number; close: number }
export type Regime = 'BUY' | 'SELL' | null

type Rule = (bars: readonly Bar[], p: Record<string, number>) => Regime

const last = (arr: Series): number | null => (arr.length ? arr[arr.length - 1] : null)
const closesOf = (bars: readonly Bar[]) => bars.map((b) => b.close)
const highsOf = (bars: readonly Bar[]) => bars.map((b) => b.high)
const lowsOf = (bars: readonly Bar[]) => bars.map((b) => b.low)

const emaPullback: Rule = (bars, p) => {
  const closes = closesOf(bars)
  const i = bars.length - 1
  const fast = ema(closes, p.FastEMA)[i]
  const slow = ema(closes, p.SlowEMA)[i]
  const b = bars[i]
  if (fast == null || slow == null) return null
  const uptrend = fast > slow
  const downtrend = fast < slow
  if (uptrend && b.low <= fast && b.close >= slow && b.close > b.open) return 'BUY'
  if (downtrend && b.high >= fast && b.close <= slow && b.close < b.open) return 'SELL'
  if (uptrend && b.close > slow) return 'BUY'
  if (downtrend && b.close < slow) return 'SELL'
  return null
}

const rsiMacd: Rule = (bars, p) => {
  const closes = closesOf(bars)
  const r = last(rsi(closes, p.RSIPeriod))
  const m = macd(closes, p.MACDFast, p.MACDSlow, p.MACDSignal)
  const i = closes.length - 1
  const line = m.macd[i]
  const signal = m.signal[i]
  if (r == null || line == null || signal == null) return null
  if (r >= p.RSIMidline && line > signal) return 'BUY'
  if (r <= p.RSIMidline && line < signal) return 'SELL'
  return null
}

const rsiAdaptive: Rule = (bars, p) => {
  const closes = closesOf(bars)
  const r = last(rsi(closes, p.RSIPeriod))
  const trend = last(ema(closes, p.TrendEMA))
  const c = closes[closes.length - 1]
  if (r == null || trend == null) return null
  if (r > p.BuyLevel && c > trend) return 'BUY'
  if (r < p.SellLevel && c < trend) return 'SELL'
  return null
}

const sarFlip: Rule = (bars, p) => {
  const closes = closesOf(bars)
  const sar = last(parabolicSAR(highsOf(bars), lowsOf(bars), p.SARStep, p.SARMax))
  const trend = last(ema(closes, p.TrendEMA))
  const r = last(rsi(closes, p.RSIPeriod))
  const c = closes[closes.length - 1]
  if (sar == null || trend == null || r == null) return null
  if (sar < c && c > trend && r > 48) return 'BUY'
  if (sar > c && c < trend && r < 52) return 'SELL'
  return null
}

const bollMacd: Rule = (bars, p) => {
  const closes = closesOf(bars)
  const bb = bollingerBands(closes, p.BBPeriod, p.BBDeviation)
  const m = macd(closes, p.MACDFast, p.MACDSlow, p.MACDSignal)
  const i = closes.length - 1
  const lower = bb.lower[i]
  const upper = bb.upper[i]
  const mid = bb.middle[i]
  const h = m.histogram[i]
  const hPrev = i > 0 ? m.histogram[i - 1] : null
  const c = closes[i]
  if (lower == null || upper == null || mid == null || h == null || hPrev == null) return null
  if (c <= lower * 1.001 && h > hPrev) return 'BUY'
  if (c >= upper * 0.999 && h < hPrev) return 'SELL'
  return null
}

const emaRegime: Rule = (bars, p) => {
  const closes = closesOf(bars)
  const fast = last(ema(closes, p.FastEMA))
  const slow = last(ema(closes, p.SlowEMA))
  if (fast == null || slow == null) return null
  if (fast > slow) return 'BUY'
  if (fast < slow) return 'SELL'
  return null
}

const emaSlope: Rule = (bars, p) => {
  const e = ema(closesOf(bars), p.EMAPeriod)
  const cur = e[e.length - 1]
  const prev = e.length > 1 ? e[e.length - 2] : null
  if (cur == null || prev == null) return null
  if (cur > prev) return 'BUY'
  if (cur < prev) return 'SELL'
  return null
}

const ichimokuCloud: Rule = (bars, p) => {
  const ic = ichimoku(highsOf(bars), lowsOf(bars), p.Tenkan, p.Kijun, p.SenkouB, p.Displacement)
  const i = bars.length - 1
  const conv = ic.conversion[i]
  const base = ic.base[i]
  const spanA = ic.spanA[i]
  const spanB = ic.spanB[i]
  const c = bars[i].close
  if (conv == null || base == null || spanA == null || spanB == null) return null
  if (c > Math.max(spanA, spanB) && conv > base) return 'BUY'
  if (c < Math.min(spanA, spanB) && conv < base) return 'SELL'
  return null
}

const sslChannel: Rule = (bars, p) => {
  const hi = last(sma(highsOf(bars), p.ChannelPeriod))
  const lo = last(sma(lowsOf(bars), p.ChannelPeriod))
  const c = bars[bars.length - 1].close
  if (hi == null || lo == null) return null
  if (c > hi) return 'BUY'
  if (c < lo) return 'SELL'
  return null
}

const engulfingAtExtremes: Rule = (bars, p) => {
  const lookback = Math.max(5, Math.round(p.ExtremeLookback))
  if (bars.length < lookback + 2) return null
  const cur = bars[bars.length - 1]
  const prev = bars[bars.length - 2]
  const window = bars.slice(-(lookback + 1), -1)
  const winHigh = Math.max(...window.map((b) => b.high))
  const winLow = Math.min(...window.map((b) => b.low))
  const bullishEngulf = cur.close > cur.open && prev.close < prev.open && cur.close > prev.open && cur.open < prev.close
  const bearishEngulf = cur.close < cur.open && prev.close > prev.open && cur.close < prev.open && cur.open > prev.close
  if (bullishEngulf && cur.low <= winLow * 1.001) return 'BUY'
  if (bearishEngulf && cur.high >= winHigh * 0.999) return 'SELL'
  return null
}

const RULES: Record<EngineId, Rule> = {
  ema_pullback: emaPullback,
  rsi_macd: rsiMacd,
  rsi_adaptive: rsiAdaptive,
  sar_flip: sarFlip,
  boll_macd: bollMacd,
  trend_reversal: emaRegime,
  kalman: emaRegime,
  linreg: emaSlope,
  ichimoku: ichimokuCloud,
  ssl: sslChannel,
  pattern: engulfingAtExtremes,
}

/** The regime an engine wants on these closed bars. */
export function evaluateRegime(engine: EngineId, bars: readonly Bar[], params: Record<string, number>): Regime {
  return RULES[engine](bars, params)
}

// ─── Backtest ──────────────────────────────────────────────────────────────

/** EMIL Trade's runtime evaluates nothing until it has this many closed bars. */
export const MIN_BARS = 60
/** ATR period for protective levels, as in EMIL Trade's runtime. */
export const ATR_PERIOD = 14
const NOTIONAL = 10000

export type BacktestTrade = {
  entryTime: number
  exitTime: number
  direction: 'BUY' | 'SELL'
  entry: number
  exit: number
  retPct: number
  pnl: number
  reason: 'SL' | 'TP' | 'flip' | 'end'
}

export type BacktestResult = {
  trades: BacktestTrade[]
  equity: number[]
  barsTested: number
  netProfit: number
  profitFactor: number
  maxDrawdownPct: number
  winRate: number
  numTrades: number
  avgTradePct: number
  sharpe: number
}

/**
 * Replays the strategy the way EMIL Trade's live runtime trades it, one
 * closed bar at a time:
 *   - nothing happens until MIN_BARS bars have closed;
 *   - a position opens only when the regime changes from the last one acted
 *     on, closing any opposite position first;
 *   - a regime the direction filter excludes is ignored;
 *   - the stop and target are ATR(14) multiples from the entry and are
 *     checked intrabar on later bars (stop first);
 *   - after a stop or target the EA waits for the regime to change.
 * Entries fill at the signal bar's close. Returns are per trade on a fixed
 * notional, so results are comparable across instruments.
 */
export function backtest(spec: EmilStrategySpec, bars: readonly Bar[]): BacktestResult {
  const { risk } = spec
  const trades: BacktestTrade[] = []
  const atrSeries = atr(highsOf(bars), lowsOf(bars), closesOf(bars), ATR_PERIOD)
  let pos: { dir: 'BUY' | 'SELL'; entry: number; entryTime: number; sl: number | null; tp: number | null } | null = null
  let lastRegime: Regime = null

  const close = (exit: number, time: number, reason: BacktestTrade['reason']) => {
    if (!pos) return
    const ret = ((exit - pos.entry) / pos.entry) * (pos.dir === 'BUY' ? 1 : -1)
    trades.push({ entryTime: pos.entryTime, exitTime: time, direction: pos.dir, entry: pos.entry, exit, retPct: ret * 100, pnl: ret * NOTIONAL, reason })
    pos = null
  }

  for (let i = MIN_BARS - 1; i < bars.length; i++) {
    const bar = bars[i]
    if (pos) {
      if (pos.dir === 'BUY') {
        if (pos.sl != null && bar.low <= pos.sl) close(pos.sl, bar.time, 'SL')
        else if (pos.tp != null && bar.high >= pos.tp) close(pos.tp, bar.time, 'TP')
      } else if (pos.sl != null && bar.high >= pos.sl) close(pos.sl, bar.time, 'SL')
      else if (pos.tp != null && bar.low <= pos.tp) close(pos.tp, bar.time, 'TP')
    }
    const regime = evaluateRegime(spec.engine, bars.slice(0, i + 1), spec.params)
    if (regime === null || regime === lastRegime) continue
    if (risk.direction === 'long' && regime === 'SELL') continue
    if (risk.direction === 'short' && regime === 'BUY') continue
    if (pos) close(bar.close, bar.time, 'flip')
    const a = atrSeries[i] ?? 0
    const entry = bar.close
    pos = {
      dir: regime,
      entry,
      entryTime: bar.time,
      sl: a > 0 ? (regime === 'BUY' ? entry - risk.slAtrMult * a : entry + risk.slAtrMult * a) : null,
      tp: a > 0 ? (regime === 'BUY' ? entry + risk.tpAtrMult * a : entry - risk.tpAtrMult * a) : null,
    }
    lastRegime = regime
  }
  const final = bars[bars.length - 1]
  if (pos && final) close(final.close, final.time, 'end')

  const rets = trades.map((t) => t.retPct)
  const wins = trades.filter((t) => t.pnl > 0)
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  const equity: number[] = [NOTIONAL]
  let eq = NOTIONAL
  let peak = NOTIONAL
  let maxDD = 0
  for (const t of trades) {
    eq += t.pnl
    equity.push(eq)
    peak = Math.max(peak, eq)
    maxDD = Math.max(maxDD, (peak - eq) / peak)
  }
  const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0
  const std = rets.length ? Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length) : 0
  const round2 = (n: number) => Math.round(n * 100) / 100
  return {
    trades,
    equity,
    barsTested: bars.length,
    netProfit: round2(grossProfit - grossLoss),
    profitFactor: grossLoss > 0 ? round2(grossProfit / grossLoss) : grossProfit > 0 ? 999 : 0,
    maxDrawdownPct: round2(maxDD * 100),
    winRate: trades.length ? round2((wins.length / trades.length) * 100) : 0,
    numTrades: trades.length,
    avgTradePct: round2(mean),
    sharpe: std > 0 ? round2((mean / std) * Math.sqrt(Math.max(rets.length, 1))) : 0,
  }
}
