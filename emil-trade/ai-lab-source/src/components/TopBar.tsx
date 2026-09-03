import { useEffect, useState } from 'react';
import { Bell, Wifi, WifiOff, Power, ArrowLeft, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import type { TradingMode } from '../types';

const MODES: { key: TradingMode; label: string }[] = [
  { key: 'demo', label: 'Demo' },
  { key: 'paper', label: 'Paper' },
  { key: 'live', label: 'Live' },
];

type FeedState = { status: 'checking' | 'live' | 'down'; count: number };

export function TopBar() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const setKillModal = useStore((s) => s.setKillModal);
  const toasts = useStore((s) => s.toasts);
  const pushToast = useStore((s) => s.pushToast);

  // Market-data feed health from the Raptor Market API. This is what "live"
  // means for the lab — real quotes flow over REST. (The old WebSocket push is
  // simulated client-side and not a data source.)
  const [feed, setFeed] = useState<FeedState>({ status: 'checking', count: 0 });
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch('/api/market/health');
        const d = r.ok ? await r.json() : null;
        const up = (d?.providers || []).filter((p: { configured: boolean }) => p.configured).length;
        if (alive) setFeed({ status: up > 0 ? 'live' : 'down', count: up });
      } catch {
        if (alive) setFeed({ status: 'down', count: 0 });
      }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-border bg-card/60 backdrop-blur-md z-30">
      <div className="flex items-center gap-3">
        <a
          href="/terminal"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-subtext hover:text-text border border-border hover:border-primary/40 transition-all"
          title="Back to GIO Raptor terminal"
        >
          <ArrowLeft size={14} /> Terminal
        </a>
        <span className="text-lg lg:text-xl font-extrabold tracking-tight whitespace-nowrap">
          <span className="text-primary drop-shadow-[0_0_8px_rgba(0,212,255,0.7)]">⚡</span> GIO RAPTOR{' '}
          <span className="text-primary">AI Strategy Lab</span>
        </span>
        <span
          className="hidden md:inline-flex badge bg-warning/15 text-warning border border-warning/30"
          title="This lab runs in a simulated demo environment. No live orders are placed."
        >
          DEMO · SIMULATED
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Mode selector */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden bg-bg">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === m.key
                  ? m.key === 'live'
                    ? 'bg-danger/20 text-danger'
                    : m.key === 'paper'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-primary/20 text-primary'
                  : 'text-subtext hover:text-text'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Market-data feed status */}
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
            feed.status === 'live'
              ? 'text-success border-success/40 bg-success/10'
              : feed.status === 'checking'
                ? 'text-subtext border-border bg-bg'
                : 'text-warning border-warning/40 bg-warning/10'
          }`}
          title={
            feed.status === 'live'
              ? `Raptor Market API live — ${feed.count} data providers active (Finnhub, EODHD, Yahoo, Binance…). Real quotes over REST.`
              : feed.status === 'checking'
                ? 'Checking the market data feed…'
                : 'Market data feed unavailable — falling back to simulated ticks.'
          }
        >
          {feed.status === 'live' ? <Wifi size={14} /> : feed.status === 'checking' ? <Loader2 size={14} className="animate-spin" /> : <WifiOff size={14} />}
          <span className="hidden sm:inline">
            {feed.status === 'live' ? 'Live Data' : feed.status === 'checking' ? 'Checking…' : 'Feed down'}
          </span>
        </div>

        {/* Notifications */}
        <button
          className="relative text-subtext hover:text-text transition-colors"
          title="Notifications"
          onClick={() =>
            pushToast({
              type: 'info',
              message: toasts.length
                ? `You have ${toasts.length} active notification${toasts.length > 1 ? 's' : ''}.`
                : 'No new notifications.',
            })
          }
        >
          <Bell size={18} />
          {toasts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-bg text-[10px] font-bold flex items-center justify-center">
              {toasts.length}
            </span>
          )}
        </button>

        {/* Kill switch — always visible */}
        <button
          onClick={() => setKillModal(true)}
          className="btn-danger !py-1.5 animate-pulseGlow"
          style={{ animationDuration: '2.4s' }}
          title="Emergency stop — close all positions"
        >
          <Power size={15} /> Kill
        </button>
      </div>
    </header>
  );
}
