import { CockpitShell } from '@/components/cockpit/shell'
import BridgeClient from './_components/bridge-client'

export const dynamic = 'force-dynamic'

export default function BridgePage() {
  return (
    <CockpitShell>
      <BridgeClient />
    </CockpitShell>
  )
}
