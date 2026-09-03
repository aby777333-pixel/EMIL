'use client';

import { useState, useEffect } from 'react';
import { useTradingStore } from '@/stores/trading';
import { formatCurrency } from '@/lib/utils/format';

/* ─── Session definitions (UTC hours) ─── */

interface Session {
  label: string;
  code: string;
  color: string;
  startUtc: number;
  endUtc: number;
}

const SESSIONS: Session[] = [
  { label: 'Sydney', code: 'SYD', color: '#00C853', startUtc: 22, endUtc: 7 },
  { label: 'Tokyo', code: 'TYO', color: '#FFC107', startUtc: 0, endUtc: 9 },
  { label: 'London', code: 'LON', color: '#0091D5', startUtc: 8, endUtc: 17 },
  { label: 'New York', code: 'NYC', color: '#FF9800', startUtc: 13, endUtc: 22 },
];

function isSessionActive(session: Session, utcHour: number): boolean {
  if (session.startUtc < session.endUtc) {
    return utcHour >= session.startUtc && utcHour < session.endUtc;
  }
  // Wraps midnight (e.g. Sydney 22-07)
  return utcHour >= session.startUtc || utcHour < session.endUtc;
}

function SessionIndicators() {
  const [utcHour, setUtcHour] = useState(() => new Date().getUTCHours());

  useEffect(() => {
    const iv = setInterval(() => setUtcHour(new Date().getUTCHours()), 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {SESSIONS.map((s) => {
        const active = isSessionActive(s, utcHour);
        return (
          <div
            key={s.code}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: active ? `${s.color}15` : 'transparent',
              opacity: active ? 1 : 0.3,
            }}
            title={`${s.label} (${s.startUtc}:00-${s.endUtc}:00 UTC)`}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: s.color, opacity: active ? 1 : 0.3 }}
            />
            <span
              className="text-[10px] font-bold"
              style={{ color: active ? s.color : 'rgba(255,255,255,0.3)' }}
            >
              {s.code}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AccountBar() {
  const { accountSummary } = useTradingStore();

  const {
    balance,
    equity,
    margin_used,
    free_margin,
    margin_level_pct,
    floating_pnl,
  } = accountSummary;

  const pnlColor = floating_pnl >= 0 ? '#00C853' : '#FF5252';
  const pnlSign = floating_pnl >= 0 ? '+' : '';

  return (
    <div
      className="flex items-center justify-between px-3 select-none"
      style={{
        height: 30,
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
      }}
    >
      {/* Left: Session indicators */}
      <SessionIndicators />

      {/* Center: Account stats */}
      <div className="flex items-center gap-4">
        <Item label="Balance" value={formatCurrency(balance)} />
        <Sep />
        <Item label="Equity" value={formatCurrency(equity)} />
        <Sep />
        <Item label="Margin" value={formatCurrency(margin_used)} />
        <Sep />
        <Item label="Free Margin" value={formatCurrency(free_margin)} />
        <Sep />
        <Item
          label="Margin Level"
          value={margin_level_pct > 0 ? `${margin_level_pct.toFixed(2)}%` : '--'}
        />
        <Sep />
        <Item
          label="Net P&L"
          value={`${pnlSign}${formatCurrency(floating_pnl)}`}
          valueColor={pnlColor}
        />
      </div>

      {/* Right: Currency label */}
      <div className="flex items-center gap-1 opacity-40 text-[11px]">
        <span>USD</span>
      </div>
    </div>
  );
}

function Item({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: '#0091D5', opacity: 0.85, fontSize: 12 }}>{label}:</span>
      <span
        className="font-mono font-medium"
        style={{ color: valueColor ?? 'var(--text-primary)', fontSize: 13 }}
      >
        {value}
      </span>
    </div>
  );
}

function Sep() {
  return (
    <span style={{ opacity: 0.15, color: '#fff' }}>|</span>
  );
}
