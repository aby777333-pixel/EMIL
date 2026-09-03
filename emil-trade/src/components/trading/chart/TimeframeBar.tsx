'use client';

// Shared Timeframe bar (super-prompt §7). A single row of timeframes rendered
// ABOVE both chart panels; clicking one drives BOTH the TradingView and RAPTOR
// charts through the shared store (activeTimeframe). The RAPTOR chart's own
// toolbar dropdown and the number-key shortcuts write the same store value, so
// this bar always reflects the live timeframe.

import { useTradingStore } from '@/stores/trading';
import { headerBtnStyle } from './header-theme';

// Full MT5/TradingView-style ladder. `value` matches the store's TF label.
const TIMEFRAMES: { label: string; value: string }[] = [
  { label: 'M1', value: '1m' },
  { label: 'M5', value: '5m' },
  { label: 'M15', value: '15m' },
  { label: 'M30', value: '30m' },
  { label: 'H1', value: '1H' },
  { label: 'H4', value: '4H' },
  { label: 'D1', value: '1D' },
  { label: 'W1', value: '1W' },
  { label: 'MN', value: '1Mo' },
];

export default function TimeframeBar({ middle, trailing }: { middle?: React.ReactNode; trailing?: React.ReactNode }) {
  const activeTimeframe = useTradingStore((s) => s.activeTimeframe);
  const setActiveTimeframe = useTradingStore((s) => s.setActiveTimeframe);

  const select = (tf: string) => {
    setActiveTimeframe(tf);
    // Keep any listeners that only watch the window event (keyboard path) in sync.
    try { window.dispatchEvent(new CustomEvent('raptor-timeframe-change', { detail: tf })); } catch { /* ignore */ }
  };

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-0.5 gap-y-1 border-b px-2 py-1"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      /* flex-wrap (owner rule): nothing may go off-frame or overlap — chips
         that don't fit wrap to a second row instead of scrolling out of view */
    >
      <span className="mr-1 shrink-0 text-[8px] font-semibold uppercase tracking-wider text-white/25">TF</span>
      {TIMEFRAMES.map((tf) => {
        const active = activeTimeframe === tf.value;
        return (
          <button
            key={tf.value}
            onClick={() => select(tf.value)}
            title={`Set both charts to ${tf.label}`}
            className="shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition-all"
            style={headerBtnStyle('tf', active)}
          >
            {tf.label}
          </button>
        );
      })}
      {middle && <div className="ml-3 flex shrink-0 items-center gap-1">{middle}</div>}
      <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
        {trailing}
      </div>
    </div>
  );
}
