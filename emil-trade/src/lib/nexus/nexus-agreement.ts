// ═══════════════════════════════════════════════════════════════
// NEXUS AI User Agreement (NEXUS super-prompt: mandatory consent).
// The panel does not activate until the trader explicitly accepts.
// Acceptance is versioned: bumping AGREEMENT_VERSION forces re-consent.
// Records are kept locally always and mirrored to Supabase
// (nexus_agreement_acceptances, insert-only) when signed in.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';

export const AGREEMENT_VERSION = '1.0';

export const AGREEMENT_TEXT = `NEXUS AI provides market intelligence, educational insights, trade analysis, market monitoring, strategy generation, risk analysis, alerts, automation tools, and optional execution assistance.

Financial markets involve substantial risk. No AI system can guarantee profits or accurately predict future market movements with certainty. All trading decisions remain the sole responsibility of the trader.

Raptor, its affiliates, employees, partners, brokers, liquidity providers, software vendors, AI providers, and NEXUS AI are not responsible for trading losses, missed opportunities, execution delays, technical failures, connectivity issues, market events, data inaccuracies, third-party outages, or any financial outcome arising from the use of the platform.

Autonomous trading features are disabled by default. NEXUS will never execute trades, modify orders, close positions, or change account settings unless the trader has explicitly granted those permissions. The trader may revoke permissions at any time.

Every recommendation, alert, permission change, and automated action must be permanently logged.

By selecting I Agree, the trader confirms that they understand the risks of trading and accept full responsibility for every trading decision and every permission granted to NEXUS.`;

const KEY = 'raptor_nexus_agreement';

export function isNexusAgreementAccepted(): boolean {
  try {
    const rec = JSON.parse(localStorage.getItem(KEY) || 'null');
    return rec?.version === AGREEMENT_VERSION && rec?.accepted === true;
  } catch { return false; }
}

export function recordNexusAgreement(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: AGREEMENT_VERSION, accepted: true, at: Date.now() }));
  } catch { /* ignore */ }
  void (async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('nexus_agreement_acceptances').insert({
        user_id: user.id,
        agreement_version: AGREEMENT_VERSION,
        environment: 'web',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 250) : null,
        accepted: true,
      });
    } catch { /* signed-out / offline — local record stands */ }
  })();
}
