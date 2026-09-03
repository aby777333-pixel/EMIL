'use client';

import { Info } from 'lucide-react';

/**
 * Plain-English rules panel shown alongside the withdraw form.
 * Mirrors the back-office anti-fraud contract one-to-one so the user
 * can't be surprised by a hold once they submit.
 */
export default function WithdrawalRulesPanel() {
  const rules = [
    'Withdrawals must go to a beneficiary whose name matches your verified KYC profile.',
    'New destinations are subject to a 24-hour cooldown before the first transfer can settle.',
    'Where possible, funds return via the same method and account they were deposited from.',
    'Requests above $1,000 always go through manual finance review — never auto-approved.',
    'Bank wires settle in 1–3 business days. Crypto settles in ~30 minutes after on-chain confirmations.',
  ];
  return (
    <aside
      className="rounded-xl p-5"
      style={{
        background: 'rgba(245,158,11,0.04)',
        border: '1px solid rgba(245,158,11,0.18)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Info size={14} style={{ color: '#F59E0B' }} />
        <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: '#F59E0B' }}>
          Withdrawal rules
        </span>
      </div>
      <ul className="space-y-2 list-none m-0 p-0">
        {rules.map((r, i) => (
          <li
            key={i}
            className="text-[12px] leading-snug pl-4 relative"
            style={{ color: 'var(--g-text-secondary)' }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-[7px]"
              style={{
                width: 4, height: 4, borderRadius: 4,
                background: 'rgba(245,158,11,0.7)',
              }}
            />
            {r}
          </li>
        ))}
      </ul>
    </aside>
  );
}
