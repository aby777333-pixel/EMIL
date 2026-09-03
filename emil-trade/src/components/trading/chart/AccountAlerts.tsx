'use client';

// Account & Risk alerts section — rendered inside the Alerts menu. Adds
// spread / margin-level / open-P&L / news-proximity alerts on top of the
// existing price + condition alerts. Self-contained: reads the trading
// store and economic calendar itself, so the parent menu's props are
// unchanged. Evaluated every 10s while the terminal is open; fires an
// in-app toast, a browser notification (if permitted) and the shared
// NEXUS Alert Center.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Check, RotateCcw, Gauge } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { getCalendar, type NewsEvent } from '@/lib/trading/news-guard';
import { pushExternalAlert } from '@/lib/nexus/alert-engine';
import { deliverBrowserNotification, playAlertSound } from '@/lib/nexus/notify-prefs';
import {
  loadAcctAlerts, saveAcctAlerts, evaluateAcctAlerts, describeAcctAlert,
  ACCT_KIND_LABELS, type AcctAlert, type AcctAlertKind,
} from '@/lib/insights/account-alerts';

const DEFAULT_THRESHOLD: Record<AcctAlertKind, number> = {
  spread_above: 3, margin_below: 300, open_profit: 50, open_loss: 30, news_within: 15,
};

export default function AccountAlerts({ activeSymbol, onToast }: { activeSymbol: string; onToast: (msg: string) => void }) {
  const { prices, positions, accountSummary } = useTradingStore();
  const [alerts, setAlerts] = useState<AcctAlert[]>([]);
  const [kind, setKind] = useState<AcctAlertKind>('spread_above');
  const [threshold, setThreshold] = useState('3');
  const alertsRef = useRef<AcctAlert[]>([]);
  alertsRef.current = alerts;
  const calRef = useRef<NewsEvent[]>([]);
  // Refs so the eval interval reads fresh store state without re-subscribing.
  const pricesRef = useRef(prices); pricesRef.current = prices;
  const positionsRef = useRef(positions); positionsRef.current = positions;
  const accountSummaryRef = useRef(accountSummary); accountSummaryRef.current = accountSummary;

  useEffect(() => { setAlerts(loadAcctAlerts()); }, []);
  useEffect(() => { getCalendar().then((c) => { calRef.current = c; }).catch(() => {}); }, []);

  const persist = useCallback((next: AcctAlert[]) => { setAlerts(next); saveAcctAlerts(next); }, []);

  // Evaluate every 10s against the live snapshot.
  useEffect(() => {
    const evalNow = () => {
      const list = alertsRef.current;
      if (!list.some((a) => !a.triggered)) return;
      const floating = Number(accountSummaryRef.current?.floating_pnl ?? 0) ||
        positionsRef.current.filter((p) => p.status === 'open').reduce((a, p) => a + Number((p as { unrealized_pnl?: number }).unrealized_pnl ?? 0), 0);
      const snap = {
        prices: pricesRef.current,
        marginLevelPct: Number(accountSummaryRef.current?.margin_level_pct ?? 0),
        floatingPnl: floating,
        calendar: calRef.current,
      };
      const fired = evaluateAcctAlerts(list, snap);
      if (!fired.length) return;
      const now = Date.now();
      persist(list.map((a) => { const f = fired.find((x) => x.alert.id === a.id); return f ? { ...a, triggered: true, triggeredAt: now, message: f.message } : a; }));
      for (const f of fired) {
        const sev = f.alert.kind === 'open_profit' ? 'opportunity' : f.alert.kind === 'margin_below' || f.alert.kind === 'open_loss' ? 'critical' : 'warning';
        onToast(`⚠ ${f.message}`);
        deliverBrowserNotification(sev, 'RAPTOR risk alert', f.message);
        playAlertSound(sev);
        pushExternalAlert({ key: `acct-${f.alert.id}`, severity: sev, symbol: f.alert.symbol ?? '—', title: `${ACCT_KIND_LABELS[f.alert.kind]}`, detail: f.message, evidence: [describeAcctAlert(f.alert), 'Live account/market snapshot'], source: 'account-alert' });
      }
    };
    evalNow();
    const id = setInterval(evalNow, 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = () => {
    const t = parseFloat(threshold);
    if (!(t > 0)) { onToast('Enter a valid threshold'); return; }
    const needsSymbol = kind === 'spread_above' || kind === 'news_within';
    const a: AcctAlert = {
      id: `${kind}-${Date.now()}`, kind, symbol: needsSymbol ? activeSymbol : undefined,
      threshold: t, createdAt: Date.now(), triggered: false,
    };
    persist([a, ...alerts]);
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    onToast(`Risk alert set: ${describeAcctAlert(a)}`);
  };
  const remove = (id: string) => persist(alerts.filter((a) => a.id !== id));
  const rearm = (id: string) => persist(alerts.map((a) => (a.id === id ? { ...a, triggered: false, triggeredAt: undefined, message: undefined } : a)));

  const onKind = (k: AcctAlertKind) => { setKind(k); setThreshold(String(DEFAULT_THRESHOLD[k])); };

  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-white">
        <Gauge size={11} style={{ color: '#FFB300' }} /> Account &amp; Risk alert
        <span className="ml-auto text-[8px] font-normal uppercase text-white/30">live account</span>
      </div>
      <div className="mb-1.5 flex gap-1.5">
        <select value={kind} onChange={(e) => onKind(e.target.value as AcctAlertKind)}
          className="flex-1 rounded border bg-[#060D16] px-1.5 py-1 text-[10px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          {(Object.keys(ACCT_KIND_LABELS) as AcctAlertKind[]).map((k) => <option key={k} value={k}>{ACCT_KIND_LABELS[k]}</option>)}
        </select>
        <input value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="decimal"
          className="w-16 rounded border bg-[#060D16] px-1.5 py-1 text-center font-mono text-[10px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
        <button onClick={add} className="rounded px-2 text-[10px] font-bold text-black" style={{ backgroundColor: '#FFB300' }}><Plus size={11} /></button>
      </div>
      {(kind === 'spread_above' || kind === 'news_within') && <p className="mb-1 text-[8px] text-white/30">Applies to {activeSymbol}.</p>}
      <div className="max-h-[120px] overflow-y-auto">
        {alerts.length === 0 && <div className="py-1.5 text-center text-[9px] text-white/25">No risk alerts — checked every 10s while the terminal is open.</div>}
        {alerts.map((a) => (
          <div key={a.id} className="border-t py-1.5 text-[10px]" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2">
              {a.triggered ? <Check size={11} className="shrink-0 text-[#00C27A]" /> : <Gauge size={11} className="shrink-0 text-white/40" />}
              <span className="truncate text-white/70">{describeAcctAlert(a)}</span>
              <span className="ml-auto shrink-0 text-[9px] text-white/30">{a.triggered ? 'fired' : 'armed'}</span>
              {a.triggered && <button onClick={() => rearm(a.id)} title="Re-arm" className="shrink-0 text-white/30 hover:text-[#FFB300]"><RotateCcw size={10} /></button>}
              <button onClick={() => remove(a.id)} className="shrink-0 text-white/30 hover:text-red-400"><Trash2 size={11} /></button>
            </div>
            {a.triggered && a.message && <div className="mt-0.5 pl-5 text-[9px] leading-snug text-white/40">{a.message}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
