'use client';

import type { KycStatus } from './KycStatusPill';

const STEPS = [
  { id: 'submitted',    label: 'Submitted' },
  { id: 'review',       label: 'Under review' },
  { id: 'approved',     label: 'Approved' },
] as const;

type StepId = typeof STEPS[number]['id'];

/**
 * Three-step horizontal stepper. Mapping:
 *   unverified                    → no steps active
 *   pending_basic / pending_*     → step 1 (submitted) + step 2 (review)
 *   verified / tier2_verified     → all three
 *   rejected                      → step 1 active, step 2/3 muted with X
 */
export default function VerificationProgress({
  status,
  submittedAt,
  reviewedAt,
}: {
  status: KycStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}) {
  const reached = reachedStep(status);
  const rejected = status === 'rejected' || status === 'suspended';

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="text-[11px] uppercase tracking-[0.14em] mb-4"
        style={{ color: 'var(--g-text-secondary)' }}
      >
        Verification progress
      </div>

      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const isReached = reached.includes(step.id);
          const isLast = i === STEPS.length - 1;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 26, height: 26, borderRadius: 26,
                    background: isReached ? 'var(--g-accent)' : 'transparent',
                    border: `1.5px solid ${isReached ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
                    color: isReached ? '#fff' : 'var(--g-text-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {rejected && step.id !== 'submitted' ? '×' : i + 1}
                </div>
                <span
                  className="mt-2 text-[11px]"
                  style={{ color: isReached ? 'var(--g-text-primary)' : 'var(--g-text-muted)' }}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className="flex-1 mx-2 h-px"
                  style={{
                    background: isReached && reached.includes(STEPS[i + 1].id)
                      ? 'var(--g-accent)'
                      : 'var(--g-border-soft)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
        <span>
          {submittedAt ? `Submitted ${formatDate(submittedAt)}` : 'Not submitted'}
        </span>
        <span>
          {reviewedAt
            ? `Reviewed ${formatDate(reviewedAt)}`
            : status === 'pending_basic' || status === 'pending_enhanced'
              ? 'Est. review time 24h'
              : ''}
        </span>
      </div>
    </div>
  );
}

function reachedStep(status: KycStatus): StepId[] {
  switch (status) {
    case 'unverified':
      return [];
    case 'pending_basic':
    case 'pending_enhanced':
      return ['submitted', 'review'];
    case 'verified':
    case 'tier2_verified':
      return ['submitted', 'review', 'approved'];
    case 'rejected':
    case 'suspended':
      return ['submitted'];
    default:
      return [];
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
