'use client';

// Strategy Tester (super-prompt §11). Runs a bar-level backtest of the EA's
// strategy over the loaded history (reusing the live runtime's strategy logic)
// and shows metrics, an equity curve, and the trade list. Honestly labelled as
// a simplified bar-level simulation.

import { useMemo, useState } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { backtestStrategy, type BacktestResult, type EASettings, type StrategyKind } from '@/lib/trading/ea-engine';
import { effectiveEngineParams } from '@/lib/trading/ea-params';
import type { OHLCVBar } from '@/types/trading';

type Tab = 'overview' | 'trades' | 'optimize' | 'walkforward';

// Parameter grid for optimization (§10): SL / TP ATR multipliers.
const SL_GRID = [1, 1.5, 2, 2.5, 3, 4];
const TP_GRID = [1.5, 2, 3, 4, 5, 6];

interface OptRow { sl: number; tp: number; r: BacktestResult }
interface WfFold { label: string; sl: number; tp: number; trainNet: number; oos: BacktestResult }

export default function StrategyTesterModal({
  eaName, symbol, timeframe, bars, strategyId, strategyKind, settings, onClose, onApplySettings,
}: {
  eaName: string; symbol: string; timeframe: string; bars: OHLCVBar[];
  strategyId: string; strategyKind: StrategyKind | undefined; settings: EASettings;
  onClose: () => void;
  onApplySettings?: (s: EASettings) => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  // The tester uses the SAME effective engine params as live execution, so
  // EA Properties edits are what actually gets backtested.
  const engineParams = useMemo(() => effectiveEngineParams(strategyId, strategyKind), [strategyId, strategyKind]);
  const result: BacktestResult | null = useMemo(
    () => (bars.length >= 80 ? backtestStrategy(bars, strategyId, strategyKind, settings, engineParams) : null),
    [bars, strategyId, strategyKind, settings, engineParams],
  );

  // ── Optimization (§10): grid sweep over SL×TP ATR multipliers ──
  const [optRows, setOptRows] = useState<OptRow[] | null>(null);
  const [optRunning, setOptRunning] = useState(false);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const runOptimization = () => {
    setOptRunning(true);
    setTimeout(() => { // let the "running" state paint before the sweep
      const rows: OptRow[] = [];
      for (const sl of SL_GRID) for (const tp of TP_GRID) {
        rows.push({ sl, tp, r: backtestStrategy(bars, strategyId, strategyKind, { ...settings, slAtrMult: sl, tpAtrMult: tp }, engineParams) });
      }
      rows.sort((a, b) => b.r.netProfit - a.r.netProfit);
      setOptRows(rows);
      setOptRunning(false);
    }, 30);
  };

  // ── Walk-forward (§10): rolling optimize-in-sample → test out-of-sample ──
  const [wf, setWf] = useState<{ folds: WfFold[]; oosNet: number; robust: boolean } | null>(null);
  const [wfRunning, setWfRunning] = useState(false);
  const runWalkForward = () => {
    setWfRunning(true);
    setTimeout(() => {
      const total = bars.length;
      const train = Math.floor(total * 0.4);
      const test = Math.floor(total * 0.2);
      const folds: WfFold[] = [];
      for (let start = 0; start + train + test <= total; start += test) {
        const trainBars = bars.slice(start, start + train);
        const testBars = bars.slice(start + train, start + train + test);
        if (trainBars.length < 80 || testBars.length < 80) continue;
        // optimize on the in-sample window (best net P&L, prefer >=3 trades)
        let best: OptRow | null = null;
        for (const sl of SL_GRID) for (const tp of TP_GRID) {
          const r = backtestStrategy(trainBars, strategyId, strategyKind, { ...settings, slAtrMult: sl, tpAtrMult: tp }, engineParams);
          if (!best || (r.netProfit > best.r.netProfit && (r.numTrades >= 3 || best.r.numTrades < 3))) best = { sl, tp, r };
        }
        if (!best) continue;
        // test those params on the unseen out-of-sample window
        const oos = backtestStrategy(testBars, strategyId, strategyKind, { ...settings, slAtrMult: best.sl, tpAtrMult: best.tp }, engineParams);
        const d = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        folds.push({ label: `${d(testBars[0].time)} – ${d(testBars[testBars.length - 1].time)}`, sl: best.sl, tp: best.tp, trainNet: best.r.netProfit, oos });
      }
      const oosNet = folds.reduce((s, f) => s + f.oos.netProfit, 0);
      const robust = folds.length > 0 && folds.filter((f) => f.oos.netProfit > 0).length >= Math.ceil(folds.length / 2);
      setWf({ folds, oosNet, robust });
      setWfRunning(false);
    }, 30);
  };

  const net = result?.netProfit ?? 0;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onMouseDown={onClose}>
      <div
        className="flex max-h-[88vh] w-[600px] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[13px] font-bold text-white">Strategy Tester — {eaName}</div>
            <div className="text-[10px] text-white/40">{symbol} · {timeframe} · {result?.barsTested ?? bars.length} bars · bar-level simulation</div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
        </div>

        {!result ? (
          <div className="p-8 text-center text-[12px] text-white/50">
            Not enough history loaded to backtest ({bars.length} bars). Let the chart stream more data and try again.
          </div>
        ) : (
          <>
            <div className="flex gap-0.5 border-b px-2 pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {(['overview', 'trades', 'optimize', 'walkforward'] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="rounded-t px-3 py-1.5 text-[11px] font-medium capitalize transition-colors"
                  style={{ backgroundColor: tab === t ? 'rgba(41,171,226,0.12)' : 'transparent', color: tab === t ? '#0091D5' : 'rgba(255,255,255,0.45)' }}>
                  {t === 'trades' ? `Trades (${result.numTrades})` : t === 'optimize' ? 'Optimization' : t === 'walkforward' ? 'Walk-Forward' : 'Overview'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tab === 'overview' && (
                <>
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    <Metric label="Net P&L" value={`$${net.toLocaleString()}`} color={net >= 0 ? '#00C27A' : '#FF5252'} />
                    <Metric label="Profit factor" value={result.profitFactor.toFixed(2)} />
                    <Metric label="Win rate" value={`${result.winRate}%`} />
                    <Metric label="Max DD" value={`${result.maxDrawdownPct}%`} color="#FF5252" />
                    <Metric label="Trades" value={String(result.numTrades)} />
                    <Metric label="Sharpe" value={result.sharpe.toFixed(2)} />
                    <Metric label="Avg trade" value={`${result.avgTradePct}%`} />
                    <Metric label="Expectancy" value={`$${result.expectancy}`} />
                    <Metric label="Gross profit" value={`$${result.grossProfit.toLocaleString()}`} color="#00C27A" />
                    <Metric label="Gross loss" value={`$${result.grossLoss.toLocaleString()}`} color="#FF5252" />
                    <Metric label="Largest win" value={`${result.largestWinPct}%`} color="#00C27A" />
                    <Metric label="Largest loss" value={`${result.largestLossPct}%`} color="#FF5252" />
                  </div>
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-white/35">Equity curve</div>
                  <EquityCurve equity={result.equity} />
                  <p className="mt-2 text-[9px] text-white/25">
                    Bar-level model: entries flip on opposite signals; ATR-scaled SL/TP close intrabar; fixed
                    ${BT_NOTIONAL_LABEL} notional per trade, no spread/commission/swap. Results are illustrative, not a guarantee.
                  </p>
                </>
              )}

              {tab === 'trades' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead className="text-white/35">
                      <tr className="text-left">
                        <th className="py-1 pr-2">#</th><th className="pr-2">Dir</th>
                        <th className="pr-2 text-right">Entry</th><th className="pr-2 text-right">Exit</th>
                        <th className="pr-2 text-right">Return</th><th className="pr-2 text-right">P&L</th><th>Exit</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {result.trades.slice(-100).map((t, i) => (
                        <tr key={i} className="border-t border-white/[0.04]">
                          <td className="py-1 pr-2 text-white/30">{i + 1}</td>
                          <td className="pr-2" style={{ color: t.direction === 'BUY' ? '#00C27A' : '#FF5252' }}>
                            {t.direction === 'BUY' ? <TrendingUp size={10} className="inline" /> : <TrendingDown size={10} className="inline" />} {t.direction}
                          </td>
                          <td className="pr-2 text-right text-white/60">{t.entry.toFixed(t.entry < 20 ? 5 : 2)}</td>
                          <td className="pr-2 text-right text-white/60">{t.exit.toFixed(t.exit < 20 ? 5 : 2)}</td>
                          <td className="pr-2 text-right" style={{ color: t.retPct >= 0 ? '#00C27A' : '#FF5252' }}>{t.retPct >= 0 ? '+' : ''}{t.retPct.toFixed(2)}%</td>
                          <td className="pr-2 text-right" style={{ color: t.pnl >= 0 ? '#00C27A' : '#FF5252' }}>{t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(0)}</td>
                          <td className="text-white/30">{t.reason}</td>
                        </tr>
                      ))}
                      {result.trades.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-white/30">No trades generated over this history.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'optimize' && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[10px] text-white/45">
                      Grid sweep: SL ×ATR {'{'}{SL_GRID.join(', ')}{'}'} × TP ×ATR {'{'}{TP_GRID.join(', ')}{'}'} — {SL_GRID.length * TP_GRID.length} backtests over {result.barsTested} bars.
                    </div>
                    <button onClick={runOptimization} disabled={optRunning}
                      className="shrink-0 rounded px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
                      style={{ backgroundColor: '#0091D5' }}>
                      {optRunning ? 'Running…' : optRows ? 'Re-run' : 'Run optimization'}
                    </button>
                  </div>
                  {!optRows && !optRunning && <div className="py-6 text-center text-[11px] text-white/30">Run the sweep to rank parameter combinations by net P&L.</div>}
                  {optRows && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead className="text-white/35">
                          <tr className="text-left">
                            <th className="py-1 pr-2">#</th><th className="pr-2">SL ×ATR</th><th className="pr-2">TP ×ATR</th>
                            <th className="pr-2 text-right">Net P&L</th><th className="pr-2 text-right">PF</th>
                            <th className="pr-2 text-right">Win %</th><th className="pr-2 text-right">Max DD</th>
                            <th className="pr-2 text-right">Trades</th><th></th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {optRows.map((row, i) => {
                            const k = `${row.sl}-${row.tp}`;
                            const isCurrent = row.sl === settings.slAtrMult && row.tp === settings.tpAtrMult;
                            return (
                              <tr key={k} className="border-t border-white/[0.04]" style={{ backgroundColor: i === 0 ? 'rgba(0,194,122,0.06)' : 'transparent' }}>
                                <td className="py-1 pr-2 text-white/30">{i + 1}{i === 0 ? ' ★' : ''}</td>
                                <td className="pr-2 text-white/70">{row.sl}</td>
                                <td className="pr-2 text-white/70">{row.tp}</td>
                                <td className="pr-2 text-right" style={{ color: row.r.netProfit >= 0 ? '#00C27A' : '#FF5252' }}>${row.r.netProfit.toLocaleString()}</td>
                                <td className="pr-2 text-right text-white/60">{row.r.profitFactor.toFixed(2)}</td>
                                <td className="pr-2 text-right text-white/60">{row.r.winRate}%</td>
                                <td className="pr-2 text-right text-white/60">{row.r.maxDrawdownPct}%</td>
                                <td className="pr-2 text-right text-white/60">{row.r.numTrades}</td>
                                <td className="text-right">
                                  {isCurrent ? (
                                    <span className="text-[9px] text-white/30">current</span>
                                  ) : onApplySettings && (
                                    <button
                                      onClick={() => { onApplySettings({ ...settings, slAtrMult: row.sl, tpAtrMult: row.tp }); setAppliedKey(k); }}
                                      className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                                      style={{ backgroundColor: appliedKey === k ? 'rgba(0,194,122,0.25)' : 'rgba(0,145,213,0.15)', color: appliedKey === k ? '#00C27A' : '#0091D5', border: '1px solid rgba(0,145,213,0.3)' }}>
                                      {appliedKey === k ? 'Applied ✓' : 'Apply'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="mt-2 text-[9px] text-white/25">
                        Same bar-level model as the single backtest. Top-ranked ≠ guaranteed — prefer parameters that also hold up in Walk-Forward.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'walkforward' && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[10px] text-white/45">
                      Rolling windows: optimize on 40% in-sample, test on the next 20% out-of-sample, step forward.
                    </div>
                    <button onClick={runWalkForward} disabled={wfRunning}
                      className="shrink-0 rounded px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
                      style={{ backgroundColor: '#0091D5' }}>
                      {wfRunning ? 'Running…' : wf ? 'Re-run' : 'Run walk-forward'}
                    </button>
                  </div>
                  {!wf && !wfRunning && <div className="py-6 text-center text-[11px] text-white/30">Run the analysis to see how optimized parameters hold up on unseen data.</div>}
                  {wf && wf.folds.length === 0 && <div className="py-6 text-center text-[11px] text-white/30">Not enough history for walk-forward windows (need ≥ 400 bars).</div>}
                  {wf && wf.folds.length > 0 && (
                    <>
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        <Metric label="OOS net P&L (all folds)" value={`$${wf.oosNet.toLocaleString()}`} color={wf.oosNet >= 0 ? '#00C27A' : '#FF5252'} />
                        <Metric label="Profitable folds" value={`${wf.folds.filter((f) => f.oos.netProfit > 0).length}/${wf.folds.length}`} />
                        <Metric label="Verdict" value={wf.robust ? 'ROBUST' : 'FRAGILE'} color={wf.robust ? '#00C27A' : '#FF5252'} />
                      </div>
                      <table className="w-full text-[10px]">
                        <thead className="text-white/35">
                          <tr className="text-left">
                            <th className="py-1 pr-2">OOS window</th><th className="pr-2">Best SL/TP</th>
                            <th className="pr-2 text-right">IS net</th><th className="pr-2 text-right">OOS net</th>
                            <th className="pr-2 text-right">OOS PF</th><th className="pr-2 text-right">OOS trades</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {wf.folds.map((f, i) => (
                            <tr key={i} className="border-t border-white/[0.04]">
                              <td className="py-1 pr-2 text-white/60">{f.label}</td>
                              <td className="pr-2 text-white/70">{f.sl} / {f.tp}</td>
                              <td className="pr-2 text-right text-white/50">${f.trainNet.toLocaleString()}</td>
                              <td className="pr-2 text-right" style={{ color: f.oos.netProfit >= 0 ? '#00C27A' : '#FF5252' }}>${f.oos.netProfit.toLocaleString()}</td>
                              <td className="pr-2 text-right text-white/60">{f.oos.profitFactor.toFixed(2)}</td>
                              <td className="pr-2 text-right text-white/60">{f.oos.numTrades}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-2 text-[9px] text-white/25">
                        ROBUST = the in-sample-optimized parameters stayed profitable in a majority of unseen windows.
                        FRAGILE = the edge did not transfer — likely overfitting.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const BT_NOTIONAL_LABEL = '10,000';

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border p-2" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
      <div className="text-[8px] uppercase tracking-wide text-white/35">{label}</div>
      <div className="font-mono text-[13px] font-bold" style={{ color: color ?? '#fff' }}>{value}</div>
    </div>
  );
}

function EquityCurve({ equity }: { equity: number[] }) {
  const w = 552, h = 120, pad = 4;
  if (equity.length < 2) return <div className="text-[10px] text-white/30">No equity data.</div>;
  const min = Math.min(...equity), max = Math.max(...equity);
  const range = max - min || 1;
  const pts = equity.map((e, i) => {
    const x = pad + (i / (equity.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (e - min) / range) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const up = equity[equity.length - 1] >= equity[0];
  const stroke = up ? '#00C27A' : '#FF5252';
  const baselineY = pad + (1 - (equity[0] - min) / range) * (h - 2 * pad);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
      <line x1={pad} y1={baselineY} x2={w - pad} y2={baselineY} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}
