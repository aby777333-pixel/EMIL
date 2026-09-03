'use client';

import Link from 'next/link';
import Sparkline from '@/components/portal/dashboard/Sparkline';
import RiskBadge from './RiskBadge';
import { formatMoney } from '@/lib/wallet/money';
import type { StrategyProvider } from '@/lib/copy/types';

/**
 * One strategy provider rendered as a click-to-detail card. Stats grid
 * + sparkline + Copy CTA. The whole card is a link target except the
 * Copy button, which goes straight to the detail page with the
 * settings dialog open via a query param.
 */
export default function StrategyCard({ strategy }: { strategy: StrategyProvider }) {
  const positive = strategy.roi_30d >= 0;
  return (
    <article
      className="rounded-xl flex flex-col"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <Link
        href={`/dashboard/copy-trading/${strategy.id}`}
        className="flex items-start gap-3 px-5 py-4 border-b transition-colors hover:bg-white/[0.02]"
        style={{ borderColor: 'var(--g-border-hair)' }}
      >
        <span
          className="flex items-center justify-center shrink-0 num"
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(220,38,38,0.12)',
            color: 'var(--g-accent)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {strategy.avatar_initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              {strategy.name}
            </span>
            <RiskBadge risk={strategy.risk} compact />
            <span className="num text-[10px] uppercase tracking-wider" style={{ color: 'var(--g-text-muted)' }}>
              · {strategy.country}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--g-text-secondary)' }}>
            {strategy.tagline}
          </p>
        </div>
        <div className="shrink-0">
          <Sparkline
            data={strategy.equity_curve.slice(-40)}
            positive={positive}
            width={88}
            height={24}
          />
        </div>
      </Link>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'var(--g-border-hair)' }}>
        <Cell label="ROI 30d" value={`${strategy.roi_30d > 0 ? '+' : ''}${strategy.roi_30d.toFixed(1)}%`} accent={positive ? 'pnl-positive' : 'pnl-negative'} />
        <Cell label="Win rate" value={`${Math.round(strategy.win_rate * 100)}%`} />
        <Cell label="Max DD" value={`-${strategy.max_drawdown.toFixed(1)}%`} accent="muted" />
        <Cell label="Followers" value={strategy.followers.toLocaleString()} />
      </div>

      <div
        className="flex items-center justify-between px-5 py-3 border-t"
        style={{ borderColor: 'var(--g-border-hair)' }}
      >
        <div className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
          AUM <span className="num" style={{ color: 'var(--g-text-secondary)' }}>{formatMoney(strategy.aum_usd, 'USD')}</span>
          <span className="mx-2 opacity-50">·</span>
          {strategy.trades_total.toLocaleString()} trades
        </div>
        <Link
          href={`/dashboard/copy-trading/${strategy.id}?copy=1`}
          className="inline-flex items-center justify-center h-8 px-3 rounded-md text-[12px] font-medium transition-colors"
          style={{
            background: 'var(--g-accent)',
            color: '#fff',
            border: '1px solid var(--g-accent)',
          }}
        >
          Copy →
        </Link>
      </div>
    </article>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'pnl-positive' | 'pnl-negative' | 'muted';
}) {
  const color =
    accent === 'pnl-positive' ? 'var(--g-pnl-positive)' :
    accent === 'pnl-negative' ? 'var(--g-pnl-negative)' :
    accent === 'muted'        ? 'var(--g-text-muted)'   :
                                'var(--g-text-primary)';
  return (
    <div style={{ background: 'var(--g-bg-surface)', padding: '10px 16px' }}>
      <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
        {label}
      </div>
      <div className="num text-[14px] font-medium mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
