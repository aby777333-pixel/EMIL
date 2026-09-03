'use client';

import { useState } from 'react';
import { Scale, AlertTriangle } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';

interface AmlAlert {
  id: string;
  alert_type: string;
  severity: string;
  amount: number | null;
  status: string;
  description: string | null;
  evidence: string | null;
  transaction_id: string | null;
  created_at: string;
  user: { id: string; full_name: string | null; email: string | null };
}

function formatCurrency(val: number): string {
  return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ComplianceView({ alerts }: { alerts: AmlAlert[] }) {
  const [selected, setSelected] = useState<AmlAlert | null>(null);
  const [filter, setFilter] = useState<string>('pending');

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.status === filter);

  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (row: Record<string, unknown>) => {
        const a = row as unknown as AmlAlert;
        return (
          <div>
            <p className="font-medium text-foreground">{a.user?.full_name ?? 'Unknown'}</p>
            <p className="text-[10px] text-muted">{a.user?.email ?? ''}</p>
          </div>
        );
      },
    },
    { key: 'alert_type', label: 'Alert Type' },
    {
      key: 'severity',
      label: 'Severity',
      render: (row: Record<string, unknown>) => {
        const sev = String(row.severity);
        const variant = sev === 'critical' ? 'danger' as const : sev === 'high' ? 'warning' as const : 'info' as const;
        return <StatusBadge status={sev} variant={variant} />;
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right' as const,
      render: (row: Record<string, unknown>) =>
        row.amount ? <span className="mono">{formatCurrency(Number(row.amount))}</span> : '\u2014',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: Record<string, unknown>) => new Date(String(row.created_at)).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (row: Record<string, unknown>) => (
        <button
          onClick={() => setSelected(row as unknown as AmlAlert)}
          className="rounded px-2 py-1 text-[10px] text-accent transition-colors hover:bg-accent/10"
        >
          Details
        </button>
      ),
    },
  ];

  return (
    <>
      {/* Filter Bar */}
      <div className="flex gap-2 mb-4">
        {['pending', 'cleared', 'escalated', 'sar_filed', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-accent text-white' : 'text-secondary hover:bg-surface hover:text-foreground'
            }`}
          >
            {f === 'sar_filed' ? 'SAR Filed' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          sortable
          pageSize={20}
        />
      ) : (
        <EmptyState
          icon={Scale}
          title="No alerts"
          description={`No ${filter === 'all' ? '' : filter + ' '}AML alerts found.`}
        />
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="AML Alert Details"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted">User</p>
                <p className="font-medium text-foreground">{selected.user?.full_name ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-muted">Alert Type</p>
                <p className="font-medium text-foreground">{selected.alert_type}</p>
              </div>
              <div>
                <p className="text-muted">Severity</p>
                <StatusBadge
                  status={selected.severity}
                  variant={selected.severity === 'critical' ? 'danger' : selected.severity === 'high' ? 'warning' : 'info'}
                />
              </div>
              <div>
                <p className="text-muted">Amount</p>
                <p className="mono text-foreground">{selected.amount ? formatCurrency(selected.amount) : '\u2014'}</p>
              </div>
              <div>
                <p className="text-muted">Status</p>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <p className="text-muted">Transaction ID</p>
                <p className="mono text-foreground">{selected.transaction_id ?? '\u2014'}</p>
              </div>
            </div>

            {selected.description && (
              <div>
                <p className="mb-1 text-xs text-muted">Description</p>
                <p className="rounded-lg bg-surface p-3 text-xs text-secondary">{selected.description}</p>
              </div>
            )}

            {selected.evidence && (
              <div>
                <p className="mb-1 text-xs text-muted">Evidence</p>
                <p className="rounded-lg bg-surface p-3 text-xs text-secondary font-mono">{selected.evidence}</p>
              </div>
            )}

            {/* Action Buttons */}
            {selected.status === 'pending' && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button className="rounded-lg bg-profit px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-profit/80">
                  Clear
                </button>
                <button className="rounded-lg bg-gold px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-gold/80">
                  Escalate
                </button>
                <button className="rounded-lg bg-loss px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-loss/80">
                  File SAR
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
