import { CockpitShell } from '@/components/cockpit/shell'
import AgentsClient from './_components/agents-client'

export const dynamic = 'force-dynamic'

export default function AgentsPage() {
  return (
    <CockpitShell>
      <AgentsClient />
    </CockpitShell>
  )
}
