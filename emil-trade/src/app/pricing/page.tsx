import { Metadata } from 'next';
import { Check, X, ArrowRight, MessageSquare } from 'lucide-react';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Pricing | EMIL Trade',
  description: 'Choose the right plan for your brokerage. From free trial to enterprise white-label solutions.',
};

const tiers = [
  {
    name: 'Free Trial',
    price: '$0',
    period: '30 days',
    description: 'Experience the full Raptor platform with simulated trading. No credit card required.',
    cta: 'Start Free Trial',
    ctaHref: '/auth/register',
    highlight: false,
    color: 'var(--accent)',
  },
  {
    name: 'Professional',
    price: 'Custom',
    period: 'per month',
    description: 'Full-featured brokerage platform for licensed brokers and prop trading firms.',
    cta: 'Talk to Sales',
    ctaHref: '/contact',
    highlight: true,
    color: 'var(--accent-green)',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'annual contract',
    description: 'White-label deployment with dedicated infrastructure, custom integrations, and SLA guarantees.',
    cta: 'Contact Enterprise',
    ctaHref: '/contact',
    highlight: false,
    color: 'var(--gold)',
  },
];

type FeatureValue = boolean | string;

interface FeatureRow {
  name: string;
  free: FeatureValue;
  pro: FeatureValue;
  enterprise: FeatureValue;
}

const featureCategories: { category: string; features: FeatureRow[] }[] = [
  {
    category: 'Trading',
    features: [
      { name: 'Tradable Instruments', free: '50', pro: '500+', enterprise: '1000+' },
      { name: 'Maximum Leverage', free: '1:100', pro: '1:500', enterprise: 'Custom' },
      { name: 'Execution Speed', free: '< 50ms', pro: '< 10ms', enterprise: '< 1ms' },
      { name: 'Order Types', free: 'Market, Limit', pro: 'All 12 types', enterprise: 'All + Custom' },
      { name: 'Algorithmic Trading', free: false, pro: true, enterprise: true },
      { name: 'Multi-Asset Classes', free: 'Forex only', pro: 'All 7 classes', enterprise: 'All + Custom' },
    ],
  },
  {
    category: 'Copy Trading & PAMM',
    features: [
      { name: 'Copy Trading', free: false, pro: true, enterprise: true },
      { name: 'PAMM / MAM Accounts', free: false, pro: true, enterprise: true },
      { name: 'Strategy Marketplace', free: false, pro: true, enterprise: 'White-labeled' },
      { name: 'Social Trading Feed', free: false, pro: true, enterprise: true },
      { name: 'Performance Analytics', free: 'Basic', pro: 'Advanced', enterprise: 'Custom' },
    ],
  },
  {
    category: 'Prop Trading',
    features: [
      { name: 'Challenge System', free: false, pro: true, enterprise: true },
      { name: 'Custom Challenge Rules', free: false, pro: '5 templates', enterprise: 'Unlimited' },
      { name: 'Funded Account Management', free: false, pro: true, enterprise: true },
      { name: 'Payout Automation', free: false, pro: true, enterprise: true },
      { name: 'Prop Firm Branding', free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Platform & Tools',
    features: [
      { name: 'Web Trading Terminal', free: true, pro: true, enterprise: true },
      { name: 'Mobile App Access', free: true, pro: true, enterprise: 'Custom branded' },
      { name: 'EA Builder (No Code)', free: false, pro: true, enterprise: true },
      { name: 'Trade Journal', free: true, pro: true, enterprise: true },
      { name: 'Economic Calendar', free: true, pro: true, enterprise: true },
      { name: 'Advanced Charting', free: 'Basic', pro: 'TradingView Pro', enterprise: 'TradingView Pro' },
      { name: 'Price Alerts', free: '5', pro: 'Unlimited', enterprise: 'Unlimited' },
    ],
  },
  {
    category: 'API & Integration',
    features: [
      { name: 'REST API Access', free: false, pro: true, enterprise: true },
      { name: 'WebSocket Streaming', free: false, pro: true, enterprise: true },
      { name: 'FIX Protocol', free: false, pro: false, enterprise: true },
      { name: 'Webhooks', free: false, pro: true, enterprise: true },
      { name: 'API Rate Limit', free: false, pro: '1000/min', enterprise: 'Unlimited' },
      { name: 'SDK Access', free: false, pro: 'JS, Python', enterprise: 'All SDKs' },
    ],
  },
  {
    category: 'Broker Infrastructure',
    features: [
      { name: 'CRM Module', free: false, pro: true, enterprise: true },
      { name: 'KYC / AML Compliance', free: false, pro: true, enterprise: 'Custom workflow' },
      { name: 'Multi-Tier IB System', free: false, pro: true, enterprise: true },
      { name: 'Payment Gateway Integration', free: false, pro: '10+ gateways', enterprise: 'Custom' },
      { name: 'White-Label Deployment', free: false, pro: false, enterprise: true },
      { name: 'Custom Domain & Branding', free: false, pro: false, enterprise: true },
      { name: 'Dedicated Infrastructure', free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Support',
    features: [
      { name: 'Support Level', free: 'Community', pro: 'Priority Email', enterprise: 'Dedicated Manager' },
      { name: 'Response Time SLA', free: false, pro: '< 4 hours', enterprise: '< 1 hour' },
      { name: 'Onboarding Assistance', free: false, pro: true, enterprise: 'White-glove' },
      { name: 'Uptime SLA', free: false, pro: '99.9%', enterprise: '99.99%' },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            EMIL Trade
          </a>
          <nav className="flex items-center gap-6">
            <a href="/features" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Features</a>
            <a href="/developer" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Developers</a>
            <a href="/pricing" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Pricing</a>
            <a href="/auth/login" className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--accent)' }}>
              Sign In
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Plans Built for Every Stage
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg" style={{ color: 'var(--text-secondary)' }}>
            Start free, scale to enterprise. The same institutional-grade infrastructure at every tier.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mb-20 grid gap-6 md:grid-cols-3">
          {tiers.map(tier => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-2xl p-8"
              style={{
                background: 'var(--bg-surface)',
                border: tier.highlight ? `2px solid ${tier.color}` : '1px solid var(--border)',
                boxShadow: tier.highlight ? `0 0 40px ${tier.color}20` : undefined,
              }}
            >
              {tier.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider text-white"
                  style={{ background: tier.color }}
                >
                  Most Popular
                </div>
              )}
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{tier.name}</h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold" style={{ color: tier.color }}>{tier.price}</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/ {tier.period}</span>
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {tier.description}
              </p>
              <a
                href={tier.ctaHref}
                className="mt-8 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: tier.color }}
              >
                {tier.cta}
                <ArrowRight size={16} />
              </a>
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Full Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--accent)' }}>Free Trial</th>
                  <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--accent-green)' }}>Professional</th>
                  <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--gold)' }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featureCategories.map(cat => (
                  <>
                    <tr key={cat.category}>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-xs font-bold uppercase tracking-wider"
                        style={{ color: 'var(--accent)', background: 'var(--bg-elevated)' }}
                      >
                        {cat.category}
                      </td>
                    </tr>
                    {cat.features.map(feature => (
                      <tr
                        key={feature.name}
                        className="border-b"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <td className="sticky left-0 px-4 py-3 text-sm" style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)' }}>
                          {feature.name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <CellValue value={feature.free} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <CellValue value={feature.pro} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <CellValue value={feature.enterprise} />
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <PricingClient />
        </div>

        {/* Enterprise CTA */}
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Need a Custom Solution?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
            Our team will design a brokerage infrastructure tailored to your regulatory environment,
            liquidity requirements, and brand identity.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="/contact"
              className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--gold)' }}
            >
              <MessageSquare size={16} />
              Talk to Sales
            </a>
            <a
              href="/sandbox"
              className="rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}
            >
              Request Sandbox Access
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function CellValue({ value }: { value: FeatureValue }) {
  if (value === true) {
    return <Check size={18} style={{ color: 'var(--accent-green)' }} className="mx-auto" />;
  }
  if (value === false) {
    return <X size={18} style={{ color: 'var(--text-muted)' }} className="mx-auto" />;
  }
  return (
    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
      {value}
    </span>
  );
}
