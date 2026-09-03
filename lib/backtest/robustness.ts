// Backtest robustness (spec §32–34): walk-forward analysis and Monte Carlo
// resampling on top of the deterministic engine. Both are CALCULATED from the
// same real candles; neither predicts. A strategy that only works in-sample or
// whose bootstrapped drawdowns are ugly should be treated as unproven.

import { runBacktest, STRATEGIES, type BacktestConfig, type Candle, type Trade } from './engine'

// ---- walk-forward -------------------------------------------------------

export type WalkForwardFold = {
  fold: number
  isFrom: number; isTo: number; oosFrom: number; oosTo: number
  isBars: number; oosBars: number
  tunedParams: Record<string, number>
  isReturnPct: number; isProfitFactor: number | null; isTrades: number
  oosReturnPct: number; oosProfitFactor: number | null; oosTrades: number; oosWinRate: number; oosMaxDrawdownPct: number
  efficiency: number | null // OOS return / IS return (per bar-normalised)
}

export type WalkForwardResult = {
  folds: WalkForwardFold[]
  oos: { trades: number; returnPct: number; winRate: number; profitFactor: number | null; maxDrawdownPct: number; positiveFolds: number }
  gridSize: number
  verdict: 'robust' | 'fragile' | 'insufficient'
  verdictReason: string
}

function grid(cfg: BacktestConfig): Record<string, number>[] {
  const def = STRATEGIES[cfg.strategy]
  const axes = def.params.map((p) => {
    const base = cfg.params[p.key] ?? p.default
    const step = Math.max(1, Math.round(base * 0.25))
    const vals = Array.from(new Set([base - step, base, base + step].map((v) => Math.max(p.min, Math.min(p.max, Math.round(v))))))
    return { key: p.key, vals }
  })
  let combos: Record<string, number>[] = [{}]
  for (const ax of axes) combos = combos.flatMap((c) => ax.vals.map((v) => ({ ...c, [ax.key]: v })))
  return combos.slice(0, 81)
}

const score = (r: ReturnType<typeof runBacktest>) => {
  // Rank IS candidates by expectancy × sqrt(trades), penalising too-few trades.
  const m = r.metrics
  if (m.trades < 5) return -Infinity
  return m.expectancyPct * Math.sqrt(m.trades) - m.maxDrawdownPct * 0.05
}

export function walkForward(candles: Candle[], cfg: BacktestConfig, folds = 4, isFraction = 0.7): WalkForwardResult {
  const n = candles.length
  const minBars = 120
  if (n < minBars * 2) {
    return { folds: [], oos: { trades: 0, returnPct: 0, winRate: 0, profitFactor: null, maxDrawdownPct: 0, positiveFolds: 0 }, gridSize: 0, verdict: 'insufficient', verdictReason: `Need at least ${minBars * 2} bars for walk-forward; got ${n}.` }
  }
  const k = Math.max(2, Math.min(folds, Math.floor(n / minBars)))
  const foldLen = Math.floor(n / k)
  const combos = grid(cfg)
  const out: WalkForwardFold[] = []
  const oosTrades: Trade[] = []
  let oosEquity = cfg.initialCapital
  let oosPeak = cfg.initialCapital
  let oosMaxDd = 0
  for (let f = 0; f < k; f++) {
    const start = f * foldLen
    const end = f === k - 1 ? n : start + foldLen
    const split = start + Math.floor((end - start) * isFraction)
    const isC = candles.slice(start, split)
    const oosC = candles.slice(split, end)
    if (isC.length < 40 || oosC.length < 20) continue
    let best: { params: Record<string, number>; res: ReturnType<typeof runBacktest>; s: number } | null = null
    for (const params of combos) {
      const res = runBacktest(isC, { ...cfg, params })
      const s = score(res)
      if (!best || s > best.s) best = { params, res, s }
    }
    if (!best) continue
    const oos = runBacktest(oosC, { ...cfg, params: best.params })
    for (const t of oos.trades) {
      oosTrades.push(t)
      oosEquity *= 1 + t.returnPct / 100
      oosPeak = Math.max(oosPeak, oosEquity)
      oosMaxDd = Math.max(oosMaxDd, ((oosPeak - oosEquity) / oosPeak) * 100)
    }
    const isPerBar = best.res.metrics.returnPct / Math.max(1, isC.length)
    const oosPerBar = oos.metrics.returnPct / Math.max(1, oosC.length)
    out.push({
      fold: f + 1, isFrom: isC[0].time, isTo: isC[isC.length - 1].time, oosFrom: oosC[0].time, oosTo: oosC[oosC.length - 1].time,
      isBars: isC.length, oosBars: oosC.length, tunedParams: best.params,
      isReturnPct: best.res.metrics.returnPct, isProfitFactor: best.res.metrics.profitFactor, isTrades: best.res.metrics.trades,
      oosReturnPct: oos.metrics.returnPct, oosProfitFactor: oos.metrics.profitFactor, oosTrades: oos.metrics.trades, oosWinRate: oos.metrics.winRate, oosMaxDrawdownPct: oos.metrics.maxDrawdownPct,
      efficiency: Math.abs(isPerBar) > 1e-9 ? oosPerBar / isPerBar : null,
    })
  }
  const wins = oosTrades.filter((t) => t.returnPct > 0)
  const losses = oosTrades.filter((t) => t.returnPct <= 0)
  const gp = wins.reduce((s, t) => s + t.returnPct, 0)
  const gl = Math.abs(losses.reduce((s, t) => s + t.returnPct, 0))
  const pf = gl > 0 ? gp / gl : wins.length ? null : 0
  const positiveFolds = out.filter((x) => x.oosReturnPct > 0).length
  const oosReturn = (oosEquity / cfg.initialCapital - 1) * 100
  let verdict: WalkForwardResult['verdict'] = 'fragile'
  let reason = ''
  if (out.length < 2 || oosTrades.length < 10) { verdict = 'insufficient'; reason = `Only ${out.length} usable folds / ${oosTrades.length} out-of-sample trades — not enough to judge.` }
  else if (positiveFolds / out.length >= 0.6 && (pf === null || pf >= 1.1) && oosReturn > 0) { verdict = 'robust'; reason = `${positiveFolds}/${out.length} folds positive out of sample, OOS profit factor ${pf === null ? '∞' : pf.toFixed(2)}, OOS return ${oosReturn.toFixed(1)}% with parameters re-tuned each fold.` }
  else reason = `${positiveFolds}/${out.length} folds positive out of sample, OOS profit factor ${pf === null ? '∞' : pf.toFixed(2)}, OOS return ${oosReturn.toFixed(1)}% — the in-sample edge does not carry forward reliably.`
  return {
    folds: out,
    oos: { trades: oosTrades.length, returnPct: oosReturn, winRate: oosTrades.length ? (wins.length / oosTrades.length) * 100 : 0, profitFactor: pf, maxDrawdownPct: oosMaxDd, positiveFolds },
    gridSize: combos.length, verdict, verdictReason: reason,
  }
}

// ---- Monte Carlo ---------------------------------------------------------

export type MonteCarloResult = {
  runs: number
  trades: number
  finalReturnPct: { p5: number; p25: number; p50: number; p75: number; p95: number; mean: number }
  maxDrawdownPct: { p50: number; p95: number; worst: number }
  probLoss: number
  probRuin: number // drawdown beyond ruinPct at any point
  ruinPct: number
  histogram: { from: number; to: number; count: number }[]
  verdict: 'sound' | 'shaky' | 'insufficient'
  verdictReason: string
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pct = (sorted: number[], p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))))] : 0

export function monteCarlo(trades: Trade[], initialCapital: number, runs = 500, ruinPct = 50, seed = 42): MonteCarloResult {
  const r = trades.map((t) => t.returnPct / 100)
  if (r.length < 10) {
    return { runs: 0, trades: r.length, finalReturnPct: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0, mean: 0 }, maxDrawdownPct: { p50: 0, p95: 0, worst: 0 }, probLoss: 0, probRuin: 0, ruinPct, histogram: [], verdict: 'insufficient', verdictReason: `Need at least 10 trades to resample; got ${r.length}.` }
  }
  const rnd = mulberry32(seed)
  const finals: number[] = []
  const dds: number[] = []
  let ruin = 0
  for (let k = 0; k < runs; k++) {
    let eq = 1, peak = 1, maxDd = 0
    for (let i = 0; i < r.length; i++) {
      eq *= 1 + r[Math.floor(rnd() * r.length)] // bootstrap with replacement
      if (eq > peak) peak = eq
      const dd = (peak - eq) / peak
      if (dd > maxDd) maxDd = dd
    }
    finals.push((eq - 1) * 100)
    dds.push(maxDd * 100)
    if (maxDd * 100 >= ruinPct) ruin += 1
  }
  const fs = [...finals].sort((a, b) => a - b)
  const ds = [...dds].sort((a, b) => a - b)
  const mean = finals.reduce((s, v) => s + v, 0) / finals.length
  const lo = fs[0], hi = fs[fs.length - 1]
  const bins = 12
  const width = (hi - lo) / bins || 1
  const histogram = Array.from({ length: bins }, (_, i) => ({ from: lo + i * width, to: lo + (i + 1) * width, count: 0 }))
  for (const v of finals) histogram[Math.min(bins - 1, Math.floor((v - lo) / width))].count += 1
  const probLoss = finals.filter((v) => v < 0).length / finals.length
  const probRuin = ruin / runs
  let verdict: MonteCarloResult['verdict'] = 'shaky'
  let reason = ''
  if (probLoss <= 0.25 && probRuin <= 0.02 && pct(fs, 5) > -25) { verdict = 'sound'; reason = `${Math.round((1 - probLoss) * 100)}% of ${runs} resampled paths finish positive; 5th-percentile return ${pct(fs, 5).toFixed(1)}%; drawdown beyond ${ruinPct}% in ${(probRuin * 100).toFixed(1)}% of paths.` }
  else reason = `${Math.round(probLoss * 100)}% of ${runs} resampled paths lose money; 5th-percentile return ${pct(fs, 5).toFixed(1)}%; 95th-percentile drawdown ${pct(ds, 95).toFixed(1)}%; ruin (>${ruinPct}% DD) in ${(probRuin * 100).toFixed(1)}% of paths.`
  return {
    runs, trades: r.length,
    finalReturnPct: { p5: pct(fs, 5), p25: pct(fs, 25), p50: pct(fs, 50), p75: pct(fs, 75), p95: pct(fs, 95), mean },
    maxDrawdownPct: { p50: pct(ds, 50), p95: pct(ds, 95), worst: ds[ds.length - 1] },
    probLoss, probRuin, ruinPct, histogram, verdict, verdictReason: reason,
  }
}
