'use client';

import Link from 'next/link';
import {
  TrendingUp,
  ArrowDownToLine,
  ArrowLeftRight,
  KeyRound,
  Plus,
} from 'lucide-react';
import DashboardCard from './DashboardCard';

export interface PortalAccountRow {
  id: string;
  account_number: string;
  account_type: string;
  platform: string;
  leverage: number;
  currency: string;
  balance: string; // Decimal-formatted
  equity: string;
  is_demo: boolean;
}

/**
 * Accounts table — every row is one trading account with quick-action
 * buttons. The "Trade" action opens the existing trading terminal in
 * a new tab so the portal stays anchored.
 */
export default function AccountsTable({ accounts }: { accounts: PortalAccountRow[] }) {
  return (
    <DashboardCard
      title="Trading accounts"
      trailing={
        <Link
          href="/dashboard/accounts/new"
          className="text-[11px] px-2.5 py-1 rounded transition-colors hover:bg-white/[0.04] inline-flex items-center gap-1"
          style={{ color: 'var(--g-accent)', border: '1px solid rgba(220,38,38,0.25)' }}
        >
          <Plus size={12} /> Open new
        </Link>
      }
      padding="none"
    >
      {accounts.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            No trading accounts yet
          </div>
          <Link
            href="/dashboard/accounts/new"
            className="inline-block mt-3 text-[12px]"
            style={{ color: 'var(--g-accent)' }}
          >
            Open your first account →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr
                className="text-[10px] uppercase tracking-[0.14em]"
                style={{ color: 'var(--g-text-muted)' }}
              >
                <Th>Account</Th>
                <Th>Type</Th>
                <Th>Leverage</Th>
                <Th align="right">Balance</Th>
                <Th align="right">Equity</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr
                  key={acc.id}
                  className="border-t"
                  style={{ borderColor: 'var(--g-border-hair)' }}
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="num font-medium" style={{ color: 'var(--g-text-primary)' }}>
                        {acc.account_number}
                      </span>
                      {acc.is_demo && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(220,38,38,0.15)', color: 'var(--g-accent)' }}
                        >
                          DEMO
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span style={{ color: 'var(--g-text-secondary)' }}>{prettyType(acc.account_type)}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--g-text-muted)' }}>
                      {acc.platform}
                    </span>
                  </Td>
                  <Td>
                    <span className="num" style={{ color: 'var(--g-text-secondary)' }}>1:{acc.leverage}</span>
                  </Td>
                  <Td align="right">
                    <span className="num" style={{ color: 'var(--g-text-primary)' }}>
                      {moneyDisplay(acc.balance, acc.currency)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num" style={{ color: 'var(--g-text-primary)' }}>
                      {moneyDisplay(acc.equity, acc.currency)}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Action
                        href="https://zippy-piroshki-21aa30.netlify.app"
                        external
                        title="Trade"
                        icon={<TrendingUp size={13} />}
                      />
                      <Action
                        href={`/dashboard/wallet?deposit=${acc.id}`}
                        title="Deposit"
                        icon={<ArrowDownToLine size={13} />}
                      />
                      <Action
                        href={`/dashboard/wallet?transfer=${acc.id}`}
                        title="Transfer"
                        icon={<ArrowLeftRight size={13} />}
                      />
                      <Action
                        href={`/dashboard/positions/${acc.id}`}
                        title="Reset password"
                        icon={<KeyRound size={13} />}
                      />
                    </div>
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

function Action({ href, external, title, icon }: { href: string; external?: boolean; title: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      title={title}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center justify-center transition-colors hover:bg-white/[0.04]"
      style={{
        width: 26, height: 26, borderRadius: 6,
        color: 'var(--g-text-secondary)',
      }}
    >
      {icon}
    </Link>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className="font-normal"
      style={{ textAlign: align ?? 'left', padding: '10px 14px' }}
    >
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td style={{ textAlign: align ?? 'left', padding: '10px 14px' }}>{children}</td>
  );
}

function prettyType(t: string): string {
  return t
    .split(/[_\s]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function moneyDisplay(amount: string, currency: string): string {
  const sym =
    currency === 'USD' ? '$'
    : currency === 'EUR' ? '€'
    : currency === 'GBP' ? '£'
    : currency === 'INR' ? '₹'
    : '';
  // amount is already the canonical Decimal-formatted string.
  const [whole, frac] = amount.split('.');
  return `${sym}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${frac ? '.' + frac : '.00'}`;
}
