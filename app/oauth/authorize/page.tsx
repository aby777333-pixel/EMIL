import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { findClient, redirectAllowed } from '@/lib/oauth'
import { parseScopes, SCOPES } from '@/lib/entitlements'
import ConsentForm from './consent-form'

export const dynamic = 'force-dynamic'

// "Connect with EMIL" consent screen.
export default async function AuthorizePage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await getServerSession(authOptions)
  const qs = new URLSearchParams(Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]).toString()
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(`/oauth/authorize?${qs}`)}`)
  const client = await findClient(String(searchParams.client_id ?? ''))
  const redirectUri = String(searchParams.redirect_uri ?? '')
  const problem = !client ? 'Unknown application (client_id).' : client.status !== 'active' ? 'This application is disabled.' : !redirectAllowed(client, redirectUri) ? 'The redirect_uri is not registered for this application.' : searchParams.response_type && searchParams.response_type !== 'code' ? 'Only response_type=code is supported.' : null
  const allowed = client ? new Set(parseScopes(client.scopes)) : new Set<string>()
  const requested = parseScopes(String(searchParams.scope ?? 'read').replace(/\s+/g, ',')).filter((s) => allowed.has(s))
  return (
    <main className="min-h-screen bg-background text-slate-200 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-border bg-card p-6">
        {problem || !client ? (
          <>
            <h1 className="text-lg font-bold text-white">Cannot continue</h1>
            <p className="text-xs text-amber-300 mt-2">{problem ?? 'Unknown application.'}</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {client.logoUrl ? <img src={client.logoUrl} alt="" className="h-10 w-10 rounded-md object-cover" /> : null}
              <div>
                <h1 className="text-lg font-bold text-white">{client.name} wants to connect to your EMIL account</h1>
                <p className="text-[11px] text-slate-500">Signed in as {session.user.email}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">It will be able to:</p>
            <ul className="mt-1 space-y-1">
              {requested.map((s) => <li key={s} className="text-[11px] text-slate-200"><span className="font-mono text-cyan-300">{s}</span> — {SCOPES[s]}</li>)}
              {requested.length === 0 ? <li className="text-[11px] text-amber-300">No permitted scopes requested.</li> : null}
            </ul>
            <p className="text-[10px] text-slate-500 mt-3">Access tokens expire hourly and are refreshed by the application. You can revoke this connection any time from Integrations. The application can never place live orders.</p>
            <ConsentForm clientId={client.clientId} redirectUri={redirectUri} scope={requested.join(',')} state={String(searchParams.state ?? '')} disabled={requested.length === 0} />
          </>
        )}
      </div>
    </main>
  )
}
