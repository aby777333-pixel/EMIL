'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface Position {
  id: string;
  user_id: string;
  account_id: string;
  account_number: string;
  symbol: string;
  direction: string;
  lots: number;
  open_price: number;
  current_price: number;
  profit: number;
  book_type: string;
  user_name: string;
  user_email: string;
}

interface ExposureSummary {
  symbol: string;
  longLots: number;
  shortLots: number;
  netLots: number;
  netPnl: number;
}

export default function TradingDeskPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('broker_id')
      .eq('id', user.id)
      .single();

    if (!profile?.broker_id) return;

    const { data } = await supabase
      .from('positions')
      .select(`
        id, user_id, account_id, symbol, direction, lots, open_price, current_price, profit, book_type,
        account:trading_accounts!inner(account_number, broker_id),
        user:users!inner(full_name, email)
      `)
      .eq('account.broker_id', profile.broker_id)
      .eq('status', 'open');

    if (data) {
      setPositions(
        data.map((p: Record<string, unknown>) => {
          const account = p.account as Record<string, unknown>;
          const user = p.user as Record<string, unknown>;
          return {
            id: String(p.id),
            user_id: String(p.user_id),
            account_id: String(p.account_id),
            account_number: String(account?.account_number ?? ''),
            symbol: String(p.symbol),
            direction: String(p.direction),
            lots: Number(p.lots),
            open_price: Number(p.open_price),
            current_price: Number(p.current_price),
            profit: Number(p.profit),
            book_type: String(p.book_type ?? 'A'),
            user_name: String(user?.full_name ?? 'Unknown'),
            user_email: String(user?.email ?? ''),
          };
        }),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // Calculate summaries
  const longLots = positions.filter((p) => p.direction === 'buy').reduce((s, p) => s + p.lots, 0);
  const shortLots = positions.filter((p) => p.direction === 'sell').reduce((s, p) => s + p.lots, 0);
  const netPosition = longLots - shortLots;
  const bBookPnl = positions
    .filter((p) => p.book_type === 'B' || p.book_type === 'b')
    .reduce((s, p) => s + -p.profit, 0); // Broker P&L is inverse of client P&L on B-book

  // Exposure per symbol
  const exposureMap = new Map<string, ExposureSummary>();
  positions.forEach((p) => {
    const existing = exposureMap.get(p.symbol) ?? { symbol: p.symbol, longLots: 0, shortLots: 0, netLots: 0, netPnl: 0 };
    if (p.direction === 'buy') existing.longLots += p.lots;
    else existing.shortLots += p.lots;
    existing.netLots = existing.longLots - existing.shortLots;
    existing.netPnl += p.profit;
    exposureMap.set(p.symbol, existing);
  });
  const exposures = Array.from(exposureMap.values()).sort((a, b) => Math.abs(b.netLots) - Math.abs(a.netLots));

  const columns = [
    {
      key: 'user_name',
      label: 'Client',
      render: (row: Record<string, unknown>) => (
        <div>
          <p className="font-medium text-foreground">{String(row.user_name)}</p>
          <p className="text-[10px] text-muted">{String(row.user_email)}</p>
        </div>
      ),
    },
    { key: 'account_number', label: 'Account' },
    { key: 'symbol', label: 'Symbol', render: (row: Record<string, unknown>) => <span className="font-medium">{String(row.symbol)}</span> },
    {
      key: 'direction',
      label: 'Direction',
      render: (row: Record<string, unknown>) => (
        <StatusBadge status={String(row.direction)} variant={row.direction === 'buy' ? 'success' : 'danger'} />
      ),
    },
    {
      key: 'lots',
      label: 'Lots',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => <span className="mono">{Number(row.lots).toFixed(2)}</span>,
    },
    {
      key: 'open_price',
      label: 'Open Price',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => <span className="mono">{Number(row.open_price).toFixed(5)}</span>,
    },
    {
      key: 'current_price',
      label: 'Current',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => <span className="mono">{Number(row.current_price).toFixed(5)}</span>,
    },
    {
      key: 'profit',
      label: 'P&L',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => {
        const pnl = Number(row.profit);
        return <span className={`mono font-medium ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>${pnl.toFixed(2)}</span>;
      },
    },
    {
      key: 'book_type',
      label: 'Book',
      render: (row: Record<string, unknown>) => (
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
          String(row.book_type).toUpperCase() === 'B' ? 'bg-gold/15 text-gold' : 'bg-accent/15 text-accent'
        }`}>
          {String(row.book_type).toUpperCase()}-Book
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Dealing Desk</h1>
        <LoadingSkeleton variant="card" count={4} />
        <LoadingSkeleton variant="table" count={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dealing Desk</h1>
        <p className="text-xs text-secondary">Live positions and broker exposure</p>
      </div>

      {/* Summary Bar */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard label="Long Lots" value={longLots.toFixed(2)} icon={TrendingUp} />
        <KpiCard label="Short Lots" value={shortLots.toFixed(2)} icon={TrendingDown} />
        <KpiCard label="Net Position" value={netPosition.toFixed(2)} icon={BarChart3} />
        <KpiCard
          label="Broker P&L (B-Book)"
          value={`$${bBookPnl.toFixed(2)}`}
          icon={DollarSign}
          change={bBookPnl >= 0 ? 1 : -1}
        />
      </div>

      {/* All Open Positions */}
      {positions.length > 0 ? (
        <DataTable
          columns={columns}
          data={positions as unknown as Record<string, unknown>[]}
          sortable
          pageSize={25}
        />
      ) : (
        <EmptyState icon={BarChart3} title="No open positions" description="Open positions will appear here in real-time." />
      )}

      {/* Exposure Summary */}
      {exposures.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Exposure by Symbol</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {exposures.map((exp) => (
              <div key={exp.symbol} className="rounded-xl border border-border bg-elevated p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">{exp.symbol}</span>
                  <span className={`mono text-xs font-medium ${exp.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    ${exp.netPnl.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <p className="text-muted">Long</p>
                    <p className="mono text-profit">{exp.longLots.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted">Short</p>
                    <p className="mono text-loss">{exp.shortLots.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted">Net</p>
                    <p className={`mono ${exp.netLots >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {exp.netLots.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
