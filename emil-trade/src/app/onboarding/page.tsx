'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  User, Building, BarChart3, Wallet,
  ArrowRight, ArrowLeft, CheckCircle, Upload,
  Loader2, TrendingUp, Users, Briefcase, DollarSign,
} from 'lucide-react';

const STEPS = ['Welcome', 'Profile', 'KYC Documents', 'Trading Account', 'Fund Account', 'Getting Started'];

const roles = [
  { id: 'trader', label: 'Retail Trader', icon: TrendingUp, description: 'Trade forex, crypto, and CFDs on 500+ instruments' },
  { id: 'broker', label: 'Broker', icon: Building, description: 'Launch your brokerage with white-label infrastructure' },
  { id: 'ib', label: 'Introducing Broker', icon: Users, description: 'Refer clients and earn multi-tier commissions' },
  { id: 'money_manager', label: 'Money Manager', icon: Briefcase, description: 'Manage client funds via PAMM or copy trading' },
];

const countries = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Australia',
  'Canada', 'Japan', 'Singapore', 'United Arab Emirates', 'India',
  'South Africa', 'Brazil', 'Mexico', 'Spain', 'Italy',
  'Netherlands', 'Switzerland', 'Sweden', 'Norway', 'Denmark',
  'Poland', 'Turkey', 'Saudi Arabia', 'Qatar', 'Kuwait',
  'Hong Kong', 'New Zealand', 'Ireland', 'Portugal', 'Belgium',
];

const accountTypes = [
  { id: 'standard', label: 'Standard', spread: 'From 1.2 pips', commission: 'No commission', minDeposit: '$100' },
  { id: 'ecn', label: 'ECN', spread: 'From 0.0 pips', commission: '$3.50 per lot', minDeposit: '$500' },
  { id: 'demo', label: 'Demo', spread: 'From 0.0 pips', commission: 'No commission', minDeposit: 'Virtual $100,000' },
];

const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'JPY', 'CHF'];

const paymentMethods = [
  { id: 'bank', label: 'Bank Wire Transfer', time: '1-3 business days', fee: 'No fee' },
  { id: 'card', label: 'Credit / Debit Card', time: 'Instant', fee: 'No fee' },
  { id: 'crypto', label: 'Cryptocurrency', time: '10-30 minutes', fee: 'Network fee only' },
  { id: 'ewallet', label: 'E-Wallet (Skrill, Neteller)', time: 'Instant', fee: 'No fee' },
];

const tutorialSteps = [
  { num: 1, title: 'Explore the Dashboard', text: 'Your dashboard shows account balance, equity, open positions, and recent activity at a glance.' },
  { num: 2, title: 'Open the Trading Terminal', text: 'Navigate to the Terminal to access live charts, order panels, and real-time market data for all instruments.' },
  { num: 3, title: 'Place Your First Trade', text: 'Select an instrument, choose your lot size, set stop loss and take profit, then click Buy or Sell.' },
  { num: 4, title: 'Monitor Positions', text: 'Track open positions in real-time. Modify stops, add to positions, or close trades from the positions panel.' },
  { num: 5, title: 'Use the Trade Journal', text: 'Log your trading rationale and review performance analytics to improve your strategy over time.' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [role, setRole] = useState('');
  const [profile, setProfile] = useState({ name: '', country: '', phone: '', dob: '' });
  const [accountType, setAccountType] = useState('standard');
  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, [supabase.auth]);

  const saveProgress = async (currentStep: number) => {
    if (!userId) return;
    try {
      await supabase
        .from('users')
        .update({ onboarding_step: currentStep })
        .eq('id', userId);
    } catch {
      // Silent fail for progress tracking
    }
  };

  const completeOnboarding = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await supabase
        .from('users')
        .update({ onboarding_step: 5, onboarding_completed: true })
        .eq('id', userId);
    } catch {
      // Continue to dashboard even on error
    }
    setLoading(false);
    router.push('/dashboard');
  };

  const next = () => {
    const nextStep = step + 1;
    setStep(nextStep);
    saveProgress(nextStep);
  };

  const prev = () => setStep(step - 1);

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <header className="border-b px-6 py-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            EMIL Trade
          </a>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: 'var(--bg-elevated)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${((step + 1) / STEPS.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--accent), var(--accent-green))',
          }}
        />
      </div>

      {/* Step labels */}
      <div className="border-b px-6 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-3xl justify-between">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className="text-xs font-medium hidden sm:inline"
              style={{ color: i <= step ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Welcome to EMIL Trade
            </h1>
            <p className="mt-3 text-lg" style={{ color: 'var(--text-secondary)' }}>
              Select your role to personalize your experience.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {roles.map(r => {
                const Icon = r.icon;
                const selected = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className="flex items-start gap-4 rounded-xl p-5 text-left transition-all"
                    style={{
                      background: selected ? 'rgba(0,145,213,0.08)' : 'var(--bg-surface)',
                      border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: selected ? 'rgba(0,145,213,0.15)' : 'var(--bg-elevated)' }}
                    >
                      <Icon size={20} style={{ color: selected ? 'var(--accent)' : 'var(--text-muted)' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.label}</h3>
                      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{r.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Your Profile</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Basic information for your trading account.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={inputStyle}
                  placeholder="Enter your full legal name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Country of Residence
                </label>
                <select
                  value={profile.country}
                  onChange={e => setProfile({ ...profile, country: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="">Select country</option>
                  {countries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={inputStyle}
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={profile.dob}
                  onChange={e => setProfile({ ...profile, dob: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: KYC */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>KYC Documents</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Upload identity documents for verification. You can skip this step and complete it later.
            </p>
            <div className="mt-8 space-y-6">
              <UploadArea label="Government-Issued ID" hint="Passport, driver's license, or national ID card (front and back)" />
              <UploadArea label="Proof of Address" hint="Utility bill, bank statement, or government letter dated within the last 3 months" />
            </div>
            <button
              onClick={next}
              className="mt-6 text-sm font-medium underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Skip for now — I will complete KYC later
            </button>
          </div>
        )}

        {/* Step 3: Trading Account */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Open Trading Account</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Choose your account type and base currency.
            </p>

            <div className="mt-8">
              <label className="mb-3 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Account Type
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {accountTypes.map(at => {
                  const selected = accountType === at.id;
                  return (
                    <button
                      key={at.id}
                      onClick={() => setAccountType(at.id)}
                      className="rounded-xl p-4 text-left transition-all"
                      style={{
                        background: selected ? 'rgba(0,145,213,0.08)' : 'var(--bg-surface)',
                        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                      }}
                    >
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{at.label}</h3>
                      <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <p>Spread: {at.spread}</p>
                        <p>{at.commission}</p>
                        <p>Min: {at.minDeposit}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <label className="mb-3 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Base Currency
              </label>
              <div className="flex flex-wrap gap-2">
                {currencies.map(c => {
                  const selected = accountCurrency === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setAccountCurrency(c)}
                      className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
                      style={{
                        background: selected ? 'var(--accent)' : 'var(--bg-surface)',
                        color: selected ? '#fff' : 'var(--text-secondary)',
                        border: selected ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Fund */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Fund Your Account</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Choose a payment method to make your first deposit.
              {accountType === 'demo' && ' Since you selected a Demo account, you already have virtual funds.'}
            </p>

            {accountType === 'demo' ? (
              <div
                className="mt-8 rounded-xl p-6 text-center"
                style={{ background: 'rgba(0,155,77,0.08)', border: '1px solid rgba(0,155,77,0.2)' }}
              >
                <DollarSign size={32} className="mx-auto" style={{ color: 'var(--accent-green)' }} />
                <h3 className="mt-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  $100,000 Virtual Balance Ready
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your demo account is pre-funded and ready to trade.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {paymentMethods.map(pm => {
                  const selected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className="rounded-xl p-4 text-left transition-all"
                      style={{
                        background: selected ? 'rgba(0,145,213,0.08)' : 'var(--bg-surface)',
                        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                      }}
                    >
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pm.label}</h3>
                      <div className="mt-1 flex gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>{pm.time}</span>
                        <span>{pm.fee}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {accountType !== 'demo' && (
              <button
                onClick={next}
                className="mt-6 text-sm font-medium underline"
                style={{ color: 'var(--text-muted)' }}
              >
                Skip — I will fund my account later
              </button>
            )}
          </div>
        )}

        {/* Step 5: Tutorial */}
        {step === 5 && (
          <div>
            <div className="text-center">
              <CheckCircle size={48} className="mx-auto" style={{ color: 'var(--accent-green)' }} />
              <h2 className="mt-4 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                You are All Set!
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Here are some quick tips to get started with the Raptor Trading System.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              {tutorialSteps.map(ts => (
                <div
                  key={ts.num}
                  className="flex gap-4 rounded-xl p-5"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    {ts.num}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{ts.title}</h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{ts.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <button
                onClick={completeOnboarding}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-green))' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Go to Dashboard
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 5 && (
          <div className="mt-10 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={prev}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={next}
              disabled={step === 0 && !role}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function UploadArea({ label, hint }: { label: string; hint: string }) {
  const [fileName, setFileName] = useState('');

  return (
    <div>
      <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {label}
      </label>
      <div
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition-colors"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
      >
        <Upload size={28} style={{ color: 'var(--text-muted)' }} />
        <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {fileName || 'Drop files here or click to upload'}
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>
        <input
          type="file"
          accept="image/*,.pdf"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) setFileName(file.name);
          }}
          style={{ position: 'relative', marginTop: '12px' }}
        />
      </div>
    </div>
  );
}
