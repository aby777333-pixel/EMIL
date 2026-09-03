import FeaturePage from '@/components/FeaturePage';

export default function WhiteLabelPage() {
  return (
    <FeaturePage
      badge="White Label"
      badgeColor="#F0A500"
      title="White Label Platform"
      subtitle="Launch your own branded brokerage"
      description="Get a fully branded trading platform under your own name, domain, and identity. Multi-tenant architecture ensures complete data isolation. Everything from logo to email templates is customizable."
      ctaText="Contact Sales"
      ctaHref="/contact"
      features={[
        { title: 'Full Branding', desc: 'Custom logo, color scheme, domain, email templates, and landing pages. Your clients see your brand, not ours.' },
        { title: 'Custom Domain & SSL', desc: 'Run your platform on your own domain (e.g., trade.yourbrand.com) with automatic SSL certificate provisioning.' },
        { title: 'Dedicated Infrastructure', desc: 'Isolated database, API endpoints, and execution environment. Your data never mixes with other tenants.' },
        { title: 'Modular Features', desc: 'Enable or disable platform modules (copy trading, PAMM, prop trading, EA builder) based on your business model.' },
        { title: 'CRM & Back Office', desc: 'Built-in client management, KYC/AML workflows, deposit/withdrawal processing, and compliance reporting.' },
        { title: 'IB Portal', desc: 'Multi-level introducing broker network with automatic commission calculation, real-time tracking, and payout management.' },
        { title: 'Liquidity Integration', desc: 'Connect to any liquidity provider via FIX protocol or API bridge. Aggregate multiple LPs for best execution.' },
        { title: 'Compliance Ready', desc: 'Built-in audit trails, regulatory reporting, KYC document management, and AML screening.' },
        { title: '24/7 Support', desc: 'Dedicated account manager, technical support, and SLA-guaranteed uptime for your brokerage operations.' },
      ]}
    />
  );
}
