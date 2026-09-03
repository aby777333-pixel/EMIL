'use client';

export type KycStatus =
  | 'unverified'
  | 'pending_basic'
  | 'pending_enhanced'
  | 'verified'
  | 'tier2_verified'
  | 'rejected'
  | 'suspended';

const STYLES: Record<KycStatus, { label: string; bg: string; fg: string }> = {
  unverified:       { label: 'Unverified',     bg: 'rgba(107,107,115,0.14)', fg: 'var(--g-text-muted)' },
  pending_basic:    { label: 'Under review',   bg: 'rgba(245,158,11,0.12)',  fg: '#F59E0B' },
  pending_enhanced: { label: 'Enhanced review',bg: 'rgba(245,158,11,0.12)',  fg: '#F59E0B' },
  verified:         { label: 'Verified',       bg: 'rgba(16,185,129,0.12)',  fg: 'var(--g-buy)' },
  tier2_verified:   { label: 'Tier 2 verified',bg: 'rgba(16,185,129,0.12)',  fg: 'var(--g-buy)' },
  rejected:         { label: 'Rejected',       bg: 'rgba(220,38,38,0.12)',   fg: 'var(--g-accent)' },
  suspended:        { label: 'Suspended',      bg: 'rgba(220,38,38,0.12)',   fg: 'var(--g-accent)' },
};

/**
 * Compact status pill shown next to the page title on every Profile tab.
 */
export default function KycStatusPill({ status }: { status: KycStatus }) {
  const s = STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <span
        aria-hidden
        style={{ width: 6, height: 6, borderRadius: 6, background: 'currentColor' }}
      />
      {s.label}
    </span>
  );
}
