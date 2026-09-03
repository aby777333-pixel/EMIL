'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Pin, PinOff, Search, ChevronDown } from 'lucide-react';
import { usePriceFeedStore } from '@/stores/dealer';

// ---------------------------------------------------------------
// Static symbol metadata
// ---------------------------------------------------------------

interface SymbolMeta {
  symbol: string;
  group: string;
  decimals: number;
}

const SYMBOLS: SymbolMeta[] = [
  { symbol: 'EURUSD', group: 'Forex', decimals: 5 },
  { symbol: 'GBPUSD', group: 'Forex', decimals: 5 },
  { symbol: 'USDJPY', group: 'Forex', decimals: 3 },
  { symbol: 'GBPJPY', group: 'Forex', decimals: 3 },
  { symbol: 'AUDUSD', group: 'Forex', decimals: 5 },
  { symbol: 'USDCHF', group: 'Forex', decimals: 5 },
  { symbol: 'USDCAD', group: 'Forex', decimals: 5 },
  { symbol: 'NZDUSD', group: 'Forex', decimals: 5 },
  { symbol: 'XAUUSD', group: 'Metals', decimals: 2 },
  { symbol: 'XAGUSD', group: 'Metals', decimals: 3 },
  { symbol: 'BTCUSD', group: 'Crypto', decimals: 0 },
  { symbol: 'ETHUSD', group: 'Crypto', decimals: 2 },
];

const GROUPS = ['All', ...Array.from(new Set(SYMBOLS.map((s) => s.group)))];

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function formatPrice(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatChange(value: number, decimals: number): string {
  const sign = value >= 0 ? '+' : '';
  return sign + value.toFixed(decimals);
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(2) + '%';
}

// ---------------------------------------------------------------
// MarketRatesPanel
// ---------------------------------------------------------------

export function MarketRatesPanel() {
  const [pinned, setPinned] = useState(true);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');

  // Session open prices -- captured once per symbol on first tick
  const sessionOpenRef = useRef<Record<string, number>>({});

  const prices = usePriceFeedStore((s) => s.prices);

  // Capture session open prices on first tick per symbol
  useEffect(() => {
    for (const [symbol, tick] of Object.entries(prices)) {
      if (!sessionOpenRef.current[symbol]) {
        sessionOpenRef.current[symbol] = tick.mid;
      }
    }
  }, [prices]);

  // Filter symbols
  const filtered = useMemo(() => {
    let list = SYMBOLS;
    if (group !== 'All') {
      list = list.filter((s) => s.group === group);
    }
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((s) => s.symbol.includes(q));
    }
    return list;
  }, [group, search]);

  const getChange = useCallback(
    (symbol: string): { abs: number; pct: number } => {
      const tick = prices[symbol];
      const openPrice = sessionOpenRef.current[symbol];
      if (!tick || !openPrice) return { abs: 0, pct: 0 };
      const abs = tick.mid - openPrice;
      const pct = (abs / openPrice) * 100;
      return { abs, pct };
    },
    [prices],
  );

  if (!pinned) {
    return (
      <button
        onClick={() => setPinned(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 px-1.5 py-4 rounded-r-md text-[10px] font-bold uppercase tracking-widest"
        style={{
          backgroundColor: '#0B1422',
          borderRight: '1px solid #252530',
          borderTop: '1px solid #252530',
          borderBottom: '1px solid #252530',
          color: '#8B8FA3',
          writingMode: 'vertical-lr',
        }}
      >
        RATES
      </button>
    );
  }

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 h-full overflow-hidden"
      style={{
        width: 280,
        backgroundColor: '#0B1422',
        borderRight: '1px solid #252530',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 h-11 shrink-0"
        style={{ borderBottom: '1px solid #252530' }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: '#8B8FA3' }}
        >
          Market Rates
        </span>
        <button
          onClick={() => setPinned(false)}
          className="p-1 rounded hover:bg-white/[0.06] transition-colors"
          title={pinned ? 'Unpin panel' : 'Pin panel'}
          style={{ color: '#8B8FA3' }}
        >
          {pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      </div>

      {/* Search + Group filter */}
      <div className="px-3 py-2 space-y-1.5 shrink-0" style={{ borderBottom: '1px solid #252530' }}>
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#555' }}
          />
          <input
            type="text"
            placeholder="Search symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md py-1.5 pl-7 pr-2 text-xs outline-none placeholder:text-[#555]"
            style={{
              backgroundColor: '#111827',
              border: '1px solid #252530',
              color: '#D1D5DB',
            }}
          />
        </div>
        <div className="relative">
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="w-full rounded-md py-1.5 px-2 pr-7 text-xs appearance-none outline-none cursor-pointer"
            style={{
              backgroundColor: '#111827',
              border: '1px solid #252530',
              color: '#D1D5DB',
            }}
          >
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#555' }}
          />
        </div>
      </div>

      {/* Table header */}
      <div
        className="grid px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shrink-0"
        style={{
          gridTemplateColumns: '1fr 70px 70px 72px',
          color: '#555',
          borderBottom: '1px solid #252530',
        }}
      >
        <span>Symbol</span>
        <span className="text-right">Bid</span>
        <span className="text-right">Ask</span>
        <span className="text-right">Change</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {filtered.map((meta) => {
          const tick = prices[meta.symbol];
          const change = getChange(meta.symbol);
          const isPositive = change.abs >= 0;
          const changeColor = isPositive ? '#10B981' : '#EF4444';

          return (
            <div
              key={meta.symbol}
              className="grid items-center px-3 py-1.5 hover:bg-white/[0.02] transition-colors cursor-default"
              style={{
                gridTemplateColumns: '1fr 70px 70px 72px',
                borderBottom: '1px solid #1A1F2E',
              }}
            >
              {/* Symbol */}
              <span className="text-[11px] font-semibold" style={{ color: '#D1D5DB' }}>
                {meta.symbol}
              </span>

              {/* Bid */}
              <span
                className="text-right font-mono text-[11px]"
                style={{ color: '#D1D5DB' }}
              >
                {tick ? formatPrice(tick.bid, meta.decimals) : '--'}
              </span>

              {/* Ask */}
              <span
                className="text-right font-mono text-[11px]"
                style={{ color: '#D1D5DB' }}
              >
                {tick ? formatPrice(tick.ask, meta.decimals) : '--'}
              </span>

              {/* Change */}
              <div className="text-right">
                {tick ? (
                  <>
                    <div
                      className="font-mono text-[10px] leading-tight"
                      style={{ color: changeColor }}
                    >
                      {formatChange(change.abs, meta.decimals)}
                    </div>
                    <div
                      className="font-mono text-[9px] leading-tight"
                      style={{ color: changeColor }}
                    >
                      {formatPct(change.pct)}
                    </div>
                  </>
                ) : (
                  <span className="text-[10px]" style={{ color: '#555' }}>
                    --
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-xs" style={{ color: '#555' }}>
            No symbols found
          </div>
        )}
      </div>
    </aside>
  );
}
