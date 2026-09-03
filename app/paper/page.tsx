import { Suspense } from 'react'
import { CockpitShell } from '@/components/cockpit/shell'
import PaperDeskClient from './_components/paper-desk-client'

export const dynamic = 'force-dynamic'

export default function PaperDeskPage() {
  return (
    <CockpitShell>
      <Suspense fallback={null}>
        <PaperDeskClient />
      </Suspense>
    </CockpitShell>
  )
}
