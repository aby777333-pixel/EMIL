'use client';

// MT5-style EA Properties window (super-prompt §1). Tabs: Common, Inputs, Risk,
// Notifications, Logging, Version. The execution-affecting settings (lot, SL/TP
// ATR multipliers, direction, live-trading, confirm) are wired into the EA
// runtime by the parent; the rest are persisted per-EA. Supports OK, Cancel,
// Reset to Defaults, Save/Load Preset, Import/Export.

import { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Save, FolderOpen, Upload, Download, Check } from 'lucide-react';

export interface EAFullSettings {
  // Execution (honored by the runtime)
  lot: number;
  slAtrMult: number;
  tpAtrMult: number;
  direction: 'both' | 'long' | 'short';
  allowLiveTrading: boolean;      // = per-EA enabled
  confirmBeforeExecution: boolean;
  // MetaTrader compatibility flags (metadata for MT5/MT4 export — §15)
  allowDllImports: boolean;
  allowWebRequest: boolean;
  allowExternalExperts: boolean;
  allowAlgoModification: boolean;
  // Risk
  maxDailyLoss: number;
  maxOpenTrades: number;
  maxLotSize: number;
  maxRiskPct: number;
  maxSpread: number;
  // Notifications
  notifyInApp: boolean;
  notifyTelegram: boolean;
  notifyEmail: boolean;
  // Logging
  logLevel: 'off' | 'errors' | 'info' | 'debug';
}

export const DEFAULT_FULL_SETTINGS: EAFullSettings = {
  lot: 0.01, slAtrMult: 2, tpAtrMult: 3, direction: 'both',
  allowLiveTrading: true, confirmBeforeExecution: true,
  allowDllImports: false, allowWebRequest: false, allowExternalExperts: false, allowAlgoModification: false,
  maxDailyLoss: 0, maxOpenTrades: 5, maxLotSize: 1, maxRiskPct: 2, maxSpread: 0,
  notifyInApp: true, notifyTelegram: false, notifyEmail: false,
  logLevel: 'info',
};

type Tab = 'common' | 'inputs' | 'risk' | 'notifications' | 'logging' | 'version';
const TABS: { key: Tab; label: string }[] = [
  { key: 'common', label: 'Common' },
  { key: 'inputs', label: 'Inputs' },
  { key: 'risk', label: 'Risk' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'logging', label: 'Logging' },
  { key: 'version', label: 'Version' },
];

interface Preset { name: string; settings: EAFullSettings }

export default function EAPropertiesModal({
  eaName, strategyId, symbol, timeframe, magic, engine, initial, onApply, onClose,
}: {
  eaName: string; strategyId: string; symbol: string; timeframe: string;
  magic: number; engine: string; initial: EAFullSettings;
  onApply: (s: EAFullSettings) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('common');
  const [s, setS] = useState<EAFullSettings>(initial);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const presetsKey = `raptor_ea_presets_${strategyId}`;

  useEffect(() => {
    try { setPresets(JSON.parse(localStorage.getItem(presetsKey) || '[]')); } catch { /* ignore */ }
  }, [presetsKey]);

  const set = <K extends keyof EAFullSettings>(k: K, v: EAFullSettings[K]) => setS((p) => ({ ...p, [k]: v }));
  const num = (v: string, fallback: number) => { const n = parseFloat(v); return isNaN(n) ? fallback : n; };

  const savePreset = () => {
    const name = window.prompt('Preset name:', `${eaName} preset`);
    if (!name) return;
    const next = [...presets.filter((p) => p.name !== name), { name, settings: s }];
    setPresets(next);
    try { localStorage.setItem(presetsKey, JSON.stringify(next)); } catch { /* ignore */ }
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500);
  };
  const loadPreset = (name: string) => {
    const p = presets.find((x) => x.name === name);
    if (p) setS({ ...DEFAULT_FULL_SETTINGS, ...p.settings });
  };
  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${eaName.replace(/\s+/g, '_')}_settings.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importSettings = (file: File) => {
    file.text().then((t) => {
      try { setS({ ...DEFAULT_FULL_SETTINGS, ...JSON.parse(t) }); } catch { /* invalid file */ }
    });
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onMouseDown={onClose}>
      <div
        className="flex max-h-[88vh] w-[520px] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[13px] font-bold text-white">{eaName} — Properties</div>
            <div className="text-[10px] text-white/40">{symbol} · {timeframe} · magic {magic}</div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 border-b px-2 pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="rounded-t px-3 py-1.5 text-[11px] font-medium transition-colors"
              style={{ backgroundColor: tab === t.key ? 'rgba(41,171,226,0.12)' : 'transparent', color: tab === t.key ? '#0091D5' : 'rgba(255,255,255,0.45)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-[280px] flex-1 overflow-y-auto p-4 text-[12px] text-white/80">
          {tab === 'common' && (
            <div className="space-y-3">
              <Toggle label="Allow live trading" checked={s.allowLiveTrading} onChange={(v) => set('allowLiveTrading', v)} />
              <Toggle label="Confirm before execution" checked={s.confirmBeforeExecution} onChange={(v) => set('confirmBeforeExecution', v)} />
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wide text-white/35">Trade direction</div>
                <div className="flex gap-2">
                  {(['both', 'long', 'short'] as const).map((d) => (
                    <button key={d} onClick={() => set('direction', d)}
                      className="flex-1 rounded-md py-1.5 text-[11px] font-semibold capitalize transition-colors"
                      style={{ backgroundColor: s.direction === d ? 'rgba(41,171,226,0.15)' : 'rgba(255,255,255,0.04)', color: s.direction === d ? '#0091D5' : 'rgba(255,255,255,0.5)', border: `1px solid ${s.direction === d ? 'rgba(41,171,226,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                      {d === 'both' ? 'Long & Short' : `${d} only`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-md border p-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="mb-1.5 text-[10px] uppercase tracking-wide text-white/35">MetaTrader compatibility flags <span className="text-white/25">(metadata for MT4/MT5 export)</span></div>
                <Toggle label="Allow DLL imports" checked={s.allowDllImports} onChange={(v) => set('allowDllImports', v)} small />
                <Toggle label="Allow WebRequest" checked={s.allowWebRequest} onChange={(v) => set('allowWebRequest', v)} small />
                <Toggle label="Allow external experts" checked={s.allowExternalExperts} onChange={(v) => set('allowExternalExperts', v)} small />
                <Toggle label="Allow algorithm modification" checked={s.allowAlgoModification} onChange={(v) => set('allowAlgoModification', v)} small />
              </div>
            </div>
          )}

          {tab === 'inputs' && (
            <div className="space-y-2">
              <div className="mb-2 text-[10px] text-white/35">Editable strategy inputs (honored by the live runtime).</div>
              <Field label="Lot size" type="double" value={s.lot} onChange={(v) => set('lot', num(v, s.lot))} />
              <Field label="Stop-loss (× ATR)" type="double" value={s.slAtrMult} onChange={(v) => set('slAtrMult', num(v, s.slAtrMult))} />
              <Field label="Take-profit (× ATR)" type="double" value={s.tpAtrMult} onChange={(v) => set('tpAtrMult', num(v, s.tpAtrMult))} />
              <div className="mt-2 text-[10px] text-white/25">Supported input types: integer · double · boolean · string · enum · datetime · color · symbol · timeframe. This engine exposes the numeric risk inputs above; strategy-specific inputs load per EA.</div>
            </div>
          )}

          {tab === 'risk' && (
            <div className="space-y-2">
              <Field label="Max daily loss ($, 0=off)" type="double" value={s.maxDailyLoss} onChange={(v) => set('maxDailyLoss', num(v, s.maxDailyLoss))} />
              <Field label="Max open trades" type="int" value={s.maxOpenTrades} onChange={(v) => set('maxOpenTrades', num(v, s.maxOpenTrades))} />
              <Field label="Max lot size" type="double" value={s.maxLotSize} onChange={(v) => set('maxLotSize', num(v, s.maxLotSize))} />
              <Field label="Max risk %" type="double" value={s.maxRiskPct} onChange={(v) => set('maxRiskPct', num(v, s.maxRiskPct))} />
              <Field label="Max spread (0=off)" type="double" value={s.maxSpread} onChange={(v) => set('maxSpread', num(v, s.maxSpread))} />
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-2">
              <Toggle label="In-app notifications" checked={s.notifyInApp} onChange={(v) => set('notifyInApp', v)} />
              <Toggle label="Telegram" checked={s.notifyTelegram} onChange={(v) => set('notifyTelegram', v)} />
              <Toggle label="Email" checked={s.notifyEmail} onChange={(v) => set('notifyEmail', v)} />
            </div>
          )}

          {tab === 'logging' && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-white/35">Log level</div>
              <div className="flex gap-2">
                {(['off', 'errors', 'info', 'debug'] as const).map((l) => (
                  <button key={l} onClick={() => set('logLevel', l)}
                    className="flex-1 rounded-md py-1.5 text-[11px] font-semibold capitalize transition-colors"
                    style={{ backgroundColor: s.logLevel === l ? 'rgba(41,171,226,0.15)' : 'rgba(255,255,255,0.04)', color: s.logLevel === l ? '#0091D5' : 'rgba(255,255,255,0.5)', border: `1px solid ${s.logLevel === l ? 'rgba(41,171,226,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'version' && (
            <div className="space-y-1.5">
              <VerRow k="EA name" v={eaName} />
              <VerRow k="Strategy engine" v={engine} />
              <VerRow k="Magic number" v={String(magic)} />
              <VerRow k="Symbol" v={symbol} />
              <VerRow k="Timeframe" v={timeframe} />
              <VerRow k="Version" v="1.0.0" />
              <VerRow k="Runtime" v="RAPTOR native (web)" />
            </div>
          )}
        </div>

        {/* Preset bar */}
        <div className="flex flex-wrap items-center gap-1.5 border-t px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={() => setS({ ...DEFAULT_FULL_SETTINGS })} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-white/60 hover:text-white" title="Reset to defaults"><RotateCcw size={11} /> Reset</button>
          <button onClick={savePreset} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-white/60 hover:text-white" title="Save preset">{savedFlash ? <Check size={11} className="text-[#00C27A]" /> : <Save size={11} />} Save preset</button>
          <div className="flex items-center gap-1">
            <FolderOpen size={11} className="text-white/40" />
            <select onChange={(e) => { if (e.target.value) loadPreset(e.target.value); e.target.value = ''; }} className="rounded bg-white/[0.06] px-1.5 py-1 text-[10px] text-white/70 outline-none">
              <option value="">Load preset…</option>
              {presets.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-white/60 hover:text-white" title="Import settings"><Upload size={11} /> Import</button>
          <button onClick={exportSettings} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-white/60 hover:text-white" title="Export settings"><Download size={11} /> Export</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importSettings(f); }} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button onClick={onClose} className="rounded-md px-4 py-1.5 text-[12px] font-semibold text-white/60 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>Cancel</button>
          <button onClick={() => { onApply(s); onClose(); }} className="rounded-md px-5 py-1.5 text-[12px] font-bold text-black" style={{ backgroundColor: '#0091D5' }}>OK</button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange, small }: { label: string; checked: boolean; onChange: (v: boolean) => void; small?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center justify-between ${small ? 'py-0.5 text-[11px]' : 'py-1'}`}>
      <span className={small ? 'text-white/60' : 'text-white/80'}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#0091D5]" />
    </label>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: number; onChange: (v: string) => void; type: 'int' | 'double' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70">{label} <span className="text-[9px] text-white/25">{type}</span></span>
      <input type="number" step={type === 'int' ? 1 : 'any'} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded bg-white/[0.06] px-2 py-1 text-right font-mono text-[11px] text-white outline-none" />
    </div>
  );
}

function VerRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-white/40">{k}</span>
      <span className="font-mono text-white/85">{v}</span>
    </div>
  );
}
