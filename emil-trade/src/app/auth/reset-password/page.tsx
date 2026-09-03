'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/Field';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    router.push('/auth/login?reset=success');
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-[28px] font-light leading-tight" style={{ color: 'var(--g-text-primary)' }}>
          Choose a new password
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Pick something you haven&apos;t used elsewhere. We&apos;ll sign you out of other sessions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <InlineError message={error} />

        <PasswordField
          label="New password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 12 characters"
          showStrength
        />

        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
        />

        <PrimaryButton loading={loading}>Update password</PrimaryButton>
      </form>

      <div className="mt-8 text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        <Link href="/auth/login" className="hover:underline">← Back to sign in</Link>
      </div>
    </AuthShell>
  );
}
