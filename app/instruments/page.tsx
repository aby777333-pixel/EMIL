import { CockpitShell } from '@/components/cockpit/shell'
import InstrumentsClient from './_components/instruments-client'

export const dynamic = 'force-dynamic'

export default function InstrumentsPage() {
  return (
    <CockpitShell>
      <InstrumentsClient />
    </CockpitShell>
  )
}
