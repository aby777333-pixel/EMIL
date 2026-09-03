'use client';

import HeaderPortal from './HeaderPortal';
import { headerBtnStyle } from './header-theme';

// Price Alerts engine (super-prompt §10). Lives in the shared chart header, so
// it works over BOTH the TradingView and RAPTOR charts. Alerts are evaluated
// live against streaming prices and fire an in-app (and optional desktop)
// notification once. Persisted in localStorage so they survive reloads.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Plus, Trash2, ChevronDown, Check, Activity, RotateCcw } from 'lucide-react';
import { getOhlcvBuilder } from '@/lib/nexus/market-data-bridge';
import { pushExternalAlert } from '@/lib/nexus/alert-engine';
import {
  loadConditionAlerts, saveConditionAlerts, evaluateConditionAlerts,
  describeCondition, KIND_LABELS, type ConditionAlert, type ConditionKind,
} from '@/lib/insights/condition-alerts';
import AccountAlerts from '@/components/trading/chart/AccountAlerts';
import NotifyPrefsPanel from '@/components/trading/chart/NotifyPrefsPanel';
import { deliverBrowserNotification, playAlertSound } from '@/lib/nexus/notify-prefs';

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  note?: string;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

const KEY = 'raptor_price_alerts';

function load(): PriceAlert[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(a: PriceAlert[]) {
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ }
}

export default function AlertsMenu({
  activeSymbol, prices, onToast,
}: {
  activeSymbol: string;
  prices: Record<string, { bid: number; ask: number } | undefined>;
  onToast: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<PriceAlert[]>([]);
  alertsRef.current = alerts;

  useEffect(() => { setAlerts(load()); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const persist = useCallback((next: PriceAlert[]) => { setAlerts(next); save(next); }, []);

  // Prefill the price field with the live mid when opening / switching symbol.
  useEffect(() => {
    const t = prices[activeSymbol];
    if (open && t && !price) setPrice(((t.bid + t.ask) / 2).toFixed(t.bid < 20 ? 5 : 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeSymbol]);

  // ── Live trigger engine ───────────────────────────────
  useEffect(() => {
    const list = alertsRef.current;
    const active = list.filter((a) => !a.triggered);
    if (!active.length) return;
    let changed = false;
    for (const a of active) {
      const t = prices[a.symbol];
      if (!t) continue;
      const mid = (t.bid + t.ask) / 2;
      const hit = a.condition === 'above' ? mid >= a.price : mid <= a.price;
      if (hit) {
        a.triggered = true; a.triggeredAt = Date.now(); changed = true;
        onToast(`🔔 ${a.symbol} ${a.condition} ${a.price} (now ${mid.toFixed(a.price < 20 ? 5 : 2)})`);
        deliverBrowserNotification('warning', 'RAPTOR price alert', `${a.symbol} ${a.condition} ${a.price}`);
        playAlertSound('warning');
      }
    }
    if (changed) persist([...list]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);

  // ── §10 condition alerts (EMA cross / RSI / volume spike, real H1 bars) ──
  const [condAlerts, setCondAlerts] = useState<ConditionAlert[]>([]);
  const [condKind, setCondKind] = useState<ConditionKind>('ema_cross');
  const [condP1, setCondP1] = useState('9');   // fast / period / mult
  const [condP2, setCondP2] = useState('21');  // slow / level
  const condRef = useRef<ConditionAlert[]>([]);
  condRef.current = condAlerts;

  useEffect(() => { setCondAlerts(loadConditionAlerts()); }, []);

  const persistCond = useCallback((next: ConditionAlert[]) => {
    setCondAlerts(next);
    saveConditionAlerts(next);
  }, []);

  // Evaluate every 30s (and once on mount) against real closed bars.
  useEffect(() => {
    const evalNow = () => {
      const fired = evaluateConditionAlerts(condRef.current, getOhlcvBuilder());
      if (fired.length === 0) return;
      const now = Date.now();
      const next = condRef.current.map((a) => {
        const hit = fired.find((f) => f.alert.id === a.id);
        return hit ? { ...a, triggered: true, triggeredAt: now, message: hit.message } : a;
      });
      persistCond(next);
      for (const f of fired) {
        onToast(`📈 ${f.message}`);
        deliverBrowserNotification('opportunity', 'RAPTOR condition alert', f.message);
        playAlertSound('opportunity');
        // Feed the NEXUS Alert Center through the shared dedup/cooldown gate.
        pushExternalAlert({
          key: `cond-${f.alert.id}`, severity: 'opportunity', symbol: f.alert.symbol,
          title: `${KIND_LABELS[f.alert.kind]} — ${f.alert.symbol}`, detail: f.message,
          evidence: [describeCondition(f.alert), 'Evaluated on closed H1 bars (platform feed)'],
          source: 'condition-alert',
        });
      }
    };
    evalNow();
    const id = setInterval(evalNow, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCondition = () => {
    const n1 = parseFloat(condP1), n2 = parseFloat(condP2);
    const a: ConditionAlert = {
      id: `${activeSymbol}-${condKind}-${Date.now()}`,
      symbol: activeSymbol, kind: condKind, createdAt: Date.now(), triggered: false,
      ...(condKind === 'ema_cross' ? { fast: n1 > 0 ? Math.round(n1) : 9, slow: n2 > 0 ? Math.round(n2) : 21 } : {}),
      ...(condKind === 'rsi_ob' || condKind === 'rsi_os' ? { period: n1 > 0 ? Math.round(n1) : 14, level: n2 > 0 ? n2 : condKind === 'rsi_ob' ? 70 : 30 } : {}),
      ...(condKind === 'vol_spike' ? { mult: n1 > 0 ? n1 : 3 } : {}),
    };
    persistCond([a, ...condAlerts]);
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    onToast(`Condition alert set: ${describeCondition(a)} on ${activeSymbol}`);
  };
  const removeCondition = (id: string) => persistCond(condAlerts.filter((a) => a.id !== id));
  const rearmCondition = (id: string) => persistCond(condAlerts.map((a) => (a.id === id ? { ...a, triggered: false, triggeredAt: undefined, message: undefined } : a)));

  const onKindChange = (k: ConditionKind) => {
    setCondKind(k);
    if (k === 'ema_cross') { setCondP1('9'); setCondP2('21'); }
    else if (k === 'rsi_ob') { setCondP1('14'); setCondP2('70'); }
    else if (k === 'rsi_os') { setCondP1('14'); setCondP2('30'); }
    else { setCondP1('3'); setCondP2(''); }
  };

  const add = () => {
    const p = parseFloat(price);
    if (!(p > 0)) { onToast('Enter a valid alert price'); return; }
    const a: PriceAlert = {
      id: `${activeSymbol}-${p}-${condition}-${alerts.length}-${Math.floor(p * 1000)}`,
      symbol: activeSymbol, condition, price: p, note: note.trim() || undefined,
      createdAt: Date.now(), triggered: false,
    };
    persist([a, ...alerts]);
    setNote('');
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    onToast(`Alert set: ${activeSymbol} ${condition} ${p}`);
  };
  const remove = (id: string) => persist(alerts.filter((a) => a.id !== id));
  const activeCount = alerts.filter((a) => !a.triggered).length + condAlerts.filter((a) => !a.triggered).length;

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Price alerts"
        className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
        style={headerBtnStyle('alerts', open)}
      >
        <Bell size={12} /> <span className="hidden 2xl:inline">Alerts</span>{activeCount > 0 ? ` (${activeCount})` : ''} <ChevronDown size={10} />
      </button>
      <HeaderPortal open={open} anchorRef={ref}>
        <div className="w-[280px] rounded-lg border p-3 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="mb-2 text-[11px] font-bold text-white">New alert · {activeSymbol}</div>
          <div className="mb-2 flex gap-1.5">
            {(['above', 'below'] as const).map((c) => (
              <button key={c} onClick={() => setCondition(c)}
                className="flex-1 rounded-md py-1.5 text-[11px] font-semibold capitalize transition-colors"
                style={{ backgroundColor: condition === c ? 'rgba(41,171,226,0.15)' : 'rgba(255,255,255,0.04)', color: condition === c ? '#0091D5' : 'rgba(255,255,255,0.5)', border: `1px solid ${condition === c ? 'rgba(41,171,226,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                {c}
              </button>
            ))}
          </div>
          <div className="mb-2 flex items-center gap-1.5">
            <label className="w-10 text-[10px] text-white/45">Price</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="level"
              className="flex-1 rounded bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-white outline-none" />
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note (optional)"
            className="mb-2 w-full rounded bg-white/[0.06] px-2 py-1 text-[11px] text-white placeholder:text-white/25 outline-none" />
          <button onClick={add} className="mb-3 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold text-black" style={{ backgroundColor: '#0091D5' }}>
            <Plus size={12} /> Add alert
          </button>

          <div className="max-h-[150px] overflow-y-auto">
            {alerts.length === 0 && <div className="py-2 text-center text-[10px] text-white/30">No alerts yet.</div>}
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 border-t py-1.5 text-[10px]" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {a.triggered
                  ? <Check size={11} className="shrink-0 text-[#00C27A]" />
                  : <Bell size={11} className="shrink-0 text-white/40" />}
                <span className="font-mono text-white/80">{a.symbol}</span>
                <span className="text-white/40">{a.condition}</span>
                <span className="font-mono text-white/80">{a.price}</span>
                <span className="ml-auto text-[9px] text-white/30">{a.triggered ? 'fired' : 'active'}</span>
                <button onClick={() => remove(a.id)} className="shrink-0 text-white/30 hover:text-red-400"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>

          {/* §10 condition alerts — indicator conditions on real closed H1 bars */}
          <div className="mt-2 border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-white">
              <Activity size={11} style={{ color: '#0091D5' }} /> Condition alert · {activeSymbol}
              <span className="ml-auto text-[8px] font-normal uppercase text-white/30">closed H1 bars</span>
            </div>
            <div className="mb-1.5 flex gap-1.5">
              <select value={condKind} onChange={(e) => onKindChange(e.target.value as ConditionKind)}
                className="flex-1 rounded border bg-[#060D16] px-1.5 py-1 text-[10px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                {(Object.keys(KIND_LABELS) as ConditionKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
              </select>
              <input value={condP1} onChange={(e) => setCondP1(e.target.value)} inputMode="decimal"
                title={condKind === 'ema_cross' ? 'Fast EMA period' : condKind === 'vol_spike' ? 'Multiple of the 20-bar average volume' : 'RSI period'}
                className="w-12 rounded border bg-[#060D16] px-1.5 py-1 text-center font-mono text-[10px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
              {condKind !== 'vol_spike' && (
                <input value={condP2} onChange={(e) => setCondP2(e.target.value)} inputMode="decimal"
                  title={condKind === 'ema_cross' ? 'Slow EMA period' : 'RSI trigger level'}
                  className="w-12 rounded border bg-[#060D16] px-1.5 py-1 text-center font-mono text-[10px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
              )}
              <button onClick={addCondition} className="rounded px-2 text-[10px] font-bold text-black" style={{ backgroundColor: '#0091D5' }}><Plus size={11} /></button>
            </div>
            <div className="max-h-[130px] overflow-y-auto">
              {condAlerts.length === 0 && <div className="py-1.5 text-center text-[9px] text-white/25">No condition alerts — checked every 30s while the terminal is open.</div>}
              {condAlerts.map((a) => (
                <div key={a.id} className="border-t py-1.5 text-[10px]" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2">
                    {a.triggered
                      ? <Check size={11} className="shrink-0 text-[#00C27A]" />
                      : <Activity size={11} className="shrink-0 text-white/40" />}
                    <span className="font-mono text-white/80">{a.symbol}</span>
                    <span className="truncate text-white/45">{describeCondition(a)}</span>
                    <span className="ml-auto shrink-0 text-[9px] text-white/30">{a.triggered ? 'fired' : 'armed'}</span>
                    {a.triggered && (
                      <button onClick={() => rearmCondition(a.id)} title="Re-arm" className="shrink-0 text-white/30 hover:text-[#0091D5]"><RotateCcw size={10} /></button>
                    )}
                    <button onClick={() => removeCondition(a.id)} className="shrink-0 text-white/30 hover:text-red-400"><Trash2 size={11} /></button>
                  </div>
                  {a.triggered && a.message && <div className="mt-0.5 pl-5 text-[9px] leading-snug text-white/40">{a.message}</div>}
                </div>
              ))}
            </div>
            <div className="mt-1.5 text-[8px] leading-snug text-white/25">
              Fires once on the cross/spike (closed bars, real feed), then needs re-arming. Fired conditions also appear in the NEXUS Alert Center.
            </div>
          </div>

          {/* Account & Risk alerts — spread / margin / open-P&L / news */}
          <AccountAlerts activeSymbol={activeSymbol} onToast={onToast} />

          {/* Notification preferences — how RAPTOR is allowed to interrupt you */}
          <NotifyPrefsPanel onToast={onToast} />
        </div>
      </HeaderPortal>
    </div>
  );
}
