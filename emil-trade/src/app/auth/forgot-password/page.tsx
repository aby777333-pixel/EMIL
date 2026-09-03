'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import { Field } from '@/components/auth/Field';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
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
            Check your inbox
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--g-text-secondary)' }}>
            If an account exists for <span style={{ color: 'var(--g-text-primary)' }}>{email}</span>,
            we&apos;ve sent a password reset link. The link expires in 30 minutes.
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-6 text-[13px] hover:underline"
            style={{ color: 'var(--g-text-secondary)' }}
          >
            ← Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-[28px] font-light leading-tight" style={{ color: 'var(--g-text-primary)' }}>
          Reset password
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Enter the email associated with your account. We&apos;ll send a one-time reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <InlineError message={error} />

        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="trader@example.com"
        />

        <PrimaryButton loading={loading}>Send reset link</PrimaryButton>
      </form>

      <div className="mt-8 text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        Remembered it?{' '}
        <Link href="/auth/login" className="hover:underline" style={{ color: 'var(--g-text-primary)' }}>
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
