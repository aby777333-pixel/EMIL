'use client';

import { SecurityDashboard } from '@/components/security/SecurityDashboard';
import type { SecurityOverview } from '@/types/security';

const MOCK_OVERVIEW: SecurityOverview = {
  overallScore: 92,
  authConfig: {
    jwtAccessExpiry: 900, jwtRefreshExpiry: 7776000, refreshTokenRotation: true,
    oauthProviders: [
      { id: '1', name: 'Google', provider: 'google', isEnabled: true, clientId: 'xxx', tenantId: null },
      { id: '2', name: 'Microsoft', provider: 'microsoft', isEnabled: true, clientId: 'xxx', tenantId: 'xxx' },
      { id: '3', name: 'Apple', provider: 'apple', isEnabled: true, clientId: 'xxx', tenantId: null },
    ],
    samlEnabled: true, fido2Enabled: true, twoFactorEnforced: 'fund_movements',
    twoFactorMethods: ['totp', 'sms', 'fido2'],
    passwordPolicy: { minLength: 12, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecial: true, maxAge: 90, preventReuse: 5, lockoutAttempts: 5, lockoutDuration: 30 },
    sessionPolicy: { maxConcurrentSessions: 5, idleTimeout: 30, absoluteTimeout: 480, trustDeviceRemember: true, geoRestriction: false, allowedCountries: [] },
  },
  encryption: {
    atRest: { algorithm: 'AES-256-GCM', status: 'active', lastRotation: '2026-01-15', nextRotation: '2026-04-15' },
    inTransit: { protocol: 'TLS', minVersion: '1.3', status: 'active' },
    fieldLevel: { encryptedFields: 24, tokenizedFields: 8, status: 'active' },
    keyRotation: { intervalDays: 90, lastRotation: '2026-01-15', nextRotation: '2026-04-15', autoRotation: true },
  },
  waf: { provider: 'Cloudflare Enterprise', isActive: true, rulesEnabled: 147, customRules: 23, blockedToday: 4521, threatsDetected: 89, ddosCapacity: '10 Tbps', lastAttack: '2026-03-28T14:30:00Z' },
  rateLimits: [
    { id: 'rl1', endpoint: '/api/v1/orders', limit: 30, window: '1m', scope: 'per_user', action: 'throttle', isActive: true },
    { id: 'rl2', endpoint: '/api/v1/auth/login', limit: 5, window: '5m', scope: 'per_ip', action: 'block', isActive: true },
    { id: 'rl3', endpoint: '/api/v1/wallet/*', limit: 10, window: '1m', scope: 'per_user', action: 'throttle', isActive: true },
    { id: 'rl4', endpoint: '/api/v1/quotes', limit: 120, window: '1m', scope: 'per_api_key', action: 'throttle', isActive: true },
    { id: 'rl5', endpoint: '/api/v1/*', limit: 1000, window: '1m', scope: 'global', action: 'throttle', isActive: true },
  ],
  headers: [
    { name: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload', isEnabled: true, compliance: 'HSTS' },
    { name: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'", isEnabled: true, compliance: 'CSP' },
    { name: 'X-Content-Type-Options', value: 'nosniff', isEnabled: true, compliance: 'OWASP' },
    { name: 'X-Frame-Options', value: 'DENY', isEnabled: true, compliance: 'Clickjacking' },
    { name: 'Referrer-Policy', value: 'strict-origin-when-cross-origin', isEnabled: true, compliance: 'Privacy' },
    { name: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()', isEnabled: true, compliance: 'Privacy' },
  ],
  maskingRules: [
    { id: 'dm1', fieldPattern: '*.card_number', maskType: 'partial', environments: ['logs', 'staging', 'development'], isActive: true },
    { id: 'dm2', fieldPattern: '*.ssn', maskType: 'full', environments: ['logs', 'staging', 'development'], isActive: true },
    { id: 'dm3', fieldPattern: '*.bank_account', maskType: 'partial', environments: ['logs', 'staging', 'development'], isActive: true },
  ],
  certifications: [
    { name: 'PCI-DSS Level 1', standard: 'Payment Card Industry Data Security Standard', status: 'active', issuedAt: '2025-06-01', expiresAt: '2026-06-01', auditor: 'Qualys', lastAudit: '2025-06-01', nextAudit: '2026-06-01' },
    { name: 'SOC 2 Type II', standard: 'Service Organization Control', status: 'active', issuedAt: '2025-09-01', expiresAt: '2026-09-01', auditor: 'Deloitte', lastAudit: '2025-09-01', nextAudit: '2026-09-01' },
    { name: 'ISO 27001', standard: 'Information Security Management', status: 'in_progress', issuedAt: null, expiresAt: null, auditor: 'BSI', lastAudit: null, nextAudit: '2026-06-15' },
  ],
  penTests: [
    { id: 'pt1', provider: 'CrowdStrike', scope: 'Full platform + API', status: 'completed', findingsTotal: 12, findingsCritical: 0, findingsHigh: 2, findingsResolved: 11, reportUrl: '#', startedAt: '2026-01-10', completedAt: '2026-01-25' },
    { id: 'pt2', provider: 'HackerOne', scope: 'Mobile apps + WebSocket', status: 'in_progress', findingsTotal: 5, findingsCritical: 0, findingsHigh: 1, findingsResolved: 3, reportUrl: null, startedAt: '2026-03-15', completedAt: null },
  ],
  recentAuditLogs: Array.from({ length: 20 }, (_, i) => ({
    id: `al${i}`, timestamp: new Date(Date.now() - i * 300000).toISOString(),
    userId: `u${i % 5}`, userName: ['Admin', 'Jane C.', 'Tom R.', 'Mike S.', 'Lisa T.'][i % 5],
    action: ['login', 'approve_withdrawal', 'modify_kyc', 'change_leverage', 'force_close', 'view_client', 'export_report', 'modify_routing'][i % 8],
    resource: ['auth', 'transaction', 'kyc', 'account', 'position', 'client', 'report', 'routing'][i % 8],
    resourceId: `res-${1000 + i}`, ipAddress: `192.168.1.${10 + i}`, userAgent: 'Chrome/120',
    outcome: (i === 3 ? 'denied' : i === 7 ? 'failure' : 'success') as 'success' | 'failure' | 'denied',
    details: {}, isSensitive: i === 1 || i === 4,
  })),
  threatStats: { blockedRequests24h: 4521, failedLogins24h: 34, suspiciousIps: 7, activeSessions: 3842, mfaAdoption: 87 },
};

export default function SecurityPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Security Center</h1>
        <p className="text-xs text-white/30">Authentication, encryption, network security, audit, and compliance</p>
      </div>
      <SecurityDashboard overview={MOCK_OVERVIEW} />
    </div>
  );
}
