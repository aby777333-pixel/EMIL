import { useMemo } from 'react';
import { Power, Shield } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { Card, SectionTitle, Badge, Skeleton, EmptyState, fmtMoney, pnlColor } from '../components/ui';
import { usePositions, useAuditLog } from '../hooks/useApi';
import { useStore } from '../store';
import { mockEquityCurve } from '../data/mock';

const DAILY_LIMIT = 500; // demo daily loss limit ($)

export default function Positions() {
  const { data, isLoading } = usePositions('open');
  const { data: audit } = useAuditLog(50);
  const setKillModal = useStore((s) => s.setKillModal);

  const positions = data?.positions || [];
  const totalPnl = data?.total_pnl ?? 0;

  const equityData = useMemo(
    () =>
      mockEquityCurve(10000)
        .slice(-60)
        .map((d, i) => ({ i, equity: d.equity })),
    [],
  );

  const riskPct = Math.min(Math.abs(Math.min(totalPnl, 0)) / DAILY_LIMIT, 1) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Live Positions</h2>
          <p className="text-sm text-subtext">Open paper positions, portfolio equity & risk controls.</p>
        </div>
        <button className="btn-danger animate-pulseGlow" style={{ animationDuration: '2.4s' }} onClick={() => setKillModal(true)}>
          <Power size={15} /> Kill Switch
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <SectionTitle right={<span className={`font-mono font-bold ${pnlColor(totalPnl)}`}>${fmtMoney(totalPnl)}</span>}>
            Portfolio Equity
          </SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="pf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
              <XAxis dataKey="i" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => `$${fmtMoney(v)}`}
              />
              <Area type="monotone" dataKey="equity" stroke="#00ff88" fill="url(#pf)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle right={<Shield size={14} className="text-warning" />}>Risk Meter</SectionTitle>
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-subtext">Daily P&L vs Limit</span>
                <span className="font-mono">
                  ${fmtMoney(totalPnl)} / -${DAILY_LIMIT}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-bg overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${riskPct}%`,
                    background: riskPct > 80 ? '#ff4444' : riskPct > 50 ? '#ffaa00' : '#00ff88',
                    boxShadow: `0 0 8px ${riskPct > 80 ? '#ff4444' : '#00ff88'}`,
                  }}
                />
              </div>
              <div className="text-[10px] text-subtext mt-1">{riskPct.toFixed(0)}% of daily loss limit used</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="glass !rounded-lg p-2.5 border border-border">
                <div className="text-[10px] text-subtext uppercase">Open</div>
                <div className="text-lg font-bold font-mono">{positions.length}</div>
              </div>
              <div className="glass !rounded-lg p-2.5 border border-border">
                <div className="text-[10px] text-subtext uppercase">Net P&L</div>
                <div className={`text-lg font-bold font-mono ${pnlColor(totalPnl)}`}>${fmtMoney(totalPnl)}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Open Positions</SectionTitle>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : positions.length === 0 ? (
          <EmptyState icon="📭" title="No open positions" sub="Approve a strategy or open a position to begin paper trading." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-subtext text-left">
                <tr>
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="pr-3">Side</th>
                  <th className="pr-3 text-right">Entry</th>
                  <th className="pr-3 text-right">Current</th>
                  <th className="pr-3 text-right">Qty</th>
                  <th className="pr-3 text-right">P&L</th>
                  <th className="pr-3">Duration</th>
                  <th className="pr-3">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {positions.map((p) => (
                  <tr key={p.id} className="border-t border-border/40 hover:bg-border/10">
                    <td className="py-2 pr-3 font-bold">{p.symbol}</td>
                    <td className="pr-3">
                      <span className={p.side === 'buy' ? 'text-success' : 'text-danger'}>
                        {p.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="pr-3 text-right">{fmtMoney(p.entry_price, 4)}</td>
                    <td className="pr-3 text-right">{fmtMoney(p.current_price, 4)}</td>
                    <td className="pr-3 text-right">{p.qty}</td>
                    <td className={`pr-3 text-right font-bold ${pnlColor(p.pnl)}`}>
                      {p.pnl >= 0 ? '+' : ''}
                      {fmtMoney(p.pnl)}
                    </td>
                    <td className="pr-3 text-subtext">
                      {p.opened_at ? formatDistanceToNow(new Date(p.opened_at)) : '—'}
                    </td>
                    <td className="pr-3">
                      <Badge status="PAPER">{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Audit Trail</SectionTitle>
        <div className="flex flex-col gap-1.5 max-h-64 overflow-auto text-xs">
          {(audit || []).map((e, i) => (
            <div key={i} className="flex items-start gap-2 py-1 border-b border-border/40 last:border-0">
              <span className="text-subtext font-mono whitespace-nowrap">
                {e.created_at ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true }) : ''}
              </span>
              <span className="text-primary">{e.event_type}</span>
              <span className="flex-1 text-text/80">{e.message}</span>
            </div>
          ))}
          {!audit?.length && <Skeleton className="h-24" />}
        </div>
      </Card>
    </div>
  );
}
