import { Suspense } from 'react'
import { CockpitShell } from '@/components/cockpit/shell'
import OrgClient from './_components/org-client'
import { LoadingPanel } from '@/components/cockpit/panel'

export const dynamic = 'force-dynamic'

export default function OrgPage() {
  return (
    <CockpitShell>
      <Suspense fallback={<div className="p-6"><LoadingPanel text="Loading organization..." /></div>}>
        <OrgClient />
      </Suspense>
    </CockpitShell>
  )
}
