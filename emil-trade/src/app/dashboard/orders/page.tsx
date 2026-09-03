'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { TabGroup } from '@/components/ui/TabGroup';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ClipboardList, X } from 'lucide-react';
import { cn, formatLot, formatPrice } from '@/lib/utils/format';

const TABS = [
  { id: 'open', label: 'Open Orders' },
  { id: 'pending', label: 'Pending Orders' },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('open');
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  async function fetchOrders() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: accounts } = await supabase
      .from('trading_accounts')
      .select('id')
      .eq('user_id', user.id);

    const accountIds = (accounts ?? []).map((a) => a.id);
    if (accountIds.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const statusFilter = activeTab === 'pending'
      ? ['pending_validation', 'margin_check', 'risk_check', 'pending_lp']
      : ['filled', 'partially_filled'];

    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('account_id', accountIds)
      .in('status', statusFilter)
      .order('created_at', { ascending: false })
      .limit(50);

    setOrders(data ?? []);
    setLoading(false);
  }

  async function cancelOrder(orderId: string) {
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);
    fetchOrders();
  }

  const columns = [
    {
      key: 'id',
      label: 'Order #',
      render: (row: Record<string, unknown>) => (
        <span className="mono text-foreground">{(row.id as string).slice(0, 8)}</span>
      ),
    },
    {
      key: 'symbol',
      label: 'Symbol',
      render: (row: Record<string, unknown>) => (
        <span className="font-medium text-foreground">{row.symbol as string}</span>
      ),
    },
    {
      key: 'order_type',
      label: 'Type',
      render: (row: Record<string, unknown>) => (
        <span className="uppercase text-secondary">{row.order_type as string}</span>
      ),
    },
    {
      key: 'direction',
      label: 'Direction',
      render: (row: Record<string, unknown>) => (
        <span className={cn(
          'rounded px-1.5 py-0.5 text-[10px] font-bold',
          row.direction === 'BUY' ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'
        )}>
          {row.direction as string}
        </span>
      ),
    },
    {
      key: 'requested_size',
      label: 'Lots',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono">{formatLot(row.requested_size as number)}</span>
      ),
    },
    {
      key: 'requested_price',
      label: 'Price',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono">
          {row.fill_price
            ? formatPrice(row.fill_price as number)
            : row.requested_price
              ? formatPrice(row.requested_price as number)
              : '\u2014'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => (
        <StatusBadge status={row.status as string} />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: Record<string, unknown>) => (
        <span className="text-secondary">
          {new Date(row.created_at as string).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
    ...(activeTab === 'pending' ? [{
      key: 'actions',
      label: '',
      align: 'center' as const,
      render: (row: Record<string, unknown>) => (
        <button
          onClick={() => cancelOrder(row.id as string)}
          className="rounded p-1 text-loss hover:bg-loss/10 transition-colors"
          title="Cancel order"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">Order Management</h1>

      <TabGroup tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={activeTab === 'pending' ? 'No pending orders' : 'No open orders'}
          description="Your orders will appear here when you place trades."
        />
      ) : (
        <DataTable columns={columns} data={orders} sortable />
      )}
    </div>
  );
}
