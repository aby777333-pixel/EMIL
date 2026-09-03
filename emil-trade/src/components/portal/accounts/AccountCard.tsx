'use client';

import Link from 'next/link';
import {
  TrendingUp,
  ArrowDownToLine,
  ArrowLeftRight,
  KeyRound,
  Settings2,
  Archive,
  ChevronRight,
} from 'lucide-react';
import Decimal from 'decimal.js';
import { formatMoney } from '@/lib/wallet/money';
import { prettyAccountType } from '@/lib/accounts/types';

export interface PortalAccountFull {
  id: string;
  account_number: string;
  account_type: string;
  platform: string;
  currency: string;
  leverage: number;
  balance: string;          // Decimal-formatted
  equity: string;
  free_margin: string;
  margin_level: string | null;
  is_demo: boolean;
  is_active: boolean;
  server: string | null;
}

/**
 * One trading account, rendered as a self-contained card with stats
 * + quick-action row. The card is wider than the dashboard's terse
 * AccountsTable rows because this surface is account-management-first
 * — every visible button maps to a real action the user can take.
 */
export default function AccountCard({
  account,
  onLeverageChange,
  onResetPassword,
  onArchive,
}: {
  account: PortalAccountFull;
  onLeverageChange?: (a: PortalAccountFull) => void;
  onResetPassword?: (a: PortalAccountFull) => void;
  onArchive?: (a: PortalAccountFull) => void;
}) {
  const equity = new Decimal(account.equity);
  const balance = new Decimal(account.balance);
  const pnl = equity.minus(balance);
  const pnlPositive = pnl.greaterThanOrEqualTo(0);

  return (
    <article
      className="rounded-xl"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--g-border-hair)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={`/dashboard/accounts/${account.id}`}
            className="num text-[15px] font-medium hover:underline"
            style={{ color: 'var(--g-text-primary)' }}
          >
            #{account.account_number}
          </Link>
          {account.is_demo ? (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(220,38,38,0.14)', color: 'var(--g-accent)' }}
            >
              Demo
            </span>
          ) : !account.is_active ? (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(107,107,115,0.14)', color: 'var(--g-text-muted)' }}
            >
              Archived
            </span>
          ) : (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--g-buy)' }}
            >
              Live
            </span>
          )}
          <span className="text-[12px]" style={{ color: 'var(--g-text-secondary)' }}>
            {prettyAccountType(account.account_type)} · {account.platform}
          </span>
          {account.server && (
            <span className="text-[11px] num" style={{ color: 'var(--g-text-muted)' }}>
              Server {account.server}
            </span>
          )}
        </div>
        <Link
          href={`/dashboard/accounts/${account.id}`}
          className="text-[12px] hover:underline inline-flex items-center gap-1"
          style={{ color: 'var(--g-text-secondary)' }}
        >
          Statement <ChevronRight size={12} />
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'var(--g-border-hair)' }}>
        <Cell label="Balance" value={formatMoney(account.balance, account.currency)} />
        <Cell
          label="Equity"
          value={formatMoney(account.equity, account.currency)}
          subValue={
            !pnl.isZero()
              ? {
                  text: `${pnlPositive ? '+' : ''}${pnl.toFixed(2)} P&L`,
                  color: pnlPositive ? 'var(--g-pnl-positive)' : 'var(--g-pnl-negative)',
                }
              : undefined
          }
        />
        <Cell label="Free margin" value={formatMoney(account.free_margin, account.currency)} />
        <Cell
          label="Margin level"
          value={account.margin_level ?? '—'}
          mono={Boolean(account.margin_level)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--g-border-hair)' }}>
        <div className="text-[11px] num" style={{ color: 'var(--g-text-muted)' }}>
          Leverage 1:{account.leverage} · {account.currency}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          <ActionLink href="https://zippy-piroshki-21aa30.netlify.app" external icon={<TrendingUp size={13} />}>Trade</ActionLink>
          <ActionLink href={`/dashboard/wallet/deposit?ccy=${account.currency}`} icon={<ArrowDownToLine size={13} />}>Deposit</ActionLink>
          <ActionLink href={`/dashboard/wallet/transfer`} icon={<ArrowLeftRight size={13} />}>Transfer</ActionLink>
          {onLeverageChange && (
            <ActionButton onClick={() => onLeverageChange(account)} icon={<Settings2 size={13} />}>
              Leverage
            </ActionButton>
          )}
          {onResetPassword && (
            <ActionButton onClick={() => onResetPassword(account)} icon={<KeyRound size={13} />}>
              Reset password
            </ActionButton>
          )}
          {onArchive && account.is_active && !account.is_demo && (
            <ActionButton onClick={() => onArchive(account)} icon={<Archive size={13} />} muted>
              Archive
            </ActionButton>
          )}
        </div>
      </div>
    </article>
  );
}

function Cell({
  label,
  value,
  subValue,
  mono = true,
}: {
  label: string;
  value: string;
  subValue?: { text: string; color: string };
  mono?: boolean;
}) {
  return (
    <div style={{ background: 'var(--g-bg-surface)', padding: '14px 18px' }}>
      <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
        {label}
      </div>
      <div
        className={mono ? 'num' : ''}
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: 'var(--g-text-primary)',
          marginTop: 4,
        }}
      >
        {value}
      </div>
      {subValue && (
        <div
          className="num text-[11px] mt-0.5"
          style={{ color: subValue.color }}
        >
          {subValue.text}
        </div>
      )}
    </div>
  );
}

function ActionLink({
  href,
  external,
  icon,
  children,
}: {
  href: string;
  external?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] transition-colors hover:bg-white/[0.04]"
      style={{ color: 'var(--g-text-secondary)', border: '1px solid var(--g-border-soft)' }}
    >
      {icon}
      {children}
    </Link>
  );
}

function ActionButton({
  onClick,
  icon,
  children,
  muted,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] transition-colors hover:bg-white/[0.04]"
      style={{
        color: muted ? 'var(--g-text-muted)' : 'var(--g-text-secondary)',
        border: '1px solid var(--g-border-soft)',
      }}
    >
      {icon}
      {children}
    </button>
  );
}
