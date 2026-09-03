'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Shield, Zap, AlertTriangle, Activity } from 'lucide-react';
import Logo from '@/components/Logo';
import { useDealingDeskStore, useAlertStore } from '@/stores/dealer';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ENVIRONMENT: 'LIVE' | 'DEMO' = (process.env.NEXT_PUBLIC_ENV === 'demo' ? 'DEMO' : 'LIVE');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function padMs(n: number): string {
  if (n < 10) return '00' + n;
  if (n < 100) return '0' + n;
  return '' + n;
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

function formatUTC(d: Date): string {
  return (
    pad2(d.getUTCHours()) +
    ':' +
    pad2(d.getUTCMinutes()) +
    ':' +
    pad2(d.getUTCSeconds()) +
    '.' +
    padMs(d.getUTCMilliseconds())
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Vertical separator bar */
function Sep() {
  return <div className="mx-3 h-6 w-px" style={{ backgroundColor: '#252530' }} />;
}

/** Environment badge */
function EnvBadge({ env }: { env: 'LIVE' | 'DEMO' }) {
  const isLive = env === 'LIVE';
  const dotColor = isLive ? '#E50914' : '#2979FF';
  return (
    <div
      className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold tracking-wider select-none ${isLive ? 'pulse-cyan' : ''}`}
      style={{
        backgroundColor: '#1A1A22',
        border: '1px solid #252530',
        color: isLive ? '#E50914' : '#2979FF',
      }}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${isLive ? 'status-dot-live' : ''}`}
        style={{
          backgroundColor: dotColor,
          boxShadow: `0 0 6px ${dotColor}`,
        }}
      />
      {env}
    </div>
  );
}

/** Server clock ticking at 100 ms */
function ServerClock() {
  const [time, setTime] = useState(() => formatUTC(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatUTC(new Date())), 100);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="text-[13px] tabular-nums tracking-wide select-none"
      style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F2F2F2' }}
    >
      {time}
      <span className="ml-1 text-[10px]" style={{ color: '#888899' }}>
        UTC
      </span>
    </span>
  );
}

/** Global exposure cluster */
function ExposureCluster() {
  // Placeholder data -- replace with real store/hook when wired
  const net = '+$2.4M';
  const risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  const margin = '34%';

  const riskColorMap: Record<string, string> = {
    LOW: '#00C853',
    MEDIUM: '#FFB300',
    HIGH: '#E50914',
  };

  return (
    <div className="flex items-center gap-3 text-[12px] select-none">
      {/* Net exposure */}
      <div className="flex items-center gap-1">
        <Activity size={13} style={{ color: '#888899' }} />
        <span style={{ color: '#888899' }}>Net:</span>
        <span className="font-semibold" style={{ color: '#00C853', fontFamily: "'JetBrains Mono', monospace" }}>
          {net}
        </span>
      </div>

      {/* Risk badge */}
      <div className="flex items-center gap-1">
        <Shield size={13} style={{ color: '#888899' }} />
        <span style={{ color: '#888899' }}>Risk:</span>
        <span
          className="rounded px-1.5 py-px text-[10px] font-bold tracking-wide"
          style={{
            backgroundColor: riskColorMap[risk] + '18',
            color: riskColorMap[risk],
            border: `1px solid ${riskColorMap[risk]}44`,
          }}
        >
          {risk}
        </span>
      </div>

      {/* Margin */}
      <div className="flex items-center gap-1">
        <span style={{ color: '#888899' }}>Margin:</span>
        <span className="font-semibold" style={{ color: '#F2F2F2', fontFamily: "'JetBrains Mono', monospace" }}>
          {margin}
        </span>
      </div>
    </div>
  );
}

/** Alert bell with unread badge */
function AlertBell() {
  const unreadCount = useAlertStore((s) => s.unreadCount);

  return (
    <button
      className="relative flex items-center justify-center rounded p-1.5 transition-colors hover:bg-white/5"
      style={unreadCount > 0 ? {
        animation: 'pulse-backlight-orange 2s ease-in-out infinite',
        boxShadow: '0 0 10px #FF6D0040',
        backgroundColor: '#FF6D0012',
        borderRadius: 6,
      } : undefined}
      aria-label="Alerts"
    >
      <Bell size={18} className={unreadCount > 0 ? 'blink-danger' : ''} style={{ color: unreadCount > 0 ? '#FFB300' : '#888899' }} />
      {unreadCount > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
          style={{ backgroundColor: '#E50914', color: '#F2F2F2' }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

/** Expert mode toggle */
function ExpertToggle() {
  const expertMode = useDealingDeskStore((s) => s.expertMode);
  const toggle = useDealingDeskStore((s) => s.toggleExpertMode);

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-all select-none"
      style={
        expertMode
          ? {
              backgroundColor: '#FFB30018',
              border: '1px solid #FFB30055',
              color: '#FFB300',
              boxShadow: '0 0 12px #FFB30040, inset 0 0 12px #FFB30015',
              animation: 'pulse-backlight-amber 2s ease-in-out infinite',
            }
          : {
              backgroundColor: '#1A1A22',
              border: '1px solid #252530',
              color: '#3A3A4A',
            }
      }
      aria-label="Toggle expert mode"
    >
      <Zap size={13} />
      EXPERT
    </button>
  );
}

// ---------------------------------------------------------------------------
// Flatten Confirm Modal
// ---------------------------------------------------------------------------

function FlattenModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const phrase = 'FLATTEN ALL';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleConfirm = useCallback(() => {
    if (typed === phrase) onConfirm();
  }, [typed, onConfirm]);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onCancel}
    >
      {/* Modal card */}
      <div
        className="w-full max-w-md rounded-lg p-6"
        style={{ backgroundColor: '#111116', border: '1px solid #E5091466' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={22} style={{ color: '#E50914' }} />
          <h2 className="text-lg font-bold" style={{ color: '#E50914' }}>
            Emergency Flatten All Positions
          </h2>
        </div>

        <p className="mb-1 text-sm" style={{ color: '#F2F2F2' }}>
          This will immediately close ALL open positions at market.
        </p>
        <p className="mb-5 text-sm" style={{ color: '#888899' }}>
          Type <span className="font-mono font-bold" style={{ color: '#E50914' }}>{phrase}</span> to confirm.
        </p>

        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value.toUpperCase())}
          placeholder={phrase}
          className="mb-4 w-full rounded px-3 py-2 text-sm font-mono tracking-wider outline-none placeholder:text-[#3A3A4A]"
          style={{
            backgroundColor: '#0B0B0D',
            border: '1px solid #252530',
            color: '#F2F2F2',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') onCancel();
          }}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded px-4 py-1.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: '#1A1A22', border: '1px solid #252530', color: '#888899' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={typed !== phrase}
            className="rounded px-4 py-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              backgroundColor: typed === phrase ? '#E50914' : '#E5091433',
              color: '#F2F2F2',
            }}
          >
            FLATTEN ALL
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DealerTopBar
// ---------------------------------------------------------------------------

export default function DealerTopBar() {
  const [showFlattenModal, setShowFlattenModal] = useState(false);

  // TODO: wire to real dealer session / auth
  const dealerName = 'D. Operator';

  const handleFlatten = useCallback(() => {
    // TODO: call flatten-all API / action
    setShowFlattenModal(false);
  }, []);

  return (
    <>
      <header
        className="flex w-full items-center px-4"
        style={{
          height: 56,
          minHeight: 56,
          maxHeight: 56,
          backgroundColor: '#0B0B0D',
          borderBottom: '1px solid #252530',
        }}
      >
        {/* ---- Left cluster ---- */}
        <div className="flex items-center">
          {/* 1. Logo */}
          <Logo height={28} theme="dark" />

          <Sep />

          {/* 2. Environment badge */}
          <EnvBadge env={ENVIRONMENT} />

          <Sep />

          {/* 3. Server clock */}
          <ServerClock />
        </div>

        <Sep />

        {/* ---- Center cluster ---- */}
        <div className="flex items-center">
          {/* 5. Global exposure */}
          <ExposureCluster />
        </div>

        {/* ---- Spacer ---- */}
        <div className="flex-1" />

        {/* ---- Right cluster ---- */}
        <div className="flex items-center">
          {/* 7. Alert bell */}
          <AlertBell />

          <Sep />

          {/* 9. Dealer name */}
          <span className="text-[12px] font-medium select-none" style={{ color: '#888899' }}>
            {dealerName}
          </span>

          <Sep />

          {/* 10. Expert mode toggle */}
          <ExpertToggle />

          <Sep />

          {/* 11. Emergency flatten */}
          <button
            onClick={() => setShowFlattenModal(true)}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-bold tracking-wider transition-all select-none hover:brightness-125"
            style={{
              backgroundColor: '#E50914',
              color: '#F2F2F2',
              boxShadow: '0 0 14px #E5091466, inset 0 0 8px #E5091420',
              animation: 'pulse-backlight-red 1.8s ease-in-out infinite',
            }}
          >
            <AlertTriangle size={14} />
            FLATTEN
          </button>
        </div>
      </header>

      {/* Flatten confirmation modal */}
      {showFlattenModal && (
        <FlattenModal
          onConfirm={handleFlatten}
          onCancel={() => setShowFlattenModal(false)}
        />
      )}

      {/* Backlight keyframes for tabs */}
      <style jsx global>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes pulse-backlight-red {
          0%, 100% { box-shadow: 0 0 8px #E5091444, inset 0 0 6px #E5091415; }
          50% { box-shadow: 0 0 22px #E5091488, inset 0 0 14px #E5091430; }
        }
        @keyframes pulse-backlight-amber {
          0%, 100% { box-shadow: 0 0 8px #FFB30030, inset 0 0 6px #FFB30010; }
          50% { box-shadow: 0 0 20px #FFB30066, inset 0 0 12px #FFB30025; }
        }
        @keyframes pulse-backlight-orange {
          0%, 100% { box-shadow: 0 0 6px #FF6D0030; background-color: #FF6D0008; }
          50% { box-shadow: 0 0 16px #FF6D0060; background-color: #FF6D0018; }
        }
        @keyframes pulse-backlight-cyan {
          0%, 100% { box-shadow: 0 0 8px #00B4D830, inset 0 0 6px #00B4D810; }
          50% { box-shadow: 0 0 22px #00B4D866, inset 0 0 14px #00B4D825; }
        }
        @keyframes pulse-backlight-green {
          0%, 100% { box-shadow: 0 0 6px #00C85330; background-color: #00C85308; }
          50% { box-shadow: 0 0 18px #00C85360; background-color: #00C85315; }
        }
        @keyframes pulse-backlight-purple {
          0%, 100% { box-shadow: 0 0 6px #8b5cf630; background-color: #8b5cf608; }
          50% { box-shadow: 0 0 18px #8b5cf660; background-color: #8b5cf615; }
        }
      `}</style>
    </>
  );
}
