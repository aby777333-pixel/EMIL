'use client'

// Company intelligence (spec §21–23) — SEC EDGAR fundamentals + filings,
// hub price statistics, calculated valuation, Finnhub profile/earnings when
// keyed. Research view: every number names its source; nothing is advice.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Panel, LoadingPanel, StatusMessage, Stat } from '@/components/cockpit/panel'
import { Building2, RefreshCw, Search, BarChart3, Scale, FileText, CalendarClock, LineChart, ExternalLink, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type PV = { period: string; end: string; value: number; form: string }
type Intel = {
  symbol: string; name: string; fetchedAt: string; cached?: boolean; stale?: boolean
  instrument: { key: string; exchange: string; currency: string; market: string } | null
  edgar: { cik: number; sic: string | null; sicDescription: string | null; stateOfIncorporation: string | null; fiscalYearEnd: string | null; exchanges: string[] } | null
  fundamentals: {
    quarterly: { revenue: PV[]; netIncome: PV[]; epsDiluted: PV[]; operatingCashFlow: PV[] }
    annual: { revenue: PV[]; netIncome: PV[]; epsDiluted: PV[]; operatingCashFlow: PV[] }
    ttm: { revenue: number | null; netIncome: number | null; epsDiluted: number | null; operatingCashFlow: number | null; asOf: string | null }
    growth: { revenueYoY: number | null; netIncomeYoY: number | null; revenueQoQ: number | null }
    margins: { net: number | null; operatingCashFlow: number | null }
    balance: { asOf: string | null; assets: number | null; liabilities: number | null; equity: number | null; cash: number | null; longTermDebt: number | null; sharesOutstanding: number | null; sharesAsOf: string | null }
    revenueConcept: string | null
  } | null
  fundamentalsError: string | null
  filings: { form: string; filed: string; reportDate: string | null; description: string | null; url: string }[]
  price: { stats: any | null; error: string | null; needsKey: boolean; rateLimited: boolean; retryAfterSec: number | null; proxy: boolean }
  valuation: { marketCap: number | null; pe: number | null; ps: number | null; pb: number | null; evToSalesApprox: number | null; fcfYieldApprox: number | null; debtToEquity: number | null; basis: string }
  profile: { industry: string | null; ipo: string | null; website: string | null; country: string | null; logo: string | null } | null
  earnings: any
  notes: string[]
}

const big = (n: number | null | undefined) => {
  if (n === null || n === undefined || !isFinite(n)) return '—'
  const a = Math.abs(n)
  const s = a >= 1e12 ? `${(n / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : a >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(2)
  return s
}
const pct = (n: number | null | undefined, d = 1) => (n === null || n === undefined || !isFinite(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`)
const num = (n: number | null | undefined, d = 2) => (n === null || n === undefined || !isFinite(n) ? '—' : n.toFixed(d))
const tone = (n: number | null | undefined) => (n === null || n === undefined ? 'text-slate-200' : n >= 0 ? 'text-emerald-300' : 'text-red-300')

export default function CompanyClient() {
  const params = useSearchParams()
  const [symbol, setSymbol] = useState((params.get('symbol') ?? 'AAPL').toUpperCase())
  const [input, setInput] = useState(symbol)
  const [data, setData] = useState<Intel | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (sym: string, refresh = false) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/company?fn=intel&symbol=${encodeURIComponent(sym)}${refresh ? '&refresh=1' : ''}`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'failed')
      setData(d); setError('')
      if (typeof window !== 'undefined') window.history.replaceState(null, '', `/company?symbol=${encodeURIComponent(sym)}`)
    } catch (e: any) { setError(e?.message ?? 'Company intelligence unavailable') } finally { setBusy(false) }
  }, [])
  useEffect(() => { load(symbol) }, [symbol, load])

  const go = (e: React.FormEvent) => { e.preventDefault(); const s = input.trim().toUpperCase(); if (s) setSymbol(s) }

  const f = data?.fundamentals
  const q = f?.quarterly
  const chart = (q?.revenue ?? []).slice(-8).map((r) => ({ period: r.period.replace('CY', ''), revenue: r.value, netIncome: q?.netIncome.find((n) => n.period === r.period)?.value ?? null }))
  const st = data?.price.stats

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Building2 className="h-5 w-5 text-cyan-400" /> Company Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">SEC EDGAR fundamentals and filings (keyless, official), hub price statistics, calculated valuation. Research view — sources named on every number, never advice.</p>
        </div>
        <form onSubmit={go} className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2 top-2.5" />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ticker (AAPL, MSFT, JPM…)" className="rounded-md border border-border bg-background/60 pl-7 pr-3 py-1.5 text-xs text-white w-48 focus:outline-none focus:border-cyan-500/60" />
          </div>
          <button type="submit" className="rounded-md bg-cyan-600/80 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white">Open</button>
          <button type="button" onClick={() => load(symbol, true)} disabled={busy} className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh</button>
          <Link href="/screener" className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-slate-300 hover:text-white">Screener →</Link>
        </form>
      </div>

      {error && !data ? <StatusMessage text={error} /> : null}
      {!data && !error ? <LoadingPanel text={`Reading SEC filings for ${symbol}…`} /> : null}
      {data ? (
        <>
          <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {data.profile?.logo ? <img src={data.profile.logo} alt="" className="h-10 w-10 rounded bg-white/90 object-contain p-1" /> : null}
              <div className="min-w-0">
                <p className="text-lg font-bold text-white truncate">{data.name} <span className="num text-cyan-300">{data.symbol}</span></p>
                <p className="text-[11px] text-slate-400">
                  {data.instrument ? `${data.instrument.exchange} · ${data.instrument.currency}` : 'Not in the instrument master (ticker looked up directly)'}
                  {data.edgar?.sicDescription ? ` · ${data.edgar.sicDescription}` : ''}{data.edgar?.stateOfIncorporation ? ` · inc. ${data.edgar.stateOfIncorporation}` : ''}{data.edgar?.fiscalYearEnd ? ` · FY ends ${data.edgar.fiscalYearEnd.slice(0, 2)}/${data.edgar.fiscalYearEnd.slice(2)}` : ''}
                  {data.profile?.industry ? ` · ${data.profile.industry}` : ''}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {data.edgar ? <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${data.edgar.cik}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">EDGAR CIK {data.edgar.cik}</a> : 'No EDGAR record'}
                  {data.profile?.website ? <> · <a href={data.profile.website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">website</a></> : null}
                  {data.profile?.ipo ? ` · IPO ${data.profile.ipo}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/charts?symbol=${encodeURIComponent(data.symbol)}`} className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white flex items-center gap-1"><LineChart className="h-3 w-3" /> Chart</Link>
              <Link href={`/charts?symbol=${encodeURIComponent(data.symbol)}&report=1`} className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white flex items-center gap-1"><FileText className="h-3 w-3" /> Research report</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Stat label="Last (delayed)" value={st ? num(st.last, 2) : '—'} sub={st ? `as of ${st.asOf}` : data.price.needsKey ? 'needs data key' : data.price.rateLimited ? `budget — retry ${data.price.retryAfterSec ?? '?'}s` : (data.price.error ?? '').slice(0, 40)} valueClass="text-cyan-300" size="sm" />
            <Stat label="1M / 1Y" value={<span><span className={tone(st?.ret1m)}>{pct(st?.ret1m)}</span> <span className="text-slate-600">/</span> <span className={tone(st?.ret1y)}>{pct(st?.ret1y)}</span></span>} size="sm" />
            <Stat label="Market cap" value={big(data.valuation.marketCap)} sub="calculated" size="sm" />
            <Stat label="P/E (TTM)" value={num(data.valuation.pe, 1)} size="sm" />
            <Stat label="P/S (TTM)" value={num(data.valuation.ps, 2)} size="sm" />
            <Stat label="P/B" value={num(data.valuation.pb, 2)} size="sm" />
            <Stat label="OCF yield" value={pct(data.valuation.fcfYieldApprox)} sub="operating cash flow / mkt cap" size="sm" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Revenue & net income — last 8 fiscal quarters (SEC XBRL)" icon={BarChart3} accent="cyan">
              {chart.length === 0 ? <p className="text-xs text-slate-500">{data.fundamentalsError ?? 'No quarterly revenue facts reported under a standard concept.'}</p> : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => big(v)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={48} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#94a3b8' }} formatter={(v: any, n: any) => [big(Number(v)), n === 'revenue' ? 'Revenue' : 'Net income']} />
                      <Bar dataKey="revenue" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="netIncome" radius={[3, 3, 0, 0]}>{chart.map((c, i) => <Cell key={i} fill={(c.netIncome ?? 0) >= 0 ? '#34d399' : '#f87171'} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {f ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  <Stat label="Revenue TTM" value={big(f.ttm.revenue)} sub={`YoY ${pct(f.growth.revenueYoY)} · QoQ ${pct(f.growth.revenueQoQ)}`} size="sm" />
                  <Stat label="Net income TTM" value={big(f.ttm.netIncome)} sub={`YoY ${pct(f.growth.netIncomeYoY)}`} valueClass={tone(f.ttm.netIncome)} size="sm" />
                  <Stat label="Net margin" value={pct(f.margins.net)} sub={`OCF margin ${pct(f.margins.operatingCashFlow)}`} size="sm" />
                  <Stat label="EPS diluted TTM" value={num(f.ttm.epsDiluted, 2)} sub={f.ttm.asOf ? `through ${f.ttm.asOf}` : ''} size="sm" />
                </div>
              ) : null}
            </Panel>

            <Panel title="Balance sheet & quarterly table" icon={Scale} accent="amber">
              {f ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Stat label="Total assets" value={big(f.balance.assets)} sub={f.balance.asOf ? `as of ${f.balance.asOf}` : ''} size="sm" />
                    <Stat label="Total liabilities" value={big(f.balance.liabilities)} size="sm" />
                    <Stat label="Equity" value={big(f.balance.equity)} size="sm" />
                    <Stat label="Cash & equivalents" value={big(f.balance.cash)} size="sm" />
                    <Stat label="Long-term debt" value={big(f.balance.longTermDebt)} sub={`D/E ${num(data.valuation.debtToEquity, 2)}`} size="sm" />
                    <Stat label="Shares outstanding" value={big(f.balance.sharesOutstanding)} sub={f.balance.sharesAsOf ? `cover page ${f.balance.sharesAsOf}` : ''} size="sm" />
                  </div>
                  <div className="overflow-x-auto scrollbar-thin mt-3">
                    <table className="w-full text-left">
                      <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1.5 pr-3">Quarter</th><th className="py-1.5 pr-3 text-right">Revenue</th><th className="py-1.5 pr-3 text-right">Net income</th><th className="py-1.5 pr-3 text-right">EPS dil.</th><th className="py-1.5 text-right">Op. cash flow</th></tr></thead>
                      <tbody>
                        {(q?.revenue ?? []).slice(-8).reverse().map((r) => {
                          const ni = q?.netIncome.find((x) => x.period === r.period)?.value ?? null
                          const eps = q?.epsDiluted.find((x) => x.period === r.period)?.value ?? null
                          const ocf = q?.operatingCashFlow.find((x) => x.period === r.period)?.value ?? null
                          return (
                            <tr key={r.period} className="border-b border-border/40">
                              <td className="py-1 pr-3 text-[11px] text-slate-300 num">{r.period.replace('CY', '')} <span className="text-slate-600">{r.form}</span></td>
                              <td className="py-1 pr-3 text-[11px] text-slate-200 num text-right">{big(r.value)}</td>
                              <td className={`py-1 pr-3 text-[11px] num text-right ${tone(ni)}`}>{big(ni)}</td>
                              <td className={`py-1 pr-3 text-[11px] num text-right ${tone(eps)}`}>{num(eps, 2)}</td>
                              <td className={`py-1 text-[11px] num text-right ${tone(ocf)}`}>{big(ocf)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Concept used for revenue: <span className="num">{f.revenueConcept ?? 'n/a'}</span>. Quarters are the filer's reported ~3-month durations; a trailing * marks a fiscal Q4 derived as the annual figure minus Q1–Q3. Restatements replace earlier values.</p>
                </>
              ) : <p className="text-xs text-slate-500">{data.fundamentalsError ?? 'Fundamentals unavailable.'}</p>}
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Price statistics (hub series, delayed)" icon={LineChart} accent="emerald">
              {st ? (
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="52-week range" value={`${num(st.lo52, 2)} – ${num(st.hi52, 2)}`} sub={`position ${Math.round(st.rangePos * 100)}%`} size="sm" />
                  <Stat label="Realised vol 20d / 60d" value={`${num(st.vol20, 0)}% / ${num(st.vol60, 0)}%`} sub="annualised" size="sm" />
                  <Stat label="SMA50 / SMA200" value={<span>{st.aboveSma50 === null ? '—' : st.aboveSma50 ? <span className="text-emerald-300">above</span> : <span className="text-red-300">below</span>} / {st.aboveSma200 === null ? '—' : st.aboveSma200 ? <span className="text-emerald-300">above</span> : <span className="text-red-300">below</span>}</span>} size="sm" />
                  <Stat label="RSI 14 · ATR 14" value={`${num(st.rsi14, 0)} · ${num(st.atr14Pct, 2)}%`} size="sm" />
                  <Stat label="Max drawdown 1y" value={`${num(st.maxDd1y, 1)}%`} valueClass="text-red-300" size="sm" />
                  <Stat label="3M return" value={pct(st.ret3m)} valueClass={tone(st.ret3m)} size="sm" />
                </div>
              ) : <p className="text-xs text-amber-300 flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {data.price.error ?? 'Price statistics unavailable.'}</p>}
            </Panel>

            <Panel title="Earnings" icon={CalendarClock} accent="violet">
              {data.earnings?.source === 'finnhub' ? (
                <div className="space-y-2">
                  {data.earnings.next ? <div className="rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-violet-300">Next report</p><p className="text-sm text-white num">{data.earnings.next.date}{data.earnings.next.hour ? ` · ${data.earnings.next.hour}` : ''}</p><p className="text-[11px] text-slate-400">EPS est. {num(data.earnings.next.epsEstimate, 2)} · revenue est. {big(data.earnings.next.revenueEstimate)}</p></div> : <p className="text-xs text-slate-500">No upcoming date in Finnhub's calendar.</p>}
                  {data.earnings.recent?.length ? <table className="w-full text-left"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-border"><th className="py-1 pr-2">Date</th><th className="py-1 pr-2 text-right">EPS</th><th className="py-1 pr-2 text-right">Est.</th><th className="py-1 text-right">Surprise</th></tr></thead><tbody>{data.earnings.recent.map((r: any) => <tr key={r.date} className="border-b border-border/40"><td className="py-1 pr-2 text-[11px] text-slate-300 num">{r.date}</td><td className="py-1 pr-2 text-[11px] num text-right text-slate-200">{num(r.epsActual, 2)}</td><td className="py-1 pr-2 text-[11px] num text-right text-slate-400">{num(r.epsEstimate, 2)}</td><td className={`py-1 text-[11px] num text-right ${tone(r.surprisePct)}`}>{pct(r.surprisePct)}</td></tr>)}</tbody></table> : null}
                  <p className="text-[10px] text-slate-500">Source: Finnhub (owner key).</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.earnings?.lastReport ? <p className="text-xs text-slate-300">Latest reported quarter: <span className="num text-white">{data.earnings.lastReport.end}</span> ({data.earnings.lastReport.form}, SEC EDGAR).</p> : <p className="text-xs text-slate-500">No quarterly report found in EDGAR.</p>}
                  <p className="text-[11px] text-amber-300">{data.earnings?.note}</p>
                </div>
              )}
            </Panel>

            <Panel title={`Filings · ${data.filings.length}`} icon={FileText} accent="red">
              {data.filings.length === 0 ? <p className="text-xs text-slate-500">No filings listed.</p> : (
                <ul className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                  {data.filings.map((fl) => (
                    <li key={fl.url + fl.filed} className="flex items-center justify-between gap-2 text-[11px] border-b border-border/40 py-1">
                      <span className="min-w-0"><span className="num text-white">{fl.form}</span> <span className="text-slate-500">{fl.filed}</span>{fl.reportDate ? <span className="text-slate-600"> · period {fl.reportDate}</span> : null}{fl.description ? <span className="block text-slate-500 truncate">{fl.description}</span> : null}</span>
                      <a href={fl.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline shrink-0 flex items-center gap-0.5">open <ExternalLink className="h-3 w-3" /></a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-slate-500 mt-2">Documents open on sec.gov (official source).</p>
            </Panel>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <ul className="space-y-0.5 text-[10px] text-slate-500 list-disc pl-4">
              <li>{data.valuation.basis}</li>
              {data.notes.map((n, i) => <li key={i}>{n}</li>)}
              <li>Fetched {new Date(data.fetchedAt).toLocaleTimeString()}{data.cached ? ' · cached' : ''}{data.stale ? ' · STALE' : ''}. Model-free page: every figure is a filed fact or a calculation from one.</li>
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}
