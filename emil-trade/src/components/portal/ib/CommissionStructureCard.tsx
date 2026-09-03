'use client';

import { TrendingUp } from 'lucide-react';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

interface Tier {
  id: number;
  name: string;
  perLot: string;        // USD per lot, formatted
  minLotsMTD: number;
  notes?: string;
}

const TIERS: Tier[] = [
  { id: 1, name: 'Standard', perLot: '$3.00', minLotsMTD: 0,    notes: 'Default tier when you sign up.' },
  { id: 2, name: 'Pro',      perLot: '$5.00', minLotsMTD: 200,  notes: 'Sustained 200+ MTD lots traded by referred clients.' },
  { id: 3, name: 'Elite',    perLot: '$7.00', minLotsMTD: 800,  notes: 'Approved by partner ops. Includes dedicated AM.' },
];

/**
 * Commission tier ladder + progress to the next tier. Shows the user's
 * current tier, the next tier requirements, and a thin progress bar
 * so the gap to the next bracket is visually obvious.
 */
export default function CommissionStructureCard({
  currentTier,
  lotsMTD,
}: {
  currentTier: number;
  lotsMTD: number;
}) {
  const next = TIERS.find((t) => t.id === currentTier + 1);
  const nextProgress = next
    ? Math.min(100, Math.max(0, (lotsMTD / next.minLotsMTD) * 100))
    : 100;

  return (
    <DashboardCard title="Commission ladder">
      <ul className="list-none m-0 p-0 space-y-2">
        {TIERS.map((t) => {
          const reached = currentTier >= t.id;
          const active = currentTier === t.id;
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 py-2.5 rounded-lg px-3"
              style={{
                background: active ? 'rgba(220,38,38,0.06)' : 'transparent',
                border: `1px solid ${active ? 'var(--g-accent)' : 'transparent'}`,
              }}
            >
              <span
                className="num shrink-0 inline-flex items-center justify-center"
                style={{
                  width: 28, height: 28, borderRadius: 28,
                  background: reached ? 'var(--g-accent)' : 'rgba(255,255,255,0.04)',
                  color: reached ? '#fff' : 'var(--g-text-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {t.id}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: reached ? 'var(--g-text-primary)' : 'var(--g-text-secondary)' }}
                  >
                    {t.name}
                  </span>
                  <span className="num text-[13px]" style={{ color: 'var(--g-text-primary)' }}>
                    {t.perLot}
                    <span className="text-[10px] ml-1" style={{ color: 'var(--g-text-muted)' }}>/lot</span>
                  </span>
                </div>
                {t.notes && (
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--g-text-muted)' }}>
                    {t.notes}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {next && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--g-border-hair)' }}>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--g-text-secondary)' }}>
              <TrendingUp size={12} /> Progress to {next.name}
            </span>
            <span className="num" style={{ color: 'var(--g-text-primary)' }}>
              {lotsMTD.toLocaleString()} / {next.minLotsMTD.toLocaleString()} lots
            </span>
          </div>
          <div
            className="h-1 rounded overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full"
              style={{
                width: `${nextProgress}%`,
                background: 'var(--g-accent)',
                transition: 'width 220ms ease',
              }}
            />
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
