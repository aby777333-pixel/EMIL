import { CockpitShell } from '@/components/cockpit/shell'
import ApiHubClient from './_components/api-hub-client'

export const dynamic = 'force-dynamic'

export default function ApiHubPage() {
  return (
    <CockpitShell>
      <ApiHubClient />
    </CockpitShell>
  )
}
