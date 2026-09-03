'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDealingDeskStore, usePriceFeedStore } from '@/stores/dealer';
import type {
  RoutingDecision,
  RoutingMode,
  Trade,
  PriceTick,
} from '@/lib/dealer/types';

// ================================================================
// Design Tokens
// ================================================================
const C = {
  bg: '#0B0B0D',
  surface: '#111116',
  elevated: '#1A1A22',
  border: '#252530',
  accent: '#00B4D8',
  textPrimary: '#F2F2F2',
  textSecondary: '#888899',
  success: '#00C853',
  danger: '#E50914',
  warning: '#FFB300',
  aBook: '#00C853',
  bBook: '#E50914',
  aiAuto: '#2979FF',
} as const;

// ================================================================
// Mock decision engine (inline defaults until wired to real async)
// ================================================================
function mockRoutingDecision(order: Trade): RoutingDecision {
  const toxicScore = order.toxic_score ?? 0;
  const isLarge = order.requested_size >= 5;
  const recommended: RoutingMode =
    toxicScore >= 4 ? 'a_book' : isLarge ? 'hybrid' : 'b_book';
  const confidence = toxicScore >= 4 ? 0.97 : isLarge ? 0.72 : 0.85;
  return {
    recommended,
    confidence,
    split_ratio:
      recommended === 'hybrid'
        ? { a_book: 0.6, b_book: 0.4 }
        : recommended === 'a_book'
          ? { a_book: 1, b_book: 0 }
          : { a_book: 0, b_book: 1 },
    reasons: [
      {
        factor: toxicScore >= 4 ? 'toxic_client' : isLarge ? 'trade_size' : 'win_rate',
        weight: 0.3,
        direction: recommended === 'hybrid' ? 'neutral' : recommended,
        score: confidence,
        description:
          toxicScore >= 4
            ? 'Toxic client detected - forced A-book'
            : isLarge
              ? 'Large position size favors hedging'
              : 'Normal client profile - B-book favorable',
      },
    ],
    risk_flags:
      toxicScore >= 3
        ? [{ type: 'toxic_client', severity: 'high', message: `Toxic score: ${toxicScore}/5` }]
        : [],
    override_allowed: toxicScore < 4,
    hard_rule_triggered: toxicScore >= 4,
    hard_rule_name: toxicScore >= 4 ? 'toxic_client' : null,
    computed_at: new Date().toISOString(),
  };
}

// ================================================================
// Utility helpers
// ================================================================
function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatPrice(value: number, digits = 5): string {
  return value.toFixed(digits);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ================================================================
// Sub-components
// ================================================================

// ---------- Empty State ----------
function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.bg,
        color: C.textSecondary,
        gap: 16,
        minHeight: 400,
      }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect
          x="6"
          y="10"
          width="36"
          height="28"
          rx="3"
          stroke={C.border}
          strokeWidth="2"
        />
        <path d="M6 18h36" stroke={C.border} strokeWidth="2" />
        <circle cx="24" cy="28" r="4" stroke={C.accent} strokeWidth="1.5" />
        <path d="M24 24v8M20 28h8" stroke={C.accent} strokeWidth="1.2" />
      </svg>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary }}>
        No Order Selected
      </span>
      <span style={{ fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
        Select a pending order from the Order Queue (Zone 1) to begin execution.
        <br />
        Use keyboard shortcuts F1-F5 for rapid actions in expert mode.
      </span>
    </div>
  );
}

// ---------- Section A: Trade Header ----------
interface TradeHeaderProps {
  order: Trade;
  routingDecision: RoutingDecision | null;
}

function TradeHeader({ order, routingDecision }: TradeHeaderProps) {
  const bookLabel =
    order.routing_mode === 'a_book'
      ? 'A'
      : order.routing_mode === 'b_book'
        ? 'B'
        : order.routing_mode === 'hybrid'
          ? 'H'
          : '?';
  const bookColor =
    order.routing_mode === 'a_book'
      ? C.aBook
      : order.routing_mode === 'b_book'
        ? C.bBook
        : C.aiAuto;

  const toxicScore = order.toxic_score ?? 0;
  const riskLabel =
    toxicScore >= 4 ? 'TOXIC' : toxicScore >= 3 ? 'HIGH' : toxicScore >= 2 ? 'MED' : 'LOW';
  const riskColor =
    toxicScore >= 4 ? C.danger : toxicScore >= 3 ? C.warning : toxicScore >= 2 ? C.accent : C.success;

  return (
    <div
      style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        fontSize: 13,
        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: C.textPrimary, fontWeight: 700 }}>
          TR-{shortId(order.id)}
        </span>
        <span style={{ color: C.textSecondary }}>-</span>
        <span style={{ color: C.accent, fontWeight: 600 }}>{order.symbol}</span>
        <span
          style={{
            color: order.direction === 'buy' ? C.success : C.danger,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {order.direction}
        </span>
        <span className="font-mono" style={{ color: C.textPrimary }}>
          {order.requested_size}L
        </span>
        <span style={{ color: C.textSecondary }}>-</span>
        <span style={{ color: C.textPrimary }}>{order.client_id.slice(0, 12)}</span>
        <span style={{ color: C.textSecondary }}>{order.account_id.slice(0, 10)}</span>
        <span
          style={{
            background: bookColor + '20',
            color: bookColor,
            padding: '1px 8px',
            borderRadius: 3,
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          {bookLabel}-BOOK
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            background: riskColor + '18',
            color: riskColor,
            padding: '2px 8px',
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          RISK: {riskLabel}
        </span>
        <span
          className="font-mono"
          style={{
            color: toxicScore >= 3 ? C.danger : C.textSecondary,
            fontSize: 11,
          }}
        >
          TOXIC {toxicScore}/5
        </span>
      </div>
    </div>
  );
}

// ---------- Section B: Price Context ----------
interface PriceContextProps {
  order: Trade;
  tick: PriceTick | undefined;
  tickHistory: PriceTick[];
}

function PriceContext({ order, tick, tickHistory }: PriceContextProps) {
  const prevBidRef = useRef<number | null>(null);
  const prevAskRef = useRef<number | null>(null);
  const [bidFlash, setBidFlash] = useState<'up' | 'down' | null>(null);
  const [askFlash, setAskFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (!tick) return;
    if (prevBidRef.current !== null) {
      if (tick.bid > prevBidRef.current) setBidFlash('up');
      else if (tick.bid < prevBidRef.current) setBidFlash('down');
    }
    if (prevAskRef.current !== null) {
      if (tick.ask > prevAskRef.current) setAskFlash('up');
      else if (tick.ask < prevAskRef.current) setAskFlash('down');
    }
    prevBidRef.current = tick.bid;
    prevAskRef.current = tick.ask;
    const t = setTimeout(() => {
      setBidFlash(null);
      setAskFlash(null);
    }, 300);
    return () => clearTimeout(t);
  }, [tick]);

  const bid = tick?.bid ?? 0;
  const ask = tick?.ask ?? 0;
  const requestedPrice = order.requested_price ?? 0;
  const drift = requestedPrice > 0 ? ((bid + ask) / 2 - requestedPrice) : 0;

  // Last 5 tick direction triangles
  const lastTicks = tickHistory.slice(-6);
  const directions: ('up' | 'down' | 'flat')[] = [];
  for (let i = 1; i < lastTicks.length; i++) {
    const diff = lastTicks[i].mid - lastTicks[i - 1].mid;
    directions.push(diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat');
  }

  // Volatility: derived from spread vs typical
  const spread = tick ? tick.spread : 0;
  const volLevel = spread > 3 ? 'HIGH' : spread > 1.5 ? 'MED' : 'LOW';
  const volColor = spread > 3 ? C.danger : spread > 1.5 ? C.warning : C.success;

  const flashColor = (flash: 'up' | 'down' | null) =>
    flash === 'up' ? C.success : flash === 'down' ? C.danger : C.textPrimary;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        height: 100,
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {/* Column 1: Bid/Ask live */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 2,
          borderRight: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <div>
            <span style={{ fontSize: 10, color: C.textSecondary }}>BID</span>
            <div
              className="font-mono"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: flashColor(bidFlash),
                transition: 'color 0.15s',
              }}
            >
              {formatPrice(bid)}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 10, color: C.textSecondary }}>ASK</span>
            <div
              className="font-mono"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: flashColor(askFlash),
                transition: 'color 0.15s',
              }}
            >
              {formatPrice(ask)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.textSecondary }}>
          <span>
            Req:{' '}
            <span className="font-mono" style={{ color: C.textPrimary }}>
              {formatPrice(requestedPrice)}
            </span>
          </span>
          <span>
            Drift:{' '}
            <span
              className="font-mono"
              style={{ color: drift > 0 ? C.success : drift < 0 ? C.danger : C.textPrimary }}
            >
              {drift >= 0 ? '+' : ''}
              {(drift * 10000).toFixed(1)}p
            </span>
          </span>
        </div>
      </div>

      {/* Column 2: Tick direction triangles */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: `1px solid ${C.border}`,
          gap: 4,
        }}
      >
        <span style={{ fontSize: 10, color: C.textSecondary }}>TICK FLOW</span>
        <div style={{ display: 'flex', gap: 6, fontSize: 18 }}>
          {directions.length === 0 && (
            <span style={{ color: C.textSecondary, fontSize: 12 }}>--</span>
          )}
          {directions.map((d, i) => (
            <span
              key={i}
              style={{
                color: d === 'up' ? C.success : d === 'down' ? C.danger : C.textSecondary,
                lineHeight: 1,
              }}
            >
              {d === 'up' ? '\u25B2' : d === 'down' ? '\u25BD' : '\u25C6'}
            </span>
          ))}
        </div>
        <span className="font-mono" style={{ fontSize: 10, color: C.textSecondary }}>
          SPREAD: {tick ? tick.spread.toFixed(1) : '--'}p
        </span>
      </div>

      {/* Column 3: Volatility badge + news */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 10, color: C.textSecondary }}>VOLATILITY</span>
        <span
          style={{
            background: volColor + '20',
            color: volColor,
            padding: '3px 14px',
            borderRadius: 3,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {volLevel}
        </span>
        <span style={{ fontSize: 10, color: C.textSecondary }}>
          No upcoming news
        </span>
      </div>
    </div>
  );
}

// ---------- Section C: AI Routing Recommendation ----------
interface AIRecommendationProps {
  decision: RoutingDecision | null;
  isOverridden: boolean;
  onToggleOverride: () => void;
}

function AIRecommendation({ decision, isOverridden, onToggleOverride }: AIRecommendationProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!decision) return null;

  const recLabel = decision.recommended.toUpperCase().replace('_', '-');
  const recColor =
    decision.recommended === 'a_book'
      ? C.aBook
      : decision.recommended === 'b_book'
        ? C.bBook
        : C.aiAuto;
  const conf = (decision.confidence * 100).toFixed(0);

  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: C.elevated,
          border: 'none',
          cursor: 'pointer',
          color: C.textPrimary,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.aiAuto, fontWeight: 700 }}>AI</span>
          <span>Recommendation:</span>
          <span style={{ color: recColor, fontWeight: 700 }}>{recLabel}</span>
          <span className="font-mono" style={{ color: C.textSecondary }}>
            {conf}% confidence
          </span>
          {isOverridden && (
            <span
              style={{
                background: C.warning + '25',
                color: C.warning,
                padding: '1px 6px',
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              OVERRIDDEN
            </span>
          )}
        </div>
        <span style={{ color: C.textSecondary, fontSize: 10 }}>
          {collapsed ? '\u25B6' : '\u25BC'}
        </span>
      </button>
      {!collapsed && (
        <div style={{ padding: '8px 12px', background: C.surface }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {decision.reasons.map((r, i) => {
              const tagColor =
                r.direction === 'a_book'
                  ? C.aBook
                  : r.direction === 'b_book'
                    ? C.bBook
                    : C.textSecondary;
              return (
                <span
                  key={i}
                  style={{
                    background: tagColor + '18',
                    color: tagColor,
                    padding: '2px 8px',
                    borderRadius: 3,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {r.factor}: {r.description.slice(0, 50)}
                </span>
              );
            })}
            {decision.risk_flags.map((f, i) => (
              <span
                key={`rf-${i}`}
                style={{
                  background: C.danger + '18',
                  color: C.danger,
                  padding: '2px 8px',
                  borderRadius: 3,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {f.type}: {f.message.slice(0, 40)}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.textSecondary }}>Override AI:</span>
            <button
              type="button"
              onClick={onToggleOverride}
              disabled={!decision.override_allowed}
              style={{
                width: 36,
                height: 18,
                borderRadius: 9,
                border: 'none',
                cursor: decision.override_allowed ? 'pointer' : 'not-allowed',
                background: isOverridden ? C.accent : C.border,
                position: 'relative',
                transition: 'background 0.2s',
                opacity: decision.override_allowed ? 1 : 0.4,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: isOverridden ? 20 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  background: C.textPrimary,
                  transition: 'left 0.2s',
                }}
              />
            </button>
            {!decision.override_allowed && (
              <span style={{ fontSize: 10, color: C.danger }}>Hard rule - override blocked</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Section D: Execution Controls ----------
interface ExecutionControlsProps {
  routingMode: RoutingMode;
  setRoutingMode: (m: RoutingMode) => void;
  hybridSplit: number;
  setHybridSplit: (v: number) => void;
  fillMode: 'market' | 'manual';
  setFillMode: (m: 'market' | 'manual') => void;
  manualPrice: string;
  setManualPrice: (v: string) => void;
  slippage: number;
  setSlippage: (v: number) => void;
  delay: number;
  setDelay: (v: number) => void;
  requoteExpanded: boolean;
  setRequoteExpanded: (v: boolean) => void;
  requotePrice: string;
  setRequotePrice: (v: string) => void;
  requoteValidFor: string;
  setRequoteValidFor: (v: string) => void;
  partialFill: boolean;
  setPartialFill: (v: boolean) => void;
  partialVolume: string;
  setPartialVolume: (v: string) => void;
  currentBid: number;
  currentAsk: number;
  order: Trade;
}

function ExecutionControls(props: ExecutionControlsProps) {
  const {
    routingMode,
    setRoutingMode,
    hybridSplit,
    setHybridSplit,
    fillMode,
    setFillMode,
    manualPrice,
    setManualPrice,
    slippage,
    setSlippage,
    delay,
    setDelay,
    requoteExpanded,
    setRequoteExpanded,
    requotePrice,
    setRequotePrice,
    requoteValidFor,
    setRequoteValidFor,
    partialFill,
    setPartialFill,
    partialVolume,
    setPartialVolume,
    currentBid,
    currentAsk,
    order,
  } = props;

  const slippagePresets = [0, 0.5, 1.0, 2.0];
  const delayPresets = [
    { label: 'IMM', value: 0 },
    { label: '200ms', value: 200 },
    { label: '500ms', value: 500 },
    { label: '1s', value: 1000 },
    { label: '3s', value: 3000 },
    { label: '5s', value: 5000 },
  ];

  const fillPreview = useMemo(() => {
    if (fillMode === 'manual' && manualPrice) return parseFloat(manualPrice);
    const base = order.direction === 'buy' ? currentAsk : currentBid;
    return base + slippage * 0.0001;
  }, [fillMode, manualPrice, currentAsk, currentBid, slippage, order.direction]);

  const radioBtn = (
    active: boolean,
    onClick: () => void,
    label: string,
    activeColor?: string,
  ) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        background: active ? (activeColor ?? C.accent) + '20' : 'transparent',
        color: active ? (activeColor ?? C.accent) : C.textSecondary,
        border: `1px solid ${active ? (activeColor ?? C.accent) + '60' : C.border}`,
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );

  const sectionStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: `1px solid ${C.border}`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div style={{ background: C.surface }}>
      {/* D1: Routing toggle */}
      <div style={sectionStyle}>
        <span style={labelStyle}>D1 - Routing Mode</span>
        <div style={{ display: 'flex', gap: 4, marginBottom: routingMode === 'hybrid' ? 8 : 0 }}>
          {radioBtn(routingMode === 'a_book', () => setRoutingMode('a_book'), 'A-BOOK', C.aBook)}
          {radioBtn(routingMode === 'b_book', () => setRoutingMode('b_book'), 'B-BOOK', C.bBook)}
          {radioBtn(routingMode === 'hybrid', () => setRoutingMode('hybrid'), 'HYBRID', C.aiAuto)}
        </div>
        {routingMode === 'hybrid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="font-mono"
              style={{ fontSize: 11, color: C.aBook, minWidth: 28, textAlign: 'right' }}
            >
              A:{Math.round(hybridSplit)}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={hybridSplit}
              onChange={(e) => setHybridSplit(Number(e.target.value))}
              style={{ flex: 1, accentColor: C.aiAuto, height: 4 }}
            />
            <span
              className="font-mono"
              style={{ fontSize: 11, color: C.bBook, minWidth: 28 }}
            >
              B:{Math.round(100 - hybridSplit)}%
            </span>
          </div>
        )}
      </div>

      {/* D2: Fill price */}
      <div style={sectionStyle}>
        <span style={labelStyle}>D2 - Fill Price</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {radioBtn(fillMode === 'market', () => setFillMode('market'), 'At Market')}
          {radioBtn(fillMode === 'manual', () => setFillMode('manual'), 'Manual Override')}
          {fillMode === 'manual' && (
            <input
              type="text"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              placeholder="Price..."
              className="font-mono"
              style={{
                width: 110,
                padding: '3px 8px',
                fontSize: 12,
                background: C.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                color: C.textPrimary,
                outline: 'none',
              }}
            />
          )}
          <span
            className="font-mono"
            style={{ marginLeft: 'auto', fontSize: 11, color: C.accent }}
          >
            Preview: {formatPrice(fillPreview)}
          </span>
        </div>
      </div>

      {/* D3: Slippage */}
      <div style={sectionStyle}>
        <span style={labelStyle}>D3 - Slippage (pips)</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {slippagePresets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSlippage(p)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: slippage === p ? 700 : 500,
                background: slippage === p ? C.accent + '20' : 'transparent',
                color: slippage === p ? C.accent : C.textSecondary,
                border: `1px solid ${slippage === p ? C.accent + '60' : C.border}`,
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              {p === 0 ? '+0' : `+${p}`}
            </button>
          ))}
          <input
            type="number"
            step="0.1"
            min="0"
            max="50"
            value={slippage}
            onChange={(e) => setSlippage(clamp(parseFloat(e.target.value) || 0, 0, 50))}
            className="font-mono"
            style={{
              width: 64,
              padding: '3px 6px',
              fontSize: 11,
              background: C.elevated,
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              color: C.textPrimary,
              outline: 'none',
            }}
          />
          <span className="font-mono" style={{ fontSize: 10, color: C.textSecondary }}>
            = {(slippage * 0.0001).toFixed(5)} price shift
          </span>
        </div>
      </div>

      {/* D4: Delay */}
      <div style={sectionStyle}>
        <span style={labelStyle}>D4 - Execution Delay</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {delayPresets.map((d) =>
            radioBtn(delay === d.value, () => setDelay(d.value), d.label),
          )}
        </div>
      </div>

      {/* D5: Requote controls */}
      <div style={{ borderBottom: `1px solid ${C.border}` }}>
        <button
          type="button"
          onClick={() => setRequoteExpanded(!requoteExpanded)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: C.textSecondary,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          <span>D5 - Requote Controls</span>
          <span>{requoteExpanded ? '\u25BC' : '\u25B6'}</span>
        </button>
        {requoteExpanded && (
          <div style={{ padding: '4px 12px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 10, color: C.textSecondary }}>New Price</span>
              <input
                type="text"
                value={requotePrice}
                onChange={(e) => setRequotePrice(e.target.value)}
                placeholder="1.23456"
                className="font-mono"
                style={{
                  display: 'block',
                  width: 110,
                  padding: '3px 8px',
                  fontSize: 12,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  borderRadius: 3,
                  color: C.textPrimary,
                  outline: 'none',
                  marginTop: 2,
                }}
              />
            </div>
            <div>
              <span style={{ fontSize: 10, color: C.textSecondary }}>Valid For</span>
              <select
                value={requoteValidFor}
                onChange={(e) => setRequoteValidFor(e.target.value)}
                style={{
                  display: 'block',
                  padding: '3px 8px',
                  fontSize: 12,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  borderRadius: 3,
                  color: C.textPrimary,
                  outline: 'none',
                  marginTop: 2,
                }}
              >
                <option value="5">5s</option>
                <option value="10">10s</option>
                <option value="15">15s</option>
                <option value="30">30s</option>
              </select>
            </div>
            <button
              type="button"
              style={{
                marginTop: 14,
                padding: '5px 14px',
                fontSize: 11,
                fontWeight: 600,
                background: C.accent + '20',
                color: C.accent,
                border: `1px solid ${C.accent}50`,
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              Send Requote
            </button>
          </div>
        )}
      </div>

      {/* D6: Partial fill */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={labelStyle}>D6 - Partial Fill</span>
          <button
            type="button"
            onClick={() => setPartialFill(!partialFill)}
            style={{
              width: 36,
              height: 18,
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              background: partialFill ? C.accent : C.border,
              position: 'relative',
              transition: 'background 0.2s',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: partialFill ? 20 : 2,
                width: 14,
                height: 14,
                borderRadius: 7,
                background: C.textPrimary,
                transition: 'left 0.2s',
              }}
            />
          </button>
          {partialFill && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={order.requested_size}
                value={partialVolume}
                onChange={(e) => setPartialVolume(e.target.value)}
                className="font-mono"
                style={{
                  width: 72,
                  padding: '3px 6px',
                  fontSize: 12,
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  borderRadius: 3,
                  color: C.textPrimary,
                  outline: 'none',
                }}
              />
              <span className="font-mono" style={{ fontSize: 11, color: C.textSecondary }}>
                / {order.requested_size} lots
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Section E: Action Buttons ----------
interface ActionButtonsProps {
  expertMode: boolean;
  onAction: (action: 'accept' | 'requote' | 'delay' | 'reject' | 'force_close') => void;
  disabled: boolean;
}

function ActionButtons({ expertMode, onAction, disabled }: ActionButtonsProps) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const handleClick = useCallback(
    (action: 'accept' | 'requote' | 'delay' | 'reject' | 'force_close') => {
      if (disabled) return;
      if (expertMode) {
        onAction(action);
        return;
      }
      if (action === 'accept' || action === 'delay' || action === 'requote') {
        onAction(action);
        return;
      }
      if (confirmAction === action) {
        onAction(action);
        setConfirmAction(null);
      } else {
        setConfirmAction(action);
        setTimeout(() => setConfirmAction(null), 3000);
      }
    },
    [expertMode, onAction, disabled, confirmAction],
  );

  const btnStyle = (
    bg: string,
    color: string,
    isConfirm = false,
  ): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    fontSize: 12,
    fontWeight: 700,
    background: isConfirm ? color : bg,
    color: isConfirm ? '#000' : color,
    border: `1px solid ${color}40`,
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    transition: 'all 0.15s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 2,
  });

  const buttons: {
    key: 'accept' | 'requote' | 'delay' | 'reject' | 'force_close';
    label: string;
    hotkey: string;
    bg: string;
    color: string;
  }[] = [
    { key: 'accept', label: 'ACCEPT', hotkey: 'F1', bg: C.success + '18', color: C.success },
    { key: 'requote', label: 'REQUOTE', hotkey: 'F2', bg: C.elevated, color: C.textSecondary },
    { key: 'delay', label: 'DELAY', hotkey: 'F3', bg: C.elevated, color: C.textSecondary },
    { key: 'reject', label: 'REJECT', hotkey: 'F4', bg: C.danger + '18', color: C.danger },
    { key: 'force_close', label: 'FORCE CLOSE', hotkey: 'F5', bg: C.danger + '18', color: C.danger },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '8px 12px',
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {buttons.map((b) => {
        const isConfirm = confirmAction === b.key;
        return (
          <button
            key={b.key}
            type="button"
            onClick={() => handleClick(b.key)}
            style={btnStyle(b.bg, b.color, isConfirm)}
          >
            <span style={{ fontSize: 10, opacity: 0.6 }}>{b.hotkey}</span>
            <span>{isConfirm ? 'CONFIRM?' : b.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Section F: Execution Result Strip ----------
interface ExecutionResultStripProps {
  result: {
    action: string;
    success: boolean;
    fillPrice: number | null;
    timestamp: string;
    balanceChange: number | null;
    marginInfo: string | null;
  } | null;
}

function ExecutionResultStrip({ result }: ExecutionResultStripProps) {
  if (!result) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: result.success ? C.success + '12' : C.danger + '12',
        borderTop: `1px solid ${result.success ? C.success + '40' : C.danger + '40'}`,
        animation: 'slideUp 0.25s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            background: result.success ? C.success : C.danger,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>
          {result.action.toUpperCase()} {result.success ? 'OK' : 'FAILED'}
        </span>
        {result.fillPrice !== null && (
          <span className="font-mono" style={{ fontSize: 12, color: C.accent }}>
            Fill: {formatPrice(result.fillPrice)}
          </span>
        )}
        {result.balanceChange !== null && (
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              color: result.balanceChange >= 0 ? C.success : C.danger,
            }}
          >
            Bal: {result.balanceChange >= 0 ? '+' : ''}
            {result.balanceChange.toFixed(2)}
          </span>
        )}
        {result.marginInfo && (
          <span style={{ fontSize: 11, color: C.textSecondary }}>{result.marginInfo}</span>
        )}
      </div>
      <span className="font-mono" style={{ fontSize: 10, color: C.textSecondary }}>
        {new Date(result.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

// ================================================================
// Main: ExecutionConsole
// ================================================================
export default function ExecutionConsole() {
  // -- Stores --
  const selectedOrderId = useDealingDeskStore((s) => s.selectedOrderId);
  const orders = useDealingDeskStore((s) => s.orders);
  const expertMode = useDealingDeskStore((s) => s.expertMode);
  const removeOrder = useDealingDeskStore((s) => s.removeOrder);
  const selectOrder = useDealingDeskStore((s) => s.selectOrder);
  const incrementStats = useDealingDeskStore((s) => s.incrementStats);

  const prices = usePriceFeedStore((s) => s.prices);
  const priceHistory = usePriceFeedStore((s) => s.priceHistory);

  // -- Derived --
  const order = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const tick = order ? prices[order.symbol] : undefined;
  const tickHist = order ? priceHistory[order.symbol] ?? [] : [];

  // -- Routing decision (mocked) --
  const [routingDecision, setRoutingDecision] = useState<RoutingDecision | null>(null);
  useEffect(() => {
    if (!order) {
      setRoutingDecision(null);
      return;
    }
    setRoutingDecision(mockRoutingDecision(order));
  }, [order]);

  // -- Execution controls state --
  const [routingMode, setRoutingMode] = useState<RoutingMode>('b_book');
  const [hybridSplit, setHybridSplit] = useState(60);
  const [fillMode, setFillMode] = useState<'market' | 'manual'>('market');
  const [manualPrice, setManualPrice] = useState('');
  const [slippage, setSlippage] = useState(0);
  const [delay, setDelay] = useState(0);
  const [requoteExpanded, setRequoteExpanded] = useState(false);
  const [requotePrice, setRequotePrice] = useState('');
  const [requoteValidFor, setRequoteValidFor] = useState('5');
  const [partialFill, setPartialFill] = useState(false);
  const [partialVolume, setPartialVolume] = useState('');
  const [isOverridden, setIsOverridden] = useState(false);

  const [execResult, setExecResult] = useState<ExecutionResultStripProps['result']>(null);

  // Sync routing mode from AI decision when order changes
  useEffect(() => {
    if (routingDecision && !isOverridden) {
      setRoutingMode(routingDecision.recommended);
      if (routingDecision.recommended === 'hybrid') {
        setHybridSplit(routingDecision.split_ratio.a_book * 100);
      }
    }
  }, [routingDecision, isOverridden]);

  // Reset controls when order changes
  useEffect(() => {
    setFillMode('market');
    setManualPrice('');
    setSlippage(0);
    setDelay(0);
    setRequoteExpanded(false);
    setRequotePrice('');
    setRequoteValidFor('5');
    setPartialFill(false);
    setPartialVolume('');
    setIsOverridden(false);
    setExecResult(null);
  }, [selectedOrderId]);

  // -- Action handler --
  const handleAction = useCallback(
    (action: 'accept' | 'requote' | 'delay' | 'reject' | 'force_close') => {
      if (!order) return;

      const bid = tick?.bid ?? 0;
      const ask = tick?.ask ?? 0;
      const fillPrice = order.direction === 'buy' ? ask : bid;

      const resultBase = {
        timestamp: new Date().toISOString(),
        balanceChange: null as number | null,
        marginInfo: null as string | null,
      };

      switch (action) {
        case 'accept': {
          const finalFill =
            fillMode === 'manual' && manualPrice
              ? parseFloat(manualPrice)
              : fillPrice + slippage * 0.0001;
          setExecResult({
            ...resultBase,
            action: 'accept',
            success: true,
            fillPrice: finalFill,
            balanceChange: -order.margin_used,
            marginInfo: `Margin: $${order.margin_used.toFixed(2)}`,
          });
          incrementStats('trades_approved');
          incrementStats('trades_processed');
          if (routingMode === 'a_book') incrementStats('a_book_count');
          else if (routingMode === 'b_book') incrementStats('b_book_count');
          else incrementStats('hybrid_count');
          setTimeout(() => {
            removeOrder(order.id);
            selectOrder(null);
          }, 1500);
          break;
        }
        case 'requote':
          setExecResult({
            ...resultBase,
            action: 'requote',
            success: true,
            fillPrice: requotePrice ? parseFloat(requotePrice) : fillPrice,
            balanceChange: null,
            marginInfo: `Valid for ${requoteValidFor}s`,
          });
          incrementStats('trades_requoted');
          incrementStats('trades_processed');
          break;
        case 'delay':
          setExecResult({
            ...resultBase,
            action: `delay ${delay}ms`,
            success: true,
            fillPrice: null,
            balanceChange: null,
            marginInfo: 'Order held',
          });
          break;
        case 'reject':
          setExecResult({
            ...resultBase,
            action: 'reject',
            success: true,
            fillPrice: null,
            balanceChange: null,
            marginInfo: null,
          });
          incrementStats('trades_rejected');
          incrementStats('trades_processed');
          setTimeout(() => {
            removeOrder(order.id);
            selectOrder(null);
          }, 1500);
          break;
        case 'force_close':
          setExecResult({
            ...resultBase,
            action: 'force close',
            success: true,
            fillPrice: fillPrice,
            balanceChange: order.floating_pnl,
            marginInfo: `Released margin: $${order.margin_used.toFixed(2)}`,
          });
          incrementStats('trades_processed');
          setTimeout(() => {
            removeOrder(order.id);
            selectOrder(null);
          }, 1500);
          break;
      }
    },
    [
      order,
      tick,
      fillMode,
      manualPrice,
      slippage,
      delay,
      routingMode,
      requotePrice,
      requoteValidFor,
      removeOrder,
      selectOrder,
      incrementStats,
    ],
  );

  // -- Keyboard shortcuts (F1-F5) --
  useEffect(() => {
    if (!order) return;
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, 'accept' | 'requote' | 'delay' | 'reject' | 'force_close'> = {
        F1: 'accept',
        F2: 'requote',
        F3: 'delay',
        F4: 'reject',
        F5: 'force_close',
      };
      const action = map[e.key];
      if (action) {
        e.preventDefault();
        handleAction(action);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [order, handleAction]);

  // -- Render --
  if (!order) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: C.bg,
          minWidth: 0,
        }}
      >
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: C.bg,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {/* A: Trade Header */}
      <TradeHeader order={order} routingDecision={routingDecision} />

      {/* Scrollable middle */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* B: Price Context */}
        <PriceContext order={order} tick={tick} tickHistory={tickHist} />

        {/* C: AI Routing Recommendation */}
        <AIRecommendation
          decision={routingDecision}
          isOverridden={isOverridden}
          onToggleOverride={() => setIsOverridden((v) => !v)}
        />

        {/* D: Execution Controls */}
        <ExecutionControls
          routingMode={routingMode}
          setRoutingMode={(m) => {
            setRoutingMode(m);
            if (!isOverridden) setIsOverridden(true);
          }}
          hybridSplit={hybridSplit}
          setHybridSplit={setHybridSplit}
          fillMode={fillMode}
          setFillMode={setFillMode}
          manualPrice={manualPrice}
          setManualPrice={setManualPrice}
          slippage={slippage}
          setSlippage={setSlippage}
          delay={delay}
          setDelay={setDelay}
          requoteExpanded={requoteExpanded}
          setRequoteExpanded={setRequoteExpanded}
          requotePrice={requotePrice}
          setRequotePrice={setRequotePrice}
          requoteValidFor={requoteValidFor}
          setRequoteValidFor={setRequoteValidFor}
          partialFill={partialFill}
          setPartialFill={setPartialFill}
          partialVolume={partialVolume}
          setPartialVolume={setPartialVolume}
          currentBid={tick?.bid ?? 0}
          currentAsk={tick?.ask ?? 0}
          order={order}
        />
      </div>

      {/* E: Action Buttons (pinned) */}
      <ActionButtons expertMode={expertMode} onAction={handleAction} disabled={!order} />

      {/* F: Result Strip */}
      <ExecutionResultStrip result={execResult} />

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
