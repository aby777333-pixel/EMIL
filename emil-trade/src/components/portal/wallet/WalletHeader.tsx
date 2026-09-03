'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatMoney } from '@/lib/wallet/money';

/**
 * Header strip on the wallet overview — total wallet equity converted
 * to the account base currency, plus a 24h delta. The delta is
 * supplied by the server (computed from balance snapshots) so the
 * client never tries to recompute it from FX rates it doesn't have.
 */
export default function WalletHeader({
  totalEquity,
  baseCurrency,
  delta24hPct,
  delta24hAmount,
}: {
  totalEquity: string;
  baseCurrency: string;
  delta24hPct: number;
  delta24hAmount: string;
}) {
  const positive = delta24hPct >= 0;
  return (
    <header className="flex flex-col gap-2 mb-6">
      <div
        className="text-[11px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--g-text-secondary)' }}
      >
        Total wallet equity
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className="num"
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: 'var(--g-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {formatMoney(totalEquity, baseCurrency)}
        </span>
        <span
          className="num inline-flex items-center gap-1 text-[13px]"
          style={{ color: positive ? 'var(--g-pnl-positive)' : 'var(--g-pnl-negative)' }}
        >
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {(positive ? '+' : '') + formatMoney(delta24hAmount, baseCurrency)}
          <span style={{ color: 'var(--g-text-muted)', marginLeft: 4 }}>
            ({(positive ? '+' : '') + delta24hPct.toFixed(2)}% past 24h)
          </span>
        </span>
      </div>
    </header>
  );
}
