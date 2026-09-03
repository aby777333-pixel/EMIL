'use client';

import Decimal from 'decimal.js';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Sparkline from './Sparkline';

interface BalanceTriadProps {
  walletBalance: string;
  totalEquity: string;
  freeMargin: string;
  marginLevel: string | null;
  walletDelta24h: number;
  equityDelta24h: number;
  /** 60-day sparkline points (in account currency, raw numbers OK here) */
  walletSpark: number[];
  equitySpark: number[];
  marginSpark: number[];
  currency?: string;
}

/**
 * Three side-by-side stat cards: Wallet · Total Equity · Free Margin.
 * Money values arrive as already-formatted strings (Decimal.toFixed)
 * so we never round in the rendering layer. Deltas are percentages.
 */
export default function BalanceTriad({
  walletBalance,
  totalEquity,
  freeMargin,
  marginLevel,
  walletDelta24h,
  equityDelta24h,
  walletSpark,
  equitySpark,
  marginSpark,
  currency = 'USD',
}: BalanceTriadProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Tile
        label="Wallet balance"
        value={walletBalance}
        currency={currency}
        delta={walletDelta24h}
        spark={walletSpark}
      />
      <Tile
        label="Total equity"
        value={totalEquity}
        currency={currency}
        delta={equityDelta24h}
        spark={equitySpark}
      />
      <Tile
        label="Free margin"
        value={freeMargin}
        currency={currency}
        sub={marginLevel ? `Margin level ${marginLevel}` : undefined}
        spark={marginSpark}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  currency,
  delta,
  sub,
  spark,
}: {
  label: string;
  value: string;
  currency: string;
  delta?: number;
  sub?: string;
  spark: number[];
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-secondary)' }}>
          {label}
        </div>
        <Sparkline data={spark.length >= 2 ? spark : [0, 0]} positive={positive} />
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className="num"
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: 'var(--g-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {formatMoney(value, currency)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[12px]">
        {typeof delta === 'number' ? (
          <span
            className="num inline-flex items-center gap-0.5"
            style={{ color: positive ? 'var(--g-pnl-positive)' : 'var(--g-pnl-negative)' }}
          >
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {(positive ? '+' : '') + delta.toFixed(2)}%
            <span style={{ color: 'var(--g-text-muted)', marginLeft: 4 }}>24h</span>
          </span>
        ) : sub ? (
          <span style={{ color: 'var(--g-text-muted)' }}>{sub}</span>
        ) : (
          <span style={{ color: 'var(--g-text-muted)' }}>&nbsp;</span>
        )}
      </div>
    </div>
  );
}

/**
 * Render a Decimal-formatted string with a currency symbol prefix.
 * Money never arrives as a JS Number here.
 */
function formatMoney(amount: string, currency: string): string {
  const symbol =
    currency === 'USD' ? '$'
    : currency === 'EUR' ? '€'
    : currency === 'GBP' ? '£'
    : currency === 'INR' ? '₹'
    : '';
  // Re-emit with thousands separators while preserving the source decimals.
  const d = new Decimal(amount);
  const [whole, frac] = d.toFixed(2).split('.');
  const wholeWithSep = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${wholeWithSep}${frac ? '.' + frac : ''}`;
}
