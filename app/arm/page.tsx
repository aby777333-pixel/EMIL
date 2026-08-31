import { CockpitShell } from '@/components/cockpit/shell'
import ArmClient from './_components/arm-client'

export const dynamic = 'force-dynamic'

export default function ArmPage() {
  return (
    <CockpitShell>
      <ArmClient />
    </CockpitShell>
  )
}
