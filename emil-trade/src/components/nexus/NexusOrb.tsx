'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Clock, Volume2, VolumeX } from 'lucide-react';
import type { NexusSentiment } from '@/types/nexus';

const SENTIMENT_COLORS: Record<NexusSentiment, string> = {
  informational: '#00b4ff',
  warning: '#f59e0b',
  urgent: '#ef4444',
  supportive: '#8b5cf6',
  celebratory: '#00dc82',
};

interface NexusMessage {
  id: string;
  text: string;
  sentiment: NexusSentiment;
  timestamp: string;
  isDismissed: boolean;
}

interface NexusOrbProps {
  /**
   * Pending messages from NEXUS — max 3 sentences each.
   * NEXUS is always present but never intrusive.
   */
  messages: NexusMessage[];
  /** Custom name (broker's persona name, defaults to NEXUS) */
  name?: string;
  /** Is NEXUS currently snoozed? Cannot be permanently silenced (safety). */
  isSnoozed: boolean;
  /** Snooze duration in minutes — NEXUS always comes back */
  onSnooze: (minutes: number) => void;
  onDismissMessage: (id: string) => void;
  onOpen: () => void;
  /** Show on all pages — never blocks content */
  position?: 'bottom-right' | 'bottom-left';
}

export function NexusOrb({
  messages,
  name = 'NEXUS',
  isSnoozed,
  onSnooze,
  onDismissMessage,
  onOpen,
  position = 'bottom-right',
}: NexusOrbProps) {
  const [showMessage, setShowMessage] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const activeMessages = messages.filter(m => !m.isDismissed);
  const latestMessage = activeMessages[0];
  const hasMessages = activeMessages.length > 0 && !isSnoozed;

  // Auto-show latest message briefly, then collapse — non-modal, dismissible
  useEffect(() => {
    if (hasMessages && latestMessage) {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [hasMessages, latestMessage?.id]);

  const positionClass = position === 'bottom-right'
    ? 'fixed bottom-6 right-6'
    : 'fixed bottom-6 left-6';

  return (
    <div className={`${positionClass} z-50 flex flex-col items-end gap-2`}>
      {/* Message Popup — non-modal, dismissible, max 3 sentences */}
      <AnimatePresence>
        {showMessage && latestMessage && !isSnoozed && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="max-w-sm bg-[#0d1520] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
            style={{ borderColor: `${SENTIMENT_COLORS[latestMessage.sentiment]}30` }}
          >
            <div className="px-4 py-3">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#00b4ff] flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold" style={{ color: SENTIMENT_COLORS[latestMessage.sentiment] }}>
                      {name}
                    </span>
                    <button
                      onClick={() => {
                        onDismissMessage(latestMessage.id);
                        setShowMessage(false);
                      }}
                      className="text-white/15 hover:text-white/40 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Max 3 sentences — NEXUS is concise by design */}
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    {latestMessage.text}
                  </p>
                </div>
              </div>

              {/* Badge count if more messages */}
              {activeMessages.length > 1 && (
                <div className="mt-2 text-[9px] text-white/20 text-right">
                  +{activeMessages.length - 1} more message{activeMessages.length > 2 ? 's' : ''}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snooze Menu — NEXUS can be snoozed but NEVER permanently silenced */}
      <AnimatePresence>
        {showSnoozeMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#0d1520] border border-white/[0.08] rounded-xl shadow-xl p-2 space-y-0.5"
          >
            <div className="text-[9px] text-white/20 px-2 py-1 font-medium">
              Snooze {name} (temporary)
            </div>
            {[
              { minutes: 15, label: '15 minutes' },
              { minutes: 60, label: '1 hour' },
              { minutes: 240, label: '4 hours' },
            ].map(opt => (
              <button
                key={opt.minutes}
                onClick={() => {
                  onSnooze(opt.minutes);
                  setShowSnoozeMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors"
              >
                <Clock className="h-3 w-3" />
                {opt.label}
              </button>
            ))}
            <div className="px-2 pt-1 border-t border-white/[0.04]">
              <p className="text-[8px] text-white/10 leading-relaxed">
                {name} cannot be permanently silenced — this is a safety feature to ensure you always have access to risk warnings and market alerts.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Orb — always visible, never blocks content */}
      <motion.button
        onClick={() => {
          if (hasMessages) {
            setShowMessage(!showMessage);
          } else {
            onOpen();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowSnoozeMenu(!showSnoozeMenu);
        }}
        className="relative group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Outer pulse ring — indicates NEXUS has something to say */}
        {hasMessages && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: SENTIMENT_COLORS[latestMessage?.sentiment ?? 'informational'] }}
          />
        )}

        {/* Orb body */}
        <div className={`
          relative w-12 h-12 rounded-full flex items-center justify-center
          shadow-lg shadow-[#8b5cf6]/20 transition-all
          ${isSnoozed
            ? 'bg-white/5 border border-white/10'
            : 'bg-gradient-to-br from-[#8b5cf6] to-[#00b4ff] border border-white/20'
          }
        `}>
          {isSnoozed ? (
            <VolumeX className="h-5 w-5 text-white/20" />
          ) : (
            <Brain className="h-5 w-5 text-white" />
          )}

          {/* Message count badge */}
          {activeMessages.length > 0 && !isSnoozed && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ef4444] text-[9px] text-white font-bold flex items-center justify-center border-2 border-[#0a0c10]">
              {activeMessages.length}
            </span>
          )}
        </div>

        {/* Tooltip on hover */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-[#0d1520] border border-white/10 rounded-lg px-2.5 py-1.5 text-[9px] text-white/40 whitespace-nowrap shadow-xl">
            {isSnoozed ? `${name} snoozed` : hasMessages ? `${name} has a message` : `Open ${name}`}
          </div>
        </div>
      </motion.button>
    </div>
  );
}
