import { CockpitShell } from '@/components/cockpit/shell'
import ChartsClient from './_components/charts-client'

export const dynamic = 'force-dynamic'

export default function ChartsPage() {
  return (
    <CockpitShell>
      <ChartsClient />
    </CockpitShell>
  )
}
