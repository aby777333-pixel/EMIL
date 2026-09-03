'use client';

// ═══════════════════════════════════════════════════════════════
// Risk module (enhancement prompt §15 Risk Dashboard + §14 Position
// Sizer). Modular overlay — lazy-loaded, entitlement-gated (risk_tools),
// display-only: it never places, modifies or closes anything. Every number
// uses the backend's own P&L math (contract_size, JPY adjustment) and the
// get_account_summary RPC; gaps (signed out, no SL) are flagged honestly.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { X, ShieldAlert, Calculator, RefreshCw, Activity } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { createClient } from '@/lib/supabase/client';
import { orderService } from '@/lib/trading/order-service';
import { getOhlcvBuilder } from '@/lib/nexus/market-data-bridge';
import {
  getInstrumentSpecs, assessPositionRisk, currencyExposure, periodPnl,
  pairCorrelations, computeLotSize, atrFromBars,
  type InstrumentSpec, type PositionRisk,
} from '@/lib/insights/risk';
import { loadGovernorLimits } from '@/lib/trading/risk-governor';
import { loadProtectionSettings } from '@/lib/trading/protection';

type Tab = 'dashboard' | 'sizer' | 'stress';

interface AccountSummary {
  balance: number; equity: number; margin_used: number; free_margin: number;
  margin_level_pct: number; floating_pnl: number; open_positions_count: number;
}

const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pnlColor = (v: number) => (v > 0 ? '#00C27A' : v < 0 ? '#FF5252' : 'rgba(255,255,255,0.6)');

export default function RiskPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const prices = useTradingStore((s) => s.prices);
  const activeAccountId = useTradingStore((s) => s.activeAccountId);
  const builder = getOhlcvBuilder();

  const [specs, setSpecs] = useState<Record<string, InstrumentSpec>>({});
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [leverage, setLeverage] = useState<number | null>(null);
  const [risks, setRisks] = useState<PositionRisk[]>([]);
  const [pnl, setPnl] = useState<ReturnType<typeof periodPnl> | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'signed-out'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const sp = await getInstrumentSpecs();
      if (!live) return;
      setSpecs(sp);
      if (!activeAccountId) { setLoadState('signed-out'); return; }
      try {
        const [sum, positions, closed, acct] = await Promise.all([
          orderService.getAccountSummary(activeAccountId),
          orderService.getOpenPositions(activeAccountId),
          orderService.getTradeHistory(activeAccountId, 200),
          createClient().from('trading_accounts').select('leverage').eq('id', activeAccountId).single(),
        ]);
        if (!live) return;
        const lev = acct.data?.leverage ? Number(acct.data.leverage) : null;
        setLeverage(lev);
        setSummary((sum as { success?: boolean } & AccountSummary)?.success !== false ? (sum as AccountSummary) : null);
        setRisks(assessPositionRisk(positions ?? [], sp, lev));
        setPnl(periodPnl(closed ?? []));
        setLoadState('ready');
      } catch {
        if (live) setLoadState('signed-out');
      }
    })();
    return () => { live = false; };
  }, [activeAccountId, reloadKey]);

  const exposure = useMemo(() => currencyExposure(risks, specs), [risks, specs]);
  const correlations = useMemo(
    () => pairCorrelations(risks.map((r) => r.symbol), builder).slice(0, 6),
    [risks, builder]
  );
  const boundedRisk = risks.filter((r) => r.riskAtSl != null && r.riskAtSl > 0).reduce((s, r) => s + (r.riskAtSl ?? 0), 0);
  const noSlCount = risks.filter((r) => r.riskAtSl == null).length;

  // ── Sizer state ──
  const [sizerSymbol, setSizerSymbol] = useState(activeSymbol);
  const [riskMode, setRiskMode] = useState<'pct' | 'fixed'>('pct');
  const [riskPct, setRiskPct] = useState('1');
  const [riskFixed, setRiskFixed] = useState('100');
  const [entryStr, setEntryStr] = useState('');
  const [slStr, setSlStr] = useState('');

  const liveMid = prices[sizerSymbol] ? (prices[sizerSymbol].bid + prices[sizerSymbol].ask) / 2 : null;
  const atr = useMemo(() => atrFromBars(builder, sizerSymbol), [builder, sizerSymbol]);

  const entry = entryStr !== '' ? Number(entryStr) : liveMid ?? 0;
  const sl = slStr !== '' ? Number(slStr) : 0;
  const riskAmount = riskMode === 'pct'
    ? (summary ? (summary.equity * (Number(riskPct) || 0)) / 100 : 0)
    : Number(riskFixed) || 0;
  const sizerSpec = specs[sizerSymbol];
  const sizerResult = sizerSpec && entry > 0 && sl > 0 && riskAmount > 0
    ? computeLotSize({
        riskAmount, entry, sl, spec: sizerSpec,
        equity: summary?.equity ?? null, freeMargin: summary?.free_margin ?? null, leverage,
      })
    : null;

  const suggestAtrSl = () => {
    if (atr == null || entry <= 0) return;
    // Direction from SL side is unknown before entry — suggest below for
    // (assumed) long; the trader can flip it. 1.5×ATR, the NEXUS default.
    const suggested = entry - 1.5 * atr;
    setSlStr(String(Number(suggested.toFixed(5))));
  };

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onMouseDown={onClose}>
      <div
        className="flex max-h-[88vh] w-[820px] max-w-[96vw] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[13px] font-bold text-white">Risk Tools</div>
            <div className="text-[10px] text-white/40">Same P&amp;L math the execution backend uses · display-only, never trades</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setReloadKey((k) => k + 1)} title="Refresh" className="text-white/40 hover:text-white"><RefreshCw size={13} /></button>
            <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
          </div>
        </div>

        <div className="flex gap-0.5 border-b px-2 pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {([['dashboard', 'Risk Dashboard', ShieldAlert], ['sizer', 'Position Sizer', Calculator], ['stress', 'Stress & Rules', Activity]] as [Tab, string, typeof ShieldAlert][]).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 rounded-t px-3 py-1.5 text-[11px] font-medium transition-colors"
              style={{ backgroundColor: tab === t ? 'rgba(41,171,226,0.12)' : 'transparent', color: tab === t ? '#0091D5' : 'rgba(255,255,255,0.45)' }}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-[11px]">
          {tab === 'dashboard' && (
            loadState === 'loading' ? (
              <div className="py-8 text-center text-white/35">Loading account data…</div>
            ) : loadState === 'signed-out' ? (
              <div className="py-8 text-center text-white/35">
                Sign in with a trading account to see the risk dashboard — it reads your real balance, positions and history, so there is nothing honest to show without them.
              </div>
            ) : (
              <div>
                {/* Account strip */}
                {summary && (
                  <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {([
                      ['Balance', fmt(summary.balance), 'rgba(255,255,255,0.85)'],
                      ['Equity', fmt(summary.equity), 'rgba(255,255,255,0.85)'],
                      ['Floating', fmt(summary.floating_pnl), pnlColor(summary.floating_pnl)],
                      ['Margin used', fmt(summary.margin_used), 'rgba(255,255,255,0.85)'],
                      ['Free margin', fmt(summary.free_margin), 'rgba(255,255,255,0.85)'],
                      ['Margin level', summary.margin_used > 0 ? `${fmt(summary.margin_level_pct)}%` : '—', summary.margin_level_pct > 0 && summary.margin_level_pct < 150 ? '#FF5252' : 'rgba(255,255,255,0.85)'],
                    ] as [string, string, string][]).map(([k, v, c]) => (
                      <div key={k} className="rounded-md border px-2 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                        <div className="text-[8.5px] uppercase tracking-wide text-white/35">{k}</div>
                        <div className="font-mono text-[12px] font-bold" style={{ color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Open risk */}
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Open risk ({risks.length} position{risks.length === 1 ? '' : 's'})</div>
                {risks.length === 0 ? (
                  <div className="mb-4 py-3 text-white/35">No open positions — no open risk.</div>
                ) : (
                  <div className="mb-2">
                    {risks.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 border-t border-white/[0.04] py-1.5 font-mono text-[10px]">
                        <span className="w-16 font-bold text-white">{r.symbol}</span>
                        <span className="w-9" style={{ color: r.direction === 'BUY' ? '#00C27A' : '#FF5252' }}>{r.direction}</span>
                        <span className="w-12 text-white/60">{r.size.toFixed(2)}</span>
                        <span className="w-24 text-white/45">@ {r.openPrice}</span>
                        <span className="w-20 text-right" style={{ color: pnlColor(r.floatingPnl) }}>{fmt(r.floatingPnl)}</span>
                        <span className="flex-1 text-right">
                          {r.riskAtSl == null ? (
                            <span className="font-bold" style={{ color: '#FF5252' }}>NO SL — unbounded</span>
                          ) : r.riskAtSl <= 0 ? (
                            <span style={{ color: '#00C27A' }}>SL locks in {fmt(-r.riskAtSl)}</span>
                          ) : (
                            <span className="text-white/75">
                              risk {fmt(r.riskAtSl)}{summary && summary.equity > 0 ? ` (${((r.riskAtSl / summary.equity) * 100).toFixed(1)}% eq)` : ''}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-end gap-4 border-t border-white/[0.08] pt-1.5 font-mono text-[10px]">
                      <span className="text-white/45">Total bounded risk: <b className="text-white">{fmt(boundedRisk)}</b>{summary && summary.equity > 0 ? ` (${((boundedRisk / summary.equity) * 100).toFixed(1)}% of equity)` : ''}</span>
                      {noSlCount > 0 && <span className="font-bold" style={{ color: '#FF5252' }}>{noSlCount} position(s) unbounded</span>}
                    </div>
                  </div>
                )}

                {/* Exposure + P&L row */}
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Net exposure (lots)</div>
                    {exposure.length === 0 ? <div className="text-white/35">None.</div> : (
                      <div className="flex flex-wrap gap-1.5">
                        {exposure.map((e) => (
                          <span key={e.bucket} className="rounded px-2 py-1 font-mono text-[10px]" style={{
                            backgroundColor: e.netLots > 0 ? 'rgba(0,194,122,0.12)' : 'rgba(255,82,82,0.12)',
                            color: e.netLots > 0 ? '#00C27A' : '#FF5252',
                          }}>
                            {e.bucket} {e.netLots > 0 ? '+' : ''}{e.netLots.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Realized P&amp;L (closed trades)</div>
                    {pnl && (
                      <div className="font-mono text-[10px]">
                        <div className="flex justify-between border-t border-white/[0.04] py-1"><span className="text-white/45">Today</span><span style={{ color: pnlColor(pnl.today) }}>{fmt(pnl.today)}</span></div>
                        <div className="flex justify-between border-t border-white/[0.04] py-1"><span className="text-white/45">Last 7 days</span><span style={{ color: pnlColor(pnl.last7d) }}>{fmt(pnl.last7d)}</span></div>
                        <div className="flex justify-between border-t border-white/[0.04] py-1"><span className="text-white/45">Last 30 days ({pnl.counted} trades)</span><span style={{ color: pnlColor(pnl.last30d) }}>{fmt(pnl.last30d)}</span></div>
                        <div className="flex justify-between border-t border-white/[0.04] py-1"><span className="text-white/45">Commission + swap (30d)</span><span className="text-white/60">{fmt(pnl.commission + pnl.swap)}</span></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Correlation */}
                {correlations.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Correlation between open-position symbols (H1 log returns)</div>
                    {correlations.map((c) => (
                      <div key={`${c.a}-${c.b}`} className="flex items-center gap-2 border-t border-white/[0.04] py-1 font-mono text-[10px]">
                        <span className="w-36 text-white/70">{c.a} ↔ {c.b}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.abs(c.corr) * 100}%`, backgroundColor: Math.abs(c.corr) > 0.7 ? '#FF9800' : '#0091D5' }} />
                        </div>
                        <span className="w-14 text-right" style={{ color: Math.abs(c.corr) > 0.7 ? '#FF9800' : 'rgba(255,255,255,0.6)' }}>{c.corr.toFixed(2)}</span>
                      </div>
                    ))}
                    <p className="mt-1 text-[9px] text-white/30">|corr| &gt; 0.70 (orange) means those positions tend to move together — effectively one bigger position.</p>
                  </div>
                )}
              </div>
            )
          )}

          {tab === 'sizer' && (
            <div className="max-w-[540px]">
              <div className="mb-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[9px] uppercase tracking-wide text-white/40">Symbol</span>
                  <select value={sizerSymbol} onChange={(e) => { setSizerSymbol(e.target.value); setEntryStr(''); setSlStr(''); }}
                    className="w-full rounded border bg-[#060D16] px-2 py-1.5 font-mono text-[11px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                    {Object.keys(prices).sort().map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9px] uppercase tracking-wide text-white/40">Risk basis</span>
                  <div className="flex gap-1">
                    <select value={riskMode} onChange={(e) => setRiskMode(e.target.value as 'pct' | 'fixed')}
                      className="rounded border bg-[#060D16] px-2 py-1.5 text-[11px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                      <option value="pct">% of equity</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                    {riskMode === 'pct' ? (
                      <input value={riskPct} onChange={(e) => setRiskPct(e.target.value)} inputMode="decimal"
                        className="w-full rounded border bg-[#060D16] px-2 py-1.5 text-right font-mono text-[11px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                    ) : (
                      <input value={riskFixed} onChange={(e) => setRiskFixed(e.target.value)} inputMode="decimal"
                        className="w-full rounded border bg-[#060D16] px-2 py-1.5 text-right font-mono text-[11px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                    )}
                  </div>
                  {riskMode === 'pct' && !summary && (
                    <span className="mt-1 block text-[9px]" style={{ color: '#FF9800' }}>No account summary (signed out?) — use Fixed amount.</span>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9px] uppercase tracking-wide text-white/40">Entry price</span>
                  <input value={entryStr} onChange={(e) => setEntryStr(e.target.value)} inputMode="decimal"
                    placeholder={liveMid != null ? `${liveMid} (live)` : 'no live price'}
                    className="w-full rounded border bg-[#060D16] px-2 py-1.5 text-right font-mono text-[11px] text-white outline-none placeholder:text-white/25" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9px] uppercase tracking-wide text-white/40">Stop-loss price</span>
                  <div className="flex gap-1">
                    <input value={slStr} onChange={(e) => setSlStr(e.target.value)} inputMode="decimal" placeholder="required"
                      className="w-full rounded border bg-[#060D16] px-2 py-1.5 text-right font-mono text-[11px] text-white outline-none placeholder:text-white/25" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                    <button onClick={suggestAtrSl} disabled={atr == null}
                      title={atr != null ? `1.5 × ATR(14) = ${(1.5 * atr).toFixed(5)} below entry (long assumption — flip for shorts)` : 'ATR needs 15+ bars'}
                      className="shrink-0 rounded px-2 text-[9px] font-bold disabled:opacity-30" style={{ backgroundColor: 'rgba(0,145,213,0.15)', color: '#0091D5', border: '1px solid rgba(0,145,213,0.3)' }}>
                      ATR
                    </button>
                  </div>
                </label>
              </div>

              {sizerResult == null ? (
                <div className="rounded-md border p-3 text-white/40" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  Enter a stop-loss price (and risk) to compute the lot size. Formula: lots = risk ÷ (SL distance × per-unit value) — the exact P&amp;L math this platform&apos;s backend uses.
                </div>
              ) : 'error' in sizerResult ? (
                <div className="rounded-md border p-3" style={{ borderColor: 'rgba(255,82,82,0.35)', color: '#FF5252' }}>{sizerResult.error}</div>
              ) : (
                <div className="rounded-md border p-3" style={{ borderColor: 'rgba(0,145,213,0.3)', backgroundColor: 'rgba(0,145,213,0.05)' }}>
                  <div className="mb-2 font-mono text-[18px] font-bold text-white">
                    {sizerResult.lots.toFixed(2)} <span className="text-[11px] font-normal text-white/50">lots</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] text-white/60">
                    <span>Actual risk at SL: <b className="text-white/85">{fmt(sizerResult.riskAmount)}</b></span>
                    <span>SL distance: <b className="text-white/85">{sizerResult.slDistance}</b></span>
                    <span>Value / unit / lot: <b className="text-white/85">{fmt(sizerResult.perUnitValue)}</b></span>
                    <span>Margin est.: <b className="text-white/85">{sizerResult.marginEstimate != null ? fmt(sizerResult.marginEstimate) : '— (leverage unknown)'}</b></span>
                  </div>
                  {sizerResult.warnings.map((w, i) => (
                    <div key={i} className="mt-2 text-[10px]" style={{ color: '#FF9800' }}>⚠ {w}</div>
                  ))}
                  <p className="mt-2 text-[9px] leading-snug text-white/30">
                    Lots are rounded DOWN to the 0.01 step so actual risk never exceeds what you asked. Enter this size manually in QuickTrade or the order panel — the sizer never places trades.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'stress' && (() => {
            const gov = loadGovernorLimits();
            const shield = loadProtectionSettings(activeAccountId);
            const rulesOn = Object.values(shield as unknown as Record<string, { on?: boolean }>).filter((r) => r && r.on).length;
            const equity = summary?.equity ?? 0;
            const floating = summary?.floating_pnl ?? 0;
            const openLots = risks.reduce((s, r) => s + (r.size ?? 0), 0);
            // What-if projections (estimates; real tails are larger on gaps/slippage).
            const ifAllStops = equity - boundedRisk;                 // planned worst on bounded positions
            const ifVolDouble = boundedRisk * 2;                     // stops ~2× wider → ~2× planned loss
            const ifAdverse5 = equity * 0.05;                        // rough 5% adverse account move
            const row = (k: string, v: string, c?: string) => (
              <div className="flex items-center justify-between border-b py-1.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-white/45">{k}</span><span className="font-mono" style={{ color: c ?? 'rgba(255,255,255,0.85)' }}>{v}</span>
              </div>
            );
            return (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40">Stress scenarios (estimates)</div>
                  {row('Equity now', `$${fmt(equity)}`)}
                  {row('Floating P&L', `${floating >= 0 ? '+' : ''}$${fmt(floating)}`, pnlColor(floating))}
                  {row('Open lots · positions', `${openLots.toFixed(2)} · ${risks.length}`)}
                  {row('Planned worst (all stops hit)', `−$${fmt(boundedRisk)}${noSlCount ? ` + ${noSlCount} unbounded` : ''}`, '#FF5252')}
                  {row('Equity after all stops', `$${fmt(ifAllStops)}`, ifAllStops < equity * 0.9 ? '#FFB300' : undefined)}
                  {row('If volatility doubles', `≈ −$${fmt(ifVolDouble)} planned`, '#FFB300')}
                  {row('If account −5%', `−$${fmt(ifAdverse5)} → governor blocks new risk`, '#FFB300')}
                  <p className="mt-1.5 text-[8px] leading-snug text-white/30">Estimates from your open positions and stops. Real tails are larger on gaps, slippage and unbounded (no-SL) positions.</p>
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40">Active hard limits</div>
                  {row('Governor · max total lots', `${gov.maxTotalLots}`)}
                  {row('Governor · max automated lots', `${gov.maxAutomatedLots}`)}
                  {row('Governor · max per symbol', `${gov.maxPerSymbolLots}`)}
                  {row('Governor · max positions', `${gov.maxOpenPositions}`)}
                  {row('Governor · daily loss cap', `${gov.dailyLossLimitPct}% ($${fmt(equity * gov.dailyLossLimitPct / 100)})`, '#FF5252')}
                  {row('Shield rules armed', `${rulesOn}`, rulesOn > 0 ? '#00C27A' : '#FFB300')}
                  {row('Unprotected positions', `${noSlCount}`, noSlCount > 0 ? '#FF5252' : '#00C27A')}
                  <p className="mt-1.5 text-[8px] leading-snug text-white/30">The account Risk Governor caps every engine; Shield rules gate manual + automated orders. Edit governor limits on the Hedge Trade page, Shield rules from the toolbar.</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
