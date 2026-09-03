'use client';

// RAPTOR EA Source Generator panel — pick an entry engine + filters +
// risk blocks, preview the assembled MQL5, then push it into the Code
// Editor or download the .mq5. The generator enforces the platform's
// construction rules (hard SL always, no martingale, closed-bar
// signals) — see src/lib/ea/source-generator.ts.

import { useMemo, useState } from 'react';
import { Wand2, Download, ArrowLeftToLine, ShieldCheck } from 'lucide-react';
import {
  generateMql5, DEFAULT_GENERATOR_CONFIG, ENTRY_ENGINES,
  type GeneratorConfig, type EntryEngine,
} from '@/lib/ea/source-generator';

export default function SourceGenerator({ onInsert }: { onInsert: (code: string, name: string) => void }) {
  const [cfg, setCfg] = useState<GeneratorConfig>({ ...DEFAULT_GENERATOR_CONFIG });
  const code = useMemo(() => generateMql5(cfg), [cfg]);
  const set = <K extends keyof GeneratorConfig>(k: K, v: GeneratorConfig[K]) => setCfg((p) => ({ ...p, [k]: v }));

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${cfg.name.replace(/[^\w]+/g, '_') || 'Raptor_EA'}.mq5`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const num = (label: string, key: keyof GeneratorConfig, step = 1, min = 0) => (
    <label className="flex items-center justify-between gap-2 text-[10px] text-white/55">
      <span>{label}</span>
      <input type="number" step={step} min={min} value={cfg[key] as number}
        onChange={(e) => set(key, Number(e.target.value) as never)}
        className="w-20 rounded bg-white/[0.06] px-1.5 py-0.5 text-right font-mono text-[10px] text-white outline-none" />
    </label>
  );
  const flag = (label: string, key: keyof GeneratorConfig) => (
    <label className="flex items-center gap-1.5 text-[10px] text-white/55">
      <input type="checkbox" checked={cfg[key] as boolean}
        onChange={(e) => set(key, e.target.checked as never)} className="accent-[#0091D5]" />
      {label}
    </label>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Config column */}
      <div className="w-[340px] shrink-0 space-y-3 overflow-y-auto border-r p-3" style={{ borderColor: '#1E1E2E', scrollbarWidth: 'thin' }}>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-white/40">EA name</div>
          <input value={cfg.name} onChange={(e) => set('name', e.target.value)}
            className="w-full rounded bg-white/[0.06] px-2 py-1 text-[11px] text-white outline-none" />
        </div>

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-white/40">Entry engine</div>
          <div className="space-y-1">
            {(Object.keys(ENTRY_ENGINES) as EntryEngine[]).map((k) => (
              <button key={k} onClick={() => set('entry', k)}
                className="w-full rounded border px-2 py-1.5 text-left transition-all"
                style={{
                  borderColor: cfg.entry === k ? 'rgba(0,145,213,0.6)' : 'rgba(255,255,255,0.08)',
                  backgroundColor: cfg.entry === k ? 'rgba(0,145,213,0.1)' : 'transparent',
                }}>
                <div className="text-[11px] font-semibold" style={{ color: cfg.entry === k ? '#0091D5' : 'rgba(255,255,255,0.7)' }}>{ENTRY_ENGINES[k].label}</div>
                <div className="text-[9px] text-white/35">{ENTRY_ENGINES[k].blurb}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Entry parameters</div>
          {num('Fast period / seq length', 'fastPeriod')}
          {num('Slow period / channel', 'slowPeriod')}
          {num('RSI period', 'rsiPeriod')}
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Filters</div>
          {flag('ADX trend-strength floor', 'useAdxFilter')}
          {cfg.useAdxFilter && num('Min ADX', 'adxMin')}
          {flag('H1 EMA(50) higher-TF agreement', 'useHtfFilter')}
          {flag('Session window (server hours)', 'useSessionFilter')}
          {cfg.useSessionFilter && num('Session start hour', 'sessionStart')}
          {cfg.useSessionFilter && num('Session end hour', 'sessionEnd')}
          {num('Max spread (points)', 'maxSpreadPoints')}
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Exits & risk</div>
          {flag('ATR-scaled SL/TP (else fixed points)', 'atrStops')}
          {cfg.atrStops ? (<>
            {num('SL = ATR ×', 'slAtrMult', 0.1)}
            {num('TP = ATR ×', 'tpAtrMult', 0.1)}
          </>) : (<>
            {num('SL (points)', 'slPoints', 10)}
            {num('TP (points)', 'tpPoints', 10)}
          </>)}
          {flag('ATR trailing stop', 'useTrailing')}
          {cfg.useTrailing && num('Trail = ATR ×', 'trailAtrMult', 0.1)}
          {flag('Breakeven after cushion', 'useBreakeven')}
          {cfg.useBreakeven && num('Breakeven at ATR ×', 'breakevenAtrMult', 0.1)}
          {flag('Opposite signal closes position', 'closeOnOpposite')}
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wide text-white/40">Sizing</div>
          {num('Risk % of equity (0 = fixed lot)', 'riskPercent', 0.1)}
          {num('Fixed lot', 'fixedLot', 0.01)}
          {num('Magic number', 'magic')}
        </div>

        <div className="rounded border p-2 text-[9px] leading-relaxed" style={{ borderColor: 'rgba(0,194,122,0.25)', color: 'rgba(255,255,255,0.45)' }}>
          <span className="flex items-center gap-1 font-bold" style={{ color: '#00C27A' }}><ShieldCheck size={11} /> Raptor rules baked in</span>
          Hard stop on every position · no martingale or grid · closed-bar signals (non-repainting) ·
          magic-number scoping · spread gate · order-error handling. These are not options.
        </div>

        <div className="flex gap-2">
          <button onClick={() => onInsert(code, cfg.name)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded py-2 text-[11px] font-bold text-black transition-all hover:brightness-110"
            style={{ backgroundColor: '#0091D5' }}>
            <ArrowLeftToLine size={13} /> Insert into Code Editor
          </button>
          <button onClick={download}
            className="flex items-center justify-center gap-1.5 rounded px-3 py-2 text-[11px] font-bold transition-all hover:brightness-125"
            style={{ color: '#00C27A', border: '1px solid rgba(0,194,122,0.4)' }}>
            <Download size={13} /> .mq5
          </button>
        </div>
      </div>

      {/* Live source preview */}
      <div className="flex-1 overflow-auto p-3" style={{ scrollbarWidth: 'thin' }}>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40">
          <Wand2 size={12} style={{ color: '#0091D5' }} /> Generated MQL5 source — live preview ({code.split('\n').length} lines)
        </div>
        <pre className="whitespace-pre rounded border p-3 font-mono text-[10px] leading-relaxed text-white/70"
          style={{ borderColor: '#1E1E2E', backgroundColor: '#0A0F1A', overflowX: 'auto' }}>
          {code}
        </pre>
      </div>
    </div>
  );
}
