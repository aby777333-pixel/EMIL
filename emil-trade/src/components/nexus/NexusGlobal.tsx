'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { NexusOrb } from '@/components/nexus/NexusOrb';
import {
  Brain, Send, X, Sparkles, Target, Shield, BarChart3,
  TrendingUp, Heart, Clock, Lightbulb, User,
} from 'lucide-react';
import type { NexusSentiment } from '@/types/nexus';
import { evaluateTraderProactiveMessages, evaluateBrokerProactiveMessages } from '@/lib/nexus/nexus-proactive';
import { NexusAgreementModal } from '@/components/nexus/NexusAgreementModal';
import { isNexusAgreementAccepted, recordNexusAgreement } from '@/lib/nexus/nexus-agreement';
import { buildNexusContext, contextToText } from '@/lib/nexus/market-context';
import {
  loadActiveConfig, saveActiveConfig, loadAlertFeed, dismissAlert, clearAlertFeed,
  runActiveScan, SEVERITY_STYLES, type ActiveNexusConfig, type NexusAlert,
} from '@/lib/nexus/alert-engine';
import { Bell, ShieldCheck, Volume2, VolumeX } from 'lucide-react';

interface NexusMessage {
  id: string;
  text: string;
  sentiment: NexusSentiment;
  timestamp: string;
  isDismissed: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'nexus';
  text: string;
  timestamp: string;
}

const EXCLUDED_PATHS = [
  '/', '/auth/login', '/auth/register', '/auth/callback',
  '/pricing', '/about', '/contact', '/blog', '/changelog',
  '/privacy', '/terms', '/risk-disclosure', '/partners',
  '/developer', '/onboarding', '/sandbox', '/status',
];

const QUICK_ACTIONS: { label: string; prompt: string; icon: ReactNode; special?: 'mark-zone' }[] = [
  { label: 'Entry Zone', prompt: 'Where is the best entry zone for my active symbol right now?', icon: <Target className="h-3 w-3" /> },
  { label: 'Mark Zone on Chart', prompt: '', special: 'mark-zone', icon: <Target className="h-3 w-3" /> },
  { label: 'Manage Trades', prompt: 'Should I hold or exit my open positions? Give me management suggestions.', icon: <Shield className="h-3 w-3" /> },
  { label: 'Market State', prompt: 'What is the current market state for my active symbol?', icon: <TrendingUp className="h-3 w-3" /> },
  { label: 'Trade Ideas', prompt: 'Give me 3 trade setups right now', icon: <Lightbulb className="h-3 w-3" /> },
  { label: 'Analyze Position', prompt: 'Analyze my open positions and risk', icon: <Shield className="h-3 w-3" /> },
  { label: 'SL/TP Suggestion', prompt: 'Where should my stop loss and take profit be?', icon: <Target className="h-3 w-3" /> },
  { label: 'Daily Briefing', prompt: 'Give me my daily briefing', icon: <BarChart3 className="h-3 w-3" /> },
  { label: 'Review Last Trade', prompt: 'Let\'s debrief my last closed trade', icon: <Clock className="h-3 w-3" /> },
  { label: 'Pre-trade Check', prompt: 'Run pre-trade checklist for my current setup', icon: <TrendingUp className="h-3 w-3" /> },
];

function getContextMessage(pathname: string): NexusMessage | null {
  const now = new Date().toISOString();
  if (pathname.startsWith('/dashboard/positions') || pathname.startsWith('/dashboard/terminal'))
    return { id: 'ctx-pos', text: 'I\'m monitoring your open positions. I\'ll alert you if anything needs attention.', sentiment: 'informational', timestamp: now, isDismissed: false };
  if (pathname.startsWith('/dashboard/nexus') || pathname.startsWith('/dashboard/ai-copilot'))
    return null;
  if (pathname.startsWith('/converter'))
    return { id: 'ctx-conv', text: 'Upload your MQL5 files and I\'ll help analyze the conversion results and flag any risk concerns.', sentiment: 'informational', timestamp: now, isDismissed: false };
  if (pathname.startsWith('/dashboard/prop-challenge'))
    return { id: 'ctx-prop', text: 'I\'m tracking your challenge progress. Stay disciplined — I\'ll warn you if you approach any limits.', sentiment: 'supportive', timestamp: now, isDismissed: false };
  if (pathname.startsWith('/marketplace'))
    return { id: 'ctx-mkt', text: 'I can review any script\'s risk profile before you install it. Just ask.', sentiment: 'informational', timestamp: now, isDismissed: false };
  if (pathname.startsWith('/broker/dealing-desk'))
    return { id: 'ctx-desk', text: 'I\'m monitoring order flow and exposure. I\'ll flag any routing recommendations or risk concerns.', sentiment: 'informational', timestamp: now, isDismissed: false };
  if (pathname.startsWith('/broker/command-center'))
    return { id: 'ctx-cmd', text: 'Good to see you. I\'ve prepared your daily briefing — ask me what needs attention today.', sentiment: 'informational', timestamp: now, isDismissed: false };
  return null;
}

/**
 * Call the real NEXUS API endpoint which proxies to Claude
 */
async function callNexusAPI(userMessage: string, conversationHistory: ChatMessage[]): Promise<string> {
  try {
    // Real platform context (live quotes + actual open positions) rides along
    // with every message so NEXUS answers about THIS trader's situation.
    let context = '';
    try { context = contextToText(await buildNexusContext()); } catch { /* context optional */ }
    const res = await fetch('/api/nexus/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        context,
        history: conversationHistory.slice(-10).map(m => ({
          role: m.role === 'nexus' ? 'assistant' : 'user',
          content: m.text,
        })),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return (err as Record<string, string>).fallback ?? 'I\'m having trouble connecting right now. Please try again in a moment.';
    }

    const data = await res.json();
    return data.response ?? 'I received your message but couldn\'t generate a response. Try rephrasing your question.';
  } catch {
    return 'Connection issue — I\'m temporarily offline. Please try again shortly.';
  }
}

export function NexusGlobal() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<NexusMessage[]>([]);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Mandatory NEXUS User Agreement — panel content is gated until accepted.
  const [agreementAccepted, setAgreementAccepted] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Real session length for the proactive engine (marathon-session warnings).
  const sessionStartRef = useRef<number>(Date.now());
  // Active NEXUS Mode (additive super-prompt §1/§21): continuous monitoring,
  // switchable, with Observe (feed-only) vs Alert (feed + pop-ups) levels.
  const [activeCfg, setActiveCfg] = useState<ActiveNexusConfig>({ enabled: false, level: 'alert' });
  const [alertFeed, setAlertFeed] = useState<NexusAlert[]>([]);
  const [showAlertCenter, setShowAlertCenter] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);
  useEffect(() => { setActiveCfg(loadActiveConfig()); setAlertFeed(loadAlertFeed()); }, []);

  const updateActiveCfg = (patch: Partial<ActiveNexusConfig>) => {
    setActiveCfg(prev => { const next = { ...prev, ...patch }; saveActiveConfig(next); return next; });
  };

  const runScan = async (manual = false) => {
    try {
      const ctx = await buildNexusContext();
      const { feed, fresh } = runActiveScan(ctx);
      setAlertFeed([...feed]);
      if (manual) {
        setScanNote(fresh.length > 0
          ? `Scan complete — ${fresh.length} new alert(s).`
          : `Scan complete — no new alerts. Watching ${ctx.quotes.length} symbol(s), ${ctx.positions.length} open position(s)${ctx.marketState ? `, ${ctx.marketState.symbol} state "${ctx.marketState.state}" unchanged` : ''}.`);
      }
      // Level 2 (Alert): surface fresh alerts as orb pop-ups too.
      if (activeCfg.level === 'alert' && fresh.length > 0) {
        const top = [...fresh].sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1))[0];
        const sentiment: NexusSentiment = top.severity === 'critical' ? 'urgent' : top.severity === 'warning' ? 'warning' : top.severity === 'opportunity' ? 'celebratory' : 'informational';
        setMessages(prev => prev.some(m => m.id === top.id) ? prev
          : [{ id: top.id, text: top.title, sentiment, timestamp: new Date().toISOString(), isDismissed: false }, ...prev]);
        // §19 Voice Alert Mode: speak warning/critical alerts when enabled.
        if (activeCfg.voice && (top.severity === 'critical' || top.severity === 'warning')) {
          try {
            const u = new SpeechSynthesisUtterance(`${top.severity === 'critical' ? 'Warning. ' : ''}${top.title}`);
            window.speechSynthesis.speak(u);
          } catch { /* voice unsupported — silent */ }
        }
      }
    } catch { if (manual) setScanNote('Scan failed — platform data unavailable on this page.'); }
  };

  const isExcluded = EXCLUDED_PATHS.includes(pathname) || pathname.startsWith('/features/');

  // Continuous monitoring loop (async, non-blocking, only while enabled).
  useEffect(() => {
    if (isExcluded || !activeCfg.enabled) return;
    void runScan();
    const t = setInterval(() => { void runScan(); }, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCfg.enabled, activeCfg.level, isExcluded, pathname]);

  useEffect(() => {
    if (isExcluded) return;
    const ctxMsg = getContextMessage(pathname);
    if (ctxMsg) {
      setMessages(prev => {
        if (prev.some(m => m.id === ctxMsg.id && !m.isDismissed)) return prev;
        return [ctxMsg, ...prev.filter(m => m.id !== ctxMsg.id)];
      });
    }
  }, [pathname, isExcluded]);

  // Proactive intelligence — NEXUS voluntarily provides alerts
  useEffect(() => {
    if (isExcluded || isSnoozed) return;

    const evaluateProactive = () => {
      const isBrokerPage = pathname.startsWith('/broker');

      if (isBrokerPage) {
        // B2B proactive messages (mock context — replace with real data)
        const brokerMessages = evaluateBrokerProactiveMessages({
          netExposurePct: 45, exposureLimit: 50000000,
          marginCallClients: 2,
          lpFillRates: [{ name: 'LMAX', fillRate: 99.4 }, { name: 'Integral', fillRate: 92.1 }],
          churnRiskClients: [{ name: 'Client Alpha', probability: 78 }],
          revenueToday: 28000, revenueYesterdaySameTime: 34000,
          pendingWithdrawals: 12,
          regulatoryDeadlines: [{ name: 'MiFID II ARM', daysRemaining: 3 }],
          ibDeclines: [{ name: 'TradeSchool', declinePct: 42 }],
          toxicFlowAlerts: 1,
        });
        if (brokerMessages.length > 0) {
          const top = brokerMessages[0];
          setMessages(prev => {
            if (prev.some(m => m.id === top.id)) return prev;
            return [{ id: top.id, text: top.message, sentiment: top.sentiment, timestamp: new Date().toISOString(), isDismissed: false }, ...prev];
          });
        }
      } else {
        // B2C proactive messages driven by the trader's REAL positions.
        // Stats the platform can't source yet (trade counts, drawdown %) are
        // passed as neutral values that cannot trigger false alerts.
        void (async () => {
          try {
            const ctx = await buildNexusContext();
            let watchlist: string[] = [];
            try { watchlist = JSON.parse(localStorage.getItem('raptor_watchlist_symbols') || '[]'); } catch { /* ignore */ }
            const perf = ctx.performance;
            const traderMessages = evaluateTraderProactiveMessages({
              openPositions: ctx.positions.map(p => ({
                symbol: p.symbol, pnl: p.floatingPnl, direction: p.direction,
                volume: p.size, openTime: '', stopLoss: p.sl,
              })),
              sessionMinutes: Math.round((Date.now() - sessionStartRef.current) / 60000),
              // Real closed-trade stats — the overtrading and revenge-trading
              // detectors now run on the trader's actual history.
              tradesToday: perf?.tradesToday ?? 0,
              avgTradesPerDay: perf?.avgTradesPerDay || 4,
              consecutiveLosses: perf?.currentLossStreak ?? 0,
              lastPositionSize: perf?.lastSize ?? 0,
              avgPositionSize: perf?.avgSize ?? 0,
              currentDrawdownPct: 0, watchlist,
              upcomingEvents: [], dayOfWeek: new Date().getDay(), hour: new Date().getHours(),
            });
            if (traderMessages.length > 0) {
              const top = traderMessages[0];
              setMessages(prev => {
                if (prev.some(m => m.id === top.id)) return prev;
                return [{ id: top.id, text: top.message, sentiment: top.sentiment, timestamp: new Date().toISOString(), isDismissed: false }, ...prev];
              });
            }
          } catch { /* proactive is best-effort */ }
        })();
      }
    };

    // Evaluate on mount and every 5 minutes
    const timer = setInterval(evaluateProactive, 300000);
    evaluateProactive();
    return () => clearInterval(timer);
  }, [pathname, isExcluded, isSnoozed]);

  useEffect(() => {
    if (snoozeUntil && Date.now() < snoozeUntil) {
      setIsSnoozed(true);
      const timer = setTimeout(() => { setIsSnoozed(false); setSnoozeUntil(null); }, snoozeUntil - Date.now());
      return () => clearTimeout(timer);
    }
  }, [snoozeUntil]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages.length, isTyping]);

  // NOTE: the isExcluded early-return lives BELOW every hook (see before the
  // JSX return) — returning here would change React's hook order when the
  // route flips between excluded/included pages and crash the tree.
  const handleSnooze = (minutes: number) => { setSnoozeUntil(Date.now() + minutes * 60 * 1000); setIsSnoozed(true); };
  const handleDismiss = (id: string) => { setMessages(prev => prev.map(m => m.id === id ? { ...m, isDismissed: true } : m)); };

  const handleOpen = () => {
    setIsPanelOpen(true);
    setAgreementAccepted(isNexusAgreementAccepted());
    if (chatMessages.length === 0) {
      setChatMessages([{
        id: 'welcome',
        role: 'nexus',
        text: 'Hey! I\'m NEXUS, your AI trading companion. I can analyze setups, review positions, coach your psychology, or just chat about markets. What would you like to explore?',
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  // §16: draw the computed entry zone directly on the RAPTOR chart as
  // NEXUS price lines (entry / stop / T1 / T2). ChartPanel acks with a
  // nexus-zone-marked event so the confirmation is honest, not assumed.
  const handleMarkZone = async () => {
    if (isTyping) return;
    setIsTyping(true);
    try {
      const ctx = await buildNexusContext();
      const z = ctx.entryZone;
      const say = (text: string) =>
        setChatMessages(prev => [...prev, { id: `n-${Date.now()}`, role: 'nexus', text, timestamp: new Date().toISOString() }]);
      if (z && 'direction' in z) {
        // Markers can only draw on the native RAPTOR chart — the TradingView
        // embed is a sealed cross-origin iframe. Ask the switcher to show the
        // RAPTOR chart, then retry the mark until the chart acks (mount takes
        // a moment when switching tabs).
        window.dispatchEvent(new CustomEvent('nexus-ensure-raptor'));
        let count = 0;
        const ack = (e: Event) => { count = (e as CustomEvent<{ count: number }>).detail?.count ?? 0; };
        window.addEventListener('nexus-zone-marked', ack);
        const detail = {
          symbol: z.symbol,
          levels: [
            { price: z.preferred, label: `NEXUS ${z.direction} entry`, color: '#8b5cf6' },
            { price: z.stop, label: 'NEXUS stop', color: '#ef4444' },
            { price: z.target1, label: 'NEXUS T1', color: '#00dc82' },
            { price: z.target2, label: 'NEXUS T2', color: '#00b47f' },
          ],
        };
        for (let attempt = 0; attempt < 12 && count === 0; attempt++) {
          window.dispatchEvent(new CustomEvent('nexus-mark-zone', { detail }));
          await new Promise(r => setTimeout(r, 350));
        }
        window.removeEventListener('nexus-zone-marked', ack);
        say(count > 0
          ? `Zone marked on the RAPTOR chart for ${z.symbol} — ${count} levels drawn: ${z.direction} entry ${z.preferred}, stop ${z.stop}, targets ${z.target1} / ${z.target2} (confidence ${z.confidence}%). I switched you to the RAPTOR chart if you were on TradingView — the TV embed is a third-party iframe I can't draw inside. Your own drawings are untouched; the markers clear when you switch symbols.\n\n⚠️ Levels come from live platform bars — a plan, not a promise.`
          : `I computed a ${z.direction} zone for ${z.symbol} (entry ${z.preferred}, stop ${z.stop}) but no RAPTOR chart acknowledged the markers — open the terminal page and try again.`);
      } else if (z && 'reason' in z) {
        say(`No zone to mark right now: ${z.reason} I won't draw levels I can't defend with evidence.`);
      } else {
        say('I can only mark zones on the terminal page, where the live bar engine runs. Open the terminal and try again.');
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: text.trim(), timestamp: new Date().toISOString() };
    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setInput('');
    setIsTyping(true);

    const response = await callNexusAPI(text.trim(), updatedHistory);
    setChatMessages(prev => [...prev, { id: `n-${Date.now()}`, role: 'nexus', text: response, timestamp: new Date().toISOString() }]);
    setIsTyping(false);
  };

  // Other modules (e.g. the Trade Journal's "NEXUS review") can hand a
  // question to NEXUS: open the panel and send it. Ref keeps the listener
  // stable while always calling the latest handlers. NOTE: declared BELOW
  // handleOpen/handleSend on purpose (TDZ).
  const askRef = useRef({ open: handleOpen, send: handleSend });
  askRef.current = { open: handleOpen, send: handleSend };
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      askRef.current.open();
      if (!q) return; // open-only (command palette "Open NEXUS")
      setTimeout(() => { void askRef.current.send(q); }, 250);
    };
    window.addEventListener('nexus-ask', onAsk);
    return () => window.removeEventListener('nexus-ask', onAsk);
  }, []);

  if (isExcluded) return null;

  return (
    <>
      {/* NEXUS Orb */}
      <NexusOrb
        messages={messages}
        isSnoozed={isSnoozed}
        onSnooze={handleSnooze}
        onDismissMessage={handleDismiss}
        onOpen={handleOpen}
      />

      {/* NEXUS Slide-Out Chat Panel — opens on current page */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0a0c10] border-l border-white/[0.06] z-[61] flex flex-col shadow-2xl"
            >
              {!agreementAccepted ? (
                <NexusAgreementModal
                  onAgree={() => { recordNexusAgreement(); setAgreementAccepted(true); }}
                  onDecline={() => setIsPanelOpen(false)}
                />
              ) : (
              <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-[#8b5cf6]/5 to-[#00b4ff]/5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#00b4ff] flex items-center justify-center">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00dc82] border-2 border-[#0a0c10]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">NEXUS</h3>
                    <p className="text-[9px] text-white/25">AI Trading Companion — always here for you</p>
                  </div>
                </div>
                <button onClick={() => setIsPanelOpen(false)} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Active NEXUS controls (§1/§21): switchable monitoring + Alert Center */}
              <div className="flex items-center gap-2 border-b border-white/[0.04] bg-white/[0.015] px-4 py-2">
                <button
                  onClick={() => updateActiveCfg({ enabled: !activeCfg.enabled })}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors"
                  style={{
                    backgroundColor: activeCfg.enabled ? 'rgba(0,220,130,0.12)' : 'rgba(255,255,255,0.05)',
                    color: activeCfg.enabled ? '#00dc82' : 'rgba(255,255,255,0.35)',
                    border: `1px solid ${activeCfg.enabled ? 'rgba(0,220,130,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                  title={activeCfg.enabled ? 'Active NEXUS is monitoring — click to switch off' : 'Enable continuous monitoring (state changes, trade guardian, spread anomalies)'}
                >
                  <ShieldCheck className="h-3 w-3" /> Active {activeCfg.enabled ? 'ON' : 'OFF'}
                </button>
                {activeCfg.enabled && (
                  <select
                    value={activeCfg.level}
                    onChange={(e) => updateActiveCfg({ level: e.target.value as ActiveNexusConfig['level'] })}
                    className="rounded border bg-[#0a0c10] px-1.5 py-1 text-[10px] text-white/60 outline-none"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                    title="Observe = feed only. Alert = feed + pop-ups."
                  >
                    <option value="observe">Observe</option>
                    <option value="alert">Alert</option>
                  </select>
                )}
                {activeCfg.enabled && activeCfg.level === 'alert' && (
                  <button
                    onClick={() => updateActiveCfg({ voice: !activeCfg.voice })}
                    title={activeCfg.voice ? 'Voice alerts ON — warning/critical alerts are spoken' : 'Enable spoken alerts for warning/critical severity'}
                    className="rounded-full p-1.5 transition-colors"
                    style={{ color: activeCfg.voice ? '#00dc82' : 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {activeCfg.voice ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setShowAlertCenter(v => !v)}
                  className="relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors"
                  style={{
                    backgroundColor: showAlertCenter ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
                    color: showAlertCenter ? '#8b5cf6' : 'rgba(255,255,255,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Bell className="h-3 w-3" /> Alerts
                  {alertFeed.filter(a => !a.dismissed).length > 0 && (
                    <span className="flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[8px] text-white">
                      {alertFeed.filter(a => !a.dismissed).length}
                    </span>
                  )}
                </button>
              </div>

              {showAlertCenter ? (
              /* NEXUS Alert Center (§23) */
              <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
                <div className="mb-2 flex items-center gap-2">
                  <button onClick={() => void runScan(true)}
                    className="rounded px-2.5 py-1 text-[10px] font-bold text-black" style={{ backgroundColor: '#8b5cf6' }}>
                    Run check now
                  </button>
                  <button onClick={() => { clearAlertFeed(); setAlertFeed([]); setScanNote(null); }}
                    className="rounded px-2.5 py-1 text-[10px] text-white/40 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    Clear all
                  </button>
                </div>
                {scanNote && <div className="mb-2 rounded-md border border-[#8b5cf6]/25 bg-[#8b5cf6]/5 px-2.5 py-1.5 text-[10px] text-white/60">{scanNote}</div>}
                {alertFeed.length === 0 && (
                  <div className="py-8 text-center text-[11px] text-white/25">
                    No alerts yet. {activeCfg.enabled ? 'Active NEXUS is watching — alerts appear here when real conditions trigger them.' : 'Enable Active NEXUS to start continuous monitoring.'}
                  </div>
                )}
                {alertFeed.map(a => (
                  <div key={a.id} className="mb-2 rounded-lg border p-2.5"
                    style={{ borderColor: `${SEVERITY_STYLES[a.severity].color}33`, backgroundColor: `${SEVERITY_STYLES[a.severity].color}08`, opacity: a.dismissed ? 0.45 : 1 }}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase"
                        style={{ backgroundColor: `${SEVERITY_STYLES[a.severity].color}22`, color: SEVERITY_STYLES[a.severity].color }}>
                        {SEVERITY_STYLES[a.severity].label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <button onClick={() => setExpandedAlert(expandedAlert === a.id ? null : a.id)} className="text-left text-[11px] leading-snug text-white/75 hover:text-white">
                          {a.title}
                        </button>
                        <div className="mt-0.5 text-[8px] text-white/25">{new Date(a.ts).toLocaleTimeString()} · {a.source}{a.confidence != null ? ` · confidence ${a.confidence}%` : ''}</div>
                        {expandedAlert === a.id && (
                          <div className="mt-1.5 text-[10px] leading-relaxed text-white/50">
                            {a.detail}
                            {a.evidence && a.evidence.length > 0 && (
                              <ul className="mt-1 space-y-0.5">
                                {a.evidence.map((e, i) => <li key={i} className="text-[9px] text-white/35">• {e}</li>)}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                      {!a.dismissed && (
                        <button onClick={() => setAlertFeed(dismissAlert(a.id))} className="shrink-0 text-white/20 hover:text-white/60">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              ) : (
              <>
              {/* Chat Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'nexus' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8b5cf6]/30 to-[#00b4ff]/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Brain className="h-3.5 w-3.5 text-[#8b5cf6]" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#00b4ff]/10 text-white/80 border border-[#00b4ff]/20 rounded-tr-sm'
                        : 'bg-white/[0.03] text-white/60 border border-white/[0.06] rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-white/30" />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8b5cf6]/30 to-[#00b4ff]/30 flex items-center justify-center">
                      <Brain className="h-3.5 w-3.5 text-[#8b5cf6] animate-pulse" />
                    </div>
                    <div className="flex gap-1 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="px-4 py-2 border-t border-white/[0.04]">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {QUICK_ACTIONS.map(qa => (
                    <button
                      key={qa.label}
                      onClick={() => (qa.special === 'mark-zone' ? handleMarkZone() : handleSend(qa.prompt))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
                    >
                      {qa.icon}
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                    placeholder="Ask NEXUS anything..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:border-[#8b5cf6] focus:outline-none"
                  />
                  <button
                    onClick={() => handleSend(input)}
                    disabled={!input.trim() || isTyping}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#00b4ff] text-white transition-opacity disabled:opacity-30"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[8px] text-white/10 text-center mt-2">
                  NEXUS provides AI analysis, not financial advice. Trading involves risk.
                </p>
              </div>
              </>
              )}
              </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
