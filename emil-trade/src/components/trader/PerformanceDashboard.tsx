'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, BarChart3, Calendar,
  Target, Award, Zap, Clock, PieChart,
} from 'lucide-react';
import type { PerformanceStats, MonthlyReturn, TradeDistribution, EquityPoint } from '@/types/trader';

function StatCard({ label, value, color, icon, format }: {
  label: string; value: number; color: string; icon: React.ReactNode; format?: 'pct' | 'usd' | 'ratio' | 'num' | 'days';
}) {
  const formatted = format === 'pct' ? `${value.toFixed(1)}%` :
    format === 'usd' ? `$${Math.abs(value) >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toFixed(2)}` :
    format === 'ratio' ? value.toFixed(2) :
    format === 'days' ? `${value}d` :
    value.toLocaleString();

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
        <span className="text-[10px] text-white/30">{label}</span>
      </div>
      <div className="text-lg font-mono font-bold" style={{ color }}>{formatted}</div>
    </div>
  );
}

interface PerformanceDashboardProps {
  stats: PerformanceStats;
  monthlyReturns: MonthlyReturn[];
  equityCurve: EquityPoint[];
  distributions: { bySymbol: TradeDistribution[]; byHour: TradeDistribution[]; byDay: TradeDistribution[] };
}

export function PerformanceDashboard({ stats, monthlyReturns, equityCurve, distributions }: PerformanceDashboardProps) {
  const [tab, setTab] = useState<'overview' | 'monthly' | 'distribution'>('overview');

  return (
    <div className="space-y-5">
      {/* Stat Grid */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Win Rate" value={stats.winRate} color="#00dc82" icon={<Target className="h-3 w-3" />} format="pct" />
        <StatCard label="Profit Factor" value={stats.profitFactor} color={stats.profitFactor >= 1.5 ? '#00dc82' : '#f59e0b'} icon={<TrendingUp className="h-3 w-3" />} format="ratio" />
        <StatCard label="Max Drawdown" value={stats.maxDrawdownPct} color="#ef4444" icon={<TrendingDown className="h-3 w-3" />} format="pct" />
        <StatCard label="Sharpe Ratio" value={stats.sharpeRatio} color="#00b4ff" icon={<BarChart3 className="h-3 w-3" />} format="ratio" />
        <StatCard label="Total Trades" value={stats.totalTrades} color="#8b5cf6" icon={<Zap className="h-3 w-3" />} format="num" />
      </div>

      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Avg Win" value={stats.avgWin} color="#00dc82" icon={<TrendingUp className="h-3 w-3" />} format="usd" />
        <StatCard label="Avg Loss" value={stats.avgLoss} color="#ef4444" icon={<TrendingDown className="h-3 w-3" />} format="usd" />
        <StatCard label="Expectancy" value={stats.expectancy} color={stats.expectancy > 0 ? '#00dc82' : '#ef4444'} icon={<Target className="h-3 w-3" />} format="usd" />
        <StatCard label="Recovery Factor" value={stats.recoveryFactor} color="#f59e0b" icon={<Award className="h-3 w-3" />} format="ratio" />
        <StatCard label="Avg Hold Time" value={parseFloat(stats.avgHoldTime) || 0} color="#6b7280" icon={<Clock className="h-3 w-3" />} format="days" />
      </div>

      {/* Equity Curve */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Equity Curve</h3>
        <div className="h-48 flex items-end gap-[1px]">
          {equityCurve.map((point, i) => {
            const maxEquity = Math.max(...equityCurve.map(p => p.equity));
            const minEquity = Math.min(...equityCurve.map(p => p.equity));
            const range = maxEquity - minEquity || 1;
            const height = ((point.equity - minEquity) / range) * 100;
            const isUp = i > 0 && point.equity >= equityCurve[i - 1].equity;

            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: i * 0.005, duration: 0.3 }}
                className="flex-1 min-w-[1px] rounded-t-sm"
                style={{ backgroundColor: isUp ? '#00dc82' : '#ef4444', opacity: 0.7 }}
                title={`${point.timestamp}: $${point.equity.toFixed(2)}`}
              />
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {(['overview', 'monthly', 'distribution'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* Monthly Returns Heatmap */}
      {tab === 'monthly' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
            <Calendar className="h-4 w-4 text-white/40" />
            Monthly Returns
          </h3>
          <div className="grid grid-cols-12 gap-1">
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
              <div key={m} className="text-[9px] text-white/20 text-center py-1">{m}</div>
            ))}
            {monthlyReturns.map((mr, i) => {
              const intensity = Math.min(Math.abs(mr.returnPct) / 10, 1);
              const bg = mr.returnPct >= 0
                ? `rgba(0, 220, 130, ${intensity * 0.6})`
                : `rgba(239, 68, 68, ${intensity * 0.6})`;
              return (
                <motion.div
                  key={`${mr.year}-${mr.month}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-sm text-center py-2"
                  style={{ backgroundColor: bg }}
                  title={`${mr.year}-${String(mr.month).padStart(2, '0')}: ${mr.returnPct >= 0 ? '+' : ''}${mr.returnPct.toFixed(1)}%`}
                >
                  <span className="text-[9px] font-mono text-white/80">
                    {mr.returnPct >= 0 ? '+' : ''}{mr.returnPct.toFixed(1)}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distribution */}
      {tab === 'distribution' && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: 'By Symbol', data: distributions.bySymbol },
            { title: 'By Hour', data: distributions.byHour },
            { title: 'By Day', data: distributions.byDay },
          ].map(({ title, data }) => (
            <div key={title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <h4 className="flex items-center gap-2 text-xs font-medium text-white/50 mb-3">
                <PieChart className="h-3.5 w-3.5" />{title}
              </h4>
              <div className="space-y-2">
                {data.slice(0, 8).map(d => {
                  const maxCount = Math.max(...data.map(x => x.count));
                  return (
                    <div key={d.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 w-12 shrink-0">{d.label}</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#00b4ff]"
                          style={{ width: `${(d.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-white/30 w-8 text-right">{d.count}</span>
                      <span className={`text-[10px] font-mono w-12 text-right ${d.pnl >= 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
                        {d.pnl >= 0 ? '+' : ''}{d.pnl.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Streaks & Best/Worst (overview tab) */}
      {tab === 'overview' && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="text-[10px] text-white/25 mb-1">Best Trade</div>
            <div className="text-sm font-mono font-bold text-[#00dc82]">${stats.bestTrade.toFixed(2)}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="text-[10px] text-white/25 mb-1">Worst Trade</div>
            <div className="text-sm font-mono font-bold text-[#ef4444]">${stats.worstTrade.toFixed(2)}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="text-[10px] text-white/25 mb-1">Win Streak</div>
            <div className="text-sm font-mono font-bold text-[#00dc82]">{stats.longestWinStreak}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="text-[10px] text-white/25 mb-1">Lose Streak</div>
            <div className="text-sm font-mono font-bold text-[#ef4444]">{stats.longestLoseStreak}</div>
          </div>
        </div>
      )}
    </div>
  );
}
