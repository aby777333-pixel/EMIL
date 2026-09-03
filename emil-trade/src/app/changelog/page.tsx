import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog | EMIL Trade',
  description: 'Release notes and version history for the EMIL Trade Trading System.',
};

type ChangeType = 'new' | 'improved' | 'fixed';

interface ChangeEntry {
  version: string;
  date: string;
  title: string;
  changes: { type: ChangeType; text: string }[];
}

const releases: ChangeEntry[] = [
  {
    version: 'v2.0.0',
    date: '2026-03-28',
    title: 'Raptor Trading System -- Full Platform Launch',
    changes: [
      { type: 'new', text: 'Complete brokerage operating system with 18 integrated modules' },
      { type: 'new', text: 'Multi-asset trading engine supporting Forex, Crypto, Indices, Commodities, Stocks, ETFs, and Futures' },
      { type: 'new', text: 'Institutional-grade order matching with sub-millisecond execution' },
      { type: 'new', text: 'Copy trading and social trading marketplace' },
      { type: 'new', text: 'PAMM / MAM money management system' },
      { type: 'new', text: 'Prop trading challenge engine with configurable evaluation rules' },
      { type: 'new', text: 'No-code EA Builder for automated strategy creation' },
      { type: 'new', text: 'Multi-tier IB (Introducing Broker) commission system' },
      { type: 'new', text: 'Full KYC/AML compliance module with document verification' },
      { type: 'new', text: 'Integrated CRM with lead scoring and client segmentation' },
      { type: 'new', text: 'REST API, WebSocket streaming, and FIX 4.4 protocol support' },
      { type: 'new', text: 'White-label deployment infrastructure with 48-hour setup' },
      { type: 'new', text: 'Real-time risk management and margin monitoring' },
      { type: 'new', text: 'Trade journal with performance analytics' },
      { type: 'new', text: 'Economic calendar with impact indicators' },
      { type: 'new', text: 'Multi-gateway payment processing' },
      { type: 'improved', text: 'Responsive web terminal with TradingView charting integration' },
      { type: 'improved', text: 'Dark and light theme support across all modules' },
    ],
  },
  {
    version: 'v1.5.0-beta',
    date: '2026-02-15',
    title: 'Beta 5 -- Prop Trading & Copy Trading',
    changes: [
      { type: 'new', text: 'Prop trading challenge system with 2-phase evaluation' },
      { type: 'new', text: 'Copy trading signal provider and follower matching' },
      { type: 'improved', text: 'Order execution latency reduced by 40%' },
      { type: 'improved', text: 'WebSocket reconnection logic with automatic resubscription' },
      { type: 'fixed', text: 'Margin calculation edge case with hedged positions' },
      { type: 'fixed', text: 'Price chart timezone inconsistency across browsers' },
    ],
  },
  {
    version: 'v1.4.0-beta',
    date: '2026-01-20',
    title: 'Beta 4 -- IB System & Payment Module',
    changes: [
      { type: 'new', text: 'Multi-tier Introducing Broker commission tracking' },
      { type: 'new', text: 'Payment gateway integration for deposits and withdrawals' },
      { type: 'new', text: 'Automated commission distribution engine' },
      { type: 'improved', text: 'Dashboard performance with virtual scrolling for large datasets' },
      { type: 'fixed', text: 'Session timeout handling in multi-tab scenarios' },
      { type: 'fixed', text: 'PDF report generation for trade history exports' },
    ],
  },
  {
    version: 'v1.3.0-beta',
    date: '2025-12-10',
    title: 'Beta 3 -- KYC & Compliance',
    changes: [
      { type: 'new', text: 'Document upload and verification workflow' },
      { type: 'new', text: 'Automated identity verification via third-party provider' },
      { type: 'new', text: 'Compliance audit trail and reporting' },
      { type: 'improved', text: 'User onboarding flow with progress tracking' },
      { type: 'fixed', text: 'File upload size validation on mobile browsers' },
    ],
  },
  {
    version: 'v1.2.0-beta',
    date: '2025-11-01',
    title: 'Beta 2 -- CRM & Admin Panel',
    changes: [
      { type: 'new', text: 'CRM module with client lifecycle management' },
      { type: 'new', text: 'Admin panel for broker operations and user management' },
      { type: 'new', text: 'Email notification system' },
      { type: 'improved', text: 'Table sorting and filtering across all data views' },
      { type: 'fixed', text: 'Chart rendering on high-DPI displays' },
    ],
  },
  {
    version: 'v1.0.0-beta',
    date: '2025-09-15',
    title: 'Beta 1 -- Core Trading Engine',
    changes: [
      { type: 'new', text: 'Core order matching engine with market and limit order support' },
      { type: 'new', text: 'Real-time price feed aggregation from multiple LPs' },
      { type: 'new', text: 'Web-based trading terminal with chart and order panel' },
      { type: 'new', text: 'User authentication and account management' },
      { type: 'new', text: 'Position tracking and P&L calculation engine' },
    ],
  },
];

const typeConfig: Record<ChangeType, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: 'var(--accent-green)', bg: 'rgba(0,155,77,0.12)' },
  improved: { label: 'Improved', color: 'var(--accent)', bg: 'rgba(0,145,213,0.12)' },
  fixed: { label: 'Fixed', color: 'var(--gold)', bg: 'rgba(240,165,0,0.12)' },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            EMIL Trade
          </a>
          <nav className="flex items-center gap-6">
            <a href="/features" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Features</a>
            <a href="/pricing" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pricing</a>
            <a href="/changelog" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Changelog</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Changelog
        </h1>
        <p className="mt-3 text-lg" style={{ color: 'var(--text-secondary)' }}>
          New features, improvements, and fixes in every release.
        </p>

        {/* Timeline */}
        <div className="relative mt-12">
          {/* Vertical line */}
          <div
            className="absolute left-[7px] top-2 h-full w-px"
            style={{ background: 'var(--border-strong)' }}
          />

          <div className="space-y-12">
            {releases.map(release => (
              <div key={release.version} className="relative pl-10">
                {/* Timeline dot */}
                <div
                  className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: release.version.includes('beta') ? 'var(--text-muted)' : 'var(--accent-green)',
                  }}
                />

                {/* Version header */}
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="rounded-full px-3 py-0.5 font-mono text-sm font-bold"
                    style={{
                      background: release.version.includes('beta') ? 'var(--bg-elevated)' : 'rgba(0,155,77,0.12)',
                      color: release.version.includes('beta') ? 'var(--text-secondary)' : 'var(--accent-green)',
                    }}
                  >
                    {release.version}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {new Date(release.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <h2 className="mt-2 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {release.title}
                </h2>

                {/* Changes */}
                <ul className="mt-4 space-y-2">
                  {release.changes.map((change, i) => {
                    const config = typeConfig[change.type];
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-semibold"
                          style={{ background: config.bg, color: config.color }}
                        >
                          {config.label}
                        </span>
                        <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {change.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
