import { CockpitShell } from '@/components/cockpit/shell'
import NewsClient from './_components/news-client'

export const dynamic = 'force-dynamic'

export default function NewsPage() {
  return (
    <CockpitShell>
      <NewsClient />
    </CockpitShell>
  )
}
