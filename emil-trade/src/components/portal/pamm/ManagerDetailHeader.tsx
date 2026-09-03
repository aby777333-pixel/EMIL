'use client';

import RiskBadge from '@/components/portal/copy/RiskBadge';
import { formatMoney } from '@/lib/wallet/money';
import type { PammManager } from '@/lib/pamm/types';

/**
 * Hero block at the top of a manager's detail page. Mirrors the
 * Strategy detail header in Phase L but surfaces fee + lockup info
 * since those drive the invest decision.
 */
export default function ManagerDetailHeader({
  manager,
  onInvest,
}: {
  manager: PammManager;
  onInvest: () => void;
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
          {manager.avatar_initials}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-medium m-0" style={{ color: 'var(--g-text-primary)' }}>
              {manager.name}
            </h1>
            <RiskBadge risk={manager.risk} />
          </div>
          <div className="mt-1 text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            Manager: {manager.manager_name} · {manager.manager_credentials}
          </div>
          <div className="mt-2 num text-[11px] flex items-center gap-3" style={{ color: 'var(--g-text-muted)' }}>
            <span>{manager.country}</span>
            <span style={{ color: 'var(--g-border-soft)' }}>·</span>
            <span>{manager.investor_count.toLocaleString()} investors</span>
            <span style={{ color: 'var(--g-border-soft)' }}>·</span>
            <span>AUM {formatMoney(manager.aum_usd, 'USD')}</span>
            <span style={{ color: 'var(--g-border-soft)' }}>·</span>
            <span>{(manager.manager_age_months / 12).toFixed(1)} yr track record</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onInvest}
          className="inline-flex items-center justify-center h-10 px-5 rounded-md text-[13px] font-medium"
          style={{
            background: 'var(--g-accent)',
            color: '#fff',
            border: '1px solid var(--g-accent)',
          }}
        >
          Invest
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-px" style={{ background: 'var(--g-border-hair)' }}>
        <Stat label="ROI YTD"      value={`${manager.roi_ytd > 0 ? '+' : ''}${manager.roi_ytd.toFixed(1)}%`} positive={manager.roi_ytd >= 0} />
        <Stat label="ROI all-time" value={`${manager.roi_all > 0 ? '+' : ''}${manager.roi_all.toFixed(1)}%`} positive={manager.roi_all >= 0} />
        <Stat label="Max DD"       value={`-${manager.max_drawdown.toFixed(1)}%`} muted />
        <Stat label="Sharpe"       value={manager.sharpe.toFixed(2)} />
        <Stat label="Best month"   value={`+${manager.best_month_pct.toFixed(1)}%`} positive />
        <Stat label="Worst month"  value={`${manager.worst_month_pct.toFixed(1)}%`} positive={false} />
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
    muted              ? 'var(--g-text-muted)' :
    positive === true  ? 'var(--g-pnl-positive)' :
    positive === false ? 'var(--g-pnl-negative)' :
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
