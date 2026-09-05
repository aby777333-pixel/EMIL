import { CockpitShell } from '@/components/cockpit/shell'
import DevelopersClient from './_components/developers-client'

export const dynamic = 'force-dynamic'

export default function DevelopersPage() {
  return (
    <CockpitShell>
      <DevelopersClient />
    </CockpitShell>
  )
}
