'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import ManagerDetailHeader from '@/components/portal/pamm/ManagerDetailHeader';
import MonthlyReturnsTable from '@/components/portal/pamm/MonthlyReturnsTable';
import InvestmentDialog from '@/components/portal/pamm/InvestmentDialog';
import StrategyEquityChart from '@/components/portal/copy/StrategyEquityChart';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';
import { PrimaryButton } from '@/components/auth/Buttons';
import { getSeedManager } from '@/lib/pamm/seed';
import type { InvestmentSettings } from '@/lib/pamm/types';
import { formatMoney } from '@/lib/wallet/money';

export default function ManagerDetailPage({
  params,
}: {
  params: Promise<{ managerId: string }>;
}) {
  const { managerId } = use(params);
  const manager = getSeedManager(managerId);

  if (!manager) {
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
            Manager not found
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
            This PAMM manager is no longer available or the link is incorrect.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div />}>
      <ManagerDetail managerId={manager.id} />
    </Suspense>
  );
}

function ManagerDetail({ managerId }: { managerId: string }) {
  const search = useSearchParams();
  const manager = getSeedManager(managerId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [success, setSuccess] = useState<{ amount: string } | null>(null);

  useEffect(() => {
    if (search.get('invest') === '1') setDialogOpen(true);
  }, [search]);

  if (!manager) return null;

  async function handleSubmit(settings: InvestmentSettings) {
    // TODO: POST /api/pamm/invest once the pamm_subscriptions table is
    // provisioned. The full surface (amount + ack flags + signature)
    // is captured here so wiring the real call is a single change.
    void settings;
    await new Promise((r) => setTimeout(r, 400));
    setSuccess({ amount: settings.amount });
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
              Investment of {formatMoney(success.amount, 'USD')} confirmed
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: 'var(--g-text-secondary)' }}>
              You&apos;ll receive a confirmation email and the first monthly statement at next NAV strike.
            </div>
          </div>
        </div>
      )}

      <ManagerDetailHeader manager={manager} onInvest={() => setDialogOpen(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <StrategyEquityChart curve={manager.equity_curve} />
          <MonthlyReturnsTable returns={manager.monthly_returns_12m} />
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <DashboardCard title="Strategy & terms">
            <Term label="Strategy doc" value={
              <a
                href={manager.strategy_doc_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:underline"
                style={{ color: 'var(--g-accent)' }}
              >
                <FileText size={12} /> View PDF
              </a>
            } />
            <Term label="Profit share" value={`${manager.profit_share_pct}% above HWM`} />
            <Term label="Management fee" value={`${manager.management_fee_pct}% p.a.`} />
            <Term label="High-water mark" value={manager.high_water_mark ? 'Yes' : 'No'} />
            <Term label="Lockup" value={`${manager.lockup_days} days`} />
            <Term label="Min investment" value={formatMoney(String(manager.min_investment_usd), 'USD')} />
            <Term label="Redemption" value={manager.redemption_window} />
            <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--g-border-hair)' }}>
              <PrimaryButton onClick={() => setDialogOpen(true)} className="!w-full">
                Invest
              </PrimaryButton>
            </div>
          </DashboardCard>

          <DashboardCard title="About the manager">
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--g-text-secondary)' }}>
              {manager.bio}
            </p>
          </DashboardCard>
        </div>
      </div>

      <InvestmentDialog
        manager={manager}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        legalName={null}
      />
    </div>
  );
}

function Term({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[12px] py-1.5">
      <span style={{ color: 'var(--g-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--g-text-primary)' }}>{value}</span>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/pamm"
      className="inline-flex items-center gap-1.5 text-[12px] hover:underline"
      style={{ color: 'var(--g-text-secondary)' }}
    >
      <ArrowLeft size={13} /> Back to PAMM list
    </Link>
  );
}
