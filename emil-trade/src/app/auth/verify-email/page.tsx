'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import { Mail, RefreshCw } from 'lucide-react';

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    if (resending) return;
    setResending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
    }
    setResending(false);
    setResent(true);
    window.setTimeout(() => setResent(false), 4000);
  }

  return (
    <AuthShell>
      <div className="g-card p-8 text-center">
        <div
          className="inline-flex items-center justify-center mb-5"
          style={{
            width: 48, height: 48, borderRadius: 999,
            background: 'rgba(220,38,38,0.08)',
            color: 'var(--g-accent)',
          }}
        >
          <Mail size={20} />
        </div>

        <h1 className="text-[22px] font-light" style={{ color: 'var(--g-text-primary)' }}>
          Verify your email
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--g-text-secondary)' }}>
          We&apos;ve sent a confirmation link to your inbox. Click it to activate your account
          and continue to the trading terminal.
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="mt-6 inline-flex items-center gap-2 text-[13px] hover:underline disabled:opacity-50"
          style={{ color: 'var(--g-text-secondary)' }}
        >
          <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
          {resent ? 'Sent — check your inbox' : 'Resend verification email'}
        </button>

        <div className="mt-6 pt-6 border-t text-[12px]" style={{ borderColor: 'var(--g-border-hair)', color: 'var(--g-text-muted)' }}>
          Wrong email?{' '}
          <Link href="/auth/register" className="underline" style={{ color: 'var(--g-text-secondary)' }}>
            Start over
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
