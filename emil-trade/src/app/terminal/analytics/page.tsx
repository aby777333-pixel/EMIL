'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart3,
  Download,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  AlertTriangle,
  Hash,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { createClient } from '@/lib/supabase/client';
import { useTradingStore } from '@/stores/trading';
import { formatCurrency, formatPnL, cn } from '@/lib/utils/format';
import type { Position } from '@/types/trading';
import { createChart, LineSeries, type IChartApi } from 'lightweight-charts';

// ── Mock data for when Supabase isn't configured ──
function generateMockHistory(): Position[] {
  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'NAS100', 'US30', 'USOIL'];
  const trades: Position[] = [];
  const now = Date.now();
  for (let i = 0; i < 60; i++) {
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const dir = Math.random() > 0.5 ? 'BUY' : 'SELL' as const;
    const openPrice = sym === 'XAUUSD' ? 2300 + Math.random() * 80 :
      sym === 'BTCUSD' ? 60000 + Math.random() * 10000 :
      sym === 'USDJPY' ? 150 + Math.random() * 5 :
      sym.includes('US30') ? 39000 + Math.random() * 1000 :
      sym.includes('NAS') ? 17000 + Math.random() * 1000 :
      sym === 'USOIL' ? 75 + Math.random() * 5 :
      1.0 + Math.random() * 0.3;
    const pnl = (Math.random() - 0.42) * 500;
    const daysAgo = Math.floor(Math.random() * 365);
    const openDate = new Date(now - daysAgo * 86400000);
    const closeDate = new Date(openDate.getTime() + (Math.random() * 48 + 1) * 3600000);
    trades.push({
      id: `mock-${i}`,
      account_id: 'acc-1',
      symbol: sym,
      direction: dir,
      size: [0.01, 0.05, 0.1, 0.5, 1.0][Math.floor(Math.random() * 5)],
      open_price: openPrice,
      close_price: openPrice + (dir === 'BUY' ? pnl / 100 : -pnl / 100),
      current_price: openPrice,
      sl: null,
      tp: null,
      commission: -0.5,
      swap_accrued: 0,
      floating_pnl: 0,
      realized_pnl: pnl,
      status: 'closed',
      opened_at: openDate.toISOString(),
      closed_at: closeDate.toISOString(),
    });
  }
  return trades.sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());
}

type SortKey = 'symbol' | 'direction' | 'size' | 'open_price' | 'close_price' | 'realized_pnl' | 'closed_at';

export default function AnalyticsPage() {
  const { activeAccountId } = useTradingStore();
  const [trades, setTrades] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('closed_at');
  const [sortAsc, setSortAsc] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Load closed positions
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const supabase = createClient();
        const accId = activeAccountId ?? 'acc-1';
        const { data, error } = await supabase
          .from('positions')
          .select('*')
          .eq('account_id', accId)
          .eq('status', 'closed')
          .order('closed_at', { ascending: true });
        if (error) throw error;
        if (!cancelled && data && data.length > 0) {
          setTrades(data as Position[]);
        } else if (!cancelled) {
          setTrades(generateMockHistory());
        }
      } catch {
        if (!cancelled) setTrades(generateMockHistory());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeAccountId]);

  // ── Stats calculations ──
  const stats = useMemo(() => {
    if (trades.length === 0) return null;
    const pnls = trades.map(t => t.realized_pnl ?? 0);
    const totalReturn = pnls.reduce((s, v) => s + v, 0);
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const winRate = (wins.length / pnls.length) * 100;
    const grossProfit = wins.reduce((s, v) => s + v, 0);
    const grossLoss = Math.abs(losses.reduce((s, v) => s + v, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgReturn = totalReturn / pnls.length;
    const stdDev = Math.sqrt(pnls.reduce((s, v) => s + (v - avgReturn) ** 2, 0) / pnls.length);
    const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    let peak = 0, maxDD = 0, running = 0;
    for (const p of pnls) {
      running += p;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    }
    const initialBalance = 10000;
    const totalReturnPct = (totalReturn / initialBalance) * 100;
    const maxDDPct = peak > 0 ? (maxDD / peak) * 100 : 0;
    return { totalReturn, totalReturnPct, winRate, profitFactor, sharpe, maxDDPct, totalTrades: pnls.length };
  }, [trades]);

  // ── Equity curve data ──
  const equityCurve = useMemo(() => {
    const initialBalance = 10000;
    let equity = initialBalance;
    return trades.map(t => {
      equity += t.realized_pnl ?? 0;
      const d = new Date(t.closed_at!);
      return { time: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, value: equity };
    });
  }, [trades]);

  // ── Equity chart ──
  useEffect(() => {
    if (!chartContainerRef.current || equityCurve.length === 0) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 280,
      layout: { background: { color: '#111118' }, textColor: '#A0A0A8', fontSize: 11 },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.06)' },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;
    const series = chart.addSeries(LineSeries, {
      color: '#0091D5',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    // Deduplicate by time (use last value for each day)
    const deduped = new Map<string, number>();
    for (const pt of equityCurve) deduped.set(pt.time, pt.value);
    const dedupedArr = Array.from(deduped.entries()).map(([time, value]) => ({ time, value }));
    series.setData(dedupedArr as { time: string; value: number }[]);
    chart.timeScale().fitContent();
    const handleResize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); chartRef.current = null; };
  }, [equityCurve]);

  // ── Calendar heatmap ──
  const calendarData = useMemo(() => {
    const year = new Date().getFullYear();
    const dailyPnl: Record<string, number> = {};
    for (const t of trades) {
      const d = new Date(t.closed_at!);
      if (d.getFullYear() === year) {
        const key = `${d.getMonth()}-${d.getDate()}`;
        dailyPnl[key] = (dailyPnl[key] ?? 0) + (t.realized_pnl ?? 0);
      }
    }
    return dailyPnl;
  }, [trades]);

  // ── PnL by symbol ──
  const symbolPnl = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trades) {
      map[t.symbol] = (map[t.symbol] ?? 0) + (t.realized_pnl ?? 0);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [trades]);

  const maxAbsPnl = useMemo(() => {
    if (symbolPnl.length === 0) return 1;
    return Math.max(...symbolPnl.map(([, v]) => Math.abs(v)), 1);
  }, [symbolPnl]);

  // ── Sorting ──
  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }, [sortKey, sortAsc]);

  const sortedTrades = useMemo(() => {
    const arr = [...trades];
    arr.sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      switch (sortKey) {
        case 'symbol': va = a.symbol; vb = b.symbol; break;
        case 'direction': va = a.direction; vb = b.direction; break;
        case 'size': va = a.size; vb = b.size; break;
        case 'open_price': va = a.open_price; vb = b.open_price; break;
        case 'close_price': va = a.close_price ?? 0; vb = b.close_price ?? 0; break;
        case 'realized_pnl': va = a.realized_pnl ?? 0; vb = b.realized_pnl ?? 0; break;
        case 'closed_at': va = new Date(a.closed_at!).getTime(); vb = new Date(b.closed_at!).getTime(); break;
      }
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return arr;
  }, [trades, sortKey, sortAsc]);

  // ── CSV export ──
  const exportCSV = useCallback(() => {
    const header = 'Symbol,Direction,Size,Open Price,Close Price,PnL ($),Duration (h),Date\n';
    const rows = sortedTrades.map(t => {
      const dur = t.closed_at && t.opened_at ? ((new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime()) / 3600000).toFixed(1) : '';
      return `${t.symbol},${t.direction},${t.size},${t.open_price},${t.close_price ?? ''},${(t.realized_pnl ?? 0).toFixed(2)},${dur},${t.closed_at ?? ''}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `trade-history-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [sortedTrades]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-[14px] opacity-40">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopBar />

      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
        {/* ── Stats Cards ── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={<TrendingUp size={16} />} label="Total Return" value={formatCurrency(stats.totalReturn)} sub={`${stats.totalReturnPct >= 0 ? '+' : ''}${stats.totalReturnPct.toFixed(1)}%`} color={stats.totalReturn >= 0 ? '#00C27A' : '#C1121F'} />
            <StatCard icon={<Target size={16} />} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 50 ? '#00C27A' : '#C1121F'} />
            <StatCard icon={<Activity size={16} />} label="Profit Factor" value={stats.profitFactor === Infinity ? 'INF' : stats.profitFactor.toFixed(2)} color={stats.profitFactor >= 1.5 ? '#00C27A' : stats.profitFactor >= 1 ? '#F5A623' : '#C1121F'} />
            <StatCard icon={<BarChart3 size={16} />} label="Sharpe Ratio" value={stats.sharpe.toFixed(2)} color={stats.sharpe >= 1 ? '#00C27A' : stats.sharpe >= 0 ? '#F5A623' : '#C1121F'} />
            <StatCard icon={<AlertTriangle size={16} />} label="Max Drawdown" value={`${stats.maxDDPct.toFixed(1)}%`} color="#C1121F" />
            <StatCard icon={<Hash size={16} />} label="Total Trades" value={String(stats.totalTrades)} color="#0091D5" />
          </div>
        )}

        {/* ── Equity Curve ── */}
        <div className="panel">
          <div className="panel-header">Equity Curve</div>
          <div ref={chartContainerRef} style={{ width: '100%' }} />
        </div>

        {/* ── Calendar Heatmap + PnL by Symbol ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Calendar */}
          <div className="panel">
            <div className="panel-header">Monthly Calendar Heatmap ({new Date().getFullYear()})</div>
            <div className="p-3 grid grid-cols-4 gap-2">
              {months.map((m, mi) => {
                const daysInMonth = new Date(new Date().getFullYear(), mi + 1, 0).getDate();
                return (
                  <div key={m}>
                    <div className="text-[10px] font-semibold opacity-50 mb-1 text-center">{m}</div>
                    <div className="grid grid-cols-7 gap-px">
                      {Array.from({ length: daysInMonth }, (_, di) => {
                        const key = `${mi}-${di + 1}`;
                        const pnl = calendarData[key];
                        const bg = pnl === undefined ? 'rgba(255,255,255,0.03)' : pnl > 0 ? `rgba(0,194,122,${Math.min(0.8, 0.15 + Math.abs(pnl) / 500)})` : `rgba(193,18,31,${Math.min(0.8, 0.15 + Math.abs(pnl) / 500)})`;
                        return (
                          <div
                            key={di}
                            className="rounded-sm"
                            style={{ width: '100%', aspectRatio: '1', backgroundColor: bg }}
                            title={pnl !== undefined ? `${m} ${di + 1}: ${formatPnL(pnl)}` : `${m} ${di + 1}: No trades`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PnL by Symbol */}
          <div className="panel">
            <div className="panel-header">PnL by Symbol</div>
            <div className="p-3 space-y-2">
              {symbolPnl.map(([sym, pnl]) => (
                <div key={sym} className="flex items-center gap-2">
                  <span className="text-[12px] font-mono w-16 shrink-0">{sym}</span>
                  <div className="flex-1 relative h-5">
                    <div
                      className="absolute top-0 h-full rounded-sm"
                      style={{
                        width: `${(Math.abs(pnl) / maxAbsPnl) * 100}%`,
                        backgroundColor: pnl >= 0 ? 'rgba(0,194,122,0.5)' : 'rgba(193,18,31,0.5)',
                        left: pnl >= 0 ? '50%' : undefined,
                        right: pnl < 0 ? '50%' : undefined,
                        maxWidth: '50%',
                      }}
                    />
                    <div className="absolute inset-0 flex items-center" style={{ left: '50%', width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  <span className="text-[11px] font-mono w-16 text-right" style={{ color: pnl >= 0 ? '#00C27A' : '#C1121F' }}>
                    {formatPnL(pnl)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Trade History Table ── */}
        <div className="panel">
          <div className="panel-header flex items-center justify-between">
            <span>Trade History</span>
            <button onClick={exportCSV} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-opacity hover:opacity-70" style={{ color: '#0091D5', backgroundColor: 'rgba(41,171,226,0.1)' }}>
              <Download size={12} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {([
                    ['symbol', 'Symbol'], ['direction', 'Direction'], ['size', 'Size'],
                    ['open_price', 'Open'], ['close_price', 'Close'],
                    ['realized_pnl', 'PnL ($)'], ['closed_at', 'Date'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      className="px-3 py-2 text-left font-medium cursor-pointer select-none hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                      onClick={() => handleSort(key)}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {sortKey === key && <ArrowUpDown size={10} style={{ color: '#0091D5' }} />}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {sortedTrades.map((t) => {
                  const pnl = t.realized_pnl ?? 0;
                  const dur = t.closed_at && t.opened_at
                    ? ((new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime()) / 3600000)
                    : 0;
                  const durStr = dur < 1 ? `${Math.round(dur * 60)}m` : dur < 24 ? `${dur.toFixed(1)}h` : `${(dur / 24).toFixed(1)}d`;
                  return (
                    <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td className="px-3 py-2 font-mono font-semibold">{t.symbol}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{
                          backgroundColor: t.direction === 'BUY' ? 'rgba(0,194,122,0.15)' : 'rgba(193,18,31,0.15)',
                          color: t.direction === 'BUY' ? '#00C27A' : '#C1121F',
                        }}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{t.size.toFixed(2)}</td>
                      <td className="px-3 py-2 font-mono">{t.open_price.toFixed(t.symbol.includes('JPY') ? 3 : t.symbol.startsWith('XAU') ? 2 : 5)}</td>
                      <td className="px-3 py-2 font-mono">{(t.close_price ?? 0).toFixed(t.symbol.includes('JPY') ? 3 : t.symbol.startsWith('XAU') ? 2 : 5)}</td>
                      <td className="px-3 py-2 font-mono font-semibold" style={{ color: pnl >= 0 ? '#00C27A' : '#C1121F' }}>
                        {formatPnL(pnl)}
                      </td>
                      <td className="px-3 py-2 font-mono opacity-60">{t.closed_at ? new Date(t.closed_at).toLocaleDateString() : ''}</td>
                      <td className="px-3 py-2 font-mono opacity-40">{durStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="panel p-3">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }} className="opacity-60">{icon}</span>
        <span className="text-[11px] uppercase tracking-wider opacity-50">{label}</span>
      </div>
      <div className="font-mono text-[20px] font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] font-mono opacity-50 mt-0.5">{sub}</div>}
    </div>
  );
}
