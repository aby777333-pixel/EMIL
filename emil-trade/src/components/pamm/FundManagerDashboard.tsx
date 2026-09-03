'use client';

import { DollarSign, Users, TrendingUp, BarChart3, Plus } from 'lucide-react';

const mockManagerData = {
  fundName: 'Nexus Alpha Fund',
  aum: 2400000,
  investors: 47,
  navPerShare: 1.325,
  ytdReturn: 32.5,
  totalFeeEarnings: 48200,
  perfFeeEarnings: 38500,
  mgmtFeeEarnings: 9700,
  allocations: [
    { asset: 'EUR/USD', percentage: 28 },
    { asset: 'GBP/USD', percentage: 18 },
    { asset: 'XAU/USD', percentage: 22 },
    { asset: 'USD/JPY', percentage: 15 },
    { asset: 'NAS100', percentage: 12 },
    { asset: 'Cash', percentage: 5 },
  ],
  investors_list: [
    { name: 'John D.', invested: 45000, shares: 33.96, pnl: 5640, joinedAt: '2024-06-12' },
    { name: 'Maria S.', invested: 25000, shares: 18.87, pnl: 3120, joinedAt: '2024-08-20' },
    { name: 'Alex K.', invested: 80000, shares: 60.38, pnl: 10240, joinedAt: '2024-04-05' },
    { name: 'Sarah L.', invested: 15000, shares: 11.32, pnl: 1890, joinedAt: '2025-01-15' },
    { name: 'Robert W.', invested: 50000, shares: 37.74, pnl: 6320, joinedAt: '2024-07-22' },
    { name: 'Lisa M.', invested: 10000, shares: 7.55, pnl: 1280, joinedAt: '2025-03-10' },
  ],
};

function formatAUM(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function FundManagerDashboard() {
  const d = mockManagerData;

  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <OverviewCard
          icon={<DollarSign size={16} />}
          label="Total AUM"
          value={formatAUM(d.aum)}
          sub={`${d.investors} investors`}
        />
        <OverviewCard
          icon={<Users size={16} />}
          label="Investors"
          value={d.investors.toString()}
          sub="Active accounts"
        />
        <OverviewCard
          icon={<TrendingUp size={16} />}
          label="NAV / Share"
          value={`$${d.navPerShare.toFixed(3)}`}
          sub={`+${d.ytdReturn}% YTD`}
          subColor="#00C853"
        />
        <OverviewCard
          icon={<BarChart3 size={16} />}
          label="Fee Earnings"
          value={`$${d.totalFeeEarnings.toLocaleString()}`}
          sub={`Perf: $${d.perfFeeEarnings.toLocaleString()} / Mgmt: $${d.mgmtFeeEarnings.toLocaleString()}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Allocation */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: '#111118',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <h3 className="text-sm font-semibold text-white mb-3">Allocation Breakdown</h3>
          <div className="space-y-2">
            {d.allocations.map((a) => (
              <div key={a.asset} className="flex items-center gap-3">
                <span className="text-xs font-mono text-white/60 w-16">{a.asset}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${a.percentage}%`,
                      backgroundColor: '#0091D5',
                      opacity: 0.4 + (a.percentage / 100) * 0.6,
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-white/50 w-10 text-right">
                  {a.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Earnings */}
        <div
          className="rounded-lg border p-4 col-span-2"
          style={{
            backgroundColor: '#111118',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Investor List</h3>
            <span className="text-[10px] text-white/30">{d.investors_list.length} shown</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/30 text-left">
                <th className="pb-2 font-medium">Investor</th>
                <th className="pb-2 font-medium text-right">Invested</th>
                <th className="pb-2 font-medium text-right">Shares</th>
                <th className="pb-2 font-medium text-right">P/L</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {d.investors_list.map((inv, i) => (
                <tr
                  key={i}
                  className="border-t hover:bg-white/[0.02] transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                >
                  <td className="py-2 text-white/70">{inv.name}</td>
                  <td className="py-2 text-right font-mono text-white/50">
                    ${inv.invested.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-mono text-white/50">
                    {inv.shares.toFixed(2)}
                  </td>
                  <td
                    className="py-2 text-right font-mono font-medium"
                    style={{ color: inv.pnl >= 0 ? '#00C853' : '#FF5252' }}
                  >
                    +${inv.pnl.toLocaleString()}
                  </td>
                  <td className="py-2 text-white/30">{inv.joinedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Fund Button */}
      <div className="flex justify-center pt-2">
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 border"
          style={{
            backgroundColor: 'rgba(41,171,226,0.1)',
            borderColor: 'rgba(41,171,226,0.3)',
            color: '#0091D5',
          }}
        >
          <Plus size={14} />
          Create New Fund
        </button>
      </div>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  sub,
  subColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  subColor?: string;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: '#111118',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-2 text-white/40">
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold font-mono text-white">{value}</div>
      <div className="text-[10px] mt-1" style={{ color: subColor || 'rgba(255,255,255,0.3)' }}>
        {sub}
      </div>
    </div>
  );
}
