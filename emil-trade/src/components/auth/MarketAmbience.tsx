'use client';

/**
 * MarketAmbience — slow drifting list of major instruments shown on the
 * right pane of AuthShell. Static, non-interactive, no realtime feed.
 *
 * Pure visual ambience — gives the auth screen the "trading desk in the
 * background" feel without any data dependency. The list is duplicated
 * once so the CSS @keyframes can scroll -50% for a seamless loop.
 */

interface Tick {
  symbol: string;
  bid: string;
  ask: string;
  change: number;
}

const TICKS: Tick[] = [
  { symbol: 'EUR/USD', bid: '1.08742', ask: '1.08744', change:  0.12 },
  { symbol: 'GBP/USD', bid: '1.27013', ask: '1.27015', change: -0.04 },
  { symbol: 'USD/JPY', bid: '149.221', ask: '149.224', change:  0.31 },
  { symbol: 'AUD/USD', bid: '0.66218', ask: '0.66220', change: -0.18 },
  { symbol: 'USD/CHF', bid: '0.87814', ask: '0.87817', change:  0.06 },
  { symbol: 'XAU/USD', bid: '2031.45', ask: '2031.92', change:  0.42 },
  { symbol: 'XAG/USD', bid: '23.184',  ask: '23.221',  change:  0.21 },
  { symbol: 'BTC/USD', bid: '64218.4', ask: '64224.1', change:  1.24 },
  { symbol: 'ETH/USD', bid: '3142.18', ask: '3142.84', change: -0.62 },
  { symbol: 'NAS100',  bid: '17842.5', ask: '17843.2', change:  0.18 },
  { symbol: 'SPX500',  bid: '5132.42', ask: '5132.71', change:  0.04 },
  { symbol: 'US30',    bid: '38914.2', ask: '38915.7', change: -0.09 },
];

export default function MarketAmbience() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="px-8 pt-10 pb-6">
        <div
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--g-text-muted)' }}
        >
          Live markets
        </div>
        <div className="mt-1 text-[28px] font-light leading-tight" style={{ color: 'var(--g-text-primary)' }}>
          The desk is open.
        </div>
        <div className="mt-2 text-sm max-w-md" style={{ color: 'var(--g-text-secondary)' }}>
          Sub-millisecond execution. Multi-asset coverage. Built for traders who measure
          slippage in pips and partners who measure trust in years.
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-12 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, var(--g-bg-void) 0%, transparent 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-12 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(0deg, var(--g-bg-void) 0%, transparent 100%)' }} />

        <div className="g-drift">
          {[...TICKS, ...TICKS].map((t, i) => (
            <TickerRow key={`${t.symbol}-${i}`} tick={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TickerRow({ tick }: { tick: Tick }) {
  const positive = tick.change >= 0;
  return (
    <div
      className="flex items-baseline justify-between px-8 py-3 border-b"
      style={{ borderColor: 'var(--g-border-hair)' }}
    >
      <div className="flex flex-col">
        <span className="text-[13px] tracking-wide" style={{ color: 'var(--g-text-secondary)' }}>
          {tick.symbol}
        </span>
        <span className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--g-text-muted)' }}>
          Bid {tick.bid} · Ask {tick.ask}
        </span>
      </div>
      <span
        className="num text-[15px] font-medium"
        style={{ color: positive ? 'var(--g-pnl-positive)' : 'var(--g-pnl-negative)' }}
      >
        {positive ? '▲' : '▼'} {Math.abs(tick.change).toFixed(2)}%
      </span>
    </div>
  );
}
