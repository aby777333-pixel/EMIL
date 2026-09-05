import { CockpitShell } from '@/components/cockpit/shell'
import IntegrationsClient from './_components/integrations-client'

export const dynamic = 'force-dynamic'

export default function IntegrationsPage() {
  return (
    <CockpitShell>
      <IntegrationsClient />
    </CockpitShell>
  )
}
