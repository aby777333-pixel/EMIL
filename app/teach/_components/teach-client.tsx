'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, LoadingPanel, StatusMessage } from '@/components/cockpit/panel'
import { GraduationCap, Upload, FileText, Search, Sparkles, BookMarked, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const TRUST_LEVELS = [
  { level: 0, label: 'Unprocessed', desc: 'Received, not yet parsed' },
  { level: 1, label: 'Parsed', desc: 'Structure extracted' },
  { level: 2, label: 'Understood', desc: 'Semantics analyzed by the Knowledge Council' },
  { level: 3, label: 'Cross-checked', desc: 'Checked against existing knowledge & contradictions' },
  { level: 4, label: 'Backtested', desc: 'Validated on historical data' },
  { level: 5, label: 'Paper-validated', desc: 'Proven in forward paper trading' },
  { level: 6, label: 'Restricted live', desc: 'Small live exposure allowed' },
  { level: 7, label: 'Production', desc: 'Fully trusted, influences live decisions' },
]

const KNOWLEDGE_TYPES = ['strategy', 'indicator', 'ea', 'journal', 'document', 'correction', 'instruction']

const trustColor = (l: number) => l >= 6 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : l >= 4 ? 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' : l >= 2 ? 'text-amber-300 border-amber-500/40 bg-amber-500/10' : 'text-slate-400 border-slate-600/50 bg-slate-700/30'

export default function TeachClient() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [analyses, setAnalyses] = useState<Record<string, string>>({})
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  // paste form
  const [title, setTitle] = useState('')
  const [ktype, setKtype] = useState('instruction')
  const [scopeNote, setScopeNote] = useState('')
  const [content, setContent] = useState('')

  const load = useCallback(async (query = '') => {
    try {
      const res = await fetch(`/api/knowledge${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      if (!res?.ok) throw new Error('failed')
      const d = await res.json()
      setItems(d?.items ?? [])
    } catch {
      setError('Failed to load knowledge library.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const search = useCallback((e: React.FormEvent) => {
    e?.preventDefault?.()
    load(q)
  }, [q, load])

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
      await load(q)
    } catch {
      toast.error('Failed to submit knowledge.')
    } finally {
      setBusy(false)
    }
  }, [title, ktype, scopeNote, content, busy, q, load])

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
      toast.success(`"${file.name}" uploaded. Trust level 0 — EMIL will parse and validate before it can influence trading.`)
      await load(q)
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }, [busy, q, load])

  const analyze = useCallback(async (itemId: string) => {
    if (analyzing) return
    setAnalyzing(itemId)
    setAnalyses((prev) => ({ ...(prev ?? {}), [itemId]: '' }))
    try {
      const res = await fetch('/api/knowledge/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      if (!res?.ok || !res?.body) throw new Error('failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setAnalyses((prev) => ({ ...(prev ?? {}), [itemId]: (prev?.[itemId] ?? '') + chunk }))
      }
      await load(q)
    } catch {
      setAnalyses((prev) => ({ ...(prev ?? {}), [itemId]: 'Analysis stream failed. Please try again.' }))
    } finally {
      setAnalyzing(null)
    }
  }, [analyzing, q, load])

  if (loading) return <div className="p-6"><LoadingPanel text="Loading TEACH EMIL..." /></div>
  if (error) return <div className="p-6"><StatusMessage text={error} /></div>

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><GraduationCap className="h-5 w-5 text-emerald-400" /> Teach EMIL</h1>
        <p className="text-xs text-slate-500 mt-1">Upload strategies, indicators, EAs, journals, documents, corrections or instructions. Nothing you teach is trusted blindly — everything starts at trust level 0 and must earn its way to production.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Upload Knowledge File" icon={Upload} accent="emerald">
          <button
            onClick={() => fileInput.current?.click?.()}
            disabled={busy}
            className="w-full rounded-lg border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 py-10 flex flex-col items-center gap-2 transition-colors"
          >
            <Upload className="h-8 w-8 text-emerald-400" />
            <span className="text-sm text-slate-300 font-medium">{busy ? 'Uploading...' : 'Click to select a file'}</span>
            <span className="text-[11px] text-slate-500">PDF, DOCX, TXT, CSV, MQ4/MQ5, images — stored securely, parsed by the Knowledge Council</span>
          </button>
          <input ref={fileInput} type="file" className="hidden" onChange={(e) => uploadFile(e?.target?.files?.[0])} />
          <div className="mt-3 rounded-md border border-border bg-background/40 p-3 flex gap-2">
            <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-snug">Every upload is classified (fact / opinion / hypothesis), checked for contradictions against existing knowledge, and validated through backtest → paper → restricted live before it can influence real decisions.</p>
          </div>
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
              <textarea value={content} onChange={(e) => setContent(e?.target?.value ?? '')} rows={5} className="mt-1 w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs text-white scrollbar-thin" placeholder="Describe the strategy, rule, correction or observation..." />
            </label>
            <button type="submit" disabled={busy} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-colors">SUBMIT TO EMIL</button>
          </form>
        </Panel>
      </div>

      <Panel title="Knowledge Trust Ladder" icon={BookMarked} accent="violet">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
          {TRUST_LEVELS.map((t) => (
            <div key={t.level} className={`rounded-md border p-2 ${trustColor(t.level)}`}>
              <p className="text-[10px] font-bold">L{t.level} · {t.label}</p>
              <p className="text-[9px] opacity-70 mt-0.5 leading-snug">{t.desc}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={`Knowledge Library (${items.length})`} icon={Search} accent="cyan">
        <form onSubmit={search} className="flex gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e?.target?.value ?? '')} className="flex-1 rounded-md bg-background border border-border px-3 py-2 text-xs text-white" placeholder="Search titles, content, tags..." />
          <button type="submit" className="rounded-md bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 text-xs font-semibold px-4 transition-colors">SEARCH</button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it: any) => (
            <div key={it?.id} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{it?.title}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 uppercase">{it?.knowledgeType}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 capitalize">{it?.factType}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 capitalize">{it?.status}</span>
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded border ${trustColor(it?.trustLevel ?? 0)}`}>L{it?.trustLevel ?? 0} · {TRUST_LEVELS?.[it?.trustLevel ?? 0]?.label ?? ''}</span>
              </div>
              <div className="mt-2 h-1 rounded bg-slate-800 overflow-hidden">
                <div className="h-full rounded bg-gradient-to-r from-slate-500 via-amber-400 to-emerald-400" style={{ width: `${((it?.trustLevel ?? 0) / 7) * 100}%` }} />
              </div>
              {it?.scopeNote ? <p className="text-[10px] text-slate-500 mt-2">Scope: {it.scopeNote}</p> : null}
              {it?.contentText ? <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-3">{it.contentText}</p> : null}
              {it?.fileName ? <p className="text-[10px] text-slate-500 mt-1.5">📎 {it.fileName}</p> : null}
              <button
                onClick={() => analyze(it?.id)}
                disabled={analyzing !== null}
                className="mt-3 flex items-center gap-1.5 rounded-md bg-violet-600/80 hover:bg-violet-600 disabled:opacity-50 text-white text-[11px] font-semibold px-3 py-1.5 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                {analyzing === it?.id ? 'Knowledge Council analyzing...' : 'Analyze with Knowledge Council'}
              </button>
              {analyses?.[it?.id] ? (
                <div className="mt-2 rounded-md border border-violet-500/30 bg-violet-500/5 p-2.5 text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto scrollbar-thin">{analyses[it.id]}</div>
              ) : it?.analysisResult ? (
                <details className="mt-2">
                  <summary className="text-[10px] text-violet-300 cursor-pointer">View previous analysis</summary>
                  <div className="mt-1 rounded-md border border-border bg-background/40 p-2.5 text-[11px] text-slate-400 whitespace-pre-wrap max-h-56 overflow-y-auto scrollbar-thin">{it.analysisResult}</div>
                </details>
              ) : null}
            </div>
          ))}
          {items.length === 0 ? <p className="text-xs text-slate-500 col-span-2 text-center py-6">No knowledge items match your search.</p> : null}
        </div>
      </Panel>
    </div>
  )
}
