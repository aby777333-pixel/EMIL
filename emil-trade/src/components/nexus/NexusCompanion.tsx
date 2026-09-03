'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Sparkles, Shield, TrendingUp, TrendingDown,
  AlertTriangle, Heart, Target, BookOpen, BarChart3,
  Zap, Clock, Eye, MessageCircle, Volume2, VolumeX,
  ChevronDown, CheckCircle2, XCircle, Star, Award,
} from 'lucide-react';
import type {
  PreTradeBrief, NexusSignal, PsychologyAlert, WeeklyReport,
  TradeAlert, NexusSentiment,
} from '@/types/nexus';
import { pnlColor } from '@/lib/utils/format';

const SENTIMENT_STYLES: Record<NexusSentiment, { color: string; icon: React.ReactNode }> = {
  informational: { color: '#00b4ff', icon: <Brain className="h-3 w-3" /> },
  warning: { color: '#f59e0b', icon: <AlertTriangle className="h-3 w-3" /> },
  urgent: { color: '#ef4444', icon: <Shield className="h-3 w-3" /> },
  supportive: { color: '#8b5cf6', icon: <Heart className="h-3 w-3" /> },
  celebratory: { color: '#00dc82', icon: <Star className="h-3 w-3" /> },
};

interface NexusCompanionProps {
  preTradeBrief: PreTradeBrief | null;
  signals: NexusSignal[];
  psychologyAlerts: PsychologyAlert[];
  tradeAlerts: TradeAlert[];
  weeklyReport: WeeklyReport | null;
  onDismissAlert: (id: string) => void;
  onAcceptSignal: (id: string) => void;
  onAskNexus: (question: string) => void;
}

export function NexusCompanion({ preTradeBrief, signals, psychologyAlerts, tradeAlerts, weeklyReport, onDismissAlert, onAcceptSignal, onAskNexus }: NexusCompanionProps) {
  const [tab, setTab] = useState<'copilot' | 'signals' | 'psychology' | 'report'>('copilot');
  const [question, setQuestion] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState<string | null>(null);

  const handleAsk = () => {
    if (!question.trim()) return;
    onAskNexus(question.trim());
    setQuestion('');
  };

  const activeSignals = signals.filter(s => s.status === 'active');
  const activePsych = psychologyAlerts.filter(a => a.severity !== 'gentle');

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0d1520] to-[#0a0c10] rounded-xl border border-white/[0.06] overflow-hidden">
      {/* NEXUS Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-[#8b5cf6]/5 to-[#00b4ff]/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#00b4ff] flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00dc82] border-2 border-[#0d1520]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">NEXUS</h3>
            <p className="text-[9px] text-white/25">Your AI trading companion — always watching, always caring</p>
          </div>
          {activePsych.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-[#f59e0b]/10 text-[#f59e0b]">
              <AlertTriangle className="h-2.5 w-2.5" />{activePsych.length}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.04] px-1 pt-1">
        {([
          { key: 'copilot', label: 'Co-Pilot', icon: <Brain className="h-3 w-3" />, badge: preTradeBrief ? 1 : 0 },
          { key: 'signals', label: 'Signals', icon: <Target className="h-3 w-3" />, badge: activeSignals.length },
          { key: 'psychology', label: 'Coach', icon: <Heart className="h-3 w-3" />, badge: activePsych.length },
          { key: 'report', label: 'Report', icon: <BarChart3 className="h-3 w-3" />, badge: weeklyReport ? 1 : 0 },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium relative transition-colors ${
              tab === t.key ? 'text-white' : 'text-white/30'
            }`}>
            {t.icon}{t.label}
            {t.badge > 0 && (
              <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-[#8b5cf6] text-[7px] text-white flex items-center justify-center">{t.badge}</span>
            )}
            {tab === t.key && <motion.div layoutId="nexusTab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-[#8b5cf6] to-[#00b4ff] rounded-full" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {/* Co-Pilot Tab */}
        {tab === 'copilot' && (
          <>
            {/* Trade Alerts */}
            {tradeAlerts.map(alert => (
              <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`rounded-lg p-3 border ${
                  alert.severity === 'urgent' ? 'bg-[#ef4444]/5 border-[#ef4444]/20' :
                  alert.severity === 'warning' ? 'bg-[#f59e0b]/5 border-[#f59e0b]/20' :
                  'bg-white/[0.02] border-white/[0.06]'
                }`}>
                <div className="flex items-start gap-2">
                  <Sparkles className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                    alert.severity === 'urgent' ? 'text-[#ef4444]' : alert.severity === 'warning' ? 'text-[#f59e0b]' : 'text-[#00b4ff]'
                  }`} />
                  <div className="flex-1">
                    <p className="text-[11px] text-white/60 leading-relaxed">{alert.message}</p>
                    <span className="text-[9px] text-white/15">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <button onClick={() => onDismissAlert(alert.id)} className="text-white/10 hover:text-white/30">
                    <XCircle className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Pre-Trade Brief */}
            {preTradeBrief && (
              <div className="rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/[0.03] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-[#8b5cf6]" />
                  <span className="text-xs font-semibold text-white">Pre-Trade Analysis</span>
                  <span className={`ml-auto text-xs font-mono font-bold ${
                    preTradeBrief.verdict === 'proceed' ? 'text-[#00dc82]' :
                    preTradeBrief.verdict === 'consider_waiting' ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                  }`}>{preTradeBrief.confidence}%</span>
                </div>

                <p className="text-[11px] text-white/50">{preTradeBrief.chartAnalysis}</p>

                {preTradeBrief.marketContext.map((ctx, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-white/30">
                    <Zap className="h-2.5 w-2.5 text-[#f59e0b]" />{ctx}
                  </div>
                ))}

                {preTradeBrief.existingPositions.length > 0 && (
                  <div className="text-[10px] text-[#f59e0b]">
                    ⚠ You already have {preTradeBrief.existingPositions.map(p => `${p.count} ${p.symbol} ${p.direction}`).join(', ')}
                  </div>
                )}

                <div className="flex items-center gap-4 text-[10px]">
                  {preTradeBrief.suggestedSl && <span className="text-[#ef4444]">SL: {preTradeBrief.suggestedSl.toFixed(5)}</span>}
                  {preTradeBrief.suggestedTp && <span className="text-[#00dc82]">TP: {preTradeBrief.suggestedTp.toFixed(5)}</span>}
                  {preTradeBrief.rrRatio && <span className="text-white/30">R:R {preTradeBrief.rrRatio.toFixed(1)}</span>}
                  <span className="text-white/20">Risk: {preTradeBrief.riskPct.toFixed(1)}%</span>
                </div>

                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  preTradeBrief.verdict === 'proceed' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                  preTradeBrief.verdict === 'consider_waiting' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                  'bg-[#ef4444]/10 text-[#ef4444]'
                }`}>
                  {preTradeBrief.verdict === 'proceed' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   preTradeBrief.verdict === 'consider_waiting' ? <Clock className="h-3.5 w-3.5" /> :
                   <Shield className="h-3.5 w-3.5" />}
                  <span className="text-xs font-medium capitalize">{preTradeBrief.verdict.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] opacity-60 ml-1">{preTradeBrief.verdictReason}</span>
                </div>

                <p className="text-[8px] text-white/10 leading-relaxed">
                  ⚠️ This is an AI-generated analysis, NOT financial advice. Past performance does not guarantee future results. Risk only what you can afford to lose.
                </p>
              </div>
            )}

            {tradeAlerts.length === 0 && !preTradeBrief && (
              <div className="text-center py-8">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
                  <Brain className="h-10 w-10 text-[#8b5cf6]/20 mx-auto mb-3" />
                </motion.div>
                <p className="text-xs text-white/20">NEXUS is watching the markets for you</p>
                <p className="text-[10px] text-white/10 mt-1">Ask anything or open a trade to activate co-pilot</p>
              </div>
            )}
          </>
        )}

        {/* Signals Tab */}
        {tab === 'signals' && (
          <>
            {activeSignals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/20">No active signals right now</p>
                <p className="text-[10px] text-white/10">NEXUS scans every 5 minutes</p>
              </div>
            ) : activeSignals.map(signal => (
              <div key={signal.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${signal.direction === 'buy' ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
                      {signal.direction.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">{signal.symbol}</span>
                    <span className="text-[9px] text-white/20">{signal.timeframe}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: signal.confidence >= 75 ? '#00dc82' : '#f59e0b' }}>{signal.confidence}%</span>
                </div>
                <p className="text-[11px] text-white/50">{signal.setupName}</p>
                <div className="flex gap-2 text-[9px] font-mono">
                  <span className="text-white/30">Entry: {signal.suggestedEntry.toFixed(5)}</span>
                  <span className="text-[#ef4444]">SL: {signal.suggestedSl.toFixed(5)}</span>
                  <span className="text-[#00dc82]">TP: {signal.suggestedTp[0]?.toFixed(5)}</span>
                </div>
                <div className="text-[9px] text-white/20">Win rate: {signal.historicalWinRate}% ({signal.historicalSampleSize} trades)</div>

                {showDisclaimer === signal.id ? (
                  <div className="space-y-2">
                    <p className="text-[8px] text-white/15 leading-relaxed">⚠️ This is an AI-generated analysis, NOT financial advice. Past performance does not guarantee future results. Risk only what you can afford to lose.</p>
                    <button onClick={() => { onAcceptSignal(signal.id); setShowDisclaimer(null); }}
                      className="w-full py-1.5 rounded text-[10px] bg-[#00b4ff] text-white font-medium">
                      I understand the risks — View Full Signal
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowDisclaimer(signal.id)}
                    className="w-full py-1.5 rounded text-[10px] bg-white/5 text-white/30 hover:bg-white/10">
                    View Signal Details
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {/* Psychology Tab */}
        {tab === 'psychology' && (
          <>
            {psychologyAlerts.map(alert => (
              <div key={alert.id} className={`rounded-lg p-3 border ${
                alert.severity === 'crisis' ? 'bg-[#ef4444]/5 border-[#ef4444]/20' :
                alert.severity === 'urgent' ? 'bg-[#f59e0b]/5 border-[#f59e0b]/20' :
                alert.severity === 'firm' ? 'bg-[#8b5cf6]/5 border-[#8b5cf6]/20' :
                'bg-white/[0.02] border-white/[0.06]'
              }`}>
                <div className="flex items-start gap-2 mb-2">
                  <Heart className={`h-3.5 w-3.5 mt-0.5 ${
                    alert.severity === 'crisis' ? 'text-[#ef4444]' :
                    alert.severity === 'urgent' ? 'text-[#f59e0b]' : 'text-[#8b5cf6]'
                  }`} />
                  <div>
                    <p className="text-[11px] text-white/60 leading-relaxed">{alert.message}</p>
                    <p className="text-[10px] text-[#00b4ff] mt-1">{alert.suggestion}</p>
                  </div>
                </div>
                {alert.dataPoints.length > 0 && (
                  <div className="flex gap-3 mt-2 text-[9px]">
                    {alert.dataPoints.map(dp => (
                      <span key={dp.metric} className="text-white/20">{dp.metric}: <span className="text-white/40">{dp.value}</span> (avg: {dp.normal})</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {psychologyAlerts.length === 0 && (
              <div className="text-center py-8">
                <Heart className="h-8 w-8 text-[#00dc82]/20 mx-auto mb-2" />
                <p className="text-xs text-[#00dc82]/50">All clear — you're trading with discipline</p>
              </div>
            )}
          </>
        )}

        {/* Weekly Report Tab */}
        {tab === 'report' && weeklyReport && (
          <div className="space-y-3">
            <div className="text-center py-2">
              <Award className="h-6 w-6 text-[#f59e0b] mx-auto mb-1" />
              <h4 className="text-xs font-semibold text-white">Weekly Performance Report</h4>
              <p className="text-[9px] text-white/20">{weeklyReport.weekStart} — {weeklyReport.weekEnd}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5 text-center">
                <div className={`text-sm font-mono font-bold ${pnlColor(weeklyReport.pnl)}`}>
                  {weeklyReport.pnl >= 0 ? '+' : ''}${weeklyReport.pnl.toFixed(2)}
                </div>
                <div className="text-[8px] text-white/20">P&L</div>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5 text-center">
                <div className="text-sm font-mono font-bold text-white/60">{weeklyReport.winRate.toFixed(0)}%</div>
                <div className="text-[8px] text-white/20">Win Rate</div>
              </div>
            </div>

            <div className="bg-[#00dc82]/5 border border-[#00dc82]/10 rounded-lg p-3">
              <div className="text-[9px] text-[#00dc82] mb-1">Best Trade</div>
              <p className="text-[11px] text-white/50">{weeklyReport.bestTrade.symbol}: +${weeklyReport.bestTrade.pnl.toFixed(2)}</p>
              <p className="text-[10px] text-white/25 mt-0.5">{weeklyReport.bestTrade.lesson}</p>
            </div>

            <div className="bg-[#ef4444]/5 border border-[#ef4444]/10 rounded-lg p-3">
              <div className="text-[9px] text-[#ef4444] mb-1">Lesson Learned</div>
              <p className="text-[11px] text-white/50">{weeklyReport.worstTrade.symbol}: ${weeklyReport.worstTrade.pnl.toFixed(2)}</p>
              <p className="text-[10px] text-white/25 mt-0.5">{weeklyReport.worstTrade.lesson}</p>
            </div>

            <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/10 rounded-lg p-3">
              <div className="text-[9px] text-[#8b5cf6] mb-1">Psychology Insight</div>
              <p className="text-[11px] text-white/40">{weeklyReport.psychologyInsight}</p>
            </div>

            <div className="bg-[#00b4ff]/5 border border-[#00b4ff]/10 rounded-lg p-3">
              <div className="text-[9px] text-[#00b4ff] mb-1">This Week's Goal</div>
              <p className="text-[11px] text-white/50">{weeklyReport.weeklyGoal}</p>
            </div>

            <div className="text-center py-2">
              <p className="text-[11px] text-white/30 italic">{weeklyReport.motivationalMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Ask NEXUS */}
      <div className="px-3 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-2">
          <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="Ask NEXUS anything..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 focus:border-[#8b5cf6] focus:outline-none" />
          <button onClick={handleAsk} disabled={!question.trim()}
            className="p-2 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#00b4ff] text-white disabled:opacity-30">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
