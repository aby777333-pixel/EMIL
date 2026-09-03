'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PatternSeverity = 'warning' | 'info';
type PatternAction = 'a_book' | 'flag' | 'block' | 'monitor' | 'escalate';

interface DetectedPattern {
  id: string;
  clientId: string;
  severity: PatternSeverity;
  label: string;
  details: string[];
  actions: PatternAction[];
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_PATTERNS: DetectedPattern[] = [
  {
    id: 'PAT-001',
    clientId: 'CLT-3015',
    severity: 'warning',
    label: 'Latency arbitrage',
    details: ['12 scalps < 30s, 92% win rate'],
    actions: ['a_book', 'flag', 'block'],
  },
  {
    id: 'PAT-002',
    clientId: 'CLT-3088',
    severity: 'warning',
    label: 'News front-running',
    details: ['3 trades within 5s of CPI release'],
    actions: ['a_book', 'flag', 'block'],
  },
  {
    id: 'PAT-003',
    clientId: 'CLT-3001',
    severity: 'info',
    label: 'Behavior change',
    details: [
      'Volume increased 340% this week',
      'Previously conservative, now aggressive',
    ],
    actions: ['monitor', 'escalate'],
  },
];

// ---------------------------------------------------------------------------
// Action Button
// ---------------------------------------------------------------------------

const ACTION_STYLES: Record<PatternAction, { label: string; color: string }> = {
  a_book: { label: 'A-BOOK', color: '#2979FF' },
  flag: { label: 'FLAG', color: '#FFB300' },
  block: { label: 'BLOCK', color: '#E50914' },
  monitor: { label: 'MONITOR', color: '#00BCD4' },
  escalate: { label: 'ESCALATE', color: '#FF6D00' },
};

function ActionButton({
  action,
  onClick,
}: {
  action: PatternAction;
  onClick: () => void;
}) {
  const style = ACTION_STYLES[action];
  return (
    <button
      onClick={onClick}
      className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider transition-all hover:brightness-125"
      style={{
        background: style.color + '18',
        border: `1px solid ${style.color}44`,
        color: style.color,
      }}
    >
      {style.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pattern Card
// ---------------------------------------------------------------------------

function PatternCard({ pattern }: { pattern: DetectedPattern }) {
  const isWarning = pattern.severity === 'warning';
  const icon = isWarning ? (
    <AlertTriangle size={12} style={{ color: '#FFB300' }} />
  ) : (
    <CheckCircle size={12} style={{ color: '#00C853' }} />
  );

  const handleAction = useCallback(
    (action: PatternAction) => {
      console.log(`[ToxicFlow] ${action.toUpperCase()} applied to ${pattern.clientId}`);
    },
    [pattern.clientId]
  );

  return (
    <div
      className="rounded p-2.5 mb-2"
      style={{ background: '#0B0B0D', border: '1px solid #252530' }}
    >
      <div className="flex items-start gap-1.5 mb-1.5">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-semibold" style={{ color: '#00BCD4' }}>
              {pattern.clientId}
            </span>
            <span className="text-[9px]" style={{ color: '#888899' }}>
              ---
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: isWarning ? '#FFB300' : '#00C853' }}
            >
              {pattern.label}
            </span>
          </div>
          {pattern.details.map((detail, i) => (
            <div
              key={i}
              className="text-[10px] mt-0.5"
              style={{ color: '#888899' }}
            >
              {detail}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[9px] mr-1" style={{ color: '#555566' }}>
          Action:
        </span>
        {pattern.actions.map((action) => (
          <ActionButton
            key={action}
            action={action}
            onClick={() => handleAction(action)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ToxicFlowMonitor() {
  const [scanTime, setScanTime] = useState(() => new Date());
  const [nextScanIn, setNextScanIn] = useState(30);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNextScanIn((prev) => {
        if (prev <= 1) {
          setScanTime(new Date());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: Date) =>
    d.toISOString().slice(11, 19) + ' UTC';

  const nextScanTime = new Date(scanTime.getTime() + 30000);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: 280,
        background: '#111116',
        borderRight: '1px solid #252530',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid #252530' }}
      >
        <Shield size={14} style={{ color: '#E50914' }} />
        <span
          className="text-[11px] font-bold tracking-widest uppercase"
          style={{ color: '#F2F2F2' }}
        >
          Toxic Flow Monitor
        </span>
      </div>

      {/* Scanning status */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="text-[11px] font-semibold" style={{ color: '#00C853' }}>
          SCANNING LIVE
        </span>
      </div>

      {/* Detected Patterns */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
        <div className="mb-2">
          <span
            className="text-[9px] font-bold tracking-widest uppercase"
            style={{ color: '#888899' }}
          >
            Detected Patterns:
          </span>
        </div>

        {MOCK_PATTERNS.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
      </div>

      {/* Scan Summary */}
      <div
        className="flex-shrink-0 px-3 py-2.5"
        style={{ borderTop: '1px solid #252530', background: '#0B0B0D' }}
      >
        <div className="mb-1.5">
          <span
            className="text-[9px] font-bold tracking-widest uppercase"
            style={{ color: '#888899' }}
          >
            Scan Summary:
          </span>
        </div>
        <div className="space-y-1 text-[10px] font-mono">
          <div className="flex justify-between">
            <span style={{ color: '#888899' }}>Active clients:</span>
            <span style={{ color: '#F2F2F2' }}>127</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#888899' }}>Flagged:</span>
            <span style={{ color: '#FFB300' }}>3 (2.4%)</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#888899' }}>Last scan:</span>
            <span style={{ color: '#F2F2F2' }}>{formatTime(scanTime)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#888899' }}>Next scan:</span>
            <span style={{ color: '#F2F2F2' }}>
              {formatTime(nextScanTime)}{' '}
              <span style={{ color: '#555566' }}>({nextScanIn}s)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
