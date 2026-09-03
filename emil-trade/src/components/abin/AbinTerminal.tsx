'use client';

// ABIN — Advanced Brokerage Intelligence Network (original to Raptor).
// One institutional workspace over the platform's real engines: universal
// multilingual search, an original command bar, market overview, security
// master pages with Scanner/Hedge/EMIL/Arm actions, central-bank
// intelligence with honest data slots, Calendar Pro, portfolio
// intelligence, and the entitlement register with data lineage.
// Opening ABIN grants no trading authority; every execution path still
// runs Shield → Guardian → explicit confirmation.

import { openEmilCockpit } from '@/lib/emil-link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTradingStore } from '@/stores/trading';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { getCalendar, fmtEta, type NewsEvent } from '@/lib/trading/news-guard';
import { getInstrumentSpecs, type InstrumentSpec } from '@/lib/insights/risk';
import { sessionSnapshot, fmtMins, type SessionSnapshot } from '@/lib/trading/emil-sessions';
import { runScan, DEFAULT_FILTERS, type Opportunity } from '@/lib/trading/scanner-engine';
import { symbolCurrencies } from '@/lib/trading/protection';
import { portfolioDNA, REGIONS, type OpenPosLite, type PortfolioDNA } from '@/lib/trading/world-command';
import { armEmil } from '@/lib/trading/emil-arm';
import { loadLangPrefs, routeCommand, sarvamTranslate, sarvamHealth, sarvamSpeech, startVoiceCapture, langAudit, type VoiceCapture } from '@/lib/trading/emil-language';
import {
  ABIN_DISCLAIMER, LINEAGE_LEGEND, ENTITLEMENTS,
  marketOverview, universalSearch, parseAbinCommand, securityMaster, cbIntelligence,
  type OverviewGroup, type SearchGroup, type SecurityMaster, type CbIntel,
} from '@/lib/trading/abin';

const TABS = ['Overview', 'Instrument', 'Central banks', 'Calendar Pro', 'Portfolio', 'Entitlements'] as const;
type Tab = (typeof TABS)[number];

const CYAN = '#29ABE2';

export default function AbinTerminal({ ohlcvBuilder, isLiveData }: { ohlcvBuilder: OHLCVBuilder | null; isLiveData: boolean }) {
  const { prices, positions, setActiveSymbol } = useTradingStore();
  const [tab, setTab] = useState<Tab>('Overview');
  const [calendar, setCalendar] = useState<NewsEvent[]>([]);
  const [specs, setSpecs] = useState<Record<string, InstrumentSpec> | null>(null);
  const [sessions, setSessions] = useState<SessionSnapshot | null>(null);
  const [overview, setOverview] = useState<OverviewGroup[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [dna, setDna] = useState<PortfolioDNA | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('');
  const [master, setMaster] = useState<SecurityMaster | null>(null);
  const [compareWith, setCompareWith] = useState<SecurityMaster | null>(null);
  const [cbRegion, setCbRegion] = useState('US');
  const [cb, setCb] = useState<CbIntel | null>(null);
  const [calCcy, setCalCcy] = useState('all');
  const [calHighOnly, setCalHighOnly] = useState(true);
  const [sarvamOk, setLaraOk] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const voiceRef = useRef<VoiceCapture | null>(null);
  const builderRef = useRef(ohlcvBuilder);
  builderRef.current = ohlcvBuilder;

  const universe = useMemo(() => Object.keys(prices).filter((s) => prices[s]?.bid != null), [prices]);
  const posLite = positions as unknown as OpenPosLite[];

  useEffect(() => { getCalendar().then(setCalendar); }, []);
  useEffect(() => { getInstrumentSpecs().then(setSpecs).catch(() => {}); }, []);
  useEffect(() => { sarvamHealth().then(setLaraOk); }, []);

  // Live refresh: overview, sessions, opportunities, DNA every 30s.
  useEffect(() => {
    const compute = () => {
      const b = builderRef.current;
      if (!b) return;
      try {
        setSessions(sessionSnapshot());
        setOverview(marketOverview(b, prices));
        setOpps(runScan({ builder: b, universe, ticks: prices, calendar, openPositions: posLite.map((p) => ({ symbol: p.symbol, status: p.status ?? 'open' })), balance: 0, isLiveData, filters: { ...DEFAULT_FILTERS, minScore: 65 } }).slice(0, 5));
        setDna(portfolioDNA(b, posLite));
      } catch { /* ABIN must never crash */ }
    };
    compute();
    const id = setInterval(compute, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universe.length, calendar.length, positions.length]);

  const openInstrument = useCallback((sym: string) => {
    const b = builderRef.current;
    if (!b) return;
    setSymbol(sym);
    setCompareWith(null);
    setMaster(securityMaster({ builder: b, symbol: sym, prices, calendar, specs, isLiveData }));
    setTab('Instrument');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices, calendar, specs, isLiveData]);

  const actOn = useCallback((action: { type: string; payload: string }) => {
    setResults([]);
    if (action.type === 'instrument') openInstrument(action.payload);
    else if (action.type === 'region') window.open('/terminal/world', '_blank');
    else if (action.type === 'cb') { setCbRegion(action.payload); setCb(cbIntelligence(action.payload, calendar)); setTab('Central banks'); }
    else if (action.type === 'event') { setCalCcy(action.payload); setTab('Calendar Pro'); }
    else if (action.type === 'page') { if (action.payload.startsWith('#')) setTab('Portfolio'); else window.open(action.payload, '_blank'); }
    else if (action.type === 'emil') openEmilCockpit();
  }, [openInstrument, calendar]);

  // Search + command share the language routing (English direct; Indic →
  // consented Lara translate → the SAME deterministic logic).
  const routedText = useCallback(async (text: string): Promise<string> => {
    const route = routeCommand(text, loadLangPrefs(), sarvamOk);
    if (route.engine === 'sarvam+rules') {
      const tr = await sarvamTranslate(text, route.detect.lang);
      if (tr.ok && tr.translated) {
        setNote(`Translated (Lara): “${tr.translated}”`);
        langAudit({ original: text.slice(0, 200), detected: route.detect.label, engine: 'sarvam+rules', translated: tr.translated.slice(0, 200), action: 'abin query' });
        return tr.translated;
      }
      setNote(`Language service: ${tr.error} — used as typed (native-script instrument names still match).`);
    }
    return text;
  }, [sarvamOk]);

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setNote(null);
    // Native-script aliases match the RAW query directly — translate only
    // when the raw text finds nothing (Lara transliterates single words).
    const raw = universalSearch(query, { universe, calendar });
    if (raw.length && raw[0].label !== 'No matches') { setResults(raw); return; }
    const text = await routedText(query);
    setResults(universalSearch(text, { universe, calendar }));
  }, [query, routedText, universe, calendar]);

  const runCommand = useCallback(async (raw?: string) => {
    const input = (raw ?? query).trim();
    if (!input) return;
    setNote(null);
    // Raw text first (native-script aliases hit without translation).
    const rawCmd = parseAbinCommand(input, universe);
    const text = rawCmd.kind !== 'search' ? input : await routedText(input);
    const cmd = rawCmd.kind !== 'search' ? rawCmd : parseAbinCommand(text, universe);
    setNote((n) => (n ? `${n} · ${cmd.note}` : cmd.note));
    if (cmd.kind === 'instrument') openInstrument(cmd.payload);
    else if (cmd.kind === 'compare') {
      const b = builderRef.current;
      if (!b) return;
      setSymbol(cmd.payload);
      setMaster(securityMaster({ builder: b, symbol: cmd.payload, prices, calendar, specs, isLiveData }));
      setCompareWith(securityMaster({ builder: b, symbol: cmd.payload2!, prices, calendar, specs, isLiveData }));
      setTab('Instrument');
    } else if (cmd.kind === 'page') { if (cmd.payload.startsWith('#')) setTab('Portfolio'); else window.open(cmd.payload, '_blank'); }
    else if (cmd.kind === 'emil') openEmilCockpit();
    else setResults(universalSearch(text, { universe, calendar }));
  }, [query, routedText, universe, calendar, openInstrument, prices, specs, isLiveData]);

  const handleVoice = useCallback(async () => {
    if (voiceRef.current) {
      setVoiceBusy(true);
      try {
        const cap = voiceRef.current; voiceRef.current = null; setRecording(false);
        const { base64, seconds } = await cap.stop();
        if (seconds < 1) { setNote('Voice: recording too short.'); return; }
        const res = await sarvamSpeech(base64);
        if (res.ok && res.transcript) {
          setQuery(res.transcript);
          langAudit({ original: `[voice ${seconds}s]`, detected: res.language ?? 'unknown', engine: 'sarvam-stt-translate', translated: res.transcript.slice(0, 200), action: 'abin voice command' });
          await runCommand(res.transcript);
        } else setNote(`Voice: ${res.error}`);
      } finally { setVoiceBusy(false); }
      return;
    }
    const p = loadLangPrefs();
    if (!p.sarvamEnabled || !p.consentAt) { setNote('Voice needs Lara enabled + consent (EMIL → Language & Voice).'); return; }
    if (!sarvamOk) { setNote('Voice: Lara not configured on the server — honestly off.'); return; }
    try { voiceRef.current = await startVoiceCapture(); setRecording(true); } catch { setNote('Voice: microphone unavailable or denied.'); }
  }, [sarvamOk, runCommand]);

  const heldCcys = useMemo(() => [...new Set(posLite.filter((p) => (p.status ?? 'open') === 'open').flatMap((p) => symbolCurrencies(p.symbol)))], [posLite]);

  const masterCard = (m: SecurityMaster) => (
    <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[14px] font-bold text-white">{m.symbol}</span>
        <span className="text-[9px] uppercase text-white/40">{m.assetClass}{m.specType ? ` · ${m.specType}` : ''}</span>
        {m.mood && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ color: m.mood.color, border: `1px solid ${m.mood.color}55` }}>{m.mood.label}</span>}
        <span className="ml-auto rounded px-1.5 py-0.5 font-mono text-[8px] text-white/35" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>{m.lineage}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 font-mono text-[10px] text-white/60 sm:grid-cols-3">
        <span>Bid {m.bid ?? '—'} / Ask {m.ask ?? '—'}</span>
        <span>Spread {m.spreadPips ?? '—'}p · 24h <span style={{ color: (m.chg24hPct ?? 0) >= 0 ? '#00C27A' : '#FF5252' }}>{m.chg24hPct != null ? `${m.chg24hPct > 0 ? '+' : ''}${m.chg24hPct}%` : '—'}</span></span>
        <span>H1 ATR {m.volPct ?? '—'}% of price</span>
        <span>Regime: {m.regime ? `${m.regime} (${m.regimeConf}%)` : 'insufficient bars'}</span>
        <span>Contract {m.contractSize ?? '—'} · scale {m.priceScale ?? '—'}</span>
        <span>{m.base ?? '—'}/{m.quote ?? '—'} · {m.tradingHours}</span>
      </div>
      {m.scanner ? (
        <p className="mt-1 text-[10px]" style={{ color: '#D4E157' }}>
          Scanner (H1): {m.scanner.label} · score {m.scanner.score} · entry {m.scanner.zone.preferred} · SL {m.scanner.zone.stop} · TP1 {m.scanner.zone.target1} · {m.scanner.zone.riskReward1}R
        </p>
      ) : <p className="mt-1 text-[10px] text-white/35">Scanner (H1): no qualified trend-pullback setup right now — No-Trade is the honest read.</p>}
      {m.correlations.length > 0 && <p className="mt-1 text-[9px] text-white/40">Learned correlations: {m.correlations.map((c) => `${c.pair}: ${c.statement}`).join(' · ')}</p>}
      <p className="mt-1 text-[9px] text-white/40">Events (72h): {m.events.length ? m.events.map((e) => `${e.currency} “${e.title}” ${fmtEta(e.timeMs)}`).join(' · ') : 'no red-flag releases'}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={() => { setActiveSymbol(m.symbol); window.open('/terminal', '_blank'); }} className="rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: CYAN, border: `1px solid ${CYAN}55` }}>Open Chart</button>
        <button onClick={() => window.open('/terminal/scan-trade', '_blank')} className="rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#00C27A', border: '1px solid rgba(0,194,122,0.4)' }}>Scan</button>
        <button onClick={() => window.open('/terminal/hedge-trade', '_blank')} className="rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#CE93D8', border: '1px solid rgba(206,147,216,0.4)' }}>Hedge</button>
        <button onClick={() => openEmilCockpit()} className="rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#FFD54F', border: '1px solid rgba(255,213,79,0.4)' }}>Ask EMIL</button>
        {m.scanner ? (
          <button onClick={() => {
            armEmil({ kind: 'scan', symbol: m.symbol, direction: m.scanner!.direction, lots: Math.max(0.01, m.scanner!.suggestedLots ?? 0.01), entryRef: m.scanner!.zone.preferred, stop: m.scanner!.zone.stop, target: m.scanner!.zone.target1, tf: 'H1', score: m.scanner!.score, reasons: m.scanner!.reasonsFor.slice(0, 2), source: 'ABIN security master' });
            openEmilCockpit();
          }} title="Arm EMIL with this setup — prepare-only; execution needs your explicit authorization there"
            className="rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#FFD54F', border: '1px solid rgba(255,213,79,0.5)', backgroundColor: 'rgba(255,213,79,0.08)' }}>🤖 Arm EMIL</button>
        ) : <span className="rounded px-2 py-1 text-[9px] text-white/25" style={{ border: '1px solid rgba(255,255,255,0.08)' }} title="No qualified setup to arm — honest disable">🤖 Arm EMIL (no setup)</span>}
        <span className="rounded px-2 py-1 text-[9px] text-white/30" style={{ border: '1px solid rgba(255,255,255,0.08)' }} title="Price alerts live in the terminal's Alerts menu">Alerts: terminal → 🔔</span>
      </div>
    </div>
  );

  const calRows = useMemo(() => calendar
    .filter((e) => e.timeMs > Date.now() - 3_600_000)
    .filter((e) => (calCcy === 'all' || e.currency === calCcy))
    .filter((e) => (!calHighOnly || e.impact === 'High'))
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, 30), [calendar, calCcy, calHighOnly]);

  return (
    <div className="mx-auto w-full max-w-[1250px] p-4">
      {/* Masthead + universal search / command bar */}
      <div className="rounded-xl border p-4" style={{ borderColor: `${CYAN}4D`, backgroundColor: 'rgba(255,255,255,0.015)' }}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold text-white">🛰 ABIN</span>
          <span className="text-[10px] text-white/45">Advanced Brokerage Intelligence Network — original to Raptor · discover → EMIL → Scanner → Hedge → Guardian → you → execute</span>
          <span className="ml-auto rounded px-2 py-0.5 font-mono text-[8px] text-white/35" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            {isLiveData ? 'live feed' : 'SIM pricing until the real LP'} · opening ABIN grants no trading authority
          </span>
        </div>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void runCommand(); }}
            placeholder='Search or command — "gold" · "सोना" · "compare EURUSD and GBPUSD" · "find hedge for gold" · "show my exposure" · "ask EMIL why oil is falling"'
            className="min-w-0 flex-1 rounded bg-white/[0.06] px-3 py-2.5 text-[12px] text-white placeholder:text-white/25 outline-none" style={{ border: `1px solid ${CYAN}59` }} />
          <button onClick={handleVoice} disabled={voiceBusy}
            title={recording ? 'Stop and transcribe' : 'Voice via Lara — any supported language; commands never execute trades directly'}
            className="shrink-0 rounded px-3 py-2.5 text-[12px] font-bold transition-all hover:brightness-110 disabled:opacity-40"
            style={recording ? { color: '#FF5252', border: '1px solid rgba(255,82,82,0.7)', boxShadow: '0 0 12px rgba(255,82,82,0.5)' } : { color: '#FF8A65', border: '1px solid rgba(255,138,101,0.4)' }}>
            {voiceBusy ? '…' : recording ? '⏹' : '🎤'}
          </button>
          <button onClick={() => void runSearch()} className="shrink-0 rounded px-3 py-2.5 text-[11px] font-bold text-white/70 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>Search</button>
          <button onClick={() => void runCommand()} className="shrink-0 rounded px-4 py-2.5 text-[11px] font-bold text-black transition-all hover:brightness-110" style={{ background: `linear-gradient(180deg,${CYAN},#0091D5)` }}>⌘ Run</button>
        </div>
        {note && <p className="mt-1.5 text-[10px]" style={{ color: '#D4E157' }}>{note}</p>}
        {results.length > 0 && (
          <div className="mt-2 rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0A0F1A' }}>
            {results.map((g) => (
              <div key={g.label} className="mb-1.5 last:mb-0">
                <div className="text-[8px] font-bold uppercase tracking-wide text-white/35">{g.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((it) => (
                    <button key={it.title + it.sub} onClick={() => actOn(it.action)}
                      className="rounded px-2 py-1 text-left text-[10px] transition-all hover:brightness-125" style={{ border: '1px solid rgba(41,171,226,0.3)', backgroundColor: 'rgba(41,171,226,0.06)' }}>
                      <span className="font-bold text-white/80">{it.title}</span> <span className="text-white/40">· {it.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === 'Central banks') setCb(cbIntelligence(cbRegion, calendar)); }}
            className="rounded px-3 py-1.5 text-[11px] font-bold transition-all hover:brightness-125"
            style={{
              backgroundColor: tab === t ? `${CYAN}2E` : 'rgba(255,255,255,0.04)',
              color: tab === t ? CYAN : 'rgba(255,255,255,0.45)',
              border: `1px solid ${tab === t ? `${CYAN}99` : 'rgba(255,255,255,0.1)'}`,
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          {/* Session strip */}
          {sessions && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="text-[8px] font-bold uppercase tracking-wide text-white/35">Global sessions</span>
              {sessions.sessions.map((s) => (
                <span key={s.id} className="rounded px-1.5 py-0.5 font-mono text-[9px]" style={{ color: s.open ? '#00C27A' : 'rgba(255,255,255,0.35)', border: `1px solid ${s.open ? 'rgba(0,194,122,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                  {s.label} {s.open ? 'OPEN' : 'closed'} · {s.changeType} {fmtMins(s.minsToChange)}
                </span>
              ))}
              {sessions.overlaps.map((o, i) => <span key={i} className="text-[9px]" style={{ color: '#FFB300' }}>⚡ {o}</span>)}
            </div>
          )}

          {/* Market overview by asset class */}
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {overview.map((g) => (
              <div key={g.assetClass} className="rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="mb-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: CYAN }}>{g.assetClass}</div>
                <table className="w-full text-left font-mono text-[10px]">
                  <tbody>
                    {g.rows.slice(0, 6).map((r) => (
                      <tr key={r.symbol} className="cursor-pointer text-white/60 hover:text-white" onClick={() => openInstrument(r.symbol)}>
                        <td className="pr-2 font-bold text-white/80">{r.symbol}</td>
                        <td className="pr-2">{r.price ?? '—'}</td>
                        <td className="pr-2" style={{ color: (r.chg24hPct ?? 0) >= 0 ? '#00C27A' : '#FF5252' }}>{r.chg24hPct != null ? `${r.chg24hPct > 0 ? '+' : ''}${r.chg24hPct}%` : '—'}</td>
                        <td className="pr-2 text-white/40">{r.regime ?? '—'}</td>
                        <td className="text-white/35">{r.volPct != null ? `ATR ${r.volPct}%` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Top scanner opportunities */}
          <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'rgba(0,194,122,0.3)' }}>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#00C27A' }}>📡 Top scanner opportunities (live)</div>
            {opps.length ? opps.map((o) => (
              <div key={o.id} className="mb-1 flex flex-wrap items-center gap-2 text-[10px]">
                <button onClick={() => openInstrument(o.symbol)} className="font-mono font-bold text-white/80 hover:text-white">{o.symbol}</button>
                <span style={{ color: o.direction === 'BUY' ? '#00C27A' : '#FF5252' }}>{o.direction}</span>
                <span className="text-white/45">{o.style} {o.tfLabel} · score {o.score} · {o.zone.riskReward1}R</span>
                <button onClick={() => {
                  armEmil({ kind: 'scan', symbol: o.symbol, direction: o.direction, lots: Math.max(0.01, o.suggestedLots ?? 0.01), entryRef: o.zone.preferred, stop: o.zone.stop, target: o.zone.target1, tf: o.tfLabel, score: o.score, reasons: o.reasonsFor.slice(0, 2), source: 'ABIN overview' });
                  openEmilCockpit();
                }} className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ color: '#FFD54F', border: '1px solid rgba(255,213,79,0.4)' }}>🤖 Arm EMIL</button>
              </div>
            )) : <p className="text-[10px] text-white/40">Nothing clears the quality bar right now — No-Trade is a valid market read.</p>}
          </div>
        </>
      )}

      {tab === 'Instrument' && (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <select value={symbol || universe[0] || ''} onChange={(e) => openInstrument(e.target.value)}
              className="rounded bg-white/[0.06] px-2 py-1.5 font-mono text-[11px] font-bold text-white outline-none" style={{ border: `1px solid ${CYAN}59` }}>
              {universe.map((s) => <option key={s} value={s} style={{ backgroundColor: '#0A0F1A' }}>{s}</option>)}
            </select>
            {!master && <span className="text-[10px] text-white/40">pick an instrument or search above</span>}
            {compareWith && <span className="text-[10px]" style={{ color: '#D4E157' }}>comparing side by side — “compare A and B” in the command bar set this up</span>}
          </div>
          <div className={`grid gap-3 ${compareWith ? 'lg:grid-cols-2' : ''}`}>
            {master && masterCard(master)}
            {compareWith && masterCard(compareWith)}
          </div>
        </div>
      )}

      {tab === 'Central banks' && (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button key={r.id} onClick={() => { setCbRegion(r.id); setCb(cbIntelligence(r.id, calendar)); }}
                className="rounded px-2 py-1 text-[10px] font-bold transition-all hover:brightness-125"
                style={{ color: cbRegion === r.id ? CYAN : 'rgba(255,255,255,0.4)', border: `1px solid ${cbRegion === r.id ? `${CYAN}88` : 'rgba(255,255,255,0.1)'}` }}>
                {r.centralBank}
              </button>
            ))}
          </div>
          {cb && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="mb-1 text-[12px] font-bold text-white">{cb.region.centralBank} <span className="font-mono text-[10px] text-white/40">· {cb.region.ccy} · {cb.region.name}</span></div>
              <p className="text-[10px] text-white/55"><b className="text-white/70">Policy schedule (real calendar):</b> {cb.policyEvents.length ? cb.policyEvents.map((e) => `“${e.title}” ${fmtEta(e.timeMs)}${e.forecast ? ` (f: ${e.forecast}, p: ${e.previous})` : ''}`).join(' · ') : 'no policy-class events on this week’s calendar'}</p>
              <p className="mt-1 text-[10px] text-white/55"><b className="text-white/70">Measured reactions (learned):</b> {cb.reactions.length ? cb.reactions.map((r) => `${r.title} — ${r.note}`).join(' · ') : 'no policy releases measured yet — the knowledge engine records the next one automatically'}</p>
              <p className="mt-1.5 rounded border px-2 py-1.5 text-[9px]" style={{ borderColor: 'rgba(255,179,0,0.3)', color: 'rgba(255,213,120,0.85)' }}>SLOT · {cb.missing}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'Calendar Pro' && (
        <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-white/55">
            <label>Currency <select value={calCcy} onChange={(e) => setCalCcy(e.target.value)} className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px] text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
              <option value="all" style={{ backgroundColor: '#0A0F1A' }}>all</option>
              {[...new Set(calendar.map((e) => e.currency))].sort().map((c) => <option key={c} value={c} style={{ backgroundColor: '#0A0F1A' }}>{c}</option>)}
            </select></label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={calHighOnly} onChange={(e) => setCalHighOnly(e.target.checked)} className="accent-[#29ABE2]" /> High impact only</label>
            <span className="text-[9px] text-white/30">CALENDAR lineage · entries within 30 min of high-impact releases are blocked platform-wide (news buffer)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[9px]">
              <thead><tr className="text-white/30"><th className="pr-3 font-normal">When</th><th className="pr-3 font-normal">Ccy</th><th className="pr-3 font-normal">Event</th><th className="pr-3 font-normal">Impact</th><th className="pr-3 font-normal">Forecast</th><th className="pr-3 font-normal">Previous</th><th className="font-normal">Your exposure</th></tr></thead>
              <tbody>
                {calRows.map((e, i) => (
                  <tr key={i} className="align-top text-white/55">
                    <td className="pr-3">{fmtEta(e.timeMs)}<br /><span className="text-white/30">{new Date(e.timeMs).toLocaleString()}</span></td>
                    <td className="pr-3 font-bold text-white/70">{e.currency}</td>
                    <td className="max-w-[260px] pr-3">{e.title}</td>
                    <td className="pr-3" style={{ color: e.impact === 'High' ? '#FF5252' : e.impact === 'Medium' ? '#FFB300' : '#8B93A7' }}>{e.impact}</td>
                    <td className="pr-3">{e.forecast || '—'}</td>
                    <td className="pr-3">{e.previous || '—'}</td>
                    <td>{heldCcys.includes(e.currency) ? <span style={{ color: '#FF8A65' }}>OPEN EXPOSURE</span> : <span className="text-white/25">none</span>}</td>
                  </tr>
                ))}
                {!calRows.length && <tr><td colSpan={7} className="text-white/35">No events match the filters this week.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Portfolio' && (
        <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'rgba(0,229,160,0.3)' }}>
          <div className="mb-1 text-[12px] font-bold text-white">🧬 Portfolio intelligence</div>
          {dna && !dna.empty ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {dna.metrics.map((m) => <span key={m.name} className="rounded px-2 py-1 font-mono text-[9px]" title={m.note} style={{ border: `1px solid ${m.heat}66`, color: m.heat }}>{m.name}: {m.score}</span>)}
              </div>
              <p className="mt-1.5 text-[9px] text-white/45">Currency exposure (net lots): {dna.currencyExposure.map((c) => `${c.ccy} ${c.netLots > 0 ? '+' : ''}${c.netLots}`).join(' · ')}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {dna.positionHeat.map((p, i) => <span key={i} className="rounded px-1.5 py-0.5 font-mono text-[9px]" style={{ border: `1px solid ${p.heat}66`, color: p.heat }}>{p.direction} {p.symbol} {p.risk$ != null ? `risk $${p.risk$}` : 'NO STOP ⚠'}</span>)}
              </div>
              <p className="mt-1.5 text-[9px] text-white/35">Deeper cuts (Digital Twin, shock tests, drift alerts) live on the <button className="underline" onClick={() => window.open('/terminal/world', '_blank')}>World Command Center</button>.</p>
            </>
          ) : <p className="text-[10px] text-white/40">Flat — no open positions. Flat is a position.</p>}
        </div>
      )}

      {tab === 'Entitlements' && (
        <div className="mt-3 rounded-lg border p-3" style={{ borderColor: 'rgba(255,179,0,0.3)' }}>
          <div className="mb-1 text-[12px] font-bold text-white">🔐 Data entitlements & lineage — nothing simulated, ever</div>
          <table className="w-full text-left font-mono text-[9px]">
            <thead><tr className="text-white/30"><th className="pr-3 font-normal">Section</th><th className="pr-3 font-normal">Status</th><th className="font-normal">Note</th></tr></thead>
            <tbody>
              {ENTITLEMENTS.map((e) => (
                <tr key={e.section} className="align-top text-white/55">
                  <td className="max-w-[260px] pr-3 text-white/70">{e.section}</td>
                  <td className="pr-3 font-bold" style={{ color: e.status === 'Live' ? '#00C27A' : e.status === 'Partial' ? '#FFB300' : '#8B93A7' }}>{e.status}</td>
                  <td>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[8px] leading-relaxed text-white/30">{LINEAGE_LEGEND}</p>
          <p className="mt-1 text-[8px] text-white/30">Vendor register, wiring matrix and readiness scores: <button className="underline" onClick={() => window.open('/terminal/audit', '_blank')}>Platform Audit</button>.</p>
        </div>
      )}

      <p className="mt-3 text-[8px] leading-relaxed text-white/30">{ABIN_DISCLAIMER}</p>
    </div>
  );
}
