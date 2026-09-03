'use client';

import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Coins, Receipt } from 'lucide-react';
import { formatMoney } from '@/lib/wallet/money';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

export type TxType = 'deposit' | 'withdrawal' | 'transfer' | 'commission' | 'bonus' | 'fee' | 'adjustment';
export type TxStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed';

export interface WalletTransaction {
  id: string;
  type: TxType;
  amount: string;          // Decimal-formatted, no sign
  currency: string;
  method: string | null;
  status: TxStatus;
  reference: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<TxType, React.ReactNode> = {
  deposit:    <ArrowDownToLine size={13} />,
  withdrawal: <ArrowUpFromLine size={13} />,
  transfer:   <ArrowLeftRight size={13} />,
  commission: <Coins size={13} />,
  bonus:      <Coins size={13} />,
  fee:        <Receipt size={13} />,
  adjustment: <Receipt size={13} />,
};

const STATUS_COLORS: Record<TxStatus, { bg: string; fg: string }> = {
  pending:    { bg: 'rgba(245,158,11,0.12)', fg: '#F59E0B' },
  processing: { bg: 'rgba(59,130,246,0.12)', fg: 'var(--g-info)' },
  completed:  { bg: 'rgba(16,185,129,0.12)', fg: 'var(--g-buy)' },
  failed:     { bg: 'rgba(220,38,38,0.12)',  fg: 'var(--g-accent)' },
  cancelled:  { bg: 'rgba(107,107,115,0.18)', fg: 'var(--g-text-muted)' },
  reversed:   { bg: 'rgba(107,107,115,0.18)', fg: 'var(--g-text-muted)' },
};

/**
 * Transaction history. Read-only — server-rendered with no realtime
 * subscription since wallet ledger entries are created infrequently
 * and updates would only flip a status pill.
 */
export default function TransactionHistoryTable({
  transactions,
}: {
  transactions: WalletTransaction[];
}) {
  return (
    <DashboardCard title="Transaction history" padding="none">
      {transactions.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            No transactions yet
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
            Deposits, withdrawals, transfers, and IB commissions appear here.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr
                className="text-[10px] uppercase tracking-[0.14em]"
                style={{ color: 'var(--g-text-muted)' }}
              >
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Method</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th>Reference</Th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-t" style={{ borderColor: 'var(--g-border-hair)' }}>
                  <Td>
                    <span className="num" style={{ color: 'var(--g-text-secondary)' }}>
                      {formatRelativeDate(tx.created_at)}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      <span style={{ color: 'var(--g-text-muted)' }}>{TYPE_ICONS[tx.type]}</span>
                      <span style={{ color: 'var(--g-text-primary)' }}>{prettyType(tx.type)}</span>
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: 'var(--g-text-secondary)' }}>{prettyMethod(tx.method)}</span>
                  </Td>
                  <Td align="right">
                    <span
                      className="num"
                      style={{
                        color: tx.type === 'withdrawal' || tx.type === 'fee'
                          ? 'var(--g-pnl-negative)'
                          : 'var(--g-pnl-positive)',
                      }}
                    >
                      {tx.type === 'withdrawal' || tx.type === 'fee' ? '-' : '+'}
                      {formatMoney(tx.amount, tx.currency)}
                    </span>
                  </Td>
                  <Td>
                    <StatusPill status={tx.status} />
                  </Td>
                  <Td>
                    <span className="num text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                      {tx.reference ?? '—'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
}

function StatusPill({ status }: { status: TxStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] font-medium"
      style={{ background: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className="font-normal" style={{ textAlign: align ?? 'left', padding: '10px 14px' }}>{children}</th>;
}

function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ textAlign: align ?? 'left', padding: '10px 14px' }}>{children}</td>;
}

function prettyType(t: TxType): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function prettyMethod(m: string | null): string {
  if (!m) return '—';
  switch (m.toLowerCase()) {
    case 'bank_wire': return 'Bank wire';
    case 'card':      return 'Card';
    case 'upi':       return 'UPI';
    case 'crypto':    return 'Crypto';
    case 'local':     return 'Local';
    case 'voucher':   return 'Voucher';
    case 'internal':  return 'Internal';
    default:          return m.replace(/_/g, ' ');
  }
}

function formatRelativeDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
