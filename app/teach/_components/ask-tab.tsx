'use client'

import { useCallback, useState } from 'react'
import { Panel } from '@/components/cockpit/panel'
import { MessageCircleQuestion, Send, Youtube, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const SUGGESTIONS = [
  'What have you learned about EUR/USD breakout strategies?',
  'Show conflicting opinions about RSI.',
  'Which strategies perform best during high-volatility markets?',
  'What did you learn from the videos I added recently?',
  'Which strategies failed, and why?',
  'What evidence supports your gold vs US yields view?',
]

type Turn = { q: string; a: string; sources: any[] }

export default function AskTab() {
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)

  const ask = useCallback(async (q: string) => {
    const text = q.trim()
    if (!text || busy) return
    setBusy(true)
    setQuestion('')
    setTurns((prev) => [...prev, { q: text, a: '', sources: [] }])
    try {
      const res = await fetch('/api/teach/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error ?? 'Ask EMIL failed')
      }
      let sources: any[] = []
      try {
        sources = JSON.parse(decodeURIComponent(res.headers.get('X-Emil-Sources') ?? '%5B%5D'))
      } catch { /* provenance header optional */ }
      setTurns((prev) => {
        const next = [...prev]
        next[next.length - 1] = { ...next[next.length - 1], sources }
        return next
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setTurns((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          next[next.length - 1] = { ...last, a: last.a + chunk }
          return next
        })
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Ask EMIL failed.')
      setTurns((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last && !last.a) next[next.length - 1] = { ...last, a: '⚠ The question could not be answered — please try again.' }
        return next
      })
    } finally {
      setBusy(false)
    }
  }, [busy])

  return (
    <Panel title="Ask EMIL — interrogate everything it has learned" icon={MessageCircleQuestion} accent="cyan">
      <div className="flex gap-1.5 flex-wrap mb-3">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} disabled={busy} className="rounded-full px-2.5 py-1 text-[10px] border border-cyan-500/25 bg-cyan-500/5 text-cyan-300/90 hover:bg-cyan-500/15 disabled:opacity-50 transition-colors">{s}</button>
        ))}
      </div>

      <div className="space-y-4 max-h-[28rem] overflow-y-auto scrollbar-thin pr-1 mb-3">
        {turns.map((t, i) => (
          <div key={i}>
            <p className="text-xs font-semibold text-cyan-300">You: {t.q}</p>
            <div className="mt-1.5 rounded-md border border-border bg-background/40 p-3 text-[12px] text-slate-300 whitespace-pre-wrap leading-relaxed">
              {t.a || <span className="text-slate-500 animate-pulse">EMIL is searching its memory…</span>}
            </div>
            {t.sources.length > 0 ? (
              <div className="mt-1.5 space-y-0.5">
                {t.sources.map((s: any) => (
                  <p key={s.n} className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span className="text-cyan-400 font-bold">[S{s.n}]</span>
                    {s.type === 'youtube' ? <Youtube className="h-3 w-3 text-red-400" /> : <FileText className="h-3 w-3 text-slate-500" />}
                    {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-cyan-300 truncate">{s.title}</a> : <span className="truncate">{s.title}</span>}
                    {s.author ? <span className="text-slate-600">— {s.author}</span> : null}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {turns.length === 0 ? <p className="text-xs text-slate-500 text-center py-8">Answers are grounded only in EMIL&apos;s stored, attributed knowledge — with [S#] citations back to the original sources. Unverified material is always labeled &quot;source claims&quot;.</p> : null}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(question) }} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e?.target?.value ?? '')}
          disabled={busy}
          className="flex-1 rounded-md bg-background border border-border px-3 py-2.5 text-xs text-white"
          placeholder="e.g. Which YouTube strategy performed best after independent testing?"
        />
        <button type="submit" disabled={busy || !question.trim()} className="flex items-center gap-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-4 transition-colors">
          <Send className="h-3.5 w-3.5" /> ASK
        </button>
      </form>
    </Panel>
  )
}
