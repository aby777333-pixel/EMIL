// ═══════════════════════════════════════════════════════════════
// Mandatory EA risk-disclaimer acceptance (MT5-management super-prompt).
// Acceptance is required once per (disclaimer version, EA id). Records are
// kept locally always, and mirrored to Supabase (ea_disclaimer_acceptances,
// insert-only) whenever the trader is signed in.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';

export const DISCLAIMER_VERSION = '1.0';

export const DISCLAIMER_TEXT = `Expert Advisors and indicators are trading tools only. They do not guarantee profits or prevent losses. Their performance may change due to market conditions, spreads, slippage, latency, liquidity, data-feed differences, broker execution, parameter settings, technical failures, or other factors.

The trader is solely responsible for selecting, configuring, testing, monitoring, and using any EA or indicator.

Raptor, the Raptor platform, and the broker providing access to the Raptor platform are not responsible for any trading loss, missed opportunity, system behavior, incorrect signal, execution difference, technical interruption, or financial damage arising from the use of an EA or indicator.

Traders should test all EAs and indicators on a demo account and review their settings before using them in live trading.

By continuing, the trader confirms that they understand and accept these risks.`;

const KEY = 'raptor_ea_disclaimer_acceptances';

interface LocalRecord {
  eaId: string;
  eaName: string;
  disclaimerVersion: string;
  environment: string;
  symbol?: string;
  acceptedAt: number;
}

function loadLocal(): LocalRecord[] {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

/** Accepted for this EA under the CURRENT disclaimer version? A version bump
 *  invalidates prior acceptances (re-consent required, per spec). */
export function isDisclaimerAccepted(eaId: string): boolean {
  return loadLocal().some((r) => r.eaId === eaId && r.disclaimerVersion === DISCLAIMER_VERSION);
}

/** Record acceptance locally (always) and in Supabase (when signed in). */
export function recordDisclaimerAcceptance(rec: { eaId: string; eaName: string; eaVersion?: string; environment: string; symbol?: string; timeframe?: string }): void {
  const local: LocalRecord = {
    eaId: rec.eaId, eaName: rec.eaName,
    disclaimerVersion: DISCLAIMER_VERSION,
    environment: rec.environment, symbol: rec.symbol,
    acceptedAt: Date.now(),
  };
  try {
    const list = loadLocal();
    list.push(local);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignore quota */ }

  void (async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('ea_disclaimer_acceptances').insert({
        user_id: user.id,
        ea_id: rec.eaId,
        ea_name: rec.eaName,
        ea_version: rec.eaVersion ?? null,
        disclaimer_version: DISCLAIMER_VERSION,
        environment: rec.environment,
        symbol: rec.symbol ?? null,
        timeframe: rec.timeframe ?? null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 250) : null,
        accepted: true,
      });
    } catch { /* signed-out / offline — local record stands */ }
  })();
}
