'use client';

import HeaderPortal from './HeaderPortal';
import { headerBtnStyle } from './header-theme';

// Raptor Script editor (super-prompt §5). A lightweight custom-indicator editor:
// write a short script against the real bar series (close/high/low/open/volume)
// using built-in helpers (sma/ema/rsi/atr/macd/bb/kama/kalman/momentum/highest/
// lowest) and emit lines with plot(series, { color }). The script is evaluated
// on the RAPTOR chart's real data and plotted live (recomputes as bars stream).
// Available from either chart tab; Run switches to the RAPTOR chart to show the
// plot (the TradingView tab uses TradingView's own Pine editor).

import { useEffect, useRef, useState } from 'react';
import { Code2, ChevronDown, Play, Eraser } from 'lucide-react';

const KEY = 'raptor_user_script';
const DEFAULT_SCRIPT = `// Real series: close, high, low, open, volume
// Helpers: sma, ema, rsi, atr, macd, bb, kama, kalman,
//          momentum, highest, lowest
// Emit lines with plot(series, { color }).

plot(ema(close, 9),  { color: '#0091D5' });
plot(ema(close, 21), { color: '#F5A623' });
`;

export default function RaptorScriptMenu({
  onEnsureRaptor,
}: {
  onEnsureRaptor: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(DEFAULT_SCRIPT);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const saved = localStorage.getItem(KEY); if (saved) setCode(saved); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Result feedback from the chart engine.
  useEffect(() => {
    const onResult = (e: Event) => {
      const d = (e as CustomEvent<{ ok: boolean; plots?: number; error?: string }>).detail;
      if (!d) return;
      setStatus(d.ok
        ? { ok: true, msg: `Running — ${d.plots ?? 0} plot${d.plots === 1 ? '' : 's'} on the RAPTOR chart` }
        : { ok: false, msg: d.error || 'Script error' });
    };
    window.addEventListener('raptor-script-result', onResult);
    return () => window.removeEventListener('raptor-script-result', onResult);
  }, []);

  const run = () => {
    try { localStorage.setItem(KEY, code); } catch { /* ignore */ }
    onEnsureRaptor();
    window.dispatchEvent(new CustomEvent('raptor-apply-script', { detail: { code } }));
  };
  const clear = () => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('raptor-clear-script'));
    setStatus(null);
  };

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Raptor Script — custom indicator editor"
        className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
        style={headerBtnStyle('script', open)}
      >
        <Code2 size={12} /> <span className="hidden 2xl:inline">Script</span> <ChevronDown size={10} />
      </button>
      <HeaderPortal open={open} anchorRef={ref}>
        <div className="w-[380px] rounded-lg border shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-[12px] font-bold text-white">Raptor Script</span>
            <span className="text-[9px] text-white/35">plots on the RAPTOR chart</span>
          </div>
          <div className="p-2">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              rows={11}
              className="w-full resize-y rounded bg-black/40 p-2 font-mono text-[11px] leading-relaxed text-white/90 outline-none"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <div className="mt-2 flex items-center gap-2">
              <button onClick={run} className="flex items-center gap-1 rounded px-3 py-1.5 text-[11px] font-bold text-black" style={{ backgroundColor: '#0091D5' }}>
                <Play size={12} /> Run
              </button>
              <button onClick={clear} className="flex items-center gap-1 rounded px-3 py-1.5 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Eraser size={12} /> Clear
              </button>
              {status && (
                <span className="ml-auto truncate text-[10px]" style={{ color: status.ok ? '#00C27A' : '#FF5252' }} title={status.msg}>
                  {status.ok ? '✓ ' : '✕ '}{status.msg}
                </span>
              )}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-white/35">
              Series: <span className="font-mono text-white/55">close high low open volume</span>. Helpers return arrays:
              <span className="font-mono text-white/55"> sma(close,n) ema rsi atr macd bb(close,n,k) kama kalman momentum highest(x,n) lowest(x,n)</span>.
              Emit each line with <span className="font-mono text-white/55">plot(series, {'{ color }'})</span>.
            </p>
          </div>
        </div>
      </HeaderPortal>
    </div>
  );
}
