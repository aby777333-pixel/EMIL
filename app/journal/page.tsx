import { CockpitShell } from '@/components/cockpit/shell'
import JournalClient from './_components/journal-client'

export const dynamic = 'force-dynamic'

export default function JournalPage() {
  return (
    <CockpitShell>
      <JournalClient />
    </CockpitShell>
  )
}
