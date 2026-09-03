import { Metadata } from 'next';
import { Shield, Zap, Globe, BarChart3, Users, Layers } from 'lucide-react';
import SandboxForm from './SandboxForm';

export const metadata: Metadata = {
  title: 'Broker Sandbox | EMIL Trade',
  description: 'Test the full EMIL Trade brokerage platform in a sandbox environment before going live.',
};

const sandboxFeatures = [
  { icon: Zap, title: 'Full Trading Engine', description: 'Place orders, manage positions, and test execution across all 500+ instruments with simulated liquidity.' },
  { icon: Users, title: 'CRM & Client Management', description: 'Test the complete client lifecycle from registration to KYC verification, account opening, and support.' },
  { icon: BarChart3, title: 'Copy Trading & PAMM', description: 'Set up strategy providers, test copy allocation logic, and verify PAMM performance calculations.' },
  { icon: Shield, title: 'Compliance Module', description: 'Walk through the KYC/AML workflow, document verification, and regulatory reporting features.' },
  { icon: Globe, title: 'White-Label Preview', description: 'See how your branded platform will look with custom logos, colors, and domain configuration.' },
  { icon: Layers, title: 'API Sandbox', description: 'Full API access with sandbox credentials. Test integrations before connecting to production systems.' },
];

export default function SandboxPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            EMIL Trade
          </a>
          <nav className="flex items-center gap-6">
            <a href="/features" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Features</a>
            <a href="/pricing" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pricing</a>
            <a href="/sandbox" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Sandbox</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <div className="mb-16 text-center">
          <div
            className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{ background: 'rgba(0,155,77,0.1)', color: 'var(--accent-green)' }}
          >
            Free Sandbox Access
          </div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Test the Full Platform Before You Launch
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg" style={{ color: 'var(--text-secondary)' }}>
            Get a fully configured sandbox environment with simulated data, test accounts,
            and API credentials. No commitment required.
          </p>
        </div>

        {/* Features grid */}
        <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sandboxFeatures.map(feature => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl p-6"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(0,145,213,0.1)' }}
                >
                  <Icon size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="mt-4 font-bold" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Request Form */}
        <div
          className="rounded-2xl p-10"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Request Sandbox Access
          </h2>
          <p className="mb-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Fill out the form below and our team will provision your sandbox environment within 24 hours.
          </p>
          <SandboxForm />
        </div>
      </main>
    </div>
  );
}
