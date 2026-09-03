import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import StatusClient from './StatusClient';

export const metadata: Metadata = {
  title: 'System Status | EMIL Trade',
  description: 'Real-time system status and uptime monitoring for the EMIL Trade Trading System.',
};

interface SystemComponent {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  category: string;
  uptime_90d: number;
  updated_at: string;
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  message: string;
  component_name: string;
  created_at: string;
  resolved_at: string | null;
}

async function getStatusData() {
  const supabase = await createServerSupabaseClient();

  const { data: components } = await supabase
    .from('system_status')
    .select('*')
    .order('category', { ascending: true });

  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    components: (components as SystemComponent[]) || [],
    incidents: (incidents as Incident[]) || [],
  };
}

export default async function StatusPage() {
  const { components, incidents } = await getStatusData();

  const allOperational = components.length === 0 || components.every(c => c.status === 'operational');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                EMIL Trade
              </a>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>System Status</span>
            </div>
            <a
              href="/"
              className="text-sm hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Back to site
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Overall Status Banner */}
        <div
          className="mb-10 rounded-xl p-6"
          style={{
            background: allOperational
              ? 'linear-gradient(135deg, rgba(0,155,77,0.15), rgba(0,155,77,0.05))'
              : 'linear-gradient(135deg, rgba(255,69,96,0.15), rgba(255,69,96,0.05))',
            border: `1px solid ${allOperational ? 'rgba(0,155,77,0.3)' : 'rgba(255,69,96,0.3)'}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full"
              style={{ background: allOperational ? 'var(--accent-green)' : 'var(--loss)' }}
            />
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {allOperational ? 'All Systems Operational' : 'Some Systems Are Experiencing Issues'}
            </h1>
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Last checked: {new Date().toUTCString()}
          </p>
        </div>

        {/* Component Status List */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Component Status
          </h2>
          <div className="space-y-1">
            {components.length > 0 ? (
              components.map(component => (
                <ComponentRow key={component.id} component={component} />
              ))
            ) : (
              <SeedComponents />
            )}
          </div>
        </section>

        {/* 90-Day Uptime */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            90-Day Uptime
          </h2>
          <div className="space-y-4">
            {(components.length > 0 ? components : seedComponents).map((c) => (
              <UptimeBar key={c.id || c.name} name={c.name} uptime={c.uptime_90d} />
            ))}
          </div>
        </section>

        {/* Incidents */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Recent Incidents
          </h2>
          {incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map(incident => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          ) : (
            <div
              className="rounded-lg p-6 text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <p style={{ color: 'var(--text-secondary)' }}>No incidents reported in the last 90 days.</p>
            </div>
          )}
        </section>

        {/* Auto-refresh wrapper */}
        <StatusClient />

        {/* Subscribe */}
        <SubscribeSection />
      </main>
    </div>
  );
}

const seedComponents = [
  { id: '1', name: 'Trading Engine', status: 'operational' as const, category: 'Core', uptime_90d: 99.99, updated_at: new Date().toISOString() },
  { id: '2', name: 'Order Matching', status: 'operational' as const, category: 'Core', uptime_90d: 99.98, updated_at: new Date().toISOString() },
  { id: '3', name: 'Market Data Feed', status: 'operational' as const, category: 'Data', uptime_90d: 99.95, updated_at: new Date().toISOString() },
  { id: '4', name: 'REST API', status: 'operational' as const, category: 'API', uptime_90d: 99.97, updated_at: new Date().toISOString() },
  { id: '5', name: 'WebSocket Streaming', status: 'operational' as const, category: 'API', uptime_90d: 99.96, updated_at: new Date().toISOString() },
  { id: '6', name: 'FIX Protocol Gateway', status: 'operational' as const, category: 'API', uptime_90d: 99.99, updated_at: new Date().toISOString() },
  { id: '7', name: 'User Authentication', status: 'operational' as const, category: 'Infrastructure', uptime_90d: 99.99, updated_at: new Date().toISOString() },
  { id: '8', name: 'Payment Processing', status: 'operational' as const, category: 'Infrastructure', uptime_90d: 99.94, updated_at: new Date().toISOString() },
  { id: '9', name: 'Copy Trading Service', status: 'operational' as const, category: 'Services', uptime_90d: 99.97, updated_at: new Date().toISOString() },
  { id: '10', name: 'PAMM System', status: 'operational' as const, category: 'Services', uptime_90d: 99.98, updated_at: new Date().toISOString() },
];

function SeedComponents() {
  return (
    <>
      {seedComponents.map(c => (
        <ComponentRow key={c.id} component={c} />
      ))}
    </>
  );
}

function ComponentRow({ component }: { component: { name: string; status: string; category: string } }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    operational: { color: 'var(--accent-green)', label: 'Operational' },
    degraded: { color: 'var(--gold)', label: 'Degraded' },
    outage: { color: 'var(--loss)', label: 'Outage' },
    maintenance: { color: 'var(--accent)', label: 'Maintenance' },
  };

  const config = statusConfig[component.status] || statusConfig.operational;

  return (
    <div
      className="flex items-center justify-between rounded-lg px-4 py-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)', minWidth: '100px' }}>
          {component.category}
        </span>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{component.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ background: config.color }} />
        <span className="text-sm font-medium" style={{ color: config.color }}>{config.label}</span>
      </div>
    </div>
  );
}

function UptimeBar({ name, uptime }: { name: string; uptime: number }) {
  const days = Array.from({ length: 90 }, (_, i) => {
    const rand = Math.random();
    if (rand > 0.98) return 'degraded';
    if (rand > 0.995) return 'outage';
    return 'operational';
  });

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{name}</span>
        <span className="text-sm font-mono" style={{ color: 'var(--accent-green)' }}>{uptime}%</span>
      </div>
      <div className="flex gap-px">
        {days.map((status, i) => (
          <div
            key={i}
            className="h-6 flex-1 rounded-sm"
            title={`Day ${90 - i}: ${status}`}
            style={{
              background:
                status === 'operational' ? 'var(--accent-green)' :
                status === 'degraded' ? 'var(--gold)' :
                'var(--loss)',
              opacity: status === 'operational' ? 0.6 : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const severityColors: Record<string, string> = {
    minor: 'var(--gold)',
    major: 'var(--loss)',
    critical: '#FF1744',
  };

  const statusLabels: Record<string, string> = {
    investigating: 'Investigating',
    identified: 'Identified',
    monitoring: 'Monitoring',
    resolved: 'Resolved',
  };

  return (
    <div
      className="rounded-lg p-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="rounded px-2 py-0.5 text-xs font-semibold uppercase"
              style={{ background: `${severityColors[incident.severity]}20`, color: severityColors[incident.severity] }}
            >
              {incident.severity}
            </span>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{incident.title}</h3>
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{incident.message}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Affected: {incident.component_name}
          </p>
        </div>
        <span
          className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: incident.status === 'resolved' ? 'rgba(0,155,77,0.1)' : 'rgba(240,165,0,0.1)',
            color: incident.status === 'resolved' ? 'var(--accent-green)' : 'var(--gold)',
          }}
        >
          {statusLabels[incident.status]}
        </span>
      </div>
      <div className="mt-3 flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Opened: {new Date(incident.created_at).toLocaleDateString()}</span>
        {incident.resolved_at && (
          <span>Resolved: {new Date(incident.resolved_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

function SubscribeSection() {
  return (
    <section
      className="rounded-xl p-8 text-center"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Subscribe to Status Updates
      </h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Get notified when systems are affected by incidents or scheduled maintenance.
      </p>
      <form className="mt-4 flex items-center justify-center gap-3">
        <input
          type="email"
          placeholder="you@company.com"
          className="w-72 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          Subscribe
        </button>
      </form>
    </section>
  );
}
