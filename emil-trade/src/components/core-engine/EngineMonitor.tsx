'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Zap, Activity, Server, BarChart3, Clock,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  ArrowLeftRight, RefreshCw, Database, Layers,
} from 'lucide-react';
import type { ExecutionMetrics, MigrationBridge, CoreOrder, OrderLifecycle } from '@/types/core-engine';
import { pnlColor, formatCompact } from '@/lib/utils/format';

const LIFECYCLE_COLORS: Record<OrderLifecycle, string> = {
  pending: '#f59e0b', validating: '#00b4ff', routing: '#8b5cf6', at_lp: '#06b6d4',
  partial_fill: '#f59e0b', filled: '#00dc82', rejected: '#ef4444', cancelled: '#6b7280',
  expired: '#6b7280', requoted: '#ff6b35', modified: '#00b4ff', closed: '#6b7280',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  market: 'Market', limit: 'Limit', stop: 'Stop', stop_limit: 'Stop-Limit',
  trailing_stop: 'Trail', oco: 'OCO', oto: 'OTO', oca: 'OCA',
  basket: 'Basket', iceberg: 'Iceberg', twap: 'TWAP', vwap: 'VWAP',
  scale_in: 'Scale-In', scale_out: 'Scale-Out', conditional: 'Cond',
  time_order: 'Time', news_order: 'News', range_order: 'Range',
};

interface EngineMonitorProps {
  metrics: ExecutionMetrics;
  recentOrders: CoreOrder[];
  migrations: MigrationBridge[];
  onCutover: (bridgeId: string) => void;
}

export function EngineMonitor({ metrics, recentOrders, migrations, onCutover }: EngineMonitorProps) {
  const [tab, setTab] = useState<'metrics' | 'orders' | 'migrations'>('metrics');

  return (
    <div className="space-y-5">
      {/* Engine KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Orders/sec', value: metrics.ordersPerSecond.toLocaleString(), icon: <Zap className="h-3.5 w-3.5" />, color: '#00b4ff' },
          { label: 'Avg Execution', value: `${metrics.avgExecutionMs.toFixed(1)}ms`, icon: <Clock className="h-3.5 w-3.5" />, color: metrics.avgExecutionMs < 5 ? '#00dc82' : '#f59e0b' },
          { label: 'p99 Execution', value: `${metrics.p99ExecutionMs.toFixed(1)}ms`, icon: <Activity className="h-3.5 w-3.5" />, color: metrics.p99ExecutionMs < 50 ? '#00dc82' : '#f59e0b' },
          { label: 'Fill Rate', value: `${metrics.fillRate.toFixed(1)}%`, icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: metrics.fillRate > 99 ? '#00dc82' : '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1.5" style={{ color: kpi.color }}>{kpi.icon}<span className="text-[9px] text-white/25">{kpi.label}</span></div>
            <div className="text-xl font-mono font-bold text-white">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Requote Rate', value: `${metrics.requoteRate.toFixed(2)}%`, color: metrics.requoteRate < 1 ? '#00dc82' : '#f59e0b' },
          { label: 'Rejection Rate', value: `${metrics.rejectionRate.toFixed(2)}%`, color: metrics.rejectionRate < 0.5 ? '#00dc82' : '#ef4444' },
          { label: 'Avg Slippage', value: `${metrics.avgSlippage.toFixed(2)}p`, color: metrics.avgSlippage < 1 ? '#00dc82' : '#f59e0b' },
          { label: 'Price Improvement', value: `${metrics.priceImprovementRate.toFixed(1)}%`, color: '#00dc82' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="text-[9px] text-white/25 mb-1">{kpi.label}</div>
            <div className="text-lg font-mono font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'metrics', label: 'Order Types', icon: <Layers className="h-3.5 w-3.5" /> },
          { key: 'orders', label: 'Recent Orders', icon: <Zap className="h-3.5 w-3.5" /> },
          { key: 'migrations', label: 'Migration Bridges', icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Order Types Supported */}
      {tab === 'metrics' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <h4 className="text-xs font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[#00b4ff]" /> Supported Order Types — 23 Native Types
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(ORDER_TYPE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <CheckCircle2 className="h-3 w-3 text-[#00dc82]" />
                <span className="text-xs text-white/60">{label}</span>
                <span className="text-[8px] text-white/15 ml-auto font-mono">{key}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-3">
              <h5 className="text-[10px] text-white/30 mb-2 font-medium">Position Modes</h5>
              {['Netting', 'Hedging', 'Portfolio'].map(m => (
                <div key={m} className="flex items-center gap-2 py-1 text-xs text-white/50">
                  <CheckCircle2 className="h-3 w-3 text-[#00dc82]" />{m}
                </div>
              ))}
            </div>
            <div className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-3">
              <h5 className="text-[10px] text-white/30 mb-2 font-medium">Position Operations</h5>
              {['Open', 'Partial Close', 'Add', 'Modify', 'Flip', 'Transfer', 'Split', 'Merge'].map(o => (
                <div key={o} className="flex items-center gap-2 py-0.5 text-[11px] text-white/40">
                  <CheckCircle2 className="h-2.5 w-2.5 text-[#00dc82]" />{o}
                </div>
              ))}
            </div>
            <div className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-3">
              <h5 className="text-[10px] text-white/30 mb-2 font-medium">Time-in-Force</h5>
              {['Fill-or-Kill (FOK)', 'Immediate-or-Cancel (IOC)', 'Good-Till-Cancel (GTC)', 'Good-Till-Date (GTD)', 'Day Order'].map(t => (
                <div key={t} className="flex items-center gap-2 py-0.5 text-[11px] text-white/40">
                  <CheckCircle2 className="h-2.5 w-2.5 text-[#00dc82]" />{t}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {tab === 'orders' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[10px] text-white/25 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left px-3 py-2 font-medium">Symbol</th>
                <th className="text-center px-2 py-2 font-medium">Type</th>
                <th className="text-center px-2 py-2 font-medium">Dir</th>
                <th className="text-right px-2 py-2 font-medium">Volume</th>
                <th className="text-right px-2 py-2 font-medium">Price</th>
                <th className="text-right px-2 py-2 font-medium">Exec</th>
                <th className="text-right px-2 py-2 font-medium">Slip</th>
                <th className="text-center px-2 py-2 font-medium">Lifecycle</th>
                <th className="text-center px-2 py-2 font-medium">Routing</th>
                <th className="text-center px-2 py-2 font-medium">TIF</th>
                <th className="text-left px-3 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-mono font-medium text-white">{order.symbol}</td>
                  <td className="px-2 py-2 text-center text-[9px] text-white/30">{ORDER_TYPE_LABELS[order.type] ?? order.type}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${order.direction === 'buy' ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>{order.direction.toUpperCase()}</span>
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-white/50">{order.volume.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right font-mono text-white/40">{order.price?.toFixed(5) ?? '—'}</td>
                  <td className="px-2 py-2 text-right font-mono text-white/50">{order.executionPrice?.toFixed(5) ?? '—'}</td>
                  <td className={`px-2 py-2 text-right font-mono ${order.slippage > 1 ? 'text-[#ef4444]' : 'text-white/20'}`}>{order.slippage.toFixed(1)}p</td>
                  <td className="px-2 py-2 text-center">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${LIFECYCLE_COLORS[order.lifecycle]}15`, color: LIFECYCLE_COLORS[order.lifecycle] }}>
                      {order.lifecycle}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center text-[9px] text-white/25">{order.routingDecision?.replace('_', '-') ?? '—'}</td>
                  <td className="px-2 py-2 text-center text-[9px] text-white/15">{order.timeInForce}</td>
                  <td className="px-3 py-2 text-[9px] text-white/15">{new Date(order.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Migration Bridges */}
      {tab === 'migrations' && (
        <div className="space-y-4">
          {migrations.length === 0 ? (
            <div className="text-center py-16">
              <ArrowLeftRight className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/20">No migration bridges configured</p>
              <p className="text-xs text-white/10 mt-1">Connect MT5 or cTrader servers to begin migration</p>
            </div>
          ) : migrations.map(bridge => {
            const accountPct = bridge.totalAccounts > 0 ? (bridge.migratedAccounts / bridge.totalAccounts) * 100 : 0;
            const posPct = bridge.totalPositions > 0 ? (bridge.migratedPositions / bridge.totalPositions) * 100 : 0;
            const histPct = bridge.totalHistory > 0 ? (bridge.migratedHistory / bridge.totalHistory) * 100 : 0;

            return (
              <div key={bridge.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${bridge.platform === 'mt5' ? 'bg-[#00b4ff]/10' : 'bg-[#00dc82]/10'}`}>
                      <Server className={`h-5 w-5 ${bridge.platform === 'mt5' ? 'text-[#00b4ff]' : 'text-[#00dc82]'}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{bridge.serverName || bridge.serverHost}</h4>
                      <p className="text-[10px] text-white/25">{bridge.platform.toUpperCase()} → RAPTOR · {bridge.serverHost}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      bridge.status === 'complete' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                      bridge.status === 'syncing' ? 'bg-[#00b4ff]/10 text-[#00b4ff]' :
                      bridge.status === 'error' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                      'bg-white/5 text-white/25'
                    }`}>{bridge.status.replace('_', ' ')}</span>
                    <span className="text-xs font-mono text-[#f59e0b]">{bridge.trafficSplitPct}% to RAPTOR</span>
                    {bridge.status !== 'complete' && (
                      <button onClick={() => onCutover(bridge.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00dc82] hover:bg-[#00dc82]/80 text-white text-xs font-medium">
                        <ArrowRight className="h-3 w-3" /> Full Cutover
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Accounts', migrated: bridge.migratedAccounts, total: bridge.totalAccounts, pct: accountPct },
                    { label: 'Positions', migrated: bridge.migratedPositions, total: bridge.totalPositions, pct: posPct },
                    { label: 'Trade History', migrated: bridge.migratedHistory, total: bridge.totalHistory, pct: histPct },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/30">{item.label}</span>
                        <span className="text-[10px] font-mono text-white/40">{formatCompact(item.migrated)}/{formatCompact(item.total)}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-[#00b4ff] to-[#00dc82]" />
                      </div>
                      <div className="text-[9px] text-white/15 text-right mt-0.5">{item.pct.toFixed(0)}%</div>
                    </div>
                  ))}
                </div>

                {bridge.errors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {bridge.errors.slice(0, 3).map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-[#ef4444]">
                        <AlertTriangle className="h-2.5 w-2.5" />{e.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
