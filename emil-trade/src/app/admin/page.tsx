'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Wallet,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface DashboardStats {
  total_users: number;
  active_accounts: number;
  open_positions: number;
  total_floating_pnl: number;
  pending_kyc: number;
}

interface RecentOrder {
  id: string;
  account_number: string;
  symbol: string;
  order_type: string;
  direction: string;
  requested_size: number;
  fill_price: number | null;
  status: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      const [statsRes, ordersRes] = await Promise.all([
        supabase.rpc('admin_get_dashboard_stats'),
        supabase.rpc('admin_get_orders', { p_status: null, p_limit: 10 }),
      ]);

      if (statsRes.data) setStats(statsRes.data as DashboardStats);
      if (ordersRes.data) setRecentOrders(ordersRes.data as RecentOrder[]);
      setLoading(false);
    }

    fetchData();
  }, []);

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.total_users.toLocaleString(), icon: Users, color: '#0091D5' },
        { label: 'Active Accounts', value: stats.active_accounts.toLocaleString(), icon: Wallet, color: '#00C27A' },
        { label: 'Open Positions', value: stats.open_positions.toLocaleString(), icon: TrendingUp, color: '#C9A84C' },
        { label: 'Floating P&L', value: `$${stats.total_floating_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: stats.total_floating_pnl >= 0 ? '#00C27A' : '#C1121F' },
        { label: 'Pending KYC', value: stats.pending_kyc.toLocaleString(), icon: AlertTriangle, color: stats.pending_kyc > 0 ? '#E2A229' : '#00C27A' },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#0091D5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white/90">Dashboard Overview</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-[#111118] border border-white/[0.06] rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 uppercase tracking-wide">{card.label}</span>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <span className="text-2xl font-semibold mono" style={{ color: card.color }}>
                {card.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-[#111118] border border-white/[0.06] rounded-lg">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <Clock size={14} className="text-white/40" />
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Recent Orders</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/30 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-medium">Account</th>
                  <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
                  <th className="text-left px-4 py-2.5 font-medium">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium">Dir</th>
                  <th className="text-right px-4 py-2.5 font-medium">Size</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2 mono text-white/60">{order.account_number}</td>
                    <td className="px-4 py-2 text-white/80 font-medium">{order.symbol}</td>
                    <td className="px-4 py-2 text-white/50">{order.order_type}</td>
                    <td className="px-4 py-2">
                      <span className={order.direction === 'BUY' ? 'text-[#00C27A]' : 'text-[#C1121F]'}>
                        {order.direction}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right mono text-white/70">{order.requested_size}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-2 text-right mono text-white/40">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-white/30">No recent orders</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Placeholder */}
        <div className="bg-[#111118] border border-white/[0.06] rounded-lg">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Revenue Over Time</span>
          </div>
          <div className="flex items-center justify-center h-60 text-white/20 text-sm">
            Chart coming soon
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    filled: 'bg-[#00C27A]/15 text-[#00C27A]',
    pending: 'bg-[#E2A229]/15 text-[#E2A229]',
    cancelled: 'bg-white/10 text-white/40',
    rejected: 'bg-[#C1121F]/15 text-[#C1121F]',
    partial: 'bg-[#0091D5]/15 text-[#0091D5]',
  };
  const cls = colors[status] ?? 'bg-white/10 text-white/50';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase ${cls}`}>
      {status}
    </span>
  );
}
