import { CockpitShell } from '@/components/cockpit/shell'
import CorrelationClient from './_components/correlation-client'

export const dynamic = 'force-dynamic'

export default function CorrelationPage() {
  return (
    <CockpitShell>
      <CorrelationClient />
    </CockpitShell>
  )
}
