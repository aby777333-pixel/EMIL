import { CockpitShell } from '@/components/cockpit/shell'
import LabClient from './_components/lab-client'

export const dynamic = 'force-dynamic'

export default function LabPage() {
  return (
    <CockpitShell>
      <LabClient />
    </CockpitShell>
  )
}
