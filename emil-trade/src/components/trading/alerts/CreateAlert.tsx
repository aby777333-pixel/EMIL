'use client';

import { useState, useCallback } from 'react';
import { X, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'price_above' | 'price_below' | 'crosses_above' | 'crosses_below';
  trigger_price: number;
  message: string;
  notify_inapp: boolean;
  notify_email: boolean;
  status: 'active' | 'triggered';
  triggered_at: string | null;
  created_at: string;
}

const CONDITIONS = [
  { value: 'price_above', label: 'Price Above' },
  { value: 'price_below', label: 'Price Below' },
  { value: 'crosses_above', label: 'Crosses Above' },
  { value: 'crosses_below', label: 'Crosses Below' },
] as const;

const WATCHLIST_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD',
  'US30', 'NAS100', 'SPX500', 'USOIL', 'UKOIL', 'NATGAS',
];

interface CreateAlertProps {
  onClose: () => void;
  onCreated: (alert: PriceAlert) => void;
}

export default function CreateAlert({ onClose, onCreated }: CreateAlertProps) {
  const [symbol, setSymbol] = useState('EURUSD');
  const [condition, setCondition] = useState<PriceAlert['condition']>('price_above');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [message, setMessage] = useState('');
  const [notifyInapp, setNotifyInapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const price = parseFloat(triggerPrice);
    if (isNaN(price) || price <= 0) {
      setError('Enter a valid trigger price');
      return;
    }
    setSaving(true);
    setError(null);

    const alertData: PriceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      symbol,
      condition,
      trigger_price: price,
      message: message || `${symbol} ${CONDITIONS.find(c => c.value === condition)?.label} ${price}`,
      notify_inapp: notifyInapp,
      notify_email: notifyEmail,
      status: 'active',
      triggered_at: null,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = createClient();
      const { error: dbErr } = await supabase.from('price_alerts').insert({
        id: alertData.id,
        symbol: alertData.symbol,
        condition: alertData.condition,
        trigger_price: alertData.trigger_price,
        message: alertData.message,
        notify_inapp: alertData.notify_inapp,
        notify_email: alertData.notify_email,
        status: alertData.status,
        triggered_at: alertData.triggered_at,
        created_at: alertData.created_at,
      });
      if (dbErr) throw dbErr;
    } catch {
      // Supabase not configured - just use local state
    }

    onCreated(alertData);
    setSaving(false);
    onClose();
  }, [symbol, condition, triggerPrice, message, notifyInapp, notifyEmail, onCreated, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-[380px] rounded-lg shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: '#0091D5' }} />
            <span className="text-[14px] font-semibold">Create Price Alert</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70"><X size={16} className="opacity-50" /></button>
        </div>

        <div className="p-4 space-y-3">
          {/* Symbol */}
          <div>
            <label className="text-[11px] uppercase tracking-wider opacity-50 mb-1 block">Symbol</label>
            <select
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className="w-full px-3 py-2 rounded text-[13px] font-mono outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {WATCHLIST_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="text-[11px] uppercase tracking-wider opacity-50 mb-1 block">Condition</label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as PriceAlert['condition'])}
              className="w-full px-3 py-2 rounded text-[13px] outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Trigger Price */}
          <div>
            <label className="text-[11px] uppercase tracking-wider opacity-50 mb-1 block">Trigger Price</label>
            <input
              type="number"
              step="any"
              value={triggerPrice}
              onChange={e => setTriggerPrice(e.target.value)}
              placeholder="e.g. 1.09000"
              className="w-full px-3 py-2 rounded text-[13px] font-mono outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-[11px] uppercase tracking-wider opacity-50 mb-1 block">Custom Message (optional)</label>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Alert message..."
              className="w-full px-3 py-2 rounded text-[13px] outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>

          {/* Notification options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={notifyInapp} onChange={e => setNotifyInapp(e.target.checked)} className="accent-[#0091D5]" />
              <span className="text-[12px]">In-app</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} className="accent-[#0091D5]" />
              <span className="text-[12px]">Email</span>
            </label>
          </div>

          {error && (
            <div className="text-[12px] px-2 py-1 rounded" style={{ backgroundColor: 'rgba(193,18,31,0.1)', color: '#C1121F' }}>{error}</div>
          )}

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-2.5 rounded text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#0091D5', color: '#000' }}
          >
            {saving ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}
