'use client';

// Offers a strategy sent from the EMIL Strategy Builder. Shows exactly what
// will be added — engine, inputs, timeframe, risk and the long/short rules —
// and adds it to the EA library only when the trader confirms. Waits for the
// platform terms gate first. See lib/trading/emil-strategy-import.ts.

import { useCallback, useEffect, useState } from 'react';
import { Blocks } from 'lucide-react';
import { isTermsAccepted } from '@/components/trading/TermsGateModal';
import { isEnabled } from '@/lib/trading/entitlements';
import { ENGINES } from '@/lib/emil-strategy-kit';
import { importEmilStrategy, readPendingImport } from '@/lib/trading/emil-strategy-import';
import { PENDING_EVENT, clearPendingImport } from '@/lib/trading/emil-strategy-pending';
import type { ValidationResult } from '@/lib/emil-strategy-kit';

function showToast(text: string, tone: 'info' | 'error' = 'info') {
  const div = document.createElement('div');
  div.className = 'fixed top-20 right-4 z-[9999] px-4 py-3 rounded-lg text-sm font-semibold';
  div.style.cssText = `background:${tone === 'error' ? '#B42318' : '#0091D5'};color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:420px`;
  div.textContent = text;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4500);
}

const DIRECTION_LABEL = { both: 'Long and short', long: 'Long only', short: 'Short only' } as const;

export default function EmilStrategyImportDialog() {
  const [pending, setPending] = useState<ValidationResult | null>(null);
  const [termsOk, setTermsOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => setPending(readPendingImport()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(PENDING_EVENT, refresh);
    return () => window.removeEventListener(PENDING_EVENT, refresh);
  }, [refresh]);

  // The terms gate blocks the terminal until accepted; offer the import after it.
  useEffect(() => {
    if (!pending) return;
    if (isTermsAccepted()) { setTermsOk(true); return; }
    const timer = setInterval(() => {
      if (isTermsAccepted()) { setTermsOk(true); clearInterval(timer); }
    }, 1000);
    return () => clearInterval(timer);
  }, [pending]);

  const close = () => {
    clearPendingImport();
    setPending(null);
  };

  if (!pending || !termsOk) return null;

  const confirm = async () => {
    if (!pending.ok) return;
    setBusy(true);
    try {
      if (!(await isEnabled('ea_upload'))) {
        showToast('Custom EAs are currently disabled by the administrator.', 'error');
        return;
      }
      const { status, ea } = importEmilStrategy(pending.spec);
      showToast(
        status === 'unchanged'
          ? `"${ea.name}" is already in your EA library.`
          : `"${ea.name}" ${status === 'updated' ? 'updated' : 'added'} in your EA library — pick it from the EA menu or drag it onto a chart.`,
      );
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(3,7,12,0.88)', backdropFilter: 'blur(4px)' }}>
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(0,145,213,0.4)' }}>
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Blocks size={18} style={{ color: '#0091D5' }} />
          <div>
            <div className="text-[14px] font-bold text-white">Add a strategy from the EMIL Strategy Builder</div>
            <div className="text-[10px] text-white/40">Review it before it goes into your EA library</div>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3 text-[12px] text-white/80">
          {!pending.ok ? (
            <div>
              <p className="font-semibold text-white">This strategy link can&apos;t be used.</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-white/60">
                {pending.errors.slice(0, 5).map((err) => <li key={err}>{err}</li>)}
              </ul>
            </div>
          ) : (
            (() => {
              const spec = pending.spec;
              const engine = ENGINES[spec.engine];
              const rules = engine.rules(spec.params);
              return (
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="text-[15px] font-bold text-white">{spec.name}</div>
                    <div className="text-white/50">{engine.label} · {spec.timeframe} · {spec.symbols.join(', ')} · v{spec.version}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border p-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {Object.entries(spec.params).map(([name, value]) => (
                      <div key={name} className="flex justify-between gap-2"><span className="text-white/50">{name}</span><span className="font-mono">{value}</span></div>
                    ))}
                    <div className="flex justify-between gap-2"><span className="text-white/50">Lot</span><span className="font-mono">{spec.risk.lot}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-white/50">Stop × ATR(14)</span><span className="font-mono">{spec.risk.slAtrMult}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-white/50">Target × ATR(14)</span><span className="font-mono">{spec.risk.tpAtrMult}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-white/50">Direction</span><span>{DIRECTION_LABEL[spec.risk.direction]}</span></div>
                  </div>
                  <div className="text-[11px] leading-relaxed text-white/60">
                    <div><span className="font-semibold" style={{ color: '#00C853' }}>Long:</span> {rules.long}</div>
                    <div className="mt-1"><span className="font-semibold" style={{ color: '#FF5252' }}>Short:</span> {rules.short}</div>
                  </div>
                  <p className="text-[11px] text-white/40">
                    Runs on EMIL Trade&apos;s {engine.label} engine with these inputs. Adding it does not start trading: attaching it
                    to a chart goes through the EA risk disclaimer, and you can change every input in EA Properties.
                  </p>
                </div>
              );
            })()
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button onClick={close} className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-white/70 hover:text-white">
            {pending.ok ? 'Discard' : 'Close'}
          </button>
          {pending.ok && (
            <button onClick={confirm} disabled={busy} className="rounded-md px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#0091D5' }}>
              {busy ? 'Adding…' : 'Add to EA library'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
