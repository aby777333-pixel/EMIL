'use client';

import { useState } from 'react';

/* ───────────── Types ───────────── */
interface SessionOrder {
  time: string;
  symbol: string;
  direction: 'Buy' | 'Sell';
  lots: number;
  price: number;
  pnl: number;
  book: 'A' | 'B';
  account: string;
}

/* ───────────── Sidebar items ───────────── */
const SIDEBAR_ITEMS = [
  'PnL Details',
  'Winners & Losers',
  'Session Realized',
  'Equities by Groups',
  'Top Accounts Volumes',
  'Top Symbols Volumes',
  'Deposits & Withdrawals',
  'Balances Summary',
  'Agent Commissions',
  'New Funded Accounts',
  'Stop Outs',
];

/* ───────────── Mock orders ───────────── */
const MOCK_ORDERS: SessionOrder[] = [
  { time: '15:49:22', symbol: 'EURUSD', direction: 'Sell', lots: 0.11, price: 1.05332, pnl: -45.20, book: 'B', account: '6204488' },
  { time: '15:49:18', symbol: 'XAUUSD', direction: 'Buy', lots: 1.00, price: 2356.20, pnl: 770.00, book: 'A', account: '6201983' },
  { time: '15:48:55', symbol: 'GBPUSD', direction: 'Buy', lots: 0.50, price: 1.26780, pnl: 123.40, book: 'B', account: '6199166' },
  { time: '15:48:30', symbol: 'BTCUSD', direction: 'Sell', lots: 0.25, price: 69200.00, pnl: -310.00, book: 'A', account: '6204934' },
  { time: '15:48:12', symbol: 'USDJPY', direction: 'Buy', lots: 2.00, price: 153.680, pnl: 456.80, book: 'B', account: '6204083' },
  { time: '15:47:55', symbol: 'NZDCAD', direction: 'Buy', lots: 0.02, price: 0.83450, pnl: 2.93, book: 'B', account: '1400978' },
  { time: '15:47:30', symbol: 'EURUSD', direction: 'Sell', lots: 5.00, price: 1.05280, pnl: -1200.50, book: 'A', account: '6200112' },
  { time: '15:47:10', symbol: 'XAUUSD', direction: 'Sell', lots: 0.10, price: 2354.80, pnl: 88.20, book: 'B', account: '6203771' },
  { time: '15:46:50', symbol: 'AUDCAD', direction: 'Buy', lots: 0.01, price: 0.87220, pnl: 0.08, book: 'B', account: '6204083' },
  { time: '15:46:22', symbol: 'US30', direction: 'Buy', lots: 1.00, price: 39450.00, pnl: 3200.00, book: 'A', account: '6201500' },
];

/* ───────────── PnL Line Chart (SVG) ───────────── */
function PnLLineChart() {
  const W = 900, H = 250, padL = 10, padR = 70, padT = 20, padB = 30;
  const bW = W - padL - padR, bH = H - padT - padB;
  const points = 48; // 30-min intervals over 24h
  const data = Array.from({ length: points }, (_, i) => {
    const progress = i / (points - 1);
    return 18300000 * progress * (1 + 0.05 * Math.sin(progress * 12));
  });
  const maxV = Math.max(...data);
  const yOf = (v: number) => padT + bH - (v / maxV) * bH;
  const xOf = (i: number) => padL + (i / (points - 1)) * bW;
  const pathD = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(v)}`).join(' ');
  const areaD = pathD + ` L ${xOf(points - 1)} ${padT + bH} L ${xOf(0)} ${padT + bH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--profit)" stopOpacity={0.25} />
          <stop offset="100%" stopColor="var(--profit)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const y = padT + bH * (1 - pct);
        const val = maxV * pct;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.04)" />
            <text x={W - padR + 4} y={y + 3} fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="monospace">
              ${(val / 1e6).toFixed(1)}M
            </text>
          </g>
        );
      })}
      {/* X-axis labels */}
      {[0, 6, 12, 18, 24].map((h, i) => (
        <text key={i} x={xOf((h / 24) * (points - 1))} y={H - 5} fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="monospace" textAnchor="middle">
          {`${String(h).padStart(2, '0')}:00`}
        </text>
      ))}
      <path d={areaD} fill="url(#pnlGrad)" />
      <path d={pathD} fill="none" stroke="var(--profit)" strokeWidth={1.5} />
    </svg>
  );
}

/* ───────────── Filter button ───────────── */
function FilterDropdown({ label }: { label: string }) {
  return (
    <button
      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] border transition-colors"
      style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
    >
      {label} <span className="text-white/20">&darr;</span>
    </button>
  );
}

/* ───────────── Toggle Switch ───────────── */
function ToggleSwitch({ label }: { label: string }) {
  const [on, setOn] = useState(false);
  return (
    <button onClick={() => setOn(!on)} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
      <div className="w-7 h-3.5 rounded-full relative transition-colors" style={{ background: on ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }}>
        <div
          className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all"
          style={{ left: on ? 14 : 2 }}
        />
      </div>
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════ */
/*        Current Trade Session Page          */
/* ═══════════════════════════════════════════ */
export default function SessionPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'accounts' | 'desk'>('orders');
  const [activeSidebar, setActiveSidebar] = useState('PnL Details');

  const FILTERS = [
    'Any server', 'Any country', 'Any group', 'Choose agents', 'Any reason', 'Any group', 'A+B Books',
  ];

  return (
    <div className="p-4 min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <h1 className="text-lg font-bold text-white tracking-wide mb-4">CURRENT TRADE SESSION</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        {FILTERS.map((f, i) => (
          <FilterDropdown key={i} label={f} />
        ))}
        <ToggleSwitch label="Dealer side" />
        <ToggleSwitch label="Collect Symbol suffixes" />
      </div>

      <div className="flex gap-4">
        {/* ─── Left sidebar ─── */}
        <div className="w-48 shrink-0 rounded-lg border p-2 space-y-0.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item}
              onClick={() => setActiveSidebar(item)}
              className="w-full text-left px-3 py-1.5 rounded text-[11px] transition-colors"
              style={{
                color: activeSidebar === item ? 'var(--accent)' : 'var(--text-secondary)',
                background: activeSidebar === item ? 'rgba(0,180,216,0.08)' : 'transparent',
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* ─── Main content ─── */}
        <div className="flex-1 space-y-4">
          {/* Section 1: Session PnL */}
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Session PnL</span>
              <span className="text-[10px] text-white/30">&mdash; 620 traded symbols</span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { value: '$18,507,437.81', label: 'Session Total PnL', positive: true },
                { value: '$12,909,818.88', label: 'Session Realized PnL', positive: true },
                { value: '$5,598,298.93', label: 'Change of Unrealized', positive: true },
                { value: '$1,995.00', label: 'Session Agents Commissions', positive: true },
              ].map((m, i) => (
                <div key={i}>
                  <div className="mono text-lg font-bold" style={{ color: m.positive ? 'var(--profit)' : 'var(--loss)' }}>{m.value}</div>
                  <div className="text-[10px] text-white/30">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { value: '$555.40', label: 'A-Book Session PnL', positive: true },
                { value: '$0.00', label: 'A-Book Realized PnL', positive: true },
                { value: '$139,569,022.46', label: 'Session Net Deposit', positive: true },
                { value: '$2,215.00', label: 'Session SO Compensations', positive: true },
              ].map((m, i) => (
                <div key={i}>
                  <div className="mono text-lg font-bold" style={{ color: m.positive ? 'var(--profit)' : 'var(--loss)' }}>{m.value}</div>
                  <div className="text-[10px] text-white/30">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { value: '$18,506,882.41', label: 'B-Book Session PnL', positive: true },
                { value: '$12,909,818.88', label: 'B-Book Realized PnL', positive: true },
              ].map((m, i) => (
                <div key={i}>
                  <div className="mono text-lg font-bold" style={{ color: m.positive ? 'var(--profit)' : 'var(--loss)' }}>{m.value}</div>
                  <div className="text-[10px] text-white/30">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: PnL Chart */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Session PnL Over Time</span>
            </div>
            <div className="px-2 py-1">
              <PnLLineChart />
            </div>
          </div>

          {/* Section 3: Bottom tabs */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
              {([
                ['orders', 'Session orders'],
                ['accounts', 'Session accounts'],
                ['desk', 'Dealing desk'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors border-b-2"
                  style={{
                    color: activeTab === key ? 'var(--accent)' : 'var(--text-secondary)',
                    borderBottomColor: activeTab === key ? 'var(--accent)' : 'transparent',
                    background: activeTab === key ? 'rgba(0,180,216,0.05)' : 'transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-white/30 uppercase text-[10px] tracking-wider" style={{ background: 'var(--bg-elevated)' }}>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-left">Direction</th>
                    <th className="px-3 py-2 text-right">Lots</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">PnL</th>
                    <th className="px-3 py-2 text-center">Book</th>
                    <th className="px-3 py-2 text-left">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ORDERS.map((o, i) => (
                    <tr key={i} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-3 py-1.5 mono text-white/40">{o.time}</td>
                      <td className="px-3 py-1.5 font-medium text-white/80">{o.symbol}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            color: o.direction === 'Buy' ? 'var(--profit)' : 'var(--loss)',
                            background: o.direction === 'Buy' ? 'rgba(0,200,150,0.12)' : 'rgba(255,69,96,0.12)',
                          }}
                        >
                          {o.direction}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right mono text-white/60">{o.lots.toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right mono text-white/70">{o.price.toFixed(o.price > 100 ? 2 : 5)}</td>
                      <td className="px-3 py-1.5 text-right mono font-semibold" style={{ color: o.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                        {o.pnl >= 0 ? '+' : ''}${o.pnl.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span
                          className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            color: o.book === 'A' ? 'var(--accent)' : 'var(--gold)',
                            background: o.book === 'A' ? 'rgba(0,180,216,0.1)' : 'rgba(240,165,0,0.1)',
                          }}
                        >
                          {o.book}-Book
                        </span>
                      </td>
                      <td className="px-3 py-1.5 mono text-white/50">{o.account}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
