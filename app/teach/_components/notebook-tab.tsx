'use client'

import { Panel } from '@/components/cockpit/panel'
import { NotebookPen } from 'lucide-react'

export default function NotebookTab({ overview }: { overview: any }) {
  const notes = overview?.notebook ?? []
  return (
    <Panel title={`EMIL Research Notebook (${notes.length} sessions)`} icon={NotebookPen} accent="emerald">
      <div className="space-y-3">
        {notes.map((n: any) => {
          const stats = (() => { try { return JSON.parse(n.stats ?? '{}') } catch { return {} } })()
          return (
            <div key={n.id} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                <span className="shrink-0 num text-[10px] text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {n.studied ? <p className="text-[11px] text-slate-400 mt-1.5"><span className="text-slate-500">Studied:</span> {n.studied}</p> : null}
              {n.learned ? <p className="text-[11px] text-slate-300 mt-1"><span className="text-slate-500">Learned:</span> {n.learned}</p> : null}
              {Object.keys(stats).length ? (
                <p className="text-[10px] text-cyan-300/80 mt-1.5">
                  {Object.entries(stats).map(([k, v]) => `${v} ${k}`).join(' · ')}
                </p>
              ) : null}
              {n.content ? (
                <details className="mt-1.5">
                  <summary className="text-[10px] text-emerald-300 cursor-pointer">Session detail</summary>
                  <div className="mt-1 text-[11px] text-slate-400 whitespace-pre-wrap">{n.content}</div>
                </details>
              ) : null}
            </div>
          )
        })}
        {notes.length === 0 ? <p className="text-xs text-slate-500 text-center py-6">The notebook fills automatically — one entry per learning session.</p> : null}
      </div>
    </Panel>
  )
}
