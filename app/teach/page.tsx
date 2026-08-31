import { CockpitShell } from '@/components/cockpit/shell'
import TeachClient from './_components/teach-client'

export const dynamic = 'force-dynamic'

export default function TeachPage() {
  return (
    <CockpitShell>
      <TeachClient />
    </CockpitShell>
  )
}
