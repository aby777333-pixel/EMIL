'use client';

// NEXUS AI User Agreement (NEXUS super-prompt: mandatory consent before the
// panel activates). "I Agree" stays disabled until the checkbox is ticked;
// "I Do Not Agree" closes the panel without activating NEXUS.

import { useState } from 'react';
import { Brain, ShieldAlert } from 'lucide-react';
import { AGREEMENT_TEXT, AGREEMENT_VERSION } from '@/lib/nexus/nexus-agreement';

export function NexusAgreementModal({ onAgree, onDecline }: { onAgree: () => void; onDecline: () => void }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-gradient-to-r from-[#8b5cf6]/5 to-[#00b4ff]/5 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#00b4ff]">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">NEXUS AI User Agreement</h3>
          <p className="text-[9px] text-white/25">Version {AGREEMENT_VERSION} · required before NEXUS activates</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#f59e0b]/25 bg-[#f59e0b]/5 p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#f59e0b]" />
          <p className="text-[10px] leading-relaxed text-white/50">
            Autonomous trading is <b className="text-white/70">disabled by default</b>. NEXUS observes, analyzes and explains —
            it never trades, modifies orders or changes settings without permissions you explicitly grant and can revoke at any time.
          </p>
        </div>
        <div className="whitespace-pre-line rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 text-[11px] leading-relaxed text-white/60">
          {AGREEMENT_TEXT}
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-[11px] text-white/75">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 accent-[#8b5cf6]" />
          I have read and understood the NEXUS AI User Agreement and accept full responsibility for my trading decisions.
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
        <button
          onClick={onDecline}
          className="rounded-lg bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/60 transition-colors hover:text-white"
        >
          I Do Not Agree
        </button>
        <button
          onClick={onAgree}
          disabled={!checked}
          className="rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#00b4ff] px-4 py-2.5 text-xs font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
        >
          I Agree
        </button>
      </div>
    </div>
  );
}
