import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import type { EquityPoint, Trade, BacktestMetrics } from '../types';
import { SectionTitle, fmtMoney } from './ui';

const axis = { stroke: '#64748b', fontSize: 10 };
const grid = '#1e2d4a';

function tooltipStyle() {
  return {
    contentStyle: {
      background: '#0f1629',
      border: '1px solid #1e2d4a',
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: '#64748b' },
  };
}

export function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  const chartData = useMemo(
    () =>
      data.map((d, i) => ({
        i,
        label: d.time ? format(new Date(d.time), 'MMM d') : `${i}`,
        equity: d.equity,
        benchmark: d.benchmark,
      })),
    [data],
  );
  return (
    <div>
      <SectionTitle>Equity Curve</SectionTitle>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="label" {...axis} minTickGap={40} />
          <YAxis {...axis} domain={['auto', 'auto']} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip {...tooltipStyle()} formatter={(v: number) => `$${fmtMoney(v)}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {chartData.some((d) => d.benchmark != null) && (
            <Area
              type="monotone"
              dataKey="benchmark"
              name="Benchmark"
              stroke="#64748b"
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="equity"
            name="Strategy"
            stroke="#00d4ff"
            fill="url(#eq)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DrawdownChart({ data }: { data: EquityPoint[] }) {
  const chartData = useMemo(() => {
    let peak = -Infinity;
    return data.map((d, i) => {
      peak = Math.max(peak, d.equity);
      const dd = d.drawdown != null ? d.drawdown : ((d.equity - peak) / peak) * 100;
      return { i, label: d.time ? format(new Date(d.time), 'MMM d') : `${i}`, drawdown: Number(dd.toFixed(2)) };
    });
  }, [data]);
  return (
    <div>
      <SectionTitle>Drawdown</SectionTitle>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="dd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4444" stopOpacity={0} />
              <stop offset="100%" stopColor="#ff4444" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="label" {...axis} minTickGap={40} />
          <YAxis {...axis} tickFormatter={(v) => `${v}%`} />
          <Tooltip {...tooltipStyle()} formatter={(v: number) => `${v}%`} />
          <Area type="monotone" dataKey="drawdown" stroke="#ff4444" fill="url(#dd)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TradeScatter({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => trades.map((t, i) => ({ i, pnl: t.pnl })), [trades]);
  return (
    <div>
      <SectionTitle>Trade P&L Distribution</SectionTitle>
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="i" name="Trade" {...axis} />
          <YAxis dataKey="pnl" name="P&L" {...axis} tickFormatter={(v) => `$${v}`} />
          <Tooltip {...tooltipStyle()} formatter={(v: number) => `$${fmtMoney(v)}`} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pnl >= 0 ? '#00ff88' : '#ff4444'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyHeatmap({ equity }: { equity: EquityPoint[] }) {
  // Derive monthly returns from the equity curve
  const rows = useMemo(() => {
    if (!equity.length) return [];
    const byMonth: Record<string, { first: number; last: number }> = {};
    for (const p of equity) {
      if (!p.time) continue;
      const d = new Date(p.time);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!byMonth[key]) byMonth[key] = { first: p.equity, last: p.equity };
      byMonth[key].last = p.equity;
    }
    const byYear: Record<number, (number | null)[]> = {};
    for (const [key, v] of Object.entries(byMonth)) {
      const [y, m] = key.split('-').map(Number);
      byYear[y] ||= Array(12).fill(null);
      byYear[y][m] = ((v.last - v.first) / v.first) * 100;
    }
    return Object.entries(byYear).map(([year, months]) => ({ year, months }));
  }, [equity]);

  const cell = (v: number | null) => {
    if (v == null) return 'bg-border/30 text-transparent';
    const abs = Math.min(Math.abs(v) / 8, 1);
    if (v >= 0) return '';
    return '';
  };
  const bg = (v: number | null) => {
    if (v == null) return 'rgba(30,45,74,0.3)';
    const abs = Math.min(Math.abs(v) / 8, 1);
    return v >= 0 ? `rgba(0,255,136,${0.15 + abs * 0.6})` : `rgba(255,68,68,${0.15 + abs * 0.6})`;
  };

  const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  return (
    <div>
      <SectionTitle>Monthly Returns</SectionTitle>
      <div className="overflow-x-auto">
        <table className="text-[10px] w-full">
          <thead>
            <tr className="text-subtext">
              <th className="text-left pr-2">Year</th>
              {MONTHS.map((m, i) => (
                <th key={i} className="px-1 font-medium">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <td className="text-subtext pr-2 font-mono">{r.year}</td>
                {r.months.map((v, i) => (
                  <td key={i} className="p-0.5">
                    <div
                      className={`h-6 rounded flex items-center justify-center font-mono ${cell(v)}`}
                      style={{ background: bg(v) }}
                      title={v != null ? `${v.toFixed(1)}%` : ''}
                    >
                      {v != null ? v.toFixed(0) : ''}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const METRIC_ROWS: { key: keyof BacktestMetrics; label: string; suffix?: string }[] = [
  { key: 'cagr_pct', label: 'CAGR', suffix: '%' },
  { key: 'total_return_pct', label: 'Total Return', suffix: '%' },
  { key: 'sharpe', label: 'Sharpe' },
  { key: 'sortino', label: 'Sortino' },
  { key: 'calmar', label: 'Calmar' },
  { key: 'win_rate_pct', label: 'Win Rate', suffix: '%' },
  { key: 'profit_factor', label: 'Profit Factor' },
  { key: 'avg_trade', label: 'Avg Trade', suffix: '$' },
  { key: 'max_drawdown_pct', label: 'Max Drawdown', suffix: '%' },
  { key: 'max_consecutive_losses', label: 'Max Consec Losses' },
  { key: 'num_trades', label: 'Trades' },
];

export function MetricsTable({ metrics }: { metrics: BacktestMetrics }) {
  return (
    <div>
      <SectionTitle>Performance Metrics</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {METRIC_ROWS.map((m) => {
          const v = metrics[m.key];
          const isDd = m.key === 'max_drawdown_pct';
          const color =
            v == null
              ? 'text-subtext'
              : isDd
                ? 'text-danger'
                : typeof v === 'number' && v < 0
                  ? 'text-danger'
                  : 'text-success';
          return (
            <div key={m.key} className="glass !rounded-lg p-2.5 border border-border">
              <div className="text-[10px] text-subtext uppercase tracking-wide">{m.label}</div>
              <div className={`text-sm font-bold font-mono ${color}`}>
                {v == null ? '—' : `${m.suffix === '$' ? '$' : ''}${typeof v === 'number' ? fmtMoney(v, m.suffix === '$' ? 2 : 2) : v}${m.suffix && m.suffix !== '$' ? m.suffix : ''}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
