import { CockpitShell } from '@/components/cockpit/shell'
import StrategiesClient from './_components/strategies-client'

export const dynamic = 'force-dynamic'

export default function StrategiesPage() {
  return (
    <CockpitShell>
      <StrategiesClient />
    </CockpitShell>
  )
}
