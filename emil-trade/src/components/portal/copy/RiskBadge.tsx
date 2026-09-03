'use client';

import { type RiskScore, RISK_LABELS } from '@/lib/copy/types';

const STYLES: Record<RiskScore, { dots: number; bg: string; fg: string }> = {
  low:        { dots: 1, bg: 'rgba(16,185,129,0.12)', fg: 'var(--g-buy)' },
  medium:     { dots: 2, bg: 'rgba(59,130,246,0.12)', fg: 'var(--g-info)' },
  high:       { dots: 3, bg: 'rgba(245,158,11,0.12)', fg: '#F59E0B' },
  aggressive: { dots: 4, bg: 'rgba(220,38,38,0.12)',  fg: 'var(--g-accent)' },
};

/**
 * Risk pill shown on every strategy card + detail header. The dot
 * count visually maps to the risk bucket so the user can scan a row
 * without reading the label.
 */
export default function RiskBadge({ risk, compact = false }: { risk: RiskScore; compact?: boolean }) {
  const s = STYLES[risk];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              width: 4, height: 4, borderRadius: 4,
              background: i < s.dots ? 'currentColor' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </span>
      {compact ? null : RISK_LABELS[risk]}
    </span>
  );
}
