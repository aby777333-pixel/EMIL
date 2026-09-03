'use client';

import { useState } from 'react';
import { Plug, Radio, Key } from 'lucide-react';
import { IntegrationHub } from '@/components/integrations/IntegrationHub';
import { LpMonitor } from '@/components/integrations/LpMonitor';
import { ApiHub } from '@/components/integrations/ApiHub';
import type { IntegrationSummary, LiquidityProvider, ApiKey, WebhookEndpoint, WebhookDelivery } from '@/types/integrations';

const MOCK_INTEGRATIONS: IntegrationSummary[] = [
  { id: '1', name: 'MetaTrader 5', category: 'platform', type: 'mt5', status: 'connected', description: 'Full MT5 Manager API integration for account, group, and trade management', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '2', name: 'cTrader', category: 'platform', type: 'ctrader', status: 'connected', description: 'cTrader Open API for accounts, positions, and cBot management', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '3', name: 'LMAX Exchange', category: 'liquidity', type: 'lmax', status: 'connected', description: 'FIX 4.4 connection to LMAX institutional exchange', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '4', name: 'PrimeXM XCore', category: 'liquidity', type: 'primexm', status: 'connected', description: 'Multi-asset liquidity aggregation via PrimeXM', logoUrl: null, isConfigured: true, isPremium: true, docsUrl: null },
  { id: '5', name: 'OneZero Hub', category: 'liquidity', type: 'onezero', status: 'disconnected', description: 'Institutional-grade liquidity hub and risk management', logoUrl: null, isConfigured: false, isPremium: true, docsUrl: null },
  { id: '6', name: 'Stripe', category: 'psp', type: 'stripe', status: 'connected', description: 'Global card processing with 3DS2 and smart retry', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '7', name: 'Nuvei', category: 'psp', type: 'nuvei', status: 'connected', description: 'Multi-currency payment processing with local methods', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '8', name: 'B2BinPay', category: 'psp', type: 'b2binpay', status: 'connected', description: 'Crypto payment gateway: BTC, ETH, USDT across all networks', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '9', name: 'Sumsub', category: 'kyc', type: 'sumsub', status: 'connected', description: 'AI-powered identity verification, liveness, and document OCR', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '10', name: 'Refinitiv World-Check', category: 'kyc', type: 'refinitiv', status: 'connected', description: 'PEP, sanctions, and adverse media screening', logoUrl: null, isConfigured: true, isPremium: true, docsUrl: null },
  { id: '11', name: 'Chainalysis', category: 'kyc', type: 'chainalysis', status: 'disconnected', description: 'Blockchain transaction tracing and crypto compliance', logoUrl: null, isConfigured: false, isPremium: true, docsUrl: null },
  { id: '12', name: 'Twilio', category: 'comms', type: 'twilio_sms', status: 'connected', description: 'SMS, WhatsApp Business API, and voice communications', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '13', name: 'SendGrid', category: 'comms', type: 'sendgrid', status: 'connected', description: 'Transactional and marketing email delivery', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '14', name: 'Telegram Bot', category: 'comms', type: 'telegram', status: 'connected', description: 'Trade alerts, bot commands, and notifications via Telegram', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '15', name: 'Segment', category: 'analytics', type: 'segment', status: 'connected', description: 'Customer Data Platform for unified event routing', logoUrl: null, isConfigured: true, isPremium: true, docsUrl: null },
  { id: '16', name: 'Google Analytics 4', category: 'analytics', type: 'ga4', status: 'connected', description: 'Web and app analytics with conversion tracking', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '17', name: 'Mixpanel', category: 'analytics', type: 'mixpanel', status: 'disconnected', description: 'Product analytics with funnel, retention, and cohort analysis', logoUrl: null, isConfigured: false, isPremium: false, docsUrl: null },
  { id: '18', name: 'Trading Economics', category: 'data', type: 'trading_economics', status: 'connected', description: 'Economic indicators, forecasts, and calendar data', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '19', name: 'CoinGecko', category: 'data', type: 'coingecko', status: 'connected', description: 'Crypto market data, prices, and market cap rankings', logoUrl: null, isConfigured: true, isPremium: false, docsUrl: null },
  { id: '20', name: 'Salesforce', category: 'enterprise', type: 'salesforce', status: 'disconnected', description: 'Bi-directional CRM sync with Salesforce', logoUrl: null, isConfigured: false, isPremium: true, docsUrl: null },
  { id: '21', name: 'QuickBooks', category: 'enterprise', type: 'quickbooks', status: 'disconnected', description: 'Accounting integration for automated bookkeeping', logoUrl: null, isConfigured: false, isPremium: false, docsUrl: null },
  { id: '22', name: 'FIX Gateway', category: 'fix', type: 'fix_gateway', status: 'connected', description: 'FIX 4.2/4.4/5.0 protocol engine for institutional connectivity', logoUrl: null, isConfigured: true, isPremium: true, docsUrl: null },
];

const MOCK_LPS: LiquidityProvider[] = [
  { id: 'lp1', name: 'LMAX Exchange', connector: 'lmax', status: 'connected', fixSessionId: 'LMAX_001', symbols: 72, fillRate: 99.4, avgSlippage: 0.12, avgLatencyMs: 8, uptimePct: 99.99, volumeToday: 45_600_000, rejectsToday: 3, requotesToday: 0, spreadCost: 0.3, lastHeartbeat: new Date().toISOString() },
  { id: 'lp2', name: 'PrimeXM XCore', connector: 'primexm', status: 'connected', fixSessionId: 'PXM_001', symbols: 156, fillRate: 98.7, avgSlippage: 0.28, avgLatencyMs: 14, uptimePct: 99.95, volumeToday: 78_200_000, rejectsToday: 12, requotesToday: 5, spreadCost: 0.5, lastHeartbeat: new Date().toISOString() },
  { id: 'lp3', name: 'Integral OCX', connector: 'integral', status: 'connected', fixSessionId: 'INT_001', symbols: 89, fillRate: 97.2, avgSlippage: 0.45, avgLatencyMs: 22, uptimePct: 99.80, volumeToday: 23_100_000, rejectsToday: 28, requotesToday: 15, spreadCost: 0.8, lastHeartbeat: new Date().toISOString() },
  { id: 'lp4', name: 'IS Prime', connector: 'is_prime', status: 'connected', fixSessionId: 'ISP_001', symbols: 65, fillRate: 99.1, avgSlippage: 0.18, avgLatencyMs: 11, uptimePct: 99.97, volumeToday: 34_500_000, rejectsToday: 5, requotesToday: 2, spreadCost: 0.4, lastHeartbeat: new Date().toISOString() },
];

const MOCK_API_KEYS: ApiKey[] = [
  { id: 'k1', name: 'Production API', keyPrefix: 'rpt_live_3f8a', permissions: ['read', 'trade', 'account'], rateLimit: 120, rateLimitWindow: '1m', totalRequests: 1_234_567, lastUsed: new Date().toISOString(), isActive: true, createdAt: '2025-06-01', expiresAt: null },
  { id: 'k2', name: 'Sandbox API', keyPrefix: 'rpt_test_9c2b', permissions: ['read', 'trade', 'account'], rateLimit: 60, rateLimitWindow: '1m', totalRequests: 45_678, lastUsed: new Date(Date.now() - 3600000).toISOString(), isActive: true, createdAt: '2025-08-15', expiresAt: null },
  { id: 'k3', name: 'Read-Only Analytics', keyPrefix: 'rpt_ro_7d4e', permissions: ['read'], rateLimit: 300, rateLimitWindow: '1m', totalRequests: 890_123, lastUsed: new Date(Date.now() - 1800000).toISOString(), isActive: true, createdAt: '2025-11-01', expiresAt: '2027-01-01' },
];

const MOCK_WEBHOOKS: WebhookEndpoint[] = [
  { id: 'wh1', url: 'https://api.mybusiness.com/webhooks/raptor', events: ['trade.opened', 'trade.closed', 'deposit.completed', 'withdrawal.approved'], isActive: true, signingSecret: 'whsec_xxx', successRate: 99.2, totalDeliveries: 12345, failedDeliveries: 98, lastDelivery: new Date().toISOString(), lastStatus: 200, createdAt: '2025-09-01' },
  { id: 'wh2', url: 'https://hooks.slack.com/services/xxx/yyy', events: ['margin.call', 'stop.out', 'challenge.passed', 'challenge.failed'], isActive: true, signingSecret: 'whsec_yyy', successRate: 100, totalDeliveries: 234, failedDeliveries: 0, lastDelivery: new Date(Date.now() - 7200000).toISOString(), lastStatus: 200, createdAt: '2025-10-15' },
];

const MOCK_DELIVERIES: WebhookDelivery[] = Array.from({ length: 20 }, (_, i) => ({
  id: `d${i}`, endpointId: 'wh1',
  event: ['trade.opened', 'trade.closed', 'deposit.completed', 'withdrawal.approved'][i % 4],
  status: i === 3 ? 500 : i === 7 ? 408 : 200,
  responseTime: 50 + Math.floor(Math.random() * 200),
  attempt: i === 3 || i === 7 ? 2 : 1,
  payload: '{}',
  deliveredAt: new Date(Date.now() - i * 300000).toISOString(),
}));

export default function IntegrationsPage() {
  const [tab, setTab] = useState<'hub' | 'lp' | 'api'>('hub');

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Integration Hub</h1>
          <p className="text-xs text-white/30">Manage all platform, liquidity, payment, and third-party connections</p>
        </div>
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {([
            { key: 'hub', label: 'All Integrations', icon: <Plug className="h-3.5 w-3.5" /> },
            { key: 'lp', label: 'LP Monitor', icon: <Radio className="h-3.5 w-3.5" /> },
            { key: 'api', label: 'API & Webhooks', icon: <Key className="h-3.5 w-3.5" /> },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
              }`}>{t.icon}{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'hub' && <IntegrationHub integrations={MOCK_INTEGRATIONS} onConfigure={(id) => console.log('Configure', id)} />}
      {tab === 'lp' && <LpMonitor providers={MOCK_LPS} />}
      {tab === 'api' && (
        <ApiHub
          apiKeys={MOCK_API_KEYS}
          webhooks={MOCK_WEBHOOKS}
          recentDeliveries={MOCK_DELIVERIES}
          onCreateKey={(name, perms) => console.log('Create key', name, perms)}
          onToggleKey={(id, active) => console.log('Toggle key', id, active)}
          onDeleteKey={(id) => console.log('Delete key', id)}
          onCreateWebhook={(url, events) => console.log('Create webhook', url, events)}
          onToggleWebhook={(id, active) => console.log('Toggle webhook', id, active)}
        />
      )}
    </div>
  );
}
