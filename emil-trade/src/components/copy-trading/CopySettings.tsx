'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { SignalProvider } from './mockProviders';

interface CopySettingsProps {
  provider: SignalProvider;
  onClose: () => void;
  onStart: () => void;
}

type CopyMode = 'fixed_lot' | 'proportional_equity' | 'proportional_balance' | 'risk_based';

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD', 'US30', 'NAS100'];

export default function CopySettings({ provider, onClose, onStart }: CopySettingsProps) {
  const [copyMode, setCopyMode] = useState<CopyMode>('proportional_equity');
  const [fixedLot, setFixedLot] = useState('0.10');
  const [riskPercent, setRiskPercent] = useState('2');
  const [maxLot, setMaxLot] = useState('5.00');
  const [maxPositions, setMaxPositions] = useState('10');
  const [maxDrawdown, setMaxDrawdown] = useState('20');
  const [filterMode, setFilterMode] = useState<'whitelist' | 'blacklist'>('whitelist');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(SYMBOLS);
  const [reverseCopy, setReverseCopy] = useState(false);

  const toggleSymbol = (sym: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl max-h-[85vh] overflow-y-auto"
        style={{
          backgroundColor: '#111118',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2 className="text-base font-semibold text-white">Copy Settings</h2>
            <p className="text-xs text-white/40 mt-0.5">
              Configure how to copy <span className="text-[#0091D5]">{provider.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 transition-colors">
            <X size={18} className="text-white/50" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Copy Mode */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-2">Copy Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'fixed_lot', label: 'Fixed Lot' },
                  { value: 'proportional_equity', label: 'Proportional (Equity)' },
                  { value: 'proportional_balance', label: 'Proportional (Balance)' },
                  { value: 'risk_based', label: 'Risk-Based (% per trade)' },
                ] as { value: CopyMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setCopyMode(mode.value)}
                  className="px-3 py-2 rounded text-xs font-medium transition-all border"
                  style={{
                    backgroundColor:
                      copyMode === mode.value ? '#0091D5' : 'rgba(255,255,255,0.03)',
                    color: copyMode === mode.value ? '#000' : 'rgba(255,255,255,0.6)',
                    borderColor:
                      copyMode === mode.value ? '#0091D5' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional inputs */}
          {copyMode === 'fixed_lot' && (
            <InputField
              label="Fixed Lot Size"
              value={fixedLot}
              onChange={setFixedLot}
              suffix="lots"
            />
          )}
          {copyMode === 'risk_based' && (
            <InputField
              label="Risk Per Trade"
              value={riskPercent}
              onChange={setRiskPercent}
              suffix="%"
            />
          )}

          {/* Risk Controls */}
          <div className="grid grid-cols-3 gap-3">
            <InputField
              label="Max Lot/Trade"
              value={maxLot}
              onChange={setMaxLot}
              suffix="lots"
            />
            <InputField
              label="Max Open Positions"
              value={maxPositions}
              onChange={setMaxPositions}
            />
            <InputField
              label="Max Drawdown (Auto-Stop)"
              value={maxDrawdown}
              onChange={setMaxDrawdown}
              suffix="%"
            />
          </div>

          {/* Symbol Filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-white/60">Symbol Filter</label>
              <div className="flex rounded overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => setFilterMode('whitelist')}
                  className="px-3 py-1 text-[10px] font-medium transition-colors"
                  style={{
                    backgroundColor: filterMode === 'whitelist' ? '#0091D5' : 'transparent',
                    color: filterMode === 'whitelist' ? '#000' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  Whitelist
                </button>
                <button
                  onClick={() => setFilterMode('blacklist')}
                  className="px-3 py-1 text-[10px] font-medium transition-colors"
                  style={{
                    backgroundColor: filterMode === 'blacklist' ? '#FF5252' : 'transparent',
                    color: filterMode === 'blacklist' ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  Blacklist
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SYMBOLS.map((sym) => {
                const active = selectedSymbols.includes(sym);
                return (
                  <button
                    key={sym}
                    onClick={() => toggleSymbol(sym)}
                    className="px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-all border"
                    style={{
                      backgroundColor: active ? 'rgba(41,171,226,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: active ? 'rgba(41,171,226,0.3)' : 'rgba(255,255,255,0.06)',
                      color: active ? '#0091D5' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reverse Copy */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-medium text-white/60">Reverse Copy</label>
              <p className="text-[10px] text-white/30">Open opposite direction of provider signals</p>
            </div>
            <button
              onClick={() => setReverseCopy(!reverseCopy)}
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{ backgroundColor: reverseCopy ? '#0091D5' : 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: reverseCopy ? 22 : 2 }}
              />
            </button>
          </div>

          {reverseCopy && (
            <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-400/10 px-3 py-2 rounded">
              <AlertTriangle size={14} />
              Reverse copy will mirror trades in the opposite direction
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-medium text-white/60 hover:text-white/80 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            className="px-5 py-2 rounded text-xs font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: '#0091D5', color: '#000' }}
          >
            Start Copying
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-white/40 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 rounded text-xs font-mono text-white border outline-none focus:border-[#0091D5]/50 transition-colors"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
