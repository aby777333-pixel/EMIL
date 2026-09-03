'use client';

// Platform Terms & Risk Acknowledgement gate. Shown when the terminal opens
// until the trader ticks the box and clicks "I Agree". Versioned — bumping
// TERMS_VERSION re-prompts every trader. Declining returns to the homepage.
// Acceptance (version + timestamp) is recorded locally, the same pattern as
// the per-EA risk disclaimer (lib/trading/ea-disclaimer).

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

export const TERMS_VERSION = 1;
const KEY = 'raptor_platform_terms_v';

export function isTermsAccepted(): boolean {
  try {
    const raw = localStorage.getItem(KEY + TERMS_VERSION);
    return !!raw;
  } catch { return false; }
}

function recordAcceptance(): void {
  try {
    localStorage.setItem(KEY + TERMS_VERSION, JSON.stringify({ version: TERMS_VERSION, acceptedAt: new Date().toISOString() }));
  } catch { /* ignore */ }
}

export default function TermsGateModal() {
  const [show, setShow] = useState(false);
  const [ticked, setTicked] = useState(false);

  useEffect(() => { setShow(!isTermsAccepted()); }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(3,7,12,0.88)', backdropFilter: 'blur(4px)' }}>
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,179,0,0.35)' }}>
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <ShieldAlert size={18} style={{ color: '#FFB300' }} />
          <div>
            <div className="text-[14px] font-bold text-white">Trading Terms & Risk Acknowledgement</div>
            <div className="text-[10px] text-white/40">Required before using the EMIL TRADE terminal</div>
          </div>
        </div>

        {/* Scrollable terms body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[11px] leading-relaxed text-white/70" style={{ scrollbarWidth: 'thin' }}>
          <p className="mb-2 font-semibold text-white/90">
            Trading leveraged products carries substantial risk of loss. Please read and accept the
            following before entering the terminal:
          </p>

          <TermsItem n={1} title="All trading decisions and losses are yours alone.">
            Every order you place — manually, via QuickTrade, DOM, pending orders, voice trading, or any
            Expert Advisor / automated strategy — is your own decision. You accept full and sole
            responsibility for all trading results, including the total loss of your capital. Neither the
            broker nor the RAPTOR platform, its operators, or its affiliates are liable for any trading
            losses, missed profits, or consequential damages arising from your use of this platform.
          </TermsItem>

          <TermsItem n={2} title="Signals, insights and analytics are information, not advice.">
            The trend signal beacon, market insights, regime classifications, entry/exit zones, risk tools,
            journal analytics and NEXUS assistant are heuristic tools computed from market data. They are
            NOT investment advice, NOT a recommendation to buy or sell, and NOT a promise of profit. They
            can be wrong. Acting on them is entirely at your own risk, and the broker and platform are
            exonerated from any losses that follow from doing so.
          </TermsItem>

          <TermsItem n={3} title="Protection tools are aids, not guarantees.">
            The Shield protection rules (daily loss circuit-breaker, equity floor, risk caps, cooldowns
            and similar) are self-imposed discipline aids that you configure and can disable. They reduce
            preventable mistakes but cannot prevent losses, may fail to trigger in adverse technical
            conditions (connectivity, data gaps), and create no liability for the broker or platform.
          </TermsItem>

          <TermsItem n={4} title="Automated strategies act as you.">
            Expert Advisors and scripts trade with your account under your authority. Backtest or tester
            results do not guarantee live performance. You are responsible for monitoring anything you
            automate.
          </TermsItem>

          <TermsItem n={5} title="Market data and execution.">
            Prices, spreads and fills can differ from displayed quotes, particularly in fast or illiquid
            markets. Platform availability is not guaranteed. Leverage amplifies both gains and losses,
            and you can lose more than an individual trade's margin.
          </TermsItem>

          <TermsItem n={6} title="Suitability.">
            Only trade with money you can afford to lose. If you do not understand these risks, do not
            trade; consider seeking independent professional advice. Nothing on this platform constitutes
            legal, tax or investment advice.
          </TermsItem>

          <p className="mt-3 rounded border px-3 py-2 text-[10px]" style={{ borderColor: 'rgba(255,179,0,0.3)', backgroundColor: 'rgba(255,179,0,0.06)', color: '#FFB300' }}>
            By clicking "I Agree", you acknowledge that you have read, understood and accepted these terms,
            and you agree that the broker and the RAPTOR platform are exonerated from and bear no liability
            for any losses you incur while trading.
          </p>
        </div>

        {/* Footer: checkbox + actions */}
        <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <label className="mb-3 flex cursor-pointer items-start gap-2 text-[11px] text-white/75">
            <input
              type="checkbox"
              checked={ticked}
              onChange={(e) => setTicked(e.target.checked)}
              className="mt-0.5 accent-[#00E5A0]"
            />
            I have read and understood the terms above, I accept sole responsibility for my trading
            results, and I release the broker and the RAPTOR platform from liability for my losses.
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { window.location.href = '/'; }}
              className="rounded px-4 py-2 text-[11px] font-semibold transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Decline — exit terminal
            </button>
            <button
              onClick={() => { if (!ticked) return; recordAcceptance(); setShow(false); }}
              disabled={!ticked}
              className="rounded px-5 py-2 text-[11px] font-bold text-black transition-all disabled:cursor-not-allowed disabled:opacity-30"
              style={{
                background: 'linear-gradient(180deg, #00E5A0 0%, #00B87F 100%)',
                boxShadow: ticked ? '0 0 14px rgba(0,229,160,0.5), inset 0 1px 0 rgba(255,255,255,0.4)' : 'none',
              }}
            >
              I Agree — Enter Terminal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermsItem({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="font-semibold text-white/85">{n}. {title}</div>
      <p className="mt-0.5 text-white/55">{children}</p>
    </div>
  );
}
