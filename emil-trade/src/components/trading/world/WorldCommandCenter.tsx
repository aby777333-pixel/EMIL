'use client';

// 🌍 RAPTOR Global Market Command Center — the differentiation layer.
// One interactive world map over live platform data: click a region for its
// currency, instruments, regimes, events, exposure, mood, EMIL outlook and
// a measured risk score. Below it: Portfolio DNA + risk heat, the Digital
// Financial Twin (bootstrap futures from measured returns), the AI News
// Studio, the AI Watchdog (an auditor that questions EMIL's decisions) and
// AI Memory Search over the trader's real history. Nothing invented:
// regions without instruments on this feed say so.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { getCalendar, fmtEta, type NewsEvent } from '@/lib/trading/news-guard';
import { loadEmilAutoParams } from '@/lib/trading/emil-council';
import { loadReplays } from '@/lib/trading/emil-governance';
import { assessOpportunity, SCAN_TFS } from '@/lib/trading/scanner-engine';
import { atr } from '@/lib/trading/indicators';
import { loadLangPrefs, routeCommand, sarvamTranslate, sarvamHealth, sarvamSpeech, startVoiceCapture, langAudit, laraSpeak, type VoiceCapture } from '@/lib/trading/emil-language';
import {
  REGIONS, regionSnapshot, portfolioDNA, simulateTwin, buildBriefing, watchdogReview, searchMemory,
  type Region, type RegionSnapshot, type PortfolioDNA, type TwinResult, type BriefingKind, type WatchdogItem, type OpenPosLite,
} from '@/lib/trading/world-command';

const riskColor = (r: number) => (r >= 75 ? '#FF5252' : r >= 55 ? '#FF9800' : r >= 35 ? '#FFEB3B' : '#00C27A');

export default function WorldCommandCenter({ ohlcvBuilder, isLiveData }: { ohlcvBuilder: OHLCVBuilder | null; isLiveData: boolean }) {
  const { prices, positions, activeAccountId } = useTradingStore();
  const [calendar, setCalendar] = useState<NewsEvent[]>([]);
  const [selected, setSelected] = useState<string>('US');
  const [snap, setSnap] = useState<RegionSnapshot | null>(null);
  const [riskMap, setRiskMap] = useState<Record<string, number>>({});
  const [dna, setDna] = useState<PortfolioDNA | null>(null);
  const [twinSymbol, setTwinSymbol] = useState<string>('');
  const [twin, setTwin] = useState<{ res: TwinResult; setup: string } | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [watchdog, setWatchdog] = useState<WatchdogItem[]>([]);
  const [memQ, setMemQ] = useState('');
  const [memA, setMemA] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [sarvamOk, setLaraOk] = useState(false);
  const [memRecording, setMemRecording] = useState(false);
  const [memBusy, setMemBusy] = useState(false);
  const memVoiceRef = useRef<VoiceCapture | null>(null);
  const builderRef = useRef(ohlcvBuilder);
  builderRef.current = ohlcvBuilder;

  const posLite = positions as unknown as OpenPosLite[];
  const universe = useMemo(() => Object.keys(prices).filter((s) => prices[s]?.bid != null), [prices]);

  useEffect(() => { getCalendar().then(setCalendar); }, []);
  useEffect(() => { sarvamHealth().then(setLaraOk); }, []);

  // Memory search with the SAME language routing as Mission Control:
  // native-script aliases hit directly; otherwise Indic/mixed text goes
  // through consented Lara translation into the deterministic matcher.
  // Language processing only ever SEARCHES — it can never trade.
  const runMemorySearch = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const route = routeCommand(text, loadLangPrefs(), sarvamOk);
    let toSearch = text;
    const pre: string[] = [];
    if (route.engine === 'sarvam+rules') {
      const tr = await sarvamTranslate(text, route.detect.lang);
      if (tr.ok && tr.translated) {
        toSearch = tr.translated;
        pre.push(`Translated (Lara): “${tr.translated}”`);
        langAudit({ original: text.slice(0, 200), detected: route.detect.label, engine: 'sarvam+rules', translated: tr.translated.slice(0, 200), action: 'memory search' });
      } else {
        pre.push(`Language service: ${tr.error} — searched as typed (native-script instrument names still match).`);
      }
    } else if (route.detect.lang !== 'en' || route.detect.mixed) {
      pre.push(`Language routing: ${route.reason} (native-script instrument names still match directly).`);
    }
    setMemA([...pre, ...searchMemory(toSearch, history as never)]);
  }, [sarvamOk, history]);

  const handleMemVoice = useCallback(async () => {
    if (memVoiceRef.current) {
      setMemBusy(true);
      try {
        const cap = memVoiceRef.current;
        memVoiceRef.current = null;
        setMemRecording(false);
        const { base64, seconds } = await cap.stop();
        if (seconds < 1) { setMemA(['Voice: recording too short — try again.']); return; }
        const res = await sarvamSpeech(base64);
        if (res.ok && res.transcript) {
          setMemQ(res.transcript);
          langAudit({ original: `[voice ${seconds}s]`, detected: res.language ?? 'unknown', engine: 'sarvam-stt-translate', translated: res.transcript.slice(0, 200), action: 'memory search voice' });
          await runMemorySearch(res.transcript);
        } else {
          setMemA([`Voice: ${res.error} — type the question instead; nothing else happened.`]);
        }
      } finally { setMemBusy(false); }
      return;
    }
    const prefs = loadLangPrefs();
    if (!prefs.sarvamEnabled || !prefs.consentAt) { setMemA(['Voice needs Lara enabled + consent — see Language & Voice in the EMIL console.']); return; }
    if (!sarvamOk) { setMemA(['Voice: Lara is not configured on the server — voice stays off, honestly.']); return; }
    try { memVoiceRef.current = await startVoiceCapture(); setMemRecording(true); }
    catch { setMemA(['Voice: microphone unavailable or permission denied.']); }
  }, [sarvamOk, runMemorySearch]);
  useEffect(() => {
    if (!activeAccountId) return;
    orderService.getTradeHistory(activeAccountId, 100).then((rows) => setHistory(rows as unknown as Array<Record<string, unknown>>)).catch(() => {});
  }, [activeAccountId]);

  // Region snapshots + risk map + DNA + watchdog, refreshed every 30s.
  useEffect(() => {
    const compute = () => {
      const b = builderRef.current;
      if (!b) return;
      try {
        const region = REGIONS.find((r) => r.id === selected)!;
        setSnap(regionSnapshot({ builder: b, region, prices, calendar, positions: posLite }));
        const rm: Record<string, number> = {};
        for (const r of REGIONS) rm[r.id] = regionSnapshot({ builder: b, region: r, prices, calendar, positions: posLite }).riskScore;
        setRiskMap(rm);
        setDna(portfolioDNA(b, posLite));
        setWatchdog(watchdogReview({
          replays: loadReplays(), autoParams: loadEmilAutoParams(),
          openEmil: posLite.filter((p) => String(p.comment ?? '').startsWith('EMIL') && (p.status ?? 'open') === 'open'),
        }));
      } catch { /* the command center must never crash the window */ }
    };
    compute();
    const id = setInterval(compute, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, calendar.length, positions.length, universe.length]);

  const runTwin = useCallback(() => {
    const b = builderRef.current;
    const sym = twinSymbol || universe[0];
    if (!b || !sym) return;
    // Prefer the scanner's real H1 setup; fall back to a labelled neutral probe.
    const h1 = SCAN_TFS.find((t) => t.label === 'H1')!;
    const opp = assessOpportunity({ builder: b, symbol: sym, tf: h1, tick: prices[sym], calendar, openPositionCurrencies: [], balance: 0, isLiveData });
    let entry: number; let stop: number; let target: number; let direction: 'BUY' | 'SELL'; let setup: string;
    if (opp) {
      entry = opp.zone.preferred; stop = opp.zone.stop; target = opp.zone.target1; direction = opp.direction;
      setup = `live H1 setup: ${direction} · entry ${entry} · SL ${stop} · TP ${target} (score ${opp.score})`;
    } else {
      const bars = b.getAllBars(sym, '60');
      if (bars.length < 30) return;
      const series = atr(bars.map((x) => x.high), bars.map((x) => x.low), bars.map((x) => x.close), 14).filter((v): v is number => v != null);
      const a0 = series[series.length - 1] ?? 0;
      const px = prices[sym]?.bid ?? bars[bars.length - 1].close;
      if (!a0 || !px) return;
      const dp = px < 20 ? 5 : 2;
      entry = px; stop = Number((px - 1.5 * a0).toFixed(dp)); target = Number((px + 2 * a0).toFixed(dp)); direction = 'BUY';
      setup = `no qualified setup right now — neutral probe: BUY @ ${entry}, SL 1.5×ATR (${stop}), TP 2×ATR (${target}); illustrative only`;
    }
    const res = simulateTwin({ builder: b, symbol: sym, direction, entry, stop, target });
    if (res) setTwin({ res, setup });
  }, [twinSymbol, universe, prices, calendar, isLiveData]);

  const region = REGIONS.find((r) => r.id === selected)!;

  return (
    <div className="mx-auto w-full max-w-[1250px] p-4">
      {/* ── Interactive world map ── */}
      <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(41,171,226,0.3)', backgroundColor: 'rgba(255,255,255,0.015)' }}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-bold text-white">🌍 Global Market Command Center</span>
          <span className="text-[9px] text-white/35">click a region — colours are measured risk scores (events, volatility, mood, session), refreshed every 30s</span>
          <span className="ml-auto rounded px-2 py-0.5 font-mono text-[8px]" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}>
            {isLiveData ? 'live feed' : 'platform feed (simulated pricing until the real LP)'}
          </span>
          <button onClick={() => window.open('/terminal/audit', '_blank')}
            title="Platform systems audit — module readiness, wiring matrix, gap report, third-party register, LP checklist"
            className="rounded px-2 py-0.5 font-mono text-[8px] font-bold transition-all hover:brightness-125"
            style={{ color: '#FFB300', border: '1px solid rgba(255,179,0,0.4)' }}>
            🧾 AUDIT
          </button>
        </div>
        <div className="relative h-[300px] w-full overflow-hidden rounded-lg" style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(0,145,213,0.08) 0%, rgba(8,13,22,0.9) 70%), repeating-linear-gradient(0deg, transparent, transparent 29px, rgba(255,255,255,0.03) 30px), repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(255,255,255,0.03) 30px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {REGIONS.map((r: Region) => {
            const risk = riskMap[r.id] ?? 20;
            const col = riskColor(risk);
            const active = r.id === selected;
            return (
              <button key={r.id} onClick={() => setSelected(r.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg px-2 py-1 font-mono text-[10px] font-bold transition-all hover:brightness-125"
                style={{
                  left: `${r.pos.x}%`, top: `${r.pos.y}%`,
                  backgroundColor: active ? `${col}30` : `${col}14`,
                  color: col, border: `1px solid ${col}${active ? 'CC' : '55'}`,
                  boxShadow: active ? `0 0 16px ${col}66` : `0 0 6px ${col}22`,
                }}
                title={`${r.name} · ${r.ccy} · risk ${risk}/100`}>
                {r.id} <span className="opacity-60">{r.ccy}</span> {risk}
              </button>
            );
          })}
        </div>

        {/* Selected-region detail */}
        {snap && (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-bold text-white">{region.name}</span>
                <span className="font-mono text-[10px] text-white/50">{region.ccy} · {region.centralBank}</span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[9px]" style={{ color: snap.marketOpen ? '#00C27A' : '#8B93A7', border: `1px solid ${snap.marketOpen ? '#00C27A' : '#8B93A7'}55` }}>
                  {snap.marketOpen ? 'CASH MARKET OPEN' : 'cash market closed'} · {snap.localTime} local
                </span>
                {snap.mood && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ color: snap.mood.color, border: `1px solid ${snap.mood.color}55` }}>{snap.mood.label}</span>}
                <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: riskColor(snap.riskScore), border: `1px solid ${riskColor(snap.riskScore)}55` }}>risk {snap.riskScore}/100</span>
              </div>
              {snap.instruments.length ? (
                <table className="w-full text-left font-mono text-[10px]">
                  <thead><tr className="text-white/30"><th className="pr-2 font-normal">Instrument</th><th className="pr-2 font-normal">Price</th><th className="pr-2 font-normal">24h</th><th className="font-normal">Regime</th></tr></thead>
                  <tbody>
                    {snap.instruments.map((i) => (
                      <tr key={i.symbol} className="text-white/60">
                        <td className="pr-2 font-bold text-white/80">{i.symbol}</td>
                        <td className="pr-2">{i.price ?? '—'}</td>
                        <td className="pr-2" style={{ color: (i.chg24hPct ?? 0) >= 0 ? '#00C27A' : '#FF5252' }}>{i.chg24hPct != null ? `${i.chg24hPct > 0 ? '+' : ''}${i.chg24hPct}%` : '—'}</td>
                        <td>{i.regime ? `${i.regime} (${i.regimeConf}%)` : 'insufficient bars'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-[10px] text-white/40">No {region.ccy} instruments on this feed yet — sessions, calendar and central-bank schedule are still tracked honestly.</p>}
            </div>
            <div className="text-[10px] leading-relaxed">
              <p className="mb-1"><b className="text-white/70">EMIL outlook:</b> <span className="text-white/50">{snap.outlook}</span></p>
              <p className="mb-1"><b className="text-white/70">Risk drivers:</b> <span className="text-white/50">{snap.riskParts.join(' · ')}</span></p>
              <p className="mb-1"><b className="text-white/70">Event calendar ({region.ccy}):</b>{' '}
                <span className="text-white/50">{snap.events.length ? snap.events.map((e) => `“${e.title}” ${fmtEta(e.timeMs)}`).join(' · ') : 'no red-flag releases inside 72h'}</span></p>
              <p><b className="text-white/70">Your exposure:</b>{' '}
                <span className="text-white/50">{snap.exposure.length ? snap.exposure.map((e) => `${e.direction} ${e.size} ${e.symbol}`).join(' · ') : `none touching ${region.ccy}`}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* ── Portfolio DNA + risk heat ── */}
      <div className="mt-3 rounded-xl border p-4" style={{ borderColor: 'rgba(0,229,160,0.3)' }}>
        <div className="mb-2 text-[12px] font-bold text-white">🧬 Portfolio DNA — the risk profile at a glance</div>
        {dna && !dna.empty ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {dna.metrics.map((m) => (
                <span key={m.name} className="rounded px-2 py-1 font-mono text-[9px]" title={m.note}
                  style={{ border: `1px solid ${m.heat}66`, color: m.heat, backgroundColor: `${m.heat}10` }}>
                  {m.name}: {m.score}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-[9px] text-white/45">
              Currency exposure (net lots): {dna.currencyExposure.map((c) => `${c.ccy} ${c.netLots > 0 ? '+' : ''}${c.netLots}`).join(' · ')}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {dna.positionHeat.map((p, i) => (
                <span key={i} className="rounded px-1.5 py-0.5 font-mono text-[9px]" style={{ border: `1px solid ${p.heat}66`, color: p.heat }}>
                  {p.direction} {p.symbol} {p.risk$ != null ? `risk $${p.risk$}` : 'NO STOP ⚠'}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[8px] text-white/25">Heat: green=contained · yellow=watch · orange=elevated · red=heavy · purple=unbounded (missing stop) or extreme. All computed from your real open positions and measured market data.</p>
          </>
        ) : <p className="text-[10px] text-white/40">Flat — no open positions, no risk profile. Flat is a position.</p>}
      </div>

      {/* ── Digital Financial Twin ── */}
      <div className="mt-3 rounded-xl border p-4" style={{ borderColor: 'rgba(179,136,255,0.35)' }}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-bold text-white">🔮 Digital Financial Twin — rehearse the futures before committing capital</span>
          <select value={twinSymbol || universe[0] || ''} onChange={(e) => setTwinSymbol(e.target.value)}
            className="rounded bg-white/[0.06] px-2 py-1 font-mono text-[10px] text-white outline-none" style={{ border: '1px solid rgba(179,136,255,0.4)' }}>
            {universe.map((s) => <option key={s} value={s} style={{ backgroundColor: '#0A0F1A' }}>{s}</option>)}
          </select>
          <button onClick={runTwin} className="rounded px-3 py-1 text-[10px] font-bold text-black transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(180deg,#B388FF,#7C4DFF)' }}>
            Simulate 300 futures
          </button>
        </div>
        {twin ? (
          <>
            <p className="mb-1.5 text-[10px] text-white/55">{twin.setup}</p>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <span style={{ color: '#00C27A' }}>target first: {twin.res.pTarget}%</span>
              <span style={{ color: '#FF5252' }}>stop first: {twin.res.pStop}%</span>
              <span className="text-white/50">unresolved in horizon: {twin.res.pNeither}%</span>
              <span style={{ color: '#FFB300' }}>median worst excursion: {twin.res.medianMaxAdverseR}R</span>
              <span className="text-white/35">{twin.res.nPaths} paths · {twin.res.horizon}</span>
            </div>
            <div className="mt-1.5 flex h-3 w-full max-w-[520px] overflow-hidden rounded">
              <div style={{ width: `${twin.res.pTarget}%`, backgroundColor: 'rgba(0,194,122,0.7)' }} />
              <div style={{ width: `${twin.res.pNeither}%`, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              <div style={{ width: `${twin.res.pStop}%`, backgroundColor: 'rgba(255,82,82,0.7)' }} />
            </div>
            <p className="mt-1 text-[8px] text-white/30">{twin.res.note}</p>
          </>
        ) : <p className="text-[10px] text-white/40">Pick an instrument and simulate — the twin bootstraps the instrument’s own recent M15 returns into 300 plausible paths and counts which barrier they touch first. A rehearsal, never a promise.</p>}
      </div>

      {/* ── News Studio + Watchdog ── */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(255,213,79,0.3)' }}>
          <div className="mb-2 text-[12px] font-bold text-white">📰 AI News Studio — briefings written from live reads</div>
          <div className="flex flex-wrap gap-1.5">
            {(['morning', 'london', 'us', 'close', 'weekly'] as BriefingKind[]).map((k) => (
              <button key={k} onClick={() => { if (builderRef.current) setBriefing(buildBriefing({ kind: k, builder: builderRef.current, prices, calendar, positions: posLite })); }}
                className="rounded px-2.5 py-1 text-[10px] font-bold capitalize transition-all hover:brightness-125"
                style={{ color: '#FFD54F', border: '1px solid rgba(255,213,79,0.4)', backgroundColor: 'rgba(255,213,79,0.08)' }}>
                {k}
              </button>
            ))}
            {briefing && (
              <>
                <button onClick={() => {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(new Blob([briefing], { type: 'text/plain' }));
                  a.download = `raptor-briefing-${new Date().toISOString().slice(0, 10)}.txt`; a.click(); URL.revokeObjectURL(a.href);
                }} className="rounded px-2 py-1 text-[9px] font-bold text-white/50 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>Download</button>
                <button onClick={async () => { const ok = await laraSpeak(briefing.replace(/\n+/g, '. ').slice(0, 450)); if (!ok) setMemA(['🔊 Speak needs Lara enabled + consent (EMIL → Language & Voice) and the server key configured.']); }}
                  title="Lara reads the briefing aloud (first section) — needs Lara enabled + consented"
                  className="rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#FF8A65', border: '1px solid rgba(255,138,101,0.4)' }}>🔊 Speak</button>
              </>
            )}
          </div>
          {briefing && <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded bg-white/[0.03] p-2 font-mono text-[9px] leading-relaxed text-white/60" style={{ scrollbarWidth: 'thin' }}>{briefing}</pre>}
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(255,138,101,0.3)' }}>
          <div className="mb-2 text-[12px] font-bold text-white">🔍 AI Watchdog — the auditor that questions EMIL</div>
          {watchdog.length ? watchdog.map((w) => (
            <div key={w.ts + w.headline} className="mb-2 border-b pb-2 last:mb-0 last:border-0 last:pb-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <p className="font-mono text-[10px] font-bold text-white/75">{w.headline} · {new Date(w.ts).toLocaleTimeString()}</p>
              {w.qa.map((x) => <p key={x.q} className="text-[9px] text-white/45"><b className="text-white/60">{x.q}</b> {x.a}</p>)}
              {w.flag && <p className="text-[9px] font-bold" style={{ color: '#FF8A65' }}>{w.flag}</p>}
            </div>
          )) : <p className="text-[10px] text-white/40">No EMIL decisions recorded yet — every pilot entry from Round 22 onward gets a flight-recorder record the watchdog audits with five questions.</p>}
        </div>
      </div>

      {/* ── AI Memory Search ── */}
      <div className="mt-3 rounded-xl border p-4" style={{ borderColor: 'rgba(77,208,225,0.3)' }}>
        <div className="mb-2 text-[12px] font-bold text-white">🧠 AI Memory Search — ask about your own history</div>
        <div className="flex gap-2">
          <input value={memQ} onChange={(e) => setMemQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && memQ.trim()) void runMemorySearch(memQ); }}
            placeholder='e.g. "When did I trade gold best?" · "my losses in London" · "सोना" · "தங்கம்" · "biggest hedge"'
            className="min-w-0 flex-1 rounded bg-white/[0.06] px-3 py-2 text-[11px] text-white placeholder:text-white/25 outline-none" style={{ border: '1px solid rgba(77,208,225,0.35)' }} />
          <button onClick={handleMemVoice} disabled={memBusy}
            title={memRecording ? 'Stop recording and transcribe' : 'Voice question via Lara — speak English or an Indian language; searching only, never trading'}
            className="shrink-0 rounded px-3 py-2 text-[11px] font-bold transition-all hover:brightness-110 disabled:opacity-40"
            style={memRecording
              ? { backgroundColor: 'rgba(255,82,82,0.2)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.7)', boxShadow: '0 0 12px rgba(255,82,82,0.5)' }
              : { backgroundColor: 'rgba(255,138,101,0.12)', color: '#FF8A65', border: '1px solid rgba(255,138,101,0.4)' }}>
            {memBusy ? '…' : memRecording ? '⏹ Stop' : '🎤'}
          </button>
          <button onClick={() => memQ.trim() && void runMemorySearch(memQ)}
            className="shrink-0 rounded px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(180deg,#4DD0E1,#00ACC1)' }}>
            Ask
          </button>
        </div>
        {memA.length > 0 && <div className="mt-2">{memA.map((l, i) => <p key={i} className="font-mono text-[10px] leading-relaxed text-white/60">{l}</p>)}</div>}
        <p className="mt-1 text-[8px] text-white/25">Deterministic answers from your loaded closed-trade history (last 100) — filters: instruments (gold/oil/bitcoin — English or native script: सोना · தங்கம் · സ്വർണം), months, London / New York hours, hedge, EMIL, best/worst/biggest. Indian-language questions route through Lara (consented) into the SAME matcher; voice transcribes then searches — language can never trade.</p>
      </div>

      <p className="mt-3 text-[9px] leading-relaxed text-white/30">
        Every figure on this page is computed from live platform data, the real economic calendar and your own records —
        {isLiveData ? ' live pricing.' : ' simulated pricing until the real LP connects, when the same wiring carries real prices automatically.'} Estimates
        are probabilities, never certainty. Neither the broker nor the Raptor platform is responsible for trading losses.
      </p>
    </div>
  );
}
