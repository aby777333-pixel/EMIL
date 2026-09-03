'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bot, X, Send, AlertTriangle, Shield, Eye, Zap } from 'lucide-react';
import { useDealingDeskStore, useExposureStore, useAlertStore } from '@/stores/dealer';
import { useNexusStore } from '@/stores/nexus';
import type { Trade } from '@/lib/dealer/types';
import type { NexusRecommendation } from '@/stores/nexus';

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
  textMuted: '#3A3A4A',
  success: '#00C853',
  danger: '#E50914',
  warning: '#FFB300',
  aBook: '#00C853',
  bBook: '#E50914',
  aiPurple: '#A855F7',
} as const;

// ================================================================
// Props
// ================================================================
interface NexusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRecommendation: (rec: { routing: string; slippage: number }) => void;
}

// ================================================================
// Mock AI Analysis Generator
// ================================================================
function generateMockAnalysis(order: Trade): NexusRecommendation {
  const toxicScore = order.toxic_score ?? 0;
  const size = order.requested_size;
  const isHighToxic = toxicScore > 40;
  const isLargeSize = size >= 5;

  // Determine routing recommendation
  let routing = 'B-BOOK';
  let confidence = 82;
  let slippage = 0;
  const reasons: string[] = [];

  if (isHighToxic) {
    routing = 'A-BOOK';
    confidence = 94;
    slippage = 0.2;
    reasons.push(`Toxic score ${toxicScore}/100 exceeds threshold (>40)`);
    reasons.push(`Client pattern: consistent winner with ${(toxicScore * 0.8).toFixed(0)}% win rate`);
    reasons.push('Hedging recommended to limit counterparty risk');
    if (isLargeSize) {
      reasons.push(`Large position (${size} lots) amplifies risk exposure`);
    }
  } else if (isLargeSize) {
    routing = 'A-BOOK';
    confidence = 78;
    slippage = 0.3;
    reasons.push(`Position size ${size} lots exceeds B-book threshold`);
    reasons.push('Symbol exposure near capacity -- hedge to reduce drawdown');
    reasons.push('Current market volatility favors LP execution');
  } else {
    routing = 'B-BOOK';
    confidence = 85;
    slippage = 0;
    reasons.push(`Low toxic score (${toxicScore}/100) -- normal client profile`);
    reasons.push(`Small position (${size} lots) within risk appetite`);
    reasons.push('No active risk flags on this account');
    reasons.push('B-book retention maximizes spread capture');
  }

  return { routing, slippage, confidence, reasons };
}

// ================================================================
// Mock Chat Response Generator
// ================================================================
function getMockResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes('exposure')) {
    return 'Net exposure summary: XAUUSD +12.4 lots (82% utilization), EURUSD -3.2 lots (28%), GBPUSD +1.8 lots (15%). Total gross exposure $2.4M. XAUUSD approaching threshold -- consider hedging new buy orders.';
  }
  if (lower.includes('risk')) {
    return 'Risk assessment: Overall desk risk is MEDIUM. Primary concern is concentrated XAUUSD exposure at 82% of limit. 3 clients flagged for toxic flow monitoring. No margin calls pending. Recommend tightening B-book limits on gold pairs until exposure normalizes.';
  }
  if (lower.includes('news')) {
    return 'Upcoming events: No high-impact releases in the next 15 minutes. Next event: US CPI data at 13:30 UTC (HIGH impact). Recommend widening spreads on USD pairs 5 minutes before release. Current calendar risk: LOW.';
  }
  if (lower.includes('client') || lower.includes('toxic')) {
    return 'Toxic flow summary: 3 clients under active monitoring. ACC-10078 (score 58/100) shows scalping pattern with 78% win rate. ACC-10315 (score 72/100) flagged for latency arbitrage. ACC-10200 institutional flow -- not toxic but high volume. Recommend A-booking all orders from flagged accounts.';
  }
  if (lower.includes('hedge') || lower.includes('a-book')) {
    return 'Current hedging status: 34% of volume routed to LP. Primary LP: LMAX (avg latency 2.1ms). Backup: Currenex. Fill rate 99.2% today. Slippage avg 0.1 pips. No LP connectivity issues detected.';
  }

  return 'Analyzing current market conditions... Desk is operating within normal parameters. 14 orders processed this session with 0 rejections. Spread conditions stable across major pairs. No anomalies detected in recent order flow.';
}

// ================================================================
// Sub-Components
// ================================================================

/** Market Intel Card */
function IntelCard({
  label,
  color,
}: {
  label: string;
  color: 'amber' | 'red' | 'green';
}) {
  const colorMap = {
    amber: { bg: '#FFB30012', border: '#FFB30033', text: C.warning, dot: C.warning },
    red: { bg: '#E5091412', border: '#E5091433', text: C.danger, dot: C.danger },
    green: { bg: '#00C85312', border: '#00C85333', text: C.success, dot: C.success },
  };
  const c = colorMap[color];

  return (
    <div
      className="flex items-start gap-2 rounded px-2.5 py-2 text-[11px]"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
    >
      <span
        className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: c.dot, boxShadow: `0 0 4px ${c.dot}` }}
      />
      <span style={{ color: c.text, lineHeight: '1.4' }}>{label}</span>
    </div>
  );
}

/** Watch List Item */
function WatchItem({
  id,
  name,
  risk,
  icon,
}: {
  id: string;
  name: string;
  risk: string;
  icon: string;
}) {
  const IconMap: Record<string, React.ReactNode> = {
    alert: <AlertTriangle size={13} style={{ color: C.warning }} />,
    zap: <Zap size={13} style={{ color: C.accent }} />,
    eye: <Eye size={13} style={{ color: C.textSecondary }} />,
  };

  const riskLabelMap: Record<string, { label: string; color: string }> = {
    warning: { label: 'Monitor', color: C.warning },
    flag: { label: 'Flag', color: C.accent },
    watch: { label: 'Watch', color: C.textSecondary },
  };
  const r = riskLabelMap[risk] ?? riskLabelMap.watch;

  return (
    <div
      className="flex items-center justify-between rounded px-2.5 py-1.5"
      style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
    >
      <div className="flex items-center gap-2">
        {IconMap[icon] ?? IconMap.eye}
        <span className="font-mono text-[11px]" style={{ color: C.textPrimary }}>
          {id}
        </span>
        <span className="text-[10px]" style={{ color: C.textSecondary }}>
          {name}
        </span>
      </div>
      <span
        className="rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider"
        style={{
          backgroundColor: r.color + '18',
          color: r.color,
          border: `1px solid ${r.color}33`,
        }}
      >
        {r.label}
      </span>
    </div>
  );
}

// ================================================================
// Main Component
// ================================================================
export default function NexusPanel({
  isOpen,
  onClose,
  onApplyRecommendation,
}: NexusPanelProps) {
  // ---- Stores ----
  const orders = useDealingDeskStore((s) => s.orders);
  const selectedOrderId = useDealingDeskStore((s) => s.selectedOrderId);
  const exposures = useExposureStore((s) => s.exposures);
  const alerts = useAlertStore((s) => s.alerts);
  const watchList = useNexusStore((s) => s.watchList);

  // ---- Local state ----
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string; timestamp: number }[]
  >([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- Derived ----
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const recommendation = useMemo<NexusRecommendation | null>(
    () => (selectedOrder ? generateMockAnalysis(selectedOrder) : null),
    [selectedOrder]
  );

  // ---- Intel cards from stores ----
  const xauExposure = exposures['XAUUSD'];
  const xauPct = xauExposure ? Math.round(xauExposure.utilization_pct) : 82;

  const topToxicAlert = alerts.find(
    (a) => a.category === 'toxic_flow' && !a.acknowledged
  );

  const intelCards = useMemo(
    () => [
      {
        label: `XAUUSD: Near exposure threshold (${xauPct}%)`,
        color: (xauPct >= 80 ? 'amber' : xauPct >= 95 ? 'red' : 'green') as
          | 'amber'
          | 'red'
          | 'green',
      },
      {
        label: topToxicAlert
          ? topToxicAlert.title
          : 'Client CLT-3015: Toxic score 58/100',
        color: 'red' as const,
      },
      {
        label: 'No high-impact news in next 15min',
        color: 'green' as const,
      },
    ],
    [xauPct, topToxicAlert]
  );

  // ---- Chat scrolling ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ---- Streaming mock response ----
  const streamResponse = useCallback((fullText: string) => {
    setIsStreaming(true);
    const msgIndex =
      chatMessages.length; // will be set after adding placeholder
    const placeholder = {
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, placeholder]);

    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex++;
      setChatMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: fullText.slice(0, charIndex),
          };
        }
        return updated;
      });

      if (charIndex >= fullText.length) {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 8);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text || isStreaming) return;

    const userMsg = { role: 'user' as const, content: text, timestamp: Date.now() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    // Generate mock response after a short delay
    setTimeout(() => {
      const response = getMockResponse(text);
      streamResponse(response);
    }, 300);
  }, [chatInput, isStreaming, streamResponse]);

  const handleApply = useCallback(() => {
    if (!recommendation) return;
    onApplyRecommendation({
      routing: recommendation.routing.toLowerCase().replace('-', '_'),
      slippage: recommendation.slippage,
    });
  }, [recommendation, onApplyRecommendation]);

  // ---- Render ----
  return (
    <div
      className="fixed right-0 bottom-0 z-50 flex flex-col"
      style={{
        top: 56,
        width: 400,
        backgroundColor: C.bg,
        borderLeft: `1px solid ${C.border}`,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ---- Header ---- */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${C.border}`, minHeight: 48 }}
      >
        <div className="flex items-center gap-2.5">
          <Bot size={18} style={{ color: C.aiPurple }} />
          <span
            className="text-[12px] font-bold tracking-wider"
            style={{ color: C.textPrimary }}
          >
            NEXUS AI DEALER CO-PILOT
          </span>
          {/* Status dot */}
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              backgroundColor: C.success,
              boxShadow: `0 0 6px ${C.success}`,
              animation: 'pulse-dot 1.5s ease-in-out infinite',
            }}
          />
          <span className="text-[9px] uppercase tracking-wider" style={{ color: C.success }}>
            Watching
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded p-1 transition-colors hover:bg-white/5"
          aria-label="Close NEXUS panel"
        >
          <X size={16} style={{ color: C.textSecondary }} />
        </button>
      </div>

      {/* ---- Scrollable Body ---- */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {/* Section 1: Market Intel */}
        <div className="px-4 pt-3 pb-2">
          <div
            className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: C.textSecondary }}
          >
            <Shield size={11} />
            Market Intel
          </div>
          <div className="flex flex-col gap-1.5">
            {intelCards.map((card, i) => (
              <IntelCard key={i} label={card.label} color={card.color} />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 my-2 h-px" style={{ backgroundColor: C.border }} />

        {/* Section 2: Active Recommendation */}
        <div className="px-4 py-2">
          <div
            className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: C.textSecondary }}
          >
            <Bot size={11} />
            AI Recommendation
          </div>

          {selectedOrder && recommendation ? (
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
            >
              {/* Trade details */}
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[12px] font-bold"
                    style={{ color: C.textPrimary }}
                  >
                    {selectedOrder.symbol}
                  </span>
                  <span
                    className="rounded px-1.5 py-px text-[9px] font-bold uppercase"
                    style={{
                      backgroundColor:
                        selectedOrder.direction === 'buy'
                          ? C.success + '18'
                          : C.danger + '18',
                      color:
                        selectedOrder.direction === 'buy' ? C.success : C.danger,
                    }}
                  >
                    {selectedOrder.direction}
                  </span>
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: C.textSecondary }}
                  >
                    {selectedOrder.requested_size} lots
                  </span>
                </div>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: C.textMuted }}
                >
                  {selectedOrder.id.slice(0, 8)}
                </span>
              </div>

              {/* Recommendation badge */}
              <div className="mb-2.5 flex items-center gap-3">
                <span
                  className="rounded px-2 py-1 text-[12px] font-bold tracking-wide"
                  style={{
                    backgroundColor:
                      recommendation.routing === 'A-BOOK'
                        ? C.aBook + '18'
                        : C.bBook + '18',
                    color:
                      recommendation.routing === 'A-BOOK' ? C.aBook : C.bBook,
                    border: `1px solid ${
                      recommendation.routing === 'A-BOOK'
                        ? C.aBook + '44'
                        : C.bBook + '44'
                    }`,
                  }}
                >
                  {recommendation.routing}
                </span>
                <span
                  className="font-mono text-[13px] font-bold"
                  style={{ color: C.textPrimary }}
                >
                  {recommendation.confidence}%
                </span>
                <span className="text-[10px]" style={{ color: C.textSecondary }}>
                  confidence
                </span>
              </div>

              {/* Reasons */}
              <div className="mb-3 flex flex-col gap-1">
                {recommendation.reasons.map((reason, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1.5 text-[10px]"
                    style={{ color: C.textSecondary, lineHeight: '1.5' }}
                  >
                    <span style={{ color: C.aiPurple }}>&#x2022;</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {/* Apply button */}
              <button
                onClick={handleApply}
                className="w-full rounded py-2 text-[11px] font-bold tracking-wider transition-all hover:brightness-110"
                style={{
                  backgroundColor: C.aiPurple + '22',
                  color: C.aiPurple,
                  border: `1px solid ${C.aiPurple}44`,
                }}
              >
                APPLY RECOMMENDATION
              </button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-lg py-6"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
            >
              <Bot size={24} style={{ color: C.textMuted }} />
              <span
                className="mt-2 text-[11px]"
                style={{ color: C.textMuted }}
              >
                Select an order for AI analysis
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 my-2 h-px" style={{ backgroundColor: C.border }} />

        {/* Section 3: Chat */}
        <div className="px-4 py-2">
          <div
            className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: C.textSecondary }}
          >
            <Send size={11} />
            Ask NEXUS
          </div>

          {/* Chat messages */}
          <div
            className="mb-2 flex flex-col gap-2 overflow-y-auto"
            style={{ maxHeight: 200, scrollbarWidth: 'thin' }}
          >
            {chatMessages.length === 0 && (
              <div
                className="py-4 text-center text-[10px]"
                style={{ color: C.textMuted }}
              >
                Ask about exposure, risk, news, clients...
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[85%] rounded-lg px-2.5 py-2 text-[11px]"
                  style={{
                    backgroundColor:
                      msg.role === 'user' ? C.elevated : C.aiPurple + '12',
                    border: `1px solid ${
                      msg.role === 'user' ? C.border : C.aiPurple + '33'
                    }`,
                    color:
                      msg.role === 'user' ? C.textPrimary : C.textPrimary,
                    lineHeight: '1.5',
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div className="mb-1 flex items-center gap-1">
                      <Bot size={10} style={{ color: C.aiPurple }} />
                      <span
                        className="text-[9px] font-semibold uppercase"
                        style={{ color: C.aiPurple }}
                      >
                        NEXUS
                      </span>
                    </div>
                  )}
                  {msg.content}
                  {isStreaming &&
                    i === chatMessages.length - 1 &&
                    msg.role === 'assistant' && (
                      <span
                        className="ml-0.5 inline-block h-3 w-1"
                        style={{
                          backgroundColor: C.aiPurple,
                          animation: 'blink-cursor 0.8s step-end infinite',
                        }}
                      />
                    )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Ask NEXUS..."
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#3A3A4A]"
              style={{ color: C.textPrimary }}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !chatInput.trim()}
              className="flex items-center justify-center rounded p-1 transition-colors hover:bg-white/5 disabled:opacity-30"
              aria-label="Send message"
            >
              <Send size={14} style={{ color: C.aiPurple }} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 my-2 h-px" style={{ backgroundColor: C.border }} />

        {/* Section 4: Watch List */}
        <div className="px-4 pt-2 pb-4">
          <div
            className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: C.textSecondary }}
          >
            <Eye size={11} />
            Watch List
          </div>
          <div className="flex flex-col gap-1.5">
            {watchList.map((item) => (
              <WatchItem
                key={item.id}
                id={item.id}
                name={item.name}
                risk={item.risk}
                icon={item.icon}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ---- Keyframe animations ---- */}
      <style jsx global>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
