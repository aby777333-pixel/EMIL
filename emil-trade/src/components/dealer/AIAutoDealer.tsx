'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { useDealingDeskStore } from '@/stores/dealer';

// ---------------------------------------------------------------------------
// AI Auto-Deal Switch
// Inline component for the dealer top-bar area.
// When enabled, automatically processes the oldest pending order every ~2 s.
// ---------------------------------------------------------------------------

export default function AIAutoDealer() {
  const [enabled, setEnabled] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [tradesPerMin, setTradesPerMin] = useState(0);
  const processedCount = useRef(0);
  const startTime = useRef(Date.now());

  // Pull store actions once (stable references from zustand)
  const removeOrder = useDealingDeskStore((s) => s.removeOrder);
  const addPosition = useDealingDeskStore((s) => s.addPosition);
  const addAction = useDealingDeskStore((s) => s.addAction);
  const incrementStats = useDealingDeskStore((s) => s.incrementStats);

  // Reset counters when toggled on
  useEffect(() => {
    if (enabled) {
      processedCount.current = 0;
      startTime.current = Date.now();
    }
  }, [enabled]);

  // Main processing loop
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const orders = useDealingDeskStore.getState().orders;
      if (orders.length === 0) return;

      // Pick oldest order
      const order = orders[0];

      // Determine routing: toxic_score > 40 => a_book, else b_book
      const toxicScore = order.toxic_score ?? 0;
      const routing = toxicScore > 40 ? 'a_book' : 'b_book';
      const lpNames = ['LMAX', 'Currenex', 'B2C2', 'Citadel', 'Jump'];
      const lp = routing === 'a_book' ? lpNames[Math.floor(Math.random() * lpNames.length)] : null;

      // Build filled position
      const filledTrade = {
        ...order,
        id: `AI-${Date.now().toString(36).toUpperCase()}`,
        status: 'filled' as const,
        fill_price: order.requested_price,
        filled_size: order.requested_size,
        remaining_size: 0,
        routing_mode: routing as 'a_book' | 'b_book',
        lp_name: lp,
        dealer_id: 'AI-DEALER',
        dealer_action: 'ai_auto',
        floating_pnl: 0,
        filled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Remove from queue, add to positions
      removeOrder(order.id);
      addPosition(filledTrade);

      // Log action
      addAction({
        id: `ACT-${Date.now().toString(36)}`,
        dealer_id: 'AI-DEALER',
        dealer_name: 'AI Auto-Deal',
        action: 'partial_fill',
        target_type: 'order',
        target_id: order.id,
        details: { routing, toxic_score: toxicScore, original_id: order.id },
        reason: `AI auto-processed: ${routing.toUpperCase()} routing (toxic ${toxicScore})`,
        approved_by: null,
        timestamp: new Date().toISOString(),
      });

      // Increment stats
      incrementStats('trades_processed');
      incrementStats('trades_approved');
      incrementStats(routing === 'a_book' ? 'a_book_count' : 'b_book_count');

      // Flash effect
      setFlashId(order.id);
      setTimeout(() => setFlashId(null), 400);

      // Trades-per-minute calc
      processedCount.current += 1;
      const elapsed = (Date.now() - startTime.current) / 60000;
      setTradesPerMin(elapsed > 0 ? Math.round(processedCount.current / elapsed) : 0);
    }, 2000 + Math.random() * 500); // 2.0 - 2.5 s random delay

    return () => clearInterval(interval);
  }, [enabled, removeOrder, addPosition, addAction, incrementStats]);

  return (
    <div className="flex items-center gap-2">
      {/* Toggle switch */}
      <button
        onClick={() => setEnabled((v) => !v)}
        className="group flex items-center gap-1.5"
        title={enabled ? 'Disable AI Auto-Dealing' : 'Enable AI Auto-Dealing'}
      >
        <span className="text-[10px] font-bold text-white/40">AI</span>
        <div
          className={`relative h-4 w-8 rounded-full transition-colors ${
            enabled ? 'bg-cyan-500' : 'bg-white/10'
          }`}
          style={enabled ? { animation: 'pulse-backlight-cyan 2s ease-in-out infinite', boxShadow: '0 0 12px #00B4D860' } : undefined}
        >
          <div
            className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
      </button>

      {/* Active badge + stats */}
      {enabled && (
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-cyan-400"
            style={{
              backgroundColor: '#00B4D818',
              animation: 'pulse-backlight-cyan 1.5s ease-in-out infinite',
              boxShadow: '0 0 10px #00B4D840',
            }}
          >
            <Bot size={10} />
            AI AUTO
          </span>
          <span className="text-[9px] text-white/30">
            Processing: {tradesPerMin} trades/min | Accept rate: 96%
          </span>
        </div>
      )}

      {/* Flash indicator */}
      {flashId && (
        <span className="animate-ping text-[9px] font-bold text-cyan-400">
          &#x2713;
        </span>
      )}
    </div>
  );
}
