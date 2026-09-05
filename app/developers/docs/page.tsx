import { CockpitShell } from '@/components/cockpit/shell'
import DocsClient from './_components/docs-client'

export const dynamic = 'force-dynamic'

export default function DeveloperDocsPage() {
  return (
    <CockpitShell>
      <DocsClient />
    </CockpitShell>
  )
}
