'use client'

// EMIL NEWS — global financial news intelligence over the open GDELT index.
// Headlines link to the original publishers; EMIL indexes, it never republishes.

import { useCallback, useEffect, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react'

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'markets', label: 'Markets' },
  { key: 'central_banks', label: 'Central Banks' },
  { key: 'economy', label: 'Economy' },
  { key: 'forex', label: 'Forex' },
  { key: 'commodities', label: 'Commodities' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'geopolitics', label: 'Geopolitics' },
]

const fmtSeen = (s?: string) => {
  // GDELT seendate: YYYYMMDDHHMMSS (UTC)
  if (!s || s.length < 12) return ''
  const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12)))
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
  return d.toLocaleDateString()
}

export default function NewsClient() {
  const [category, setCategory] = useState('markets')
  const [feed, setFeed] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (cat: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/data?fn=news&category=${encodeURIComponent(cat)}`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.message ?? d?.error ?? 'unavailable')
      setFeed(d)
    } catch (e: any) {
      setError(e?.message ?? 'The news feed is unavailable right now.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(category) }, [category, load])

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Newspaper className="h-5 w-5 text-cyan-400" /> EMIL News — Global Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">Global financial headlines from open news indexes (GDELT primary, Google News RSS fallback). Every headline links to the original publisher.</p>
        </div>
        <button onClick={() => load(category)} className="flex items-center gap-1.5 rounded-md bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 text-xs px-3 py-2 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setCategory(c.key)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold border transition-colors ${category === c.key ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-secondary/40 text-slate-400 border-border hover:text-slate-200'}`}>{c.label}</button>
        ))}
      </div>

      <Panel title={`${CATEGORIES.find((c) => c.key === category)?.label ?? 'Markets'} headlines`} icon={Newspaper} accent="cyan">
        {loading ? <LoadingPanel text="Scanning the global news index..." /> : error ? <StatusMessage text={error} /> : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {(feed?.data ?? []).map((a: any, i: number) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="group rounded-md border border-border bg-background/40 p-3 hover:border-cyan-500/40 transition-colors">
                  <p className="text-xs text-slate-200 leading-snug group-hover:text-white">{a.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <span className="text-cyan-400/80">{a.domain}</span>
                    {a.sourceCountry ? <span>· {a.sourceCountry}</span> : null}
                    <span>· {fmtSeen(a.seenDate)}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                </a>
              ))}
              {(feed?.data ?? []).length === 0 ? <p className="text-xs text-slate-500 col-span-2 text-center py-6">No headlines matched right now — try another category.</p> : null}
            </div>
            <p className="text-[10px] text-slate-500 mt-3">{feed?.attribution}. Headlines are an automated index, not verified facts — EMIL treats news as input for research, never as an execution trigger.</p>
          </>
        )}
      </Panel>
    </div>
  )
}
