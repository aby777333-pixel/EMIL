import { CockpitShell } from '@/components/cockpit/shell'
import { DashboardClient } from './_components/dashboard-client'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <CockpitShell>
      <DashboardClient />
    </CockpitShell>
  )
}
