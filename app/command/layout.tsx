import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions, requireAdmin } from '@/lib/auth'
import { CommandShell } from '@/components/command/shell'

export const dynamic = 'force-dynamic'

// The entire /command surface is server-gated on the DATABASE role — a forged
// or stale JWT role claim never reaches a page render.
export default async function CommandLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const admin = await requireAdmin((session.user as any).id)
  if (!admin) redirect('/')
  return <CommandShell adminEmail={admin.email}>{children}</CommandShell>
}
