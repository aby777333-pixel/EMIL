'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  Zap,
  Newspaper,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { useDealingDeskStore } from '@/stores/dealer';
import type { Trade, RoutingMode } from '@/lib/dealer/types';

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const SYMBOLS = [
  'ALL', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD',
  'US30', 'NAS100', 'USOIL',
] as const;

type FilterMode = 'ALL' | 'HIGH_RISK' | 'MANUAL';

const AGE_WARN_MS = 5_000;
const AGE_DANGER_MS = 10_000;
const AGE_CRITICAL_MS = 15_000;

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function bookBadge(routing: RoutingMode | null): { label: string; color: string } {
  switch (routing) {
    case 'a_book':
      return { label: 'A', color: '#00C853' };
    case 'b_book':
      return { label: 'B', color: '#E50914' };
    case 'hybrid':
      return { label: 'H', color: '#FFB300' };
    default:
      return { label: '?', color: '#888899' };
  }
}

function formatVolume(size: number): string {
  if (size >= 100) return size.toFixed(0);
  if (size >= 10) return size.toFixed(1);
  return size.toFixed(2);
}

function formatPrice(price: number | null, digits = 5): string {
  if (price == null) return '---';
  return price.toFixed(digits);
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '\u2026' : str;
}

// ---------------------------------------------------------------
// Age Timer Hook (ticks every 100ms)
// ---------------------------------------------------------------

function useAgeTicker(orders: Trade[]): number {
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number>(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    if (orders.length === 0) return;

    const loop = (now: number) => {
      if (now - lastRef.current >= 100) {
        lastRef.current = now;
        setTick((t) => t + 1);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [orders.length]);

  return tick;
}

// ---------------------------------------------------------------
// Age Progress Bar
// ---------------------------------------------------------------

function AgeBar({ ageMs }: { ageMs: number }) {
  const pct = Math.min((ageMs / AGE_CRITICAL_MS) * 100, 100);

  let barColor = '#FFB300';
  if (ageMs >= AGE_DANGER_MS) barColor = '#E50914';
  else if (ageMs >= AGE_WARN_MS) barColor = '#FFB300';
  else barColor = '#00C853';

  const pulse = ageMs >= AGE_CRITICAL_MS;

  return (
    <div className="h-[2px] w-full rounded-full bg-[#252530] overflow-hidden">
      <div
        className={pulse ? 'animate-pulse' : ''}
        style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: barColor,
          borderRadius: '9999px',
          transition: 'width 100ms linear',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------
// Single Order Card
// ---------------------------------------------------------------

interface OrderCardProps {
  order: Trade;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function OrderCard({ order, isSelected, onSelect }: OrderCardProps) {
  const now = Date.now();
  const createdMs = new Date(order.created_at).getTime();
  const ageMs = now - createdMs;
  const ageSeconds = (ageMs / 1000).toFixed(1);

  const badge = bookBadge(order.routing_mode);
  const isBuy = order.direction === 'buy';
  const isToxic = (order.toxic_score ?? 0) >= 3;
  const isNews = false; // Placeholder: would check news_flag from enrichment
  const isHFT = false; // Placeholder: would check ai_suggestions for HFT pattern

  const isPulsingBorder = ageMs >= AGE_DANGER_MS;
  const isPulsingBg = ageMs >= AGE_CRITICAL_MS;

  return (
    <button
      type="button"
      onClick={() => onSelect(order.id)}
      className={[
        'relative w-full text-left px-2.5 py-2 transition-colors cursor-pointer',
        'border-l-[3px] border-b border-b-[#252530]/50',
        isSelected
          ? 'border-l-[#E50914] bg-[#1A1A22]'
          : 'border-l-transparent hover:bg-[#1A1A22]',
        isPulsingBorder && !isSelected ? 'order-card-pulse-border border-pulse-red' : '',
        isPulsingBg ? 'order-card-pulse-bg' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Line 1: Trade ID | Book Badge | Flags */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="font-mono text-[11px] text-[#888899] leading-none">
          {order.id.slice(0, 8)}
        </span>

        <span
          className="inline-flex items-center justify-center w-[16px] h-[14px] rounded-[2px] text-[9px] font-bold leading-none"
          style={{ backgroundColor: badge.color + '22', color: badge.color }}
        >
          {badge.label}
        </span>

        {isToxic && (
          <span title="Toxic flow detected" className="text-[#FFB300] pulse-red">
            <AlertTriangle className="w-3 h-3" />
          </span>
        )}
        {isHFT && (
          <span title="HFT pattern" className="text-[#00C853]">
            <Zap className="w-3 h-3" />
          </span>
        )}
        {isNews && (
          <span title="News flag" className="text-[#888899] pulse-amber">
            <Newspaper className="w-3 h-3" />
          </span>
        )}

        <span className={`ml-auto font-mono text-[10px] text-[#888899] leading-none tabular-nums ${ageMs >= AGE_CRITICAL_MS ? 'blink-danger' : ''}`}>
          {ageSeconds}s ago
        </span>
      </div>

      {/* Line 2: Symbol | Direction | Volume | Price */}
      <div className="flex items-baseline gap-1.5 mb-0.5">
        <span className="text-[16px] font-bold text-[#F2F2F2] leading-tight">
          {order.symbol}
        </span>
        <span
          className="text-[14px] font-semibold leading-tight"
          style={{ color: isBuy ? '#00C853' : '#E50914' }}
        >
          {isBuy ? 'BUY' : 'SELL'}
        </span>
        <span className="font-mono text-[12px] text-[#F2F2F2] leading-tight tabular-nums">
          {formatVolume(order.requested_size)}
        </span>
        <span className="text-[11px] text-[#888899] leading-tight">@</span>
        <span className="font-mono text-[12px] text-[#F2F2F2] leading-tight tabular-nums">
          {formatPrice(order.requested_price)}
        </span>
      </div>

      {/* Line 3: Client | Account | Age timer */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] text-[#888899] truncate max-w-[100px] leading-none">
          {truncate(order.client_id, 14)}
        </span>
        <span className="text-[10px] text-[#888899]/60 leading-none">|</span>
        <span className="font-mono text-[10px] text-[#888899] leading-none">
          {order.account_id.slice(0, 10)}
        </span>
      </div>

      {/* Line 4: Age progress bar */}
      <AgeBar ageMs={ageMs} />
    </button>
  );
}

// ---------------------------------------------------------------
// OrderQueue Main Component
// ---------------------------------------------------------------

export default function OrderQueue() {
  const orders = useDealingDeskStore((s) => s.orders);
  const selectedOrderId = useDealingDeskStore((s) => s.selectedOrderId);
  const selectOrder = useDealingDeskStore((s) => s.selectOrder);

  const [filter, setFilter] = useState<FilterMode>('ALL');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tick the age timers
  useAgeTicker(orders);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSymbolDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Symbol filter
    if (symbolFilter !== 'ALL') {
      result = result.filter((o) => o.symbol === symbolFilter);
    }

    // Mode filter
    switch (filter) {
      case 'HIGH_RISK':
        result = result.filter((o) => (o.risk_score ?? 0) >= 7 || (o.toxic_score ?? 0) >= 3);
        break;
      case 'MANUAL':
        result = result.filter(
          (o) =>
            o.status === 'pending_new' ||
            o.status === 'pending_validation' ||
            o.dealer_action != null
        );
        break;
      default:
        break;
    }

    return result;
  }, [orders, filter, symbolFilter]);

  const handleSelect = useCallback(
    (id: string) => {
      selectOrder(selectedOrderId === id ? null : id);
    },
    [selectOrder, selectedOrderId]
  );

  return (
    <div className="flex flex-col h-full w-[280px] bg-[#111116] border-r border-[#252530] select-none">
      {/* ---- Header Bar (28px) ---- */}
      <div className="flex items-center gap-1 h-[28px] min-h-[28px] px-2 border-b border-[#252530] bg-[#111116]">
        <span className="text-[10px] font-semibold tracking-[0.08em] text-[#888899] uppercase mr-auto">
          Order Queue
          <span className="ml-1 text-[#F2F2F2]">({filteredOrders.length})</span>
        </span>

        {/* Filter buttons */}
        {(['ALL', 'HIGH_RISK', 'MANUAL'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilter(mode)}
            className={[
              'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors leading-none',
              filter === mode
                ? 'bg-[#F2F2F2]/10 text-[#F2F2F2]'
                : 'text-[#888899] hover:text-[#F2F2F2] hover:bg-[#F2F2F2]/5',
            ].join(' ')}
          >
            {mode === 'HIGH_RISK' ? 'HIGH RISK' : mode}
          </button>
        ))}

        {/* Symbol dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono text-[#888899] hover:text-[#F2F2F2] hover:bg-[#F2F2F2]/5 transition-colors leading-none"
          >
            {symbolFilter === 'ALL' ? (
              <Filter className="w-2.5 h-2.5" />
            ) : (
              symbolFilter
            )}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {symbolDropdownOpen && (
            <div className="absolute right-0 top-full mt-0.5 z-50 bg-[#111116] border border-[#252530] rounded shadow-lg shadow-black/40 py-0.5 min-w-[90px]">
              {SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    setSymbolFilter(sym);
                    setSymbolDropdownOpen(false);
                  }}
                  className={[
                    'block w-full text-left px-2 py-1 text-[10px] font-mono transition-colors',
                    sym === symbolFilter
                      ? 'text-[#F2F2F2] bg-[#F2F2F2]/10'
                      : 'text-[#888899] hover:text-[#F2F2F2] hover:bg-[#F2F2F2]/5',
                  ].join(' ')}
                >
                  {sym}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Scrollable Order Cards ---- */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#252530]">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-[24px] mb-1 opacity-20">
              <Filter className="w-6 h-6 text-[#888899]" />
            </div>
            <p className="text-[11px] text-[#888899]">No pending orders</p>
            <p className="text-[10px] text-[#888899]/50 mt-0.5">
              {filter !== 'ALL' || symbolFilter !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Waiting for incoming flow'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isSelected={order.id === selectedOrderId}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* ---- Pulse animation styles ---- */}
      <style jsx global>{`
        @keyframes order-border-pulse {
          0%, 100% {
            border-left-color: #E50914;
          }
          50% {
            border-left-color: rgba(229, 9, 20, 0.3);
          }
        }
        @keyframes order-bg-pulse {
          0%, 100% {
            background-color: rgba(229, 9, 20, 0.08);
          }
          50% {
            background-color: transparent;
          }
        }
        .order-card-pulse-border {
          animation: order-border-pulse 1s ease-in-out infinite;
          border-left-width: 3px;
        }
        .order-card-pulse-bg {
          animation: order-bg-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
