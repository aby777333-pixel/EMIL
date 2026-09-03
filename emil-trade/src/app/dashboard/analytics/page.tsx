'use client';

import { PerformanceDashboard } from '@/components/trader/PerformanceDashboard';
import type { PerformanceStats, MonthlyReturn, EquityPoint, TradeDistribution } from '@/types/trader';

const MOCK_STATS: PerformanceStats = {
  winRate: 62.3, avgWin: 245.80, avgLoss: -142.30, profitFactor: 1.87,
  expectancy: 67.40, maxDrawdown: 3420, maxDrawdownPct: 8.2, maxDrawdownDuration: '12d',
  recoveryFactor: 2.45, sharpeRatio: 1.92, sortinoRatio: 2.31, calmarRatio: 1.67,
  totalTrades: 487, winCount: 303, lossCount: 184, avgHoldTime: '4.2',
  bestTrade: 1834.20, worstTrade: -892.50,
  longestWinStreak: 11, longestLoseStreak: 5,
  currentStreak: 3, currentStreakType: 'win',
};

const MOCK_MONTHLY: MonthlyReturn[] = Array.from({ length: 12 }, (_, i) => ({
  year: 2026, month: i + 1, returnPct: (Math.random() - 0.3) * 15, trades: 30 + Math.floor(Math.random() * 20), pnl: (Math.random() - 0.3) * 5000,
}));

const MOCK_EQUITY: EquityPoint[] = Array.from({ length: 100 }, (_, i) => ({
  timestamp: new Date(Date.now() - (99 - i) * 86400000).toISOString(),
  equity: 10000 + i * 50 + (Math.random() - 0.4) * 500,
  balance: 10000 + i * 45,
  drawdown: Math.random() * 500,
}));

const MOCK_DISTRIBUTIONS = {
  bySymbol: [
    { label: 'EURUSD', count: 142, pnl: 3240, winRate: 65 },
    { label: 'GBPUSD', count: 98, pnl: 1870, winRate: 58 },
    { label: 'XAUUSD', count: 87, pnl: -420, winRate: 48 },
    { label: 'USDJPY', count: 76, pnl: 2100, winRate: 67 },
    { label: 'BTCUSD', count: 45, pnl: 890, winRate: 55 },
  ],
  byHour: Array.from({ length: 24 }, (_, i) => ({
    label: `${i}:00`, count: Math.floor(Math.random() * 30), pnl: (Math.random() - 0.4) * 1000, winRate: 40 + Math.random() * 30,
  })),
  byDay: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => ({
    label: d, count: 60 + Math.floor(Math.random() * 40), pnl: (Math.random() - 0.3) * 2000, winRate: 50 + Math.random() * 20,
  })),
};

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Performance Analytics</h1>
        <p className="text-xs text-white/30">Your trading performance breakdown</p>
      </div>
      <PerformanceDashboard stats={MOCK_STATS} monthlyReturns={MOCK_MONTHLY} equityCurve={MOCK_EQUITY} distributions={MOCK_DISTRIBUTIONS} />
    </div>
  );
}
