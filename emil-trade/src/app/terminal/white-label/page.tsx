'use client';

import TopBar from '@/components/layout/TopBar';
import {
  Building2, Palette, Globe, Shield, Server, Headphones,
  Check, ArrowRight, Layers, Zap,
} from 'lucide-react';

const features = [
  { icon: <Palette size={20} />, title: 'Full Branding', desc: 'Custom logo, colors, domain, and email templates' },
  { icon: <Globe size={20} />, title: 'Custom Domain', desc: 'Your own domain with SSL certificate included' },
  { icon: <Shield size={20} />, title: 'Compliance Ready', desc: 'Built-in KYC/AML, reporting, and audit trails' },
  { icon: <Server size={20} />, title: 'Dedicated Infra', desc: 'Isolated database, API, and execution environment' },
  { icon: <Layers size={20} />, title: 'Modular Features', desc: 'Enable/disable modules per your business model' },
  { icon: <Headphones size={20} />, title: '24/7 Support', desc: 'Dedicated account manager and tech support' },
];

const plans = [
  {
    name: 'Starter',
    price: '$999',
    period: '/mo',
    desc: 'For small brokers getting started',
    color: '#0091D5',
    features: ['Up to 500 traders', 'Basic branding', 'Forex + Metals', 'Email support', 'Standard APIs'],
  },
  {
    name: 'Professional',
    price: '$2,499',
    period: '/mo',
    desc: 'For growing brokerages',
    color: '#00C853',
    popular: true,
    features: ['Up to 5,000 traders', 'Full branding + domain', 'All asset classes', 'Priority support', 'Copy trading + PAMM', 'Custom reports'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For institutional-grade operations',
    color: '#F0A500',
    features: ['Unlimited traders', 'Dedicated infrastructure', 'Custom development', 'SLA guaranteed', 'On-premise option', 'FIX protocol bridge', 'LP integration'],
  },
];

export default function WhiteLabelPage() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopBar />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Building2 size={28} style={{ color: '#0091D5' }} />
              <h1 className="text-3xl font-bold">White Label Platform</h1>
            </div>
            <p className="text-sm max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Launch your own branded brokerage in days, not months. Full platform customization, multi-tenant isolation, and enterprise-grade infrastructure.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {features.map((f, i) => (
              <div key={i} className="rounded-xl border p-5 transition-all hover:border-[#0091D5]/20" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="mb-3 text-[#0091D5]">{f.icon}</div>
                <div className="text-sm font-bold mb-1">{f.title}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <h2 className="text-xl font-bold text-center mb-6">Pricing Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-xl border p-6 relative"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: plan.popular ? plan.color + '60' : 'var(--border)',
                  boxShadow: plan.popular ? `0 0 30px ${plan.color}15` : 'none',
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full" style={{ backgroundColor: plan.color, color: '#000' }}>
                    MOST POPULAR
                  </div>
                )}
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: plan.color }}>{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-xs opacity-50">{plan.period}</span>
                </div>
                <div className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>{plan.desc}</div>
                <div className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs">
                      <Check size={14} style={{ color: plan.color }} />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                  style={{ backgroundColor: plan.color, color: '#000' }}
                >
                  Get Started <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center rounded-xl border p-8" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <Zap size={24} className="mx-auto mb-3" style={{ color: '#F0A500' }} />
            <h3 className="text-lg font-bold mb-2">Need a Custom Solution?</h3>
            <p className="text-xs mb-4 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Our team will build a tailor-made brokerage infrastructure for your specific requirements. From LP integration to custom compliance workflows.
            </p>
            <button className="px-6 py-2.5 rounded-lg text-xs font-bold" style={{ backgroundColor: '#F0A500', color: '#000' }}>
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
