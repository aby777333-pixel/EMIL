'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  CalendarDays,
  Briefcase,
  Plus,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EquityCurve } from '@/components/charts/EquityCurve';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { PriceEngine } from '@/lib/trading/price-engine';
import { formatCurrency, formatPnL, cn } from '@/lib/utils/format';
import { generateCalendarEvents } from '@/lib/trading/calendar-data';
import type { PriceTick } from '@/types/trading';

interface DashboardClientProps {
  hasAccounts: boolean;
  onboardingCompleted: boolean;
  balance: number;
  equity: number;
  floatingPnl: number;
  freeMargin: number;
  positions: Array<Record<string, unknown>>;
  recentOrders: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
}

const WATCHLIST_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'NAS100', 'USOIL', 'ETHUSD'];

export function DashboardClient({
  hasAccounts,
  onboardingCompleted,
  balance,
  equity,
  floatingPnl,
  freeMargin,
  positions,
  recentOrders,
  notifications,
}: DashboardClientProps) {
  const router = useRouter();
  const engineRef = useRef<PriceEngine | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceTick>>({});
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});

  // Start price engine for watchlist
  useEffect(() => {
    const engine = new PriceEngine();
    engineRef.current = engine;
    engine.start((ticks) => {
      const map: Record<string, PriceTick> = {};
      ticks.forEach((t) => {
        map[t.symbol] = t;
      });
      setPrices((prev) => {
        const updated = { ...prev };
        const prevBids: Record<string, number> = {};
        for (const sym of WATCHLIST_SYMBOLS) {
          if (prev[sym]) prevBids[sym] = prev[sym].bid;
        }
        setPrevPrices(prevBids);
        Object.assign(updated, map);
        return updated;
      });
    }, 1000);
    return () => engine.stop();
  }, []);

  // Generate equity curve data
  const equityData = generateEquityCurve(balance);
  const upcomingEvents = generateCalendarEvents()
    .filter((e) => e.datetime.getTime() > Date.now())
    .slice(0, 3);

  if (!hasAccounts) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={Briefcase}
          title="Open your first trading account"
          description="Create a live or demo trading account to start trading the global markets with Raptor."
          actionLabel="Create Account"
          onAction={() => router.push('/dashboard/settings')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onboarding banner */}
      {!onboardingCompleted && (
        <div
          className="rounded-xl border px-5 py-4 flex items-center justify-between"
          style={{
            borderColor: 'var(--accent)',
            backgroundColor: 'var(--accent-glow)',
          }}
        >
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Complete your profile</p>
              <p className="text-xs text-secondary">Verify your identity and fund your account to unlock full trading.</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/80 shrink-0"
          >
            Continue Setup
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Balance"
          value={formatCurrency(balance)}
          icon={DollarSign}
          sparklineData={equityData.map((d) => d.value).slice(-10)}
        />
        <KpiCard
          label="Equity"
          value={formatCurrency(equity)}
          change={balance > 0 ? ((equity - balance) / balance) * 100 : 0}
          changeLabel="vs balance"
          icon={TrendingUp}
        />
        <KpiCard
          label="Open P&L"
          value={formatPnL(floatingPnl)}
          change={balance > 0 ? (floatingPnl / balance) * 100 : 0}
          icon={BarChart3}
        />
        <KpiCard
          label="Free Margin"
          value={formatCurrency(freeMargin)}
          icon={ShieldCheck}
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column - 60% */}
        <div className="lg:col-span-3 space-y-6">
          {/* Equity Curve */}
          <div className="rounded-xl border border-border bg-elevated p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Equity Curve</h3>
            <EquityCurve data={equityData} height={220} />
          </div>

          {/* Open Positions Summary */}
          <div className="rounded-xl border border-border bg-elevated p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Open Positions</h3>
              <button
                onClick={() => router.push('/dashboard/positions')}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                View All
              </button>
            </div>
            {positions.length === 0 ? (
              <p className="py-8 text-center text-xs text-secondary">No open positions</p>
            ) : (
              <div className="space-y-2">
                {positions.slice(0, 5).map((pos) => (
                  <div
                    key={pos.id as string}
                    className="flex items-center justify-between rounded-lg bg-surface/50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold',
                          pos.direction === 'BUY'
                            ? 'bg-profit/15 text-profit'
                            : 'bg-loss/15 text-loss'
                        )}
                      >
                        {pos.direction as string}
                      </span>
                      <span className="text-xs font-medium text-foreground">{pos.symbol as string}</span>
                      <span className="text-[11px] text-secondary">{pos.size as number} lots</span>
                    </div>
                    <span
                      className={cn(
                        'mono text-xs font-semibold',
                        (pos.floating_pnl as number) >= 0 ? 'text-profit' : 'text-loss'
                      )}
                    >
                      {formatPnL(pos.floating_pnl as number)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-border bg-elevated p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Recent Activity</h3>
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-xs text-secondary">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.slice(0, 8).map((order) => (
                  <div
                    key={order.id as string}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {order.direction === 'BUY' ? (
                        <ArrowUpRight className="h-4 w-4 text-profit" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-loss" />
                      )}
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {order.order_type as string} {order.direction as string} {order.symbol as string}
                        </p>
                        <p className="text-[10px] text-muted">
                          {new Date(order.created_at as string).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={order.status as string} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column - 40% */}
        <div className="lg:col-span-2 space-y-6">
          {/* Watchlist */}
          <div className="rounded-xl border border-border bg-elevated p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Watchlist</h3>
              <button
                onClick={() => router.push('/dashboard/markets')}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Markets
              </button>
            </div>
            <div className="space-y-1">
              {WATCHLIST_SYMBOLS.map((sym) => {
                const tick = prices[sym];
                const prev = prevPrices[sym] ?? tick?.bid ?? 0;
                const changeDir = tick ? tick.bid - prev : 0;
                return (
                  <button
                    key={sym}
                    onClick={() => router.push(`/terminal?symbol=${sym}`)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-surface/50 transition-colors"
                  >
                    <span className="text-xs font-medium text-foreground">{sym}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="mono text-xs text-foreground">
                          {tick?.bid.toFixed(tick.bid > 100 ? 1 : 5) ?? '---'}
                        </p>
                        <p className="mono text-xs text-secondary">
                          {tick?.ask.toFixed(tick.ask > 100 ? 1 : 5) ?? '---'}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-semibold',
                          changeDir >= 0 ? 'text-profit' : 'text-loss'
                        )}
                      >
                        {changeDir >= 0 ? '+' : ''}{tick ? ((changeDir / (prev || 1)) * 100).toFixed(2) : '0.00'}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Economic Events */}
          <div className="rounded-xl border border-border bg-elevated p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Upcoming Events</h3>
              <button
                onClick={() => router.push('/dashboard/calendar')}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Calendar
              </button>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="py-6 text-center text-xs text-secondary">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg bg-surface/50 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{ev.title}</span>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                          ev.impact === 'high' ? 'bg-loss/15 text-loss' : ev.impact === 'medium' ? 'bg-gold/15 text-gold' : 'bg-secondary/15 text-secondary'
                        )}
                      >
                        {ev.impact}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted">
                      <CalendarDays className="h-3 w-3" />
                      {ev.datetime.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                      <span className="ml-auto font-semibold" style={{ color: `var(--accent)` }}>
                        {ev.currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Trade */}
          <button
            onClick={() => router.push('/dashboard/terminal')}
            className="w-full rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-3 hover:bg-accent/10 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
              <Plus className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                Quick Trade
              </p>
              <p className="text-xs text-secondary">Open the trading terminal</p>
            </div>
          </button>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="rounded-xl border border-border bg-elevated p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Notifications</h3>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id as string}
                    className="rounded-lg bg-surface/50 px-3 py-2.5"
                  >
                    <p className="text-xs font-medium text-foreground">{n.title as string}</p>
                    <p className="text-[10px] text-muted mt-0.5">{(n.body || n.message) as string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generateEquityCurve(currentBalance: number) {
  const points: { date: string; value: number }[] = [];
  const base = currentBalance > 0 ? currentBalance * 0.85 : 10000;
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const noise = (Math.random() - 0.4) * base * 0.02;
    const trend = ((30 - i) / 30) * base * 0.15;
    points.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(base + trend + noise),
    });
  }
  return points;
}
