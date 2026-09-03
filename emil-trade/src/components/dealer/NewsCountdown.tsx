'use client';

import { useState, useEffect, useRef } from 'react';

// ================================================================
// NewsCountdown -- banner when a news event is imminent
// Shows event name, countdown, impact badge, affected symbols.
// ================================================================

interface NewsEvent {
  name: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  symbols: string[];
  /** seconds from mount time until event */
  offsetSeconds: number;
}

const MOCK_EVENT: NewsEvent = {
  name: 'US CPI Release',
  impact: 'HIGH',
  symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'],
  offsetSeconds: 4 * 60 + 27, // 4m27s
};

const impactColors: Record<string, string> = {
  HIGH: '#E50914',
  MEDIUM: '#FFB300',
  LOW: '#00C853',
};

export default function NewsCountdown() {
  const [dismissed, setDismissed] = useState(false);
  const [remaining, setRemaining] = useState(MOCK_EVENT.offsetSeconds);
  const targetRef = useRef(Date.now() + MOCK_EVENT.offsetSeconds * 1000);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.round((targetRef.current - Date.now()) / 1000));
      setRemaining(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed || remaining <= 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      style={{
        width: '100%',
        height: 48,
        background: '#1A1508',
        borderBottom: '1px solid #F0A500',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        fontSize: 12,
        color: '#FFB300',
        fontFamily: 'monospace',
        flexShrink: 0,
      }}
    >
      {/* Icon + Event Name */}
      <span style={{ fontSize: 16 }}>&#x1F4F0;</span>
      <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{MOCK_EVENT.name}</span>

      {/* Countdown */}
      <span
        style={{
          fontWeight: 700,
          fontSize: 14,
          color: remaining < 60 ? '#E50914' : '#FFB300',
          minWidth: 52,
        }}
      >
        {timeStr}
      </span>

      {/* Impact Badge */}
      <span
        style={{
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          background: `${impactColors[MOCK_EVENT.impact]}18`,
          color: impactColors[MOCK_EVENT.impact],
          border: `1px solid ${impactColors[MOCK_EVENT.impact]}44`,
          letterSpacing: '0.06em',
        }}
      >
        {MOCK_EVENT.impact}
      </span>

      {/* Affected Symbols */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
        {MOCK_EVENT.symbols.map((sym) => (
          <span
            key={sym}
            style={{
              padding: '1px 6px',
              borderRadius: 3,
              fontSize: 10,
              background: '#252015',
              color: '#D4A017',
              border: '1px solid #3A3015',
            }}
          >
            {sym}
          </span>
        ))}
      </div>

      {/* Action Buttons */}
      <button
        onClick={() => {
          console.log('Applying pre-news policy for:', MOCK_EVENT.name);
        }}
        style={{
          padding: '4px 10px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          background: '#F0A50022',
          color: '#FFB300',
          border: '1px solid #F0A50044',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
        }}
      >
        APPLY PRE-NEWS POLICY
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          padding: '4px 10px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          background: 'transparent',
          color: '#888899',
          border: '1px solid #252530',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        DISMISS
      </button>
    </div>
  );
}
