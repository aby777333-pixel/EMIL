import { CockpitShell } from '@/components/cockpit/shell'
import FeedClient from './_components/feed-client'

export const dynamic = 'force-dynamic'

export default function FeedPage() {
  return (
    <CockpitShell>
      <FeedClient />
    </CockpitShell>
  )
}
