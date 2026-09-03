'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Field } from '@/components/auth/Field';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

export interface PersonalDefaults {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  date_of_birth?: string;
}

/**
 * Personal-info + contact form. Updates the `users` row directly via the
 * authenticated Supabase client (RLS is expected to scope the update
 * to the current user). The form locks the email field — changing
 * email requires re-verification and is handled in Security tab in a
 * future phase.
 */
export default function PersonalInfoForm({ defaults }: { defaults: PersonalDefaults }) {
  const [fullName, setFullName] = useState(defaults.full_name ?? '');
  const [phone, setPhone] = useState(defaults.phone ?? '');
  const [country, setCountry] = useState(defaults.country ?? '');
  const [dob, setDob] = useState(defaults.date_of_birth ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please sign in again.');
      setSaving(false);
      return;
    }

    const payload: Record<string, string | null> = {
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      country: country.trim() || null,
    };
    if (dob) payload.date_of_birth = dob;

    const { error: upsertError } = await supabase
      .from('users')
      .update(payload)
      .eq('id', user.id);

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <DashboardCard title="Personal information">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <InlineError message={error} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Full legal name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As shown on government-issued ID"
          />
          <Field
            label="Date of birth"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Email"
            type="email"
            value={defaults.email}
            disabled
            hint="Contact support to change your account email."
          />
          <Field
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 0100"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Country of residence"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            placeholder="ISO code (US, IN, AE, …)"
            maxLength={2}
            className="num"
          />
        </div>

        <div className="flex items-center gap-3">
          <PrimaryButton loading={saving} className="!w-auto !px-6">
            Save changes
          </PrimaryButton>
          {saved && (
            <span className="text-[12px]" style={{ color: 'var(--g-pnl-positive)' }}>
              Saved.
            </span>
          )}
        </div>
      </form>
    </DashboardCard>
  );
}
