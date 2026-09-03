'use client';

import { useState } from 'react';
import { Flag, Eye, Settings } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TabGroup } from '@/components/ui/TabGroup';

interface SurveillanceFlag {
  id: string;
  flag_type: string;
  severity: string;
  status: string;
  description: string;
  created_at: string;
  user: { id: string; full_name: string | null; email: string | null };
  account: { account_number: string } | null;
}

interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  threshold: number | null;
}

export function SurveillanceView({
  flags,
  rules,
}: {
  flags: SurveillanceFlag[];
  rules: Rule[];
}) {
  const [activeTab, setActiveTab] = useState('flags');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const tabs = [
    { id: 'flags', label: 'Active Flags', count: flags.filter((f) => f.status === 'active').length },
    { id: 'rules', label: 'Detection Rules', count: rules.length },
  ];

  const filteredFlags =
    statusFilter === 'all' ? flags : flags.filter((f) => f.status === statusFilter);

  const flagColumns = [
    {
      key: 'user',
      label: 'User',
      render: (row: Record<string, unknown>) => {
        const u = row.user as SurveillanceFlag['user'];
        return (
          <div>
            <p className="font-medium text-foreground">{u?.full_name ?? 'Unknown'}</p>
            <p className="text-[10px] text-muted">{u?.email ?? ''}</p>
          </div>
        );
      },
    },
    {
      key: 'account',
      label: 'Account',
      render: (row: Record<string, unknown>) => {
        const acc = row.account as SurveillanceFlag['account'];
        return acc?.account_number ?? '\u2014';
      },
    },
    { key: 'flag_type', label: 'Flag Type' },
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
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} />,
    },
    {
      key: 'description',
      label: 'Description',
      render: (row: Record<string, unknown>) => (
        <span className="max-w-xs truncate text-secondary">{String(row.description)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      render: () => (
        <div className="flex gap-1.5">
          <button className="rounded bg-profit/10 px-2 py-1 text-[10px] font-medium text-profit transition-colors hover:bg-profit/20">
            Clear
          </button>
          <button className="rounded bg-loss/10 px-2 py-1 text-[10px] font-medium text-loss transition-colors hover:bg-loss/20">
            Escalate
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === 'flags' && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              {['active', 'cleared', 'escalated', 'all'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-accent text-white'
                      : 'text-secondary hover:bg-surface hover:text-foreground'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {filteredFlags.length > 0 ? (
              <DataTable
                columns={flagColumns}
                data={filteredFlags as unknown as Record<string, unknown>[]}
                sortable
                pageSize={20}
              />
            ) : (
              <EmptyState
                icon={Eye}
                title="No flags"
                description={`No ${statusFilter === 'all' ? '' : statusFilter + ' '}surveillance flags.`}
              />
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-3">
            {rules.length > 0 ? (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-elevated p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-muted" />
                      <span className="text-sm font-medium text-foreground">{rule.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary">{rule.description}</p>
                    {rule.threshold != null && (
                      <p className="mt-0.5 text-[10px] text-muted">Threshold: {rule.threshold}</p>
                    )}
                  </div>
                  {/* Toggle Switch */}
                  <button
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      rule.enabled ? 'bg-accent' : 'bg-surface'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        rule.enabled ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Settings}
                title="No rules configured"
                description="Surveillance detection rules will appear here."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
