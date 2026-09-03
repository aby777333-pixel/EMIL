'use client';

import { useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Activity,
  Percent,
} from 'lucide-react';

interface Trade {
  id: number;
  date: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  size: number;
  entry: number;
  exit: number;
  pnl: number;
}

interface BacktestStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  netProfit: number;
  sharpeRatio: number;
}

// Deterministic pseudo-random generator
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSimulatedData(): { trades: Trade[]; stats: BacktestStats; equityCurve: { time: string; value: number }[]; monthlyPnl: { month: string; pnl: number }[] } {
  const rand = seededRandom(42);
  const trades: Trade[] = [];
  const baseDate = new Date(2025, 6, 1);
  let equity = 10000;
  const equityCurve: { time: string; value: number }[] = [
    { time: '2025-07-01', value: 10000 },
  ];

  let wins = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let maxEquity = 10000;
  let maxDD = 0;

  const monthlyMap: Record<string, number> = {};

  for (let i = 0; i < 50; i++) {
    const daysOffset = Math.floor(rand() * 85) + 1 + i;
    const tradeDate = new Date(baseDate.getTime() + daysOffset * 86400000);
    const dateStr = tradeDate.toISOString().split('T')[0];
    const monthKey = dateStr.substring(0, 7);

    const isBuy = rand() > 0.5;
    const basePrice = 1.08 + rand() * 0.04;
    const pipSize = 0.0001;
    const pips = (rand() * 60 - 20) * (rand() > 0.4 ? 1 : -1);
    const exitPrice = isBuy
      ? basePrice + pips * pipSize
      : basePrice - pips * pipSize;
    const pnl = parseFloat((pips * 10 * 0.1).toFixed(2));

    trades.push({
      id: i + 1,
      date: dateStr,
      type: isBuy ? 'BUY' : 'SELL',
      symbol: 'EURUSD',
      size: 0.1,
      entry: parseFloat(basePrice.toFixed(5)),
      exit: parseFloat(exitPrice.toFixed(5)),
      pnl,
    });

    equity += pnl;
    if (pnl > 0) {
      wins++;
      totalProfit += pnl;
    } else {
      totalLoss += Math.abs(pnl);
    }

    if (equity > maxEquity) maxEquity = equity;
    const dd = ((maxEquity - equity) / maxEquity) * 100;
    if (dd > maxDD) maxDD = dd;

    equityCurve.push({ time: dateStr, value: parseFloat(equity.toFixed(2)) });
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + pnl;
  }

  // Sort trades by date
  trades.sort((a, b) => a.date.localeCompare(b.date));

  const netProfit = parseFloat((equity - 10000).toFixed(2));
  const winRate = parseFloat(((wins / 50) * 100).toFixed(1));
  const profitFactor = totalLoss > 0 ? parseFloat((totalProfit / totalLoss).toFixed(2)) : 0;

  // Simple Sharpe approximation
  const returns = trades.map((t) => t.pnl);
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const stdReturn = Math.sqrt(
    returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length
  );
  const sharpe = stdReturn > 0 ? parseFloat((avgReturn / stdReturn * Math.sqrt(252)).toFixed(2)) : 0;

  const monthlyPnl = Object.entries(monthlyMap)
    .map(([month, pnl]) => ({ month, pnl: parseFloat(pnl.toFixed(2)) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    trades,
    stats: {
      totalTrades: 50,
      winRate,
      profitFactor,
      maxDrawdown: parseFloat(maxDD.toFixed(2)),
      netProfit,
      sharpeRatio: sharpe,
    },
    equityCurve,
    monthlyPnl,
  };
}

interface BacktestResultsProps {
  hasResults: boolean;
}

export default function BacktestResults({ hasResults }: BacktestResultsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);

  const data = useMemo(() => {
    if (!hasResults) return null;
    return generateSimulatedData();
  }, [hasResults]);

  useEffect(() => {
    if (!hasResults || !data || !chartRef.current) return;

    let disposed = false;

    async function initChart() {
      const lc = await import('lightweight-charts');
      if (disposed || !chartRef.current) return;

      if (chartInstance.current) {
        chartInstance.current.remove();
        chartInstance.current = null;
      }

      const chart = lc.createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: 180,
        layout: {
          background: { color: '#0D0D14' },
          textColor: '#555',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: '#1A1A25' },
          horzLines: { color: '#1A1A25' },
        },
        rightPriceScale: {
          borderColor: '#1E1E2E',
        },
        timeScale: {
          borderColor: '#1E1E2E',
          timeVisible: false,
        },
        crosshair: {
          horzLine: { color: '#0091D544' },
          vertLine: { color: '#0091D544' },
        },
      });

      const series = chart.addSeries(lc.LineSeries, {
        color: '#00C853',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });

      series.setData(
        data!.equityCurve.map((p) => ({
          time: p.time as import('lightweight-charts').Time,
          value: p.value,
        }))
      );

      chart.timeScale().fitContent();
      chartInstance.current = chart;

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      });
      ro.observe(chartRef.current);
    }

    initChart();

    return () => {
      disposed = true;
      if (chartInstance.current) {
        chartInstance.current.remove();
        chartInstance.current = null;
      }
    };
  }, [hasResults, data]);

  if (!hasResults || !data) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ backgroundColor: '#111118' }}
      >
        <BarChart3 size={32} style={{ color: '#333' }} />
        <span className="text-[12px]" style={{ color: '#555' }}>
          Run a backtest to see results
        </span>
        <span className="text-[10px]" style={{ color: '#3A3A4A' }}>
          Configure parameters and click &quot;Run Backtest&quot;
        </span>
      </div>
    );
  }

  const { trades, stats, monthlyPnl } = data;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ backgroundColor: '#111118' }}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 p-3">
        <StatCard
          icon={<BarChart3 size={13} />}
          label="Total Trades"
          value={stats.totalTrades.toString()}
          color="#0091D5"
        />
        <StatCard
          icon={<Target size={13} />}
          label="Win Rate"
          value={`${stats.winRate}%`}
          color={stats.winRate >= 50 ? '#00C853' : '#FF5252'}
        />
        <StatCard
          icon={<Activity size={13} />}
          label="Profit Factor"
          value={stats.profitFactor.toString()}
          color={stats.profitFactor >= 1 ? '#00C853' : '#FF5252'}
        />
        <StatCard
          icon={<TrendingDown size={13} />}
          label="Max Drawdown"
          value={`${stats.maxDrawdown}%`}
          color="#FF5252"
        />
        <StatCard
          icon={<TrendingUp size={13} />}
          label="Net Profit"
          value={`$${stats.netProfit.toFixed(2)}`}
          color={stats.netProfit >= 0 ? '#00C853' : '#FF5252'}
        />
        <StatCard
          icon={<Percent size={13} />}
          label="Sharpe Ratio"
          value={stats.sharpeRatio.toString()}
          color={stats.sharpeRatio >= 1 ? '#00C853' : '#FFC107'}
        />
      </div>

      {/* Equity Curve Chart */}
      <div className="px-3 pb-2">
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-1"
          style={{ color: '#666' }}
        >
          Equity Curve
        </div>
        <div
          ref={chartRef}
          className="rounded overflow-hidden"
          style={{
            height: 180,
            border: '1px solid #1E1E2E',
          }}
        />
      </div>

      {/* Monthly Breakdown */}
      <div className="px-3 pb-2">
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: '#666' }}
        >
          Monthly P&L
        </div>
        <div
          className="flex items-end gap-1 p-2 rounded"
          style={{
            height: 80,
            backgroundColor: '#0D0D14',
            border: '1px solid #1E1E2E',
          }}
        >
          {monthlyPnl.map((m) => {
            const maxAbsPnl = Math.max(...monthlyPnl.map((x) => Math.abs(x.pnl)), 1);
            const barHeight = Math.max((Math.abs(m.pnl) / maxAbsPnl) * 52, 4);
            const isPositive = m.pnl >= 0;
            return (
              <div
                key={m.month}
                className="flex-1 flex flex-col items-center gap-0.5"
              >
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: barHeight,
                    backgroundColor: isPositive ? '#00C853' : '#FF5252',
                    opacity: 0.8,
                    minWidth: 8,
                  }}
                  title={`${m.month}: $${m.pnl.toFixed(2)}`}
                />
                <span
                  className="text-[8px] font-mono"
                  style={{ color: '#4A4A5A' }}
                >
                  {m.month.split('-')[1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trade List */}
      <div className="px-3 pb-3">
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-1"
          style={{ color: '#666' }}
        >
          Trade History
        </div>
        <div
          className="rounded overflow-hidden"
          style={{
            border: '1px solid #1E1E2E',
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr style={{ backgroundColor: '#0D0D14' }}>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Symbol</Th>
                <Th>Size</Th>
                <Th>Entry</Th>
                <Th>Exit</Th>
                <Th align="right">P&L</Th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr
                  key={t.id}
                  className="border-t"
                  style={{ borderColor: '#1A1A25' }}
                >
                  <Td>{t.date}</Td>
                  <Td>
                    <span
                      style={{
                        color: t.type === 'BUY' ? '#00C853' : '#FF5252',
                        fontWeight: 600,
                      }}
                    >
                      {t.type}
                    </span>
                  </Td>
                  <Td>{t.symbol}</Td>
                  <Td>{t.size.toFixed(2)}</Td>
                  <Td>{t.entry.toFixed(5)}</Td>
                  <Td>{t.exit.toFixed(5)}</Td>
                  <Td align="right">
                    <span
                      style={{
                        color: t.pnl >= 0 ? '#00C853' : '#FF5252',
                        fontWeight: 600,
                      }}
                    >
                      {t.pnl >= 0 ? '+' : ''}
                      {t.pnl.toFixed(2)}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded p-2 flex flex-col gap-1"
      style={{
        backgroundColor: '#0D0D14',
        border: '1px solid #1E1E2E',
      }}
    >
      <div className="flex items-center gap-1" style={{ color: '#555' }}>
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <span
        className="text-[14px] font-bold font-mono"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className="px-2 py-1.5 font-semibold"
      style={{
        color: '#555',
        textAlign: align,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <td
      className="px-2 py-1"
      style={{
        color: '#AAAAAA',
        textAlign: align,
      }}
    >
      {children}
    </td>
  );
}
