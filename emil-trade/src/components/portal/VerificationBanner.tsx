'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';

type KycStatus =
  | 'unverified'
  | 'pending_basic'
  | 'pending_enhanced'
  | 'verified'
  | 'tier2_verified'
  | 'rejected'
  | 'suspended';

const SESSION_KEY = 'gio.portal.verifBanner.dismissed';

/**
 * Sticky-top banner that surfaces the next required KYC action. Hidden
 * for verified/tier2 users. Dismissible per session only — never
 * permanently, since withdrawals are gated by a verified status.
 */
export default function VerificationBanner({ status }: { status: KycStatus }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === '1') setDismissed(true);
    } catch {
      /* sessionStorage unavailable */
    }
  }, []);

  if (status === 'verified' || status === 'tier2_verified') return null;
  if (dismissed) return null;

  const copy = MESSAGES[status];

  return (
    <div
      role="region"
      aria-label="Verification status"
      className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 border-b text-[13px]"
      style={{
        background: 'rgba(245, 158, 11, 0.06)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
        color: 'var(--g-text-primary)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <ShieldAlert size={15} style={{ color: '#F59E0B' }} className="shrink-0" />
        <span className="truncate">{copy.body}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {copy.cta && (
          <Link
            href={copy.cta.href}
            className="inline-flex items-center gap-1 hover:underline font-medium"
            style={{ color: '#F59E0B' }}
          >
            {copy.cta.label} <ArrowRight size={13} />
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try { window.sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* noop */ }
          }}
          aria-label="Dismiss for this session"
          className="p-1 rounded transition-colors hover:bg-white/[0.04]"
          style={{ color: 'var(--g-text-muted)' }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

const MESSAGES: Record<KycStatus, { body: string; cta?: { label: string; href: string } }> = {
  unverified: {
    body: 'Complete identity verification to enable withdrawals and unlock higher leverage tiers.',
    cta: { label: 'Start verification', href: '/dashboard/profile' },
  },
  pending_basic: {
    body: 'Verification submitted. Compliance review usually completes within 24 hours.',
    cta: { label: 'View status', href: '/dashboard/profile' },
  },
  pending_enhanced: {
    body: 'Enhanced verification under review. We may request additional documents shortly.',
    cta: { label: 'View status', href: '/dashboard/profile' },
  },
  rejected: {
    body: 'Verification was rejected. Review the reviewer notes and re-submit.',
    cta: { label: 'Re-submit', href: '/dashboard/profile' },
  },
  suspended: {
    body: 'Account suspended. Contact compliance for reinstatement.',
    cta: { label: 'Contact support', href: '/dashboard/support' },
  },
  verified: { body: '' },
  tier2_verified: { body: '' },
};
