'use client';

import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileText,
  Calendar,
  Clock,
  Users,
  Wallet,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                         */
/* ------------------------------------------------------------------ */

interface SymbolPnl {
  symbol: string;
  volume: string;
  trades: number;
  clientPnl: number;
  brokerPnl: number;
  spreadRev: number;
  commission: number;
}

const SYMBOL_PNL: SymbolPnl[] = [
  { symbol: 'EURUSD', volume: '124.5L', trades: 89, clientPnl: -3420, brokerPnl: 1920, spreadRev: 890, commission: 124 },
  { symbol: 'XAUUSD', volume: '45.2L', trades: 34, clientPnl: 2100, brokerPnl: -680, spreadRev: 340, commission: 68 },
  { symbol: 'GBPUSD', volume: '67.8L', trades: 52, clientPnl: -1580, brokerPnl: 890, spreadRev: 560, commission: 92 },
  { symbol: 'USDJPY', volume: '98.3L', trades: 71, clientPnl: -2800, brokerPnl: 1400, spreadRev: 720, commission: 108 },
  { symbol: 'BTCUSD', volume: '12.1L', trades: 18, clientPnl: 800, brokerPnl: -320, spreadRev: 180, commission: 45 },
  { symbol: 'USDCHF', volume: '34.6L', trades: 28, clientPnl: -920, brokerPnl: 520, spreadRev: 290, commission: 56 },
  { symbol: 'AUDUSD', volume: '22.4L', trades: 19, clientPnl: -480, brokerPnl: 350, spreadRev: 170, commission: 34 },
];

interface AccountPerf {
  account: string;
  client: string;
  trades: number;
  pnl: number;
  winRate: string;
  avgHold: string;
  risk: 'critical' | 'warning' | 'ok';
}

const ACCOUNT_PERF: AccountPerf[] = [
  { account: 'ACC-10078', client: 'Toxic Trader', trades: 47, pnl: 4280, winRate: '92%', avgHold: '18s', risk: 'critical' },
  { account: 'ACC-10042', client: 'Normal Client', trades: 12, pnl: -1200, winRate: '42%', avgHold: '4h', risk: 'ok' },
  { account: 'ACC-10200', client: 'News Trader', trades: 8, pnl: 1650, winRate: '78%', avgHold: '45s', risk: 'warning' },
  { account: 'ACC-10115', client: 'Sharp Dealer', trades: 23, pnl: 2890, winRate: '71%', avgHold: '25s', risk: 'warning' },
  { account: 'ACC-10005', client: 'Beginner Bob', trades: 6, pnl: -890, winRate: '33%', avgHold: '12h', risk: 'ok' },
  { account: 'ACC-10090', client: 'Run-Upper', trades: 15, pnl: -340, winRate: '45%', avgHold: '5m', risk: 'ok' },
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                           */
/* ------------------------------------------------------------------ */

function fmtMoney(n: number, showSign = true) {
  const abs = Math.abs(n);
  const formatted = abs >= 1000 ? `$${abs.toLocaleString()}` : `$${abs}`;
  if (!showSign) return formatted;
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

function moneyColor(n: number) {
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function riskBadge(r: 'critical' | 'warning' | 'ok') {
  switch (r) {
    case 'critical': return <span className="text-red-400 blink-danger">&#x1F534;</span>;
    case 'warning': return <span className="text-amber-400">&#x1F7E0;</span>;
    case 'ok': return <span className="text-emerald-400">&#x2705;</span>;
  }
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                              */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'symbols' | 'accounts' | 'flow'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'symbols' as const, label: 'PnL by Symbol' },
    { id: 'accounts' as const, label: 'Top Accounts' },
    { id: 'flow' as const, label: 'Money Flow' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white p-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Analytics &gt; Reports</p>
          <h1 className="text-xl font-bold tracking-tight">
            REPORTING &amp; ANALYTICS
          </h1>
          <p className="text-xs text-white/40 mt-0.5">See What Actually Made You Money</p>
        </div>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-white/30 hover:text-white/60 border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SECTION 1: PnL Summary Cards (always visible) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Session Realized PnL', value: '+$4,280', icon: TrendingUp, color: 'emerald' },
          { label: 'B-Book PnL', value: '+$3,840', icon: DollarSign, color: 'emerald' },
          { label: 'A-Book Commission', value: '+$440', icon: BarChart3, color: 'emerald' },
          { label: 'Client Wins vs Losses', value: '34W / 48L', icon: Users, color: 'cyan' },
          { label: 'Top Profitable Symbol', value: 'EURUSD (+$1,920)', icon: ArrowUpRight, color: 'emerald' },
          { label: 'Top Loss Symbol', value: 'XAUUSD (-$680)', icon: ArrowDownRight, color: 'red' },
        ].map((card, i) => {
          const colorMap: Record<string, string> = {
            emerald: 'border-emerald-500/20 text-emerald-400',
            red: 'border-red-500/20 text-red-400',
            cyan: 'border-cyan-500/20 text-cyan-300',
          };
          const Icon = card.icon;
          return (
            <div key={i} className={`rounded-xl border ${colorMap[card.color]?.split(' ')[0] ?? 'border-white/[0.06]'} bg-[#0d1117] p-4`}>
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className={`h-3.5 w-3.5 ${colorMap[card.color]?.split(' ')[1] ?? 'text-white/40'}`} />
                <span className="text-[9px] uppercase tracking-wider text-white/30">{card.label}</span>
              </div>
              <p className={`text-lg font-mono font-bold ${colorMap[card.color]?.split(' ')[1] ?? 'text-white'}`}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── SECTION 2: PnL by Symbol Table ── */}
      {(activeTab === 'overview' || activeTab === 'symbols') && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold">PnL by Symbol</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-right font-mono">Volume</th>
                  <th className="px-4 py-3 text-right font-mono">Trades</th>
                  <th className="px-4 py-3 text-right font-mono">Client PnL</th>
                  <th className="px-4 py-3 text-right font-mono">Broker PnL</th>
                  <th className="px-4 py-3 text-right font-mono">Spread Rev</th>
                  <th className="px-4 py-3 text-right font-mono">Commission</th>
                </tr>
              </thead>
              <tbody>
                {SYMBOL_PNL.map((s) => (
                  <tr key={s.symbol} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-cyan-300">{s.symbol}</td>
                    <td className="px-4 py-3 text-right font-mono text-white/60">{s.volume}</td>
                    <td className="px-4 py-3 text-right font-mono text-white/60">{s.trades}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${moneyColor(s.clientPnl)}`}>{fmtMoney(s.clientPnl)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${moneyColor(s.brokerPnl)}`}>{fmtMoney(s.brokerPnl)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400/70">{fmtMoney(s.spreadRev)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400/70">{fmtMoney(s.commission)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t-2 border-white/10 bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-white/80">TOTAL</td>
                  <td className="px-4 py-3 text-right font-mono text-white/60">404.9L</td>
                  <td className="px-4 py-3 text-right font-mono text-white/60">311</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${moneyColor(-7100)}`}>{fmtMoney(-7100)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${moneyColor(4080)}`}>{fmtMoney(4080)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{fmtMoney(3150)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{fmtMoney(527)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Top Accounts Performance ── */}
      {(activeTab === 'overview' || activeTab === 'accounts') && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold">Top Accounts Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left">Account</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-right font-mono">Trades</th>
                  <th className="px-4 py-3 text-right font-mono">PnL</th>
                  <th className="px-4 py-3 text-right font-mono">Win Rate</th>
                  <th className="px-4 py-3 text-right font-mono">Avg Hold</th>
                  <th className="px-4 py-3 text-center">Risk</th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNT_PERF.map((a) => (
                  <tr key={a.account} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-mono text-cyan-300">{a.account}</td>
                    <td className="px-4 py-3 text-white/70">{a.client}</td>
                    <td className="px-4 py-3 text-right font-mono text-white/60">{a.trades}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${moneyColor(a.pnl)}`}>{fmtMoney(a.pnl)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={parseFloat(a.winRate) >= 80 ? 'text-red-400 font-bold' : parseFloat(a.winRate) >= 60 ? 'text-amber-300' : 'text-white/50'}>
                        {a.winRate}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white/50">{a.avgHold}</td>
                    <td className="px-4 py-3 text-center">{riskBadge(a.risk)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECTION 4: Money Flow ── */}
      {(activeTab === 'overview' || activeTab === 'flow') && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Money Flow</h2>
            <span className="ml-auto text-[10px] text-white/30 font-mono">LAST 24H</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-white/[0.04]">
            {[
              { label: 'Total Deposits (24h)', value: '$45,200', icon: ArrowUpRight, color: 'text-emerald-400' },
              { label: 'Total Withdrawals (24h)', value: '$12,800', icon: ArrowDownRight, color: 'text-red-400' },
              { label: 'Net Inflow', value: '+$32,400', icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Pending Withdrawals', value: '3 ($8,400)', icon: Clock, color: 'text-amber-400' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="p-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <span className="text-[9px] uppercase tracking-wider text-white/30">{item.label}</span>
                  </div>
                  <p className={`text-xl font-mono font-bold ${item.color}`}>{item.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECTION 5: Export Options ── */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0d1117] p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-white/40" />
          <h2 className="text-sm font-semibold">Export &amp; Scheduling</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium hover:bg-cyan-500/20 transition-colors cursor-pointer">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/20 transition-colors cursor-pointer">
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/20 transition-colors cursor-pointer">
            <Calendar className="h-3.5 w-3.5" />
            Schedule Daily Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors cursor-pointer">
            <BarChart3 className="h-3.5 w-3.5" />
            Custom Report Builder
          </button>
        </div>
      </div>
    </div>
  );
}
