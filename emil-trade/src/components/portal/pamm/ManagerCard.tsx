'use client';

import Link from 'next/link';
import Sparkline from '@/components/portal/dashboard/Sparkline';
import RiskBadge from '@/components/portal/copy/RiskBadge';
import { formatMoney } from '@/lib/wallet/money';
import type { PammManager } from '@/lib/pamm/types';

/**
 * Manager card on the leaderboard. Click anywhere on the body opens
 * the detail page; the [Invest] button passes ?invest=1 so the dialog
 * auto-opens for one-click commitments.
 */
export default function ManagerCard({ manager }: { manager: PammManager }) {
  const positive = manager.roi_ytd >= 0;
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
        href={`/dashboard/pamm/${manager.id}`}
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
          {manager.avatar_initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              {manager.name}
            </span>
            <RiskBadge risk={manager.risk} compact />
          </div>
          <div className="mt-0.5 text-[12px]" style={{ color: 'var(--g-text-secondary)' }}>
            {manager.manager_name} · {manager.manager_credentials}
          </div>
          <p className="mt-1 text-[12px] leading-snug line-clamp-2" style={{ color: 'var(--g-text-muted)' }}>
            {manager.bio}
          </p>
        </div>
        <Sparkline
          data={manager.equity_curve.slice(-16)}
          positive={positive}
          width={88}
          height={28}
        />
      </Link>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'var(--g-border-hair)' }}>
        <Cell label="ROI YTD"   value={`${manager.roi_ytd > 0 ? '+' : ''}${manager.roi_ytd.toFixed(1)}%`} accent={positive ? 'pnl-positive' : 'pnl-negative'} />
        <Cell label="Max DD"    value={`-${manager.max_drawdown.toFixed(1)}%`} accent="muted" />
        <Cell label="AUM"       value={shortMoney(manager.aum_usd)} />
        <Cell label="Investors" value={manager.investor_count.toLocaleString()} />
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t"
        style={{ borderColor: 'var(--g-border-hair)' }}
      >
        <div className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
          {manager.profit_share_pct}% profit share · {manager.management_fee_pct}% mgmt
          {manager.high_water_mark && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--g-buy)' }}>· HWM</span>
          )}
          <span className="mx-1.5 opacity-50">·</span>
          Min {formatMoney(String(manager.min_investment_usd), 'USD')}
        </div>
        <Link
          href={`/dashboard/pamm/${manager.id}?invest=1`}
          className="inline-flex items-center justify-center h-8 px-3 rounded-md text-[12px] font-medium transition-colors"
          style={{
            background: 'var(--g-accent)',
            color: '#fff',
            border: '1px solid var(--g-accent)',
          }}
        >
          Invest →
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

function shortMoney(s: string): string {
  const n = Number(s);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
