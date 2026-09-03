'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Shield,
  TrendingUp,
  RefreshCw,
  Settings,
  X,
} from 'lucide-react';
import { useExposureStore } from '@/stores/dealer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HedgingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BookRow {
  symbol: string;
  bBook: number;
  aBook: number;
  netHedge: number;
}

interface HedgeResult {
  symbol: string;
  direction: string;
  volume: number;
  price: number;
  lp: string;
  latencyMs: number;
  timestamp: string;
}

interface AutoHedgeRule {
  id: string;
  label: string;
  enabled: boolean;
  threshold?: number;
}

const LP_OPTIONS = ['LMAX', 'Currenex', 'PrimeXM', 'B2C2'];
const EXEC_TYPES = ['Market', 'Limit'] as const;

// ---------------------------------------------------------------------------
// Mock A-book offsets per symbol
// ---------------------------------------------------------------------------

const A_BOOK_OFFSETS: Record<string, number> = {
  EURUSD: -2.0,
  XAUUSD: 1.2,
  BTCUSD: -0.5,
  GBPJPY: 1.0,
  USDJPY: -0.8,
  GBPUSD: -0.5,
};

// Mock prices for hedge fill simulation
const MOCK_PRICES: Record<string, number> = {
  EURUSD: 1.08445,
  XAUUSD: 2342.50,
  BTCUSD: 67475.0,
  GBPJPY: 196.42,
  USDJPY: 154.82,
  GBPUSD: 1.27135,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span
        className="text-[11px] font-bold tracking-widest uppercase"
        style={{ color: '#888899' }}
      >
        {title}
      </span>
      <div className="flex-1 h-px" style={{ background: '#252530' }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hedge Row
// ---------------------------------------------------------------------------

function HedgeRow({
  row,
  onHedge,
  hedging,
  result,
}: {
  row: BookRow;
  onHedge: (symbol: string, volume: number, lp: string, execType: string) => void;
  hedging: string | null;
  result: HedgeResult | null;
}) {
  const [volume, setVolume] = useState(Math.abs(row.netHedge));
  const [lp, setLp] = useState(LP_OPTIONS[0]);
  const [execType, setExecType] = useState<string>(EXEC_TYPES[0]);

  // Update volume when net hedge changes
  useEffect(() => {
    setVolume(Math.abs(row.netHedge));
  }, [row.netHedge]);

  const isHedging = hedging === row.symbol;
  const isHedged = result?.symbol === row.symbol;
  const direction = row.netHedge > 0 ? 'SELL' : 'BUY';
  const dirColor = row.netHedge > 0 ? '#E50914' : '#00C853';

  return (
    <div
      className="grid items-center gap-2 py-1.5 px-2 rounded text-[11px] font-mono"
      style={{
        gridTemplateColumns: '80px 80px 80px 100px 60px 100px 80px 1fr',
        background: isHedged ? '#00C85308' : 'transparent',
      }}
    >
      {/* Symbol */}
      <span className="font-semibold" style={{ color: '#F2F2F2' }}>
        {row.symbol}
      </span>

      {/* B-Book */}
      <span style={{ color: row.bBook >= 0 ? '#00C853' : '#E50914' }}>
        {row.bBook >= 0 ? '+' : ''}
        {row.bBook.toFixed(1)}L
      </span>

      {/* A-Book */}
      <span style={{ color: row.aBook >= 0 ? '#00C853' : '#E50914' }}>
        {row.aBook >= 0 ? '+' : ''}
        {row.aBook.toFixed(1)}L
      </span>

      {/* Net Hedge */}
      <span
        className="font-semibold"
        style={{ color: Math.abs(row.netHedge) < 0.1 ? '#00C853' : '#FFB300' }}
      >
        {row.netHedge >= 0 ? '+' : ''}
        {row.netHedge.toFixed(1)}L{' '}
        {Math.abs(row.netHedge) >= 0.1 && (
          <span className="text-[9px]" style={{ color: '#888899' }}>
            unhedged
          </span>
        )}
      </span>

      {/* Volume input */}
      <input
        type="number"
        step="0.1"
        min="0.1"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value) || 0)}
        className="w-full rounded px-1.5 py-0.5 text-[11px] font-mono outline-none"
        style={{
          background: '#0B0B0D',
          border: '1px solid #252530',
          color: '#F2F2F2',
        }}
      />

      {/* LP selector */}
      <select
        value={lp}
        onChange={(e) => setLp(e.target.value)}
        className="rounded px-1 py-0.5 text-[10px] outline-none cursor-pointer"
        style={{
          background: '#0B0B0D',
          border: '1px solid #252530',
          color: '#F2F2F2',
        }}
      >
        {LP_OPTIONS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      {/* Execution type */}
      <select
        value={execType}
        onChange={(e) => setExecType(e.target.value)}
        className="rounded px-1 py-0.5 text-[10px] outline-none cursor-pointer"
        style={{
          background: '#0B0B0D',
          border: '1px solid #252530',
          color: '#F2F2F2',
        }}
      >
        {EXEC_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Hedge button / status */}
      <div className="flex items-center gap-2">
        {isHedging ? (
          <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#FFB300' }}>
            <RefreshCw size={12} className="animate-spin" />
            Routing to LP...
          </span>
        ) : isHedged ? (
          <span className="text-[10px] truncate" style={{ color: '#00C853' }}>
            HEDGED: {result.symbol} {result.direction} {result.volume.toFixed(1)}L @{' '}
            {result.price} via {result.lp} | {result.latencyMs}ms
          </span>
        ) : (
          <button
            onClick={() => onHedge(row.symbol, volume, lp, execType)}
            className="flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-bold tracking-wider transition-all hover:brightness-125"
            style={{
              background: dirColor + '20',
              border: `1px solid ${dirColor}55`,
              color: dirColor,
            }}
          >
            <Shield size={11} />
            HEDGE {direction}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auto-Hedge Rule Toggle
// ---------------------------------------------------------------------------

function AutoHedgeRuleToggle({
  rule,
  onToggle,
  onThresholdChange,
}: {
  rule: AutoHedgeRule;
  onToggle: (id: string) => void;
  onThresholdChange?: (id: string, val: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {/* Toggle switch */}
      <button
        onClick={() => onToggle(rule.id)}
        className="relative flex-shrink-0 rounded-full transition-colors"
        style={{
          width: 32,
          height: 16,
          background: rule.enabled ? '#00C853' : '#252530',
        }}
      >
        <span
          className="absolute top-0.5 rounded-full transition-transform"
          style={{
            width: 12,
            height: 12,
            background: '#F2F2F2',
            left: rule.enabled ? 18 : 2,
          }}
        />
      </button>

      {/* Label */}
      <span
        className="text-[11px] flex-1"
        style={{ color: rule.enabled ? '#F2F2F2' : '#888899' }}
      >
        {rule.label}
      </span>

      {/* Threshold input if applicable */}
      {rule.threshold !== undefined && onThresholdChange && (
        <div className="flex items-center gap-1">
          <span className="text-[10px]" style={{ color: '#888899' }}>
            $
          </span>
          <input
            type="number"
            value={rule.threshold}
            onChange={(e) =>
              onThresholdChange(rule.id, parseFloat(e.target.value) || 0)
            }
            className="w-20 rounded px-1.5 py-0.5 text-[11px] font-mono outline-none"
            style={{
              background: '#0B0B0D',
              border: '1px solid #252530',
              color: '#F2F2F2',
            }}
          />
        </div>
      )}

      {/* Active badge */}
      {rule.enabled && (
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
          style={{ background: '#00C85318', color: '#00C853', border: '1px solid #00C85344' }}
        >
          ACTIVE
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main HedgingPanel Component
// ---------------------------------------------------------------------------

export default function HedgingPanel({ isOpen, onClose }: HedgingPanelProps) {
  const exposures = useExposureStore((s) => s.exposures);

  // Hedge state
  const [hedgingSymbol, setHedgingSymbol] = useState<string | null>(null);
  const [hedgeResults, setHedgeResults] = useState<Record<string, HedgeResult>>({});
  const [hedgedOffsets, setHedgedOffsets] = useState<Record<string, number>>({});
  const [auditLog, setAuditLog] = useState<string[]>([]);

  // Auto-hedge rules
  const [autoRules, setAutoRules] = useState<AutoHedgeRule[]>([
    {
      id: 'threshold',
      label: 'Auto-hedge when unhedged exposure >',
      enabled: false,
      threshold: 500000,
    },
    {
      id: 'toxic',
      label: 'Auto-hedge toxic client trades immediately',
      enabled: true,
    },
    {
      id: 'news',
      label: 'Hedge all positions during news events',
      enabled: false,
    },
  ]);

  // Build book rows from exposure data
  const bookRows: BookRow[] = Object.values(exposures)
    .filter((e) => A_BOOK_OFFSETS[e.symbol] !== undefined)
    .map((e) => {
      const aBook = A_BOOK_OFFSETS[e.symbol] ?? 0;
      const offset = hedgedOffsets[e.symbol] ?? 0;
      const bBook = e.net_position;
      const netHedge = bBook + aBook + offset;
      return {
        symbol: e.symbol,
        bBook,
        aBook,
        netHedge: +netHedge.toFixed(1),
      };
    });

  const totalUnhedged = bookRows.reduce(
    (sum, r) => sum + Math.abs(r.netHedge) * 100000,
    0
  );

  // Hedge action handler
  const handleHedge = useCallback(
    (symbol: string, volume: number, lp: string, _execType: string) => {
      setHedgingSymbol(symbol);

      // Simulate LP routing delay (1-2s)
      const delay = 1000 + Math.random() * 1000;
      setTimeout(() => {
        const row = bookRows.find((r) => r.symbol === symbol);
        const direction = row && row.netHedge > 0 ? 'SELL' : 'BUY';
        const price = MOCK_PRICES[symbol] ?? 0;
        const latency = Math.floor(30 + Math.random() * 80);

        const result: HedgeResult = {
          symbol,
          direction,
          volume,
          price: +(price + (Math.random() - 0.5) * 0.001).toFixed(
            symbol.includes('JPY') ? 3 : symbol === 'XAUUSD' || symbol === 'BTCUSD' ? 2 : 5
          ),
          lp,
          latencyMs: latency,
          timestamp: new Date().toISOString(),
        };

        setHedgeResults((prev) => ({ ...prev, [symbol]: result }));
        setHedgingSymbol(null);

        // Reduce unhedged exposure
        const hedgeSign = direction === 'SELL' ? -volume : volume;
        setHedgedOffsets((prev) => ({
          ...prev,
          [symbol]: (prev[symbol] ?? 0) + hedgeSign,
        }));

        // Audit log
        const logEntry = `[${new Date().toLocaleTimeString()}] HEDGED: ${symbol} ${direction} ${volume.toFixed(1)}L @ ${result.price} via ${lp} | Latency: ${latency}ms`;
        setAuditLog((prev) => [logEntry, ...prev].slice(0, 20));
      }, delay);
    },
    [bookRows]
  );

  // Toggle auto-hedge rule
  const toggleRule = useCallback((id: string) => {
    setAutoRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  // Update threshold
  const updateThreshold = useCallback((id: string, val: number) => {
    setAutoRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, threshold: val } : r))
    );
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden border-t"
      style={{
        background: '#111116',
        borderColor: '#252530',
        maxHeight: '50vh',
        animation: 'slideUp 0.25s ease-out',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid #252530' }}
      >
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: '#00BCD4' }} />
          <span
            className="text-[12px] font-bold tracking-widest uppercase"
            style={{ color: '#F2F2F2' }}
          >
            Hedging Panel
          </span>
          <span
            className="ml-2 rounded px-2 py-0.5 text-[10px] font-mono font-semibold"
            style={{ background: '#FFB30018', color: '#FFB300', border: '1px solid #FFB30044' }}
          >
            Unhedged: ${(totalUnhedged / 1000000).toFixed(1)}M
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 transition-colors hover:bg-white/5"
        >
          <X size={16} style={{ color: '#888899' }} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 280px' }}>
          {/* Left: Portfolio Aggregation + Hedge Actions */}
          <div>
            <SectionHeader
              title="Portfolio Aggregation"
              icon={<TrendingUp size={14} style={{ color: '#00BCD4' }} />}
            />

            {/* Column headers */}
            <div
              className="grid items-center gap-2 px-2 mb-1 text-[9px] font-bold tracking-widest uppercase"
              style={{
                gridTemplateColumns: '80px 80px 80px 100px 60px 100px 80px 1fr',
                color: '#888899',
              }}
            >
              <span>Symbol</span>
              <span>B-Book</span>
              <span>A-Book</span>
              <span>Net Hedge</span>
              <span>Vol</span>
              <span>LP</span>
              <span>Exec</span>
              <span>Action</span>
            </div>

            <div className="h-px mb-1" style={{ background: '#252530' }} />

            {/* Rows */}
            {bookRows.map((row) => (
              <HedgeRow
                key={row.symbol}
                row={row}
                onHedge={handleHedge}
                hedging={hedgingSymbol}
                result={hedgeResults[row.symbol] ?? null}
              />
            ))}

            <div className="h-px mt-2" style={{ background: '#252530' }} />

            {/* Total */}
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-[11px] font-bold" style={{ color: '#888899' }}>
                Total unhedged exposure:
              </span>
              <span
                className="text-[12px] font-mono font-bold"
                style={{ color: totalUnhedged > 0 ? '#FFB300' : '#00C853' }}
              >
                ${(totalUnhedged / 1000000).toFixed(1)}M
              </span>
            </div>

            {/* Audit Trail */}
            {auditLog.length > 0 && (
              <div className="mt-3">
                <SectionHeader
                  title="Audit Trail"
                  icon={<RefreshCw size={13} style={{ color: '#888899' }} />}
                />
                <div
                  className="max-h-24 overflow-y-auto rounded p-2 text-[10px] font-mono"
                  style={{ background: '#0B0B0D', border: '1px solid #252530' }}
                >
                  {auditLog.map((entry, i) => (
                    <div key={i} style={{ color: '#00C853' }}>
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Auto-Hedge Rules */}
          <div>
            <SectionHeader
              title="Auto-Hedge Rules"
              icon={<Settings size={14} style={{ color: '#888899' }} />}
            />

            <div
              className="rounded p-3"
              style={{ background: '#0B0B0D', border: '1px solid #252530' }}
            >
              {autoRules.map((rule) => (
                <AutoHedgeRuleToggle
                  key={rule.id}
                  rule={rule}
                  onToggle={toggleRule}
                  onThresholdChange={
                    rule.threshold !== undefined ? updateThreshold : undefined
                  }
                />
              ))}
            </div>

            {/* Quick stats */}
            <div className="mt-4 space-y-2">
              <div
                className="flex items-center justify-between rounded px-3 py-2 text-[11px]"
                style={{ background: '#0B0B0D', border: '1px solid #252530' }}
              >
                <span style={{ color: '#888899' }}>Hedges executed today</span>
                <span className="font-mono font-semibold" style={{ color: '#F2F2F2' }}>
                  {Object.keys(hedgeResults).length}
                </span>
              </div>
              <div
                className="flex items-center justify-between rounded px-3 py-2 text-[11px]"
                style={{ background: '#0B0B0D', border: '1px solid #252530' }}
              >
                <span style={{ color: '#888899' }}>Active LP connections</span>
                <span className="font-mono font-semibold" style={{ color: '#00C853' }}>
                  4/4
                </span>
              </div>
              <div
                className="flex items-center justify-between rounded px-3 py-2 text-[11px]"
                style={{ background: '#0B0B0D', border: '1px solid #252530' }}
              >
                <span style={{ color: '#888899' }}>Avg hedge latency</span>
                <span className="font-mono font-semibold" style={{ color: '#F2F2F2' }}>
                  67ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-up animation */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
