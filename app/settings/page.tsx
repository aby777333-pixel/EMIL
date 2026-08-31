import { CockpitShell } from '@/components/cockpit/shell'
import SettingsClient from './_components/settings-client'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <CockpitShell>
      <SettingsClient />
    </CockpitShell>
  )
}
