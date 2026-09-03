'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Activity, Filter, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useDealingDeskStore, useExposureStore } from '@/stores/dealer';
import type { Trade, SymbolExposure, RoutingMode } from '@/lib/dealer/types';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

type BookFilter = 'ALL' | 'A-BOOK' | 'B-BOOK';

// ---------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------

const clr = {
  bg: '#111116',
  elevated: '#1A1A22',
  border: '#252530',
  text: '#F2F2F2',
  muted: '#888899',
  success: '#00C853',
  danger: '#E50914',
  warning: '#FFB300',
  aBook: '#00C853',
  bBook: '#E50914',
} as const;

function pnlColor(v: number): string {
  if (v > 0) return clr.success;
  if (v < 0) return clr.danger;
  return clr.muted;
}

function dirColor(d: string): string {
  const lower = d.toLowerCase();
  return lower === 'buy' ? clr.success : clr.danger;
}

function dirChar(d: string): string {
  return d.toLowerCase() === 'buy' ? 'B' : 'S';
}

// ---------------------------------------------------------------
// Exposure bar color based on utilization %
// ---------------------------------------------------------------

function barStyle(pct: number): { bg: string; pulse: boolean } {
  if (pct >= 85) return { bg: '#E50914', pulse: true };
  if (pct >= 60) return { bg: '#FF6D00', pulse: false };
  if (pct >= 30) return { bg: '#FFB300', pulse: false };
  return { bg: '#333344', pulse: false };
}

// ---------------------------------------------------------------
// Section 1 -- Exposure Heatmap
// ---------------------------------------------------------------

function ExposureHeatmap() {
  const exposures = useExposureStore((s) => s.exposures);

  const rows = useMemo(() => {
    const list = Object.values(exposures) as SymbolExposure[];
    return list
      .sort((a, b) => Math.abs(b.net_position) - Math.abs(a.net_position))
      .slice(0, 6);
  }, [exposures]);

  return (
    <div
      className="flex flex-col"
      style={{ height: 180, borderBottom: `1px solid ${clr.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-3 shrink-0"
        style={{
          height: 28,
          borderBottom: `1px solid ${clr.border}`,
          color: clr.muted,
          fontSize: 10,
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        <Activity size={12} />
        EXPOSURE MAP
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {rows.length === 0 && (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: clr.muted, fontSize: 11 }}
          >
            No exposure data
          </div>
        )}
        {rows.map((e) => {
          const pct = Math.min(e.utilization_pct, 100);
          const { bg, pulse } = barStyle(pct);
          return (
            <div
              key={e.symbol}
              className="flex items-center gap-2"
              style={{ height: 22 }}
            >
              {/* Symbol */}
              <span
                className="font-bold shrink-0"
                style={{ width: 64, fontSize: 11, color: clr.text }}
              >
                {e.symbol}
              </span>

              {/* Net lots */}
              <span
                className="font-mono shrink-0 text-right"
                style={{
                  width: 52,
                  fontSize: 10,
                  color: e.net_position > 0 ? clr.success : e.net_position < 0 ? clr.danger : clr.muted,
                }}
              >
                {e.net_position > 0 ? '+' : ''}{e.net_position.toFixed(2)}
              </span>

              {/* Bar */}
              <div
                className="flex-1 rounded-sm overflow-hidden"
                style={{ height: 10, background: '#1e1e2a' }}
              >
                <div
                  className={pulse ? 'animate-pulse' : ''}
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: bg,
                    borderRadius: 2,
                    transition: 'width 300ms ease',
                  }}
                />
              </div>

              {/* Pct label */}
              <span
                className="font-mono shrink-0 text-right"
                style={{ width: 32, fontSize: 9, color: clr.muted }}
              >
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Section 2 -- Open Positions Table
// ---------------------------------------------------------------

function OpenPositionsTable() {
  const [filter, setFilter] = useState<BookFilter>('ALL');
  const openPositions = useDealingDeskStore((s) => s.openPositions);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return openPositions;
    const mode: RoutingMode = filter === 'A-BOOK' ? 'a_book' : 'b_book';
    return openPositions.filter((p) => p.routing_mode === mode);
  }, [openPositions, filter]);

  const filters: BookFilter[] = ['ALL', 'A-BOOK', 'B-BOOK'];

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{ borderBottom: `1px solid ${clr.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{
          height: 28,
          borderBottom: `1px solid ${clr.border}`,
        }}
      >
        <div className="flex items-center gap-1.5" style={{ color: clr.muted, fontSize: 10, letterSpacing: '0.08em', fontWeight: 600 }}>
          <Filter size={12} />
          OPEN POSITIONS
        </div>
        <div className="flex gap-0.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-1.5 py-0.5 rounded text-center transition-colors"
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.04em',
                background: filter === f ? '#2a2a3a' : 'transparent',
                color: filter === f ? clr.text : clr.muted,
                border: filter === f ? `1px solid ${clr.border}` : '1px solid transparent',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid shrink-0 px-2"
        style={{
          gridTemplateColumns: '36px 52px 18px 36px 56px 52px 16px',
          gap: 4,
          height: 20,
          alignItems: 'center',
          fontSize: 9,
          color: clr.muted,
          borderBottom: `1px solid ${clr.border}`,
          letterSpacing: '0.04em',
        }}
      >
        <span>ID</span>
        <span>SYM</span>
        <span>D</span>
        <span className="text-right">LOTS</span>
        <span className="text-right">OPEN@</span>
        <span className="text-right">PNL</span>
        <span className="text-center">BK</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div
            className="flex items-center justify-center py-6"
            style={{ color: clr.muted, fontSize: 11 }}
          >
            No open positions
          </div>
        )}
        {filtered.map((pos) => (
          <PositionRow key={pos.id} pos={pos} />
        ))}
      </div>
    </div>
  );
}

const PositionRow = React.memo(function PositionRow({ pos }: { pos: Trade }) {
  const isABook = pos.routing_mode === 'a_book';
  const isBBook = pos.routing_mode === 'b_book';
  const pnl = pos.floating_pnl;

  return (
    <div
      className="grid px-2 hover:bg-white/[0.02] transition-colors"
      style={{
        gridTemplateColumns: '36px 52px 18px 36px 56px 52px 16px',
        gap: 4,
        height: 28,
        alignItems: 'center',
      }}
    >
      {/* ID */}
      <span
        className="font-mono truncate"
        style={{ fontSize: 10, color: clr.muted }}
        title={pos.id}
      >
        {pos.id.slice(-5)}
      </span>

      {/* Symbol */}
      <span
        className="font-bold truncate"
        style={{ fontSize: 11, color: clr.text }}
      >
        {pos.symbol}
      </span>

      {/* Direction */}
      <span
        className="font-bold"
        style={{ fontSize: 11, color: dirColor(pos.direction) }}
      >
        {dirChar(pos.direction)}
      </span>

      {/* Lots */}
      <span
        className="font-mono text-right"
        style={{ fontSize: 10, color: clr.text }}
      >
        {pos.filled_size.toFixed(2)}
      </span>

      {/* Open price */}
      <span
        className="font-mono text-right"
        style={{ fontSize: 10, color: clr.text }}
      >
        {pos.fill_price != null ? pos.fill_price.toFixed(pos.fill_price > 100 ? 2 : 5) : '--'}
      </span>

      {/* PnL */}
      <span
        className="font-mono text-right font-semibold"
        style={{ fontSize: 10, color: pnlColor(pnl) }}
      >
        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
      </span>

      {/* Book dot */}
      <div className="flex justify-center">
        <span
          className="inline-block rounded-full"
          style={{
            width: 7,
            height: 7,
            background: isABook ? clr.aBook : isBBook ? clr.bBook : clr.muted,
          }}
        />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------
// Section 3 -- Net Exposure Footer
// ---------------------------------------------------------------

function NetExposureFooter() {
  const exposures = useExposureStore((s) => s.exposures);
  const totalGrossUSD = useExposureStore((s) => s.totalGrossUSD);

  const { bBookEntries, pnlAtRisk } = useMemo(() => {
    const entries = Object.values(exposures) as SymbolExposure[];
    // B-book net exposure: sum of absolute net positions
    const risk = entries.reduce((sum, e) => sum + Math.abs(e.unrealized_pnl), 0);
    return { bBookEntries: entries.slice(0, 6), pnlAtRisk: risk };
  }, [exposures]);

  return (
    <div
      className="flex flex-col shrink-0"
      style={{ height: 80 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-3 shrink-0"
        style={{
          height: 24,
          borderBottom: `1px solid ${clr.border}`,
          color: clr.muted,
          fontSize: 10,
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        <AlertTriangle size={11} />
        B-BOOK NET EXPOSURE
      </div>

      {/* Compact exposure chips */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 px-3 py-1">
        {bBookEntries.map((e) => (
          <span
            key={e.symbol}
            className="font-mono"
            style={{
              fontSize: 9,
              color: e.net_position > 0 ? clr.success : e.net_position < 0 ? clr.danger : clr.muted,
            }}
          >
            {e.symbol}:{e.net_position > 0 ? '+' : ''}{e.net_position.toFixed(1)}
          </span>
        ))}
      </div>

      {/* Totals row */}
      <div
        className="flex items-center justify-between px-3"
        style={{ fontSize: 10 }}
      >
        <div>
          <span style={{ color: clr.muted }}>Gross </span>
          <span className="font-mono font-semibold" style={{ color: clr.text }}>
            ${totalGrossUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div>
          <span style={{ color: clr.muted }}>PnL@Risk </span>
          <span
            className="font-mono font-semibold"
            style={{ color: pnlAtRisk > 0 ? clr.danger : clr.success }}
          >
            ${pnlAtRisk.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Main Export -- OpenBookMonitor (Zone 3)
// ---------------------------------------------------------------

export default function OpenBookMonitor() {
  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        width: 320,
        background: clr.bg,
        borderLeft: `1px solid ${clr.border}`,
        color: clr.text,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <ExposureHeatmap />
      <OpenPositionsTable />
      <NetExposureFooter />
    </div>
  );
}
