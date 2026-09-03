import { Metadata } from 'next';
import { Code2, Zap, Radio, Webhook, ArrowRight } from 'lucide-react';
import DeveloperClient from './DeveloperClient';

export const metadata: Metadata = {
  title: 'Developer Portal | EMIL Trade',
  description: 'Build on the Raptor Trading System. REST API, WebSocket streaming, FIX protocol, and webhooks.',
};

const apiCards = [
  {
    icon: Code2,
    title: 'REST API',
    description: 'Full-featured RESTful API for account management, order execution, position tracking, and historical data retrieval. JSON request/response format with comprehensive error handling.',
    features: ['Order placement & management', 'Account & portfolio data', 'Historical OHLCV bars', 'User & KYC management'],
  },
  {
    icon: Zap,
    title: 'WebSocket Streaming',
    description: 'Real-time market data and account event streaming over persistent WebSocket connections. Sub-millisecond latency for price updates and order fills.',
    features: ['Live price ticks', 'Order book depth (L2)', 'Account event notifications', 'Heartbeat & reconnection'],
  },
  {
    icon: Radio,
    title: 'FIX Protocol',
    description: 'Industry-standard FIX 4.4 gateway for institutional connectivity. Direct market access with full order routing and execution reporting for enterprise integrations.',
    features: ['FIX 4.4 compliant', 'Market & limit orders', 'Execution reports', 'Session management'],
  },
  {
    icon: Webhook,
    title: 'Webhooks',
    description: 'Push-based event notifications for trade executions, deposits, withdrawals, KYC status changes, and system events. Configurable retry logic and HMAC signature verification.',
    features: ['Trade execution events', 'Payment notifications', 'KYC status updates', 'Configurable filters'],
  },
];

const sdks = [
  { name: 'Python', color: '#3776AB' },
  { name: 'JavaScript', color: '#F7DF1E' },
  { name: 'Go', color: '#00ADD8' },
];

export default function DeveloperPage() {
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
            <a href="/developer" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Developers</a>
            <a href="/auth/login" className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--accent)' }}>
              Sign In
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <div className="mb-16 grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div
              className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              style={{ background: 'rgba(0,145,213,0.1)', color: 'var(--accent)' }}
            >
              Developer Portal
            </div>
            <h1 className="text-4xl font-bold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
              Build on Raptor
            </h1>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Integrate institutional-grade trading infrastructure into your applications.
              REST, WebSocket, FIX, and webhook APIs with comprehensive SDKs.
            </p>
            <div className="mt-8 flex gap-4">
              <a
                href="/auth/login"
                className="flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                Get API Keys
                <ArrowRight size={16} />
              </a>
              <a
                href="/developer/docs"
                className="rounded-lg px-5 py-3 text-sm font-semibold hover:opacity-80"
                style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}
              >
                Read the Docs
              </a>
            </div>
          </div>

          {/* Code snippet visual */}
          <div
            className="rounded-xl p-1"
            style={{ background: 'linear-gradient(135deg, var(--accent)33, var(--accent-green)33)' }}
          >
            <div className="rounded-lg p-5 font-mono text-sm" style={{ background: 'var(--bg-surface)' }}>
              <div className="mb-3 flex gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ background: '#FF5F56' }} />
                <div className="h-3 w-3 rounded-full" style={{ background: '#FFBD2E' }} />
                <div className="h-3 w-3 rounded-full" style={{ background: '#27C93F' }} />
              </div>
              <pre style={{ color: 'var(--text-secondary)' }}>
                <code>{`curl -X POST \\
  https://api.gio4x.com/v1/orders \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "EURUSD",
    "side": "buy",
    "type": "market",
    "quantity": 1.0
  }'`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* API Cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-2">
          {apiCards.map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-xl p-6"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(0,145,213,0.1)' }}
                  >
                    <Icon size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {card.description}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {card.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Code Examples */}
        <div className="mb-16">
          <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Quick Start Examples
          </h2>
          <DeveloperClient />
        </div>

        {/* SDK Badges */}
        <div className="mb-16 text-center">
          <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Official SDKs
          </h2>
          <div className="flex items-center justify-center gap-4">
            {sdks.map(sdk => (
              <div
                key={sdk.name}
                className="flex items-center gap-2 rounded-full px-5 py-2.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div className="h-3 w-3 rounded-full" style={{ background: sdk.color }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{sdk.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,145,213,0.08), rgba(0,155,77,0.08))',
            border: '1px solid var(--border)',
          }}
        >
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Ready to Integrate?
          </h2>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Create an account to get your API keys and start building in minutes.
          </p>
          <a
            href="/auth/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Get API Keys
            <ArrowRight size={16} />
          </a>
        </div>
      </main>
    </div>
  );
}
