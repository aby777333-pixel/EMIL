import EmbedWidget from './widget'

export const dynamic = 'force-dynamic'

// Public iframe page for embeddable widgets. No cockpit shell, no session.
export default function EmbedPage({ params, searchParams }: { params: { widget: string }; searchParams: Record<string, string | undefined> }) {
  const q: Record<string, string> = {}
  for (const [k, v] of Object.entries(searchParams)) if (typeof v === 'string') q[k] = v
  return <EmbedWidget widget={params.widget} query={q} />
}
