import { CockpitShell } from '@/components/cockpit/shell'
import OptionsClient from './_components/options-client'

export const dynamic = 'force-dynamic'

export default function OptionsPage() {
  return (
    <CockpitShell>
      <OptionsClient />
    </CockpitShell>
  )
}
