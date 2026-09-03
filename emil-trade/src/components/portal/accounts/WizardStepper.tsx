'use client';

const STEPS = ['Type', 'Platform', 'Settings', 'Confirm'] as const;
export type WizardStepIndex = 0 | 1 | 2 | 3;

/**
 * Four-step horizontal stepper used by the Open New Account wizard.
 * Pure presentational — owning component drives `current`.
 */
export default function WizardStepper({ current }: { current: WizardStepIndex }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => {
        const reached = i <= current;
        const active = i === current;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 28, height: 28, borderRadius: 28,
                  background: reached ? 'var(--g-accent)' : 'transparent',
                  border: `1.5px solid ${reached ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
                  color: reached ? '#fff' : 'var(--g-text-muted)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 500,
                }}
              >
                {i + 1}
              </div>
              <span
                className="mt-2 text-[11px]"
                style={{ color: active ? 'var(--g-text-primary)' : reached ? 'var(--g-text-secondary)' : 'var(--g-text-muted)' }}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className="flex-1 mx-2 h-px"
                style={{
                  background: i < current ? 'var(--g-accent)' : 'var(--g-border-soft)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
