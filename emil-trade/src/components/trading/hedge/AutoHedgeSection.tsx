'use client';

// AUTO HEDGE — the independent Hedge Trade engine, wired into the Hedge
// panel/page. Evaluation cycle runs every 10s while this panel is open
// (server-side 24/7 execution is a future phase — stated, not claimed).
// EMIL has no execution authority here; Scan Trade has no connection.
// Every automated order passes Shield → Guardian → Risk Governor.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert, Power, OctagonX, RotateCcw } from 'lucide-react';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import type { InstrumentSpec } from '@/lib/insights/risk';
import type { NewsEvent } from '@/lib/trading/news-guard';
import { orderService } from '@/lib/trading/order-service';
import {
  evaluateHedgeAuto, basketFloating, loadBaskets, saveBaskets, hedgeAutoLog, loadHedgeAutoLog,
  loadHedgeAutoParams, saveHedgeAutoParams, applyCapitalDefaults, HEDGE_PRESETS, CAPITAL_TABLE, capitalRow,
  isHedgeAutoOn, setHedgeAutoOn, isHedgeAutoConsented, recordHedgeAutoConsent, HEDGE_AUTO_DISCLAIMER,
  type HedgeAutoParams, type HedgeBasket, type LivePosition,
} from '@/lib/trading/hedge-auto';
import { loadGovernorLimits, saveGovernorLimits, type GovernorLimits } from '@/lib/trading/risk-governor';
import TradeCommandBar from '@/components/trading/TradeCommandBar';

const MINT = '#00E5A0';

export default function AutoHedgeSection({ ohlcvBuilder, prices, specs, calendar, accountId, say, triggerRefresh }: {
  ohlcvBuilder: OHLCVBuilder | null;
  prices: Record<string, { bid?: number; ask?: number } | undefined>;
  specs: Record<string, InstrumentSpec> | null;
  calendar: NewsEvent[];
  accountId: string | null;
  say: (msg: string) => void;
  triggerRefresh: () => void;
}) {
  const [on, setOn] = useState(false);
  const [consented, setConsented] = useState(false);
  const [gate, setGate] = useState(false);
  const [typed, setTyped] = useState('');
  const [params, setParams] = useState<HedgeAutoParams>(loadHedgeAutoParams);
  const [gov, setGov] = useState<GovernorLimits>(loadGovernorLimits);
  const [baskets, setBaskets] = useState<HedgeBasket[]>([]);
  const [lastNote, setLastNote] = useState('engine idle');
  const [showLog, setShowLog] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [tick, setTick] = useState(0);
  const busyRef = useRef(false);
  const builderRef = useRef(ohlcvBuilder);
  builderRef.current = ohlcvBuilder;
  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const calRef = useRef(calendar);
  calRef.current = calendar;
  const specsRef = useRef(specs);
  specsRef.current = specs;

  useEffect(() => { setOn(isHedgeAutoOn()); setConsented(isHedgeAutoConsented()); setBaskets(loadBaskets()); }, []);

  const patch = (p: Partial<HedgeAutoParams>) => {
    setParams((prev) => { const next = { ...prev, ...p, preset: 'custom' as const }; saveHedgeAutoParams(next); return next; });
  };
  const applyPreset = (name: keyof typeof HEDGE_PRESETS) => {
    setParams((prev) => { const next = { ...prev, ...HEDGE_PRESETS[name], preset: name } as HedgeAutoParams; saveHedgeAutoParams(next); return next; });
  };
  const patchGov = (p: Partial<GovernorLimits>) => {
    setGov((prev) => { const next = { ...prev, ...p }; saveGovernorLimits(next); return next; });
  };

  const toggle = () => {
    if (!on && !consented) { setGate(true); return; }
    const next = !on;
    setHedgeAutoOn(next); setOn(next);
    hedgeAutoLog('toggle', next ? 'AUTO HEDGE ON — engine evaluates every 10s while a Hedge Trade window is open' : 'AUTO HEDGE OFF — monitoring only, no orders');
    say(next ? 'Auto Hedge ON — evaluating every 10s while this window is open.' : 'Auto Hedge OFF — monitor-only.');
  };

  const closeBasketNow = useCallback(async (basket: HedgeBasket, reason: string) => {
    try {
      const rows = accountId ? (await orderService.getOpenPositions(accountId)) as LivePosition[] : [];
      const ids = [basket.primaryPositionId, ...basket.legs.map((l) => l.positionId)];
      for (const id of ids) {
        const pos = rows.find((r) => r.id === id && r.status === 'open');
        if (!pos) continue;
        const t = pricesRef.current[pos.symbol];
        const px = pos.direction === 'BUY' ? (t?.bid ?? pos.current_price ?? pos.open_price) : (t?.ask ?? pos.current_price ?? pos.open_price);
        await orderService.closePosition(pos.id, Number(px));
      }
      const all = loadBaskets().map((b) => b.id === basket.id ? { ...b, status: 'closed' as const, closedAt: Date.now(), closeReason: reason } : b);
      saveBaskets(all); setBaskets(all);
      hedgeAutoLog('basket-close', `basket ${basket.id} closed — ${reason}`, basket.id);
      say(`Hedge basket closed — ${reason}`);
      triggerRefresh();
    } catch (e) {
      hedgeAutoLog('error', `basket close failed: ${e instanceof Error ? e.message : 'unknown'}`, basket.id);
    }
  }, [accountId, say, triggerRefresh]);

  // ── The engine cycle: every 10s while this panel is mounted ──
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!on || !consented || !accountId || busyRef.current) return;
    const builder = builderRef.current; const sp = specsRef.current;
    if (!builder || !sp) return;
    busyRef.current = true;
    (async () => {
      try {
        const [sum, rows, hist] = await Promise.all([
          orderService.getAccountSummary(accountId) as Promise<{ balance?: number; equity?: number } | null>,
          orderService.getOpenPositions(accountId) as Promise<LivePosition[]>,
          orderService.getTradeHistory(accountId, 60) as Promise<Array<{ realized_pnl?: number | null; closed_at?: string | null }>>,
        ]);
        const today = new Date().toISOString().slice(0, 10);
        const realizedToday = (hist ?? []).filter((r) => (r.closed_at ?? '').slice(0, 10) === today)
          .reduce((a, r) => a + Number(r.realized_pnl ?? 0), 0);
        const decision = evaluateHedgeAuto({
          builder, accountId, positions: rows ?? [], ticks: pricesRef.current, specs: sp,
          calendar: calRef.current, balance: Number(sum?.balance ?? 0), equity: Number(sum?.equity ?? 0), realizedToday,
        });

        if (decision.kind === 'none') { setLastNote(decision.note); return; }

        if (decision.kind === 'manual-detected') {
          const all = loadBaskets().map((b) => b.id === decision.basket.id ? { ...b, status: 'manual' as const, manualNote: decision.note } : b);
          saveBaskets(all); setBaskets(all);
          hedgeAutoLog('manual', `MANUAL INTERVENTION: ${decision.note} — Auto Hedge is OFF for basket ${decision.basket.id}; you now manage those positions`, decision.basket.id);
          say('Manual intervention detected — Auto Hedge switched OFF for that basket. You manage those positions now.');
          setLastNote(`manual intervention on ${decision.basket.primarySymbol} basket`);
          return;
        }

        if (decision.kind === 'close-basket') {
          setLastNote(`closing basket: ${decision.reason}`);
          await closeBasketNow(decision.basket, decision.reason);
          return;
        }

        // open-hedge
        const t = pricesRef.current[decision.candidate.symbol];
        const fill = decision.candidate.hedgeDirection === 'BUY' ? t?.ask : t?.bid;
        if (fill == null) { setLastNote('no live price for the hedge leg'); return; }
        const basketId = `hb-${Date.now().toString(36)}`;
        await orderService.placeMarketOrder({
          accountId, symbol: decision.candidate.symbol, direction: decision.candidate.hedgeDirection,
          size: decision.lots, fillPrice: Number(fill), comment: `HedgeAuto:${basketId}`,
        });
        // Find the new leg's position id for basket tracking.
        const after = (await orderService.getOpenPositions(accountId)) as LivePosition[];
        const leg = after.find((r) => (r.comment ?? '') === `HedgeAuto:${basketId}`);
        const basket: HedgeBasket = {
          id: basketId, accountId,
          primaryPositionId: decision.primary.id, primarySymbol: decision.primary.symbol,
          primaryDirection: decision.primary.direction as 'BUY' | 'SELL', primaryLots: decision.primary.size,
          stage: 1, status: 'active',
          legs: leg ? [{ positionId: leg.id, symbol: leg.symbol, direction: decision.candidate.hedgeDirection, lots: decision.lots, openedAt: Date.now() }] : [],
          targetUsd: params.basketTargetUsd, maxLossUsd: params.maxBasketLossUsd, openedAt: Date.now(),
        };
        const all = [...loadBaskets(), basket];
        saveBaskets(all); setBaskets(all);
        hedgeAutoLog('hedge-open', `Stage 1 protective hedge: ${decision.candidate.hedgeDirection} ${decision.lots} ${decision.candidate.symbol} against ${decision.primary.symbol}. ${decision.reason}`, basketId);
        say(`Auto Hedge: ${decision.candidate.hedgeDirection} ${decision.lots} ${decision.candidate.symbol} opened against ${decision.primary.symbol}.`);
        setLastNote(`hedge opened on ${decision.candidate.symbol}`);
        triggerRefresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        hedgeAutoLog('blocked', `order path refused: ${msg}`);
        setLastNote(`blocked: ${msg}`);
      } finally {
        busyRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, on, consented, accountId]);

  const activeBaskets = baskets.filter((b) => b.accountId === accountId && b.status !== 'closed');
  const num = (label: string, key: keyof HedgeAutoParams, step = 1) => (
    <label className="flex items-center justify-between gap-2 text-[9px] text-white/55">
      <span>{label}</span>
      <input type="number" step={step} value={params[key] as number}
        onChange={(e) => patch({ [key]: Number(e.target.value) } as Partial<HedgeAutoParams>)}
        className="w-20 rounded bg-white/[0.06] px-1.5 py-0.5 text-right font-mono text-[9px] text-white outline-none" />
    </label>
  );

  return (
    <div className="mb-4 rounded-lg border p-3" style={{ borderColor: on ? 'rgba(0,229,160,0.4)' : 'rgba(255,255,255,0.1)' }}>
      {/* Independence banner */}
      <p className="mb-2 rounded border px-2 py-1 text-[9px]" style={{ borderColor: 'rgba(77,208,225,0.3)', color: 'rgba(255,255,255,0.5)' }}>
        <b style={{ color: '#4DD0E1' }}>Hedge Trade operates independently.</b> EMIL provides advice only and has no trading authority inside this
        module. Scan Trade has no operational connection here. Every automated order still passes Shield rules, the independent Guardian, and the
        account-level Risk Governor.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MINT }}>⚙ Auto Hedge</span>
        <button onClick={toggle}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-bold transition-all hover:brightness-125"
          style={{
            backgroundColor: on ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.05)',
            color: on ? MINT : 'rgba(255,255,255,0.45)',
            border: `1px solid ${on ? 'rgba(0,229,160,0.5)' : 'rgba(255,255,255,0.15)'}`,
          }}>
          <Power size={12} /> {on ? 'AUTO HEDGE ON' : 'AUTO HEDGE OFF'}
        </button>
        <span className="text-[9px] text-white/40">{on ? `engine: ${lastNote}` : 'monitor-only — suggestions shown, no orders placed'}</span>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setShowParams((s) => !s)} className="rounded px-2 py-1 text-[9px] font-bold text-white/50 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            {showParams ? 'Hide settings' : 'Risk settings'}
          </button>
          <button onClick={() => setShowLog((s) => !s)} className="rounded px-2 py-1 text-[9px] font-bold text-white/50 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            {showLog ? 'Hide log' : `Decision log (${loadHedgeAutoLog().length})`}
          </button>
          {on && (
            <button onClick={() => { setHedgeAutoOn(false); setOn(false); hedgeAutoLog('toggle', 'EMERGENCY: Auto Hedge disabled by trader'); say('Auto Hedge disabled.'); }}
              className="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#FF5252', border: '1px solid rgba(255,82,82,0.4)' }}>
              <OctagonX size={11} /> Disable
            </button>
          )}
        </div>
      </div>

      {/* Natural-language command bar */}
      <TradeCommandBar scope="hedge" accent={MINT}
        onApplied={(summary) => { setParams(loadHedgeAutoParams()); setGov(loadGovernorLimits()); setOn(isHedgeAutoOn()); say(summary); }} />

      {/* Settings */}
      {showParams && (
        <div className="mt-2 grid gap-3 lg:grid-cols-3">
          <div className="rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-white/40">Risk profile presets</div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(HEDGE_PRESETS) as Array<keyof typeof HEDGE_PRESETS>).map((k) => (
                <button key={k} onClick={() => applyPreset(k)}
                  className="rounded px-2 py-0.5 text-[9px] font-bold capitalize transition-all"
                  style={{
                    backgroundColor: params.preset === k ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.04)',
                    color: params.preset === k ? MINT : 'rgba(255,255,255,0.45)',
                    border: `1px solid ${params.preset === k ? 'rgba(0,229,160,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {k}
                </button>
              ))}
            </div>
            <button onClick={async () => {
              if (!accountId) return;
              const sum = await orderService.getAccountSummary(accountId) as { balance?: number } | null;
              const bal = Number(sum?.balance ?? 0);
              const next = applyCapitalDefaults(params, bal);
              setParams(next); saveHedgeAutoParams(next);
              const row = capitalRow(bal);
              say(`Capital defaults applied for ~$${row.capital.toLocaleString()} tier (target $${row.target[0]}-$${row.target[1]}, max basket loss $${row.maxBasketLoss}).`);
            }} className="mt-1.5 rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#FFB300', border: '1px solid rgba(255,179,0,0.35)' }}>
              Apply capital-based defaults ({CAPITAL_TABLE.length}-tier table)
            </button>
            <p className="mt-1 text-[8px] text-white/30">Templates, not promises of return. Very small accounts: minimum trade size can create disproportionate risk.</p>
          </div>
          <div className="space-y-1 rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/40">Activation & basket</div>
            {num('Loss $ before hedge', 'activationLossUsd', 0.5)}
            {num('Minutes in loss first', 'activationMinutes', 5)}
            {num('Min |correlation|', 'minCorrelation', 0.05)}
            {num('Max hedge instruments (1-3)', 'maxHedgeInstruments')}
            {num('Max hedge lots per leg (default 0.05)', 'maxHedgeLots', 0.01)}
            {num('Basket target $ (bare-minimum mode)', 'basketTargetUsd', 0.5)}
            {num('Max basket loss $', 'maxBasketLossUsd', 1)}
            {num('Engine daily loss stop $', 'dailyLossLimitUsd', 1)}
            {num('Max basket hours', 'maxBasketHours', 6)}
          </div>
          <div className="space-y-1 rounded border p-2" style={{ borderColor: 'rgba(255,179,0,0.25)' }}>
            <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#FFB300' }}>Account Risk Governor (above ALL engines)</div>
            {(['maxTotalLots', 'maxAutomatedLots', 'maxPerSymbolLots', 'maxOpenPositions', 'dailyLossLimitPct'] as Array<keyof GovernorLimits>).map((k) => (
              <label key={k} className="flex items-center justify-between gap-2 text-[9px] text-white/55">
                <span>{k === 'maxTotalLots' ? 'Max total lots (all engines)' : k === 'maxAutomatedLots' ? 'Max automated lots' : k === 'maxPerSymbolLots' ? 'Max lots per symbol' : k === 'maxOpenPositions' ? 'Max open positions' : 'Daily loss limit (% balance)'}</span>
                <input type="number" step={k === 'maxOpenPositions' ? 1 : 0.1} value={gov[k]}
                  onChange={(e) => patchGov({ [k]: Number(e.target.value) } as Partial<GovernorLimits>)}
                  className="w-16 rounded bg-white/[0.06] px-1.5 py-0.5 text-right font-mono text-[9px] text-white outline-none" />
              </label>
            ))}
            <p className="text-[8px] text-white/30">Shared with Auto Scan and every automated engine — combined exposure can never exceed these.</p>
          </div>
        </div>
      )}

      {/* Active baskets — always shown (with an empty state) so the trader can
          always see whether any auto-hedges exist and where they appear. */}
      <div className="mt-2">
        <div className="mb-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wide text-white/40">
          <span>Active hedge baskets ({activeBaskets.length})</span>
          <button onClick={() => setBaskets(loadBaskets())} title="Reload baskets from storage"
            className="rounded px-1.5 py-0.5 text-[8px] font-bold text-white/40 transition-colors hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            Refresh
          </button>
        </div>
        {activeBaskets.length === 0 ? (
          <div className="rounded border p-2 text-[9px] leading-relaxed text-white/45" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            No active hedge baskets. {on ? 'Auto Hedge is ON — it' : 'Auto Hedge is OFF; when enabled it'} opens a protective hedge once an eligible position sits in loss past your activation threshold. Positions the engine opens are tagged <span className="font-mono text-white/70">HedgeAuto</span> and appear here and in your Positions panel — manual hedges you place also show in Positions. {on ? 'The engine only runs while a Hedge Trade window is open (server-side 24/7 is a future phase).' : ''}
          </div>
        ) : (
        <div className="space-y-1.5">
          {activeBaskets.map((b) => {
            const stageLabel = b.status === 'manual' ? 'MANUAL INTERVENTION' : ['Monitoring', 'Protective Hedge', 'Balanced Recovery', 'Exit Management', 'Forced Closure'][b.stage];
            return (
              <div key={b.id} className="rounded border p-2" style={{ borderColor: b.status === 'manual' ? 'rgba(255,179,0,0.45)' : 'rgba(0,229,160,0.25)' }}>
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="font-bold text-white">{b.primarySymbol} {b.primaryDirection} {b.primaryLots}</span>
                  <span className="text-white/35">→</span>
                  {b.legs.map((l) => <span key={l.positionId} className="font-mono text-white/70">{l.direction} {l.lots} {l.symbol}</span>)}
                  <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ color: b.status === 'manual' ? '#FFB300' : MINT, border: `1px solid ${b.status === 'manual' ? 'rgba(255,179,0,0.4)' : 'rgba(0,229,160,0.35)'}` }}>{stageLabel}</span>
                  <span className="text-[9px] text-white/40">target +${b.targetUsd} · max loss -${b.maxLossUsd} · {((Date.now() - b.openedAt) / 3_600_000).toFixed(1)}h</span>
                  <div className="ml-auto flex gap-1.5">
                    {b.status === 'manual' && (
                      <button onClick={() => {
                        const all = loadBaskets().map((x) => x.id === b.id ? { ...x, status: 'active' as const, manualNote: undefined } : x);
                        saveBaskets(all); setBaskets(all);
                        hedgeAutoLog('manual', `basket ${b.id} REASSESSED at current prices and resumed under Auto Hedge`, b.id);
                        say('Basket reassessed at current prices — Auto Hedge resumed for it.');
                      }} className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#FFB300', border: '1px solid rgba(255,179,0,0.4)' }}>
                        <RotateCcw size={10} /> Reassess & Resume
                      </button>
                    )}
                    <button onClick={() => closeBasketNow(b, 'trader emergency close')}
                      className="rounded px-2 py-0.5 text-[9px] font-bold transition-all hover:brightness-125" style={{ color: '#FF5252', border: '1px solid rgba(255,82,82,0.4)' }}>
                      Close basket
                    </button>
                  </div>
                </div>
                {b.manualNote && <p className="mt-1 text-[9px]" style={{ color: '#FFB300' }}><ShieldAlert size={10} className="mr-1 inline" />{b.manualNote} — continuing manually leaves you responsible for these positions.</p>}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Decision log */}
      {showLog && (
        <div className="mt-2 max-h-44 overflow-y-auto rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.08)', scrollbarWidth: 'thin' }}>
          {loadHedgeAutoLog().slice(-30).reverse().map((l, i) => (
            <p key={i} className="mb-0.5 font-mono text-[8px] leading-relaxed text-white/45">
              <span className="text-white/25">{new Date(l.ts).toLocaleTimeString()}</span>{' '}
              <span className="font-bold uppercase" style={{ color: l.kind === 'hedge-open' ? MINT : l.kind === 'blocked' ? '#FF8A65' : l.kind === 'manual' ? '#FFB300' : 'rgba(255,255,255,0.5)' }}>{l.kind}</span>{' '}
              {l.text}
            </p>
          ))}
          {loadHedgeAutoLog().length === 0 && <p className="text-[9px] text-white/30">No decisions yet.</p>}
        </div>
      )}

      <p className="mt-2 text-[8px] leading-relaxed text-white/25">
        Objective: reduce uncontrolled exposure, seek small net gains where conditions permit, and exit failed recovery attempts within
        predetermined loss limits. Three valid outcomes: small net profit · near break-even after costs · controlled loss. Never guaranteed
        profit, zero-loss trading or certain recovery. The engine evaluates every 10s while a Hedge Trade window is open; server-side 24/7
        execution is a future phase and is not claimed before it exists.
      </p>

      {/* Consent gate */}
      {gate && (
        <div className="fixed inset-0 z-[9700] flex items-center justify-center overflow-y-auto p-4" style={{ backgroundColor: 'rgba(3,7,12,0.85)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) setGate(false); }}>
          <div className="my-4 w-full max-w-[560px] rounded-xl border p-5 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(0,229,160,0.5)' }}>
            <div className="mb-2 text-[15px] font-bold text-white">Enable Auto Hedge</div>
            <p className="mb-2 rounded border px-3 py-2 text-[9px] leading-relaxed" style={{ borderColor: 'rgba(255,179,0,0.3)', backgroundColor: 'rgba(255,179,0,0.05)', color: 'rgba(255,213,120,0.9)' }}>
              {HEDGE_AUTO_DISCLAIMER}
            </p>
            <div className="mb-2 rounded border p-2 text-[9px] text-white/55" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              You are confirming these limits: basket target <b className="text-white">${params.basketTargetUsd}</b> · max basket loss <b className="text-white">${params.maxBasketLossUsd}</b> ·
              engine daily loss stop <b className="text-white">${params.dailyLossLimitUsd}</b> · max hedge instruments <b className="text-white">{params.maxHedgeInstruments}</b> ·
              hedge lots cap <b className="text-white">{params.maxLotMult}× primary</b> · min correlation <b className="text-white">{params.minCorrelation}</b>. Change them in Risk settings first if needed.
            </div>
            <p className="mb-1 text-[10px] text-white/55">Type <b className="text-white">I ACCEPT HEDGE RISK</b> to record consent:</p>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="I ACCEPT HEDGE RISK"
              className="mb-3 w-full rounded bg-white/[0.06] px-2 py-1.5 text-[11px] text-white outline-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setGate(false)} className="rounded px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
              <button disabled={typed.trim().toUpperCase() !== 'I ACCEPT HEDGE RISK'}
                onClick={() => {
                  recordHedgeAutoConsent(typed.trim(), params, accountId);
                  hedgeAutoLog('consent', `Auto Hedge consent recorded (targets $${params.basketTargetUsd}/${params.basketMaxTargetUsd}, max loss $${params.maxBasketLossUsd}, daily $${params.dailyLossLimitUsd})`);
                  setConsented(true); setGate(false); setTyped('');
                  setHedgeAutoOn(true); setOn(true);
                  say('Consent recorded — Auto Hedge is ON.');
                }}
                className="rounded px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: 'linear-gradient(180deg,#00E5A0,#00B87F)' }}>
                I ACCEPT — enable Auto Hedge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
