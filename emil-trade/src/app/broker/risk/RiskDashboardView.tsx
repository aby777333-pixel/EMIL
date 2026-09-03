'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface ExposureData {
  long: number;
  short: number;
  net: number;
}

interface RiskDashboardViewProps {
  exposureMap: Record<string, ExposureData>;
  instruments: string[];
  marginCallAccounts: Record<string, unknown>[];
  stopOutAccounts: Record<string, unknown>[];
}

function getHeatColor(net: number, maxNet: number): string {
  if (maxNet === 0) return 'var(--bg-surface)';
  const intensity = Math.abs(net) / maxNet;
  if (net > 0) {
    // Long bias = green shades
    return `rgba(0, 200, 150, ${0.1 + intensity * 0.6})`;
  } else if (net < 0) {
    // Short bias = red shades
    return `rgba(255, 69, 96, ${0.1 + intensity * 0.6})`;
  }
  return 'var(--bg-surface)';
}

export function RiskDashboardView({
  exposureMap,
  instruments,
  marginCallAccounts,
  stopOutAccounts,
}: RiskDashboardViewProps) {
  const maxNet = Math.max(
    ...instruments.map((sym) => Math.abs(exposureMap[sym]?.net ?? 0)),
    0.01,
  );

  const criticalCount = stopOutAccounts.length;
  const warningCount = marginCallAccounts.length;

  const marginColumns = [
    {
      key: 'user',
      label: 'Client',
      render: (row: Record<string, unknown>) => {
        const u = row.user as Record<string, unknown>;
        return (
          <div>
            <p className="font-medium text-foreground">{String(u?.full_name ?? 'Unknown')}</p>
            <p className="text-[10px] text-muted">{String(u?.email ?? '')}</p>
          </div>
        );
      },
    },
    { key: 'account_number', label: 'Account' },
    {
      key: 'equity',
      label: 'Equity',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono">${Number(row.equity ?? 0).toFixed(2)}</span>
      ),
    },
    {
      key: 'margin_used',
      label: 'Margin Used',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <span className="mono">${Number(row.margin_used ?? 0).toFixed(2)}</span>
      ),
    },
    {
      key: 'margin_level',
      label: 'Margin Level',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => {
        const level = Number(row.margin_level ?? 0);
        return (
          <span className={`mono font-bold ${level < 30 ? 'text-loss' : 'text-gold'}`}>
            {level.toFixed(1)}%
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Risk Alerts Banner */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div className="rounded-xl border border-loss/30 bg-loss/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-loss mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Risk Alerts</p>
              <div className="mt-1 space-y-1 text-xs text-secondary">
                {criticalCount > 0 && (
                  <p className="text-loss">{criticalCount} account(s) below 30% margin level - stop-out imminent</p>
                )}
                {warningCount > 0 && (
                  <p className="text-gold">{warningCount} account(s) below 60% margin level - margin call territory</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exposure Heatmap */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Net Exposure Heatmap</h3>
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {instruments.map((sym) => {
            const exp = exposureMap[sym] ?? { long: 0, short: 0, net: 0 };
            return (
              <div
                key={sym}
                className="flex flex-col items-center justify-center rounded-lg border border-border p-3 transition-all hover:border-border-strong"
                style={{ backgroundColor: getHeatColor(exp.net, maxNet) }}
              >
                <span className="text-[10px] font-bold text-foreground">{sym}</span>
                <span className={`mono text-xs font-medium ${exp.net >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {exp.net > 0 ? '+' : ''}{exp.net.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-center gap-6 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: 'rgba(0,200,150,0.4)' }} />
            Net Long
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-surface" />
            Neutral
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: 'rgba(255,69,96,0.4)' }} />
            Net Short
          </span>
        </div>
      </div>

      {/* Margin Call Watchlist */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
          Margin Call Watchlist (Below 60%)
        </h3>
        {marginCallAccounts.length > 0 ? (
          <DataTable columns={marginColumns} data={marginCallAccounts} pageSize={10} />
        ) : (
          <EmptyState icon={ShieldAlert} title="All clear" description="No accounts in margin call territory." />
        )}
      </div>

      {/* Stop-Out Imminent */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-loss animate-pulse" />
          Stop-Out Imminent (Below 30%)
        </h3>
        {stopOutAccounts.length > 0 ? (
          <DataTable columns={marginColumns} data={stopOutAccounts} pageSize={10} />
        ) : (
          <EmptyState icon={ShieldAlert} title="All clear" description="No accounts near stop-out level." />
        )}
      </div>

      {/* A/B Book Rules */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">A/B Book Routing Rules</h3>
        <div className="rounded-xl border border-border bg-elevated overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted" style={{ background: 'var(--bg-surface)' }}>
                <th className="px-4 py-2.5 text-left font-medium">Condition</th>
                <th className="px-4 py-2.5 text-left font-medium">Route</th>
                <th className="px-4 py-2.5 text-left font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {[
                { condition: 'Client risk score > 70', route: 'A-Book', reason: 'High-risk clients hedged with LP' },
                { condition: 'Trade size > 5 lots', route: 'A-Book', reason: 'Large trades always go to LP' },
                { condition: 'Client risk score < 40', route: 'B-Book', reason: 'Low-risk clients internalized' },
                { condition: 'Toxic flow flagged', route: 'A-Book', reason: 'Never internalize toxic flow' },
                { condition: 'News event within 5 min', route: 'A-Book', reason: 'Volatility protection' },
                { condition: 'Everything else', route: 'B-Book', reason: 'Standard retail internalization' },
              ].map((rule, i) => (
                <tr key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-2.5 font-medium text-foreground">{rule.condition}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      rule.route === 'A-Book' ? 'bg-[var(--accent-glow)] text-[var(--accent)]' : 'bg-surface text-secondary'
                    }`}>{rule.route}</span>
                  </td>
                  <td className="px-4 py-2.5 text-secondary">{rule.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Loss Tracker */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Daily P&amp;L Tracker (Broker Side)</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-elevated p-4 text-center">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Today&apos;s P&amp;L</div>
            <div className="text-xl mono font-bold text-profit">+$4,230</div>
          </div>
          <div className="rounded-xl border border-border bg-elevated p-4 text-center">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Daily Loss Limit</div>
            <div className="text-xl mono font-bold text-foreground">$50,000</div>
          </div>
          <div className="rounded-xl border border-border bg-elevated p-4 text-center">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Utilization</div>
            <div className="text-xl mono font-bold text-profit">8.5%</div>
            <div className="mt-2 h-1.5 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full bg-profit" style={{ width: '8.5%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
