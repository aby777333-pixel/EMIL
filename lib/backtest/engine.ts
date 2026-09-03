// Real-history backtest engine (spec §32–34). Deterministic, bar-based,
// next-open execution with fees + slippage, optional stop/target, long/short.
// It reports what happened on the data it was given and nothing more: no
// optimisation, no curve fitting, and every metric is derived from the trade
// list you can inspect.

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume?: number | null }

export type StrategyKey = 'sma_cross' | 'donchian_breakout' | 'rsi_reversion'

export const STRATEGIES: Record<StrategyKey, { label: string; summary: string; params: { key: string; label: string; default: number; min: number; max: number }[] }> = {
  sma_cross: {
    label: 'SMA crossover (trend)',
    summary: 'Long while the fast SMA is above the slow SMA, short (or flat) while below. Classic trend-following.',
    params: [
      { key: 'fast', label: 'Fast SMA', default: 20, min: 2, max: 200 },
      { key: 'slow', label: 'Slow SMA', default: 50, min: 5, max: 400 },
    ],
  },
  donchian_breakout: {
    label: 'Donchian breakout',
    summary: 'Buy a close above the prior N-bar high, sell a close below the prior N-bar low; stop-and-reverse.',
    params: [{ key: 'period', label: 'Channel period', default: 20, min: 5, max: 200 }],
  },
  rsi_reversion: {
    label: 'RSI mean reversion',
    summary: 'Long when RSI drops below the oversold line, exit above the midline; mirror for shorts.',
    params: [
      { key: 'period', label: 'RSI period', default: 14, min: 2, max: 50 },
      { key: 'oversold', label: 'Oversold', default: 30, min: 5, max: 45 },
      { key: 'overbought', label: 'Overbought', default: 70, min: 55, max: 95 },
      { key: 'exit', label: 'Exit level', default: 50, min: 30, max: 70 },
    ],
  },
}

export type BacktestConfig = {
  strategy: StrategyKey
  params: Record<string, number>
  allowShort: boolean
  stopLossPct?: number | null
  takeProfitPct?: number | null
  feeBps: number
  slippageBps: number
  initialCapital: number
}

export type Trade = {
  side: 'long' | 'short'
  entryTime: number
  entryPrice: number
  exitTime: number
  exitPrice: number
  returnPct: number
  bars: number
  reason: 'signal' | 'stop' | 'target' | 'end'
}

export type BacktestResult = {
  metrics: {
    bars: number
    trades: number
    winRate: number
    profitFactor: number | null
    expectancyPct: number
    avgWinPct: number
    avgLossPct: number
    returnPct: number
    buyHoldPct: number
    maxDrawdownPct: number
    sharpeLike: number | null
    sortinoLike: number | null
    exposurePct: number
    avgHoldingHours: number
    longTrades: number
    shortTrades: number
    from: number
    to: number
  }
  verdict: 'pass' | 'weak' | 'fail'
  verdictReason: string
  trades: Trade[]
  equity: { time: number; equity: number }[]
}

const sma = (c: number[], n: number): (number | null)[] => {
  const out: (number | null)[] = new Array(c.length).fill(null)
  let sum = 0
  for (let i = 0; i < c.length; i++) {
    sum += c[i]
    if (i >= n) sum -= c[i - n]
    if (i >= n - 1) out[i] = sum / n
  }
  return out
}

const rsi = (c: number[], n: number): (number | null)[] => {
  const out: (number | null)[] = new Array(c.length).fill(null)
  let gain = 0, loss = 0
  for (let i = 1; i < c.length; i++) {
    const d = c[i] - c[i - 1]
    const g = Math.max(0, d), l = Math.max(0, -d)
    if (i <= n) {
      gain += g; loss += l
      if (i === n) { gain /= n; loss /= n; out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss) }
    } else {
      gain = (gain * (n - 1) + g) / n
      loss = (loss * (n - 1) + l) / n
      out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss)
    }
  }
  return out
}

// Desired position (+1 / -1 / 0) decided at the close of each bar.
function signals(candles: Candle[], cfg: BacktestConfig): number[] {
  const closes = candles.map((c) => c.close)
  const n = candles.length
  const pos = new Array<number>(n).fill(0)
  const p = cfg.params
  if (cfg.strategy === 'sma_cross') {
    const fast = sma(closes, Math.max(2, Math.round(p.fast ?? 20)))
    const slow = sma(closes, Math.max(3, Math.round(p.slow ?? 50)))
    for (let i = 0; i < n; i++) {
      if (fast[i] === null || slow[i] === null) continue
      pos[i] = fast[i]! > slow[i]! ? 1 : cfg.allowShort ? -1 : 0
    }
  } else if (cfg.strategy === 'donchian_breakout') {
    const period = Math.max(3, Math.round(p.period ?? 20))
    let cur = 0
    for (let i = period; i < n; i++) {
      let hi = -Infinity, lo = Infinity
      for (let j = i - period; j < i; j++) { hi = Math.max(hi, candles[j].high); lo = Math.min(lo, candles[j].low) }
      if (closes[i] > hi) cur = 1
      else if (closes[i] < lo) cur = cfg.allowShort ? -1 : 0
      pos[i] = cur
    }
  } else if (cfg.strategy === 'rsi_reversion') {
    const r = rsi(closes, Math.max(2, Math.round(p.period ?? 14)))
    const os = p.oversold ?? 30, ob = p.overbought ?? 70, ex = p.exit ?? 50
    let cur = 0
    for (let i = 0; i < n; i++) {
      const v = r[i]
      if (v === null) continue
      if (cur === 0) {
        if (v < os) cur = 1
        else if (v > ob && cfg.allowShort) cur = -1
      } else if (cur === 1 && v > ex) cur = 0
      else if (cur === -1 && v < ex) cur = 0
      pos[i] = cur
    }
  }
  return pos
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}

export function runBacktest(candles: Candle[], cfg: BacktestConfig): BacktestResult {
  const n = candles.length
  if (n < 30) throw new Error(`Need at least 30 bars, got ${n}.`)
  const want = signals(candles, cfg)
  const cost = (cfg.feeBps + cfg.slippageBps) / 10_000
  const sl = cfg.stopLossPct && cfg.stopLossPct > 0 ? cfg.stopLossPct / 100 : null
  const tp = cfg.takeProfitPct && cfg.takeProfitPct > 0 ? cfg.takeProfitPct / 100 : null

  let equity = cfg.initialCapital
  let peak = equity
  let maxDd = 0
  const trades: Trade[] = []
  const equityCurve: { time: number; equity: number }[] = []
  const barReturns: number[] = []
  let position = 0
  let entryPrice = 0
  let entryTime = 0
  let entryBar = 0
  let barsInMarket = 0
  let prevMark = equity

  const close = (exitPrice: number, exitTime: number, i: number, reason: Trade['reason']) => {
    const gross = position === 1 ? exitPrice / entryPrice - 1 : entryPrice / exitPrice - 1
    const net = gross - 2 * cost
    equity *= 1 + net
    trades.push({ side: position === 1 ? 'long' : 'short', entryTime, entryPrice, exitTime, exitPrice, returnPct: net * 100, bars: i - entryBar, reason })
    position = 0
  }

  for (let i = 1; i < n; i++) {
    const bar = candles[i]
    // 1. Stops/targets inside the bar (stop checked first — conservative).
    if (position !== 0 && (sl || tp)) {
      const stopPx = sl ? (position === 1 ? entryPrice * (1 - sl) : entryPrice * (1 + sl)) : null
      const tgtPx = tp ? (position === 1 ? entryPrice * (1 + tp) : entryPrice * (1 - tp)) : null
      const stopHit = stopPx !== null && (position === 1 ? bar.low <= stopPx : bar.high >= stopPx)
      const tgtHit = tgtPx !== null && (position === 1 ? bar.high >= tgtPx : bar.low <= tgtPx)
      if (stopHit) close(stopPx!, bar.time, i, 'stop')
      else if (tgtHit) close(tgtPx!, bar.time, i, 'target')
    }
    // 2. Signal from the previous close executes at this bar's open.
    const desired = want[i - 1]
    if (desired !== position) {
      if (position !== 0) close(bar.open, bar.time, i, 'signal')
      if (desired !== 0) { position = desired; entryPrice = bar.open; entryTime = bar.time; entryBar = i }
    }
    // 3. Mark to market: realized equity scaled by the open trade's unrealized move.
    if (position !== 0) barsInMarket++
    const markEquity = position === 0 ? equity : equity * (position === 1 ? bar.close / entryPrice : entryPrice / bar.close)
    barReturns.push(prevMark > 0 ? markEquity / prevMark - 1 : 0)
    prevMark = markEquity
    peak = Math.max(peak, markEquity)
    maxDd = Math.max(maxDd, peak > 0 ? (peak - markEquity) / peak : 0)
    if (i % Math.max(1, Math.floor(n / 300)) === 0 || i === n - 1) equityCurve.push({ time: bar.time, equity: Number(markEquity.toFixed(2)) })
  }
  if (position !== 0) close(candles[n - 1].close, candles[n - 1].time, n - 1, 'end')

  const wins = trades.filter((t) => t.returnPct > 0)
  const losses = trades.filter((t) => t.returnPct <= 0)
  const grossWin = wins.reduce((a, t) => a + t.returnPct, 0)
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.returnPct, 0))
  const intervalMs = n > 1 ? (candles[n - 1].time - candles[0].time) / (n - 1) : 3600e3
  const barsPerYear = (365 * 86400e3) / intervalMs
  const meanR = barReturns.length ? barReturns.reduce((a, b) => a + b, 0) / barReturns.length : 0
  const sd = stdev(barReturns)
  const downside = stdev(barReturns.filter((r) => r < 0))
  const sharpe = sd > 0 ? (meanR / sd) * Math.sqrt(barsPerYear) : null
  const sortino = downside > 0 ? (meanR / downside) * Math.sqrt(barsPerYear) : null
  const returnPct = (equity / cfg.initialCapital - 1) * 100
  const buyHoldPct = (candles[n - 1].close / candles[0].open - 1) * 100
  const metrics: BacktestResult['metrics'] = {
    bars: n, trades: trades.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : trades.length ? null : null,
    expectancyPct: trades.length ? trades.reduce((a, t) => a + t.returnPct, 0) / trades.length : 0,
    avgWinPct: wins.length ? grossWin / wins.length : 0,
    avgLossPct: losses.length ? -grossLoss / losses.length : 0,
    returnPct, buyHoldPct, maxDrawdownPct: maxDd * 100,
    sharpeLike: sharpe, sortinoLike: sortino,
    exposurePct: (barsInMarket / n) * 100,
    avgHoldingHours: trades.length ? (trades.reduce((a, t) => a + t.bars, 0) / trades.length) * (intervalMs / 3600e3) : 0,
    longTrades: trades.filter((t) => t.side === 'long').length,
    shortTrades: trades.filter((t) => t.side === 'short').length,
    from: candles[0].time, to: candles[n - 1].time,
  }
  const pf = metrics.profitFactor ?? (grossWin > 0 ? Infinity : 0)
  let verdict: BacktestResult['verdict'] = 'weak'
  let verdictReason = ''
  if (metrics.trades < 20) { verdict = 'fail'; verdictReason = `Only ${metrics.trades} trades — too few to trust any statistic (need ≥ 20).` }
  else if (pf < 1 || returnPct <= 0) { verdict = 'fail'; verdictReason = `Loses money after costs (profit factor ${pf === Infinity ? '∞' : pf.toFixed(2)}, return ${returnPct.toFixed(1)}%).` }
  else if (metrics.maxDrawdownPct > 35) { verdict = 'fail'; verdictReason = `Max drawdown ${metrics.maxDrawdownPct.toFixed(1)}% breaches the 35% lab limit.` }
  else if (pf >= 1.3 && metrics.maxDrawdownPct <= 25 && metrics.trades >= 30 && (sharpe ?? 0) >= 0.5) { verdict = 'pass'; verdictReason = `Profit factor ${pf.toFixed(2)}, drawdown ${metrics.maxDrawdownPct.toFixed(1)}%, Sharpe-like ${(sharpe ?? 0).toFixed(2)} over ${metrics.trades} trades.` }
  else verdictReason = `Positive but thin: profit factor ${pf === Infinity ? '∞' : pf.toFixed(2)}, drawdown ${metrics.maxDrawdownPct.toFixed(1)}%, Sharpe-like ${(sharpe ?? 0).toFixed(2)}, ${metrics.trades} trades. Needs out-of-sample confirmation.`
  return { metrics, verdict, verdictReason, trades, equity: equityCurve }
}
