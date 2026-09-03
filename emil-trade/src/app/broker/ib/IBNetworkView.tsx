'use client';

import { useState } from 'react';
import { Network, ChevronRight, Users } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface IBEntry {
  id: string;
  user_id: string;
  parent_ib_id: string | null;
  tier_level: number;
  total_clients: number;
  volume_mtd: number;
  commission_mtd: number;
  user: {
    id: string;
    full_name: string | null;
    email: string | null;
    status: string | null;
  };
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

export function IBNetworkView({ ibEntries }: { ibEntries: IBEntry[] }) {
  const [view, setView] = useState<'table' | 'tree'>('table');

  const columns = [
    {
      key: 'name',
      label: 'IB Name',
      render: (row: Record<string, unknown>) => {
        const entry = row as unknown as IBEntry;
        return (
          <div className="flex items-center gap-2">
            <Network className="h-3.5 w-3.5 text-accent" />
            <div>
              <p className="font-medium text-foreground">{entry.user?.full_name ?? 'Unknown'}</p>
              <p className="text-[10px] text-muted">{entry.user?.email ?? ''}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'tier_level',
      label: 'Tier',
      render: (row: Record<string, unknown>) => (
        <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
          Tier {Number(row.tier_level)}
        </span>
      ),
    },
    {
      key: 'total_clients',
      label: 'Total Clients',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => <span className="mono">{Number(row.total_clients ?? 0)}</span>,
    },
    {
      key: 'volume_mtd',
      label: 'Volume MTD',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => <span className="mono">{formatCurrency(Number(row.volume_mtd ?? 0))}</span>,
    },
    {
      key: 'commission_mtd',
      label: 'Commission MTD',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono text-profit">{formatCurrency(Number(row.commission_mtd ?? 0))}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => {
        const entry = row as unknown as IBEntry;
        return <StatusBadge status={entry.user?.status ?? 'active'} />;
      },
    },
  ];

  // Build simple tree structure
  const rootIBs = ibEntries.filter((ib) => !ib.parent_ib_id);
  const childrenMap = new Map<string, IBEntry[]>();
  ibEntries.forEach((ib) => {
    if (ib.parent_ib_id) {
      const children = childrenMap.get(ib.parent_ib_id) ?? [];
      children.push(ib);
      childrenMap.set(ib.parent_ib_id, children);
    }
  });

  function renderTreeNode(ib: IBEntry, depth: number) {
    const children = childrenMap.get(ib.user_id) ?? [];
    return (
      <div key={ib.id}>
        <div
          className="flex items-center justify-between rounded-lg border border-border bg-elevated p-3 transition-colors hover:border-border-strong"
          style={{ marginLeft: depth * 24 }}
        >
          <div className="flex items-center gap-2">
            {children.length > 0 && <ChevronRight className="h-3 w-3 text-muted" />}
            <Network className="h-3.5 w-3.5 text-accent" />
            <div>
              <span className="text-sm font-medium text-foreground">{ib.user?.full_name ?? 'Unknown'}</span>
              <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                Tier {ib.tier_level}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted"><Users className="inline h-3 w-3 mr-0.5" />{ib.total_clients ?? 0}</span>
            <span className="mono text-profit">{formatCurrency(ib.commission_mtd ?? 0)}</span>
          </div>
        </div>
        {children.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  }

  if (ibEntries.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="No IBs"
        description="Introducing broker relationships will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('table')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            view === 'table' ? 'bg-accent text-white' : 'text-secondary hover:bg-surface'
          }`}
        >
          Table
        </button>
        <button
          onClick={() => setView('tree')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            view === 'tree' ? 'bg-accent text-white' : 'text-secondary hover:bg-surface'
          }`}
        >
          Hierarchy
        </button>
      </div>

      {view === 'table' ? (
        <DataTable
          columns={columns}
          data={ibEntries as unknown as Record<string, unknown>[]}
          sortable
          pageSize={20}
        />
      ) : (
        <div className="space-y-2">
          {rootIBs.map((ib) => renderTreeNode(ib, 0))}
        </div>
      )}
    </div>
  );
}
