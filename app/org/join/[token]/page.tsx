import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { acceptInvite } from '@/lib/org'

export const dynamic = 'force-dynamic'

// Invitation landing: signed-in users accept immediately; others are sent to
// sign in / sign up and come straight back.
export default async function JoinPage({ params }: { params: { token: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(`/org/join/${params.token}`)}`)
  const r = await acceptInvite((session.user as any).id, session.user.email ?? '', params.token)
  return (
    <main className="min-h-screen bg-background text-slate-200 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center">
        {r.ok ? (
          <>
            <h1 className="text-lg font-bold text-white">You joined {r.org!.name}</h1>
            <p className="text-xs text-slate-400 mt-2">Your role and desk were set by the person who invited you. The organization's desk rules (kill switch, restricted list, limits, approvals) now apply to your paper orders.</p>
            <Link href={`/org?org=${r.org!.id}`} className="inline-block mt-4 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2">Open the organization</Link>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-white">Invitation not accepted</h1>
            <p className="text-xs text-amber-300 mt-2">{r.error}</p>
            <Link href="/org" className="inline-block mt-4 rounded-md border border-border px-4 py-2 text-xs text-slate-200">Go to Organization</Link>
          </>
        )}
      </div>
    </main>
  )
}
