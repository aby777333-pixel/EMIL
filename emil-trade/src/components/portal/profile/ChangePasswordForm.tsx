'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PasswordField } from '@/components/auth/Field';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

export default function ChangePasswordForm() {
  const [currentPw, setCurrentPw] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaved(false);

    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (next.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (next === currentPw) {
      setError('New password must differ from your current password.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Re-authenticate against the current password before updating, since
    // Supabase's updateUser() doesn't itself verify the existing password.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError('Session expired. Sign in again.');
      setSaving(false);
      return;
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });
    if (signInErr) {
      setError('Current password is incorrect.');
      setSaving(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }

    setCurrentPw('');
    setNext('');
    setConfirm('');
    setSaved(true);
    setSaving(false);
    window.setTimeout(() => setSaved(false), 4000);
  }

  return (
    <DashboardCard title="Password">
      <form onSubmit={handleSubmit} className="space-y-5 max-w-md" noValidate>
        <InlineError message={error} />

        <PasswordField
          label="Current password"
          autoComplete="current-password"
          required
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
          showStrength
          hint="At least 12 characters. Mix of letters, numbers, and symbols recommended."
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <PrimaryButton loading={saving} className="!w-auto !px-6">
            Update password
          </PrimaryButton>
          {saved && (
            <span className="text-[12px]" style={{ color: 'var(--g-pnl-positive)' }}>
              Password updated.
            </span>
          )}
        </div>
      </form>
    </DashboardCard>
  );
}
