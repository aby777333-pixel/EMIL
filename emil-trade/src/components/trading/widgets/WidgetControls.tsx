'use client';

// Shared widget controls: Trade · Auto Hedge (ON/OFF) · Exit All Trades.
// Present on every actionable widget. Auto Hedge is ALWAYS a toggle and
// never activates silently — first enable shows the disclaimer + typed
// consent. Trade opens a compact ticket prefilled with widget context,
// every field editable, routed through the normal order path (Shield →
// Guardian → account Risk Governor). Exit All shows a summary before
// closing anything and asks for confirmation.

import { useMemo, useState } from 'react';
import { Zap, ShieldHalf, OctagonX } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import { getPipSize } from '@/lib/trading/ticket-math';
import {
  setHedgeAutoOn, isHedgeAutoConsented, recordHedgeAutoConsent,
  loadHedgeAutoParams, hedgeAutoLog, HEDGE_AUTO_DISCLAIMER,
  addEligibleSymbol, removeEligibleSymbol, setHedgeScope, symbolEffectivelyHedged, loadHedgeScope,
  loadEligibleSymbols, setEligibleSymbols,
} from '@/lib/trading/hedge-auto';

function assetClassOf(sym: string): string {
  if (/^XA[UG]/.test(sym)) return 'Metals';
  if (/(USOIL|UKOIL|NATGAS|WTI|BRENT|OIL|NGAS)/i.test(sym)) return 'Energy';
  if (/(US30|NAS100|SPX500|GER40|UK100|JP225|DAX|DOW|NAS|SPX|US500|EU50|HK50|AUS200)/i.test(sym)) return 'Indices';
  if (/^(BTC|ETH|XRP|LTC|SOL|DOGE|ADA|BNB|DOT)/.test(sym)) return 'Crypto';
  return 'Forex';
}
const CLASS_ORDER = ['Forex', 'Metals', 'Energy', 'Indices', 'Crypto'];

export interface TradeContext {
  symbol: string;
  direction?: 'BUY' | 'SELL';
  entry?: number;
  stop?: number;
  target?: number;
  lots?: number;
  source: string;       // widget name for the order comment/audit
}

export default function WidgetControls({ ctx, accent }: { ctx: TradeContext; accent: string }) {
  const { activeAccountId, prices, positions, triggerRefresh } = useTradingStore();
  const [showTicket, setShowTicket] = useState(false);
  const [showHedgeGate, setShowHedgeGate] = useState(false);
  const [showScope, setShowScope] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [typed, setTyped] = useState('');
  // The quick toggle always arms THIS instrument; the Scope picker covers
  // arbitrary instrument sets or account-wide.
  const scope: 'instrument' | 'account' = 'instrument';
  const [hedgeOn, setHedgeOnState] = useState(symbolEffectivelyHedged(ctx.symbol));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };

  const armHedge = (chosen: 'instrument' | 'account') => {
    setHedgeAutoOn(true);
    if (chosen === 'account') { setHedgeScope('account'); }
    else { setHedgeScope('selective'); addEligibleSymbol(ctx.symbol); }
    setHedgeOnState(true);
    hedgeAutoLog('toggle', `Auto Hedge ON (${chosen === 'account' ? 'account-wide' : ctx.symbol + ' only'}) from ${ctx.source} widget`);
    say(chosen === 'account' ? 'Auto Hedge ON — account-wide (all eligible orders). Keep a Hedge Trade window open.' : `Auto Hedge ON for ${ctx.symbol} only. Keep a Hedge Trade window open.`);
  };

  const toggleHedge = () => {
    if (hedgeOn) {
      // Turn OFF for this instrument only — never kills coverage of others.
      if (loadHedgeScope() === 'account') { setHedgeScope('selective'); }
      removeEligibleSymbol(ctx.symbol);
      setHedgeOnState(false);
      hedgeAutoLog('toggle', `Auto Hedge OFF for ${ctx.symbol} from ${ctx.source} widget`);
      say(`Auto Hedge OFF for ${ctx.symbol}.`);
      return;
    }
    if (!isHedgeAutoConsented()) { setShowHedgeGate(true); return; }
    armHedge(scope);
  };

  const btn = 'flex items-center gap-1 rounded px-2 py-1 text-[9px] font-bold transition-all hover:brightness-125';

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t pt-1.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <button onClick={() => setShowTicket(true)} className={btn} style={{ color: '#000', backgroundColor: accent }} title={`Open a trade ticket for ${ctx.symbol}`}>
        <Zap size={10} /> Trade
      </button>
      <button onClick={toggleHedge} className={btn}
        style={{ color: hedgeOn ? '#00E5A0' : 'rgba(255,255,255,0.5)', border: `1px solid ${hedgeOn ? 'rgba(0,229,160,0.5)' : 'rgba(255,255,255,0.15)'}`, backgroundColor: hedgeOn ? 'rgba(0,229,160,0.12)' : 'transparent' }}
        title="Auto Hedge is a toggle and never activates silently. Applies to THIS instrument only unless you pick account-wide. First enable shows the disclaimer + typed consent.">
        <ShieldHalf size={10} /> Auto Hedge {hedgeOn ? 'ON' : 'OFF'}
      </button>
      <button onClick={() => setShowScope(true)} className="flex items-center gap-1 rounded px-1.5 py-1 text-[8px] font-bold text-white/55 transition-all hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        title="Choose which instruments Auto Hedge covers — any pairs, metals, oil, indices or crypto, or account-wide.">
        Scope: {loadHedgeScope() === 'account' ? 'all' : loadEligibleSymbols().length ? `${loadEligibleSymbols().length} sym` : 'none'} ▾
      </button>
      <button onClick={() => setShowExit(true)} className={btn} style={{ color: '#FF5252', border: '1px solid rgba(255,82,82,0.4)' }} title="Review open trades, then exit">
        <OctagonX size={10} /> Exit All
      </button>
      {msg && <span className="text-[8px] text-white/45">{msg}</span>}

      {showTicket && <TradeTicket ctx={ctx} accent={accent} accountId={activeAccountId} prices={prices}
        onClose={() => setShowTicket(false)} onDone={() => { setShowTicket(false); triggerRefresh(); }} say={say} busy={busy} setBusy={setBusy} />}

      {showScope && <ScopePicker prices={prices} accountId={activeAccountId} source={ctx.source}
        onClose={() => setShowScope(false)} onApplied={() => { setShowScope(false); setHedgeOnState(symbolEffectivelyHedged(ctx.symbol)); }} say={say} />}

      {showHedgeGate && (
        <Gate title={`Enable Auto Hedge — ${ctx.symbol} only`} accent="#00E5A0"
          onClose={() => { setShowHedgeGate(false); setTyped(''); }}
          body={<>
            <p className="mb-2 rounded border px-3 py-2 text-[9px] leading-relaxed" style={{ borderColor: 'rgba(255,179,0,0.3)', backgroundColor: 'rgba(255,179,0,0.05)', color: 'rgba(255,213,120,0.9)' }}>
              Auto Hedge may open, modify, reduce, or close related positions to manage exposure. Hedging can increase margin use,
              transaction costs, swap, drawdown, and total risk. Profit or recovery is not guaranteed. Review the hedge plan and risk
              limits before enabling. {HEDGE_AUTO_DISCLAIMER}
            </p>
            <p className="mb-2 text-[9px] font-bold" style={{ color: '#00E5A0' }}>
              Scope: {ctx.symbol} ONLY — other instruments are not touched. Use the “Scope” button to cover more instruments (metals, oil, indices, crypto) or the whole account.
            </p>
            <div className="mb-2 rounded border p-2 text-[9px] text-white/55" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              Active limits (from the capital-based hedge table): max hedge lots <b className="text-white">{loadHedgeAutoParams().maxHedgeLots}</b> ·
              max basket loss <b className="text-white">${loadHedgeAutoParams().maxBasketLossUsd}</b> · max stages <b className="text-white">{loadHedgeAutoParams().maxLevels}</b> ·
              daily loss stop <b className="text-white">${loadHedgeAutoParams().dailyLossLimitUsd}</b>. Edit them on the Hedge Trade page.
            </div>
            <p className="mb-1 text-[10px] text-white/55">Type <b className="text-white">I ACCEPT HEDGE RISK</b> to record consent:</p>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="I ACCEPT HEDGE RISK"
              className="w-full rounded bg-white/[0.06] px-2 py-1.5 text-[11px] text-white outline-none" />
          </>}
          confirmLabel="I ACCEPT — enable Auto Hedge"
          confirmDisabled={typed.trim().toUpperCase() !== 'I ACCEPT HEDGE RISK'}
          onConfirm={() => {
            recordHedgeAutoConsent(typed.trim(), loadHedgeAutoParams(), activeAccountId);
            hedgeAutoLog('consent', `Auto Hedge consent recorded from ${ctx.source} widget (scope: ${scope})`);
            armHedge(scope);
            setShowHedgeGate(false); setTyped('');
          }} />
      )}

      {showExit && <ExitAll accountId={activeAccountId} positions={positions} prices={prices} symbol={ctx.symbol}
        onClose={() => setShowExit(false)} onDone={() => { setShowExit(false); triggerRefresh(); }} say={say} />}
    </div>
  );
}

// ── Compact trade ticket ────────────────────────────────────────

function TradeTicket({ ctx, accent, accountId, prices, onClose, onDone, say, busy, setBusy }: {
  ctx: TradeContext; accent: string; accountId: string | null; prices: Record<string, { bid?: number; ask?: number } | undefined>;
  onClose: () => void; onDone: () => void; say: (m: string) => void; busy: boolean; setBusy: (b: boolean) => void;
}) {
  const t = prices[ctx.symbol];
  const mid = t?.bid != null && t?.ask != null ? (t.bid + t.ask) / 2 : (ctx.entry ?? 0);
  const [direction, setDirection] = useState<'BUY' | 'SELL'>(ctx.direction ?? 'BUY');
  const [lots, setLots] = useState(String(ctx.lots ?? 0.01));
  const [sl, setSl] = useState(ctx.stop != null ? String(ctx.stop) : '');
  const [tp, setTp] = useState(ctx.target != null ? String(ctx.target) : '');

  const place = async () => {
    if (!accountId) { say('Select a trading account first'); return; }
    const tick = prices[ctx.symbol];
    const fill = direction === 'BUY' ? tick?.ask : tick?.bid;
    if (fill == null) { say('No live quote — refusing to trade stale data'); return; }
    setBusy(true);
    try {
      await orderService.placeMarketOrder({
        accountId, symbol: ctx.symbol, direction, size: Math.max(0.01, parseFloat(lots) || 0.01),
        sl: sl ? parseFloat(sl) : undefined, tp: tp ? parseFloat(tp) : undefined,
        fillPrice: Number(fill), comment: `Widget:${ctx.source}`,
      });
      say(`${direction} ${lots} ${ctx.symbol} placed.`);
      onDone();
    } catch (e) {
      say(`Blocked/failed: ${e instanceof Error ? e.message : 'unknown'}`);
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} accent={accent}>
      <div className="mb-2 text-[13px] font-bold text-white">Trade ticket · {ctx.symbol}</div>
      <div className="mb-2 flex gap-1.5">
        {(['BUY', 'SELL'] as const).map((d) => (
          <button key={d} onClick={() => setDirection(d)} className="flex-1 rounded py-1.5 text-[11px] font-bold transition-all"
            style={{ backgroundColor: direction === d ? (d === 'BUY' ? 'rgba(0,229,160,0.2)' : 'rgba(255,82,82,0.2)') : 'rgba(255,255,255,0.04)', color: d === 'BUY' ? '#00E5A0' : '#FF5252', border: `1px solid ${direction === d ? (d === 'BUY' ? 'rgba(0,229,160,0.5)' : 'rgba(255,82,82,0.5)') : 'rgba(255,255,255,0.1)'}` }}>
            {d}
          </button>
        ))}
      </div>
      <p className="mb-2 text-[9px] text-white/40">Live mid ~ {mid ? mid.toFixed(getPipSize(ctx.symbol) < 0.01 ? 5 : 2) : '—'} · source: {ctx.source}. Every field is editable; the order passes Shield, Guardian and the Risk Governor.</p>
      {([['Lots', lots, setLots], ['Stop loss', sl, setSl], ['Take profit', tp, setTp]] as const).map(([label, val, set]) => (
        <label key={label} className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-white/55">
          <span>{label}</span>
          <input value={val} onChange={(e) => set(e.target.value)} placeholder={label === 'Lots' ? '0.01' : 'optional'}
            className="w-32 rounded bg-white/[0.06] px-2 py-1 text-right font-mono text-[11px] text-white outline-none" />
        </label>
      ))}
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
        <button onClick={place} disabled={busy} className="rounded px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-40"
          style={{ backgroundColor: direction === 'BUY' ? '#00E5A0' : '#FF5252' }}>
          {busy ? 'Placing…' : `Confirm ${direction}`}
        </button>
      </div>
    </Modal>
  );
}

// ── Exit All (summary + confirm) ────────────────────────────────

function ExitAll({ accountId, positions, prices, symbol, onClose, onDone, say }: {
  accountId: string | null;
  positions: Array<{ id: string; symbol: string; direction: string; size: number; status: string; current_price?: number | null; open_price: number; unrealized_pnl?: number | null; comment?: string | null }>;
  prices: Record<string, { bid?: number; ask?: number } | undefined>;
  symbol: string; onClose: () => void; onDone: () => void; say: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const open = useMemo(() => positions.filter((p) => p.status === 'open'), [positions]);
  const summary = useMemo(() => {
    const net = open.reduce((a, p) => a + Number(p.unrealized_pnl ?? 0), 0);
    const win = open.filter((p) => Number(p.unrealized_pnl ?? 0) >= 0).length;
    const auto = open.filter((p) => /hedgeauto|scanauto|scanner|widget/i.test(String(p.comment ?? ''))).length;
    return { count: open.length, net, win, lose: open.length - win, auto, thisSym: open.filter((p) => p.symbol === symbol).length };
  }, [open, symbol]);

  const close = async (scope: 'all' | 'symbol' | 'auto') => {
    if (!accountId) return;
    setBusy(true);
    const targets = open.filter((p) =>
      scope === 'all' ? true : scope === 'symbol' ? p.symbol === symbol : /hedgeauto|scanauto|scanner|widget/i.test(String(p.comment ?? '')));
    let done = 0;
    for (const p of targets) {
      const t = prices[p.symbol];
      const px = p.direction === 'BUY' ? (t?.bid ?? p.current_price ?? p.open_price) : (t?.ask ?? p.current_price ?? p.open_price);
      try { await orderService.closePosition(p.id, Number(px)); done++; } catch { /* continue */ }
    }
    say(`Closed ${done} of ${targets.length} position(s).`);
    onDone();
  };

  return (
    <Modal onClose={onClose} accent="#FF5252">
      <div className="mb-2 text-[13px] font-bold text-white">Exit trades — review first</div>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded border p-2 text-[10px]" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
        <span>Open trades: <b className="text-white">{summary.count}</b></span>
        <span>On {symbol}: <b className="text-white">{summary.thisSym}</b></span>
        <span>Profitable: <b style={{ color: '#00E5A0' }}>{summary.win}</b></span>
        <span>Losing: <b style={{ color: '#FF5252' }}>{summary.lose}</b></span>
        <span>Automated: <b className="text-white">{summary.auto}</b></span>
        <span>Net now: <b style={{ color: summary.net >= 0 ? '#00E5A0' : '#FF5252' }}>{summary.net >= 0 ? '+' : ''}${summary.net.toFixed(2)}</b></span>
      </div>
      {summary.count === 0 ? (
        <p className="text-[10px] text-white/45">No open positions to close.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <button disabled={busy || summary.thisSym === 0} onClick={() => close('symbol')} className="rounded py-2 text-[11px] font-bold disabled:opacity-40" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}>
            Exit all {symbol} trades ({summary.thisSym})
          </button>
          <button disabled={busy || summary.auto === 0} onClick={() => close('auto')} className="rounded py-2 text-[11px] font-bold disabled:opacity-40" style={{ backgroundColor: 'rgba(255,179,0,0.12)', color: '#FFB300', border: '1px solid rgba(255,179,0,0.35)' }}>
            Exit all automated trades ({summary.auto})
          </button>
          <button disabled={busy} onClick={() => close('all')} className="rounded py-2 text-[11px] font-bold text-black disabled:opacity-40" style={{ background: 'linear-gradient(180deg,#FF8A80,#FF5252)' }}>
            {busy ? 'Closing…' : `Exit EVERY trade in the account (${summary.count})`}
          </button>
        </div>
      )}
      <button onClick={onClose} className="mt-2 w-full rounded py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
    </Modal>
  );
}

// ── Auto Hedge scope picker — choose any instruments or account-wide ──

function ScopePicker({ prices, accountId, source, onClose, onApplied, say }: {
  prices: Record<string, { bid?: number; ask?: number } | undefined>;
  accountId: string | null; source: string; onClose: () => void; onApplied: () => void; say: (m: string) => void;
}) {
  const universe = useMemo(() => Object.keys(prices).filter((s) => prices[s]?.bid != null).sort(), [prices]);
  const grouped = useMemo(() => {
    const g: Record<string, string[]> = {};
    for (const s of universe) (g[assetClassOf(s)] ??= []).push(s);
    return g;
  }, [universe]);
  const [accountWide, setAccountWide] = useState(loadHedgeScope() === 'account');
  const [sel, setSel] = useState<Set<string>>(new Set(loadEligibleSymbols()));
  const [typed, setTyped] = useState('');
  const consented = isHedgeAutoConsented();

  const toggleSym = (s: string) => setSel((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const toggleClass = (cls: string, on: boolean) => setSel((prev) => { const n = new Set(prev); for (const s of grouped[cls] ?? []) on ? n.add(s) : n.delete(s); return n; });

  const apply = () => {
    setHedgeAutoOn(accountWide || sel.size > 0);
    if (accountWide) { setHedgeScope('account'); }
    else { setHedgeScope('selective'); setEligibleSymbols([...sel]); }
    if (!consented) recordHedgeAutoConsent(typed.trim(), loadHedgeAutoParams(), accountId);
    hedgeAutoLog(consented ? 'toggle' : 'consent', `Auto Hedge scope set from ${source}: ${accountWide ? 'ACCOUNT-WIDE (all)' : [...sel].join(', ') || 'none'}`);
    say(accountWide ? 'Auto Hedge scope: account-wide (all eligible). Keep a Hedge Trade window open.' : sel.size ? `Auto Hedge covers ${sel.size} instrument(s). Keep a Hedge Trade window open.` : 'Auto Hedge coverage cleared.');
    onApplied();
  };

  const canApply = consented || typed.trim().toUpperCase() === 'I ACCEPT HEDGE RISK';

  return (
    <Modal onClose={onClose} accent="#00E5A0">
      <div className="mb-2 text-[13px] font-bold text-white">Auto Hedge scope</div>
      <p className="mb-2 text-[9px] leading-relaxed text-white/50">Choose exactly which instruments Auto Hedge may monitor and hedge — any FX pairs, metals, energy, indices or crypto — or cover the whole account. It applies only to what you pick here; nothing else is touched.</p>
      <label className="mb-2 flex items-center gap-2 rounded border p-2 text-[10px] font-bold" style={{ borderColor: accountWide ? 'rgba(0,229,160,0.5)' : 'rgba(255,255,255,0.12)', color: accountWide ? '#00E5A0' : 'rgba(255,255,255,0.6)' }}>
        <input type="checkbox" checked={accountWide} onChange={(e) => setAccountWide(e.target.checked)} className="accent-[#00E5A0]" />
        Account-wide — every eligible order (overrides the per-instrument list)
      </label>
      {!accountWide && (
        <div className="mb-2 max-h-52 overflow-y-auto rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.1)', scrollbarWidth: 'thin' }}>
          {CLASS_ORDER.filter((c) => grouped[c]?.length).map((cls) => {
            const syms = grouped[cls]; const allOn = syms.every((s) => sel.has(s));
            return (
              <div key={cls} className="mb-1.5">
                <button onClick={() => toggleClass(cls, !allOn)} className="mb-0.5 text-[8px] font-bold uppercase tracking-wide" style={{ color: allOn ? '#00E5A0' : 'rgba(255,255,255,0.4)' }}>{cls} {allOn ? '✓ all' : `(${syms.length})`}</button>
                <div className="flex flex-wrap gap-1">
                  {syms.map((s) => (
                    <button key={s} onClick={() => toggleSym(s)} className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold transition-all"
                      style={{ backgroundColor: sel.has(s) ? 'rgba(0,229,160,0.18)' : 'rgba(255,255,255,0.04)', color: sel.has(s) ? '#00E5A0' : 'rgba(255,255,255,0.45)', border: `1px solid ${sel.has(s) ? 'rgba(0,229,160,0.45)' : 'rgba(255,255,255,0.1)'}` }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {!universe.length && <p className="text-[9px] text-white/35">No instruments quoting yet.</p>}
        </div>
      )}
      {!accountWide && <p className="mb-2 text-[9px] text-white/40">{sel.size} instrument(s) selected.</p>}
      <p className="mb-2 rounded border px-3 py-2 text-[8px] leading-relaxed" style={{ borderColor: 'rgba(255,179,0,0.3)', backgroundColor: 'rgba(255,179,0,0.05)', color: 'rgba(255,213,120,0.9)' }}>
        Auto Hedge may open, modify, reduce, or close related positions. Hedging can increase margin use, cost, swap, drawdown and total risk. Profit or recovery is not guaranteed.
      </p>
      {!consented && (
        <>
          <p className="mb-1 text-[9px] text-white/55">First activation — type <b className="text-white">I ACCEPT HEDGE RISK</b>:</p>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="I ACCEPT HEDGE RISK" className="mb-2 w-full rounded bg-white/[0.06] px-2 py-1.5 text-[11px] text-white outline-none" />
        </>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
        <button onClick={apply} disabled={!canApply} className="rounded px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-40" style={{ background: 'linear-gradient(180deg,#00E5A0,#00B87F)' }}>
          Apply scope
        </button>
      </div>
    </Modal>
  );
}

// ── Small modal + gate primitives ───────────────────────────────

function Modal({ children, onClose, accent }: { children: React.ReactNode; onClose: () => void; accent: string }) {
  return (
    <div className="fixed inset-0 z-[9800] flex items-center justify-center overflow-y-auto p-4" style={{ backgroundColor: 'rgba(3,7,12,0.85)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="my-4 w-full max-w-[420px] rounded-xl border p-4 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: `${accent}66` }}>
        {children}
      </div>
    </div>
  );
}

function Gate({ title, accent, body, confirmLabel, confirmDisabled, onConfirm, onClose }: {
  title: string; accent: string; body: React.ReactNode; confirmLabel: string; confirmDisabled?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} accent={accent}>
      <div className="mb-2 text-[14px] font-bold text-white">{title}</div>
      {body}
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
        <button onClick={onConfirm} disabled={confirmDisabled} className="rounded px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-40" style={{ background: `linear-gradient(180deg,${accent},${accent}CC)` }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
