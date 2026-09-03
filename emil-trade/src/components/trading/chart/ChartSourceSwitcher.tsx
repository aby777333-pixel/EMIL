'use client';

// Chart source switcher: TradingView live data (default) ⇄ native RAPTOR
// chart. Also the single owner of the EA attach lifecycle so Expert
// Advisors can be added to EITHER chart:
//  - drops on the RAPTOR chart bubble up to this wrapper
//  - on the TradingView tab a transparent overlay catches the drop
//    (the cross-origin iframe would otherwise swallow drag events)
//  - an EAs/Robots menu is shown in the tab bar on the TradingView tab
//    (the RAPTOR tab keeps its own menu inside ChartToolbar)
// Attached EAs persist to ea_instances and render as chips on both tabs.

import { openEmilCockpit } from '@/lib/emil-link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, GripVertical, Star, Zap, Trash2, Info, RotateCcw, Eraser, Settings2, FlaskConical, Grid3x3, ShieldCheck, NotebookPen, FileCode2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Market Insights module — lazy-loaded so the terminal bundle is untouched
// unless the trader actually opens it.
const InsightsPanel = dynamic(() => import('../insights/InsightsPanel'), { ssr: false });
const HedgePanel = dynamic(() => import('../hedge/HedgePanel'), { ssr: false });
const ScannerPanel = dynamic(() => import('../scanner/ScannerPanel'), { ssr: false });
const RiskPanel = dynamic(() => import('../insights/RiskPanel'), { ssr: false });
const JournalPanel = dynamic(() => import('../insights/JournalPanel'), { ssr: false });
import ChartPanel from './ChartPanel';
import TradingViewPanel from './TradingViewPanel';
import { type EAConfig } from './ChartToolbar';
import { useEALibrary } from './useEALibrary';
import { useTradingStore } from '@/stores/trading';
import { createClient } from '@/lib/supabase/client';
import { EARuntime, type EAStats, type EAInfo, type StrategyKind } from '@/lib/trading/ea-engine';
import { orderService } from '@/lib/trading/order-service';
import { defaultProtection, loadTradePrefs, saveTradePrefs } from '@/lib/trading/trade-prefs';
import EAPropertiesModal, { type EAFullSettings, DEFAULT_FULL_SETTINGS } from './EAPropertiesModal';
import StrategyTesterModal from './StrategyTesterModal';
import AlertsMenu from './AlertsMenu';
import WatchlistMenu from './WatchlistMenu';
import TimeframeBar from './TimeframeBar';
import TemplatesMenu from './TemplatesMenu';
import MarketsMenu from './MarketsMenu';
import DomLadder from './DomLadder';
import ProtectionMenu from './ProtectionMenu';
import { calcPipValue, calcMarginRequired, lotsForRiskPct, getTicketDecimals } from '@/lib/trading/ticket-math';
import RaptorScriptMenu from './RaptorScriptMenu';
import HeaderPortal from './HeaderPortal';
import { headerBtnStyle, glowStyle } from './header-theme';
import TrendSignal from './TrendSignal';
import WorkspaceChip from './WorkspaceChip';
import FlightCheck from './FlightCheck';
import TraderChips from './TraderChips';
import EdgeChips from './EdgeChips';
import WidgetHub from '@/components/trading/widgets/WidgetHub';
import CustomEAInfoModal from './CustomEAInfoModal';
import type { CustomEA } from '@/lib/trading/custom-ea';
import { effectiveEngineParams, builtinInputsFor } from '@/lib/trading/ea-params';
import EADisclaimerModal from './EADisclaimerModal';
import { isDisclaimerAccepted, recordDisclaimerAcceptance } from '@/lib/trading/ea-disclaimer';
import { getEntitlements } from '@/lib/trading/entitlements';
import { registerOhlcvBuilder } from '@/lib/nexus/market-data-bridge';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import type { Resolution } from '@/lib/trading/ohlcv-builder';

type ChartSource = 'tradingview' | 'raptor';

interface AttachedEA {
  instanceId: string | null;
  strategyId: string;
  name: string;
  symbol: string;
  strategyKind?: string;
}

export default function ChartSourceSwitcher({
  ohlcvBuilder,
  isLiveData = false,
  onSourceChange,
  sidePanel = null,
}: {
  ohlcvBuilder: OHLCVBuilder | null;
  isLiveData?: boolean;
  onSourceChange?: (source: 'tradingview' | 'raptor') => void;
  // Order/Account/Tools panel — rendered beside the chart, BELOW the shared
  // header + timeframe rows, so header buttons are never masked by it.
  sidePanel?: React.ReactNode;
}) {
  const [source, setSource] = useState<ChartSource>('tradingview');
  const { activeSymbol, prices, activeAccountId, accountSummary, triggerRefresh, setActiveSymbol, oneClickTrading, setOneClickTrading } = useTradingStore();

  // Merged EA library (built-in + uploaded custom) + upload flow for the TV menu.
  const { all: eaList, fileInputRef, handleFile, remove: removeCustom } = useEALibrary();
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const onFileChosen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = await handleFile(file);
    setUploadMsg(res.ok
      ? { ok: true, text: `"${res.name}" converted — drag it onto the chart.` }
      : { ok: false, text: res.error ?? 'Upload failed.' });
    setTimeout(() => setUploadMsg(null), 5000);
  }, [handleFile]);

  useEffect(() => {
    onSourceChange?.(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // NEXUS can request the RAPTOR chart (zone markers can only draw on the
  // native chart — the TradingView embed is a sealed cross-origin iframe).
  // The command palette (§30) uses the same bridge plus a TV counterpart
  // and open-events for the module panels.
  useEffect(() => {
    const onEnsure = () => setSource('raptor');
    const onEnsureTv = () => setSource('tradingview');
    const onOpenInsights = () => setInsightsOpen(true);
    const onOpenRisk = () => setRiskOpen(true);
    const onOpenJournal = () => setJournalOpen(true);
    window.addEventListener('nexus-ensure-raptor', onEnsure);
    window.addEventListener('raptor-ensure-tradingview', onEnsureTv);
    window.addEventListener('raptor-open-insights', onOpenInsights);
    window.addEventListener('raptor-open-risk', onOpenRisk);
    window.addEventListener('raptor-open-journal', onOpenJournal);
    return () => {
      window.removeEventListener('nexus-ensure-raptor', onEnsure);
      window.removeEventListener('raptor-ensure-tradingview', onEnsureTv);
      window.removeEventListener('raptor-open-insights', onOpenInsights);
      window.removeEventListener('raptor-open-risk', onOpenRisk);
      window.removeEventListener('raptor-open-journal', onOpenJournal);
    };
  }, []);

  // ── EA attach lifecycle ─────────────────────────
  const [attachedEAs, setAttachedEAs] = useState<AttachedEA[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [eaMenuOpen, setEaMenuOpen] = useState(false);
  const [eaStats, setEaStats] = useState<Record<string, EAStats>>({});
  const eaMenuRef = useRef<HTMLDivElement>(null);
  // Global Algo Trading switch (MT5-style). When OFF, all EAs pause — no
  // automated evaluation or orders — while manual trading stays available.
  const [algoOn, setAlgoOn] = useState(true);
  // QuickTrade one-click panel (cTrader-style). Lives in the shared header so it
  // works over BOTH the TradingView and RAPTOR charts.
  const [quickOpen, setQuickOpen] = useState(false);
  const [lot, setLot] = useState('0.10');
  const [slPrice, setSlPrice] = useState('');
  const [tpPrice, setTpPrice] = useState('');
  const [confirmTrade, setConfirmTrade] = useState(true);
  const [placing, setPlacing] = useState(false);
  // Auto-protect default SL/TP (applied when the ticket fields are blank).
  const [autoProtect, setAutoProtect] = useState(() => loadTradePrefs().autoProtect);
  const [defSlPips, setDefSlPips] = useState(() => loadTradePrefs().defaultSlPips);
  const [defTpPips, setDefTpPips] = useState(() => loadTradePrefs().defaultTpPips);
  // QuickTrade order type — mirrors the order ticket's full ladder (§ticket
  // parity): market + limit / stop / stop-limit pendings.
  const [quickType, setQuickType] = useState<string>('market');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickStop, setQuickStop] = useState('');
  // Confidence Calibration tag (🎲): optional per-trade conviction — consumed
  // by EdgeChips, which compares stated confidence with actual outcomes.
  const [conviction, setConviction] = useState<number>(0);
  const quickRef = useRef<HTMLDivElement>(null);

  const announceConviction = useCallback((symbol: string, direction: 'BUY' | 'SELL') => {
    if (!conviction) return;
    try {
      window.dispatchEvent(new CustomEvent('raptor-conviction', { detail: { symbol, direction, conviction, ts: Date.now() } }));
    } catch { /* ignore */ }
    setConviction(0);
  }, [conviction]);
  // Per-EA enable/disable (independent of the global Algo switch). Keyed by
  // `${strategyId}-${symbol}` — the same key the runtime + eaStats use. Missing = on.
  const [eaEnabled, setEaEnabled] = useState<Record<string, boolean>>({});
  const toggleEA = useCallback((a: AttachedEA) => {
    const key = `${a.strategyId}-${a.symbol}`;
    setEaEnabled((prev) => {
      const next = !(prev[key] ?? true);
      runtimeRef.current?.setInstanceEnabled(key, next);
      return { ...prev, [key]: next };
    });
  }, []);
  // Which EA's diagnostics popover is open (by `${strategyId}-${symbol}` key).
  const [infoKey, setInfoKey] = useState<string | null>(null);
  // EA Properties modal (§1).
  const [propsFor, setPropsFor] = useState<AttachedEA | null>(null);
  // Strategy Tester modal (§11).
  const [testFor, setTestFor] = useState<AttachedEA | null>(null);
  // Custom-EA info panel (upload/conversion super-prompt §16).
  const [infoEa, setInfoEa] = useState<CustomEA | null>(null);
  // Mandatory risk disclaimer: EA pending acceptance before attach.
  const [disclaimerFor, setDisclaimerFor] = useState<{ id: string; name: string; pairs?: string[]; timeframes?: string[]; strategyKind?: string; custom?: boolean } | null>(null);
  // Admin entitlement: when algo_trading is switched off platform-wide, the
  // Algo toggle is forced OFF and locked.
  const [algoLocked, setAlgoLocked] = useState(false);
  // Market Insights module (lazy-loaded overlay; entitlement market_insights).
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(false);
  // Risk module (§14/§15; entitlement risk_tools).
  const [riskEnabled, setRiskEnabled] = useState(true);
  const [riskOpen, setRiskOpen] = useState(false);
  // Trade Journal module (§5; entitlement trade_journal).
  const [journalEnabled, setJournalEnabled] = useState(true);
  const [journalOpen, setJournalOpen] = useState(false);
  // AI Correlation Hedging Engine (entitlement hedging_tools; fail-open).
  const [hedgeEnabled, setHedgeEnabled] = useState(true);
  const [hedgeOpen, setHedgeOpen] = useState(false);
  // Global Trade Opportunity Scanner (entitlement trade_scanner; fail-open).
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  // EMIL — Evolving Market Intelligence Lab (entitlement emil; fail-open).
  const [emilEnabled, setEmilEnabled] = useState(true);
  // EMIL console retired — the chip opens the EMIL Control Cockpit (see lib/emil-link).

  // Trader Utility Widget Suite + nice-to-know chip collapse.
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [chipsOpen, setChipsOpen] = useState(false);

  // ── EA runtime: strategies evaluate on platform bars and trade
  //    through place_market_order, regardless of which chart is shown ──
  const ohlcvRef = useRef<OHLCVBuilder | null>(ohlcvBuilder);
  ohlcvRef.current = ohlcvBuilder;
  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const accountRef = useRef(activeAccountId);
  accountRef.current = activeAccountId;

  const runtimeRef = useRef<EARuntime | null>(null);
  if (!runtimeRef.current) {
    runtimeRef.current = new EARuntime({
      getBars: (symbol: string, resolution: Resolution) =>
        ohlcvRef.current ? ohlcvRef.current.getAllBars(symbol, resolution) : [],
      getTick: (symbol: string) => {
        const t = pricesRef.current[symbol];
        return t ? { bid: t.bid, ask: t.ask } : undefined;
      },
      getAccountId: () => accountRef.current ?? null,
      onStats: (key, stats) => setEaStats((prev) => ({ ...prev, [key]: stats })),
      onRefresh: () => triggerRefresh(),
      // EA Properties inputs drive the engine live — read fresh each
      // evaluation so edits apply from the next signal check.
      getParams: (strategyId, kind) => effectiveEngineParams(strategyId, kind),
    });
  }

  // Keep runtime instances in sync with the attached EA list.
  useEffect(() => {
    const runtime = runtimeRef.current!;
    const wanted = new Map(attachedEAs.map((a) => [`${a.strategyId}-${a.symbol}`, a]));
    for (const [key, a] of wanted) {
      if (!runtime.has(key)) {
        const lib = eaList.find((e) => e.id === a.strategyId);
        const kind = (a.strategyKind ?? lib?.strategyKind) as StrategyKind | undefined;
        runtime.attach(key, a.strategyId, a.name, a.symbol, lib?.timeframes ?? ['15m'], kind);
        // Apply any previously-saved Properties for this EA type.
        try {
          const saved = JSON.parse(localStorage.getItem(`raptor_ea_full_${a.strategyId}`) || 'null');
          if (saved) {
            runtime.setInstanceSettings(key, { lot: saved.lot, slAtrMult: saved.slAtrMult, tpAtrMult: saved.tpAtrMult, direction: saved.direction });
            if (saved.allowLiveTrading === false) { runtime.setInstanceEnabled(key, false); setEaEnabled((p) => ({ ...p, [key]: false })); }
          }
        } catch { /* ignore */ }
      }
    }
    // Detach removed instances (position stays open for the trader to manage).
    for (const key of runtime.keys()) {
      if (!wanted.has(key)) runtime.detach(key);
    }
  }, [attachedEAs]);

  // Evaluate on every price tick (bar-close gated inside the runtime).
  useEffect(() => {
    runtimeRef.current?.onTick();
  }, [prices]);

  // Admin entitlements: platform-wide algo_trading OFF forces the global Algo
  // switch off and locks it (per the admin console policy).
  useEffect(() => {
    let active = true;
    (async () => {
      const ents = await getEntitlements();
      if (!active) return;
      if (ents['algo_trading'] === false) {
        runtimeRef.current?.setGlobalEnabled(false);
        setAlgoOn(false);
        setAlgoLocked(true);
      }
      // Market Insights module (enhancement prompt §2/§3/§7): admin-toggleable,
      // fail-open like every entitlement.
      if (ents['market_insights'] === false) setInsightsEnabled(false);
      if (ents['risk_tools'] === false) setRiskEnabled(false);
      if (ents['trade_journal'] === false) setJournalEnabled(false);
      if (ents['hedging_tools'] === false) setHedgeEnabled(false);
      if (ents['trade_scanner'] === false) setScannerEnabled(false);
      if (ents['emil'] === false) setEmilEnabled(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => () => runtimeRef.current?.detachAll(), []);

  // Bridge the terminal's real bar builder to NEXUS (market-state engine).
  useEffect(() => {
    registerOhlcvBuilder(ohlcvBuilder);
    return () => registerOhlcvBuilder(null);
  }, [ohlcvBuilder]);


  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('ea_instances')
          .select('id, strategy_id, name, parameters, status')
          .eq('status', 'running');
        if (active && data) {
          setAttachedEAs(
            data.map((r) => ({
              instanceId: r.id as string,
              strategyId: r.strategy_id as string,
              name: (r.name as string) ?? 'EA',
              symbol: ((r.parameters as Record<string, unknown> | null)?.symbol as string) ?? '',
              strategyKind: (r.parameters as Record<string, unknown> | null)?.strategyKind as string | undefined,
            }))
          );
        }
      } catch { /* signed-out — chart still works, attachments stay local */ }
    })();
    return () => { active = false; };
  }, []);

  // Close the TV-tab EA menu on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (eaMenuRef.current && !eaMenuRef.current.contains(e.target as Node)) setEaMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Clear the drop overlay whenever any drag session ends.
  useEffect(() => {
    const clear = () => setDragActive(false);
    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);
    return () => {
      window.removeEventListener('dragend', clear);
      window.removeEventListener('drop', clear);
    };
  }, []);

  const showEAToast = useCallback((text: string) => {
    const div = document.createElement('div');
    div.className = 'fixed top-20 right-4 z-[9999] px-4 py-3 rounded-lg text-sm font-semibold';
    div.style.cssText = 'background:#0091D5;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.4)';
    div.textContent = text;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }, []);

  // Global decoupling alarm: watch every hedge group's live correlation even
  // while the Hedge panel is closed. Weakened/reversed relationships toast
  // once per group per 30 min (throttle in localStorage).
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { loadHedgeGroups, correlationRead } = await import('@/lib/trading/hedge-engine');
        const groups = loadHedgeGroups();
        if (!groups.length || !ohlcvRef.current) return;
        for (const g of groups) {
          const throttleKey = `raptor_hedge_alarm_${g.id}`;
          const last = Number(localStorage.getItem(throttleKey) ?? 0);
          if (Date.now() - last < 30 * 60_000) continue;
          const corrNow = correlationRead(ohlcvRef.current, g.primarySymbol, g.hedgeSymbol).avg;
          if (corrNow == null) continue;
          let msg: string | null = null;
          if (Math.sign(corrNow) !== Math.sign(g.corrAtEntry) && Math.abs(g.corrAtEntry) > 0.3) {
            msg = `⚠ HEDGE ALARM: "${g.name}" correlation has REVERSED (${g.corrAtEntry.toFixed(2)} → ${corrNow.toFixed(2)}) — the hedge may now ADD risk. Review it in ⇄ HEDGE.`;
          } else if (Math.abs(corrNow) < Math.abs(g.corrAtEntry) - 0.25) {
            msg = `⚠ Hedge "${g.name}": correlation weakening (${g.corrAtEntry.toFixed(2)} → ${corrNow.toFixed(2)}) — protection is degrading; consider reducing.`;
          }
          if (msg) {
            localStorage.setItem(throttleKey, String(Date.now()));
            showEAToast(msg);
          }
        }
      } catch { /* never let the alarm break the terminal */ }
    }, 90_000);
    return () => clearInterval(id);
  }, [showEAToast]);

  // Close the QuickTrade panel on outside click.
  useEffect(() => {
    if (!quickOpen) return;
    const h = (e: MouseEvent) => { if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [quickOpen]);

  // One-click market order for the active symbol via the real order service.
  const placeQuick = useCallback(async (direction: 'BUY' | 'SELL') => {
    const acct = accountRef.current;
    const t = pricesRef.current[activeSymbol];
    const size = parseFloat(lot);
    if (!acct) { showEAToast('Select a trading account first'); return; }
    if (!t || t.bid == null || t.ask == null) { showEAToast(`No live price for ${activeSymbol}`); return; }
    if (!(size > 0)) { showEAToast('Enter a valid lot size'); return; }
    const fill = direction === 'BUY' ? t.ask : t.bid;
    if (confirmTrade && !useTradingStore.getState().oneClickTrading && !window.confirm(`${direction} ${size} ${activeSymbol} @ market (${fill})?`)) return;
    setPlacing(true);
    // Apply the trader's default SL/TP when the ticket fields are blank
    // (one-click trades are never left naked when auto-protect is on).
    const prot = defaultProtection(activeSymbol, direction, fill, slPrice ? parseFloat(slPrice) : undefined, tpPrice ? parseFloat(tpPrice) : undefined);
    try {
      await orderService.placeMarketOrder({
        accountId: acct, symbol: activeSymbol, direction, size, fillPrice: fill,
        sl: prot.sl,
        tp: prot.tp,
        comment: 'QuickTrade',
      });
      showEAToast(`✓ ${direction} ${size} ${activeSymbol} filled @ ${fill}`);
      announceConviction(activeSymbol, direction);
      triggerRefresh();
      setQuickOpen(false);
    } catch (err) {
      showEAToast(`Order failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPlacing(false);
    }
  }, [activeSymbol, lot, slPrice, tpPrice, confirmTrade, showEAToast, triggerRefresh, announceConviction]);

  // Pending order from QuickTrade (limit / stop / stop-limit) — same service
  // mapping as the order ticket; direction comes from the chosen type.
  const placeQuickPending = useCallback(async () => {
    const acct = accountRef.current;
    const size = parseFloat(lot);
    const orderPrice = parseFloat(quickPrice);
    if (!acct) { showEAToast('Select a trading account first'); return; }
    if (!(size > 0)) { showEAToast('Enter a valid lot size'); return; }
    if (!(orderPrice > 0)) { showEAToast('Enter a valid order price'); return; }
    if (quickType.endsWith('stop_limit') && !(parseFloat(quickStop) > 0)) {
      showEAToast('Enter a stop trigger price for the stop-limit order'); return;
    }
    const direction: 'BUY' | 'SELL' = quickType.startsWith('buy') ? 'BUY' : 'SELL';
    const serviceType: 'limit' | 'stop' = quickType.includes('limit') ? 'limit' : 'stop';
    const label = quickType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (confirmTrade && !useTradingStore.getState().oneClickTrading && !window.confirm(`${label} ${size} ${activeSymbol} @ ${orderPrice}?`)) return;
    setPlacing(true);
    try {
      await orderService.placePendingOrder({
        accountId: acct, symbol: activeSymbol, direction, orderType: serviceType,
        size, price: orderPrice,
        sl: slPrice ? parseFloat(slPrice) : undefined,
        tp: tpPrice ? parseFloat(tpPrice) : undefined,
        comment: 'QuickTrade',
      });
      showEAToast(`✓ ${label} ${size} ${activeSymbol} @ ${orderPrice} placed`);
      announceConviction(activeSymbol, direction);
      triggerRefresh();
      setQuickPrice(''); setQuickStop('');
    } catch (err) {
      showEAToast(`Order failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPlacing(false);
    }
  }, [activeSymbol, lot, quickType, quickPrice, quickStop, slPrice, tpPrice, confirmTrade, showEAToast, triggerRefresh, announceConviction]);

  // Take Profit ladder: close a percentage of every open position on the
  // active symbol (100% = full close via the canonical close path).
  const takeProfitPct = useCallback(async (pct: number) => {
    const acct = accountRef.current;
    if (!acct) { showEAToast('Select a trading account first'); return; }
    setPlacing(true);
    try {
      const positions = (await orderService.getOpenPositions(acct)) as Array<{ id: string; symbol: string; direction: string; size: number; open_price: number; current_price: number | null }>;
      const targets = positions.filter((p) => p.symbol === activeSymbol);
      if (!targets.length) { showEAToast(`No open ${activeSymbol} positions`); return; }
      if (confirmTrade && !useTradingStore.getState().oneClickTrading &&
          !window.confirm(`Take profit: close ${pct}% of ${targets.length} ${activeSymbol} position(s)?`)) return;
      let done = 0;
      for (const p of targets) {
        const t = pricesRef.current[p.symbol];
        const cp = p.direction === 'BUY' ? (t?.bid ?? p.current_price ?? p.open_price) : (t?.ask ?? p.current_price ?? p.open_price);
        try {
          if (pct >= 100) await orderService.closePosition(p.id, Number(cp));
          else await orderService.partialClosePosition(p.id, Number(cp), pct / 100);
          done++;
        } catch { /* position may have closed in the meantime */ }
      }
      showEAToast(`✓ Took profit on ${done}/${targets.length} position(s) — ${pct}% closed`);
      triggerRefresh();
    } catch (err) {
      showEAToast(`Take profit failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPlacing(false);
    }
  }, [activeSymbol, confirmTrade, showEAToast, triggerRefresh]);

  // Batch-close open positions (all / profitable / losing) via the real order
  // service. Closing a BUY sells at bid; closing a SELL buys at ask.
  const closeBatch = useCallback(async (mode: 'all' | 'profit' | 'loss') => {
    const acct = accountRef.current;
    if (!acct) { showEAToast('Select a trading account first'); return; }
    setPlacing(true);
    try {
      const positions = (await orderService.getOpenPositions(acct)) as Array<{ id: string; symbol: string; direction: string; open_price: number; current_price: number | null; floating_pnl: number | null }>;
      let targets = positions;
      if (mode === 'profit') targets = positions.filter((p) => Number(p.floating_pnl) > 0);
      else if (mode === 'loss') targets = positions.filter((p) => Number(p.floating_pnl) < 0);
      if (!targets.length) { showEAToast('No matching positions to close'); return; }
      if (confirmTrade && !useTradingStore.getState().oneClickTrading && !window.confirm(`Close ${targets.length} position(s)${mode !== 'all' ? ` (${mode})` : ''}?`)) return;
      let closed = 0;
      for (const p of targets) {
        const t = pricesRef.current[p.symbol];
        const cp = p.direction === 'BUY' ? (t?.bid ?? p.current_price ?? p.open_price) : (t?.ask ?? p.current_price ?? p.open_price);
        try { await orderService.closePosition(p.id, Number(cp)); closed++; } catch { /* may already be closed */ }
      }
      showEAToast(`✓ Closed ${closed}/${targets.length} position(s)`);
      triggerRefresh();
    } catch (err) {
      showEAToast(`Close failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPlacing(false);
    }
  }, [confirmTrade, showEAToast, triggerRefresh]);

  // Cancel all pending orders on the active account.
  const cancelAllPending = useCallback(async () => {
    const acct = accountRef.current;
    if (!acct) { showEAToast('Select a trading account first'); return; }
    setPlacing(true);
    try {
      const orders = (await orderService.getPendingOrders(acct)) as Array<{ id: string }>;
      if (!orders.length) { showEAToast('No pending orders'); return; }
      if (confirmTrade && !useTradingStore.getState().oneClickTrading && !window.confirm(`Cancel ${orders.length} pending order(s)?`)) return;
      let n = 0;
      for (const o of orders) { try { await orderService.cancelOrder(o.id); n++; } catch { /* skip */ } }
      showEAToast(`✓ Cancelled ${n} pending order(s)`);
      triggerRefresh();
    } catch (err) {
      showEAToast(`Cancel failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPlacing(false);
    }
  }, [confirmTrade, showEAToast, triggerRefresh]);

  // Restart / Clear EA toolbar actions (§3).
  const restartEA = useCallback((a: AttachedEA) => {
    runtimeRef.current?.restart(`${a.strategyId}-${a.symbol}`);
    showEAToast(`EA "${a.name}" restarted — re-scanning`);
  }, [showEAToast]);
  const clearAllEAs = useCallback(() => {
    const forSymbol = attachedEAs.filter((a) => a.symbol === activeSymbol);
    if (!forSymbol.length) return;
    if (!window.confirm(`Clear all ${forSymbol.length} EA(s) on ${activeSymbol}? Open positions stay for you to manage manually.`)) return;
    for (const a of forSymbol) runtimeRef.current?.detach(`${a.strategyId}-${a.symbol}`);
    setAttachedEAs((prev) => prev.filter((a) => a.symbol !== activeSymbol));
    showEAToast(`All EAs cleared on ${activeSymbol} — chart is now manual`);
  }, [attachedEAs, activeSymbol, showEAToast]);

  // EA Properties: build the current settings and apply edits back to the runtime.
  const buildEASettings = useCallback((a: AttachedEA): EAFullSettings => {
    const key = `${a.strategyId}-${a.symbol}`;
    const exec = runtimeRef.current?.getInstanceSettings(key);
    let persisted: Partial<EAFullSettings> = {};
    try { persisted = JSON.parse(localStorage.getItem(`raptor_ea_full_${a.strategyId}`) || '{}'); } catch { /* ignore */ }
    return {
      ...DEFAULT_FULL_SETTINGS,
      ...persisted,
      ...(exec ?? {}),
      allowLiveTrading: eaEnabled[key] ?? true,
      confirmBeforeExecution: confirmTrade,
    };
  }, [eaEnabled, confirmTrade]);

  const applyEASettings = useCallback((a: AttachedEA, full: EAFullSettings) => {
    const key = `${a.strategyId}-${a.symbol}`;
    runtimeRef.current?.setInstanceSettings(key, { lot: full.lot, slAtrMult: full.slAtrMult, tpAtrMult: full.tpAtrMult, direction: full.direction });
    runtimeRef.current?.setInstanceEnabled(key, full.allowLiveTrading);
    setEaEnabled((prev) => ({ ...prev, [key]: full.allowLiveTrading }));
    setConfirmTrade(full.confirmBeforeExecution);
    try { localStorage.setItem(`raptor_ea_full_${a.strategyId}`, JSON.stringify(full)); } catch { /* ignore */ }
    showEAToast(`EA "${a.name}" properties applied`);
  }, [showEAToast]);

  const attachInFlightRef = useRef<Set<string>>(new Set());

  const attachEA = useCallback(async (ea: { id?: string; name?: string; pairs?: string[]; timeframes?: string[]; strategyKind?: string; custom?: boolean }, disclaimerAccepted = false) => {
    if (!ea?.name || !ea?.id) return;
    // Mandatory risk disclaimer: block the attach until accepted for this EA
    // under the current disclaimer version.
    if (!disclaimerAccepted && !isDisclaimerAccepted(ea.id)) {
      setDisclaimerFor({ id: ea.id, name: ea.name, pairs: ea.pairs, timeframes: ea.timeframes, strategyKind: ea.strategyKind, custom: ea.custom });
      return;
    }
    const key = `${ea.id}-${activeSymbol}`;
    if (attachInFlightRef.current.has(key)) return;
    if (attachedEAs.some((a) => a.strategyId === ea.id && a.symbol === activeSymbol)) {
      showEAToast(`EA "${ea.name}" is already running on ${activeSymbol}`);
      return;
    }
    // One EA per chart (§2): if another EA is running on this symbol, prompt to
    // replace it or cancel — never run multiple EAs on the same chart.
    const existing = attachedEAs.filter((a) => a.symbol === activeSymbol);
    if (existing.length > 0) {
      const ok = window.confirm(
        `"${existing[0].name}" is already running on ${activeSymbol}.\n\n` +
        `One EA per chart — replace it with "${ea.name}"?\n` +
        `(The existing EA stops; its open positions stay for you to manage.)`
      );
      if (!ok) return;
      // Detach inline (detachEA is declared later in this component — TDZ).
      setAttachedEAs((prev) => prev.filter((x) => x.symbol !== activeSymbol));
      for (const a of existing) {
        if (a.instanceId) {
          try { await createClient().from('ea_instances').delete().eq('id', a.instanceId); } catch { /* noop */ }
        }
      }
      showEAToast(`EA "${existing[0].name}" replaced on ${activeSymbol}`);
    }
    attachInFlightRef.current.add(key);
    setTimeout(() => attachInFlightRef.current.delete(key), 3000);

    // MT5 behavior: attaching an EA opens its Properties window (Common /
    // Inputs / source) so the trader reviews parameters right away.
    const openProperties = () => {
      const full = eaList.find((e) => e.id === ea.id);
      if (full) {
        setInfoEa({
          ...full, builtin: !full.custom,
          ...(full.custom ? {} : { inputs: builtinInputsFor(full.id, full.strategyKind) }),
        } as unknown as CustomEA);
      }
    };

    // Uploaded custom EAs live in the browser (localStorage) and their id is
    // not a DB uuid — attach them locally; they still trade via the runtime.
    if (ea.custom) {
      setAttachedEAs((prev) => [...prev, { instanceId: null, strategyId: ea.id!, name: ea.name!, symbol: activeSymbol, strategyKind: ea.strategyKind }]);
      showEAToast(`Custom EA "${ea.name}" attached to ${activeSymbol} — running`);
      openProperties();
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('no session');
      const { data: accts } = await supabase
        .from('trading_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);
      const accountId = accts?.[0]?.id as string | undefined;
      if (!accountId) throw new Error('no account');
      const { data: inst, error } = await supabase
        .from('ea_instances')
        .insert({
          account_id: accountId,
          strategy_id: ea.id,
          name: ea.name,
          parameters: { symbol: activeSymbol, pairs: ea.pairs ?? [], timeframes: ea.timeframes ?? [], strategyKind: ea.strategyKind ?? null },
          status: 'running',
          mode: 'live',
        })
        .select('id')
        .single();
      if (error) throw error;
      setAttachedEAs((prev) => [...prev, { instanceId: inst.id as string, strategyId: ea.id!, name: ea.name!, symbol: activeSymbol, strategyKind: ea.strategyKind }]);
      showEAToast(`EA "${ea.name}" attached to ${activeSymbol} — running`);
    } catch {
      // Signed-out / no account: keep the attachment local so the UI still works.
      setAttachedEAs((prev) => [...prev, { instanceId: null, strategyId: ea.id!, name: ea.name!, symbol: activeSymbol, strategyKind: ea.strategyKind }]);
      showEAToast(`EA "${ea.name}" attached to ${activeSymbol}`);
    }
    openProperties();
  }, [attachedEAs, activeSymbol, showEAToast, eaList]);

  const handleEADrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    let ea: { id?: string; name?: string; pairs?: string[]; timeframes?: string[] };
    try { ea = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    void attachEA(ea);
  }, [attachEA]);

  const detachEA = useCallback(async (a: AttachedEA) => {
    setAttachedEAs((prev) => prev.filter((x) => !(x.strategyId === a.strategyId && x.symbol === a.symbol)));
    if (a.instanceId) {
      try { await createClient().from('ea_instances').delete().eq('id', a.instanceId); } catch { /* noop */ }
    }
  }, []);

  const symbolEAs = attachedEAs.filter((a) => a.symbol === activeSymbol);

  return (
    <div
      className="flex h-full w-full flex-col"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDragEnter={() => setDragActive(true)}
      onDrop={handleEADrop}
    >
      {/* Source tabs + TV-tab EA menu */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-1 border-b px-2 py-0.5 [&>*]:shrink-0"
        /* auto-height: the row GROWS when chips wrap (owner rule: nothing
           off-frame or overlapping) — a fixed 30px here spilled wrapped
           chips onto the TF bar below */
        style={{ minHeight: 30, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {(
          [
            { id: 'tradingview' as const, label: 'TradingView (Live Data)' },
            { id: 'raptor' as const, label: 'RAPTOR Chart' },
          ]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSource(tab.id)}
            className="rounded px-2.5 py-1 font-mono text-[11px] transition-all"
            style={headerBtnStyle('source', source === tab.id)}
          >
            {tab.label}
          </button>
        ))}

        {/* Global Algo Trading switch — pauses/resumes all EAs on this chart */}
        <button
          onClick={() => {
            if (algoLocked) return;
            const next = !algoOn;
            runtimeRef.current?.setGlobalEnabled(next);
            setAlgoOn(next);
          }}
          disabled={algoLocked}
          title={algoLocked
            ? 'Algo Trading has been disabled platform-wide by the administrator.'
            : algoOn ? 'Algo Trading is ON — EAs run automatically. Click to pause.' : 'Algo Trading is OFF — EAs paused. Click to resume.'}
          className="ml-auto flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px] font-bold transition-all"
          style={{
            backgroundColor: algoOn ? 'rgba(0,194,122,0.15)' : 'rgba(255,82,82,0.15)',
            color: algoOn ? '#00C27A' : '#FF5252',
            border: `1px solid ${algoOn ? 'rgba(0,194,122,0.4)' : 'rgba(255,82,82,0.4)'}`,
            ...(algoOn ? glowStyle('0,194,122') : {}),
          }}
        >
          <span style={{ fontSize: 9 }}>{algoOn ? '🟢' : '🔴'}</span>
          <span className="hidden lg:inline">Algo </span>{algoOn ? 'ON' : 'OFF'}
        </button>

        {/* QuickTrade one-click panel — works over both charts */}
        <div className="relative ml-1" ref={quickRef}>
          <button
            onClick={() => setQuickOpen((o) => !o)}
            title="QuickTrade — one-click Buy/Sell for the active symbol"
            className={`flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${quickOpen ? '' : 'raptor-trade-blink'}`}
            style={quickOpen ? headerBtnStyle('trade', true) : undefined}
          >
            <Zap size={12} /> <span className="hidden 2xl:inline">Trade</span> <ChevronDown size={10} />
          </button>
          {quickOpen && (() => {
            const t = prices[activeSymbol];
            const bid = t?.bid, ask = t?.ask;
            const digits = bid != null && bid < 20 ? 5 : bid != null && bid < 500 ? 3 : 2;
            return (
              <HeaderPortal open={quickOpen} anchorRef={quickRef}>
              <div
                className="w-[280px] rounded-lg border p-3 shadow-2xl"
                style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">{activeSymbol}</span>
                  <span className="text-[9px] text-white/35">one-click · both charts</span>
                </div>
                {quickType === 'market' ? (
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => placeQuick('SELL')}
                      disabled={placing}
                      className="flex flex-col items-center rounded-md py-2 transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(193,18,31,0.15)', border: '1px solid rgba(193,18,31,0.4)' }}
                    >
                      <span className="text-[10px] font-bold uppercase" style={{ color: '#FF5252' }}>Sell</span>
                      <span className="font-mono text-[12px] text-white">{bid != null ? bid.toFixed(digits) : '—'}</span>
                    </button>
                    <button
                      onClick={() => placeQuick('BUY')}
                      disabled={placing}
                      className="flex flex-col items-center rounded-md py-2 transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(0,194,122,0.15)', border: '1px solid rgba(0,194,122,0.4)' }}
                    >
                      <span className="text-[10px] font-bold uppercase" style={{ color: '#00C27A' }}>Buy</span>
                      <span className="font-mono text-[12px] text-white">{ask != null ? ask.toFixed(digits) : '—'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="mb-2 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-md py-1.5" style={{ backgroundColor: 'rgba(193,18,31,0.1)', border: '1px solid rgba(193,18,31,0.25)' }}>
                      <div className="text-[8px] uppercase text-white/35">Bid</div>
                      <div className="font-mono text-[12px]" style={{ color: '#FF5252' }}>{bid != null ? bid.toFixed(digits) : '—'}</div>
                    </div>
                    <div className="rounded-md py-1.5" style={{ backgroundColor: 'rgba(0,194,122,0.1)', border: '1px solid rgba(0,194,122,0.25)' }}>
                      <div className="text-[8px] uppercase text-white/35">Ask</div>
                      <div className="font-mono text-[12px]" style={{ color: '#00C27A' }}>{ask != null ? ask.toFixed(digits) : '—'}</div>
                    </div>
                  </div>
                )}

                {/* Order type — full ticket ladder */}
                <div className="mb-2 flex items-center gap-2">
                  <label className="w-10 text-[10px] text-white/45">Type</label>
                  <select
                    value={quickType}
                    onChange={(e) => setQuickType(e.target.value)}
                    className="flex-1 rounded bg-white/[0.06] px-1.5 py-1 text-[10px] text-white outline-none"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="market" style={{ backgroundColor: '#0A0F1A' }}>Market Execution</option>
                    <option value="buy_limit" style={{ backgroundColor: '#0A0F1A' }}>Buy Limit — buy below market</option>
                    <option value="sell_limit" style={{ backgroundColor: '#0A0F1A' }}>Sell Limit — sell above market</option>
                    <option value="buy_stop" style={{ backgroundColor: '#0A0F1A' }}>Buy Stop — buy on breakout up</option>
                    <option value="sell_stop" style={{ backgroundColor: '#0A0F1A' }}>Sell Stop — sell on breakdown</option>
                    <option value="buy_stop_limit" style={{ backgroundColor: '#0A0F1A' }}>Buy Stop Limit</option>
                    <option value="sell_stop_limit" style={{ backgroundColor: '#0A0F1A' }}>Sell Stop Limit</option>
                  </select>
                </div>
                {quickType !== 'market' && (
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-white/45">Price</label>
                      <input value={quickPrice} onChange={(e) => setQuickPrice(e.target.value)} placeholder="order" inputMode="decimal"
                        className="w-full rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[10px] text-white placeholder:text-white/20 outline-none" />
                    </div>
                    {quickType.endsWith('stop_limit') && (
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-white/45">Trigger</label>
                        <input value={quickStop} onChange={(e) => setQuickStop(e.target.value)} placeholder="stop" inputMode="decimal"
                          className="w-full rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[10px] text-white placeholder:text-white/20 outline-none" />
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-2 flex items-center gap-2">
                  <label className="w-10 text-[10px] text-white/45">Lots</label>
                  <input value={lot} onChange={(e) => setLot(e.target.value)} inputMode="decimal"
                    className="flex-1 rounded bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-white outline-none" />
                </div>

                {/* Risk presets — size the lot from balance % over the SL distance */}
                <div className="mb-2 flex items-center gap-2">
                  <label className="w-10 text-[10px] text-white/45">Risk</label>
                  <div className="grid flex-1 grid-cols-4 gap-1">
                    {([['0.5%', 0.5, '#00C27A'], ['1%', 1, '#00C27A'], ['2%', 2, '#FFB300'], ['5%', 5, '#FF5252']] as const).map(([lbl, pct, color]) => (
                      <button key={lbl}
                        onClick={() => {
                          const entry = quickType === 'market'
                            ? (quickType.startsWith('sell') ? (bid ?? 0) : (ask ?? 0))
                            : (parseFloat(quickPrice) || ask || 0);
                          const sized = lotsForRiskPct({
                            symbol: activeSymbol, balance: Number(accountSummary?.balance ?? 0),
                            pct, entryPrice: entry, sl: slPrice ? parseFloat(slPrice) : null,
                          });
                          if (sized == null) { showEAToast('Risk presets need an account balance'); return; }
                          setLot(sized.toFixed(2));
                        }}
                        className="rounded py-1 text-[9px] font-bold transition-all hover:brightness-125"
                        style={{ backgroundColor: `${color}1A`, color, border: `1px solid ${color}55` }}
                        title={`Size the lot so ~${pct}% of balance is at risk to the SL (50-pip stop assumed when SL is empty)`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-white/45">SL</label>
                    <input value={slPrice} onChange={(e) => setSlPrice(e.target.value)} placeholder="price" inputMode="decimal"
                      className="w-full rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[10px] text-white placeholder:text-white/20 outline-none" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-white/45">TP</label>
                    <input value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} placeholder="price" inputMode="decimal"
                      className="w-full rounded bg-white/[0.06] px-1.5 py-1 font-mono text-[10px] text-white placeholder:text-white/20 outline-none" />
                  </div>
                </div>
                {/* 🎲 Conviction tag — feeds the Confidence Calibration chip */}
                <div className="mb-2 flex items-center gap-2">
                  <label className="w-10 text-[10px] text-white/45" title="How sure are you? The platform compares stated confidence with real outcomes over time.">Sure?</label>
                  <div className="grid flex-1 grid-cols-5 gap-1">
                    {[0, 55, 65, 75, 85].map((pct) => (
                      <button key={pct}
                        onClick={() => setConviction(pct)}
                        className="rounded py-1 text-[9px] font-bold transition-all hover:brightness-125"
                        style={{
                          backgroundColor: conviction === pct ? 'rgba(255,179,0,0.25)' : 'rgba(255,179,0,0.06)',
                          color: conviction === pct ? '#FFB300' : 'rgba(255,179,0,0.5)',
                          border: `1px solid rgba(255,179,0,${conviction === pct ? 0.6 : 0.2})`,
                          textShadow: conviction === pct ? '0 0 6px rgba(255,179,0,0.8)' : 'none',
                        }}
                        title={pct === 0 ? 'No tag' : `Tag the next order as ${pct}% confident`}
                      >
                        {pct === 0 ? '—' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Market properties — pip value + margin, same math as the ticket */}
                {(() => {
                  const lots = parseFloat(lot) || 0;
                  const entry = quickType === 'market' ? (ask ?? 0) : (parseFloat(quickPrice) || ask || 0);
                  const pv = calcPipValue(activeSymbol, lots);
                  const mg = calcMarginRequired(activeSymbol, lots, entry);
                  const dp = getTicketDecimals(activeSymbol) <= 2 ? 2 : 2;
                  return (
                    <div className="mb-2 rounded px-2 py-1.5 text-[10px]" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between py-0.5">
                        <span className="text-white/40">Pip Value</span>
                        <span className="font-mono" style={{ color: '#0091D5' }}>1 pip = ${pv.toFixed(dp)}</span>
                      </div>
                      <div className="flex items-center justify-between py-0.5">
                        <span className="text-white/40">Margin Required</span>
                        <span className="font-mono text-white/80">${mg.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-[10px] transition-opacity" style={{ color: 'rgba(255,255,255,0.45)', opacity: oneClickTrading ? 0.35 : 1 }}
                    title={oneClickTrading ? '1-Click Trading is ON — confirmation is skipped' : 'Ask before every execution'}>
                    <input type="checkbox" checked={confirmTrade} disabled={oneClickTrading} onChange={(e) => setConfirmTrade(e.target.checked)} className="accent-[#0091D5]" />
                    Confirm before execution
                  </label>
                  {/* Same switch as the RAPTOR toolbar's 1-Click Trading — always in unison */}
                  <button
                    onClick={() => setOneClickTrading(!oneClickTrading)}
                    title={oneClickTrading ? '1-Click Trading ON — orders execute instantly, no confirmation. Click to turn off.' : '1-Click Trading OFF — click to execute orders instantly without confirmation.'}
                    className="flex shrink-0 items-center gap-1.5"
                  >
                    <span className="relative rounded-full transition-all" style={{
                      width: 30, height: 16,
                      background: oneClickTrading ? 'linear-gradient(180deg, rgba(0,145,213,0.7) 0%, rgba(0,145,213,0.35) 100%)' : 'rgba(255,255,255,0.12)',
                      border: `1px solid ${oneClickTrading ? 'rgba(0,145,213,0.9)' : 'rgba(255,255,255,0.15)'}`,
                      boxShadow: oneClickTrading ? '0 0 10px rgba(0,145,213,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.4)',
                    }}>
                      <span className="absolute top-[2px] rounded-full transition-all" style={{ width: 10, height: 10, left: oneClickTrading ? 16 : 2, backgroundColor: oneClickTrading ? '#fff' : 'rgba(255,255,255,0.5)' }} />
                    </span>
                    <span className="text-[9px] font-semibold" style={{ color: oneClickTrading ? '#0091D5' : 'rgba(255,255,255,0.4)' }}>1-Click</span>
                  </button>
                </div>

                {/* Auto-protect: default SL/TP applied when the fields are blank */}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded border px-2 py-1" style={{ borderColor: 'rgba(0,194,122,0.2)' }}>
                  <label className="flex items-center gap-1.5 text-[9px] font-semibold" style={{ color: autoProtect ? '#00C27A' : 'rgba(255,255,255,0.45)' }}
                    title="When SL/TP are left blank, apply these default distances so one-click trades are never naked.">
                    <input type="checkbox" checked={autoProtect} onChange={(e) => { setAutoProtect(e.target.checked); saveTradePrefs({ ...loadTradePrefs(), autoProtect: e.target.checked }); }} className="accent-[#00C27A]" />
                    Auto-protect (default SL/TP)
                  </label>
                  {autoProtect && (
                    <span className="flex items-center gap-1 text-[9px] text-white/45">
                      SL <input type="number" value={defSlPips} onChange={(e) => { const v = Math.max(0, Number(e.target.value) || 0); setDefSlPips(v); saveTradePrefs({ ...loadTradePrefs(), defaultSlPips: v }); }} className="w-12 rounded bg-white/[0.06] px-1 py-0.5 text-right font-mono text-[9px] text-white outline-none" /> p ·
                      TP <input type="number" value={defTpPips} onChange={(e) => { const v = Math.max(0, Number(e.target.value) || 0); setDefTpPips(v); saveTradePrefs({ ...loadTradePrefs(), defaultTpPips: v }); }} className="w-12 rounded bg-white/[0.06] px-1 py-0.5 text-right font-mono text-[9px] text-white outline-none" /> p
                    </span>
                  )}
                </div>

                {/* Place button for pending order types */}
                {quickType !== 'market' && (
                  <button
                    onClick={placeQuickPending}
                    disabled={placing}
                    className="mt-2 w-full rounded-md py-2 text-[11px] font-bold transition-all hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: quickType.startsWith('buy')
                        ? 'linear-gradient(180deg, rgba(0,194,122,0.4) 0%, rgba(0,194,122,0.15) 100%)'
                        : 'linear-gradient(180deg, rgba(255,82,82,0.4) 0%, rgba(255,82,82,0.15) 100%)',
                      color: quickType.startsWith('buy') ? '#00C27A' : '#FF5252',
                      border: `1px solid ${quickType.startsWith('buy') ? 'rgba(0,194,122,0.6)' : 'rgba(255,82,82,0.6)'}`,
                    }}
                  >
                    Place {quickType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                )}

                {/* Manage open positions / pending orders */}
                <div className="mt-2 border-t border-white/[0.06] pt-2">
                  <div className="mb-1.5 text-[9px] uppercase tracking-wide text-white/30">Take profit — close % of {activeSymbol} positions</div>
                  <div className="mb-2 grid grid-cols-5 gap-1">
                    {[10, 25, 50, 75, 100].map((pct) => (
                      <button key={pct}
                        onClick={() => takeProfitPct(pct)}
                        disabled={placing}
                        className="rounded py-1.5 text-[9px] font-bold transition-all hover:brightness-125 disabled:opacity-50"
                        style={{
                          backgroundColor: pct === 100 ? 'rgba(0,194,122,0.22)' : 'rgba(0,194,122,0.10)',
                          color: '#00C27A',
                          border: `1px solid rgba(0,194,122,${pct === 100 ? 0.55 : 0.3})`,
                        }}
                        title={`Close ${pct}% of every open ${activeSymbol} position${pct === 100 ? ' (full close)' : ' — the rest keeps running'}`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <div className="mb-1.5 text-[9px] uppercase tracking-wide text-white/30">Manage positions</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => closeBatch('all')} disabled={placing}
                      className="rounded-md py-1.5 text-[10px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      Close All
                    </button>
                    <button onClick={() => closeBatch('profit')} disabled={placing}
                      className="rounded-md py-1.5 text-[10px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(0,194,122,0.12)', color: '#00C27A', border: '1px solid rgba(0,194,122,0.3)' }}>
                      Close Profit
                    </button>
                    <button onClick={() => closeBatch('loss')} disabled={placing}
                      className="rounded-md py-1.5 text-[10px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(193,18,31,0.12)', color: '#FF5252', border: '1px solid rgba(193,18,31,0.3)' }}>
                      Close Loss
                    </button>
                    <button onClick={cancelAllPending} disabled={placing}
                      className="rounded-md py-1.5 text-[10px] font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      Cancel Pending
                    </button>
                  </div>
                </div>
              </div>
              </HeaderPortal>
            );
          })()}
        </div>

        {/* Chart templates / layouts — save & restore symbol+TF+type+indicators */}
        <TemplatesMenu onToast={showEAToast} />

        {/* Watchlist — switches the active symbol for both charts */}
        <WatchlistMenu activeSymbol={activeSymbol} prices={prices} setActiveSymbol={setActiveSymbol} />

        {/* Price alerts — shared header, works over both charts */}
        <AlertsMenu activeSymbol={activeSymbol} prices={prices} onToast={showEAToast} />

        {/* Markets — economic calendar, news & screener (real TradingView data) */}
        <MarketsMenu />

        {/* Market Insights — heat map / sessions / regime (module, admin-toggleable) */}
        {insightsEnabled && (
          <button
            onClick={() => setInsightsOpen((o) => !o)}
            className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
            style={headerBtnStyle('insights', insightsOpen)}
            title="Market Insights — heat map, sessions & regime (live platform data)"
          >
            <Grid3x3 size={12} /> Insights
          </button>
        )}

        {/* Risk module — dashboard + position sizer (admin-toggleable) */}
        {riskEnabled && (
          <button
            onClick={() => setRiskOpen((o) => !o)}
            className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
            style={headerBtnStyle('risk', riskOpen)}
            title="Risk Tools — dashboard & position sizer (real account data)"
          >
            <ShieldCheck size={12} /> Risk
          </button>
        )}

        {/* Trade Journal module (admin-toggleable) */}
        {journalEnabled && (
          <button
            onClick={() => setJournalOpen((o) => !o)}
            className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
            style={headerBtnStyle('journal', journalOpen)}
            title="Trade Journal — annotate closed trades, analytics, CSV export"
          >
            <NotebookPen size={12} /> Journal
          </button>
        )}

        {/* Shield — trader-protection rules (self-imposed, enforced at the order gate) */}
        <ProtectionMenu onToast={showEAToast} />

        {/* DOM — click-to-trade price ladder (real order service, both charts) */}
        <DomLadder activeSymbol={activeSymbol} prices={prices} onToast={showEAToast} />

        {/* Raptor Script — custom indicator editor; plots on the RAPTOR chart */}
        <RaptorScriptMenu onEnsureRaptor={() => setSource('raptor')} />

      </div>

      {/* Shared Timeframe bar (§7) — drives both TradingView and RAPTOR charts.
          The free space hosts the trader chips + the live trend signal beacon. */}
      <TimeframeBar
        middle={<>
          {/* Actionable widget launcher — fills the space the nice-to-know
              chips used to take; the chips collapse behind "Metrics". */}
          <button
            onClick={() => setWidgetsOpen(true)}
            title="Trader Widget Suite — actionable reads (pressure, trend, volume, S/R, hedge, risk, exposure) each with Trade · Auto Hedge · Exit All"
            className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
            style={{ color: '#4DD0E1', border: '1px solid rgba(77,208,225,0.5)', backgroundColor: 'rgba(77,208,225,0.1)' }}
          >
            🧩 WIDGETS
          </button>
          <button
            onClick={() => setChipsOpen((o) => !o)}
            title="Show/hide the nice-to-know metric chips (countdown, regime lights, spread, discipline, radar…)"
            className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
            style={{ color: chipsOpen ? '#FFB300' : 'rgba(255,255,255,0.45)', border: `1px solid ${chipsOpen ? 'rgba(255,179,0,0.4)' : 'rgba(255,255,255,0.15)'}` }}
          >
            📊 Metrics {chipsOpen ? '▾' : '▸'}
          </button>
          {chipsOpen && <EdgeChips ohlcvBuilder={ohlcvBuilder} />}
          {hedgeEnabled && (
            <button
              onClick={() => setHedgeOpen((o) => !o)}
              title="AI Correlation Hedging Engine — find, size and monitor portfolio hedges (estimates, never guarantees)"
              className="raptor-hedge-blink flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
            >
              ⇄ HEDGE
            </button>
          )}
          {scannerEnabled && (
            <button
              onClick={() => setScannerOpen((o) => !o)}
              title="Trade Scanner — ranked multi-market opportunities with full trade plans (analytical tools, never guarantees)"
              className="raptor-scan-blink flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
            >
              📡 SCAN
            </button>
          )}
          {emilEnabled && (
            <button
              onClick={() => openEmilCockpit()}
              title="EMIL — open the EMIL Control Cockpit (multi-agent market intelligence) in a new tab"
              className="raptor-emil-blink flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
            >
              🧠 EMIL
            </button>
          )}
          <button
            onClick={() => window.open('/terminal/abin', '_blank')}
            title="ABIN — Advanced Brokerage Intelligence Network: universal search, security masters, Calendar Pro, central-bank intelligence, entitlements (opens in a new tab)"
            className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
            style={{ color: '#29ABE2', border: '1px solid rgba(41,171,226,0.5)', backgroundColor: 'rgba(41,171,226,0.08)' }}
          >
            🛰 ABIN
          </button>
          <FlightCheck />
        </>}
        trailing={<>
          {/* TrendSignal leads the trailing cluster so the BUY/SELL beacon
              never gets pushed off-screen by the wider chip groups. */}
          <TrendSignal ohlcvBuilder={ohlcvBuilder} />
          <WorkspaceChip />
          <button onClick={() => window.open('/terminal/world', '_blank')}
            title="Global Market Command Center — interactive world map, Portfolio DNA, Digital Twin, News Studio, Watchdog, Memory Search (opens in a new tab)"
            className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
            style={{ color: '#29ABE2', border: '1px solid rgba(41,171,226,0.45)', backgroundColor: 'rgba(41,171,226,0.08)' }}>
            🌍 WORLD
          </button>
          {chipsOpen && <TraderChips ohlcvBuilder={ohlcvBuilder} />}
          {/* EAs / Robots — lives at the right end of the TF bar (replaces the
              old header placement that overflowed off-screen) */}
        {source === 'tradingview' && (
          <div className="relative ml-1" ref={eaMenuRef}>
            <button
              onClick={() => setEaMenuOpen(!eaMenuOpen)}
              className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
              style={headerBtnStyle('eas', eaMenuOpen)}
            >
              <Bot size={12} /> EAs / Robots <ChevronDown size={10} />
            </button>
            <HeaderPortal open={eaMenuOpen} anchorRef={eaMenuRef}>
              <div
                className="w-[340px] overflow-y-auto rounded-lg border shadow-2xl"
                style={{ maxHeight: 420, backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[10px] text-white/40">
                    Drag onto the chart or click Attach — runs on {activeSymbol}
                  </span>
                </div>
                {eaList.map((ea: EAConfig) => (
                  <div
                    key={ea.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', JSON.stringify(ea)); e.dataTransfer.effectAllowed = 'copy'; }}
                    className="flex items-start gap-2 border-b px-3 py-2 hover:bg-white/[0.03]"
                    style={{ borderColor: 'rgba(255,255,255,0.04)', cursor: 'grab' }}
                  >
                    <GripVertical size={12} className="mt-0.5 shrink-0 text-white/20" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[11px] font-bold text-white">{ea.name}</span>
                        {ea.custom && (
                          <span className="shrink-0 rounded px-1 text-[8px] font-bold uppercase" style={{ backgroundColor: 'rgba(0,194,122,0.15)', color: '#00C27A' }}>Custom</span>
                        )}
                        <span className="flex items-center gap-0.5 text-[9px] text-white/40">
                          <Star size={8} fill="currentColor" /> {ea.rating}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-white/40">{ea.description}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setInfoEa({ ...ea, builtin: !ea.custom, ...(ea.custom ? {} : { inputs: builtinInputsFor(ea.id, ea.strategyKind) }) } as unknown as CustomEA); setEaMenuOpen(false); }}
                      className="shrink-0 rounded px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide transition-colors"
                      style={{ backgroundColor: 'rgba(0,145,213,0.12)', color: '#0091D5', border: '1px solid rgba(0,145,213,0.3)' }}
                      title="EA Properties — Common, Inputs, source code"
                    >
                      Properties
                    </button>
                    {ea.custom && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeCustom(ea.id); }}
                        className="shrink-0 text-white/30 hover:text-red-400"
                        title="Remove custom EA"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    <button
                      onClick={() => { void attachEA(ea); setEaMenuOpen(false); }}
                      className="shrink-0 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wide transition-colors"
                      style={{ backgroundColor: 'rgba(0,194,122,0.15)', color: '#00C27A', border: '1px solid rgba(0,194,122,0.3)' }}
                    >
                      Attach
                    </button>
                  </div>
                ))}
                {/* Upload custom EA */}
                <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  {uploadMsg && (
                    <div className="mb-2 rounded-md px-2 py-1.5 text-[10px]" style={{
                      backgroundColor: uploadMsg.ok ? 'rgba(0,194,122,0.12)' : 'rgba(255,82,82,0.12)',
                      color: uploadMsg.ok ? '#00C27A' : '#FF5252',
                      border: `1px solid ${uploadMsg.ok ? 'rgba(0,194,122,0.3)' : 'rgba(255,82,82,0.3)'}`,
                    }}>
                      {uploadMsg.text}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".mq5,.ex5,.pine,.txt" className="hidden" onChange={onFileChosen} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-[11px] font-semibold transition-all hover:bg-[rgba(0,145,213,0.15)]"
                    style={{ border: '1px dashed rgba(0,145,213,0.3)', color: '#0091D5' }}
                  >
                    <Zap size={14} /> Upload Custom EA (.mq5, .ex5, .pine)
                  </button>
                </div>
              </div>
            </HeaderPortal>
          </div>
        )}
        </>}
      />

      {/* Chart row: the active chart and the optional Order/Account/Tools
          side panel share this row — both sit BELOW the header + TF bars. */}
      <div className="flex min-h-0 flex-1">

      {/* Active chart + shared EA overlays (min-w-0: shrink for the side panel) */}
      <div className="relative min-h-0 min-w-0 flex-1">
        {source === 'tradingview' ? (
          <TradingViewPanel />
        ) : (
          <ChartPanel ohlcvBuilder={ohlcvBuilder} isLiveData={isLiveData} />
        )}

        {/* Drop-catch overlay: keeps the drop out of the TV iframe */}
        {dragActive && source === 'tradingview' && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(6,13,22,0.45)', border: '2px dashed rgba(0,194,122,0.5)' }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={(e) => { e.stopPropagation(); handleEADrop(e); }}
            onDragLeave={() => setDragActive(false)}
          >
            <span className="rounded px-3 py-1.5 font-mono text-xs" style={{ backgroundColor: 'rgba(17,17,24,0.9)', color: '#00C27A', border: '1px solid rgba(0,194,122,0.4)' }}>
              Drop EA to attach to {activeSymbol}
            </span>
          </div>
        )}

        {/* Attached EA chips — pinned bottom-left, offset past the chart's
            watermark logo so they never collide with either chart's top
            toolbar (the TradingView tab has its own controls row up top). */}
        {symbolEAs.length > 0 && (
          <div className="absolute bottom-2 z-30 flex max-w-[70%] flex-wrap gap-1.5" style={{ left: 56 }}>
            {symbolEAs.map((a) => {
              const key = `${a.strategyId}-${a.symbol}`;
              const on = eaEnabled[key] ?? true;
              const accent = on ? '#00C27A' : 'rgba(255,255,255,0.35)';
              const info: EAInfo | null = infoKey === key ? (runtimeRef.current?.getInstanceInfo(key) ?? null) : null;
              return (
              <div
                key={`${a.instanceId ?? a.strategyId}-${a.symbol}`}
                className="relative flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono"
                style={{ backgroundColor: 'rgba(17,17,24,0.85)', border: `1px solid ${on ? 'rgba(0,194,122,0.3)' : 'rgba(255,255,255,0.15)'}`, color: accent }}
              >
                {/* Diagnostics popover — opens upward above the chip */}
                {infoKey === key && (
                  <div
                    className="absolute bottom-full left-0 z-50 mb-1 w-[220px] rounded-lg border p-2.5 text-[10px] shadow-2xl"
                    style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-bold text-white">{a.name}</span>
                      <span className="text-[8px] uppercase tracking-wide" style={{ color: accent }}>
                        {!on ? 'paused' : info?.hasPosition ? `in ${info?.direction ?? ''}` : 'scanning'}
                      </span>
                    </div>
                    <InfoRow k="Symbol" v={info?.symbol ?? a.symbol} />
                    <InfoRow k="Timeframe" v={info?.timeframe ?? '—'} />
                    <InfoRow k="Current signal" v={info?.direction ?? '—'} />
                    <InfoRow k="Open position" v={info?.hasPosition ? 'Yes' : 'None'} />
                    <InfoRow k="Trades" v={String(info?.trades ?? 0)} />
                    <InfoRow k="Magic #" v={String(info?.magic ?? '—')} />
                    <InfoRow k="Last execution" v={info?.lastBarTime ? new Date(info.lastBarTime * 1000).toLocaleTimeString() : '—'} />
                    <InfoRow k="Engine" v={a.strategyKind ?? 'built-in'} />
                    <InfoRow k="State" v={!on ? 'Disabled' : 'Enabled'} />
                  </div>
                )}
                <span className={`h-1.5 w-1.5 rounded-full ${on ? 'animate-pulse' : ''}`} style={{ backgroundColor: accent }} />
                {a.name}
                {(() => {
                  if (!on) return <span className="text-white/30">· paused</span>;
                  const s = eaStats[`${a.strategyId}-${a.symbol}`];
                  if (!s || s.trades === 0) return <span className="text-white/30">· scanning</span>;
                  return (
                    <span style={{ color: s.direction === 'SELL' ? '#FF5252' : '#00C27A' }}>
                      · {s.direction} · {s.trades} trade{s.trades > 1 ? 's' : ''}
                    </span>
                  );
                })()}
                {/* EA diagnostics */}
                <button
                  onClick={() => setInfoKey((k) => (k === key ? null : key))}
                  className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                  title="EA status & diagnostics"
                >
                  <Info size={11} />
                </button>
                {/* EA properties (runtime: lot / SL / TP / direction / presets) */}
                <button
                  onClick={() => setPropsFor(a)}
                  className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                  title="EA properties (lot, SL/TP, risk, presets)"
                >
                  <Settings2 size={11} />
                </button>
                {/* Full Properties window: declared Inputs + source code editor */}
                <button
                  onClick={() => {
                    const full = eaList.find((e) => e.id === a.strategyId);
                    if (full) setInfoEa({ ...full, builtin: !full.custom, ...(full.custom ? {} : { inputs: builtinInputsFor(full.id, full.strategyKind) }) } as unknown as CustomEA);
                  }}
                  className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                  title="EA Inputs & source code — full Properties window"
                >
                  <FileCode2 size={11} />
                </button>
                {/* Strategy tester */}
                <button
                  onClick={() => setTestFor(a)}
                  className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                  title="Strategy Tester — backtest this EA"
                >
                  <FlaskConical size={11} />
                </button>
                {/* Per-EA ON/OFF (independent of the global Algo switch) */}
                <button
                  onClick={() => toggleEA(a)}
                  className="ml-0.5 rounded px-1 text-[8px] font-bold uppercase transition-colors"
                  style={{ backgroundColor: on ? 'rgba(0,194,122,0.15)' : 'rgba(255,255,255,0.08)', color: accent, border: `1px solid ${on ? 'rgba(0,194,122,0.35)' : 'rgba(255,255,255,0.2)'}` }}
                  title={on ? 'EA is ON — click to disable' : 'EA is OFF — click to enable'}
                >
                  {on ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => restartEA(a)}
                  className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                  title="Restart EA — reset & re-scan"
                >
                  <RotateCcw size={10} />
                </button>
                <button
                  onClick={() => detachEA(a)}
                  className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                  title="Detach EA"
                >
                  ×
                </button>
              </div>
              );
            })}
            {symbolEAs.length > 1 && (
              <button
                onClick={clearAllEAs}
                className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono transition-colors hover:brightness-125"
                style={{ backgroundColor: 'rgba(17,17,24,0.85)', border: '1px solid rgba(255,82,82,0.35)', color: '#FF5252' }}
                title="Clear all EAs on this chart"
              >
                <Eraser size={10} /> Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Side panel (Order/Account/Tools) — below the header rows */}
      {sidePanel}
      </div>

      {/* EA Properties modal (§1) */}
      {propsFor && (() => {
        const info = runtimeRef.current?.getInstanceInfo(`${propsFor.strategyId}-${propsFor.symbol}`);
        return (
          <EAPropertiesModal
            eaName={propsFor.name}
            strategyId={propsFor.strategyId}
            symbol={propsFor.symbol}
            timeframe={info?.timeframe ?? '—'}
            magic={info?.magic ?? 0}
            engine={propsFor.strategyKind ?? 'built-in'}
            initial={buildEASettings(propsFor)}
            onApply={(full) => applyEASettings(propsFor, full)}
            onClose={() => setPropsFor(null)}
          />
        );
      })()}

      {/* Custom EA info panel (§16) */}
      {infoEa && <CustomEAInfoModal ea={infoEa} onClose={() => setInfoEa(null)} />}

      {/* Market Insights module — display-only overlay */}
      {insightsOpen && <InsightsPanel onClose={() => setInsightsOpen(false)} />}

      {/* Risk module — display-only overlay */}
      {riskOpen && <RiskPanel onClose={() => setRiskOpen(false)} />}

      {/* Trade Journal module — display-only overlay */}
      {journalOpen && <JournalPanel onClose={() => setJournalOpen(false)} />}

      {/* Trader Utility Widget Suite — actionable widget board */}
      {widgetsOpen && <WidgetHub open={widgetsOpen} onClose={() => setWidgetsOpen(false)} ohlcvBuilder={ohlcvBuilder} />}

      {/* AI Correlation Hedging Engine — trader-confirmed execution only */}
      {hedgeOpen && <HedgePanel ohlcvBuilder={ohlcvBuilder} onClose={() => setHedgeOpen(false)} />}

      {/* Global Trade Opportunity Scanner — signal-first, manual-confirm execution */}
      {scannerOpen && <ScannerPanel ohlcvBuilder={ohlcvBuilder} isLiveData={isLiveData} onClose={() => setScannerOpen(false)} />}


      {/* Mandatory EA risk disclaimer — blocks attach until accepted */}
      {disclaimerFor && (
        <EADisclaimerModal
          eaName={disclaimerFor.name}
          environment={activeAccountId ? 'Live' : 'Demo'}
          account={activeAccountId ? `…${String(activeAccountId).slice(-6)}` : 'Local demo'}
          onCancel={() => setDisclaimerFor(null)}
          onAccept={() => {
            const ea = disclaimerFor;
            recordDisclaimerAcceptance({ eaId: ea.id, eaName: ea.name, environment: activeAccountId ? 'live' : 'demo', symbol: activeSymbol });
            setDisclaimerFor(null);
            void attachEA(ea, true);
          }}
        />
      )}

      {/* Strategy Tester modal (§11) */}
      {testFor && (() => {
        const key = `${testFor.strategyId}-${testFor.symbol}`;
        const info = runtimeRef.current?.getInstanceInfo(key);
        const resolution = (info?.timeframe ?? '15') as Resolution;
        const bars = ohlcvRef.current ? ohlcvRef.current.getAllBars(testFor.symbol, resolution) : [];
        const settings = runtimeRef.current?.getInstanceSettings(key) ?? { lot: 0.01, slAtrMult: 2, tpAtrMult: 3, direction: 'both' as const };
        return (
          <StrategyTesterModal
            eaName={testFor.name}
            symbol={testFor.symbol}
            timeframe={resolution}
            bars={bars}
            strategyId={testFor.strategyId}
            strategyKind={testFor.strategyKind as StrategyKind | undefined}
            settings={settings}
            onClose={() => setTestFor(null)}
            onApplySettings={(s) => {
              runtimeRef.current?.setInstanceSettings(key, s);
              showEAToast(`Optimized settings applied to "${testFor.name}" — SL ${s.slAtrMult}×ATR / TP ${s.tpAtrMult}×ATR`);
            }}
          />
        );
      })()}
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-white/35">{k}</span>
      <span className="font-semibold text-white/85">{v}</span>
    </div>
  );
}
