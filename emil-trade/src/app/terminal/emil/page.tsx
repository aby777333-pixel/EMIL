'use client';

// EMIL hand-off window. The in-terminal EMIL console was retired when this
// platform became EMIL Trade — EMIL (the multi-agent intelligence layer) now
// lives in the EMIL Control Cockpit, a separate app. Any legacy link to
// /terminal/emil lands here and is forwarded to the cockpit in this tab.

import { useEffect } from 'react';
import { EMIL_COCKPIT_URL } from '@/lib/emil-link';

export default function EmilHandoff() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      window.location.replace(EMIL_COCKPIT_URL);
    }, 600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 text-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--text-muted)]">EMIL Trade</div>
      <h1 className="text-xl font-semibold text-white">Opening the EMIL Control Cockpit…</h1>
      <p className="max-w-md text-[13px] text-[var(--text-secondary)]">
        EMIL — the multi-agent market intelligence layer — runs in its own cockpit. Your trading
        terminal stays open in the other tab.
      </p>
      <a
        href={EMIL_COCKPIT_URL}
        rel="noopener noreferrer"
        className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-[12px] font-bold text-white transition-all hover:brightness-125"
      >
        Continue to EMIL →
      </a>
    </div>
  );
}
