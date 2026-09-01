import { CockpitShell } from '@/components/cockpit/shell'
import AdminClient from './_components/admin-client'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <CockpitShell>
      <AdminClient />
    </CockpitShell>
  )
}
