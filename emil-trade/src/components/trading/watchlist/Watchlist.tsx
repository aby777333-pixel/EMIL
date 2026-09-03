'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, ArrowUp, ArrowDown, Plus, Info, Star, X, Minus, Loader2 } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import { formatPrice, cn } from '@/lib/utils/format';
import type { WatchlistItem, InstrumentType } from '@/types/trading';

interface WatchlistItemWithDirection extends WatchlistItem {
  direction: 'up' | 'down' | 'neutral';
}

const defaultWatchlist: WatchlistItem[] = [
  { symbol: 'EURUSD', description: 'Euro / US Dollar', type: 'forex', bid: 1.08432, ask: 1.08445, spread: 1.3, change: 0.00052, change_pct: 0.048, high: 1.08610, low: 1.08210 },
  { symbol: 'GBPUSD', description: 'British Pound / US Dollar', type: 'forex', bid: 1.26318, ask: 1.26336, spread: 1.8, change: -0.00124, change_pct: -0.098, high: 1.26590, low: 1.26100 },
  { symbol: 'USDJPY', description: 'US Dollar / Japanese Yen', type: 'forex', bid: 154.432, ask: 154.448, spread: 1.6, change: 0.312, change_pct: 0.206, high: 154.720, low: 153.980 },
  { symbol: 'XAUUSD', description: 'Gold / US Dollar', type: 'metal', bid: 2340.12, ask: 2340.52, spread: 4.0, change: 12.45, change_pct: 0.533, high: 2352.80, low: 2330.15 },
  { symbol: 'BTCUSD', description: 'Bitcoin / US Dollar', type: 'crypto', bid: 67425.50, ask: 67445.50, spread: 200.0, change: -352.80, change_pct: -0.506, high: 67920.00, low: 66980.00 },
  { symbol: 'ETHUSD', description: 'Ethereum / US Dollar', type: 'crypto', bid: 3450.18, ask: 3452.18, spread: 20.0, change: 45.62, change_pct: 1.312, high: 3475.00, low: 3420.50 },
  { symbol: 'US30', description: 'Dow Jones Industrial', type: 'index', bid: 39800.5, ask: 39803.5, spread: 3.0, change: 125.3, change_pct: 0.315, high: 39920.0, low: 39680.0 },
  { symbol: 'NAS100', description: 'Nasdaq 100 Index', type: 'index', bid: 17950.2, ask: 17952.2, spread: 2.0, change: -48.6, change_pct: -0.263, high: 18020.0, low: 17880.0 },
  { symbol: 'USDCHF', description: 'US Dollar / Swiss Franc', type: 'forex', bid: 0.88180, ask: 0.88200, spread: 2.0, change: -0.00035, change_pct: -0.040, high: 0.88350, low: 0.88050 },
  { symbol: 'AUDUSD', description: 'Australian Dollar / US Dollar', type: 'forex', bid: 0.65480, ask: 0.65498, spread: 1.8, change: 0.00042, change_pct: 0.064, high: 0.65600, low: 0.65350 },
  { symbol: 'USDCAD', description: 'US Dollar / Canadian Dollar', type: 'forex', bid: 1.36480, ask: 1.36500, spread: 2.0, change: 0.00085, change_pct: 0.062, high: 1.36620, low: 1.36300 },
  { symbol: 'EURGBP', description: 'Euro / British Pound', type: 'forex', bid: 0.85680, ask: 0.85700, spread: 2.0, change: -0.00018, change_pct: -0.021, high: 0.85780, low: 0.85600 },
  { symbol: 'XAGUSD', description: 'Silver / US Dollar', type: 'metal', bid: 27.480, ask: 27.510, spread: 3.0, change: 0.15, change_pct: 0.549, high: 27.65, low: 27.30 },
  { symbol: 'SPX500', description: 'S&P 500 Index', type: 'index', bid: 5280.0, ask: 5280.8, spread: 0.8, change: 8.5, change_pct: 0.161, high: 5295.0, low: 5268.0 },
  { symbol: 'USOIL', description: 'US Crude Oil', type: 'energy' as InstrumentType, bid: 78.45, ask: 78.50, spread: 0.05, change: -0.32, change_pct: -0.407, high: 79.10, low: 78.20 },
];

const QUICK_LOTS = [0.01, 0.10, 1.00];

function getDecimals(symbol: string): number {
  if (['USDJPY', 'EURJPY', 'GBPJPY'].includes(symbol)) return 3;
  if (symbol.startsWith('XAU') || symbol.startsWith('ETH')) return 2;
  if (symbol === 'XAGUSD' || symbol === 'NATGAS') return 3;
  if (symbol.startsWith('BTC') || symbol === 'US30' || symbol === 'NAS100' || symbol === 'SPX500') return 1;
  if (symbol === 'USOIL' || symbol === 'UKOIL') return 2;
  return 5;
}

function getLotStep(symbol: string): number {
  if (symbol.startsWith('BTC')) return 0.01;
  return 0.01;
}

export default function Watchlist() {
  const { activeSymbol, setActiveSymbol, prices, activeAccountId, triggerRefresh } = useTradingStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'favourites' | 'all'>('all');
  const [favourites, setFavourites] = useState<Set<string>>(() => new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'US30', 'NAS100']));
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [lotSize, setLotSize] = useState(0.01);
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Track previous prices for flash direction
  const prevPricesRef = useRef<Record<string, number>>({});
  const [flashState, setFlashState] = useState<Record<string, 'up' | 'down' | null>>({});

  // Detect price direction changes and trigger flash
  useEffect(() => {
    const newFlash: Record<string, 'up' | 'down' | null> = {};
    let hasChange = false;

    for (const symbol of Object.keys(prices)) {
      const current = prices[symbol].bid;
      const prev = prevPricesRef.current[symbol];

      if (prev !== undefined && current !== prev) {
        newFlash[symbol] = current > prev ? 'up' : 'down';
        hasChange = true;
      }
      prevPricesRef.current[symbol] = current;
    }

    if (hasChange) {
      setFlashState((old) => ({ ...old, ...newFlash }));

      const timeout = setTimeout(() => {
        setFlashState((old) => {
          const cleared: Record<string, 'up' | 'down' | null> = {};
          for (const key of Object.keys(old)) {
            cleared[key] = null;
          }
          return cleared;
        });
      }, 400);

      return () => clearTimeout(timeout);
    }
  }, [prices]);

  // Track tick direction per symbol
  const directionRef = useRef<Record<string, 'up' | 'down' | 'neutral'>>({});

  useEffect(() => {
    for (const symbol of Object.keys(prices)) {
      const current = prices[symbol].bid;
      const prev = prevPricesRef.current[symbol];
      if (prev !== undefined) {
        if (current > prev) directionRef.current[symbol] = 'up';
        else if (current < prev) directionRef.current[symbol] = 'down';
      }
    }
  }, [prices]);

  const toggleFavourite = useCallback((symbol: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }, []);

  const handleSymbolClick = useCallback((symbol: string) => {
    setActiveSymbol(symbol);
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
    setOrderError(null);
  }, [setActiveSymbol]);

  const adjustLot = useCallback((delta: number) => {
    setLotSize((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.max(0.01, next);
    });
  }, []);

  const handlePlaceOrder = useCallback(async (symbol: string, direction: 'BUY' | 'SELL') => {
    if (!activeAccountId) {
      setOrderError('No account selected');
      return;
    }

    const live = prices[symbol];
    if (!live) {
      setOrderError('No price available');
      return;
    }

    const fillPrice = direction === 'BUY' ? live.ask : live.bid;

    setIsPlacing(true);
    setOrderError(null);

    try {
      await orderService.placeMarketOrder({
        accountId: activeAccountId,
        symbol,
        direction,
        size: lotSize,
        fillPrice,
      });
      triggerRefresh();
      setExpandedSymbol(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Order failed';
      setOrderError(message);
    } finally {
      setIsPlacing(false);
    }
  }, [activeAccountId, prices, lotSize, triggerRefresh]);

  const items = useMemo(() => {
    const list: WatchlistItemWithDirection[] = defaultWatchlist.map((item) => {
      const live = prices[item.symbol];
      const direction = directionRef.current[item.symbol] ?? 'neutral';
      if (live) {
        return {
          ...item,
          bid: live.bid,
          ask: live.ask,
          spread: live.spread,
          direction,
        };
      }
      return { ...item, direction };
    });

    let filtered = list;

    if (activeTab === 'favourites') {
      filtered = filtered.filter((item) => favourites.has(item.symbol));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.symbol.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [search, prices, activeTab, favourites]);

  const favCount = favourites.size;
  const allCount = defaultWatchlist.length;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Tabs: Favourites / All Symbols */}
      <div
        className="flex border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => setActiveTab('favourites')}
          className={cn(
            'flex-1 py-2.5 text-[11px] font-medium uppercase tracking-wide transition-colors truncate px-2',
            activeTab === 'favourites'
              ? 'opacity-100'
              : 'opacity-40 hover:opacity-60'
          )}
          style={{
            borderBottom: activeTab === 'favourites' ? '2px solid #0091D5' : '2px solid transparent',
            color: activeTab === 'favourites' ? '#0091D5' : 'var(--text-primary)',
          }}
        >
          Favourites ({favCount})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex-1 py-2.5 text-[11px] font-medium uppercase tracking-wide transition-colors truncate px-2',
            activeTab === 'all'
              ? 'opacity-100'
              : 'opacity-40 hover:opacity-60'
          )}
          style={{
            borderBottom: activeTab === 'all' ? '2px solid #0091D5' : '2px solid transparent',
            color: activeTab === 'all' ? '#0091D5' : 'var(--text-primary)',
          }}
        >
          All ({allCount})
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <Search size={14} className="opacity-40 shrink-0" />
          <input
            type="text"
            placeholder="Search symbols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none text-[13px] placeholder:opacity-30"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Column Headers */}
      <div
        className="grid gap-1 px-3 py-1.5 text-[11px] uppercase tracking-wider opacity-40 border-b font-semibold"
        style={{ borderColor: 'var(--border)', gridTemplateColumns: '1fr 70px 70px' }}
      >
        <span>Symbol</span>
        <span className="text-right">Sell</span>
        <span className="text-right">Buy</span>
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {items.map((item) => {
          const isActive = activeSymbol === item.symbol;
          const isExpanded = expandedSymbol === item.symbol;
          const decimals = getDecimals(item.symbol);
          const flash = flashState[item.symbol];
          const isFav = favourites.has(item.symbol);

          return (
            <div key={item.symbol}>
              {/* Symbol Row */}
              <button
                onClick={() => handleSymbolClick(item.symbol)}
                className="w-full grid gap-1 items-center px-3 text-xs transition-all border-l-2"
                style={{
                  gridTemplateColumns: '1fr 70px 70px',
                  minHeight: 36,
                  borderLeftColor: isActive ? '#0091D5' : 'transparent',
                  backgroundColor: flash === 'up'
                    ? 'rgba(0,194,122,0.08)'
                    : flash === 'down'
                    ? 'rgba(193,18,31,0.08)'
                    : isActive
                    ? 'var(--bg-surface)'
                    : 'transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {/* Symbol Name + Direction */}
                <div className="text-left min-w-0 py-1.5">
                  <div className="font-bold text-[12px] flex items-center gap-1 leading-tight" style={{ color: '#FFFFFF' }}>
                    <span className="truncate">{item.symbol}</span>
                    {item.direction === 'up' && (
                      <ArrowUp size={10} className="shrink-0" style={{ color: '#00C27A' }} />
                    )}
                    {item.direction === 'down' && (
                      <ArrowDown size={10} className="shrink-0" style={{ color: '#C1121F' }} />
                    )}
                  </div>
                  <div className="text-[9px] opacity-30 truncate leading-tight mt-0.5">{item.description}</div>
                </div>

                {/* Sell Price */}
                <span
                  className="font-mono text-right text-[11px] font-medium"
                  style={{
                    color: flash === 'down' ? '#ff6b6b' : '#C1121F',
                    transition: 'color 0.15s',
                  }}
                >
                  {formatPrice(item.bid, decimals)}
                </span>

                {/* Buy Price */}
                <span
                  className="font-mono text-right text-[11px] font-medium"
                  style={{
                    color: flash === 'up' ? '#5dffa0' : '#00C27A',
                    transition: 'color 0.15s',
                  }}
                >
                  {formatPrice(item.ask, decimals)}
                </span>
              </button>

              {/* Expanded Order Widget */}
              {isExpanded && (
                <div
                  className="border-b"
                  style={{
                    backgroundColor: '#111118',
                    borderColor: 'rgba(255,255,255,0.06)',
                    borderLeft: '2px solid #0091D5',
                  }}
                >
                  {/* Widget Header */}
                  <div
                    className="flex items-center justify-between px-3 py-2 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {item.symbol}
                      </span>
                      <span className="text-[12px] font-mono opacity-60">
                        {formatPrice(item.bid, decimals)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavourite(item.symbol); }}
                        className="p-0.5 rounded hover:opacity-80 transition-opacity"
                        title={isFav ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        <Plus size={11} style={{ color: isFav ? '#0091D5' : 'rgba(255,255,255,0.3)' }} />
                      </button>
                      <button
                        className="p-0.5 rounded hover:opacity-80 transition-opacity"
                        title="Info"
                      >
                        <Info size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavourite(item.symbol); }}
                        className="p-0.5 rounded hover:opacity-80 transition-opacity"
                        title="Star"
                      >
                        <Star
                          size={11}
                          style={{ color: isFav ? '#F5A623' : 'rgba(255,255,255,0.3)' }}
                          fill={isFav ? '#F5A623' : 'none'}
                        />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedSymbol(null); }}
                        className="p-0.5 rounded hover:opacity-80 transition-opacity"
                        title="Close"
                      >
                        <X size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                    </div>
                  </div>

                  {/* SELL / LOT / BUY row */}
                  <div className="px-3 py-2.5">
                    <div className="flex items-stretch gap-1.5" style={{ height: 52 }}>
                      {/* SELL Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePlaceOrder(item.symbol, 'SELL'); }}
                        disabled={isPlacing}
                        className="flex-1 flex flex-col items-center justify-center rounded-lg transition-all py-3 btn-sell-glow"
                        style={{
                          backgroundColor: isPlacing ? 'rgba(193,18,31,0.08)' : 'rgba(193,18,31,0.15)',
                          border: '1px solid rgba(193,18,31,0.2)',
                          cursor: isPlacing ? 'wait' : 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                        onMouseEnter={(e) => { if (!isPlacing) e.currentTarget.style.backgroundColor = 'rgba(193,18,31,0.25)'; }}
                        onMouseLeave={(e) => { if (!isPlacing) e.currentTarget.style.backgroundColor = 'rgba(193,18,31,0.15)'; }}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#C1121F' }}>
                          Sell
                        </span>
                        <span className="font-mono text-[14px] font-bold leading-none mt-0.5" style={{ color: '#C1121F' }}>
                          {isPlacing ? <Loader2 size={14} className="animate-spin" /> : formatPrice(item.bid, decimals)}
                        </span>
                      </button>

                      {/* Lot Size Control */}
                      <div className="flex flex-col items-center justify-center gap-0.5" style={{ width: 56 }}>
                        <div className="flex items-center gap-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); adjustLot(-getLotStep(item.symbol)); }}
                            className="flex items-center justify-center rounded-l transition-colors"
                            style={{
                              width: 16,
                              height: 18,
                              backgroundColor: '#1A1A24',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#252530'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A24'; }}
                          >
                            <Minus size={8} style={{ color: 'rgba(255,255,255,0.5)' }} />
                          </button>
                          <input
                            type="text"
                            value={lotSize.toFixed(2)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0.01) setLotSize(val);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-center font-mono text-[11px] bg-transparent outline-none"
                            style={{
                              width: 36,
                              height: 18,
                              backgroundColor: '#1A1A24',
                              borderTop: '1px solid rgba(255,255,255,0.06)',
                              borderBottom: '1px solid rgba(255,255,255,0.06)',
                              color: '#fff',
                            }}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); adjustLot(getLotStep(item.symbol)); }}
                            className="flex items-center justify-center rounded-r transition-colors"
                            style={{
                              width: 16,
                              height: 18,
                              backgroundColor: '#1A1A24',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#252530'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A24'; }}
                          >
                            <Plus size={8} style={{ color: 'rgba(255,255,255,0.5)' }} />
                          </button>
                        </div>
                        <span className="text-[7px] uppercase tracking-wider opacity-30">Lots</span>
                      </div>

                      {/* BUY Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePlaceOrder(item.symbol, 'BUY'); }}
                        disabled={isPlacing}
                        className="flex-1 flex flex-col items-center justify-center rounded-lg transition-all py-3 btn-buy-glow"
                        style={{
                          backgroundColor: isPlacing ? 'rgba(0,194,122,0.08)' : 'rgba(0,194,122,0.15)',
                          border: '1px solid rgba(0,194,122,0.2)',
                          cursor: isPlacing ? 'wait' : 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                        onMouseEnter={(e) => { if (!isPlacing) e.currentTarget.style.backgroundColor = 'rgba(0,194,122,0.25)'; }}
                        onMouseLeave={(e) => { if (!isPlacing) e.currentTarget.style.backgroundColor = 'rgba(0,194,122,0.15)'; }}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#00C27A' }}>
                          Buy
                        </span>
                        <span className="font-mono text-[14px] font-bold leading-none mt-0.5" style={{ color: '#00C27A' }}>
                          {isPlacing ? <Loader2 size={14} className="animate-spin" /> : formatPrice(item.ask, decimals)}
                        </span>
                      </button>
                    </div>

                    {/* Quick Lot Buttons */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {QUICK_LOTS.map((lot) => (
                        <button
                          key={lot}
                          onClick={(e) => { e.stopPropagation(); setLotSize(lot); }}
                          className="flex-1 text-center py-1 rounded text-[11px] font-mono transition-colors"
                          style={{
                            backgroundColor: lotSize === lot ? 'rgba(41,171,226,0.15)' : '#1A1A24',
                            border: lotSize === lot ? '1px solid rgba(41,171,226,0.3)' : '1px solid rgba(255,255,255,0.06)',
                            color: lotSize === lot ? '#0091D5' : 'rgba(255,255,255,0.5)',
                          }}
                          onMouseEnter={(e) => {
                            if (lotSize !== lot) e.currentTarget.style.backgroundColor = '#252530';
                          }}
                          onMouseLeave={(e) => {
                            if (lotSize !== lot) e.currentTarget.style.backgroundColor = '#1A1A24';
                          }}
                        >
                          {lot.toFixed(2)}
                        </button>
                      ))}
                    </div>

                    {/* Low / High */}
                    <div
                      className="flex items-center justify-between mt-2 px-1"
                    >
                      <div className="text-[11px]">
                        <span className="opacity-30 mr-1">L</span>
                        <span className="font-mono opacity-50" style={{ color: '#C1121F' }}>
                          {formatPrice(item.low, decimals)}
                        </span>
                      </div>
                      <div className="text-[11px]">
                        <span className="opacity-30 mr-1">H</span>
                        <span className="font-mono opacity-50" style={{ color: '#00C27A' }}>
                          {formatPrice(item.high, decimals)}
                        </span>
                      </div>
                    </div>

                    {/* Error */}
                    {orderError && (
                      <div
                        className="mt-1.5 px-2 py-1 rounded text-[11px] text-center"
                        style={{
                          backgroundColor: 'rgba(193,18,31,0.1)',
                          color: '#C1121F',
                          border: '1px solid rgba(193,18,31,0.2)',
                        }}
                      >
                        {orderError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[13px] opacity-30">
            {activeTab === 'favourites' ? 'No favourites yet' : 'No symbols found'}
          </div>
        )}
      </div>
    </div>
  );
}
