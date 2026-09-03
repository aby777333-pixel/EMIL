'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, Play, Pause, Square, Bug, Save, Settings,
  Terminal, BarChart3, FileCode, Plus, Trash2, Copy,
  ChevronRight, Zap, Clock, Cpu, HardDrive,
  TrendingUp, AlertTriangle, CheckCircle2, Download,
  Layers, Sparkles, RefreshCw,
} from 'lucide-react';
import type {
  ScriptFile, RuntimeInstance, BacktestResult, BacktestMetrics,
  BacktestTrade, CodeSnippet, OptimizationResult,
} from '@/types/raptor-script';
import { BUILT_IN_SNIPPETS } from '@/types/raptor-script';
import { pnlColor, formatCurrencyCompact } from '@/lib/utils/format';

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5">
      <div className="text-[9px] text-white/20 mb-0.5">{label}</div>
      <div className="text-sm font-mono font-bold" style={{ color: color ?? '#ffffff80' }}>{value}</div>
    </div>
  );
}

interface ScriptIDEProps {
  scripts: ScriptFile[];
  runtimes: RuntimeInstance[];
  backtestResults: BacktestResult[];
  onSave: (script: ScriptFile) => void;
  onRun: (scriptId: string) => void;
  onStop: (runtimeId: string) => void;
  onBacktest: (scriptId: string) => void;
}

export function ScriptIDE({ scripts, runtimes, backtestResults, onSave, onRun, onStop, onBacktest }: ScriptIDEProps) {
  const [tab, setTab] = useState<'editor' | 'runtimes' | 'backtest' | 'snippets'>('editor');
  const [selectedScript, setSelectedScript] = useState<ScriptFile | null>(scripts[0] ?? null);
  const [selectedBacktest, setSelectedBacktest] = useState<BacktestResult | null>(backtestResults[0] ?? null);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {([
            { key: 'editor', label: 'Script Editor', icon: <Code2 className="h-3.5 w-3.5" /> },
            { key: 'runtimes', label: `Live Instances (${runtimes.length})`, icon: <Zap className="h-3.5 w-3.5" /> },
            { key: 'backtest', label: 'Backtest Results', icon: <BarChart3 className="h-3.5 w-3.5" /> },
            { key: 'snippets', label: 'Snippets', icon: <Layers className="h-3.5 w-3.5" /> },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
              }`}>{t.icon}{t.label}</button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {tab === 'editor' && (
        <div className="grid grid-cols-12 gap-4">
          {/* File List */}
          <div className="col-span-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-1">
            <div className="text-[10px] text-white/25 font-medium mb-2 px-1">SCRIPTS</div>
            {scripts.map(s => (
              <button key={s.id} onClick={() => setSelectedScript(s)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  selectedScript?.id === s.id ? 'bg-white/[0.06] text-white' : 'text-white/40 hover:bg-white/[0.03]'
                }`}>
                <FileCode className="h-3.5 w-3.5 text-[#00b4ff]" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate">{s.name}</div>
                  <div className="text-[9px] text-white/15">{s.decorator} · v{s.version}</div>
                </div>
                {!s.isValid && <AlertTriangle className="h-3 w-3 text-[#ef4444]" />}
              </button>
            ))}
          </div>

          {/* Code Editor Area */}
          <div className="col-span-9 bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            {selectedScript ? (
              <>
                {/* Editor Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">{selectedScript.fileName}</span>
                    <span className="text-[9px] text-[#00b4ff] bg-[#00b4ff]/10 px-1.5 py-0.5 rounded">{selectedScript.decorator}</span>
                    {selectedScript.isValid
                      ? <CheckCircle2 className="h-3 w-3 text-[#00dc82]" />
                      : <span className="text-[9px] text-[#ef4444]">{selectedScript.errors.length} errors</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onBacktest(selectedScript.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8b5cf6]/10 text-[#8b5cf6] text-[10px] font-medium hover:bg-[#8b5cf6]/20">
                      <BarChart3 className="h-3 w-3" /> Backtest
                    </button>
                    <button onClick={() => onRun(selectedScript.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00dc82] text-white text-[10px] font-medium hover:bg-[#00dc82]/80">
                      <Play className="h-3 w-3" /> Deploy
                    </button>
                    <button onClick={() => onSave(selectedScript)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-white/40 text-[10px] font-medium hover:bg-white/10">
                      <Save className="h-3 w-3" /> Save
                    </button>
                  </div>
                </div>

                {/* Code Area (simulated Monaco) */}
                <div className="p-0 bg-[#0d1117] min-h-[400px] max-h-[500px] overflow-auto">
                  <pre className="p-4 text-xs font-mono leading-6 text-white/70 whitespace-pre-wrap">
                    {selectedScript.code}
                  </pre>
                </div>

                {/* Errors / Params */}
                {selectedScript.errors.length > 0 && (
                  <div className="px-4 py-2 border-t border-white/[0.06] bg-[#ef4444]/[0.03] max-h-24 overflow-y-auto">
                    {selectedScript.errors.map((err, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-[#ef4444] py-0.5">
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                        Line {err.line}:{err.column} — {err.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Parameters Panel */}
                {selectedScript.params.length > 0 && (
                  <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
                    <div className="text-[9px] text-white/20 font-medium mb-2">PARAMETERS</div>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedScript.params.map(p => (
                        <div key={p.name}>
                          <label className="text-[9px] text-white/25 block mb-0.5">{p.label}</label>
                          <input type={p.type === 'number' ? 'number' : 'text'}
                            defaultValue={String(p.defaultValue)}
                            step={p.step}
                            min={p.min} max={p.max}
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white/60 focus:border-[#00b4ff] focus:outline-none" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Code2 className="h-10 w-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/20">Select a script to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Runtimes */}
      {tab === 'runtimes' && (
        <div className="space-y-3">
          {runtimes.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/20">No scripts currently running</p>
            </div>
          ) : runtimes.map(rt => (
            <div key={rt.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5 py-4 flex items-center gap-4">
              <div className={`p-2 rounded-lg ${rt.status === 'running' ? 'bg-[#00dc82]/10' : rt.status === 'error' ? 'bg-[#ef4444]/10' : 'bg-white/5'}`}>
                {rt.status === 'running' ? <Zap className="h-4 w-4 text-[#00dc82]" /> :
                 rt.status === 'error' ? <AlertTriangle className="h-4 w-4 text-[#ef4444]" /> :
                 <Pause className="h-4 w-4 text-white/30" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{rt.scriptName}</div>
                <div className="text-[10px] text-white/25">{rt.instrument} · {rt.timeframe} · {rt.uptime} uptime</div>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <span className="text-white/25" title="CPU"><Cpu className="h-3 w-3 inline mr-1" />{rt.cpuUsage.toFixed(0)}%</span>
                <span className="text-white/25" title="Memory"><HardDrive className="h-3 w-3 inline mr-1" />{rt.memoryMb.toFixed(0)}MB</span>
                <span className="text-white/25" title="Trades">{rt.tradesExecuted} trades</span>
                <span className={pnlColor(rt.pnl)}>{rt.pnl >= 0 ? '+' : ''}{formatCurrencyCompact(rt.pnl)}</span>
              </div>
              <button onClick={() => onStop(rt.id)} className="p-1.5 rounded-lg bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20">
                <Square className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Backtest Results */}
      {tab === 'backtest' && selectedBacktest?.metrics && (
        <div className="space-y-5">
          {/* Backtest Selector */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {backtestResults.map(bt => (
              <button key={bt.id} onClick={() => setSelectedBacktest(bt)}
                className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  selectedBacktest?.id === bt.id ? 'bg-[#00b4ff]/10 border border-[#00b4ff]/30 text-white' : 'bg-white/[0.03] border border-white/[0.06] text-white/40'
                }`}>
                {bt.config.symbol} · {bt.config.timeframe} · {new Date(bt.startedAt).toLocaleDateString()}
              </button>
            ))}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-6 gap-2">
            <MetricCard label="Net Profit" value={formatCurrencyCompact(selectedBacktest.metrics.netProfit)} color={selectedBacktest.metrics.netProfit >= 0 ? '#00dc82' : '#ef4444'} />
            <MetricCard label="Profit Factor" value={selectedBacktest.metrics.profitFactor.toFixed(2)} color={selectedBacktest.metrics.profitFactor >= 1.5 ? '#00dc82' : '#f59e0b'} />
            <MetricCard label="Win Rate" value={`${selectedBacktest.metrics.winRate.toFixed(1)}%`} color={selectedBacktest.metrics.winRate >= 55 ? '#00dc82' : '#f59e0b'} />
            <MetricCard label="Max DD" value={`${selectedBacktest.metrics.maxDrawdownPct.toFixed(1)}%`} color="#ef4444" />
            <MetricCard label="Sharpe" value={selectedBacktest.metrics.sharpeRatio.toFixed(2)} color={selectedBacktest.metrics.sharpeRatio >= 1.5 ? '#00dc82' : '#f59e0b'} />
            <MetricCard label="Total Trades" value={String(selectedBacktest.metrics.totalTrades)} />
          </div>

          <div className="grid grid-cols-6 gap-2">
            <MetricCard label="Avg Win" value={formatCurrencyCompact(selectedBacktest.metrics.avgWin)} color="#00dc82" />
            <MetricCard label="Avg Loss" value={formatCurrencyCompact(selectedBacktest.metrics.avgLoss)} color="#ef4444" />
            <MetricCard label="Recovery" value={selectedBacktest.metrics.recoveryFactor.toFixed(2)} />
            <MetricCard label="Sortino" value={selectedBacktest.metrics.sortinoRatio.toFixed(2)} />
            <MetricCard label="Calmar" value={selectedBacktest.metrics.calmarRatio.toFixed(2)} />
            <MetricCard label="Expectancy" value={formatCurrencyCompact(selectedBacktest.metrics.expectancy)} color={selectedBacktest.metrics.expectancy >= 0 ? '#00dc82' : '#ef4444'} />
          </div>

          {/* Equity Curve */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-xs font-medium text-white/50 mb-3">Equity Curve</h4>
            <div className="h-40 flex items-end gap-[1px]">
              {selectedBacktest.equityCurve.map((pt, i) => {
                const max = Math.max(...selectedBacktest.equityCurve.map(p => p.equity));
                const min = Math.min(...selectedBacktest.equityCurve.map(p => p.equity));
                const range = max - min || 1;
                const h = ((pt.equity - min) / range) * 100;
                return (
                  <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.003 }}
                    className="flex-1 rounded-t-sm bg-[#00b4ff]/50 min-w-[1px]" />
                );
              })}
            </div>
          </div>

          {/* Monthly Returns */}
          {selectedBacktest.monthlyReturns.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <h4 className="text-xs font-medium text-white/50 mb-3">Monthly Returns</h4>
              <div className="grid grid-cols-12 gap-1">
                {['J','F','M','A','M','J','J','A','S','O','N','D'].map(m => (
                  <div key={m} className="text-[8px] text-white/15 text-center">{m}</div>
                ))}
                {selectedBacktest.monthlyReturns.map((mr, i) => (
                  <div key={i} className="rounded-sm text-center py-1.5 text-[8px] font-mono"
                    style={{ backgroundColor: mr.returnPct >= 0 ? `rgba(0,220,130,${Math.min(Math.abs(mr.returnPct)/15,0.5)})` : `rgba(239,68,68,${Math.min(Math.abs(mr.returnPct)/15,0.5)})`, color: mr.returnPct >= 0 ? '#00dc82' : '#ef4444' }}>
                    {mr.returnPct >= 0 ? '+' : ''}{mr.returnPct.toFixed(1)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10">
              <Download className="h-3 w-3" /> PDF Report
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10">
              <Download className="h-3 w-3" /> CSV Trades
            </button>
          </div>
        </div>
      )}

      {/* Snippets */}
      {tab === 'snippets' && (
        <div className="grid grid-cols-2 gap-3">
          {BUILT_IN_SNIPPETS.map(snippet => (
            <div key={snippet.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-white">{snippet.name}</h4>
                  <p className="text-[10px] text-white/25">{snippet.description}</p>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#00b4ff]/10 text-[#00b4ff] capitalize">{snippet.category}</span>
              </div>
              <pre className="bg-[#0d1117] rounded-lg p-3 text-[10px] font-mono text-[#00b4ff]/60 leading-4 overflow-x-auto max-h-24">{snippet.code}</pre>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1">
                  {snippet.tags.map(t => <span key={t} className="text-[7px] px-1 py-0.5 rounded bg-white/5 text-white/15">{t}</span>)}
                </div>
                <button className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50">
                  <Copy className="h-2.5 w-2.5" /> Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
