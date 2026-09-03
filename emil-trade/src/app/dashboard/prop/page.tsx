'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Trophy, Target, ShieldAlert, Calendar, DollarSign } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatCurrency } from '@/lib/utils/format';

export default function PropPage() {
  const [enrollment, setEnrollment] = useState<Record<string, unknown> | null>(null);
  const [challenges, setChallenges] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check active enrollment
      const { data: enrollData } = await supabase
        .from('prop_enrollments')
        .select('*, prop_challenges(*)')
        .eq('user_id', user.id)
        .in('status', ['phase1', 'phase2', 'funded'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (enrollData && enrollData.length > 0) {
        setEnrollment(enrollData[0]);
      }

      // Available challenges
      const { data: challData } = await supabase
        .from('prop_challenges')
        .select('*')
        .eq('is_active', true)
        .order('account_size', { ascending: true });

      setChallenges(challData ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-foreground">Prop Trading</h1>
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  const phases = ['phase1', 'phase2', 'funded'];
  const phaseLabels = ['Phase 1: Challenge', 'Phase 2: Verification', 'Funded'];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-foreground">Prop Trading</h1>

      {/* Active Enrollment */}
      {enrollment && (
        <div className="rounded-xl border border-accent/20 bg-elevated p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Active Challenge</h3>
              <p className="text-[10px] text-muted mt-0.5">
                {(enrollment.prop_challenges as Record<string, unknown>)?.name as string}
              </p>
            </div>
            <StatusBadge status={enrollment.status as string} />
          </div>

          {/* Phase indicator */}
          <div className="flex items-center gap-2">
            {phases.map((phase, i) => {
              const currentIdx = phases.indexOf(enrollment.status as string);
              const isActive = i === currentIdx;
              const isDone = i < currentIdx;
              return (
                <div key={phase} className="flex-1 flex flex-col items-center gap-1">
                  <div className={cn(
                    'h-2 w-full rounded-full',
                    isDone ? 'bg-accent' : isActive ? 'bg-accent/50' : 'bg-surface'
                  )} />
                  <span className={cn('text-[10px] font-medium', isActive ? 'text-accent' : 'text-muted')}>
                    {phaseLabels[i]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bars */}
          <div className="grid gap-3 sm:grid-cols-2">
            <ProgressBar
              label="Profit Target"
              value={Math.min(100, ((enrollment.current_profit_pct as number) ?? 0) / ((enrollment.profit_target_pct as number) || 10) * 100)}
              color="var(--profit)"
            />
            <ProgressBar
              label="Daily Loss Limit"
              value={Math.min(100, ((enrollment.current_daily_loss_pct as number) ?? 0) / ((enrollment.daily_loss_limit_pct as number) || 5) * 100)}
              color="var(--loss)"
            />
            <ProgressBar
              label="Max Drawdown"
              value={Math.min(100, ((enrollment.current_drawdown_pct as number) ?? 0) / ((enrollment.max_drawdown_pct as number) || 10) * 100)}
              color="var(--gold)"
            />
            <ProgressBar
              label="Min Trading Days"
              value={Math.min(100, ((enrollment.days_traded as number) ?? 0) / ((enrollment.min_trading_days as number) || 10) * 100)}
              color="var(--accent)"
            />
          </div>
        </div>
      )}

      {/* Available Challenges */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Available Challenges</h3>
        {challenges.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No challenges available"
            description="Prop trading challenges will be listed here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((c) => (
              <div key={c.id as string} className="rounded-xl border border-border bg-elevated p-4 flex flex-col gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{c.name as string}</h4>
                  <p className="text-[10px] text-muted mt-0.5">{c.description as string}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-accent" />
                    <div>
                      <p className="text-[10px] text-muted">Account Size</p>
                      <p className="font-bold text-foreground">{formatCurrency((c.account_size as number) ?? 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-muted" />
                    <div>
                      <p className="text-[10px] text-muted">Entry Fee</p>
                      <p className="font-medium text-foreground">{formatCurrency((c.entry_fee as number) ?? 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-profit" />
                    <div>
                      <p className="text-[10px] text-muted">Profit Target</p>
                      <p className="font-medium text-profit">{(c.profit_target_pct as number) ?? 8}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-gold" />
                    <div>
                      <p className="text-[10px] text-muted">Payout Split</p>
                      <p className="font-medium text-foreground">{(c.payout_split_pct as number) ?? 80}%</p>
                    </div>
                  </div>
                </div>

                <button className="w-full rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/80 transition-colors btn-glow">
                  Enroll
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
