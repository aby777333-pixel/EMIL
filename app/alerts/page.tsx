import { CockpitShell } from '@/components/cockpit/shell'
import AlertsClient from './_components/alerts-client'

export const dynamic = 'force-dynamic'

export default function AlertsPage() {
  return (
    <CockpitShell>
      <AlertsClient />
    </CockpitShell>
  )
}
