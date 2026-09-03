'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Users } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface Client {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  kyc_status: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  trading_accounts: { account_number: string; balance: number }[];
}

export function ClientListView({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = clients;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      );
    }
    if (kycFilter !== 'all') {
      result = result.filter((c) => c.kyc_status === kycFilter);
    }
    return result;
  }, [clients, search, kycFilter]);

  const columns = [
    {
      key: 'name',
      label: 'Client',
      render: (row: Record<string, unknown>) => {
        const name = row.full_name as string | null;
        const email = row.email as string | null;
        const initials = name
          ? name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          : '??';
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
              {initials}
            </div>
            <div>
              <p className="font-medium text-foreground">{name ?? 'Unknown'}</p>
              <p className="text-[10px] text-muted">{email ?? ''}</p>
            </div>
          </div>
        );
      },
    },
    { key: 'country', label: 'Country' },
    {
      key: 'account',
      label: 'Account #',
      render: (row: Record<string, unknown>) => {
        const accounts = row.trading_accounts as { account_number: string }[];
        return accounts?.[0]?.account_number ?? '\u2014';
      },
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => {
        const accounts = row.trading_accounts as { balance: number }[];
        const bal = accounts?.reduce((s, a) => s + (a.balance || 0), 0) ?? 0;
        return <span className="mono">${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>;
      },
    },
    {
      key: 'kyc_status',
      label: 'KYC',
      render: (row: Record<string, unknown>) => {
        const status = (row.kyc_status as string) ?? 'pending';
        return <StatusBadge status={status} />;
      },
    },
    {
      key: 'last_sign_in_at',
      label: 'Last Login',
      render: (row: Record<string, unknown>) => {
        const d = row.last_sign_in_at as string | null;
        return d ? new Date(d).toLocaleDateString() : '\u2014';
      },
    },
    {
      key: 'actions',
      label: '',
      width: '60px',
      render: (row: Record<string, unknown>) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/broker/clients/${row.id}`);
          }}
          className="rounded px-2 py-1 text-[10px] text-accent transition-colors hover:bg-accent/10"
        >
          View
        </button>
      ),
    },
  ];

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No clients yet"
        description="Clients will appear here once they register under your brokerage."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-secondary transition-colors hover:bg-surface hover:text-foreground"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-surface/50 p-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted">
              KYC Status
            </label>
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground"
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Count */}
      <p className="text-[11px] text-muted">{filtered.length} clients shown</p>

      {/* Table */}
      <div
        className="cursor-pointer"
        onClick={(e) => {
          const row = (e.target as HTMLElement).closest('tr');
          if (!row) return;
          const idx = row.rowIndex - 1; // subtract header
          if (idx >= 0 && idx < filtered.length) {
            router.push(`/broker/clients/${filtered[idx].id}`);
          }
        }}
      >
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          sortable
          pageSize={20}
        />
      </div>
    </div>
  );
}
