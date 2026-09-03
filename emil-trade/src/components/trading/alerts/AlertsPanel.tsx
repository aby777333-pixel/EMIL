'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Volume2 } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { createClient } from '@/lib/supabase/client';
import CreateAlert, { type PriceAlert } from './CreateAlert';

// Simple alert sound using Web Audio API
function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio not available
  }
}

// Toast notification
function showToast(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 80px; right: 24px; z-index: 9999;
    padding: 12px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
    background: #0091D5; color: #000; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    animation: slideIn 0.3s ease-out;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlertsPanel({ isOpen, onClose }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const prices = useTradingStore(s => s.prices);
  const prevPricesRef = useRef<Record<string, number>>({});

  // Load alerts from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    async function loadAlerts() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('price_alerts')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled && data) setAlerts(data as PriceAlert[]);
      } catch {
        // Supabase not available, use local state only
      }
    }
    loadAlerts();
    return () => { cancelled = true; };
  }, []);

  // Check alerts on each price tick
  useEffect(() => {
    const activeAlerts = alerts.filter(a => a.status === 'active');
    if (activeAlerts.length === 0) return;

    for (const alert of activeAlerts) {
      const tick = prices[alert.symbol];
      if (!tick) continue;

      const currentMid = tick.mid;
      const prevMid = prevPricesRef.current[alert.symbol];
      let triggered = false;

      switch (alert.condition) {
        case 'price_above':
          if (currentMid > alert.trigger_price) triggered = true;
          break;
        case 'price_below':
          if (currentMid < alert.trigger_price) triggered = true;
          break;
        case 'crosses_above':
          if (prevMid !== undefined && prevMid <= alert.trigger_price && currentMid > alert.trigger_price) triggered = true;
          break;
        case 'crosses_below':
          if (prevMid !== undefined && prevMid >= alert.trigger_price && currentMid < alert.trigger_price) triggered = true;
          break;
      }

      if (triggered) {
        const now = new Date().toISOString();
        setAlerts(prev => prev.map(a =>
          a.id === alert.id ? { ...a, status: 'triggered' as const, triggered_at: now } : a
        ));

        if (alert.notify_inapp) {
          showToast(`Alert: ${alert.message}`);
          playAlertSound();
        }

        // Update in DB
        (async () => {
          try {
            const supabase = createClient();
            await supabase.from('price_alerts').update({ status: 'triggered', triggered_at: now }).eq('id', alert.id);
          } catch { /* local only */ }
        })();
      }
    }

    // Update previous prices
    const newPrev: Record<string, number> = {};
    for (const [sym, tick] of Object.entries(prices)) {
      newPrev[sym] = tick.mid;
    }
    prevPricesRef.current = newPrev;
  }, [prices, alerts]);

  const handleCreated = useCallback((alert: PriceAlert) => {
    setAlerts(prev => [alert, ...prev]);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    try {
      const supabase = createClient();
      await supabase.from('price_alerts').delete().eq('id', id);
    } catch { /* local only */ }
  }, []);

  const handleToggle = useCallback(async (id: string) => {
    setAlerts(prev => prev.map(a => {
      if (a.id !== id) return a;
      const newStatus = a.status === 'active' ? 'triggered' as const : 'active' as const;
      return { ...a, status: newStatus, triggered_at: newStatus === 'triggered' ? new Date().toISOString() : null };
    }));
    try {
      const found = alerts.find(a => a.id === id);
      if (!found) return;
      const newStatus = found.status === 'active' ? 'triggered' : 'active';
      const supabase = createClient();
      await supabase.from('price_alerts').update({ status: newStatus }).eq('id', id);
    } catch { /* local only */ }
  }, [alerts]);

  const activeCount = alerts.filter(a => a.status === 'active').length;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="absolute top-full right-0 mt-1 w-[360px] rounded-lg shadow-2xl z-50"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          maxHeight: 480,
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: '#0091D5' }} />
            <span className="text-[13px] font-semibold">Price Alerts</span>
            {activeCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#0091D5', color: '#000' }}>
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'rgba(41,171,226,0.15)', color: '#0091D5' }}
          >
            <Plus size={12} /> New Alert
          </button>
        </div>

        {/* Alerts List */}
        <div className="overflow-y-auto" style={{ maxHeight: 400, scrollbarWidth: 'thin' }}>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 opacity-30">
              <Volume2 size={24} className="mb-2" />
              <span className="text-[13px]">No alerts yet</span>
            </div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold">{alert.symbol}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: alert.status === 'active' ? 'rgba(0,194,122,0.15)' : 'rgba(255,255,255,0.05)',
                        color: alert.status === 'active' ? '#00C27A' : 'var(--text-muted)',
                      }}
                    >
                      {alert.status === 'active' ? 'ACTIVE' : 'TRIGGERED'}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-50 mt-0.5">
                    {alert.condition.replace(/_/g, ' ')} {alert.trigger_price}
                  </div>
                  {alert.triggered_at && (
                    <div className="text-[10px] opacity-30 mt-0.5">
                      Triggered: {new Date(alert.triggered_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggle(alert.id)} className="p-1 rounded hover:opacity-70" title="Toggle">
                    {alert.status === 'active'
                      ? <ToggleRight size={18} style={{ color: '#00C27A' }} />
                      : <ToggleLeft size={18} className="opacity-30" />
                    }
                  </button>
                  <button onClick={() => handleDelete(alert.id)} className="p-1 rounded hover:opacity-70" title="Delete">
                    <Trash2 size={14} className="opacity-30 hover:opacity-60" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Backdrop for closing */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Create modal */}
      {showCreate && <CreateAlert onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </>
  );
}

// Export the active alert count hook for use in TopBar
export function useAlertCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const { count: c, error } = await supabase
          .from('price_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        if (!error && c !== null && !cancelled) setCount(c);
      } catch {
        // local fallback
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);
  return count;
}
