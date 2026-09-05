import Link from 'next/link'
import { CockpitShell } from '@/components/cockpit/shell'
import { Panel } from '@/components/cockpit/panel'
import { Newspaper, ExternalLink, Archive, Search, ArrowLeft, ShieldAlert } from 'lucide-react'
import { isHttpUrl, verifyNewsSig } from '@/lib/news-link'

export const dynamic = 'force-dynamic'

// Landing page when a publisher blocks direct access or times out (see
// /api/news/go). EMIL never republishes articles — it offers legitimate
// routes to the same story instead of a dead 403 page.

const REASONS: Record<string, string> = {
  blocked_401: 'The publisher requires a login for this page.',
  blocked_403: 'The publisher blocks direct visitors from this region or network (403 Forbidden).',
  blocked_404: 'The publisher has removed or moved this article (404).',
  blocked_410: 'The publisher has removed this article (410 Gone).',
  blocked_451: 'The publisher withholds this page for legal reasons in some regions (451).',
  timeout: 'The publisher did not respond in time (connection timed out).',
  unreachable: 'The publisher could not be reached.',
}

export default function NewsUnavailablePage({ searchParams }: { searchParams: { u?: string; s?: string; r?: string; t?: string } }) {
  const target = (searchParams?.u ?? '').trim()
  const valid = !!target && isHttpUrl(target) && verifyNewsSig(target, searchParams?.s)
  const reason = searchParams?.r ?? 'unreachable'
  const title = (searchParams?.t ?? '').slice(0, 200)
  let domain = ''
  try { domain = valid ? new URL(target).hostname.replace(/^www\./, '') : '' } catch { domain = '' }
  const archive = valid ? `https://web.archive.org/web/2/${target}` : ''
  const search = valid ? `https://news.google.com/search?q=${encodeURIComponent(title || target)}` : ''

  return (
    <CockpitShell>
      <div className="p-4 lg:p-6 space-y-4 max-w-3xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Newspaper className="h-5 w-5 text-cyan-400" /> EMIL News — Source Unavailable</h1>
          <p className="text-xs text-slate-500 mt-1">EMIL checked the publisher before sending you there, so you are not left on a blocked page.</p>
        </div>

        <Panel title={domain ? `${domain} did not open` : 'This link did not open'} icon={ShieldAlert} accent="amber">
          {!valid ? (
            <p className="text-xs text-slate-400">This link was not issued by EMIL News. Go back to the news desk and open the headline from there.</p>
          ) : (
            <div className="space-y-4">
              {title ? <p className="text-sm text-slate-100 leading-snug">“{title}”</p> : null}
              <p className="text-xs text-amber-300">{REASONS[reason] ?? REASONS.unreachable}</p>
              <p className="text-[11px] text-slate-500 break-all">{target}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a href={archive} target="_blank" rel="noreferrer" className="rounded-md border border-cyan-500/40 bg-cyan-500/10 p-3 hover:bg-cyan-500/20 transition-colors">
                  <p className="text-xs font-semibold text-cyan-200 flex items-center gap-1.5"><Archive className="h-3.5 w-3.5" /> Archived copy</p>
                  <p className="text-[10px] text-slate-400 mt-1">Open the page through the Internet Archive (Wayback Machine).</p>
                </a>
                <a href={search} target="_blank" rel="noreferrer" className="rounded-md border border-border bg-background/40 p-3 hover:border-cyan-500/40 transition-colors">
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Find the same story</p>
                  <p className="text-[10px] text-slate-400 mt-1">Search this headline across other publishers.</p>
                </a>
                <a href={target} target="_blank" rel="noreferrer" className="rounded-md border border-border bg-background/40 p-3 hover:border-cyan-500/40 transition-colors">
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Try the original anyway</p>
                  <p className="text-[10px] text-slate-400 mt-1">Some blocks are regional — your own connection may get through.</p>
                </a>
              </div>

              <p className="text-[10px] text-slate-500">EMIL indexes headlines from open sources and never republishes article text. Publisher availability is re-checked hourly.</p>
            </div>
          )}
          <Link href="/news" className="mt-4 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Back to EMIL News</Link>
        </Panel>
      </div>
    </CockpitShell>
  )
}
