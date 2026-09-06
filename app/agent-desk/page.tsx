import { CockpitShell } from '@/components/cockpit/shell'
import AgentDeskClient from './_components/agent-desk-client'

export const dynamic = 'force-dynamic'

export default function AgentDeskPage() {
  return (
    <CockpitShell>
      <AgentDeskClient />
    </CockpitShell>
  )
}
