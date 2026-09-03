'use client';

import { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { EquityCurve } from '@/components/charts/EquityCurve';
import { cn, formatCurrency, formatPercent } from '@/lib/utils/format';
import {
  TrendingUp,
  Target,
  BarChart3,
  ArrowDownRight,
  Activity,
  Hash,
} from 'lucide-react';

interface Trade {
  realized_pnl: number;
  opened_at: string;
  closed_at: string;
  direction: string;
  size: number;
  symbol: string;
}

interface Props {
  trades: Trade[];
  balance: number;
}

export function PortfolioClient({ trades, balance }: Props) {
  const stats = useMemo(() => {
    if (trades.length === 0) return null;

    const wins = trades.filter((t) => t.realized_pnl > 0);
    const losses = trades.filter((t) => t.realized_pnl <= 0);
    const totalPnl = trades.reduce((s, t) => s + t.realized_pnl, 0);
    const grossProfit = wins.reduce((s, t) => s + t.realized_pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realized_pnl, 0));
    const winRate = (wins.length / trades.length) * 100;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Max drawdown
    let peak = balance;
    let maxDD = 0;
    let running = balance - totalPnl; // start balance
    for (const t of [...trades].reverse()) {
      running += t.realized_pnl;
      if (running > peak) peak = running;
      const dd = ((peak - running) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }

    // Sharpe (simplified daily returns)
    const dailyReturns: number[] = [];
    const byDay = new Map<string, number>();
    trades.forEach((t) => {
      const day = t.closed_at?.slice(0, 10) ?? '';
      byDay.set(day, (byDay.get(day) ?? 0) + t.realized_pnl);
    });
    byDay.forEach((v) => dailyReturns.push(v));
    const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / (dailyReturns.length || 1);
    const stdDev = Math.sqrt(
      dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (dailyReturns.length || 1)
    );
    const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    const totalReturn = balance > 0 ? (totalPnl / (balance - totalPnl || 1)) * 100 : 0;

    return {
      totalReturn,
      winRate,
      profitFactor,
      maxDD,
      sharpe,
      totalTrades: trades.length,
      totalPnl,
      wins: wins.length,
      losses: losses.length,
      grossProfit,
      grossLoss,
      avgWin: wins.length > 0 ? grossProfit / wins.length : 0,
      avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    };
  }, [trades, balance]);

  // Equity curve from trades
  const equityCurve = useMemo(() => {
    if (trades.length === 0) return [];
    const initial = balance - trades.reduce((s, t) => s + t.realized_pnl, 0);
    const sorted = [...trades].sort(
      (a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime()
    );
    let running = initial;
    return sorted.map((t) => {
      running += t.realized_pnl;
      return {
        date: new Date(t.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.round(running),
      };
    });
  }, [trades, balance]);

  // P&L heatmap calendar
  const heatmapData = useMemo(() => {
    const byDay = new Map<string, number>();
    trades.forEach((t) => {
      const day = t.closed_at?.slice(0, 10) ?? '';
      byDay.set(day, (byDay.get(day) ?? 0) + t.realized_pnl);
    });
    return byDay;
  }, [trades]);

  if (!stats) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-foreground">Performance Analytics</h1>
        <EmptyState
          icon={PieChart}
          title="No trade history yet"
          description="Complete some trades to see your performance analytics."
        />
      </div>
    );
  }

  // Build calendar grid for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-foreground">Performance Analytics</h1>

      {/* Top Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Return"
          value={formatPercent(stats.totalReturn)}
          change={stats.totalReturn}
          icon={TrendingUp}
        />
        <KpiCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={Target}
        />
        <KpiCard
          label="Profit Factor"
          value={stats.profitFactor === Infinity ? '---' : stats.profitFactor.toFixed(2)}
          icon={BarChart3}
        />
        <KpiCard
          label="Max Drawdown"
          value={`${stats.maxDD.toFixed(1)}%`}
          icon={ArrowDownRight}
        />
        <KpiCard
          label="Sharpe Ratio"
          value={stats.sharpe.toFixed(2)}
          icon={Activity}
        />
        <KpiCard
          label="Total Trades"
          value={stats.totalTrades.toString()}
          icon={Hash}
        />
      </div>

      {/* Equity Curve */}
      <div className="rounded-xl border border-border bg-elevated p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Equity Curve</h3>
        <EquityCurve data={equityCurve} height={240} />
      </div>

      {/* P&L Heatmap Calendar */}
      <div className="rounded-xl border border-border bg-elevated p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          P&L Calendar &mdash; {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium text-muted">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const pnl = heatmapData.get(dateStr);
            const isToday = day === now.getDate();

            return (
              <div
                key={day}
                className={cn(
                  'flex flex-col items-center justify-center rounded-md py-2 text-[10px]',
                  isToday && 'ring-1 ring-accent',
                  pnl === undefined
                    ? 'bg-surface/30'
                    : pnl > 0
                      ? 'bg-profit/15'
                      : pnl < 0
                        ? 'bg-loss/15'
                        : 'bg-surface/50'
                )}
              >
                <span className="text-muted">{day}</span>
                {pnl !== undefined && (
                  <span className={cn('mono font-semibold', pnl >= 0 ? 'text-profit' : 'text-loss')}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Win/Loss Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-elevated p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Win Statistics</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-secondary">Winning Trades</span><span className="text-profit font-medium">{stats.wins}</span></div>
            <div className="flex justify-between"><span className="text-secondary">Gross Profit</span><span className="text-profit mono font-medium">{formatCurrency(stats.grossProfit)}</span></div>
            <div className="flex justify-between"><span className="text-secondary">Average Win</span><span className="text-profit mono font-medium">{formatCurrency(stats.avgWin)}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-elevated p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Loss Statistics</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-secondary">Losing Trades</span><span className="text-loss font-medium">{stats.losses}</span></div>
            <div className="flex justify-between"><span className="text-secondary">Gross Loss</span><span className="text-loss mono font-medium">{formatCurrency(stats.grossLoss)}</span></div>
            <div className="flex justify-between"><span className="text-secondary">Average Loss</span><span className="text-loss mono font-medium">{formatCurrency(stats.avgLoss)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
