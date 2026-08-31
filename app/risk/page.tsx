import { CockpitShell } from '@/components/cockpit/shell'
import RiskClient from './_components/risk-client'

export const dynamic = 'force-dynamic'

export default function RiskPage() {
  return (
    <CockpitShell>
      <RiskClient />
    </CockpitShell>
  )
}
