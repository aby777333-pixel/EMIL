'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain,
  RefreshCw,
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Power,
} from 'lucide-react';
import SignalCard from './SignalCard';
import {
  generateInitialSignals,
  generateNewSignals,
  filterSignals,
  sortSignals,
  type TradingSignal,
} from '@/lib/trading/signal-engine';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import { cn } from '@/lib/utils/format';

type AssetFilter = 'all' | 'forex' | 'metal' | 'crypto' | 'index';
type SignalType = 'all' | 'BUY' | 'SELL';
type ConfidenceLevel = 'all' | 'high' | 'medium';
type SortBy = 'confidence' | 'time' | 'symbol';

export default function SignalDashboard() {
  const { prices, activeAccountId } = useTradingStore();

  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [autoScan, setAutoScan] = useState(true);
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [signalFilter, setSignalFilter] = useState<SignalType>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel>('all');
  const [sortBy, setSortBy] = useState<SortBy>('confidence');
  const [lastScan, setLastScan] = useState(0);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const pricesRef = useRef(prices);
  pricesRef.current = prices;

  // Generate initial signals once we have prices
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    if (Object.keys(prices).length > 0) {
      initialized.current = true;
      const initial = generateInitialSignals(prices, 10);
      setSignals(initial);
      setLastScan(Date.now());
    }
  }, [prices]);

  // Auto-scan: add 1-2 new signals every 30 seconds
  useEffect(() => {
    if (!autoScan) return;

    const iv = setInterval(() => {
      const count = Math.random() > 0.5 ? 2 : 1;
      const newSignals = generateNewSignals(pricesRef.current, count);
      setSignals((prev) => {
        const combined = [...newSignals, ...prev];
        // Keep at most 30 signals
        return combined.slice(0, 30);
      });
      setLastScan(Date.now());
    }, 30000);

    return () => clearInterval(iv);
  }, [autoScan]);

  // Timer for "Xs ago"
  useEffect(() => {
    const iv = setInterval(() => {
      setSecondsAgo(lastScan > 0 ? Math.floor((Date.now() - lastScan) / 1000) : 0);
    }, 1000);
    return () => clearInterval(iv);
  }, [lastScan]);

  const handleExecute = useCallback(
    async (signal: TradingSignal) => {
      if (!activeAccountId) {
        alert('No active account selected');
        return;
      }
      const tick = prices[signal.symbol];
      const fillPrice = tick
        ? (signal.direction === 'BUY' ? tick.ask : tick.bid)
        : signal.entry;

      try {
        await orderService.placeMarketOrder({
          accountId: activeAccountId,
          symbol: signal.symbol,
          direction: signal.direction,
          size: 0.01,
          sl: signal.sl,
          tp: signal.tp,
          fillPrice,
          comment: `AI Signal: ${signal.reasoning?.slice(0, 50)}`,
        });
      } catch (err) {
        console.error('[Signal Execute Error]', err);
      }
    },
    [activeAccountId, prices]
  );

  // Apply filters and sort
  const filtered = filterSignals(signals, assetFilter, signalFilter, confidenceFilter);
  const sorted = sortSignals(filtered, sortBy);

  // Summary stats
  const totalSignals = signals.length;
  const avgConfidence =
    signals.length > 0
      ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length)
      : 0;
  const buyCount = signals.filter((s) => s.direction === 'BUY').length;
  const sellCount = signals.filter((s) => s.direction === 'SELL').length;

  const assetFilters: { value: AssetFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'forex', label: 'Forex' },
    { value: 'metal', label: 'Metals' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'index', label: 'Indices' },
  ];

  const signalFilters: { value: SignalType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'BUY', label: 'Buy' },
    { value: 'SELL', label: 'Sell' },
  ];

  const confidenceFilters: { value: ConfidenceLevel; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
  ];

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'confidence', label: 'Confidence' },
    { value: 'time', label: 'Time' },
    { value: 'symbol', label: 'Symbol' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Brain size={18} style={{ color: '#0091D5' }} />
          <div>
            <h1 className="text-sm font-bold">AI Market Scanner</h1>
            <p className="text-[10px] opacity-40">
              Scanning all instruments across all timeframes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-[10px] opacity-60">
            <RefreshCw
              size={11}
              className={cn(autoScan && 'animate-spin')}
              style={{ animationDuration: '3s' }}
            />
            <span>Last scan: {secondsAgo}s ago</span>
          </div>

          {/* Auto-scan toggle */}
          <button
            onClick={() => setAutoScan(!autoScan)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-all',
              autoScan ? 'opacity-100' : 'opacity-50'
            )}
            style={{
              backgroundColor: autoScan ? '#0091D520' : 'var(--bg-primary)',
              color: autoScan ? '#0091D5' : undefined,
              border: `1px solid ${autoScan ? '#0091D540' : 'var(--border)'}`,
            }}
          >
            <Power size={10} />
            Auto-Scan {autoScan ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div
        className="grid grid-cols-4 gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <StatCard
          icon={<Activity size={13} style={{ color: '#0091D5' }} />}
          label="Active Signals"
          value={totalSignals.toString()}
        />
        <StatCard
          icon={<BarChart3 size={13} style={{ color: '#FFC107' }} />}
          label="Avg Confidence"
          value={`${avgConfidence}%`}
        />
        <StatCard
          icon={<TrendingUp size={13} style={{ color: '#00C853' }} />}
          label="Buy Signals"
          value={buyCount.toString()}
        />
        <StatCard
          icon={<TrendingDown size={13} style={{ color: '#FF1744' }} />}
          label="Sell Signals"
          value={sellCount.toString()}
        />
      </div>

      {/* Filter Bar */}
      <div
        className="flex items-center gap-4 px-4 py-2 border-b shrink-0 flex-wrap"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Asset type */}
        <FilterGroup
          label="Asset"
          options={assetFilters}
          value={assetFilter}
          onChange={(v) => setAssetFilter(v as AssetFilter)}
        />

        <div className="h-4 w-px" style={{ backgroundColor: 'var(--border)' }} />

        {/* Signal type */}
        <FilterGroup
          label="Signal"
          options={signalFilters}
          value={signalFilter}
          onChange={(v) => setSignalFilter(v as SignalType)}
        />

        <div className="h-4 w-px" style={{ backgroundColor: 'var(--border)' }} />

        {/* Confidence */}
        <FilterGroup
          label="Confidence"
          options={confidenceFilters}
          value={confidenceFilter}
          onChange={(v) => setConfidenceFilter(v as ConfidenceLevel)}
        />

        <div className="flex-1" />

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={10} className="opacity-40" />
          <span className="text-[10px] opacity-40">Sort:</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded transition-all',
                sortBy === opt.value ? 'opacity-100' : 'opacity-40 hover:opacity-60'
              )}
              style={
                sortBy === opt.value
                  ? { backgroundColor: 'var(--bg-elevated)' }
                  : undefined
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Cards Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-40 opacity-30 text-sm">
            No signals match your filters
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onExecute={handleExecute}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small helpers ── */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded"
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    >
      {icon}
      <div>
        <div className="text-[9px] opacity-40 uppercase">{label}</div>
        <div className="text-sm font-bold font-mono">{value}</div>
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] opacity-40">{label}:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded transition-all',
            value === opt.value ? 'opacity-100' : 'opacity-40 hover:opacity-60'
          )}
          style={
            value === opt.value
              ? { backgroundColor: '#0091D520', color: '#0091D5' }
              : undefined
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
