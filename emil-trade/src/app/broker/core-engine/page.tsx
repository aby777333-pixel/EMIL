'use client';

import { EngineMonitor } from '@/components/core-engine/EngineMonitor';
import type { ExecutionMetrics, MigrationBridge, CoreOrder } from '@/types/core-engine';

const MOCK_METRICS: ExecutionMetrics = {
  ordersPerSecond: 2347, avgExecutionMs: 0.8, p99ExecutionMs: 12.4,
  fillRate: 99.7, requoteRate: 0.12, rejectionRate: 0.18,
  avgSlippage: 0.34, priceImprovementRate: 23.5,
};

const MOCK_ORDERS: CoreOrder[] = Array.from({ length: 15 }, (_, i) => ({
  id: `co${i}`, accountId: `acc${i % 5}`, symbol: ['EURUSD','GBPUSD','XAUUSD','USDJPY','BTCUSD'][i % 5],
  type: (['market','limit','stop','trailing_stop','oco','iceberg','twap','conditional'] as const)[i % 8],
  direction: (i % 2 === 0 ? 'buy' : 'sell') as 'buy' | 'sell',
  volume: Math.round((0.1 + Math.random() * 5) * 100) / 100,
  filledVolume: i < 10 ? Math.round((0.1 + Math.random() * 5) * 100) / 100 : 0,
  price: 1.08500 + Math.random() * 0.005,
  stopPrice: i % 3 === 0 ? 1.08200 : null, limitPrice: i % 4 === 0 ? 1.08800 : null,
  trailingDistance: i % 8 === 3 ? 50 : null, trailingType: i % 8 === 3 ? 'points' as const : null,
  stopLoss: 1.08200, takeProfit: 1.08900,
  timeInForce: (['GTC','IOC','FOK','DAY','GTD'] as const)[i % 5],
  expireAt: null, slippageTolerance: 3,
  lifecycle: (['filled','filled','pending','filled','rejected','filled','partial_fill','filled','filled','routing','filled','cancelled','filled','filled','filled'] as const)[i],
  executionPrice: i < 10 ? 1.08500 + Math.random() * 0.005 : null,
  executionTime: i < 10 ? new Date(Date.now() - i * 30000).toISOString() : null,
  rejectReason: i === 4 ? 'Insufficient margin' : null,
  linkedOrderIds: [], icebergVisibleVolume: i % 8 === 5 ? 0.5 : null,
  twapIntervalMs: i % 8 === 6 ? 60000 : null,
  conditionExpression: i % 8 === 7 ? 'RSI(14) < 30' : null,
  newsEventId: null, rangeHigh: null, rangeLow: null,
  strategyId: null, comment: '', routingDecision: (['a_book','b_book','hybrid'] as const)[i % 3],
  lpFillPrice: i < 10 ? 1.08500 + Math.random() * 0.005 : null,
  slippage: Math.random() * 1.5, priceImprovement: Math.random() > 0.7 ? Math.random() * 0.5 : 0,
  createdAt: new Date(Date.now() - i * 30000).toISOString(),
  updatedAt: new Date(Date.now() - i * 30000).toISOString(),
}));

const MOCK_MIGRATIONS: MigrationBridge[] = [
  { id: 'mb1', platform: 'mt5', serverHost: 'mt5-live.broker.com:443', serverName: 'MT5 Live Server', status: 'partial', totalAccounts: 4827, migratedAccounts: 3210, totalPositions: 12400, migratedPositions: 8900, totalHistory: 2_450_000, migratedHistory: 1_890_000, trafficSplitPct: 65, lastSyncAt: new Date().toISOString(), errors: [] },
  { id: 'mb2', platform: 'mt5', serverHost: 'mt5-demo.broker.com:443', serverName: 'MT5 Demo Server', status: 'complete', totalAccounts: 8900, migratedAccounts: 8900, totalPositions: 0, migratedPositions: 0, totalHistory: 890_000, migratedHistory: 890_000, trafficSplitPct: 100, lastSyncAt: new Date().toISOString(), errors: [] },
  { id: 'mb3', platform: 'ctrader', serverHost: 'ctrader-api.broker.com', serverName: 'cTrader Production', status: 'syncing', totalAccounts: 1200, migratedAccounts: 340, totalPositions: 2800, migratedPositions: 890, totalHistory: 450_000, migratedHistory: 120_000, trafficSplitPct: 25, lastSyncAt: new Date(Date.now() - 300000).toISOString(), errors: [{ message: 'cTrader API rate limit reached — retrying in 60s', timestamp: new Date().toISOString() }] },
];

export default function CoreEnginePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">RAPTOR CORE ENGINE</h1>
        <p className="text-xs text-white/30">Indigenous matching engine — OMS, PMS, execution metrics, and platform migration</p>
      </div>
      <EngineMonitor metrics={MOCK_METRICS} recentOrders={MOCK_ORDERS} migrations={MOCK_MIGRATIONS}
        onCutover={id => console.log('Full cutover', id)} />
    </div>
  );
}
