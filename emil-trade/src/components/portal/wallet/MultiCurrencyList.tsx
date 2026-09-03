'use client';

import { ArrowDownToLine, ArrowUpFromLine, Repeat } from 'lucide-react';
import Link from 'next/link';
import { formatMoney, currencySymbol, type SupportedCurrency, SUPPORTED_CURRENCIES } from '@/lib/wallet/money';

export interface CurrencyWallet {
  currency: SupportedCurrency;
  available: string;     // Decimal-formatted
  pending: string;
  locked: string;
}

/**
 * Per-currency mini-card grid. Always renders all five supported
 * currencies — wallets the user hasn't funded yet show a zero balance
 * with a "Fund" CTA so onboarding feels intentional rather than empty.
 */
export default function MultiCurrencyList({ wallets }: { wallets: CurrencyWallet[] }) {
  const byCcy = new Map(wallets.map((w) => [w.currency, w]));
  return (
    <section className="space-y-3">
      <h2
        className="text-[11px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--g-text-secondary)' }}
      >
        Currency wallets
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {SUPPORTED_CURRENCIES.map((ccy) => {
          const w = byCcy.get(ccy) ?? { currency: ccy, available: '0.00', pending: '0.00', locked: '0.00' };
          const empty = w.available === '0.00' && w.pending === '0.00' && w.locked === '0.00';
          return (
            <div
              key={ccy}
              className="rounded-xl"
              style={{
                background: 'var(--g-bg-surface)',
                border: '1px solid var(--g-border-hair)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                padding: '14px 16px',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
                  {ccy}
                </div>
                <span
                  className="num text-[10px] font-bold"
                  style={{
                    color: 'var(--g-text-muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {currencySymbol(ccy)}
                </span>
              </div>

              <div
                className="num mt-2"
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: empty ? 'var(--g-text-muted)' : 'var(--g-text-primary)',
                }}
              >
                {formatMoney(w.available, ccy)}
              </div>

              <div
                className="num text-[10px] mt-0.5"
                style={{ color: 'var(--g-text-muted)' }}
              >
                Available
              </div>

              {(w.pending !== '0.00' || w.locked !== '0.00') && (
                <div className="mt-2 pt-2 border-t text-[10px] space-y-0.5" style={{ borderColor: 'var(--g-border-hair)' }}>
                  {w.pending !== '0.00' && (
                    <div className="num flex justify-between" style={{ color: 'var(--g-text-muted)' }}>
                      <span>Pending</span>
                      <span>{formatMoney(w.pending, ccy)}</span>
                    </div>
                  )}
                  {w.locked !== '0.00' && (
                    <div className="num flex justify-between" style={{ color: 'var(--g-text-muted)' }}>
                      <span>Locked</span>
                      <span>{formatMoney(w.locked, ccy)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-1">
                <ActionPill href={`/dashboard/wallet/deposit?ccy=${ccy}`} icon={<ArrowDownToLine size={11} />} title="Deposit" />
                <ActionPill href={`/dashboard/wallet/withdraw?ccy=${ccy}`} icon={<ArrowUpFromLine size={11} />} title="Withdraw" muted />
                <ActionPill href={`/dashboard/wallet/convert?ccy=${ccy}`} icon={<Repeat size={11} />} title="Convert" muted />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionPill({
  href,
  icon,
  title,
  muted,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="flex-1 inline-flex items-center justify-center transition-colors"
      style={{
        height: 26,
        borderRadius: 6,
        color: muted ? 'var(--g-text-muted)' : 'var(--g-text-secondary)',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      {icon}
    </Link>
  );
}
