'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import TwoFactorInput from '@/components/auth/TwoFactorInput';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';

/**
 * 2FA challenge page. The MFA backend is not yet wired into Supabase
 * for this codebase — this page submits to a placeholder endpoint that
 * a future server action will replace. Until then, any code is accepted
 * as long as it's 6 digits, then redirects to the dashboard.
 *
 * Once Supabase MFA is enabled (`auth.mfa.challenge` + `auth.mfa.verify`)
 * the TODO block below is the only thing that needs to change.
 */
function TwoFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  function fail(msg: string) {
    setError(msg);
    setLoading(false);
    setShake(true);
    window.setTimeout(() => setShake(false), 360);
  }

  async function submit(c: string) {
    if (loading) return;
    setError(null);
    setLoading(true);

    if (!/^\d{6}$/.test(c)) {
      fail('Enter the 6-digit code from your authenticator.');
      return;
    }

    // TODO: replace with Supabase MFA verify once server-side MFA is enabled.
    // const supabase = createClient();
    // const { data: factors } = await supabase.auth.mfa.listFactors();
    // const totp = factors?.totp?.[0];
    // const { error } = await supabase.auth.mfa.challengeAndVerify({
    //   factorId: totp.id,
    //   code: c,
    // });
    await new Promise((r) => setTimeout(r, 350));
    router.push(redirectTo);
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-[28px] font-light leading-tight" style={{ color: 'var(--g-text-primary)' }}>
          Two-factor verification
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
        className={`space-y-6 ${shake ? 'g-shake' : ''}`}
        noValidate
      >
        <InlineError message={error} />

        <TwoFactorInput value={code} onChange={setCode} onComplete={submit} disabled={loading} />

        <PrimaryButton loading={loading} disabled={code.length !== 6}>
          Verify
        </PrimaryButton>
      </form>

      <div className="mt-8 text-[13px] space-y-2" style={{ color: 'var(--g-text-secondary)' }}>
        <Link href="/auth/login" className="hover:underline block">
          ← Back to sign in
        </Link>
        <span className="block" style={{ color: 'var(--g-text-muted)' }}>
          Lost your authenticator? Contact{' '}
          <Link href="/dashboard/support" className="underline" style={{ color: 'var(--g-text-secondary)' }}>
            support
          </Link>{' '}
          to recover access.
        </span>
      </div>
    </AuthShell>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={<div className="gentleman min-h-screen" />}>
      <TwoFactorForm />
    </Suspense>
  );
}
