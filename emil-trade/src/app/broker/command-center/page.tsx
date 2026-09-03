'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw } from 'lucide-react';
import { KpiGrid } from '@/components/broker/KpiGrid';
import { ExposureMonitor } from '@/components/broker/ExposureMonitor';
import { RevenueChart } from '@/components/broker/RevenueChart';
import { ToxicFlowAlerts } from '@/components/broker/ToxicFlowAlerts';
import { AbBookRouting } from '@/components/broker/AbBookRouting';
import type { BrokerKPIs, ExposureData, RevenueBreakdown, ToxicFlowAlert, AbRoutingRule, RoutingDecision } from '@/types/broker';

// ─── Mock Data (replace with real API calls) ────────────────

const MOCK_KPIS: BrokerKPIs = {
  totalClients: 4827, liveClients: 2341, demoClients: 1890, propClients: 456, fundedClients: 140,
  aum: 78_450_000, todayPnl: 34_520, spreadRevenue: 21_300, commissionRevenue: 8_400, swapRevenue: 4_820,
  netLongExposure: 12_340_000, netShortExposure: 9_870_000,
  liveTradeCount: 14_823, volumeLots: 8_932, volumeUsd: 892_300_000,
  pendingWithdrawals: 23, pendingWithdrawalAmount: 187_450,
  failedKyc: 7, marginCallAlerts: 3,
  bridgeStatus: [
    { lpName: 'LMAX', status: 'green', latencyMs: 12, lastHeartbeat: new Date().toISOString() },
    { lpName: 'Currenex', status: 'green', latencyMs: 18, lastHeartbeat: new Date().toISOString() },
    { lpName: 'Integral', status: 'amber', latencyMs: 45, lastHeartbeat: new Date().toISOString() },
  ],
  systemHealth: { apiLatencyP99: 67, wsConnections: 3421, errorRate: 0.02, uptimePercent: 99.98 },
};

const MOCK_EXPOSURES: ExposureData[] = [
  { symbol: 'EURUSD', assetClass: 'forex', netLongLots: 234.5, netShortLots: 189.2, netExposureUsd: 4_530_000, clientCount: 342, exposurePct: 5.8, var95: 45_300, var99: 67_800, cvar: 89_200 },
  { symbol: 'GBPUSD', assetClass: 'forex', netLongLots: 156.3, netShortLots: 201.8, netExposureUsd: -5_720_000, clientCount: 218, exposurePct: 7.3, var95: 57_200, var99: 85_300, cvar: 112_000 },
  { symbol: 'XAUUSD', assetClass: 'commodities', netLongLots: 89.1, netShortLots: 34.2, netExposureUsd: 10_890_000, clientCount: 456, exposurePct: 13.9, var95: 108_900, var99: 163_000, cvar: 215_000 },
  { symbol: 'BTCUSD', assetClass: 'crypto', netLongLots: 12.4, netShortLots: 3.1, netExposureUsd: 5_680_000, clientCount: 189, exposurePct: 7.2, var95: 284_000, var99: 426_000, cvar: 568_000 },
  { symbol: 'US30', assetClass: 'indices', netLongLots: 67.8, netShortLots: 72.3, netExposureUsd: -450_000, clientCount: 134, exposurePct: 0.6, var95: 22_500, var99: 33_750, cvar: 45_000 },
  { symbol: 'USDJPY', assetClass: 'forex', netLongLots: 178.9, netShortLots: 145.6, netExposureUsd: 3_330_000, clientCount: 267, exposurePct: 4.2, var95: 33_300, var99: 49_950, cvar: 66_600 },
];

const MOCK_REVENUE: RevenueBreakdown[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toISOString().split('T')[0],
    spread: 15000 + Math.random() * 10000,
    commission: 5000 + Math.random() * 5000,
    swap: 2000 + Math.random() * 3000,
    inactivityFee: Math.random() * 500,
    withdrawalFee: Math.random() * 200,
    other: Math.random() * 300,
    total: 0,
  };
}).map(d => ({ ...d, total: d.spread + d.commission + d.swap + d.inactivityFee + d.withdrawalFee + d.other }));

const MOCK_TOXIC_ALERTS: ToxicFlowAlert[] = [
  { id: '1', clientId: 'c1', clientName: 'John Doe', alertType: 'latency_arb', severity: 'critical', description: 'Client executed 47 trades in 200ms window, 94% profitable, avg execution 2ms ahead of price update', evidence: {}, status: 'open', assignedTo: null, createdAt: new Date().toISOString(), resolvedAt: null },
  { id: '2', clientId: 'c2', clientName: 'Trading Corp Ltd', alertType: 'coordinated_accounts', severity: 'high', description: 'Accounts TC001-TC005 showing identical entry/exit times across 23 trades, same IP range', evidence: {}, status: 'investigating', assignedTo: 'agent1', createdAt: new Date(Date.now() - 3600000).toISOString(), resolvedAt: null },
  { id: '3', clientId: 'c3', clientName: 'Alice Smith', alertType: 'news_scalping', severity: 'medium', description: 'Consistently entering positions 0.5-2s before NFP/FOMC releases, 87% hit rate', evidence: {}, status: 'open', assignedTo: null, createdAt: new Date(Date.now() - 7200000).toISOString(), resolvedAt: null },
];

const MOCK_ROUTING_RULES: AbRoutingRule[] = [
  { id: '1', name: 'Large Volume A-Book', priority: 1, isActive: true, conditions: [{ field: 'volume', operator: 'gt', value: 10 }], action: 'a_book', aBookPct: 100 },
  { id: '2', name: 'High-Risk Clients B-Book', priority: 2, isActive: true, conditions: [{ field: 'risk_score', operator: 'gt', value: 80 }], action: 'b_book', aBookPct: 0 },
  { id: '3', name: 'Crypto Hybrid', priority: 3, isActive: true, conditions: [{ field: 'asset_class', operator: 'eq', value: 'crypto' }], action: 'hybrid', aBookPct: 60 },
  { id: '4', name: 'News Window B-Book', priority: 4, isActive: false, conditions: [{ field: 'news_window', operator: 'eq', value: 'true' }], action: 'b_book', aBookPct: 0 },
];

const MOCK_ROUTING_DECISIONS: RoutingDecision[] = Array.from({ length: 20 }, (_, i) => ({
  id: `d${i}`, orderId: `o${i}`, clientName: `Client ${i + 1}`,
  symbol: ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD'][i % 4],
  volume: Math.round(Math.random() * 50 * 100) / 100,
  decision: (['a_book', 'b_book', 'hybrid'] as const)[i % 3],
  aBookPct: i % 3 === 2 ? 60 : i % 3 === 0 ? 100 : 0,
  ruleName: MOCK_ROUTING_RULES[i % 4].name,
  reason: 'Auto-routed by rule engine',
  decidedAt: new Date(Date.now() - i * 30000).toISOString(),
}));

export default function CommandCenterPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Command Center</h1>
          <p className="text-xs text-white/30">Real-time broker operations dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-white/20">
            <Activity className="h-3 w-3 text-[#00dc82] animate-pulse" />
            Live
          </div>
          <button
            onClick={() => setLastRefresh(new Date())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <KpiGrid kpis={MOCK_KPIS} />

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Revenue + Exposure */}
        <div className="col-span-7 space-y-5">
          <RevenueChart data={MOCK_REVENUE} />
          <ExposureMonitor exposures={MOCK_EXPOSURES} brokerCapital={MOCK_KPIS.aum} />
        </div>

        {/* Right: Risk + Routing */}
        <div className="col-span-5 space-y-5">
          <ToxicFlowAlerts
            alerts={MOCK_TOXIC_ALERTS}
            onInvestigate={(id) => console.log('Investigate', id)}
            onDismiss={(id) => console.log('Dismiss', id)}
            onResolve={(id) => console.log('Resolve', id)}
          />
          <AbBookRouting
            rules={MOCK_ROUTING_RULES}
            recentDecisions={MOCK_ROUTING_DECISIONS}
            onToggleRule={(id, active) => console.log('Toggle', id, active)}
          />
        </div>
      </div>
    </div>
  );
}
