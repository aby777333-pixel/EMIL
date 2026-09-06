import { Suspense } from 'react'
import { CockpitShell } from '@/components/cockpit/shell'
import CompanyClient from './_components/company-client'

export const dynamic = 'force-dynamic'

export default function CompanyPage() {
  return (
    <CockpitShell>
      <Suspense fallback={null}>
        <CompanyClient />
      </Suspense>
    </CockpitShell>
  )
}
