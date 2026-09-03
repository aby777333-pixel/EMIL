'use client';

import type { DisplayStatus } from '@/lib/support/types';

const STYLES: Record<DisplayStatus, { label: string; bg: string; fg: string }> = {
  open:         { label: 'Open',          bg: 'rgba(59,130,246,0.12)',  fg: 'var(--g-info)' },
  awaiting_you: { label: 'Awaiting you',  bg: 'rgba(245,158,11,0.12)',  fg: '#F59E0B' },
  awaiting_us:  { label: 'Awaiting us',   bg: 'rgba(107,107,115,0.18)', fg: 'var(--g-text-secondary)' },
  resolved:     { label: 'Resolved',      bg: 'rgba(16,185,129,0.12)',  fg: 'var(--g-buy)' },
  closed:       { label: 'Closed',        bg: 'rgba(107,107,115,0.18)', fg: 'var(--g-text-muted)' },
};

export default function TicketStatusPill({ status }: { status: DisplayStatus }) {
  const s = STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <span aria-hidden style={{ width: 5, height: 5, borderRadius: 5, background: 'currentColor' }} />
      {s.label}
    </span>
  );
}
