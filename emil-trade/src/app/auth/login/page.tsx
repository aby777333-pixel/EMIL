'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import { Field, PasswordField } from '@/components/auth/Field';
import { PrimaryButton, GoogleOAuthButton } from '@/components/auth/Buttons';
import { RememberMeToggle } from '@/components/auth/RememberMeToggle';
import { InlineError } from '@/components/auth/InlineError';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  function fail(message: string) {
    setError(message);
    setLoading(false);
    setShake(true);
    window.setTimeout(() => setShake(false), 360);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Generic message — never reveal which field is wrong.
      fail('Invalid credentials. Check your email and password.');
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();
      const role = profile?.role ?? 'trader';
      if (role === 'broker_admin' || role === 'gio4x_admin') {
        router.push(redirectTo ?? '/broker/command-center');
      } else {
        router.push(redirectTo ?? '/dashboard');
      }
    } else {
      router.push(redirectTo ?? '/dashboard');
    }
  }

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/dashboard')}`,
      },
    });
    if (oauthError) fail(oauthError.message);
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1
          className="text-[28px] font-light leading-tight"
          style={{ color: 'var(--g-text-primary)' }}
        >
          Welcome back
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Secure client access
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-5 ${shake ? 'g-shake' : ''}`} noValidate>
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

        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
        />

        <div className="flex items-center justify-between">
          <RememberMeToggle checked={remember} onChange={setRemember} />
          <Link
            href="/auth/forgot-password"
            className="text-[13px] hover:underline"
            style={{ color: 'var(--g-text-secondary)' }}
          >
            Forgot password?
          </Link>
        </div>

        <PrimaryButton loading={loading}>Sign in to terminal</PrimaryButton>

        <div className="g-divider">or</div>

        <GoogleOAuthButton onClick={handleGoogle} />
      </form>

      <div className="mt-8 text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        New to EMIL TRADE?{' '}
        <Link href="/auth/register" className="hover:underline" style={{ color: 'var(--g-text-primary)' }}>
          Open an account
        </Link>
        <span className="mx-2 opacity-40">·</span>
        <Link
          href="/auth/broker-login"
          className="hover:underline"
          style={{ color: 'var(--g-text-muted)' }}
        >
          Broker admin
        </Link>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="gentleman min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
