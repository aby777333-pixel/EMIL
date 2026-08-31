import { CockpitShell } from '@/components/cockpit/shell'
import CapitalClient from './_components/capital-client'

export const dynamic = 'force-dynamic'

export default function CapitalPage() {
  return (
    <CockpitShell>
      <CapitalClient />
    </CockpitShell>
  )
}
