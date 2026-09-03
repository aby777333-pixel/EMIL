import { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Partners | EMIL Trade',
  description: 'Technology partners, liquidity providers, and regulated brokers powering the EMIL Trade ecosystem.',
};

interface Partner {
  name: string;
  type: string;
  color: string;
}

const technologyPartners: Partner[] = [
  { name: 'TradingView', type: 'Charting', color: '#131722' },
  { name: 'AWS', type: 'Cloud Infrastructure', color: '#FF9900' },
  { name: 'Cloudflare', type: 'CDN & Security', color: '#F38020' },
  { name: 'Supabase', type: 'Backend Platform', color: '#3ECF8E' },
  { name: 'Veriff', type: 'Identity Verification', color: '#5166FF' },
  { name: 'Stripe', type: 'Payment Processing', color: '#635BFF' },
];

const liquidityPartners: Partner[] = [
  { name: 'LMAX Exchange', type: 'FX & CFD Liquidity', color: '#0046AD' },
  { name: 'Finalto', type: 'Multi-Asset Liquidity', color: '#00A0E3' },
  { name: 'B2Broker', type: 'Liquidity Aggregation', color: '#F5A623' },
  { name: 'Leverate', type: 'FX Liquidity', color: '#00C4B3' },
  { name: 'Advanced Markets', type: 'Institutional Liquidity', color: '#1A237E' },
  { name: 'CFH Clearing', type: 'Prime Brokerage', color: '#2196F3' },
];

const regulatedBrokers: Partner[] = [
  { name: 'Partner Broker A', type: 'FCA Regulated', color: '#4CAF50' },
  { name: 'Partner Broker B', type: 'CySEC Regulated', color: '#2196F3' },
  { name: 'Partner Broker C', type: 'ASIC Regulated', color: '#FF9800' },
  { name: 'Partner Broker D', type: 'FSA Regulated', color: '#9C27B0' },
];

function PartnerGrid({ partners }: { partners: Partner[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {partners.map(partner => (
        <div
          key={partner.name}
          className="flex items-center gap-4 rounded-xl p-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {/* Logo placeholder */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: partner.color }}
          >
            {partner.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{partner.name}</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{partner.type}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PartnersPage() {
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
            <a href="/partners" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Partners</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Our Partners
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg" style={{ color: 'var(--text-secondary)' }}>
            The EMIL Trade ecosystem is powered by industry-leading technology providers,
            tier-1 liquidity partners, and regulated brokerage firms worldwide.
          </p>
        </div>

        {/* Technology Partners */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-1 w-8 rounded" style={{ background: 'var(--accent)' }} />
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Technology Partners
            </h2>
          </div>
          <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Best-in-class technology providers that power the Raptor infrastructure.
          </p>
          <PartnerGrid partners={technologyPartners} />
        </section>

        {/* Liquidity Partners */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-1 w-8 rounded" style={{ background: 'var(--accent-green)' }} />
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Liquidity Partners
            </h2>
          </div>
          <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Pre-integrated tier-1 liquidity providers with bridge connectivity.
          </p>
          <PartnerGrid partners={liquidityPartners} />
        </section>

        {/* Regulated Brokers */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-1 w-8 rounded" style={{ background: 'var(--gold)' }} />
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Regulated Brokers
            </h2>
          </div>
          <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Licensed brokerage firms operating on the Raptor platform.
          </p>
          <PartnerGrid partners={regulatedBrokers} />
        </section>

        {/* Become a Partner CTA */}
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,145,213,0.08), rgba(240,165,0,0.08))',
            border: '1px solid var(--border)',
          }}
        >
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Become a Partner
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
            Join the GIO4X ecosystem as a technology partner, liquidity provider, or introducing broker.
            We offer dedicated integration support and co-marketing opportunities.
          </p>
          <a
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Apply for Partnership
            <ArrowRight size={16} />
          </a>
        </div>
      </main>
    </div>
  );
}
