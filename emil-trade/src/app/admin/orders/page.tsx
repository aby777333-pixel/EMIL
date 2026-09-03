'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  account_number: string;
  symbol: string;
  order_type: string;
  direction: string;
  requested_size: number;
  filled_size: number | null;
  requested_price: number | null;
  fill_price: number | null;
  status: string;
  commission: number;
  created_at: string;
  filled_at: string | null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc('admin_get_orders', {
      p_status: statusFilter || null,
      p_limit: 100,
    });
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90">Orders</h2>
        <span className="text-xs text-white/30 mono">{orders.length} orders</span>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#111118] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-[#0091D5]/40"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="filled">Filled</option>
          <option value="partial">Partial</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/[0.06] rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/30 uppercase tracking-wider">
              <th className="text-left px-3 py-2.5 font-medium">ID</th>
              <th className="text-left px-3 py-2.5 font-medium">Account</th>
              <th className="text-left px-3 py-2.5 font-medium">Symbol</th>
              <th className="text-left px-3 py-2.5 font-medium">Type</th>
              <th className="text-left px-3 py-2.5 font-medium">Dir</th>
              <th className="text-right px-3 py-2.5 font-medium">Size</th>
              <th className="text-right px-3 py-2.5 font-medium">Req. Price</th>
              <th className="text-right px-3 py-2.5 font-medium">Fill Price</th>
              <th className="text-left px-3 py-2.5 font-medium">Status</th>
              <th className="text-right px-3 py-2.5 font-medium">Commission</th>
              <th className="text-right px-3 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center">
                  <div className="w-5 h-5 border-2 border-[#0091D5] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-white/30">No orders found</td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2 mono text-white/30 text-[10px]">{ord.id.slice(0, 8)}</td>
                  <td className="px-3 py-2 mono text-white/60">{ord.account_number}</td>
                  <td className="px-3 py-2 text-white/80 font-medium">{ord.symbol}</td>
                  <td className="px-3 py-2 text-white/50">{ord.order_type}</td>
                  <td className="px-3 py-2">
                    <span className={`font-medium ${ord.direction === 'BUY' ? 'text-[#00C27A]' : 'text-[#C1121F]'}`}>
                      {ord.direction}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right mono text-white/70">{ord.requested_size}</td>
                  <td className="px-3 py-2 text-right mono text-white/60">{ord.requested_price ?? '-'}</td>
                  <td className="px-3 py-2 text-right mono text-white/60">{ord.fill_price ?? '-'}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={ord.status} />
                  </td>
                  <td className="px-3 py-2 text-right mono text-white/40">{ord.commission.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right mono text-white/40 text-[10px]">
                    {new Date(ord.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    filled: 'bg-[#00C27A]/15 text-[#00C27A]',
    pending: 'bg-[#E2A229]/15 text-[#E2A229]',
    new: 'bg-[#0091D5]/15 text-[#0091D5]',
    partial: 'bg-[#0091D5]/15 text-[#0091D5]',
    cancelled: 'bg-white/10 text-white/40',
    rejected: 'bg-[#C1121F]/15 text-[#C1121F]',
    expired: 'bg-white/10 text-white/30',
  };
  const cls = colors[status] ?? 'bg-white/10 text-white/50';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase ${cls}`}>
      {status}
    </span>
  );
}
