import { prisma } from '@/lib/db'
import { hashPortal, parseJson, type OrgBranding, type OrgSettings } from '@/lib/org'
import PortalActions from './portal-actions'

export const dynamic = 'force-dynamic'

// White-label client portal (tokenised link, no sign-in): the advisory's
// branding, the client's recommendations, decisions, and a print-ready
// report (browser "Save as PDF"). Read-only apart from approve / decline.
export default async function ClientPortal({ params }: { params: { token: string } }) {
  const client = await prisma.clientAccount.findUnique({ where: { portalHash: hashPortal(params.token) }, include: { org: true, recommendations: { where: { status: { in: ['sent', 'approved', 'declined', 'executed', 'expired'] } }, orderBy: { createdAt: 'desc' } } } }).catch(() => null)
  if (!client || client.status !== 'active') {
    return <main className="min-h-screen bg-white text-slate-800 flex items-center justify-center p-6"><p className="text-sm">This link is not valid or has been replaced. Ask your advisor for a new one.</p></main>
  }
  const b = parseJson<OrgBranding>(client.org.branding, {})
  const s = parseJson<OrgSettings>(client.org.settings, {})
  const primary = b.primary || '#0f172a'
  const accent = b.accent || '#0891b2'
  const pending = client.recommendations.filter((r) => r.status === 'sent')
  return (
    <main className="min-h-screen bg-white text-slate-800">
      <style>{`@media print { .no-print { display: none !important } body { background: white } }`}</style>
      <header className="px-6 py-5 border-b" style={{ borderColor: accent }}>
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {b.logoUrl ? <img src={b.logoUrl} alt="" className="h-10 w-auto" /> : null}
            <div>
              <p className="text-lg font-bold" style={{ color: primary }}>{client.org.name}</p>
              <p className="text-xs text-slate-500">{b.reportTitle || 'Client recommendations'} · prepared for <strong>{client.name}</strong></p>
            </div>
          </div>
          <PortalActions token={params.token} pendingCount={pending.length} />
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 py-6 space-y-4">
        {client.recommendations.length === 0 ? <p className="text-sm text-slate-500">No recommendations have been shared with you yet.</p> : null}
        {client.recommendations.map((r) => (
          <article key={r.id} className="rounded-lg border border-slate-200 p-4 break-inside-avoid">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base font-bold" style={{ color: primary }}>{r.direction.toUpperCase()} {r.symbol}</h2>
              <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded" style={{ background: r.status === 'approved' || r.status === 'executed' ? '#dcfce7' : r.status === 'declined' ? '#fee2e2' : '#e0f2fe', color: '#0f172a' }}>{r.status}</span>
            </div>
            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{r.thesis}</p>
            <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[['Entry', r.entry], ['Stop', r.stop], ['Target', r.target], ['Horizon', r.horizon]].map(([k, v]) => <div key={String(k)}><dt className="text-slate-500">{k}</dt><dd className="font-semibold">{v ?? '—'}</dd></div>)}
            </dl>
            {r.riskNote ? <p className="text-xs text-slate-600 mt-2"><strong>Risk:</strong> {r.riskNote}</p> : null}
            {r.suitability ? <p className="text-xs text-slate-600 mt-1"><strong>Suitability:</strong> {r.suitability}</p> : null}
            <p className="text-[11px] text-slate-500 mt-2">Prepared by {r.authorEmail} · sent {r.sentAt ? r.sentAt.toUTCString() : '—'}{r.decidedBy ? ` · ${r.decidedBy} on ${r.decidedAt?.toUTCString()}` : ''}{r.executionNote ? ` · execution: ${r.executionNote}` : ''}</p>
            {r.status === 'sent' ? <PortalActions token={params.token} recoId={r.id} /> : null}
          </article>
        ))}
        <footer className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
          <p>{s.disclaimer || 'Recommendations are research opinions of the advisory, prepared on delayed market data, and are not a guarantee of results. Trading carries substantial risk of loss. Decide with your own judgement and, where required, independent advice.'}</p>
          {b.footer ? <p>{b.footer}</p> : null}
          <p>Delivered through EMIL · every decision on this page is written to the advisory's tamper-evident compliance archive.</p>
        </footer>
      </section>
    </main>
  )
}
