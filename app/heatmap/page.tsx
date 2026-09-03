import { CockpitShell } from '@/components/cockpit/shell'
import HeatmapClient from './_components/heatmap-client'

export const dynamic = 'force-dynamic'

export default function HeatmapPage() {
  return (
    <CockpitShell>
      <HeatmapClient />
    </CockpitShell>
  )
}
