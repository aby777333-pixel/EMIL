'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import DashboardCard from './DashboardCard';

export interface OpenPosition {
  id: string;
  account_id: string;
  symbol: string;
  direction: 'buy' | 'sell' | 'BUY' | 'SELL';
  size: number;
  open_price: number;
  current_price: number | null;
  floating_pnl: number | null;
}

/**
 * Live open-positions strip. Subscribes to a Supabase Realtime channel
 * keyed on the user's account ids and merges INSERT / UPDATE events
 * into the in-memory list. Updates are throttled to 4Hz max so the
 * cell layout doesn't thrash on every tick.
 *
 * If the realtime subscription errors (offline, RLS denied, etc.) we
 * fall back to the server-rendered snapshot and surface a Reconnecting
 * indicator.
 */
export default function OpenPositionsStrip({
  initialPositions,
  accountIds,
}: {
  initialPositions: OpenPosition[];
  accountIds: string[];
}) {
  const [positions, setPositions] = useState<OpenPosition[]>(initialPositions);
  const [live, setLive] = useState(false);
  const pendingRef = useRef<Map<string, OpenPosition>>(new Map());
  const flushTimer = useRef<number | null>(null);

  useEffect(() => {
    if (accountIds.length === 0) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`positions:${accountIds.join(',')}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'positions', filter: `account_id=in.(${accountIds.join(',')})` },
        (payload) => {
          const row = (payload.new ?? payload.old) as OpenPosition | undefined;
          if (!row) return;

          // Buffer writes; flush at 4Hz.
          pendingRef.current.set(row.id, row);
          if (flushTimer.current == null) {
            flushTimer.current = window.setTimeout(() => {
              flushTimer.current = null;
              setPositions((prev) => mergePositions(prev, pendingRef.current));
              pendingRef.current.clear();
            }, 250);
          }
        },
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
      });

    return () => {
      if (flushTimer.current != null) {
        window.clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [accountIds]);

  const open = positions.filter((p) => p.floating_pnl !== null || p.current_price !== null);
  const total = open.length;

  return (
    <DashboardCard
      title={`Open positions (${total})`}
      trailing={
        <span
          className="inline-flex items-center gap-1.5 text-[11px]"
          style={{ color: live ? 'var(--g-pnl-positive)' : 'var(--g-text-muted)' }}
        >
          <span
            aria-hidden
            style={{
              width: 7, height: 7, borderRadius: 7,
              background: live ? 'var(--g-pnl-positive)' : 'var(--g-text-muted)',
              opacity: live ? 1 : 0.5,
              animation: live ? 'g-blink 1.4s ease-in-out infinite' : undefined,
            }}
          />
          {live ? 'Live' : 'Reconnecting'}
        </span>
      }
      padding="none"
    >
      <style>{`@keyframes g-blink { 50% { opacity: 0.35; } }`}</style>

      {open.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            No open positions
          </div>
          <Link
            href="https://zippy-piroshki-21aa30.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-[12px]"
            style={{ color: 'var(--g-accent)' }}
          >
            Open the trading terminal →
          </Link>
        </div>
      ) : (
        <ul className="list-none m-0 p-0">
          {open.map((p) => (
            <PositionRow key={p.id} position={p} />
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

function PositionRow({ position }: { position: OpenPosition }) {
  const dir = String(position.direction).toUpperCase();
  const isBuy = dir === 'BUY';
  const pnl = position.floating_pnl ?? 0;
  const positive = pnl >= 0;

  return (
    <li
      className="flex items-center gap-3 px-5 py-3 border-t"
      style={{ borderColor: 'var(--g-border-hair)' }}
    >
      <span
        className="num text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={{
          background: isBuy ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: isBuy ? 'var(--g-buy)' : 'var(--g-sell)',
          minWidth: 36,
          textAlign: 'center',
        }}
      >
        {dir}
      </span>
      <span className="num text-[13px] font-medium" style={{ color: 'var(--g-text-primary)', minWidth: 80 }}>
        {position.symbol}
      </span>
      <span className="num text-[12px]" style={{ color: 'var(--g-text-secondary)', minWidth: 60 }}>
        {position.size.toFixed(2)}
      </span>
      <span className="num text-[12px]" style={{ color: 'var(--g-text-muted)' }}>
        {position.open_price.toFixed(5)} →{' '}
        <span style={{ color: 'var(--g-text-secondary)' }}>
          {position.current_price?.toFixed(5) ?? '—'}
        </span>
      </span>
      <span
        className="num text-[13px] font-medium ml-auto"
        style={{ color: positive ? 'var(--g-pnl-positive)' : 'var(--g-pnl-negative)' }}
      >
        {(positive ? '+' : '') + pnl.toFixed(2)}
      </span>
    </li>
  );
}

function mergePositions(prev: OpenPosition[], pending: Map<string, OpenPosition>): OpenPosition[] {
  const next = new Map(prev.map((p) => [p.id, p]));
  for (const [id, row] of pending) {
    next.set(id, row);
  }
  return Array.from(next.values());
}
