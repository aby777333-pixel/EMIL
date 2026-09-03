'use client';

import { IntelDashboard } from '@/components/intel/IntelDashboard';
import type { ExecutiveKpis, RevenueAnalytics, ClientAnalytics, TradingAnalytics } from '@/types/intel';

const trend = (base: number, variance: number) => Array.from({ length: 7 }, () => base + (Math.random() - 0.3) * variance);

const MOCK_KPIS: ExecutiveKpis = {
  revenueToday: 34520, revenueTrend: trend(30000, 10000),
  clientsToday: 23, clientsTrend: trend(20, 10),
  depositsToday: 187450, depositsTrend: trend(150000, 60000),
  volumeToday: 8932, volumeTrend: trend(8000, 3000),
  conversionFunnel: [
    { name: 'Leads', count: 342, conversionRate: 100, dropoffRate: 0 },
    { name: 'Demo', count: 189, conversionRate: 55, dropoffRate: 45 },
    { name: 'Verified', count: 98, conversionRate: 52, dropoffRate: 48 },
    { name: 'Funded', count: 45, conversionRate: 46, dropoffRate: 54 },
    { name: 'Active', count: 38, conversionRate: 84, dropoffRate: 16 },
  ],
  geoRevenue: [
    { country: 'UAE', code: 'AE', revenue: 8900, clients: 234 },
    { country: 'UK', code: 'GB', revenue: 6700, clients: 189 },
    { country: 'Germany', code: 'DE', revenue: 5400, clients: 156 },
    { country: 'Japan', code: 'JP', revenue: 4200, clients: 98 },
    { country: 'Brazil', code: 'BR', revenue: 3100, clients: 145 },
    { country: 'Nigeria', code: 'NG', revenue: 2800, clients: 210 },
    { country: 'India', code: 'IN', revenue: 2200, clients: 320 },
    { country: 'Australia', code: 'AU', revenue: 1900, clients: 67 },
  ],
  assetBreakdown: [
    { assetClass: 'Forex', revenue: 18400, volume: 5200, pct: 53 },
    { assetClass: 'Gold/Commodities', revenue: 8200, volume: 1800, pct: 24 },
    { assetClass: 'Indices', revenue: 4500, volume: 1200, pct: 13 },
    { assetClass: 'Crypto', revenue: 3420, volume: 732, pct: 10 },
  ],
  topClients: Array.from({ length: 10 }, (_, i) => ({ name: `Client ${String.fromCharCode(65 + i)}`, revenue: 5000 - i * 400, volume: 1200 - i * 100 })),
  bottomClients: Array.from({ length: 5 }, (_, i) => ({ name: `Client ${String.fromCharCode(86 + i)}`, loss: -3000 + i * 400, volume: 800 - i * 100 })),
};

const MOCK_REVENUE: RevenueAnalytics = {
  waterfall: [{ type: 'Spread', amount: 21300, pct: 62 }, { type: 'Commission', amount: 8400, pct: 24 }, { type: 'Swap', amount: 4820, pct: 14 }, { type: 'Fees', amount: 450, pct: 1 }],
  perClient: Array.from({ length: 10 }, (_, i) => ({ percentile: (i + 1) * 10, revenue: 50000 / (i + 1), cumPct: Math.min(100, (i + 1) * 15) })),
  byIb: [{ ibName: 'Alpha Partners', revenue: 12400, commission: 5200, roi: 138 }, { ibName: 'FX Educators', revenue: 8900, commission: 4100, roi: 117 }, { ibName: 'Desert Capital', revenue: 3200, commission: 1800, roi: 78 }],
  byAsset: [{ symbol: 'EURUSD', revenue: 8900, volume: 2340, tradeCount: 12400 }, { symbol: 'XAUUSD', revenue: 6200, volume: 890, tradeCount: 5600 }, { symbol: 'GBPUSD', revenue: 4100, volume: 1200, tradeCount: 7800 }, { symbol: 'BTCUSD', revenue: 3400, volume: 120, tradeCount: 2300 }, { symbol: 'USDJPY', revenue: 2800, volume: 980, tradeCount: 6700 }],
  seasonality: [{ period: 'Mon', avgRevenue: 5200, current: 4800 }, { period: 'Tue', avgRevenue: 5800, current: 6200 }, { period: 'Wed', avgRevenue: 6100, current: 5900 }, { period: 'Thu', avgRevenue: 5500, current: 5100 }, { period: 'Fri', avgRevenue: 4900, current: 5300 }],
  forecast: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0], predicted: 28000 + Math.random() * 12000, lowerBound: 22000 + Math.random() * 8000, upperBound: 34000 + Math.random() * 12000 })),
};

const MOCK_CLIENTS: ClientAnalytics = {
  cohorts: [{ cohort: 'Jan 2026', day30: 78, day60: 62, day90: 51, day180: 38 }, { cohort: 'Feb 2026', day30: 82, day60: 65, day90: 54, day180: 0 }, { cohort: 'Mar 2026', day30: 75, day60: 58, day90: 0, day180: 0 }],
  churnFactors: [{ factor: 'No login >14 days', impact: 0.85, direction: 'negative' }, { factor: 'Withdrawal request', impact: 0.72, direction: 'negative' }, { factor: 'Negative P&L streak', impact: 0.65, direction: 'negative' }, { factor: 'Support complaint', impact: 0.45, direction: 'negative' }, { factor: 'Active copy trading', impact: 0.60, direction: 'positive' }],
  activation: [{ name: 'Signup', count: 1200, conversionRate: 100, dropoffRate: 0 }, { name: 'Verified', count: 780, conversionRate: 65, dropoffRate: 35 }, { name: 'Funded', count: 420, conversionRate: 54, dropoffRate: 46 }, { name: 'Active (5+ trades)', count: 312, conversionRate: 74, dropoffRate: 26 }],
  healthDistribution: [{ bracket: 'Excellent', count: 890, pct: 35, color: '#00dc82' }, { bracket: 'Good', count: 650, pct: 25, color: '#00b4ff' }, { bracket: 'Fair', count: 520, pct: 20, color: '#f59e0b' }, { bracket: 'At Risk', count: 340, pct: 13, color: '#ff6b35' }, { bracket: 'Churning', count: 180, pct: 7, color: '#ef4444' }],
  dormancy: [{ period: '>30 days', count: 340, recoverable: 210 }, { period: '>60 days', count: 180, recoverable: 85 }, { period: '>90 days', count: 120, recoverable: 30 }],
  geoPerformance: [{ country: 'UAE', cac: 45, ltv: 890, ratio: 19.8 }, { country: 'UK', cac: 120, ltv: 650, ratio: 5.4 }],
};

const MOCK_TRADING: TradingAnalytics = {
  volumeByDay: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0], lots: 5000 + Math.random() * 5000, trades: 8000 + Math.floor(Math.random() * 8000) })),
  instrumentRanking: [{ symbol: 'EURUSD', volume: 2340, revenue: 8900, tradeCount: 12400, avgSpread: 1.2 }, { symbol: 'XAUUSD', volume: 890, revenue: 6200, tradeCount: 5600, avgSpread: 2.8 }],
  orderTypeBreakdown: [{ type: 'Market', count: 18400, pct: 62 }, { type: 'Limit', count: 6700, pct: 22 }, { type: 'Stop', count: 3200, pct: 11 }, { type: 'Other', count: 1500, pct: 5 }],
  sessionVolume: [{ session: 'London', volume: 3200, pct: 36, avgSpread: 0.8 }, { session: 'New York', volume: 2800, pct: 31, avgSpread: 0.9 }, { session: 'Tokyo', volume: 1600, pct: 18, avgSpread: 1.2 }, { session: 'Sydney', volume: 1332, pct: 15, avgSpread: 1.5 }],
  spreadAnalysis: [{ symbol: 'EURUSD', effectiveSpread: 1.2, lpSpread: 0.3, markup: 0.9 }],
  executionQuality: [{ metric: 'Fill Rate', value: 99.7, benchmark: 99.0, status: 'good' }, { metric: 'Avg Slippage', value: 0.34, benchmark: 0.5, status: 'good' }, { metric: 'Requote Rate', value: 0.12, benchmark: 0.5, status: 'good' }, { metric: 'Avg Latency', value: 12, benchmark: 20, status: 'good' }, { metric: 'Rejection Rate', value: 0.18, benchmark: 0.3, status: 'good' }, { metric: 'Price Improvement', value: 23.5, benchmark: 15, status: 'good' }],
};

export default function IntelPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">RAPTOR INTEL</h1>
        <p className="text-xs text-white/30">Indigenous business intelligence — executive, revenue, client, and trading analytics</p>
      </div>
      <IntelDashboard kpis={MOCK_KPIS} revenue={MOCK_REVENUE} clients={MOCK_CLIENTS} trading={MOCK_TRADING} />
    </div>
  );
}
