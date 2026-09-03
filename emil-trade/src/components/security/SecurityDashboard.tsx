'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Lock, Globe, Key, Eye, FileText, AlertTriangle,
  CheckCircle2, XCircle, Clock, Server, Fingerprint,
  ShieldCheck, Bug, BarChart3, Wifi, Users,
} from 'lucide-react';
import type { SecurityOverview, ComplianceCertification, PenetrationTest, AuditLogEntry, RateLimitRule } from '@/types/security';

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 90 ? '#00dc82' : score >= 70 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 45;
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <motion.circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${(score / 100) * circumference} ${circumference}` }}
          transition={{ duration: 1.2, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-mono font-bold" style={{ color }}>{score}</span>
        <span className="text-[8px] text-white/20 uppercase tracking-wider">Security Score</span>
      </div>
    </div>
  );
}

interface SecurityDashboardProps {
  overview: SecurityOverview;
}

export function SecurityDashboard({ overview }: SecurityDashboardProps) {
  const [tab, setTab] = useState<'overview' | 'auth' | 'encryption' | 'network' | 'audit' | 'compliance'>('overview');

  const { authConfig, encryption, waf, rateLimits, headers, certifications, penTests, recentAuditLogs, threatStats } = overview;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit overflow-x-auto">
        {([
          { key: 'overview', label: 'Overview', icon: <Shield className="h-3.5 w-3.5" /> },
          { key: 'auth', label: 'Authentication', icon: <Key className="h-3.5 w-3.5" /> },
          { key: 'encryption', label: 'Encryption', icon: <Lock className="h-3.5 w-3.5" /> },
          { key: 'network', label: 'Network', icon: <Globe className="h-3.5 w-3.5" /> },
          { key: 'audit', label: 'Audit Log', icon: <Eye className="h-3.5 w-3.5" /> },
          { key: 'compliance', label: 'Compliance', icon: <FileText className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-12 gap-5">
            {/* Score */}
            <div className="col-span-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 flex flex-col items-center justify-center">
              <ScoreGauge score={overview.overallScore} />
              <p className="text-[10px] text-white/25 mt-3 text-center">Based on auth, encryption, network, and compliance posture</p>
            </div>

            {/* Threat Stats */}
            <div className="col-span-9 grid grid-cols-5 gap-3">
              {[
                { label: 'Blocked Requests (24h)', value: threatStats.blockedRequests24h.toLocaleString(), icon: <Shield className="h-3.5 w-3.5" />, color: '#ef4444' },
                { label: 'Failed Logins (24h)', value: String(threatStats.failedLogins24h), icon: <XCircle className="h-3.5 w-3.5" />, color: '#f59e0b' },
                { label: 'Suspicious IPs', value: String(threatStats.suspiciousIps), icon: <AlertTriangle className="h-3.5 w-3.5" />, color: '#ff6b35' },
                { label: 'Active Sessions', value: threatStats.activeSessions.toLocaleString(), icon: <Users className="h-3.5 w-3.5" />, color: '#00b4ff' },
                { label: 'MFA Adoption', value: `${threatStats.mfaAdoption}%`, icon: <Fingerprint className="h-3.5 w-3.5" />, color: threatStats.mfaAdoption > 80 ? '#00dc82' : '#f59e0b' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1.5" style={{ color: stat.color }}>{stat.icon}<span className="text-[9px] text-white/25">{stat.label}</span></div>
                  <div className="text-lg font-mono font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Status Cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { title: 'WAF', status: waf.isActive, detail: `${waf.rulesEnabled} rules · ${waf.blockedToday} blocked today`, icon: <Shield className="h-4 w-4" /> },
              { title: 'Encryption at Rest', status: true, detail: `${encryption.atRest.algorithm} · Rotated ${new Date(encryption.atRest.lastRotation).toLocaleDateString()}`, icon: <Lock className="h-4 w-4" /> },
              { title: 'TLS', status: true, detail: `${encryption.inTransit.protocol} ${encryption.inTransit.minVersion}`, icon: <Wifi className="h-4 w-4" /> },
              { title: 'Key Rotation', status: encryption.keyRotation.autoRotation, detail: `Every ${encryption.keyRotation.intervalDays}d · Next: ${new Date(encryption.keyRotation.nextRotation).toLocaleDateString()}`, icon: <Key className="h-4 w-4" /> },
            ].map(card => (
              <div key={card.title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-white/50">{card.icon}<span className="text-xs font-medium text-white">{card.title}</span></div>
                  {card.status ? <CheckCircle2 className="h-4 w-4 text-[#00dc82]" /> : <XCircle className="h-4 w-4 text-[#ef4444]" />}
                </div>
                <p className="text-[10px] text-white/25">{card.detail}</p>
              </div>
            ))}
          </div>

          {/* Certifications Summary */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#00dc82]" /> Compliance Certifications</h4>
            <div className="flex flex-wrap gap-3">
              {certifications.map(cert => (
                <div key={cert.name} className={`px-4 py-2 rounded-lg border ${
                  cert.status === 'active' ? 'border-[#00dc82]/20 bg-[#00dc82]/5' :
                  cert.status === 'in_progress' ? 'border-[#f59e0b]/20 bg-[#f59e0b]/5' :
                  cert.status === 'expired' ? 'border-[#ef4444]/20 bg-[#ef4444]/5' :
                  'border-white/[0.06] bg-white/[0.02]'
                }`}>
                  <div className="text-xs font-semibold text-white">{cert.name}</div>
                  <div className="text-[9px] text-white/25">{cert.standard} · {cert.status}</div>
                  {cert.expiresAt && <div className="text-[8px] text-white/15 mt-0.5">Expires: {cert.expiresAt}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Pen Tests */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2"><Bug className="h-4 w-4 text-[#8b5cf6]" /> Penetration Tests</h4>
            <div className="space-y-2">
              {penTests.map(pt => (
                <div key={pt.id} className="flex items-center gap-4 px-3 py-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${
                    pt.status === 'completed' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                    pt.status === 'in_progress' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-white/5 text-white/25'
                  }`}>{pt.status.replace('_', ' ')}</span>
                  <span className="text-xs text-white/50">{pt.provider}</span>
                  <span className="text-[10px] text-white/20">{pt.scope}</span>
                  <div className="ml-auto flex items-center gap-3 text-[10px] font-mono">
                    {pt.findingsCritical > 0 && <span className="text-[#ef4444]">{pt.findingsCritical} critical</span>}
                    {pt.findingsHigh > 0 && <span className="text-[#f59e0b]">{pt.findingsHigh} high</span>}
                    <span className="text-white/20">{pt.findingsResolved}/{pt.findingsTotal} resolved</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auth Tab */}
      {tab === 'auth' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-semibold text-white flex items-center gap-2"><Key className="h-4 w-4 text-[#00b4ff]" /> Token Configuration</h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between"><span className="text-white/30">Access Token Expiry</span><span className="font-mono text-white/50">{authConfig.jwtAccessExpiry / 60} min</span></div>
              <div className="flex justify-between"><span className="text-white/30">Refresh Token Expiry</span><span className="font-mono text-white/50">{authConfig.jwtRefreshExpiry / 86400} days</span></div>
              <div className="flex justify-between"><span className="text-white/30">Rotation on Use</span><span className={authConfig.refreshTokenRotation ? 'text-[#00dc82]' : 'text-[#ef4444]'}>{authConfig.refreshTokenRotation ? 'Enabled' : 'Disabled'}</span></div>
              <div className="flex justify-between"><span className="text-white/30">2FA Enforced</span><span className="text-white/50 capitalize">{authConfig.twoFactorEnforced.replace('_', ' ')}</span></div>
              <div className="flex justify-between"><span className="text-white/30">2FA Methods</span><span className="text-white/50">{authConfig.twoFactorMethods.join(', ')}</span></div>
              <div className="flex justify-between"><span className="text-white/30">FIDO2/WebAuthn</span><span className={authConfig.fido2Enabled ? 'text-[#00dc82]' : 'text-white/20'}>{authConfig.fido2Enabled ? 'Enabled' : 'Disabled'}</span></div>
              <div className="flex justify-between"><span className="text-white/30">SAML SSO</span><span className={authConfig.samlEnabled ? 'text-[#00dc82]' : 'text-white/20'}>{authConfig.samlEnabled ? 'Enabled' : 'Disabled'}</span></div>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-semibold text-white flex items-center gap-2"><Lock className="h-4 w-4 text-[#f59e0b]" /> Password Policy</h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between"><span className="text-white/30">Min Length</span><span className="font-mono text-white/50">{authConfig.passwordPolicy.minLength}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Uppercase Required</span><span className={authConfig.passwordPolicy.requireUppercase ? 'text-[#00dc82]' : 'text-white/20'}>{'Yes'}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Special Chars Required</span><span className={authConfig.passwordPolicy.requireSpecial ? 'text-[#00dc82]' : 'text-white/20'}>{'Yes'}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Max Age</span><span className="font-mono text-white/50">{authConfig.passwordPolicy.maxAge} days</span></div>
              <div className="flex justify-between"><span className="text-white/30">Prevent Reuse</span><span className="font-mono text-white/50">Last {authConfig.passwordPolicy.preventReuse}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Lockout After</span><span className="font-mono text-white/50">{authConfig.passwordPolicy.lockoutAttempts} attempts</span></div>
              <div className="flex justify-between"><span className="text-white/30">Lockout Duration</span><span className="font-mono text-white/50">{authConfig.passwordPolicy.lockoutDuration} min</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Encryption Tab */}
      {tab === 'encryption' && (
        <div className="grid grid-cols-2 gap-5">
          {[
            { title: 'At Rest', data: encryption.atRest, icon: <Lock className="h-4 w-4 text-[#00dc82]" />, items: [['Algorithm', encryption.atRest.algorithm], ['Last Rotation', new Date(encryption.atRest.lastRotation).toLocaleDateString()], ['Next Rotation', new Date(encryption.atRest.nextRotation).toLocaleDateString()]] },
            { title: 'In Transit', data: encryption.inTransit, icon: <Wifi className="h-4 w-4 text-[#00b4ff]" />, items: [['Protocol', encryption.inTransit.protocol], ['Min Version', encryption.inTransit.minVersion]] },
            { title: 'Field-Level', data: encryption.fieldLevel, icon: <Eye className="h-4 w-4 text-[#8b5cf6]" />, items: [['Encrypted Fields', String(encryption.fieldLevel.encryptedFields)], ['Tokenized Fields', String(encryption.fieldLevel.tokenizedFields)]] },
            { title: 'Key Rotation', data: encryption.keyRotation, icon: <Key className="h-4 w-4 text-[#f59e0b]" />, items: [['Interval', `${encryption.keyRotation.intervalDays} days`], ['Auto', encryption.keyRotation.autoRotation ? 'Enabled' : 'Disabled'], ['Next', new Date(encryption.keyRotation.nextRotation).toLocaleDateString()]] },
          ].map(section => (
            <div key={section.title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-xs font-semibold text-white flex items-center gap-2 mb-3">{section.icon}{section.title}</h4>
              <div className="space-y-2 text-[11px]">
                {section.items.map(([label, value]) => (
                  <div key={label} className="flex justify-between"><span className="text-white/30">{label}</span><span className="font-mono text-white/50">{value}</span></div>
                ))}
              </div>
              <div className="mt-2"><CheckCircle2 className="h-3 w-3 text-[#00dc82] inline" /> <span className="text-[10px] text-[#00dc82]">Active</span></div>
            </div>
          ))}
        </div>
      )}

      {/* Network Tab */}
      {tab === 'network' && (
        <div className="space-y-5">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-[#ef4444]" /> WAF & DDoS</h4>
            <div className="grid grid-cols-4 gap-4 text-[11px]">
              <div><span className="text-white/25">Provider</span><div className="font-mono text-white/50">{waf.provider}</div></div>
              <div><span className="text-white/25">Rules</span><div className="font-mono text-white/50">{waf.rulesEnabled} + {waf.customRules} custom</div></div>
              <div><span className="text-white/25">Blocked Today</span><div className="font-mono text-[#ef4444]">{waf.blockedToday.toLocaleString()}</div></div>
              <div><span className="text-white/25">DDoS Capacity</span><div className="font-mono text-white/50">{waf.ddosCapacity}</div></div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white flex items-center gap-2 mb-3"><Server className="h-4 w-4 text-[#00b4ff]" /> Security Headers</h4>
            <div className="space-y-1.5">
              {overview.headers.map(h => (
                <div key={h.name} className="flex items-center gap-3 text-[11px]">
                  {h.isEnabled ? <CheckCircle2 className="h-3 w-3 text-[#00dc82]" /> : <XCircle className="h-3 w-3 text-[#ef4444]" />}
                  <span className="text-white/50 font-mono w-40">{h.name}</span>
                  <span className="text-white/20 flex-1 truncate">{h.value}</span>
                  <span className="text-[9px] text-white/15">{h.compliance}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white flex items-center gap-2 mb-3"><BarChart3 className="h-4 w-4 text-[#f59e0b]" /> Rate Limits ({rateLimits.length} rules)</h4>
            <div className="space-y-1.5">
              {rateLimits.map(rl => (
                <div key={rl.id} className="flex items-center gap-3 text-[11px]">
                  {rl.isActive ? <CheckCircle2 className="h-3 w-3 text-[#00dc82]" /> : <XCircle className="h-3 w-3 text-white/15" />}
                  <span className="text-white/40 font-mono w-40">{rl.endpoint}</span>
                  <span className="font-mono text-white/30">{rl.limit}/{rl.window}</span>
                  <span className="text-[9px] text-white/15">{rl.scope}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${rl.action === 'block' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>{rl.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="divide-y divide-white/[0.03] max-h-[600px] overflow-y-auto">
            {recentAuditLogs.map(log => (
              <div key={log.id} className="px-5 py-2.5 flex items-center gap-3 text-xs hover:bg-white/[0.02]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  log.outcome === 'success' ? 'bg-[#00dc82]' : log.outcome === 'denied' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                }`} />
                <span className="text-[10px] text-white/15 w-32 shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                <span className="text-white/50 w-24 shrink-0">{log.userName}</span>
                <span className="text-white/40">{log.action}</span>
                <span className="text-white/20">{log.resource}</span>
                {log.isSensitive && <AlertTriangle className="h-3 w-3 text-[#f59e0b] shrink-0" />}
                <span className="ml-auto text-[9px] text-white/10">{log.ipAddress}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance */}
      {tab === 'compliance' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {certifications.map(cert => (
              <div key={cert.name} className={`bg-white/[0.02] border rounded-xl p-5 ${
                cert.status === 'active' ? 'border-[#00dc82]/20' : cert.status === 'expired' ? 'border-[#ef4444]/20' : 'border-white/[0.06]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">{cert.name}</h4>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${
                    cert.status === 'active' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                    cert.status === 'in_progress' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                    cert.status === 'expired' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-white/5 text-white/25'
                  }`}>{cert.status.replace('_', ' ')}</span>
                </div>
                <p className="text-[10px] text-white/25 mb-2">{cert.standard}</p>
                <div className="space-y-1 text-[10px]">
                  {cert.auditor && <div className="flex justify-between"><span className="text-white/20">Auditor</span><span className="text-white/40">{cert.auditor}</span></div>}
                  {cert.issuedAt && <div className="flex justify-between"><span className="text-white/20">Issued</span><span className="text-white/40">{cert.issuedAt}</span></div>}
                  {cert.expiresAt && <div className="flex justify-between"><span className="text-white/20">Expires</span><span className="text-white/40">{cert.expiresAt}</span></div>}
                  {cert.nextAudit && <div className="flex justify-between"><span className="text-white/20">Next Audit</span><span className="text-white/40">{cert.nextAudit}</span></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
