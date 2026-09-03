'use client';

import { useMemo, useRef, useCallback } from 'react';
import { useDealingDeskStore } from '@/stores/dealer';
import type { DealerAction, DealerActionType } from '@/lib/dealer/types';

// ---------------------------------------------------------------------------
// Zone 4 -- Dealer Blotter (bottom strip, 80px, collapsible)
// ---------------------------------------------------------------------------

/** Compute human-readable elapsed time from an ISO timestamp to now. */
function formatDuration(isoStart: string): string {
  const ms = Date.now() - new Date(isoStart).getTime();
  if (ms < 0) return '0m';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Map action types to result icons. */
function actionIcon(action: DealerActionType): string {
  switch (action) {
    case 'reject_order':
    case 'force_close':
    case 'mass_cancel':
    case 'suspend_account':
      return '\u274C'; // red X
    case 'requote':
    case 'partial_fill':
    case 'spread_override':
    case 'override_routing':
      return '\uD83D\uDD01'; // 🔁
    default:
      return '\u2705'; // green check
  }
}

/** Shorten a UUID-style id to first 6 chars. */
function shortId(id: string): string {
  return id.length > 6 ? id.slice(0, 6) : id;
}

/** Colour for action pill border based on type. */
function actionBorderColor(action: DealerActionType): string {
  switch (action) {
    case 'reject_order':
    case 'force_close':
    case 'mass_cancel':
    case 'suspend_account':
      return '#E50914';
    case 'requote':
    case 'partial_fill':
    case 'spread_override':
    case 'override_routing':
      return '#FFB300';
    default:
      return '#00C853';
  }
}

// -- Stat Pill ---------------------------------------------------------------

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: '#111116' }}>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#888899' }}>
        {label}
      </span>
      <span className="font-mono text-xs font-medium" style={{ color: color ?? '#F2F2F2' }}>
        {value}
      </span>
    </div>
  );
}

// -- Action Card -------------------------------------------------------------

function ActionCard({ action }: { action: DealerAction }) {
  const border = actionBorderColor(action.action);
  const symbol = (action.details?.symbol as string) ?? action.target_id;

  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border"
      style={{ borderColor: border, background: '#111116' }}
    >
      <span className="font-mono text-[11px]" style={{ color: '#888899' }}>
        {shortId(action.target_id)}
      </span>
      <span className="text-[11px] font-semibold" style={{ color: '#F2F2F2' }}>
        {symbol}
      </span>
      <span className="text-[10px] uppercase" style={{ color: border }}>
        {action.action.replace(/_/g, ' ')}
      </span>
      <span className="text-sm leading-none">{actionIcon(action.action)}</span>
    </div>
  );
}

// -- Main Component ----------------------------------------------------------

export default function DealerBlotter() {
  const blotterVisible = useDealingDeskStore((s) => s.blotterVisible);
  const toggleBlotter = useDealingDeskStore((s) => s.toggleBlotter);
  const sessionStats = useDealingDeskStore((s) => s.sessionStats);
  const recentActions = useDealingDeskStore((s) => s.recentActions);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Compute session duration live-ish (re-renders via parent will refresh)
  const duration = useMemo(() => formatDuration(sessionStats.session_start), [sessionStats.session_start]);

  const last10 = useMemo(() => recentActions.slice(0, 10), [recentActions]);

  const pnlColor = sessionStats.total_pnl >= 0 ? '#00C853' : '#E50914';
  const pnlDisplay = sessionStats.total_pnl >= 0
    ? `+$${sessionStats.total_pnl.toLocaleString()}`
    : `-$${Math.abs(sessionStats.total_pnl).toLocaleString()}`;

  // Mouse-wheel horizontal scroll for the actions scroller
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  // -- Collapsed toggle bar --------------------------------------------------
  if (!blotterVisible) {
    return (
      <button
        type="button"
        onClick={toggleBlotter}
        className="w-full h-6 flex items-center justify-center gap-2 border-t cursor-pointer transition-colors hover:brightness-125"
        style={{ background: '#0B0B0D', borderColor: '#252530' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="rotate-180">
          <path d="M2 8L6 4L10 8" stroke="#888899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: '#888899' }}>
          Blotter
        </span>
      </button>
    );
  }

  // -- Expanded blotter ------------------------------------------------------
  return (
    <div
      className="w-full border-t flex flex-col"
      style={{ height: 80, background: '#0B0B0D', borderColor: '#252530' }}
    >
      {/* Collapse handle */}
      <button
        type="button"
        onClick={toggleBlotter}
        className="w-full h-5 flex items-center justify-center gap-1 cursor-pointer transition-colors hover:brightness-125 flex-shrink-0"
        style={{ background: '#111116' }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="#888899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[9px] uppercase tracking-widest" style={{ color: '#888899' }}>
          Blotter
        </span>
      </button>

      {/* Content row */}
      <div className="flex-1 flex items-center min-h-0 px-3 gap-4">
        {/* Left: Session Stats */}
        <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto no-scrollbar">
          <StatPill label="Session" value={duration} />
          <StatPill label="Processed" value={sessionStats.trades_processed} />
          <StatPill label="Accepted" value={sessionStats.trades_approved} color="#00C853" />
          <StatPill label="Rejected" value={sessionStats.trades_rejected} color="#E50914" />
          <StatPill label="Requoted" value={sessionStats.trades_requoted} color="#FFB300" />
          <StatPill label="A-Book" value={sessionStats.a_book_count} />
          <StatPill label="B-Book" value={sessionStats.b_book_count} />
          <StatPill label="Avg Resp" value={`${sessionStats.avg_processing_ms}ms`} />
          <StatPill label="B-PnL" value={pnlDisplay} color={pnlColor} />
        </div>

        {/* Divider */}
        <div className="w-px self-stretch my-1" style={{ background: '#252530' }} />

        {/* Right: Recent Actions Scroller */}
        <div
          ref={scrollRef}
          onWheel={onWheel}
          className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0 no-scrollbar"
        >
          {last10.length === 0 && (
            <span className="text-[11px] italic" style={{ color: '#888899' }}>
              No recent actions
            </span>
          )}
          {last10.map((a) => (
            <ActionCard key={a.id} action={a} />
          ))}
        </div>
      </div>
    </div>
  );
}
