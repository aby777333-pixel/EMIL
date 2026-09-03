import { Suspense } from 'react'
import { CockpitShell } from '@/components/cockpit/shell'
import BacktestClient from './_components/backtest-client'

export const dynamic = 'force-dynamic'

export default function BacktestPage() {
  return (
    <CockpitShell>
      <Suspense fallback={null}>
        <BacktestClient />
      </Suspense>
    </CockpitShell>
  )
}
