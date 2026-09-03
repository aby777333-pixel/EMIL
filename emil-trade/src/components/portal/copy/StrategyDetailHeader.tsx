'use client';

import RiskBadge from './RiskBadge';
import { formatMoney } from '@/lib/wallet/money';
import type { StrategyProvider } from '@/lib/copy/types';

/**
 * Hero block at the top of a strategy detail page. Shows the avatar +
 * name + risk pill, then the 7 KPIs the spec calls out (ROI all time,
 * 30d ROI, max DD, Sharpe, profit factor, trades, age).
 */
export default function StrategyDetailHeader({
  strategy,
  onCopy,
}: {
  strategy: StrategyProvider;
  onCopy: () => void;
}) {
  return (
    <header
      className="rounded-xl"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex flex-wrap items-center gap-4 px-6 py-5">
        <span
          className="flex items-center justify-center shrink-0 num"
          style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'rgba(220,38,38,0.12)',
            color: 'var(--g-accent)',
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          {strategy.avatar_initials}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-medium m-0" style={{ color: 'var(--g-text-primary)' }}>
              {strategy.name}
            </h1>
            <RiskBadge risk={strategy.risk} />
          </div>
          <div className="mt-1 text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            {strategy.tagline}
          </div>
          <div
            className="mt-2 num text-[11px] flex items-center gap-3"
            style={{ color: 'var(--g-text-muted)' }}
          >
            <span>{strategy.country}</span>
            <span style={{ color: 'var(--g-border-soft)' }}>·</span>
            <span>{strategy.followers.toLocaleString()} followers</span>
            <span style={{ color: 'var(--g-border-soft)' }}>·</span>
            <span>AUM {formatMoney(strategy.aum_usd, 'USD')}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center justify-center h-10 px-5 rounded-md text-[13px] font-medium"
          style={{
            background: 'var(--g-accent)',
            color: '#fff',
            border: '1px solid var(--g-accent)',
          }}
        >
          Copy this strategy
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px" style={{ background: 'var(--g-border-hair)' }}>
        <Stat label="ROI all-time" value={`${strategy.roi_all > 0 ? '+' : ''}${strategy.roi_all.toFixed(1)}%`} positive={strategy.roi_all >= 0} />
        <Stat label="ROI 30d"      value={`${strategy.roi_30d > 0 ? '+' : ''}${strategy.roi_30d.toFixed(1)}%`} positive={strategy.roi_30d >= 0} />
        <Stat label="Max DD"       value={`-${strategy.max_drawdown.toFixed(1)}%`} muted />
        <Stat label="Sharpe"       value={strategy.sharpe.toFixed(2)} />
        <Stat label="Profit factor" value={strategy.profit_factor.toFixed(2)} />
        <Stat label="Trades"       value={strategy.trades_total.toLocaleString()} />
        <Stat label="Age"          value={`${(strategy.age_days / 30).toFixed(0)} mo`} />
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  positive,
  muted,
}: {
  label: string;
  value: string;
  positive?: boolean;
  muted?: boolean;
}) {
  const color =
    muted                  ? 'var(--g-text-muted)' :
    positive === true      ? 'var(--g-pnl-positive)' :
    positive === false     ? 'var(--g-pnl-negative)' :
                              'var(--g-text-primary)';
  return (
    <div style={{ background: 'var(--g-bg-surface)', padding: '12px 16px' }}>
      <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
        {label}
      </div>
      <div className="num text-[15px] font-medium mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
