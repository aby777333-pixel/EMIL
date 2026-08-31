import { CockpitShell } from '@/components/cockpit/shell'
import TradesClient from './_components/trades-client'

export const dynamic = 'force-dynamic'

export default function TradesPage() {
  return (
    <CockpitShell>
      <TradesClient />
    </CockpitShell>
  )
}
