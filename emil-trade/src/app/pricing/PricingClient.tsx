'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'How long is the free trial?',
    a: 'The free trial lasts 30 days and includes access to the full trading terminal with simulated funds. No credit card is required. You can trade all 50 instruments available on the trial tier to evaluate the platform before committing.',
  },
  {
    q: 'What happens when my trial expires?',
    a: 'Your account remains accessible in read-only mode. All your trading history, journal entries, and configurations are preserved. You can upgrade to Professional at any time to resume live trading.',
  },
  {
    q: 'How is Professional pricing structured?',
    a: 'Professional pricing is based on your trading volume, number of active accounts, and selected modules. We offer monthly and annual billing. Contact our sales team for a custom quote tailored to your brokerage needs.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes. You can upgrade from Free Trial to Professional at any time. Enterprise migrations are handled by our onboarding team to ensure zero downtime during the transition.',
  },
  {
    q: 'What is included in the white-label deployment?',
    a: 'Enterprise white-label includes custom branding (logo, colors, domain), dedicated infrastructure, custom instrument configuration, regulatory compliance setup for your jurisdiction, branded mobile apps, and a dedicated account manager.',
  },
  {
    q: 'Do you provide liquidity?',
    a: 'EMIL Trade is a technology platform, not a liquidity provider. However, we have pre-integrated connections with 15+ tier-1 liquidity providers and can assist with LP selection and aggregation setup.',
  },
  {
    q: 'What regulatory frameworks do you support?',
    a: 'The platform supports compliance workflows for FCA, CySEC, ASIC, FSA, FSCA, and other major regulators. KYC/AML modules are configurable per jurisdiction. Enterprise clients receive custom compliance integrations.',
  },
  {
    q: 'Is there a setup fee?',
    a: 'Free Trial and Professional plans have no setup fee. Enterprise white-label deployments include a one-time setup and integration fee based on the scope of customization required.',
  },
];

export default function PricingClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-2">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className="rounded-lg"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {faq.q}
            </span>
            <ChevronDown
              size={18}
              className="shrink-0 transition-transform duration-200"
              style={{
                color: 'var(--text-muted)',
                transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>
          {openIndex === i && (
            <div className="px-5 pb-4">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {faq.a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
