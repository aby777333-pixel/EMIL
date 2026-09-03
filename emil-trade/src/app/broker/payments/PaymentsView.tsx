'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { TabGroup } from '@/components/ui/TabGroup';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface PaymentsViewProps {
  pendingDeposits: Record<string, unknown>[];
  pendingWithdrawals: Record<string, unknown>[];
  completed: Record<string, unknown>[];
}

function formatCurrency(val: number): string {
  return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PaymentsView({ pendingDeposits, pendingWithdrawals, completed }: PaymentsViewProps) {
  const [activeTab, setActiveTab] = useState('deposits');

  const tabs = [
    { id: 'deposits', label: 'Pending Deposits', count: pendingDeposits.length },
    { id: 'withdrawals', label: 'Pending Withdrawals', count: pendingWithdrawals.length },
    { id: 'completed', label: 'Completed', count: completed.length },
  ];

  const pendingColumns = [
    {
      key: 'user',
      label: 'User',
      render: (row: Record<string, unknown>) => {
        const u = row.user as Record<string, unknown>;
        return (
          <div>
            <p className="font-medium text-foreground">{String(u?.full_name ?? 'Unknown')}</p>
            <p className="text-[10px] text-muted">{String(u?.email ?? '')}</p>
          </div>
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono font-medium text-foreground">{formatCurrency(Number(row.amount) || 0)}</span>
      ),
    },
    { key: 'method', label: 'Method' },
    {
      key: 'created_at',
      label: 'Date',
      render: (row: Record<string, unknown>) => new Date(String(row.created_at)).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      render: () => (
        <div className="flex gap-1.5">
          <button className="flex items-center gap-1 rounded bg-profit/10 px-2 py-1 text-[10px] font-medium text-profit transition-colors hover:bg-profit/20">
            <CheckCircle className="h-3 w-3" />
            Approve
          </button>
          <button className="flex items-center gap-1 rounded bg-loss/10 px-2 py-1 text-[10px] font-medium text-loss transition-colors hover:bg-loss/20">
            <XCircle className="h-3 w-3" />
            Reject
          </button>
        </div>
      ),
    },
  ];

  const completedColumns = [
    {
      key: 'user',
      label: 'User',
      render: (row: Record<string, unknown>) => {
        const u = row.user as Record<string, unknown>;
        return (
          <div>
            <p className="font-medium text-foreground">{String(u?.full_name ?? 'Unknown')}</p>
            <p className="text-[10px] text-muted">{String(u?.email ?? '')}</p>
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (row: Record<string, unknown>) => <StatusBadge status={String(row.type)} />,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono">{formatCurrency(Number(row.amount) || 0)}</span>
      ),
    },
    { key: 'method', label: 'Method' },
    {
      key: 'created_at',
      label: 'Date',
      render: (row: Record<string, unknown>) => new Date(String(row.created_at)).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} />,
    },
    { key: 'reference', label: 'Reference' },
  ];

  return (
    <div>
      <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'deposits' && (
          pendingDeposits.length > 0 ? (
            <DataTable columns={pendingColumns} data={pendingDeposits} sortable pageSize={20} />
          ) : (
            <EmptyState icon={CreditCard} title="No pending deposits" description="All deposit requests have been processed." />
          )
        )}

        {activeTab === 'withdrawals' && (
          pendingWithdrawals.length > 0 ? (
            <DataTable columns={pendingColumns} data={pendingWithdrawals} sortable pageSize={20} />
          ) : (
            <EmptyState icon={CreditCard} title="No pending withdrawals" description="All withdrawal requests have been processed." />
          )
        )}

        {activeTab === 'completed' && (
          completed.length > 0 ? (
            <DataTable columns={completedColumns} data={completed} sortable pageSize={20} />
          ) : (
            <EmptyState icon={CreditCard} title="No completed transactions" description="Completed transactions will appear here." />
          )
        )}
      </div>
    </div>
  );
}
