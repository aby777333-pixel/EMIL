'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, MessageCircle, Phone, Send, Smartphone,
  Search, Clock, User, Tag, Paperclip, Sparkles,
  AlertCircle, CheckCircle2, ChevronRight, Plus,
  Hash, AtSign, Eye, Star,
} from 'lucide-react';
import type { UnifiedThread, ThreadMessage, CommChannel } from '@/types/crm';

const CHANNEL_CONFIG: Record<CommChannel, { label: string; icon: React.ReactNode; color: string }> = {
  email: { label: 'Email', icon: <Mail className="h-3 w-3" />, color: '#00b4ff' },
  sms: { label: 'SMS', icon: <Smartphone className="h-3 w-3" />, color: '#00dc82' },
  whatsapp: { label: 'WhatsApp', icon: <MessageCircle className="h-3 w-3" />, color: '#25D366' },
  in_app_chat: { label: 'Chat', icon: <MessageCircle className="h-3 w-3" />, color: '#8b5cf6' },
  telegram: { label: 'Telegram', icon: <Send className="h-3 w-3" />, color: '#0088cc' },
  call: { label: 'Call', icon: <Phone className="h-3 w-3" />, color: '#f59e0b' },
};

const SENTIMENT_COLORS = { positive: '#00dc82', neutral: '#6b7280', negative: '#ef4444' };

interface UnifiedInboxProps {
  threads: UnifiedThread[];
  selectedThread: UnifiedThread | null;
  messages: ThreadMessage[];
  onSelectThread: (id: string) => void;
  onSendMessage: (threadId: string, message: string, isInternal: boolean) => void;
  onResolve: (threadId: string) => void;
}

export function UnifiedInbox({ threads, selectedThread, messages, onSelectThread, onSendMessage, onResolve }: UnifiedInboxProps) {
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState<CommChannel | 'all'>('all');
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const filtered = threads.filter(t => {
    if (filterChannel !== 'all' && t.channel !== filterChannel) return false;
    if (search && !t.clientName.toLowerCase().includes(search.toLowerCase()) && !t.lastMessage.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unresolved = threads.filter(t => !t.isResolved).length;

  const handleSend = () => {
    if (!replyText.trim() || !selectedThread) return;
    onSendMessage(selectedThread.id, replyText.trim(), isInternal);
    setReplyText('');
    setIsInternal(false);
  };

  return (
    <div className="grid grid-cols-12 gap-0 h-[calc(100vh-200px)] bg-white/[0.01] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Thread List */}
      <div className="col-span-4 border-r border-white/[0.06] flex flex-col">
        {/* Search & Filters */}
        <div className="p-3 border-b border-white/[0.06] space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input type="text" placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/15 focus:border-[#00b4ff] focus:outline-none" />
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {(['all', 'email', 'sms', 'whatsapp', 'in_app_chat', 'telegram', 'call'] as const).map(ch => (
              <button key={ch} onClick={() => setFilterChannel(ch)}
                className={`px-2 py-1 rounded text-[9px] whitespace-nowrap transition-colors ${
                  filterChannel === ch ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/40'
                }`}>{ch === 'all' ? `All (${unresolved})` : CHANNEL_CONFIG[ch].label}</button>
            ))}
          </div>
        </div>

        {/* Threads */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
          {filtered.map(thread => {
            const ch = CHANNEL_CONFIG[thread.channel];
            const isSelected = selectedThread?.id === thread.id;
            return (
              <button key={thread.id} onClick={() => onSelectThread(thread.id)}
                className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors ${isSelected ? 'bg-white/[0.04] border-l-2 border-[#00b4ff]' : ''}`}>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 mt-0.5 shrink-0">
                    {thread.clientName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-white truncate">{thread.clientName}</span>
                      <span className="text-[9px] text-white/15 shrink-0 ml-2">
                        {new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span style={{ color: ch.color }}>{ch.icon}</span>
                      <p className="text-[11px] text-white/30 truncate flex-1">{thread.lastMessage}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {thread.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#00b4ff] text-[8px] text-white flex items-center justify-center font-bold">{thread.unreadCount}</span>
                      )}
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[thread.sentiment] }} />
                      {thread.slaMinutesRemaining !== null && thread.slaMinutesRemaining < 60 && (
                        <span className="text-[8px] text-[#ef4444] flex items-center gap-0.5"><Clock className="h-2 w-2" />{thread.slaMinutesRemaining}m</span>
                      )}
                      {thread.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[7px] px-1 py-0.5 rounded bg-white/5 text-white/15">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message View */}
      <div className="col-span-8 flex flex-col">
        {selectedThread ? (
          <>
            {/* Thread Header */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/40">
                  {selectedThread.clientName.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{selectedThread.clientName}</div>
                  <div className="flex items-center gap-2 text-[10px] text-white/25">
                    <span style={{ color: CHANNEL_CONFIG[selectedThread.channel].color }}>{CHANNEL_CONFIG[selectedThread.channel].label}</span>
                    {selectedThread.subject && <span>· {selectedThread.subject}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!selectedThread.isResolved && (
                  <button onClick={() => onResolve(selectedThread.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00dc82]/10 text-[#00dc82] text-[10px] font-medium hover:bg-[#00dc82]/20">
                    <CheckCircle2 className="h-3 w-3" /> Resolve
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : msg.direction === 'internal' ? 'justify-center' : 'justify-start'}`}>
                  {msg.isInternal ? (
                    <div className="max-w-[70%] px-3 py-2 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/10">
                      <div className="text-[9px] text-[#f59e0b] mb-0.5 flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> Internal Note — {msg.senderName}</div>
                      <p className="text-[11px] text-white/50">{msg.body}</p>
                    </div>
                  ) : (
                    <div className={`max-w-[70%] px-3 py-2 rounded-lg ${
                      msg.direction === 'outbound'
                        ? 'bg-[#00b4ff]/10 border border-[#00b4ff]/20'
                        : 'bg-white/[0.03] border border-white/[0.06]'
                    }`}>
                      <div className="text-[9px] text-white/20 mb-0.5">{msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString()}</div>
                      <p className="text-[11px] text-white/60 leading-relaxed">{msg.body}</p>
                      {msg.attachments.length > 0 && (
                        <div className="mt-1.5 flex gap-1">
                          {msg.attachments.map((a, i) => (
                            <span key={i} className="flex items-center gap-1 text-[8px] text-[#00b4ff] px-1.5 py-0.5 rounded bg-[#00b4ff]/10">
                              <Paperclip className="h-2 w-2" />{a.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Compose */}
            <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setIsInternal(!isInternal)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium transition-colors ${
                    isInternal ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-white/5 text-white/20'
                  }`}>
                  <Eye className="h-2.5 w-2.5" /> {isInternal ? 'Internal Note' : 'Reply'}
                </button>
                <button className="flex items-center gap-1 px-2 py-1 rounded text-[9px] bg-[#8b5cf6]/10 text-[#8b5cf6] hover:bg-[#8b5cf6]/20">
                  <Sparkles className="h-2.5 w-2.5" /> AI Draft
                </button>
              </div>
              <div className="flex gap-2">
                <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={isInternal ? 'Add internal note...' : 'Type your reply...'}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 focus:border-[#00b4ff] focus:outline-none" />
                <button onClick={handleSend} disabled={!replyText.trim()}
                  className="px-4 py-2 rounded-lg bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white text-xs font-medium disabled:opacity-30 transition-colors">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/20">Select a conversation</p>
              <p className="text-xs text-white/10 mt-1">{unresolved} unresolved threads</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
