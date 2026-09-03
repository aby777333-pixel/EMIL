'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/AuthShell';
import { Field, PasswordField } from '@/components/auth/Field';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { ShieldAlert } from 'lucide-react';

export default function BrokerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  function fail(msg: string) {
    setError(msg);
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
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      fail('Invalid credentials. Check your email and password.');
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (profile?.role !== 'broker_admin' && profile?.role !== 'gio4x_admin') {
        await supabase.auth.signOut();
        fail('This portal is for broker administrators only. Traders should use the trader login.');
        return;
      }
    }

    router.push('/broker/command-center');
  }

  return (
    <AuthShell accent="gold" legalLine="B2B access only — for authorized broker administrators and partner staff.">
      <div className="mb-2">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium"
          style={{
            background: 'rgba(240,165,0,0.1)',
            color: '#F0A500',
            border: '1px solid rgba(240,165,0,0.2)',
          }}
        >
          <ShieldAlert size={11} /> B2B portal
        </span>
      </div>

      <div className="mb-8 mt-4">
        <h1 className="text-[28px] font-light leading-tight" style={{ color: 'var(--g-text-primary)' }}>
          Broker administration
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Access the operations console, dealing desk, and back-office tools.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-5 ${shake ? 'g-shake' : ''}`} noValidate>
        <InlineError message={error} />

        <Field
          label="Work email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@brokerage.com"
        />

        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
        />

        <PrimaryButton loading={loading}>Sign in to console</PrimaryButton>
      </form>

      <div className="mt-8 text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        <Link href="/auth/login" className="hover:underline block">
          ← Trader login instead
        </Link>
        <Link
          href="/contact?type=broker"
          className="mt-2 hover:underline block"
          style={{ color: '#F0A500' }}
        >
          Apply for a broker account →
        </Link>
      </div>
    </AuthShell>
  );
}
