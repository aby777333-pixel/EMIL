import { CockpitShell } from '@/components/cockpit/shell'
import ScenarioClient from './_components/scenario-client'

export const dynamic = 'force-dynamic'

export default function ScenarioPage() {
  return (
    <CockpitShell>
      <ScenarioClient />
    </CockpitShell>
  )
}
