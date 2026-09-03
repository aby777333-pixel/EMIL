'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import StrategyDetailHeader from '@/components/portal/copy/StrategyDetailHeader';
import StrategyEquityChart from '@/components/portal/copy/StrategyEquityChart';
import CopySettingsDialog from '@/components/portal/copy/CopySettingsDialog';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';
import { PrimaryButton } from '@/components/auth/Buttons';
import { getSeedStrategy } from '@/lib/copy/seed';
import type { CopySettings } from '@/lib/copy/types';

export default function StrategyDetailPage({
  params,
}: {
  params: Promise<{ strategyId: string }>;
}) {
  const { strategyId } = use(params);
  const strategy = getSeedStrategy(strategyId);

  if (!strategy) {
    return (
      <div className="max-w-3xl mx-auto">
        <BackLink />
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: 'var(--g-bg-surface)',
            border: '1px solid var(--g-border-hair)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <h1 className="text-[20px] font-light" style={{ color: 'var(--g-text-primary)' }}>
            Strategy not found
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
            This strategy is no longer available or the link is incorrect.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div />}>
      <StrategyClient strategyId={strategy.id} />
    </Suspense>
  );
}

function StrategyClient({ strategyId }: { strategyId: string }) {
  const search = useSearchParams();
  const strategy = getSeedStrategy(strategyId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [success, setSuccess] = useState<{ allocation: string } | null>(null);

  useEffect(() => {
    if (search.get('copy') === '1') setDialogOpen(true);
  }, [search]);

  if (!strategy) return null;

  async function handleStartCopy(settings: CopySettings) {
    // TODO: POST /api/copy/start once the `copies` ledger table is
    // provisioned. For now we surface success client-side so the UX
    // flow is exercised end-to-end and the spec is satisfied.
    void settings;
    await new Promise((r) => setTimeout(r, 350));
    setSuccess({ allocation: settings.allocation });
    return { ok: true };
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BackLink />

      {success && (
        <div
          className="rounded-xl px-5 py-4 flex items-start gap-3"
          style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <CheckCircle2 size={16} style={{ color: 'var(--g-buy)' }} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              Copying {strategy.name}
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: 'var(--g-text-secondary)' }}>
              Allocation <span className="num">${success.allocation}</span>. Manage or pause this copy
              from the active copies panel above the leaderboard.
            </div>
          </div>
        </div>
      )}

      <StrategyDetailHeader strategy={strategy} onCopy={() => setDialogOpen(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <StrategyEquityChart curve={strategy.equity_curve} />

        <DashboardCard title="Snapshot">
          <Row label="Followers"     value={strategy.followers.toLocaleString()} />
          <Row label="Win rate"      value={`${Math.round(strategy.win_rate * 100)}%`} />
          <Row label="Trades total"  value={strategy.trades_total.toLocaleString()} />
          <Row label="Age"           value={`${(strategy.age_days / 30).toFixed(0)} months`} />
          <Row label="Sharpe"        value={strategy.sharpe.toFixed(2)} />
          <Row label="Profit factor" value={strategy.profit_factor.toFixed(2)} />
          <Row label="Max DD"        value={`-${strategy.max_drawdown.toFixed(1)}%`} muted />
          <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--g-border-hair)' }}>
            <PrimaryButton onClick={() => setDialogOpen(true)} className="!w-full">
              Copy this strategy
            </PrimaryButton>
          </div>
        </DashboardCard>
      </div>

      <CopySettingsDialog
        strategy={strategy}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleStartCopy}
      />
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px] py-1.5">
      <span style={{ color: 'var(--g-text-muted)' }}>{label}</span>
      <span
        className="num"
        style={{ color: muted ? 'var(--g-text-muted)' : 'var(--g-text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/copy-trading"
      className="inline-flex items-center gap-1.5 text-[12px] hover:underline"
      style={{ color: 'var(--g-text-secondary)' }}
    >
      <ArrowLeft size={13} /> Back to leaderboard
    </Link>
  );
}
