'use client';

import { useState } from 'react';
import { History, Download } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatPnL, formatLot, formatPrice, formatCurrency } from '@/lib/utils/format';

interface Props {
  trades: Record<string, unknown>[];
  totalCount: number;
}

export function HistoryClient({ trades, totalCount }: Props) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = trades.filter((t) => {
    const closedAt = new Date(t.closed_at as string).getTime();
    if (dateFrom && closedAt < new Date(dateFrom).getTime()) return false;
    if (dateTo && closedAt > new Date(dateTo + 'T23:59:59').getTime()) return false;
    return true;
  });

  function exportCsv() {
    const headers = ['Date', 'Symbol', 'Direction', 'Lots', 'Open Price', 'Close Price', 'P&L', 'Duration', 'Commission'];
    const rows = filtered.map((t) => {
      const openedAt = new Date(t.opened_at as string);
      const closedAt = new Date(t.closed_at as string);
      const durationMs = closedAt.getTime() - openedAt.getTime();
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      return [
        closedAt.toISOString().slice(0, 16),
        t.symbol,
        t.direction,
        (t.size as number).toFixed(2),
        (t.open_price as number).toFixed(5),
        (t.close_price as number).toFixed(5),
        (t.realized_pnl as number).toFixed(2),
        `${hours}h ${minutes}m`,
        (t.commission as number).toFixed(2),
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    {
      key: 'closed_at',
      label: 'Date',
      render: (row: Record<string, unknown>) => (
        <span className="text-foreground">
          {new Date(row.closed_at as string).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </span>
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
      key: 'size',
      label: 'Lots',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono">{formatLot(row.size as number)}</span>
      ),
    },
    {
      key: 'open_price',
      label: 'Open Price',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono">{formatPrice(row.open_price as number)}</span>
      ),
    },
    {
      key: 'close_price',
      label: 'Close Price',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono">{formatPrice(row.close_price as number)}</span>
      ),
    },
    {
      key: 'realized_pnl',
      label: 'P&L',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => {
        const pnl = row.realized_pnl as number;
        return (
          <span className={cn('mono font-semibold', pnl >= 0 ? 'text-profit' : 'text-loss')}>
            {formatPnL(pnl)}
          </span>
        );
      },
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (row: Record<string, unknown>) => {
        const ms = new Date(row.closed_at as string).getTime() - new Date(row.opened_at as string).getTime();
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return <span className="text-secondary">{h}h {m}m</span>;
      },
    },
    {
      key: 'commission',
      label: 'Commission',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono text-secondary">{formatCurrency(row.commission as number)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-foreground">Trade History</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-elevated transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No trade history"
          description="Closed trades will appear here once you complete trades."
        />
      ) : (
        <DataTable columns={columns} data={filtered as Record<string, unknown>[]} sortable pageSize={25} />
      )}
    </div>
  );
}
