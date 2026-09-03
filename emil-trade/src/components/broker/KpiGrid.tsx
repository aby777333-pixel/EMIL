'use client';

import { motion } from 'framer-motion';
import {
  Users, DollarSign, TrendingUp, TrendingDown, Activity, AlertTriangle,
  CreditCard, Shield, Wifi, Zap, BarChart3, Clock,
} from 'lucide-react';
import type { BrokerKPIs } from '@/types/broker';

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  alert?: boolean;
  delay?: number;
}

function KpiCard({ label, value, subtitle, icon, color, trend, alert, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
      className={`
        relative bg-white/[0.02] border rounded-xl p-4 transition-all hover:bg-white/[0.04]
        ${alert ? 'border-red-500/30 bg-red-500/[0.03]' : 'border-white/[0.06]'}
      `}
    >
      {alert && (
        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      )}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        {trend && trend !== 'neutral' && (
          <div className={`flex items-center gap-0.5 text-xs ${trend === 'up' ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          </div>
        )}
      </div>
      <div className="text-xl font-bold font-mono text-white tracking-tight">{value}</div>
      <div className="text-[11px] text-white/40 mt-0.5">{label}</div>
      {subtitle && <div className="text-[10px] text-white/25 mt-0.5">{subtitle}</div>}
    </motion.div>
  );
}

interface KpiGridProps {
  kpis: BrokerKPIs;
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      <KpiCard
        label="Total Active Clients"
        value={formatNumber(kpis.totalClients)}
        subtitle={`${kpis.liveClients} live · ${kpis.demoClients} demo · ${kpis.propClients} prop`}
        icon={<Users className="h-4 w-4" />}
        color="#00b4ff"
        delay={0}
      />
      <KpiCard
        label="Assets Under Management"
        value={formatCurrency(kpis.aum)}
        icon={<DollarSign className="h-4 w-4" />}
        color="#00dc82"
        trend="up"
        delay={1}
      />
      <KpiCard
        label="Today's P&L (Broker)"
        value={formatCurrency(kpis.todayPnl)}
        subtitle={`Spread: ${formatCurrency(kpis.spreadRevenue)} · Comm: ${formatCurrency(kpis.commissionRevenue)}`}
        icon={<BarChart3 className="h-4 w-4" />}
        color={kpis.todayPnl >= 0 ? '#00dc82' : '#ef4444'}
        trend={kpis.todayPnl >= 0 ? 'up' : 'down'}
        delay={2}
      />
      <KpiCard
        label="Net Open Exposure"
        value={formatCurrency(Math.abs(kpis.netLongExposure - kpis.netShortExposure))}
        subtitle={`Long: ${formatCurrency(kpis.netLongExposure)} · Short: ${formatCurrency(kpis.netShortExposure)}`}
        icon={<Activity className="h-4 w-4" />}
        color="#8b5cf6"
        delay={3}
      />
      <KpiCard
        label="Live Trade Volume"
        value={`${formatNumber(kpis.volumeLots)} lots`}
        subtitle={`${formatNumber(kpis.liveTradeCount)} executions`}
        icon={<Zap className="h-4 w-4" />}
        color="#f59e0b"
        delay={4}
      />
      <KpiCard
        label="Pending Withdrawals"
        value={formatCurrency(kpis.pendingWithdrawalAmount)}
        subtitle={`${kpis.pendingWithdrawals} requests`}
        icon={<CreditCard className="h-4 w-4" />}
        color="#ff6b35"
        alert={kpis.pendingWithdrawals > 10}
        delay={5}
      />
      <KpiCard
        label="Failed KYC Reviews"
        value={String(kpis.failedKyc)}
        icon={<Shield className="h-4 w-4" />}
        color="#ef4444"
        alert={kpis.failedKyc > 0}
        delay={6}
      />
      <KpiCard
        label="Margin Call Alerts"
        value={String(kpis.marginCallAlerts)}
        icon={<AlertTriangle className="h-4 w-4" />}
        color="#ef4444"
        alert={kpis.marginCallAlerts > 0}
        delay={7}
      />
      <KpiCard
        label="API Latency (p99)"
        value={`${kpis.systemHealth.apiLatencyP99}ms`}
        subtitle={`${formatNumber(kpis.systemHealth.wsConnections)} WS connections`}
        icon={<Clock className="h-4 w-4" />}
        color={kpis.systemHealth.apiLatencyP99 < 100 ? '#00dc82' : '#f59e0b'}
        delay={8}
      />
      <KpiCard
        label="Bridge Status"
        value={kpis.bridgeStatus.filter(b => b.status === 'green').length + '/' + kpis.bridgeStatus.length}
        subtitle={kpis.bridgeStatus.map(b => b.lpName).join(' · ')}
        icon={<Wifi className="h-4 w-4" />}
        color={kpis.bridgeStatus.every(b => b.status === 'green') ? '#00dc82' : '#f59e0b'}
        alert={kpis.bridgeStatus.some(b => b.status === 'red')}
        delay={9}
      />
    </div>
  );
}
