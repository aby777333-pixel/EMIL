'use client';

import DashboardCard from '@/components/portal/dashboard/DashboardCard';
import { formatMoney } from '@/lib/wallet/money';

export interface ClientRow {
  id: string;
  /** masked display name, e.g. "A***n K." */
  display_name: string;
  country: string;
  status: 'registered' | 'funded' | 'active' | 'churned';
  lots_mtd: number;
  last_trade_at: string | null;
  commission_mtd: string;     // Decimal-formatted
  currency: string;
}

const STATUS_COLORS: Record<ClientRow['status'], { bg: string; fg: string; label: string }> = {
  registered: { bg: 'rgba(107,107,115,0.18)', fg: 'var(--g-text-muted)',     label: 'Registered' },
  funded:     { bg: 'rgba(59,130,246,0.12)',  fg: 'var(--g-info)',           label: 'Funded' },
  active:     { bg: 'rgba(16,185,129,0.12)',  fg: 'var(--g-buy)',            label: 'Active' },
  churned:    { bg: 'rgba(220,38,38,0.12)',   fg: 'var(--g-accent)',         label: 'Churned' },
};

/**
 * Referred clients table — names are masked at the API/server side
 * so we never ship a partner the raw PII. Sortable by lots MTD.
 */
export default function ClientsTable({
  clients,
  title = 'Top clients (this month)',
}: {
  clients: ClientRow[];
  title?: string;
}) {
  if (clients.length === 0) {
    return (
      <DashboardCard padding="none">
        <div className="px-6 py-12 text-center">
          <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            No referred clients yet.
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
            Share your referral link to start earning commissions.
          </div>
        </div>
      </DashboardCard>
    );
  }
  return (
    <DashboardCard title={title} padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
              <Th>Client</Th>
              <Th>Country</Th>
              <Th>Status</Th>
              <Th align="right">Lots MTD</Th>
              <Th align="right">Last trade</Th>
              <Th align="right">Commission MTD</Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const s = STATUS_COLORS[c.status];
              return (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--g-border-hair)' }}>
                  <Td>
                    <span style={{ color: 'var(--g-text-primary)' }}>{c.display_name}</span>
                  </Td>
                  <Td>
                    <span className="num text-[11px] uppercase tracking-wider" style={{ color: 'var(--g-text-secondary)' }}>
                      {c.country}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] font-medium"
                      style={{ background: s.bg, color: s.fg }}
                    >
                      {s.label}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num" style={{ color: 'var(--g-text-primary)' }}>
                      {c.lots_mtd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                      {c.last_trade_at ? formatRelative(c.last_trade_at) : '—'}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num" style={{ color: 'var(--g-pnl-positive)' }}>
                      {formatMoney(c.commission_mtd, c.currency)}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className="font-normal" style={{ textAlign: align ?? 'left', padding: '10px 14px' }}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ textAlign: align ?? 'left', padding: '12px 14px' }}>{children}</td>;
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
