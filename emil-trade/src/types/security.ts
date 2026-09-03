// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 8: Security Architecture Types
// ═══════════════════════════════════════════════════════════

// ─── Authentication ─────────────────────────────────────────

export interface AuthConfig {
  jwtAccessExpiry: number;
  jwtRefreshExpiry: number;
  refreshTokenRotation: boolean;
  oauthProviders: OAuthProvider[];
  samlEnabled: boolean;
  fido2Enabled: boolean;
  twoFactorEnforced: 'none' | 'fund_movements' | 'admin_actions' | 'all';
  twoFactorMethods: ('sms' | 'totp' | 'email' | 'fido2')[];
  passwordPolicy: PasswordPolicy;
  sessionPolicy: SessionPolicy;
}

export interface OAuthProvider {
  id: string;
  name: string;
  provider: 'google' | 'microsoft' | 'apple' | 'custom';
  isEnabled: boolean;
  clientId: string;
  tenantId: string | null;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  maxAge: number;
  preventReuse: number;
  lockoutAttempts: number;
  lockoutDuration: number;
}

export interface SessionPolicy {
  maxConcurrentSessions: number;
  idleTimeout: number;
  absoluteTimeout: number;
  trustDeviceRemember: boolean;
  geoRestriction: boolean;
  allowedCountries: string[];
}

// ─── Data Security ──────────────────────────────────────────

export interface EncryptionStatus {
  atRest: { algorithm: string; status: 'active'; lastRotation: string; nextRotation: string };
  inTransit: { protocol: string; minVersion: string; status: 'active' };
  fieldLevel: { encryptedFields: number; tokenizedFields: number; status: 'active' };
  keyRotation: { intervalDays: number; lastRotation: string; nextRotation: string; autoRotation: boolean };
}

export interface DataMaskingRule {
  id: string;
  fieldPattern: string;
  maskType: 'full' | 'partial' | 'hash' | 'redact';
  environments: ('production' | 'staging' | 'development' | 'logs')[];
  isActive: boolean;
}

// ─── Network Security ───────────────────────────────────────

export interface WafStatus {
  provider: string;
  isActive: boolean;
  rulesEnabled: number;
  customRules: number;
  blockedToday: number;
  threatsDetected: number;
  ddosCapacity: string;
  lastAttack: string | null;
}

export interface RateLimitRule {
  id: string;
  endpoint: string;
  limit: number;
  window: string;
  scope: 'per_user' | 'per_ip' | 'per_api_key' | 'global';
  action: 'throttle' | 'block' | 'captcha';
  isActive: boolean;
}

export interface SecurityHeader {
  name: string;
  value: string;
  isEnabled: boolean;
  compliance: string;
}

// ─── Audit & Compliance ─────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  outcome: 'success' | 'failure' | 'denied';
  details: Record<string, unknown>;
  isSensitive: boolean;
}

export interface ComplianceCertification {
  name: string;
  standard: string;
  status: 'active' | 'pending' | 'expired' | 'in_progress';
  issuedAt: string | null;
  expiresAt: string | null;
  auditor: string | null;
  lastAudit: string | null;
  nextAudit: string | null;
}

export interface PenetrationTest {
  id: string;
  provider: string;
  scope: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  findingsTotal: number;
  findingsCritical: number;
  findingsHigh: number;
  findingsResolved: number;
  reportUrl: string | null;
  startedAt: string;
  completedAt: string | null;
}

// ─── Security Dashboard ─────────────────────────────────────

export interface SecurityOverview {
  overallScore: number;
  authConfig: AuthConfig;
  encryption: EncryptionStatus;
  waf: WafStatus;
  rateLimits: RateLimitRule[];
  headers: SecurityHeader[];
  maskingRules: DataMaskingRule[];
  certifications: ComplianceCertification[];
  penTests: PenetrationTest[];
  recentAuditLogs: AuditLogEntry[];
  threatStats: {
    blockedRequests24h: number;
    failedLogins24h: number;
    suspiciousIps: number;
    activeSessions: number;
    mfaAdoption: number;
  };
}
