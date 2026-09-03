'use client';

import { Users, UserCheck, BarChart3, DollarSign, Clock, Trophy } from 'lucide-react';
import { formatMoney } from '@/lib/wallet/money';

export interface IbStats {
  totalClients: number;
  activeTraders: number;
  /** lots traded this month-to-date */
  lotsMTD: string;
  /** commission earned MTD, decimal-formatted, base currency */
  commissionMTD: string;
  pendingPayout: string;
  lifetimeCommission: string;
  baseCurrency: string;
}

/**
 * Six-card stat grid for the IB overview. Money values arrive as
 * Decimal-formatted strings; lot counts are plain strings (TanStack-
 * compatible) and rendered with tabular-nums via the .num class.
 */
export default function IbOverviewStats({ stats }: { stats: IbStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Stat icon={<Users size={14} />}      label="Total clients"    value={stats.totalClients.toLocaleString()} />
      <Stat icon={<UserCheck size={14} />}  label="Active traders"   value={stats.activeTraders.toLocaleString()} subtle="MTD" />
      <Stat icon={<BarChart3 size={14} />}  label="Lots traded"      value={formatLots(stats.lotsMTD)} subtle="MTD" />
      <Stat icon={<DollarSign size={14} />} label="Commission"       value={formatMoney(stats.commissionMTD, stats.baseCurrency)} subtle="MTD" emphasis />
      <Stat icon={<Clock size={14} />}      label="Pending"          value={formatMoney(stats.pendingPayout, stats.baseCurrency)} />
      <Stat icon={<Trophy size={14} />}     label="Lifetime"         value={formatMoney(stats.lifetimeCommission, stats.baseCurrency)} />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  subtle,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtle?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--g-text-muted)' }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
          {label}
        </span>
        {subtle && (
          <span className="ml-auto text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--g-text-muted)' }}>
            {subtle}
          </span>
        )}
      </div>
      <div
        className="num mt-2"
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: emphasis ? 'var(--g-text-primary)' : 'var(--g-text-secondary)',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatLots(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
