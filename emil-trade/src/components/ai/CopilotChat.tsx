'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Sparkles, User, Settings,
  TrendingUp, Target, Clock, AlertCircle, ChevronDown,
  Lightbulb, Shield, BarChart3,
} from 'lucide-react';
import type { CopilotMessage, PersonalizedInsight, TraderProfile } from '@/types/ai';

const QUICK_ACTIONS = [
  { label: 'Trade Ideas', prompt: 'Give me 3 trade setups right now', icon: <Lightbulb className="h-3 w-3" /> },
  { label: 'Analyze Position', prompt: 'Analyze my open positions and risk', icon: <Shield className="h-3 w-3" /> },
  { label: 'SL/TP Suggestion', prompt: 'Where should my stop loss be?', icon: <Target className="h-3 w-3" /> },
  { label: 'Market Briefing', prompt: 'Give me a quick market briefing', icon: <BarChart3 className="h-3 w-3" /> },
  { label: 'Pre-trade Check', prompt: 'Run pre-trade checklist for my current chart', icon: <TrendingUp className="h-3 w-3" /> },
  { label: 'Review Last Trade', prompt: 'Let\'s debrief my last closed trade', icon: <Clock className="h-3 w-3" /> },
];

interface CopilotChatProps {
  messages: CopilotMessage[];
  insights: PersonalizedInsight[];
  profile: TraderProfile | null;
  onSend: (message: string) => void;
  onUpdateProfile: (profile: Partial<TraderProfile>) => void;
  isLoading: boolean;
}

export function CopilotChat({ messages, insights, profile, onSend, onUpdateProfile, isLoading }: CopilotChatProps) {
  const [input, setInput] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [tab, setTab] = useState<'chat' | 'insights'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleQuickAction = (prompt: string) => {
    onSend(prompt);
  };

  const unreadInsights = insights.filter(i => !('isRead' in i && i.isRead));

  return (
    <div className="flex flex-col h-full bg-white/[0.01] rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#8b5cf6]/20 to-[#00b4ff]/20">
            <Brain className="h-4 w-4 text-[#8b5cf6]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">RAPTOR ASSIST</h3>
            <p className="text-[9px] text-white/25">AI Trading Copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
            <button onClick={() => setTab('chat')}
              className={`px-2 py-1 rounded text-[10px] ${tab === 'chat' ? 'bg-white/10 text-white' : 'text-white/30'}`}>Chat</button>
            <button onClick={() => setTab('insights')}
              className={`px-2 py-1 rounded text-[10px] relative ${tab === 'insights' ? 'bg-white/10 text-white' : 'text-white/30'}`}>
              Insights
              {unreadInsights.length > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#8b5cf6] text-[7px] text-white flex items-center justify-center">{unreadInsights.length}</span>}
            </button>
          </div>
          <button onClick={() => setShowProfile(!showProfile)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-white/50">
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Profile Panel */}
      <AnimatePresence>
        {showProfile && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-b border-white/[0.06]">
            <div className="p-3 space-y-2 bg-white/[0.02]">
              <div className="text-[10px] text-white/30 font-medium">Trading Profile</div>
              <div className="grid grid-cols-2 gap-2">
                <select value={profile?.tradingStyle ?? 'mixed'}
                  onChange={e => onUpdateProfile({ tradingStyle: e.target.value as TraderProfile['tradingStyle'] })}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/60 focus:outline-none">
                  {['scalper','day_trader','swing','position','mixed'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
                <select value={profile?.riskTolerance ?? 'moderate'}
                  onChange={e => onUpdateProfile({ riskTolerance: e.target.value as TraderProfile['riskTolerance'] })}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/60 focus:outline-none">
                  {['conservative','moderate','aggressive'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <textarea
                placeholder="Custom instructions: e.g. 'Only suggest swing setups, minimum 2:1 RR'"
                value={profile?.customInstructions ?? ''}
                onChange={e => onUpdateProfile({ customInstructions: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/50 placeholder:text-white/15 h-14 resize-none focus:outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tab === 'chat' ? (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-[#8b5cf6]/20 mx-auto mb-3" />
                <p className="text-sm text-white/30">Ask anything about your trading</p>
                <p className="text-[10px] text-white/15 mt-1">I know your positions, history, and market context</p>
              </div>
            )}
            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="h-3 w-3 text-[#8b5cf6]" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#00b4ff]/10 text-white/80 border border-[#00b4ff]/20'
                    : 'bg-white/[0.03] text-white/60 border border-white/[0.06]'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3 w-3 text-white/30" />
                  </div>
                )}
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
                  <Brain className="h-3 w-3 text-[#8b5cf6] animate-pulse" />
                </div>
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-white/[0.04]">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {QUICK_ACTIONS.map(qa => (
                <button key={qa.label} onClick={() => handleQuickAction(qa.prompt)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[9px] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0">
                  {qa.icon}{qa.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask RAPTOR anything..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 focus:border-[#8b5cf6] focus:outline-none"
              />
              <button onClick={handleSend} disabled={!input.trim() || isLoading}
                className="p-2 rounded-lg bg-[#8b5cf6] hover:bg-[#8b5cf6]/80 text-white transition-colors disabled:opacity-30">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Insights Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {insights.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/20">No insights yet — keep trading!</div>
          ) : insights.map(insight => (
            <motion.div key={insight.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className={`rounded-lg p-3 border ${
                insight.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                insight.severity === 'warning' ? 'bg-[#f59e0b]/5 border-[#f59e0b]/20' :
                insight.severity === 'suggestion' ? 'bg-[#8b5cf6]/5 border-[#8b5cf6]/20' :
                'bg-white/[0.02] border-white/[0.06]'
              }`}>
              <div className="flex items-start gap-2">
                <Sparkles className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                  insight.severity === 'critical' ? 'text-red-400' :
                  insight.severity === 'warning' ? 'text-[#f59e0b]' :
                  insight.severity === 'suggestion' ? 'text-[#8b5cf6]' : 'text-[#00b4ff]'
                }`} />
                <div>
                  <div className="text-xs font-medium text-white">{insight.title}</div>
                  <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{insight.body}</p>
                  {insight.metricValue !== null && (
                    <div className="mt-1 text-[10px] font-mono text-white/25">{insight.metric}: {insight.metricValue}</div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
