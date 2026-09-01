import { CockpitShell } from '@/components/cockpit/shell'
import MarketsClient from './_components/markets-client'

export const dynamic = 'force-dynamic'

export default function MarketsPage() {
  return (
    <CockpitShell>
      <MarketsClient />
    </CockpitShell>
  )
}
