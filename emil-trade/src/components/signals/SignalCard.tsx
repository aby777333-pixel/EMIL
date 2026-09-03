'use client';

import { useState } from 'react';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Target,
  ShieldAlert,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { TradingSignal } from '@/lib/trading/signal-engine';
import { cn } from '@/lib/utils/format';

interface SignalCardProps {
  signal: TradingSignal;
  onExecute: (signal: TradingSignal) => void;
}

function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    forex: 'FX',
    metal: 'Metal',
    crypto: 'Crypto',
    index: 'Index',
    energy: 'Energy',
  };
  return map[type] || type;
}

function getTypeColor(type: string): string {
  const map: Record<string, string> = {
    forex: '#0091D5',
    metal: '#FFD700',
    crypto: '#F7931A',
    index: '#8B5CF6',
    energy: '#10B981',
  };
  return map[type] || '#666';
}

export default function SignalCard({ signal, onExecute }: SignalCardProps) {
  const [executing, setExecuting] = useState(false);

  const isBuy = signal.direction === 'BUY';
  const dirColor = isBuy ? '#00C853' : '#FF1744';

  const riskReward =
    signal.direction === 'BUY'
      ? Math.abs(signal.tp - signal.entry) / Math.abs(signal.entry - signal.sl)
      : Math.abs(signal.entry - signal.tp) / Math.abs(signal.sl - signal.entry);

  const confidenceColor =
    signal.confidence >= 70
      ? '#00C853'
      : signal.confidence >= 40
        ? '#FFC107'
        : '#FF1744';

  const handleExecute = () => {
    setExecuting(true);
    onExecute(signal);
    setTimeout(() => setExecuting(false), 1500);
  };

  return (
    <div
      className="rounded-lg border p-3 transition-all hover:border-opacity-60"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header row: Symbol + Type + Timeframe */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm">{signal.symbol}</span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: getTypeColor(signal.type), color: '#000' }}
          >
            {getTypeLabel(signal.type)}
          </span>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.8 }}
          >
            {signal.timeframe}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] opacity-50">
          <Clock size={10} />
          {formatTime(signal.timestamp)}
        </div>
      </div>

      {/* Direction */}
      <div className="flex items-center gap-2 mb-3">
        {isBuy ? (
          <ArrowUpCircle size={20} style={{ color: dirColor }} />
        ) : (
          <ArrowDownCircle size={20} style={{ color: dirColor }} />
        )}
        <span
          className="font-bold text-sm"
          style={{ color: dirColor }}
        >
          {signal.direction}
        </span>
      </div>

      {/* Price levels */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <div className="text-[9px] opacity-40 uppercase mb-0.5 flex items-center gap-1">
            <Target size={9} />
            Entry
          </div>
          <div className="font-mono text-xs font-medium">
            {signal.entry}
          </div>
        </div>
        <div>
          <div className="text-[9px] opacity-40 uppercase mb-0.5 flex items-center gap-1">
            <ShieldAlert size={9} />
            Stop Loss
          </div>
          <div className="font-mono text-xs" style={{ color: '#FF1744' }}>
            {signal.sl}
          </div>
        </div>
        <div>
          <div className="text-[9px] opacity-40 uppercase mb-0.5 flex items-center gap-1">
            <TrendingUp size={9} />
            Take Profit
          </div>
          <div className="font-mono text-xs" style={{ color: '#00C853' }}>
            {signal.tp}
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] opacity-50">Confidence</span>
          <span
            className="text-[10px] font-bold font-mono"
            style={{ color: confidenceColor }}
          >
            {signal.confidence}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${signal.confidence}%`,
              backgroundColor: confidenceColor,
            }}
          />
        </div>
      </div>

      {/* R:R Ratio */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] opacity-50">Risk/Reward</span>
        <span className="text-[10px] font-mono font-medium">
          1:{isFinite(riskReward) ? riskReward.toFixed(1) : '---'}
        </span>
      </div>

      {/* Reasoning */}
      <div
        className="text-[10px] px-2 py-1.5 rounded mb-3 leading-relaxed"
        style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.8 }}
      >
        <Zap size={9} className="inline mr-1 opacity-60" />
        {signal.reasoning}
      </div>

      {/* Execute button */}
      <button
        onClick={handleExecute}
        disabled={executing}
        className={cn(
          'w-full py-1.5 rounded text-[11px] font-bold uppercase transition-all',
          executing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
        )}
        style={{
          backgroundColor: dirColor,
          color: '#000',
        }}
      >
        {executing ? 'Placing Order...' : `Execute ${signal.direction}`}
      </button>
    </div>
  );
}
