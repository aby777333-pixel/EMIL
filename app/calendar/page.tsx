import { CockpitShell } from '@/components/cockpit/shell'
import CalendarClient from './_components/calendar-client'

export const dynamic = 'force-dynamic'

export default function CalendarPage() {
  return (
    <CockpitShell>
      <CalendarClient />
    </CockpitShell>
  )
}
