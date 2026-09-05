import { Suspense } from 'react'
import { CockpitShell } from '@/components/cockpit/shell'
import BillingClient from './_components/billing-client'
import { LoadingPanel } from '@/components/cockpit/panel'

export const dynamic = 'force-dynamic'

export default function BillingPage() {
  return (
    <CockpitShell>
      <Suspense fallback={<div className="p-6"><LoadingPanel text="Loading billing..." /></div>}>
        <BillingClient />
      </Suspense>
    </CockpitShell>
  )
}
