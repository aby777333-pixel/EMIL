import { CockpitShell } from '@/components/cockpit/shell'
import PortfolioClient from './_components/portfolio-client'

export const dynamic = 'force-dynamic'

export default function PortfolioPage() {
  return (
    <CockpitShell>
      <PortfolioClient />
    </CockpitShell>
  )
}
