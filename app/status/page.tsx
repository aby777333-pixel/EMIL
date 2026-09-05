import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public status page — no sign-in required (excluded from the auth middleware).
const TONE: Record<string, string> = {
  operational: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  degraded: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  major_outage: 'text-red-300 border-red-500/40 bg-red-500/10',
  healthy: 'text-emerald-300', down: 'text-red-300', error: 'text-red-300', needs_key: 'text-slate-400', unknown: 'text-slate-500',
}

export default async function StatusPage() {
  const [health, providers, incidents] = await Promise.all([
    prisma.systemHealth.findMany({ orderBy: { component: 'asc' } }).catch(() => []),
    prisma.dataProvider.findMany({ where: { enabled: true }, orderBy: { name: 'asc' } }).catch(() => []),
    prisma.statusIncident.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }).catch(() => []),
  ])
  const open = incidents.filter((i) => i.status !== 'resolved')
  const down = health.filter((h) => h.status === 'down').length
  const degraded = health.filter((h) => h.status === 'degraded').length + providers.filter((p) => p.status === 'error' || p.status === 'degraded').length
  const overall = open.some((i) => i.severity === 'major') || down > 0 ? 'major_outage' : degraded > 0 || open.length > 0 ? 'degraded' : 'operational'
  const label = overall === 'operational' ? 'All systems operational' : overall === 'degraded' ? 'Partial degradation' : 'Major outage'

  return (
    <main className="min-h-screen bg-background text-slate-200 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">EMIL Status</h1>
            <p className="text-xs text-slate-500 mt-1">Live platform health. JSON at <code className="text-cyan-400">/api/status</code>. Checked {new Date().toUTCString()}.</p>
          </div>
          <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded border ${TONE[overall]}`}>{label}</span>
        </header>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Incidents</h2>
          {incidents.length === 0 ? <p className="text-xs text-slate-500">No incidents reported.</p> : (
            <ul className="space-y-2">
              {incidents.map((i) => (
                <li key={i.id} className="rounded-md border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm text-white font-semibold">{i.title}</p>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${i.status === 'resolved' ? 'text-emerald-300 border-emerald-500/40' : i.severity === 'major' ? 'text-red-300 border-red-500/40' : 'text-amber-300 border-amber-500/40'}`}>{i.severity} · {i.status}</span>
                  </div>
                  {i.body ? <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{i.body}</p> : null}
                  <p className="text-[10px] text-slate-600 mt-1">opened {i.createdAt.toUTCString()}{i.resolvedAt ? ` · resolved ${i.resolvedAt.toUTCString()}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">System components</h2>
          {health.length === 0 ? <p className="text-xs text-slate-500">No health data.</p> : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {health.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
                  <span className="text-xs text-white truncate">{h.component}</span>
                  <span className={`text-[10px] uppercase font-bold ${TONE[h.status] ?? 'text-slate-400'}`}>{h.status} · {h.latencyMs}ms</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Data providers (research feeds)</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {providers.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
                <span className="text-xs text-white truncate">{p.name} <span className="text-slate-500">· {p.category}</span></span>
                <span className={`text-[10px] uppercase font-bold ${TONE[p.status] ?? 'text-slate-400'}`}>{p.status.replace('_', ' ')}{p.lastLatencyMs ? ` · ${p.lastLatencyMs}ms` : ''}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-slate-600 mt-3">Research feeds are delayed data and never an execution trigger. Provider health reflects the last request EMIL made, not a continuous probe.</p>
        </section>
      </div>
    </main>
  )
}
