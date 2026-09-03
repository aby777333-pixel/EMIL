'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Users, DollarSign, Globe,
  PieChart, Layers, Target, ArrowRight, Sparkles,
  Activity, Zap,
} from 'lucide-react';
import type { ExecutiveKpis, RevenueAnalytics, ClientAnalytics, TradingAnalytics } from '@/types/intel';
import { formatCurrencyCompact, formatCompact, pnlColor } from '@/lib/utils/format';

function Sparkline({ data, color = '#00b4ff', height = 24 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 60},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={60} height={height} viewBox={`0 0 60 ${height}`} className="inline-block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface IntelDashboardProps {
  kpis: ExecutiveKpis;
  revenue: RevenueAnalytics;
  clients: ClientAnalytics;
  trading: TradingAnalytics;
}

export function IntelDashboard({ kpis, revenue, clients, trading }: IntelDashboardProps) {
  const [tab, setTab] = useState<'executive' | 'revenue' | 'clients' | 'trading'>('executive');

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'executive', label: 'Executive', icon: <BarChart3 className="h-3.5 w-3.5" /> },
          { key: 'revenue', label: 'Revenue', icon: <DollarSign className="h-3.5 w-3.5" /> },
          { key: 'clients', label: 'Clients', icon: <Users className="h-3.5 w-3.5" /> },
          { key: 'trading', label: 'Trading', icon: <Activity className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Executive Dashboard */}
      {tab === 'executive' && (
        <div className="space-y-5">
          {/* KPI Cards with sparklines */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Revenue Today', value: formatCurrencyCompact(kpis.revenueToday), trend: kpis.revenueTrend, color: '#00dc82', icon: <DollarSign className="h-3.5 w-3.5" /> },
              { label: 'New Clients', value: String(kpis.clientsToday), trend: kpis.clientsTrend, color: '#00b4ff', icon: <Users className="h-3.5 w-3.5" /> },
              { label: 'Deposits Today', value: formatCurrencyCompact(kpis.depositsToday), trend: kpis.depositsTrend, color: '#f59e0b', icon: <TrendingUp className="h-3.5 w-3.5" /> },
              { label: 'Volume Today', value: `${formatCompact(kpis.volumeToday)} lots`, trend: kpis.volumeTrend, color: '#8b5cf6', icon: <Zap className="h-3.5 w-3.5" /> },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5" style={{ color: kpi.color }}>{kpi.icon}<span className="text-[10px] text-white/25">{kpi.label}</span></div>
                  <Sparkline data={kpi.trend} color={kpi.color} />
                </div>
                <div className="text-xl font-mono font-bold text-white">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-[#00b4ff]" /> Conversion Funnel</h4>
            <div className="flex items-center gap-2">
              {kpis.conversionFunnel.map((stage, i) => (
                <div key={stage.name} className="flex items-center gap-2 flex-1">
                  <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
                    <div className="text-lg font-mono font-bold text-white">{stage.count}</div>
                    <div className="text-[10px] text-white/25">{stage.name}</div>
                    {i > 0 && <div className="text-[9px] text-[#00dc82] mt-0.5">{stage.conversionRate.toFixed(0)}% conv</div>}
                  </div>
                  {i < kpis.conversionFunnel.length - 1 && <ArrowRight className="h-3 w-3 text-white/10 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Asset Breakdown + Top Clients */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2"><PieChart className="h-4 w-4 text-[#8b5cf6]" /> Asset Class Revenue</h4>
              <div className="space-y-2">
                {kpis.assetBreakdown.map(asset => (
                  <div key={asset.assetClass} className="flex items-center gap-3">
                    <span className="text-xs text-white/40 w-24 capitalize">{asset.assetClass}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#00b4ff] to-[#8b5cf6]" style={{ width: `${asset.pct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-white/30 w-16 text-right">{formatCurrencyCompact(asset.revenue)}</span>
                    <span className="text-[9px] text-white/15 w-8 text-right">{asset.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#00dc82]" /> Top Revenue Clients</h4>
              <div className="space-y-1.5">
                {kpis.topClients.slice(0, 8).map((client, i) => (
                  <div key={client.name} className="flex items-center gap-2 text-[11px]">
                    <span className="text-white/15 w-4">{i + 1}</span>
                    <span className="text-white/50 flex-1 truncate">{client.name}</span>
                    <span className="font-mono text-[#00dc82]">{formatCurrencyCompact(client.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Geographic */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2"><Globe className="h-4 w-4 text-[#f59e0b]" /> Revenue by Country</h4>
            <div className="grid grid-cols-4 gap-3">
              {kpis.geoRevenue.slice(0, 8).map(geo => (
                <div key={geo.code} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                  <div className="text-xs font-medium text-white mb-0.5">{geo.country}</div>
                  <div className="text-sm font-mono font-bold text-[#00dc82]">{formatCurrencyCompact(geo.revenue)}</div>
                  <div className="text-[9px] text-white/15">{geo.clients} clients</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {tab === 'revenue' && (
        <div className="space-y-5">
          {/* Revenue Waterfall */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-4">Revenue Waterfall</h4>
            <div className="flex items-end gap-3 h-40">
              {revenue.waterfall.map(item => (
                <div key={item.type} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono text-white/30">{formatCurrencyCompact(item.amount)}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${item.pct}%` }}
                    className="w-full rounded-t-md bg-gradient-to-t from-[#00b4ff]/60 to-[#8b5cf6]/60" />
                  <span className="text-[9px] text-white/20 capitalize">{item.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Asset */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h4 className="text-xs font-medium text-white/50">Revenue by Instrument</h4>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[10px] text-white/25 uppercase border-b border-white/[0.04]">
                  <th className="text-left px-5 py-2 font-medium">Symbol</th>
                  <th className="text-right px-3 py-2 font-medium">Revenue</th>
                  <th className="text-right px-3 py-2 font-medium">Volume</th>
                  <th className="text-right px-5 py-2 font-medium">Trades</th>
                </tr>
              </thead>
              <tbody>
                {revenue.byAsset.slice(0, 10).map(a => (
                  <tr key={a.symbol} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                    <td className="px-5 py-2 font-mono font-medium text-white">{a.symbol}</td>
                    <td className="px-3 py-2 text-right font-mono text-[#00dc82]">{formatCurrencyCompact(a.revenue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-white/40">{formatCompact(a.volume)} lots</td>
                    <td className="px-5 py-2 text-right text-white/30">{a.tradeCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Forecast */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#8b5cf6]" /> 30-Day Revenue Forecast (ML)</h4>
            <div className="h-32 flex items-end gap-[2px]">
              {revenue.forecast.map((f, i) => {
                const max = Math.max(...revenue.forecast.map(x => x.upperBound));
                const h = (f.predicted / max) * 100;
                return (
                  <motion.div key={f.date} initial={{ height: 0 }} animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.01 }}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-[#8b5cf6]/40 to-[#00b4ff]/40 min-w-[2px]"
                    title={`${f.date}: ${formatCurrencyCompact(f.predicted)}`} />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {tab === 'clients' && (
        <div className="space-y-5">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3">Client Health Distribution</h4>
            <div className="flex gap-2 h-8">
              {clients.healthDistribution.map(h => (
                <motion.div key={h.bracket} initial={{ width: 0 }} animate={{ width: `${h.pct}%` }}
                  className="rounded-md flex items-center justify-center text-[8px] font-bold text-white/80"
                  style={{ backgroundColor: h.color }} title={`${h.bracket}: ${h.count} (${h.pct}%)`}>
                  {h.pct > 8 ? `${h.bracket} ${h.pct}%` : ''}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3">Activation Funnel</h4>
            <div className="flex items-center gap-2">
              {clients.activation.map((stage, i) => (
                <div key={stage.name} className="flex items-center gap-2 flex-1">
                  <div className="flex-1 bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-lg font-mono font-bold text-white">{stage.count}</div>
                    <div className="text-[10px] text-white/25">{stage.name}</div>
                    {i > 0 && <div className="text-[9px] text-[#00dc82] mt-0.5">{stage.conversionRate.toFixed(0)}%</div>}
                  </div>
                  {i < clients.activation.length - 1 && <ArrowRight className="h-3 w-3 text-white/10 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3">Churn Risk Factors</h4>
            <div className="space-y-2">
              {clients.churnFactors.map(f => (
                <div key={f.factor} className="flex items-center gap-3">
                  <span className="text-xs text-white/40 flex-1">{f.factor}</span>
                  <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.abs(f.impact) * 100}%`,
                      backgroundColor: f.direction === 'negative' ? '#ef4444' : '#00dc82',
                    }} />
                  </div>
                  <span className={`text-[10px] font-mono w-8 text-right ${f.direction === 'negative' ? 'text-[#ef4444]' : 'text-[#00dc82]'}`}>
                    {(f.impact * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trading Tab */}
      {tab === 'trading' && (
        <div className="space-y-5">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3">Execution Quality</h4>
            <div className="grid grid-cols-3 gap-3">
              {trading.executionQuality.map(eq => (
                <div key={eq.metric} className={`bg-white/[0.02] border rounded-lg p-3 ${
                  eq.status === 'good' ? 'border-[#00dc82]/10' : eq.status === 'fair' ? 'border-[#f59e0b]/10' : 'border-[#ef4444]/10'
                }`}>
                  <div className="text-[10px] text-white/25 mb-1">{eq.metric}</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-mono font-bold ${
                      eq.status === 'good' ? 'text-[#00dc82]' : eq.status === 'fair' ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                    }`}>{eq.value}</span>
                    <span className="text-[9px] text-white/15">vs {eq.benchmark}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-xs font-semibold text-white mb-3">Session Volume</h4>
              {trading.sessionVolume.map(s => (
                <div key={s.session} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-white/40 w-16">{s.session}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#00b4ff]" style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-white/25 w-10 text-right">{s.pct}%</span>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-xs font-semibold text-white mb-3">Order Type Breakdown</h4>
              {trading.orderTypeBreakdown.map(o => (
                <div key={o.type} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-white/40 w-16 capitalize">{o.type}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#8b5cf6]" style={{ width: `${o.pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-white/25 w-10 text-right">{o.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
