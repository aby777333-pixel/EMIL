'use client';

import DashboardCard from '@/components/portal/dashboard/DashboardCard';
import { formatMoney } from '@/lib/wallet/money';

export interface CommissionRow {
  id: string;
  period: string;          // e.g. "May 2026" or "2026-05-08"
  amount: string;          // Decimal-formatted
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'disputed' | 'adjusted';
  client_count: number;
  paid_at: string | null;
}

const STATUS_COLORS: Record<CommissionRow['status'], { bg: string; fg: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.12)',  fg: '#F59E0B',                 label: 'Pending' },
  approved: { bg: 'rgba(59,130,246,0.12)',  fg: 'var(--g-info)',           label: 'Approved' },
  paid:     { bg: 'rgba(16,185,129,0.12)',  fg: 'var(--g-buy)',            label: 'Paid' },
  disputed: { bg: 'rgba(220,38,38,0.12)',   fg: 'var(--g-accent)',         label: 'Disputed' },
  adjusted: { bg: 'rgba(107,107,115,0.18)', fg: 'var(--g-text-muted)',     label: 'Adjusted' },
};

export default function CommissionsTable({ commissions }: { commissions: CommissionRow[] }) {
  if (commissions.length === 0) {
    return (
      <DashboardCard padding="none">
        <div className="px-6 py-12 text-center">
          <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            No commission entries yet.
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
            Once your referred clients start trading, payouts post here.
          </div>
        </div>
      </DashboardCard>
    );
  }
  return (
    <DashboardCard title="Commission history" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
              <Th>Period</Th>
              <Th align="right">Amount</Th>
              <Th align="right">Clients</Th>
              <Th>Status</Th>
              <Th align="right">Paid</Th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => {
              const s = STATUS_COLORS[c.status];
              return (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--g-border-hair)' }}>
                  <Td>
                    <span style={{ color: 'var(--g-text-primary)' }}>{c.period}</span>
                  </Td>
                  <Td align="right">
                    <span className="num" style={{ color: 'var(--g-pnl-positive)' }}>
                      {formatMoney(c.amount, c.currency)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num" style={{ color: 'var(--g-text-secondary)' }}>{c.client_count}</span>
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
                    <span className="num text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                      {c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—'}
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
