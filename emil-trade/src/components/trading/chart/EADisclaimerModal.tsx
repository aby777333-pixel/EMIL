'use client';

// Mandatory EA & Indicator Risk Disclaimer (MT5-management super-prompt).
// Accept and Continue stays disabled until the trader ticks the confirmation
// box. Acceptance is recorded (locally + Supabase when signed in) before the
// EA attach proceeds.

import { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { DISCLAIMER_TEXT, DISCLAIMER_VERSION } from '@/lib/trading/ea-disclaimer';

export default function EADisclaimerModal({
  eaName, environment, account, onAccept, onCancel,
}: {
  eaName: string;
  environment: string;
  account: string;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onMouseDown={onCancel}>
      <div
        className="flex max-h-[86vh] w-[520px] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,152,0,0.35)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} style={{ color: '#FF9800' }} />
            <div>
              <div className="text-[13px] font-bold text-white">EA and Indicator Risk Disclaimer</div>
              <div className="text-[10px] text-white/40">Version {DISCLAIMER_VERSION} · required before deployment</div>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/40 hover:text-white"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-md border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="uppercase tracking-wide text-white/35">EA / Indicator</div>
              <div className="font-mono font-bold text-white">{eaName}</div>
            </div>
            <div className="rounded-md border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="uppercase tracking-wide text-white/35">Account · Environment</div>
              <div className="font-mono font-bold text-white">{account} · {environment}</div>
            </div>
          </div>
          <div className="whitespace-pre-line rounded-md border p-3 text-[11px] leading-relaxed text-white/70" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            {DISCLAIMER_TEXT}
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-white/75">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 accent-[#FF9800]" />
            I have read, understood, and accept the EA and Indicator Risk Disclaimer.
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button onClick={onCancel} className="rounded-md px-4 py-2 text-[12px] font-semibold text-white/70 hover:text-white" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!checked}
            className="rounded-md px-4 py-2 text-[12px] font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
            style={{ backgroundColor: '#FF9800' }}
          >
            Accept and Continue
          </button>
        </div>
      </div>
    </div>
  );
}
