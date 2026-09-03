'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { cn, formatPrice } from '@/lib/utils/format';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price, setPrice] = useState('');
  const [channels, setChannels] = useState<string[]>(['email']);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setAlerts(data ?? []);
    setLoading(false);
  }

  async function toggleAlert(id: string, active: boolean) {
    await supabase.from('price_alerts').update({ is_active: !active }).eq('id', id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !active } : a))
    );
  }

  async function deleteAlert(id: string) {
    await supabase.from('price_alerts').delete().eq('id', id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function createAlert() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !symbol || !price) return;

    await supabase.from('price_alerts').insert({
      user_id: user.id,
      symbol: symbol.toUpperCase(),
      condition,
      target_price: parseFloat(price),
      notification_channels: channels,
      is_active: true,
    });

    setSymbol('');
    setPrice('');
    setShowForm(false);
    fetchAlerts();
  }

  const SYMBOLS = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'ETHUSD',
    'NAS100', 'SPX500', 'US30', 'USOIL', 'XAGUSD', 'AUDUSD',
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Price Alerts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Alert
        </button>
      </div>

      {/* Create Alert Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-elevated p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Create Price Alert</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="">Select symbol...</option>
                {SYMBOLS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="above">Price Above</option>
                <option value="below">Price Below</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Target Price</label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Notify via</label>
              <div className="flex items-center gap-3 mt-1.5">
                {['email', 'push', 'sms'].map((ch) => (
                  <label key={ch} className="flex items-center gap-1.5 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={channels.includes(ch)}
                      onChange={(e) => {
                        if (e.target.checked) setChannels((c) => [...c, ch]);
                        else setChannels((c) => c.filter((x) => x !== ch));
                      }}
                      className="accent-[var(--accent)]"
                    />
                    <span className="capitalize">{ch}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={createAlert}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/80 transition-colors"
            >
              Create Alert
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-xs text-secondary hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No price alerts"
          description="Set up alerts to get notified when prices reach your target levels."
          actionLabel="Create Alert"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const active = a.is_active as boolean;
            return (
              <div
                key={a.id as string}
                className={cn(
                  'rounded-xl border bg-elevated px-4 py-3 flex items-center justify-between transition-opacity',
                  active ? 'border-border' : 'border-border/50 opacity-50'
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-foreground">{a.symbol as string}</span>
                  <span className="text-xs text-secondary">
                    Price {a.condition as string}{' '}
                    <span className="mono font-medium text-foreground">
                      {formatPrice(a.target_price as number)}
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {((a.notification_channels as string[]) ?? []).map((ch) => (
                      <span key={ch} className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted capitalize">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAlert(a.id as string, active)}
                    className="text-secondary hover:text-foreground transition-colors"
                  >
                    {active ? (
                      <ToggleRight className="h-5 w-5 text-accent" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteAlert(a.id as string)}
                    className="text-secondary hover:text-loss transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
