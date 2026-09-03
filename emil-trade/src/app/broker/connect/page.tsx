'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

/* ────────── Mock Data ────────── */

const PLATFORM_BRIDGES = [
  { name: 'MT5 Bridge', status: 'connected' as const, version: '5.0.42', lastSync: '2m ago', accounts: 1247, icon: 'MT5' },
  { name: 'cTrader Bridge', status: 'connected' as const, version: '4.8', lastSync: '5m ago', accounts: 342, icon: 'cTr' },
  { name: 'RAPTOR Native', status: 'active' as const, version: 'Built-in', lastSync: 'Real-time', accounts: 89, icon: 'R' },
  { name: 'FIX Protocol', status: 'available' as const, version: 'FIX 4.4/5.0', lastSync: '—', accounts: 0, icon: 'FIX' },
];

const ACTIVE_SESSIONS = [
  { id: 'RPT-A8F2-K9L1', broker: 'Marcus T.', ip: '192.168.1.42', connectedAt: '14:22:05 UTC', status: 'active' as const },
  { id: 'RPT-B3D7-M2N4', broker: 'Priya S.', ip: '10.0.0.88', connectedAt: '09:14:30 UTC', status: 'active' as const },
  { id: 'RPT-C1E9-P5Q8', broker: 'Alex W.', ip: '172.16.0.22', connectedAt: '11:45:12 UTC', status: 'active' as const },
];

const RECENT_CALLS = [
  { id: 'VC-001', participants: 'Marcus, LP Desk (LMAX)', duration: '12:34', date: 'Today 10:15', hasRecording: true },
  { id: 'VC-002', participants: 'Priya, Risk Team', duration: '04:22', date: 'Yesterday 16:45', hasRecording: true },
  { id: 'VC-003', participants: 'Alex, Compliance Dept', duration: '08:11', date: 'Yesterday 09:30', hasRecording: false },
];

const LP_CONNECTIONS = [
  { name: 'LMAX', protocol: 'FIX 4.4', status: 'connected' as const, latency: '12ms', fillRate: '98.2%' },
  { name: 'Currenex', protocol: 'FIX 5.0', status: 'connected' as const, latency: '18ms', fillRate: '97.5%' },
  { name: 'PrimeXM', protocol: 'FIX 4.4', status: 'connected' as const, latency: '8ms', fillRate: '99.1%' },
  { name: 'IS Prime', protocol: 'REST API', status: 'standby' as const, latency: '—', fillRate: '—' },
  { name: 'B2C2', protocol: 'WebSocket', status: 'connected' as const, latency: '22ms', fillRate: '96.8%' },
];

const DATA_FEEDS = [
  { source: 'TwelveData', type: 'REST/WS', status: 'active' as const, symbols: '500+', updateRate: 'Real-time' },
  { source: 'Trading Economics', type: 'REST', status: 'active' as const, symbols: 'Calendar', updateRate: 'Hourly' },
  { source: 'CoinGecko', type: 'REST', status: 'active' as const, symbols: '200+', updateRate: '30s' },
];

/* ────────── Helpers ────────── */

function StatusBadge({ status }: { status: 'connected' | 'active' | 'available' | 'standby' }) {
  const styles: Record<string, string> = {
    connected: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    available: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    standby: 'bg-white/5 text-white/40 border-white/10',
  };
  const labels: Record<string, string> = {
    connected: 'Connected',
    active: 'Active',
    available: 'Available',
    standby: 'Standby',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111116] border border-[#252530] rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-[#252530]">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ────────── Page ────────── */

export default function RaptorConnectPage() {
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('4h');
  const [authMethod, setAuthMethod] = useState('2FA');

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      {/* Header */}
      <header className="border-b border-[#252530] bg-[#0B0B0D]/95 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/broker/overview">
              <Logo height={26} theme="dark" />
            </Link>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Link href="/broker/overview" className="hover:text-white/70 transition-colors">Infrastructure</Link>
              <span>/</span>
              <span className="text-white/80">RAPTOR Connect</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-mono">SYSTEM ONLINE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-xl font-bold text-white">RAPTOR CONNECT -- Broker Integration Hub</h1>
          <p className="text-xs text-white/30 mt-1">Platform bridges, remote sessions, LP connectivity and data feeds</p>
        </div>

        {/* ── Section 1: Platform Bridges ── */}
        <SectionCard title="Platform Bridges">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATFORM_BRIDGES.map((b) => (
              <div key={b.name} className="bg-[#0B0B0D] border border-[#252530] rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400 font-mono">
                      {b.icon}
                    </span>
                    <span className="text-sm font-semibold text-white">{b.name}</span>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-white/40">Version</span><span className="text-white/70 font-mono">{b.version}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Last Sync</span><span className="text-white/70 font-mono">{b.lastSync}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Accounts</span><span className="text-white/70 font-mono">{b.accounts > 0 ? b.accounts.toLocaleString() : '—'}</span></div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button className="flex-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1.5 rounded border border-[#252530] text-white/50 hover:text-white/80 hover:border-[#353540] transition-colors">
                    Configure
                  </button>
                  {b.status !== 'available' ? (
                    <button className="flex-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1.5 rounded border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-colors">
                      Disconnect
                    </button>
                  ) : (
                    <button className="flex-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1.5 rounded border border-cyan-500/20 text-cyan-400/60 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors">
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Section 2: Remote Auth & Session Management ── */}
        <SectionCard title="Broker Remote Access">
          <div className="space-y-4">
            {/* Controls row */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => setShowSessionModal(true)}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25 transition-colors"
              >
                + Generate New Session
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Auth Method:</span>
                {['Password', '2FA', 'SSO', 'Hardware Key'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setAuthMethod(m)}
                    className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
                      authMethod === m ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' : 'text-white/40 border-[#252530] hover:text-white/60'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Timeout:</span>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="text-xs bg-[#0B0B0D] border border-[#252530] rounded px-2 py-1 text-white/70 focus:outline-none focus:border-cyan-500/40"
                >
                  <option value="1h">1 hour</option>
                  <option value="4h">4 hours</option>
                  <option value="8h">8 hours</option>
                  <option value="24h">24 hours</option>
                </select>
              </div>
            </div>

            {/* Sessions table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#252530] text-white/40">
                    <th className="text-left px-4 py-2 font-medium">Session ID</th>
                    <th className="text-left px-4 py-2 font-medium">Broker</th>
                    <th className="text-left px-4 py-2 font-medium">IP</th>
                    <th className="text-left px-4 py-2 font-medium">Connected At</th>
                    <th className="text-center px-4 py-2 font-medium">Status</th>
                    <th className="text-right px-4 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ACTIVE_SESSIONS.map((s) => (
                    <tr key={s.id} className="border-b border-[#1a1a22] hover:bg-[#161620] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-cyan-400">{s.id}</td>
                      <td className="px-4 py-2.5 text-white/70">{s.broker}</td>
                      <td className="px-4 py-2.5 font-mono text-white/50">{s.ip}</td>
                      <td className="px-4 py-2.5 font-mono text-white/50">{s.connectedAt}</td>
                      <td className="px-4 py-2.5 text-center"><span className="text-emerald-400 text-[10px] font-semibold">Active</span></td>
                      <td className="px-4 py-2.5 text-right">
                        <button className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-colors">
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Session Modal */}
          {showSessionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSessionModal(false)}>
              <div className="bg-[#111116] border border-[#252530] rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-sm font-bold text-white">New Remote Session</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Session ID</span>
                    <div className="font-mono text-cyan-400 text-sm mt-1 bg-[#0B0B0D] border border-[#252530] rounded px-3 py-2">RPT-X7K3-L9M2</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">One-Time Password</span>
                    <div className="font-mono text-amber-400 text-sm mt-1 bg-[#0B0B0D] border border-[#252530] rounded px-3 py-2">r4pt0r-9827-kx</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">QR Code</span>
                    <div className="mt-1 bg-[#0B0B0D] border border-[#252530] rounded h-32 flex items-center justify-center text-white/20 text-xs">
                      [ QR Code Placeholder ]
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 text-xs font-semibold px-4 py-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25 transition-colors">
                    Copy Credentials
                  </button>
                  <button onClick={() => setShowSessionModal(false)} className="text-xs px-4 py-2 rounded-lg border border-[#252530] text-white/50 hover:text-white/80 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Section 3: Video Conference ── */}
        <SectionCard title="Video Conference">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button className="text-xs font-semibold px-4 py-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25 transition-colors">
                Start Broker-to-Broker Call
              </button>
              <button className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#252530] text-white/50 hover:text-white/80 transition-colors">
                Schedule Meeting
              </button>
              <div className="flex items-center gap-2 ml-auto">
                {['Zoom', 'Google Meet', 'In-Platform'].map((p) => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-[#252530]">{p}</span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#252530] text-white/40">
                    <th className="text-left px-4 py-2 font-medium">Call ID</th>
                    <th className="text-left px-4 py-2 font-medium">Participants</th>
                    <th className="text-right px-4 py-2 font-medium">Duration</th>
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                    <th className="text-right px-4 py-2 font-medium">Recording</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_CALLS.map((c) => (
                    <tr key={c.id} className="border-b border-[#1a1a22] hover:bg-[#161620] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-cyan-400">{c.id}</td>
                      <td className="px-4 py-2.5 text-white/70">{c.participants}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-white/50">{c.duration}</td>
                      <td className="px-4 py-2.5 text-white/50">{c.date}</td>
                      <td className="px-4 py-2.5 text-right">
                        {c.hasRecording ? (
                          <button className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border border-[#252530] text-white/50 hover:text-white/80 transition-colors">
                            View
                          </button>
                        ) : (
                          <span className="text-white/20 text-[10px]">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>

        {/* ── Section 4: LP Connectivity ── */}
        <SectionCard title="LP Connectivity">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#252530] text-white/40">
                  <th className="text-left px-4 py-2 font-medium">LP Name</th>
                  <th className="text-left px-4 py-2 font-medium">Protocol</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Latency</th>
                  <th className="text-right px-4 py-2 font-medium">Fill Rate</th>
                  <th className="text-right px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {LP_CONNECTIONS.map((lp) => (
                  <tr key={lp.name} className="border-b border-[#1a1a22] hover:bg-[#161620] transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-white">{lp.name}</td>
                    <td className="px-4 py-2.5 font-mono text-white/50">{lp.protocol}</td>
                    <td className="px-4 py-2.5 text-center"><StatusBadge status={lp.status} /></td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{lp.latency}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{lp.fillRate}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border border-[#252530] text-white/50 hover:text-white/80 transition-colors">
                        {lp.status === 'standby' ? 'Activate' : 'Configure'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* ── Section 5: Data Feed Connections ── */}
        <SectionCard title="Data Feed Connections">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#252530] text-white/40">
                  <th className="text-left px-4 py-2 font-medium">Source</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Symbols</th>
                  <th className="text-right px-4 py-2 font-medium">Update Rate</th>
                </tr>
              </thead>
              <tbody>
                {DATA_FEEDS.map((f) => (
                  <tr key={f.source} className="border-b border-[#1a1a22] hover:bg-[#161620] transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-white">{f.source}</td>
                    <td className="px-4 py-2.5 font-mono text-white/50">{f.type}</td>
                    <td className="px-4 py-2.5 text-center"><StatusBadge status={f.status} /></td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{f.symbols}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-white/50">{f.updateRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </main>
    </div>
  );
}
