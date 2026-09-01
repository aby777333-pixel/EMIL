import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// The Super Admin console moved into the dedicated Command Center.
export default function AdminPage() {
  redirect('/command/research')
}
