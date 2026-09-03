'use client';

import { Briefcase } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatCurrency, formatPnL, formatLot, formatPrice } from '@/lib/utils/format';

interface Props {
  positions: Array<Record<string, unknown>>;
}

export function PositionsClient({ positions }: Props) {
  const totalPnl = positions.reduce((sum, p) => sum + (p.floating_pnl as number ?? 0), 0);

  if (positions.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-foreground">Open Positions</h1>
        <EmptyState
          icon={Briefcase}
          title="No open positions"
          description="Your open positions will appear here once you start trading."
        />
      </div>
    );
  }

  const columns = [
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
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-bold',
            row.direction === 'BUY' ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'
          )}
        >
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
      key: 'current_price',
      label: 'Current Price',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono">{formatPrice(row.current_price as number)}</span>
      ),
    },
    {
      key: 'floating_pnl',
      label: 'P&L',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => {
        const pnl = row.floating_pnl as number;
        return (
          <span className={cn('mono font-semibold', pnl >= 0 ? 'text-profit' : 'text-loss')}>
            {formatPnL(pnl)}
          </span>
        );
      },
    },
    {
      key: 'sl',
      label: 'SL',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono text-secondary">{row.sl ? formatPrice(row.sl as number) : '\u2014'}</span>
      ),
    },
    {
      key: 'tp',
      label: 'TP',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono text-secondary">{row.tp ? formatPrice(row.tp as number) : '\u2014'}</span>
      ),
    },
    {
      key: 'opened_at',
      label: 'Open Time',
      render: (row: Record<string, unknown>) => (
        <span className="text-secondary">
          {new Date(row.opened_at as string).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-foreground">Open Positions</h1>
        <div className="rounded-lg border border-border bg-elevated px-4 py-2">
          <span className="text-xs text-secondary mr-2">Total P&L:</span>
          <span className={cn('mono text-sm font-bold', totalPnl >= 0 ? 'text-profit' : 'text-loss')}>
            {formatPnL(totalPnl)}
          </span>
        </div>
      </div>

      <DataTable columns={columns} data={positions as Record<string, unknown>[]} sortable />
    </div>
  );
}
