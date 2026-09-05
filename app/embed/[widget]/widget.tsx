'use client'

// Embeddable widget renderer: chart, quotes, news, brief, ask. Theme comes
// from the embed key (brand colours, logo) with query overrides.

import { useCallback, useEffect, useRef, useState } from 'react'

type Theme = { primary?: string; accent?: string; background?: string; text?: string; muted?: string; logoUrl?: string; brand?: string }

export default function EmbedWidget({ widget, query }: { widget: string; query: Record<string, string> }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const chartRef = useRef<HTMLDivElement | null>(null)
  const key = query.key ?? ''

  const load = useCallback(async () => {
    if (widget === 'ask') { setData({ theme: {} }); return }
    try {
      const qs = new URLSearchParams(query).toString()
      const res = await fetch(`/api/embed/${widget}?${qs}`, { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error ?? 'unavailable')
      setData(j)
    } catch (e: any) { setError(e?.message ?? 'Widget unavailable') }
  }, [widget, query])
  useEffect(() => { load(); const t = setInterval(load, 120_000); return () => clearInterval(t) }, [load])

  useEffect(() => {
    if (widget !== 'chart' || !data?.data?.data || !chartRef.current) return
    let chart: any
    ;(async () => {
      const { createChart, ColorType, CandlestickSeries } = await import('lightweight-charts')
      chartRef.current!.innerHTML = ''
      chart = createChart(chartRef.current!, { height: Math.max(220, (chartRef.current!.clientHeight || 300)), layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: t.muted, fontSize: 11 }, grid: { vertLines: { color: 'rgba(148,163,184,0.12)' }, horzLines: { color: 'rgba(148,163,184,0.12)' } }, timeScale: { borderColor: 'rgba(148,163,184,0.3)' }, rightPriceScale: { borderColor: 'rgba(148,163,184,0.3)' } })
      const s = chart.addSeries(CandlestickSeries, { upColor: '#34d399', downColor: '#f87171', borderUpColor: '#34d399', borderDownColor: '#f87171', wickUpColor: '#34d399', wickDownColor: '#f87171' })
      s.setData(data.data.data.map((b: any) => ({ time: String(b.time).slice(0, 10), open: b.open, high: b.high, low: b.low, close: b.close })))
      chart.timeScale().fitContent()
    })()
    return () => { chart?.remove?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, widget])

  const th: Theme = { ...(data?.theme ?? {}), ...(query.theme === 'light' ? { background: '#ffffff', text: '#0f172a', muted: '#64748b' } : {}) }
  const t = { bg: th.background ?? '#0b1220', text: th.text ?? '#e2e8f0', muted: th.muted ?? '#94a3b8', primary: th.primary ?? '#22d3ee', accent: th.accent ?? '#f59e0b' }
  const wrap = (children: React.ReactNode) => (
    <div style={{ background: t.bg, color: t.text, fontFamily: 'ui-sans-serif, system-ui, sans-serif', minHeight: '100vh', padding: 12, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {th.logoUrl ? <img src={th.logoUrl} alt="" style={{ height: 18 }} /> : null}
        <span style={{ fontSize: 12, fontWeight: 700, color: t.primary }}>{th.brand ?? 'EMIL'}</span>
        <span style={{ fontSize: 10, color: t.muted, marginLeft: 'auto' }}>{widget === 'ask' ? 'research assistant · not advice' : 'delayed research data'}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      <div style={{ fontSize: 9, color: t.muted, marginTop: 8 }}>Powered by EMIL · not an execution trigger · {new Date().toUTCString().slice(17, 25)} UTC</div>
    </div>
  )
  if (error) return wrap(<p style={{ fontSize: 12, color: t.accent }}>{error}</p>)
  if (!data) return wrap(<p style={{ fontSize: 12, color: t.muted }}>Loading…</p>)

  if (widget === 'chart') return wrap(<><div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>{data.data?.symbol ?? query.symbol} · {data.data?.interval ?? query.interval ?? '1day'}{data.data?.needsKey ? ' · data key not configured' : ''}</div><div ref={chartRef} style={{ width: '100%', height: 'calc(100% - 20px)', minHeight: 220 }} /></>)
  if (widget === 'quotes') return wrap(
    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}><tbody>
      {(data.data?.data ?? []).map((r: any) => <tr key={r.symbol} style={{ borderBottom: `1px solid ${t.muted}33` }}><td style={{ padding: '6px 4px', fontWeight: 600 }}>{r.symbol}</td><td style={{ padding: '6px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{typeof r.price === 'number' ? r.price.toLocaleString() : '—'}</td><td style={{ padding: '6px 4px', textAlign: 'right', color: (r.changePct ?? 0) >= 0 ? '#34d399' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>{typeof r.changePct === 'number' ? `${r.changePct > 0 ? '+' : ''}${r.changePct.toFixed(2)}%` : ''}</td></tr>)}
      {(data.data?.data ?? []).length === 0 ? <tr><td style={{ fontSize: 11, color: t.muted }}>{data.data?.message ?? 'No quotes.'}</td></tr> : null}
    </tbody></table>,
  )
  if (widget === 'news') return wrap(
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {(data.data?.data ?? []).map((a: any, i: number) => <li key={i} style={{ padding: '6px 0', borderBottom: `1px solid ${t.muted}33` }}><a href={a.go ?? a.url} target="_blank" rel="noreferrer" style={{ color: t.text, textDecoration: 'none', fontSize: 12, lineHeight: 1.35 }}>{a.title}</a><div style={{ fontSize: 10, color: t.muted }}>{a.domain}</div></li>)}
    </ul>,
  )
  if (widget === 'brief') return wrap(
    <div style={{ fontSize: 12, lineHeight: 1.45 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.primary }}>{data.data?.headline}</div>
      <p style={{ margin: '4px 0 8px', color: t.muted }}>{data.data?.oneLiner}</p>
      <ul style={{ margin: 0, paddingLeft: 16 }}>{(data.data?.marketPulse ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
      {(data.data?.risks ?? []).length ? <><div style={{ marginTop: 8, fontWeight: 700, color: t.accent }}>Risks</div><ul style={{ margin: 0, paddingLeft: 16 }}>{data.data.risks.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></> : null}
    </div>,
  )
  if (widget === 'ask') return wrap(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{answer || <span style={{ color: t.muted }}>Ask about a market, an instrument or today&apos;s calendar. Answers use delayed research data and are never advice.</span>}</div>
      <form onSubmit={async (e) => { e.preventDefault(); if (!q.trim() || busy) return; setBusy(true); setAnswer(''); try { const res = await fetch(`/api/embed/ask?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) }); const j = await res.json().catch(() => ({})); setAnswer(res.ok ? j.answer : (j?.error ?? 'Unavailable')) } finally { setBusy(false) } }} style={{ display: 'flex', gap: 6 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask EMIL…" style={{ flex: 1, background: 'transparent', border: `1px solid ${t.muted}66`, color: t.text, borderRadius: 6, padding: '6px 8px', fontSize: 12 }} />
        <button disabled={busy} style={{ background: t.primary, color: '#0b1220', border: 0, borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 700 }}>{busy ? '…' : 'Ask'}</button>
      </form>
    </div>,
  )
  return wrap(<p style={{ fontSize: 12 }}>Unknown widget.</p>)
}
