import { CockpitShell } from '@/components/cockpit/shell'
import ScreenerClient from './_components/screener-client'

export const dynamic = 'force-dynamic'

export default function ScreenerPage() {
  return (
    <CockpitShell>
      <ScreenerClient />
    </CockpitShell>
  )
}
