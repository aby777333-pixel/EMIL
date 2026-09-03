'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Radio, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { cn, formatPrice } from '@/lib/utils/format';

export default function SignalsPage() {
  const [signals, setSignals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [minConfidence, setMinConfidence] = useState(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('ai_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setSignals(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = signals.filter((s) => {
    if (typeFilter !== 'all' && (s.asset_type as string) !== typeFilter) return false;
    if ((s.confidence_pct as number ?? 0) < minConfidence) return false;
    return true;
  });

  const outcomeBadge = (outcome: string) => {
    if (outcome === 'win') return 'bg-profit/15 text-profit';
    if (outcome === 'loss') return 'bg-loss/15 text-loss';
    return 'bg-gold/15 text-gold';
  };

  const confidenceColor = (pct: number) => {
    if (pct >= 80) return 'text-profit';
    if (pct >= 60) return 'text-gold';
    return 'text-loss';
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-foreground">AI Trading Signals</h1>
        <p className="text-xs text-secondary mt-0.5">AI-powered trade signals with entry, SL, and TP levels</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
          >
            <option value="all">All Types</option>
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
            <option value="metal">Metals</option>
            <option value="index">Indices</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-secondary">Min Confidence:</label>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-28 accent-[var(--accent)]"
          />
          <span className="text-xs mono text-foreground">{minConfidence}%</span>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No signals available"
          description="AI signals will appear here as the system generates trade ideas."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const isBuy = (s.direction as string) === 'BUY';
            return (
              <div key={s.id as string} className="rounded-xl border border-border bg-elevated p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface px-2 py-0.5 text-xs font-bold text-foreground">
                      {s.symbol as string}
                    </span>
                    <span className={cn(
                      'flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold',
                      isBuy ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'
                    )}>
                      {isBuy ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {s.direction as string}
                    </span>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                    outcomeBadge((s.outcome as string) ?? 'pending')
                  )}>
                    {(s.outcome as string) ?? 'pending'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary">Confidence:</span>
                  <span className={cn('mono text-sm font-bold', confidenceColor((s.confidence_pct as number) ?? 0))}>
                    {(s.confidence_pct as number) ?? 0}%
                  </span>
                </div>

                {typeof s.signal_type === 'string' && s.signal_type && (
                  <span className="text-[10px] text-muted uppercase">{s.signal_type}</span>
                )}

                {typeof s.rationale === 'string' && s.rationale && (
                  <p className="text-[10px] text-secondary line-clamp-2">{s.rationale}</p>
                )}

                <div className="grid grid-cols-3 gap-2 text-center rounded-lg bg-surface/50 p-2">
                  <div>
                    <p className="text-[10px] text-muted">Entry</p>
                    <p className="mono text-xs font-medium text-foreground">
                      {s.entry_price ? formatPrice(s.entry_price as number) : '\u2014'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">SL</p>
                    <p className="mono text-xs font-medium text-loss">
                      {s.stop_loss ? formatPrice(s.stop_loss as number) : '\u2014'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted">TP</p>
                    <p className="mono text-xs font-medium text-profit">
                      {s.take_profit ? formatPrice(s.take_profit as number) : '\u2014'}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-muted">
                  {new Date(s.created_at as string).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
