'use client'

import { useCallback, useRef, useState } from 'react'
import { Panel } from '@/components/cockpit/panel'
import { Link2, Upload, FileText, Info, Youtube, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const KNOWLEDGE_TYPES = ['strategy', 'indicator', 'ea', 'journal', 'document', 'correction', 'instruction']

export default function IngestTab({ onChanged }: { onChanged: () => void }) {
  const [urls, setUrls] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [lastResult, setLastResult] = useState<any>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  // paste form (manual knowledge, legacy pipeline)
  const [title, setTitle] = useState('')
  const [ktype, setKtype] = useState('instruction')
  const [scopeNote, setScopeNote] = useState('')
  const [content, setContent] = useState('')

  const analyzeAndTeach = useCallback(async () => {
    const list = urls.split(/\n+/).map((u) => u.trim()).filter(Boolean)
    if (list.length === 0) { toast.error('Paste at least one URL.'); return }
    if (busy) return
    setBusy(true)
    setLastResult(null)
    try {
      setProgress(`Submitting ${list.length} URL(s) to the research queue...`)
      const res = await fetch('/api/teach/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: list }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'submit failed')
      for (const r of d?.rejected ?? []) toast.error(`${r.url}: ${r.reason}`, { duration: 5000 })
      const created = d?.created ?? []
      if (created.length === 0) { setProgress(''); setBusy(false); return }

      let done = 0
      const totals = { claims: 0, concepts: 0, strategies: 0, contradictions: 0, hypotheses: 0 }
      for (const src of created) {
        done++
        setProgress(`Knowledge Council analyzing ${done}/${created.length}: ${src.url}`)
        try {
          const ir = await fetch('/api/teach/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceId: src.id }),
          })
          const idata = await ir.json()
          if (!ir.ok) {
            toast.error(`${src.url}: ${idata?.error ?? 'analysis failed'}`, { duration: 6000 })
            continue
          }
          const p = idata?.persisted ?? {}
          totals.claims += p.claims ?? 0
          totals.concepts += p.concepts ?? 0
          totals.strategies += p.strategies ?? 0
          totals.contradictions += p.contradictions ?? 0
          totals.hypotheses += p.hypotheses ?? 0
          setLastResult({ url: src.url, extraction: idata?.extraction, persisted: p })
        } catch {
          toast.error(`${src.url}: analysis failed.`)
        }
      }
      toast.success(`Learning session complete — ${totals.claims} claims, ${totals.concepts} new concepts, ${totals.strategies} strategies, ${totals.contradictions} contradictions, ${totals.hypotheses} hypotheses. Everything starts as an UNTESTED hypothesis.`, { duration: 8000 })
      setUrls('')
      onChanged()
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to submit URLs.')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }, [urls, busy, onChanged])

  const uploadFile = useCallback(async (file: File | null | undefined) => {
    if (!file || busy) return
    setBusy(true)
    try {
      const pres = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream' }),
      })
      const pd = await pres?.json?.()
      if (!pres?.ok || !pd?.uploadUrl) throw new Error('presign failed')
      const put = await fetch(pd.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!put?.ok) throw new Error('upload failed')
      const ext = (file.name.split('.').pop() ?? '').toLowerCase()
      const guessedType = ['mq4', 'mq5', 'ex4', 'ex5'].includes(ext) ? 'ea' : ['csv', 'xlsx'].includes(ext) ? 'journal' : 'document'
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: file.name, knowledgeType: guessedType, cloudStoragePath: pd?.cloud_storage_path, fileName: file.name, fileType: file.type || ext }),
      })
      if (!res?.ok) throw new Error('save failed')
      toast.success(`"${file.name}" uploaded at trust level 0 — parse and validation required before it can influence anything.`)
      onChanged()
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }, [busy, onChanged])

  const submitText = useCallback(async (e: React.FormEvent) => {
    e?.preventDefault?.()
    if (!title.trim() || busy) { if (!title.trim()) toast.error('A title is required.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, knowledgeType: ktype, scopeNote: scopeNote || null, contentText: content || null }),
      })
      if (!res?.ok) throw new Error('failed')
      toast.success('Knowledge submitted at trust level 0. EMIL will treat it as a hypothesis, not a fact.')
      setTitle(''); setContent(''); setScopeNote('')
      onChanged()
    } catch {
      toast.error('Failed to submit knowledge.')
    } finally {
      setBusy(false)
    }
  }, [title, ktype, scopeNote, content, busy, onChanged])

  return (
    <div className="space-y-4">
      <Panel title="Paste URLs — YouTube, articles, research, market commentary" icon={Link2} accent="emerald">
        <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-500">
          <Youtube className="h-3.5 w-3.5 text-red-400" /> YouTube videos (public captions)
          <span className="text-slate-700">·</span> articles & research pages
          <span className="text-slate-700">·</span> central-bank & broker publications
          <span className="text-slate-700">·</span> one URL per line, up to 20
        </div>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e?.target?.value ?? '')}
          rows={5}
          className="w-full rounded-md bg-background border border-border px-3 py-2 text-xs text-white font-mono scrollbar-thin"
          placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.investopedia.com/...\nhttps://www.federalreserve.gov/...'}
          disabled={busy}
        />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={analyzeAndTeach}
            disabled={busy}
            className="flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 transition-colors"
          >
            <Sparkles className="h-4 w-4" /> {busy ? 'ANALYZING...' : 'ANALYZE & TEACH EMIL'}
          </button>
          {progress ? <span className="text-[11px] text-cyan-300 animate-pulse">{progress}</span> : null}
        </div>
        <div className="mt-3 rounded-md border border-border bg-background/40 p-3 flex gap-2">
          <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-snug">
            Only publicly available material is fetched — EMIL never bypasses paywalls, logins or platform restrictions. Every statement is classified
            (fact / opinion / prediction / trading rule / performance claim), attributed to its exact source and location, checked for contradictions
            against existing knowledge, and stored as an <span className="text-amber-300">untested hypothesis</span> until independently validated in the Strategy Lab.
          </p>
        </div>
        {lastResult?.extraction ? (
          <details className="mt-3" open>
            <summary className="text-[11px] text-emerald-300 cursor-pointer font-semibold">Last analysis — {lastResult.url}</summary>
            <div className="mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-slate-300 space-y-1.5">
              <p><span className="text-slate-500">Summary:</span> {lastResult.extraction.summary}</p>
              <p><span className="text-slate-500">Source reliability (assessed):</span> {lastResult.extraction.reliability} — {lastResult.extraction.reliabilityReason}</p>
              <p className="text-slate-400">
                Stored: {lastResult.persisted?.claims ?? 0} claims · {lastResult.persisted?.concepts ?? 0} new concepts · {lastResult.persisted?.edges ?? 0} graph edges ·{' '}
                {lastResult.persisted?.contradictions ?? 0} contradictions · {lastResult.persisted?.strategies ?? 0} strategies → Strategy Lab · {lastResult.persisted?.hypotheses ?? 0} hypotheses
              </p>
            </div>
          </details>
        ) : null}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Upload Knowledge File" icon={Upload} accent="emerald">
          <button
            onClick={() => fileInput.current?.click?.()}
            disabled={busy}
            className="w-full rounded-lg border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 py-10 flex flex-col items-center gap-2 transition-colors"
          >
            <Upload className="h-8 w-8 text-emerald-400" />
            <span className="text-sm text-slate-300 font-medium">{busy ? 'Working...' : 'Click to select a file'}</span>
            <span className="text-[11px] text-slate-500">PDF, DOCX, TXT, MD, CSV, XLSX, MQ4/MQ5, trading journals, strategy docs, datasets</span>
          </button>
          <input ref={fileInput} type="file" className="hidden" onChange={(e) => uploadFile(e?.target?.files?.[0])} />
        </Panel>

        <Panel title="Paste Text / Give an Instruction" icon={FileText} accent="cyan">
          <form onSubmit={submitText} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] text-slate-500">Title
                <input value={title} onChange={(e) => setTitle(e?.target?.value ?? '')} className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white" placeholder="e.g. Avoid trading during NFP" />
              </label>
              <label className="text-[11px] text-slate-500">Type
                <select value={ktype} onChange={(e) => setKtype(e?.target?.value ?? 'instruction')} className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white capitalize">
                  {KNOWLEDGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>
            <label className="text-[11px] text-slate-500 block">Scope note (when does this apply?)
              <input value={scopeNote} onChange={(e) => setScopeNote(e?.target?.value ?? '')} className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white" placeholder="e.g. Only forex majors, London session" />
            </label>
            <label className="text-[11px] text-slate-500 block">Content
              <textarea value={content} onChange={(e) => setContent(e?.target?.value ?? '')} rows={4} className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white scrollbar-thin" placeholder="Describe the strategy, rule, correction or observation..." />
            </label>
            <button type="submit" disabled={busy} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-colors">SUBMIT TO EMIL</button>
          </form>
        </Panel>
      </div>
    </div>
  )
}
