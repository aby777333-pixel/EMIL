// Smoke test for the backtest robustness layer on synthetic candles.
// Run: npx tsx scripts/robustness-smoke.ts
import { runBacktest, type Candle } from '../lib/backtest/engine'
import { walkForward, monteCarlo } from '../lib/backtest/robustness'

function synth(n: number, seed = 7): Candle[] {
  let s = seed
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
  const out: Candle[] = []
  let px = 100
  for (let i = 0; i < n; i++) {
    const drift = Math.sin(i / 60) * 0.002
    const ret = drift + (rnd() - 0.5) * 0.02
    const open = px
    px = px * (1 + ret)
    const high = Math.max(open, px) * (1 + rnd() * 0.004)
    const low = Math.min(open, px) * (1 - rnd() * 0.004)
    out.push({ time: Date.UTC(2025, 0, 1) + i * 3600e3, open, high, low, close: px, volume: 1000 + rnd() * 500 })
  }
  return out
}

const candles = synth(1200)
const cfg = { strategy: 'sma_cross' as const, params: { fast: 10, slow: 30 }, allowShort: true, stopLossPct: 3, takeProfitPct: null, feeBps: 5, slippageBps: 2, initialCapital: 10_000 }
const base = runBacktest(candles, cfg)
console.log('base', base.verdict, base.metrics.trades, base.metrics.returnPct.toFixed(2))
const wf = walkForward(candles, cfg, 4)
console.log('walk-forward', wf.verdict, `folds=${wf.folds.length}`, `grid=${wf.gridSize}`, `oosTrades=${wf.oos.trades}`, `oosRet=${wf.oos.returnPct.toFixed(2)}`)
console.log(' ', wf.verdictReason)
const mc = monteCarlo(base.trades, cfg.initialCapital, 300)
console.log('monte-carlo', mc.verdict, `runs=${mc.runs}`, `p5=${mc.finalReturnPct.p5.toFixed(1)}`, `p50=${mc.finalReturnPct.p50.toFixed(1)}`, `dd95=${mc.maxDrawdownPct.p95.toFixed(1)}`, `probLoss=${mc.probLoss.toFixed(2)}`)
console.log(' ', mc.verdictReason)
if (wf.folds.length < 2 && wf.verdict !== 'insufficient') throw new Error('walk-forward produced too few folds')
console.log('OK')
