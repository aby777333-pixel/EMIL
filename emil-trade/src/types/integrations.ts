// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 4: Connectivity & Integration Hub Types
// ═══════════════════════════════════════════════════════════

// ─── Platform Bridges ───────────────────────────────────────

export type PlatformType = 'mt5' | 'ctrader' | 'raptor_native';
export type BridgeStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'maintenance';

export interface PlatformBridge {
  id: string;
  name: string;
  platform: PlatformType;
  host: string;
  port: number;
  status: BridgeStatus;
  environment: 'live' | 'demo' | 'prop';
  accounts: number;
  activeConnections: number;
  latencyMs: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: string;
  lastHeartbeat: string;
  failoverTarget: string | null;
  version: string;
}

// ─── Liquidity Provider Hub ─────────────────────────────────

export type LpConnectorType = 'onezero' | 'primexm' | 'integral' | 'finalto' | 'lucera' | 'is_prime' | 'lmax' | 'custom_fix';
export type RoutingStrategy = 'best_price' | 'best_fill' | 'latency_optimal' | 'hybrid' | 'rule_based';

export interface LiquidityProvider {
  id: string;
  name: string;
  connector: LpConnectorType;
  status: BridgeStatus;
  fixSessionId: string;
  symbols: number;
  fillRate: number;
  avgSlippage: number;
  avgLatencyMs: number;
  uptimePct: number;
  volumeToday: number;
  rejectsToday: number;
  requotesToday: number;
  spreadCost: number;
  lastHeartbeat: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  strategy: RoutingStrategy;
  isActive: boolean;
  priority: number;
  conditions: { field: string; operator: string; value: string }[];
  targetLps: string[];
  weightScoring: { price: number; fill: number; latency: number } | null;
  failoverLps: string[];
}

export interface LpComparison {
  metric: string;
  values: { lpName: string; value: number; rank: number }[];
}

// ─── FIX Protocol ───────────────────────────────────────────

export type FixVersion = '4.2' | '4.4' | '5.0' | '5.0sp2';

export interface FixSession {
  id: string;
  senderCompId: string;
  targetCompId: string;
  fixVersion: FixVersion;
  status: 'active' | 'logged_out' | 'error' | 'pending';
  sessionType: 'lp_outbound' | 'institutional_inbound' | 'drop_copy' | 'price_feed';
  messagesIn: number;
  messagesOut: number;
  lastSequenceIn: number;
  lastSequenceOut: number;
  avgLatencyMs: number;
  errorsToday: number;
  connectedSince: string | null;
}

// ─── API Hub ────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  rateLimitWindow: string;
  totalRequests: number;
  lastUsed: string | null;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  signingSecret: string;
  successRate: number;
  totalDeliveries: number;
  failedDeliveries: number;
  lastDelivery: string | null;
  lastStatus: number | null;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  status: number;
  responseTime: number;
  attempt: number;
  payload: string;
  deliveredAt: string;
}

// ─── Payment Service Providers ──────────────────────────────

export type PspType = 'stripe' | 'nuvei' | 'checkout' | 'praxis' | 'paysafe' | 'skrill' | 'neteller'
  | 'razorpay' | 'fpx' | 'ideal' | 'b2binpay' | 'coinpayments' | 'fireblocks' | 'binance_pay' | 'custom';

export interface PspConnector {
  id: string;
  name: string;
  type: PspType;
  status: BridgeStatus;
  isLive: boolean;
  supportedCurrencies: string[];
  supportedMethods: string[];
  approvalRate: number;
  avgProcessingTime: string;
  volumeToday: number;
  transactionsToday: number;
  failurestoday: number;
  fees: { fixed: number; percentagse: number; currency: string };
  countries: string[];
  lastTransaction: string | null;
}

export interface PaymentRoute {
  id: string;
  name: string;
  conditions: { field: string; operator: string; value: string }[];
  primaryPsp: string;
  fallbackPsps: string[];
  isActive: boolean;
}

// ─── KYC Providers ──────────────────────────────────────────

export type KycProviderType = 'sumsub' | 'onfido' | 'refinitiv' | 'complyadvantage' | 'jumio' | 'chainalysis' | 'au10tix' | 'shufti' | 'custom';

export interface KycProvider {
  id: string;
  name: string;
  type: KycProviderType;
  status: BridgeStatus;
  isPrimary: boolean;
  features: string[];
  verificationsToday: number;
  approvalRate: number;
  avgProcessingTime: string;
  costPerVerification: number;
}

// ─── Communication Channels ─────────────────────────────────

export type CommChannelType = 'twilio_sms' | 'twilio_whatsapp' | 'sendgrid' | 'fcm' | 'apns' | 'pusher'
  | 'telegram' | 'discord' | 'slack' | 'intercom' | 'freshdesk';

export interface CommChannel {
  id: string;
  name: string;
  type: CommChannelType;
  status: BridgeStatus;
  messagesToday: number;
  deliveryRate: number;
  lastMessage: string | null;
  isConfigured: boolean;
}

// ─── Analytics & Marketing ──────────────────────────────────

export type AnalyticsType = 'segment' | 'mixpanel' | 'amplitude' | 'ga4' | 'meta_capi' | 'google_ads'
  | 'appsflyer' | 'branch' | 'hotjar' | 'fullstory';

export interface AnalyticsIntegration {
  id: string;
  name: string;
  type: AnalyticsType;
  status: BridgeStatus;
  eventsToday: number;
  isConfigured: boolean;
  trackingId: string | null;
}

// ─── Data Providers ─────────────────────────────────────────

export type DataProviderType = 'trading_economics' | 'alpha_vantage' | 'refinitiv' | 'quandl' | 'benzinga'
  | 'coingecko' | 'glassnode' | 'twitter' | 'reddit';

export interface DataProvider {
  id: string;
  name: string;
  type: DataProviderType;
  status: BridgeStatus;
  requestsToday: number;
  rateLimit: number;
  rateLimitRemaining: number;
  latencyMs: number;
  lastSync: string | null;
}

// ─── Enterprise Integrations ────────────────────────────────

export type EnterpriseType = 'salesforce' | 'hubspot' | 'dynamics365' | 'quickbooks' | 'xero' | 'sap'
  | 'bloomberg' | 'refinitiv_eikon' | 'custom_erp';

export interface EnterpriseIntegration {
  id: string;
  name: string;
  type: EnterpriseType;
  status: BridgeStatus;
  syncDirection: 'inbound' | 'outbound' | 'bidirectional';
  lastSync: string | null;
  recordsSynced: number;
  errors: number;
  isConfigured: boolean;
}

// ─── Unified Integration Card ───────────────────────────────

export type IntegrationCategory = 'platform' | 'liquidity' | 'fix' | 'api' | 'psp' | 'kyc' | 'comms' | 'analytics' | 'data' | 'enterprise';

export interface IntegrationSummary {
  id: string;
  name: string;
  category: IntegrationCategory;
  type: string;
  status: BridgeStatus;
  description: string;
  logoUrl: string | null;
  isConfigured: boolean;
  isPremium: boolean;
  docsUrl: string | null;
}
