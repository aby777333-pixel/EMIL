'use client';

import { Plus, Headphones } from 'lucide-react';

/**
 * Header strip for the support list. [+ New ticket] is the only
 * marketing-style CTA on the page; everything else is informational.
 */
export default function SupportHeader({
  onNewTicket,
  liveAgents,
  avgResponseMinutes,
}: {
  onNewTicket: () => void;
  liveAgents: number;
  avgResponseMinutes: number;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
          Support
        </h1>
        <div
          className="mt-1 flex items-center gap-3 text-[12px]"
          style={{ color: 'var(--g-text-secondary)' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              style={{
                width: 6, height: 6, borderRadius: 6,
                background: liveAgents > 0 ? 'var(--g-buy)' : 'var(--g-text-muted)',
                boxShadow: liveAgents > 0 ? '0 0 6px rgba(16,185,129,0.6)' : undefined,
              }}
            />
            <Headphones size={12} style={{ opacity: 0.5 }} />
            {liveAgents > 0 ? `${liveAgents} agents online` : 'Live chat offline'}
          </span>
          <span style={{ color: 'var(--g-text-muted)' }}>·</span>
          <span>
            Avg response{' '}
            <span className="num" style={{ color: 'var(--g-text-primary)' }}>
              {avgResponseMinutes < 60
                ? `${avgResponseMinutes}m`
                : `${(avgResponseMinutes / 60).toFixed(1)}h`}
            </span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewTicket}
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[13px] font-medium"
        style={{ background: 'var(--g-accent)', color: '#fff', border: '1px solid var(--g-accent)' }}
      >
        <Plus size={14} /> New ticket
      </button>
    </header>
  );
}
