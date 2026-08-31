import { CockpitShell } from '@/components/cockpit/shell'
import TrustClient from './_components/trust-client'

export const dynamic = 'force-dynamic'

export default function TrustPage() {
  return (
    <CockpitShell>
      <TrustClient />
    </CockpitShell>
  )
}
