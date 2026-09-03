'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Pencil, ArrowUpDown, Mail, FileText, ArrowLeftRight, Clock, Settings } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import { formatPrice, formatPnL, formatLot, cn } from '@/lib/utils/format';
import type { Position, Order } from '@/types/trading';
import EditOrderModal from './EditOrderModal';
import {
  setHedgeAutoOn, isHedgeAutoConsented, recordHedgeAutoConsent,
  setPositionHedgeEligible, positionEffectivelyHedged, loadHedgeAutoParams,
  hedgeAutoLog, HEDGE_AUTO_DISCLAIMER,
} from '@/lib/trading/hedge-auto';

type TabKey = 'positions' | 'pending' | 'history' | 'inbox' | 'logs';

function getDecimals(symbol: string): number {
  if (symbol === 'USDJPY') return 3;
  if (symbol.startsWith('XAU')) return 2;
  if (symbol.startsWith('BTC') || symbol === 'US30' || symbol === 'NAS100') return 1;
  if (symbol.startsWith('ETH')) return 2;
  return 5;
}

function calcFloatingPnl(pos: Position, currentBid: number, currentAsk: number): number {
  const closePrice = pos.direction === 'BUY' ? currentBid : currentAsk;
  if (!closePrice || closePrice <= 0) return pos.floating_pnl;

  const contractSize = 100000;
  let pnl: number;
  if (pos.direction === 'BUY') {
    pnl = (closePrice - pos.open_price) * pos.size * contractSize;
  } else {
    pnl = (pos.open_price - closePrice) * pos.size * contractSize;
  }

  if (pos.symbol === 'USDJPY' || pos.symbol.endsWith('JPY')) {
    pnl = pnl / 100;
  }
  if (pos.symbol.startsWith('XAU')) {
    pnl = (pos.direction === 'BUY' ? closePrice - pos.open_price : pos.open_price - closePrice) * pos.size * 100;
  }

  return pnl;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function calcPnlPercent(pnl: number, entryValue: number): string {
  if (entryValue === 0) return '0.00';
  return ((pnl / entryValue) * 100).toFixed(2);
}

/* ---------- inline styles ---------- */
const S = {
  headerBg: '#111118',
  tableBg: '#060D16',
  rowHover: 'rgba(255,255,255,0.02)',
  rowAltBg: 'rgba(255,255,255,0.015)',
  border: 'rgba(255,255,255,0.06)',
  accentBlue: '#0091D5',
  green: '#22c55e',
  red: '#ef4444',
  textDim: 'rgba(255,255,255,0.35)',
  textMuted: 'rgba(255,255,255,0.50)',
} as const;

// Use minmax + fr so columns stretch to fill the full panel width
// #  TIME  TYPE  SYMBOL  LOT  ENTRY_PRICE  [ENTRY_VALUE]  S/L  T/P  MARKET_PRICE  [MARKET_VALUE]  [COMMISSION]  PROFIT/LOSS  [P/L%]  ACTIONS  [REMARK]
const fr = (min: number) => `minmax(${min}px, 1fr)`;

const BASE_COLS = `40px ${fr(70)} ${fr(52)} ${fr(80)} ${fr(60)} ${fr(90)}`;
const OPT_COLS: { key: string; width: string }[] = [
  { key: 'entryValue', width: fr(90) },
];
const MID_COLS = `${fr(60)} ${fr(60)} ${fr(90)}`;
const OPT_COLS2: { key: string; width: string }[] = [
  { key: 'marketValue', width: fr(90) },
  { key: 'commission', width: fr(80) },
];
const PNL_COL = fr(90);
const OPT_COLS3: { key: string; width: string }[] = [
  { key: 'pnlPct', width: fr(60) },
];
const AHEDGE_COL = fr(62);
const ACTIONS_COL = fr(70);
const OPT_COLS4: { key: string; width: string }[] = [
  { key: 'remark', width: '1fr' },
];

function buildColTemplate(visible: Set<string>): string {
  const parts = [BASE_COLS];
  for (const c of OPT_COLS) { if (visible.has(c.key)) parts.push(c.width); }
  parts.push(MID_COLS);
  for (const c of OPT_COLS2) { if (visible.has(c.key)) parts.push(c.width); }
  parts.push(PNL_COL);
  for (const c of OPT_COLS3) { if (visible.has(c.key)) parts.push(c.width); }
  parts.push(AHEDGE_COL);
  parts.push(ACTIONS_COL);
  for (const c of OPT_COLS4) { if (visible.has(c.key)) parts.push(c.width); }
  return parts.join(' ');
}
const histColTemplate =
  `40px ${fr(70)} ${fr(52)} ${fr(80)} ${fr(60)} ${fr(90)} ${fr(90)} ${fr(60)} ${fr(60)} ${fr(60)} ${fr(90)} ${fr(60)} 1fr`;

export default function PositionsPanel() {
  const {
    activeAccountId,
    prices,
    refreshPositions,
    setPositions,
    setPendingOrders,
    setAccountSummary,
    triggerRefresh,
  } = useTradingStore();

  const [activeTab, setActiveTab] = useState<TabKey>('positions');
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrdersLocal] = useState<Order[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [livePnl, setLivePnl] = useState<Record<string, number>>({});
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [showTableSettings, setShowTableSettings] = useState(false);
  // Per-position Auto Hedge toggle (disclaimer-gated) — re-render key.
  const [hedgeGatePos, setHedgeGatePos] = useState<Position | null>(null);
  const [hedgeTyped, setHedgeTyped] = useState('');
  const [, setHedgeTick] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(['entryValue', 'marketValue', 'pnlPct', 'commission', 'remark'])
  );
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowTableSettings(false);
      }
    }
    if (showTableSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTableSettings]);

  function toggleColumn(col: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  }

  const colTemplate = buildColTemplate(visibleColumns);

  const loadData = useCallback(async () => {
    if (!activeAccountId) {
      setOpenPositions([]);
      setPendingOrdersLocal([]);
      setTradeHistory([]);
      return;
    }

    setIsLoading(true);
    try {
      const [positions, orders, history, summary] = await Promise.all([
        orderService.getOpenPositions(activeAccountId),
        orderService.getPendingOrders(activeAccountId),
        orderService.getTradeHistory(activeAccountId),
        orderService.getAccountSummary(activeAccountId),
      ]);

      const positionsData = (positions ?? []) as Position[];
      const ordersData = (orders ?? []) as Order[];
      const historyData = (history ?? []) as Position[];

      setOpenPositions(positionsData);
      setPositions(positionsData);
      setPendingOrdersLocal(ordersData);
      setPendingOrders(ordersData);
      setTradeHistory(historyData);

      if (summary?.success) {
        setAccountSummary({
          balance: summary.balance,
          equity: summary.equity,
          margin_used: summary.margin_used,
          free_margin: summary.free_margin,
          margin_level_pct: summary.margin_level_pct,
          floating_pnl: summary.floating_pnl,
          open_positions_count: summary.open_positions_count,
        });
      }
    } catch (err) {
      console.error('Failed to load trading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccountId, setPositions, setPendingOrders, setAccountSummary]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshPositions]);

  // Poll every 15s so trades placed in OTHER windows (EMIL pilot, standalone
  // Scan & Trade / Hedge & Trade tabs) reflect here without a manual refresh.
  useEffect(() => {
    const id = setInterval(loadData, 15_000);
    return () => clearInterval(id);
  }, [loadData]);

  const prevPricesRef = useRef(prices);
  useEffect(() => {
    if (openPositions.length === 0) return;
    if (prevPricesRef.current === prices) return;
    prevPricesRef.current = prices;

    const updated: Record<string, number> = {};
    for (const pos of openPositions) {
      const tick = prices[pos.symbol];
      if (tick) {
        updated[pos.id] = calcFloatingPnl(pos, tick.bid, tick.ask);
      } else {
        updated[pos.id] = pos.floating_pnl;
      }
    }
    setLivePnl(updated);
  }, [prices, openPositions]);

  function getPnl(pos: Position): number {
    return livePnl[pos.id] ?? pos.floating_pnl;
  }

  const totalProfit = openPositions.reduce((s, p) => s + getPnl(p), 0);
  const totalCommission = openPositions.reduce((s, p) => s + (p.commission ?? 0), 0);

  async function handleClosePosition(pos: Position) {
    const tick = prices[pos.symbol];
    const closePrice = pos.direction === 'BUY' ? tick?.bid : tick?.ask;
    if (!closePrice || closePrice <= 0) {
      setFeedback({ type: 'error', message: 'No price available to close position' });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    setClosingId(pos.id);
    setFeedback(null);
    try {
      const result = await orderService.closePosition(pos.id, closePrice);
      if (result?.success) {
        setFeedback({
          type: 'success',
          message: `Closed ${pos.symbol} ${pos.direction} @ ${formatPrice(closePrice, getDecimals(pos.symbol))} | PnL: ${formatPnL(result.realized_pnl)}`,
        });
        triggerRefresh();
      } else {
        setFeedback({ type: 'error', message: result?.error || 'Failed to close position' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error closing position';
      setFeedback({ type: 'error', message });
    } finally {
      setClosingId(null);
      setTimeout(() => setFeedback(null), 5000);
    }
  }

  async function handleCancelOrder(orderId: string) {
    setCancellingId(orderId);
    setFeedback(null);
    try {
      const result = await orderService.cancelOrder(orderId);
      if (result?.success) {
        setFeedback({ type: 'success', message: 'Order cancelled' });
        triggerRefresh();
      } else {
        setFeedback({ type: 'error', message: result?.error || 'Failed to cancel order' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error cancelling order';
      setFeedback({ type: 'error', message });
    } finally {
      setCancellingId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  /* ---------- sort helpers ---------- */
  function sortedPositions(): Position[] {
    if (!sortField) return openPositions;
    const arr = [...openPositions];
    arr.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      switch (sortField) {
        case 'time': va = a.opened_at; vb = b.opened_at; break;
        case 'type': va = a.direction; vb = b.direction; break;
        case 'symbol': va = a.symbol; vb = b.symbol; break;
        case 'size': va = a.size; vb = b.size; break;
        case 'entry': va = a.open_price; vb = b.open_price; break;
        case 'sl': va = a.sl ?? 0; vb = b.sl ?? 0; break;
        case 'tp': va = a.tp ?? 0; vb = b.tp ?? 0; break;
        case 'commission': va = a.commission ?? 0; vb = b.commission ?? 0; break;
        case 'pnl': va = getPnl(a); vb = getPnl(b); break;
        default: return 0;
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return arr;
  }

  function sortedHistory(): Position[] {
    if (!sortField) return tradeHistory;
    const arr = [...tradeHistory];
    arr.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      switch (sortField) {
        case 'time': va = a.opened_at; vb = b.opened_at; break;
        case 'type': va = a.direction; vb = b.direction; break;
        case 'symbol': va = a.symbol; vb = b.symbol; break;
        case 'size': va = a.size; vb = b.size; break;
        case 'entry': va = a.open_price; vb = b.open_price; break;
        case 'pnl': va = a.realized_pnl ?? 0; vb = b.realized_pnl ?? 0; break;
        default: return 0;
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return arr;
  }

  /* ---------- column header component ---------- */
  function ColHeader({ label, field, align }: { label: string; field?: string; align?: 'right' | 'center' }) {
    return (
      <span
        className={cn(
          'flex items-center gap-0.5 select-none',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center',
          field && 'cursor-pointer hover:opacity-80'
        )}
        onClick={field ? () => handleSort(field) : undefined}
      >
        {label}
        {field && <ArrowUpDown size={8} style={{ opacity: sortField === field ? 0.9 : 0.3 }} />}
      </span>
    );
  }

  /* ---------- tab config ---------- */
  const tabItems: { key: TabKey; label: string; count?: number; icon?: React.ReactNode }[] = [
    { key: 'positions', label: 'Order', count: openPositions.length, icon: <ArrowLeftRight size={10} /> },
    { key: 'pending', label: 'Pending', count: pendingOrders.length, icon: <Clock size={10} /> },
    { key: 'history', label: 'History', icon: <FileText size={10} /> },
    { key: 'inbox', label: 'Inbox', icon: <Mail size={10} /> },
    { key: 'logs', label: 'Logs', icon: <FileText size={10} /> },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: S.tableBg }}>
      {/* ===== HEADER BAR ===== */}
      <div
        className="flex items-center shrink-0"
        style={{
          background: S.headerBg,
          borderBottom: `1px solid ${S.border}`,
          height: 36,
        }}
      >
        {/* Tabs on left */}
        <div className="flex items-center h-full">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 h-full text-[13px] font-semibold uppercase tracking-wider transition-colors"
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: isActive ? `2px solid ${S.accentBlue}` : '2px solid transparent',
                  background: isActive ? 'rgba(41,171,226,0.06)' : 'transparent',
                }}
              >
                {tab.icon && <span style={{ opacity: isActive ? 1 : 0.5 }}>{tab.icon}</span>}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0 rounded-sm font-bold"
                    style={{
                      background: isActive ? S.accentBlue : 'rgba(255,255,255,0.08)',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Centered title */}
        <div className="flex-1 flex justify-center">
          <span
            className="text-[14px] font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--text-muted)', fontWeight: 600 }}
          >
            Order Desk
          </span>
        </div>

        {/* Table Settings */}
        <div className="flex items-center pr-3 relative" ref={settingsRef} style={{ width: 120, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowTableSettings((p) => !p)}
            className="flex items-center justify-center rounded transition-colors"
            style={{
              width: 28,
              height: 28,
              color: showTableSettings ? '#0091D5' : 'rgba(255,255,255,0.4)',
              backgroundColor: showTableSettings ? 'rgba(41,171,226,0.1)' : 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0091D5'; }}
            onMouseLeave={(e) => { if (!showTableSettings) e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
            title="Table Settings"
          >
            <Settings size={14} />
          </button>

          {showTableSettings && (
            <div
              className="fixed rounded-lg shadow-2xl py-3 px-4"
              style={{
                bottom: window.innerHeight - (settingsRef.current?.getBoundingClientRect().top ?? 0) + 4,
                right: window.innerWidth - (settingsRef.current?.getBoundingClientRect().right ?? 0),
                zIndex: 9999,
                backgroundColor: '#111118',
                border: '1px solid rgba(255,255,255,0.08)',
                minWidth: 220,
              }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#0091D5' }}>
                Table Settings
              </div>
              <div className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Customize your table display
              </div>
              {[
                { key: 'entryValue', label: 'Entry Value' },
                { key: 'marketValue', label: 'Market Value' },
                { key: 'pnlPct', label: 'P/L in %' },
                { key: 'swap', label: 'Swap' },
                { key: 'commission', label: 'Commission' },
                { key: 'remark', label: 'Remark' },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 py-1.5 cursor-pointer text-[12px] transition-colors hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(opt.key)}
                    onChange={() => toggleColumn(opt.key)}
                    className="rounded"
                    style={{ accentColor: '#0091D5', width: 14, height: 14 }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== FEEDBACK ===== */}
      {feedback && (
        <div
          className="text-[12px] px-3 py-1.5 font-medium"
          style={{
            background: feedback.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: feedback.type === 'success' ? S.green : S.red,
            borderBottom: `1px solid ${S.border}`,
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* ===== CONTENT ===== */}
      <div className="flex-1 overflow-auto">
        {isLoading && openPositions.length === 0 && (
          <div
            className="flex items-center justify-center h-32 text-[12px]"
            style={{ color: S.textDim }}
          >
            Loading...
          </div>
        )}

        {/* ---------- POSITIONS TAB ---------- */}
        {activeTab === 'positions' && (
          <>
            {openPositions.length === 0 && !isLoading ? (
              <div
                className="flex items-center justify-center h-32 text-[12px]"
                style={{ color: S.textDim }}
              >
                {activeAccountId ? 'No open positions' : 'Select a trading account'}
              </div>
            ) : (
              <>
                {/* Table header */}
                <div
                  className="grid gap-0 px-2 text-[11px] uppercase tracking-wider font-semibold sticky top-0 z-10"
                  style={{
                    gridTemplateColumns: colTemplate,
                    background: S.headerBg,
                    borderBottom: `1px solid ${S.border}`,
                    color: S.textDim,
                    height: 28,
                    alignItems: 'center',
                  }}
                >
                  <ColHeader label="#" />
                  <ColHeader label="Time" field="time" />
                  <ColHeader label="Type" field="type" />
                  <ColHeader label="Symbol" field="symbol" />
                  <ColHeader label="Lot Size" field="size" align="right" />
                  <ColHeader label="Entry Price" field="entry" align="right" />
                  {visibleColumns.has('entryValue') && <ColHeader label="Entry Value" align="right" />}
                  <ColHeader label="S/L" field="sl" align="right" />
                  <ColHeader label="T/P" field="tp" align="right" />
                  <ColHeader label="Market Price" align="right" />
                  {visibleColumns.has('marketValue') && <ColHeader label="Market Value" align="right" />}
                  {visibleColumns.has('commission') && <ColHeader label="Commission" field="commission" align="right" />}
                  <ColHeader label="Profit/Loss" field="pnl" align="right" />
                  {visibleColumns.has('pnlPct') && <ColHeader label="P/L in %" align="right" />}
                  <ColHeader label="A-Hedge" align="center" />
                  <ColHeader label="Actions" align="center" />
                  {visibleColumns.has('remark') && <ColHeader label="Remark" />}
                </div>

                {/* Position rows */}
                {sortedPositions().map((pos, idx) => {
                  const dec = getDecimals(pos.symbol);
                  const pnl = getPnl(pos);
                  const isProfitable = pnl >= 0;
                  const tick = prices[pos.symbol];
                  const currentPrice = pos.direction === 'BUY'
                    ? (tick?.bid ?? pos.current_price)
                    : (tick?.ask ?? pos.current_price);
                  const entryValue = pos.open_price * pos.size * 100000;
                  const marketValue = currentPrice * pos.size * 100000;
                  const pnlPct = calcPnlPercent(pnl, entryValue);
                  const isAlt = idx % 2 === 1;

                  return (
                    <div
                      key={pos.id}
                      className="grid gap-0 px-2 text-[12px] transition-colors"
                      style={{
                        gridTemplateColumns: colTemplate,
                        borderBottom: `1px solid ${S.border}`,
                        background: isAlt ? S.rowAltBg : 'transparent',
                        height: 32,
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = S.rowHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isAlt ? S.rowAltBg : 'transparent'; }}
                    >
                      {/* # */}
                      <span style={{ color: S.textMuted, fontFamily: 'monospace', fontSize: 10 }}>
                        {idx + 1}
                      </span>

                      {/* TIME */}
                      <span style={{ color: S.textMuted, fontFamily: 'monospace', fontSize: 10 }}>
                        {formatTime(pos.opened_at)}
                      </span>

                      {/* TYPE */}
                      <span
                        className="font-bold text-[12px]"
                        style={{ color: pos.direction === 'BUY' ? S.green : S.red }}
                      >
                        {pos.direction === 'BUY' ? 'Buy' : 'Sell'}
                      </span>

                      {/* SYMBOL (+ source badge: EMIL / Scanner / Hedge / EA trades are labelled) */}
                      <span className="font-semibold text-[11px]" style={{ color: '#fff' }}>
                        {pos.symbol}
                        {(() => {
                          const c = String((pos as unknown as { comment?: string | null }).comment ?? '');
                          const badge = c.startsWith('EMIL') ? { t: '🧠 EMIL', color: '#FFD54F' }
                            : c.startsWith('Scanner') ? { t: '📡 SCAN', color: '#29ABE2' }
                            : c.startsWith('Hedge') ? { t: '⇄ HEDGE', color: '#CE93D8' }
                            : c.startsWith('EA:') ? { t: '🤖 EA', color: '#00C27A' }
                            : null;
                          return badge ? (
                            <span className="ml-1.5 rounded px-1 py-[1px] align-middle text-[8px] font-bold"
                              style={{ backgroundColor: `${badge.color}1F`, color: badge.color, border: `1px solid ${badge.color}55` }}
                              title={`Placed by ${badge.t.slice(2).trim()} — comment: ${c}`}>
                              {badge.t}
                            </span>
                          ) : null;
                        })()}
                      </span>

                      {/* LOT SIZE */}
                      <span className="text-right" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                        {formatLot(pos.size)}
                      </span>

                      {/* ENTRY PRICE */}
                      <span className="text-right" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>
                        {formatPrice(pos.open_price, dec)}
                      </span>

                      {/* ENTRY VALUE */}
                      {visibleColumns.has('entryValue') && (
                        <span className="text-right" style={{ fontFamily: 'monospace', color: S.textMuted, fontSize: 10 }}>
                          {entryValue.toFixed(2)}
                        </span>
                      )}

                      {/* S/L */}
                      <span className="text-right flex items-center justify-end gap-0.5" style={{ fontFamily: 'monospace', color: S.textMuted }}>
                        {pos.sl ? formatPrice(pos.sl, dec) : '--'}
                        <Pencil size={8} style={{ opacity: 0.3, cursor: 'pointer', flexShrink: 0 }} />
                      </span>

                      {/* T/P */}
                      <span className="text-right flex items-center justify-end gap-0.5" style={{ fontFamily: 'monospace', color: S.textMuted }}>
                        {pos.tp ? formatPrice(pos.tp, dec) : '--'}
                        <Pencil size={8} style={{ opacity: 0.3, cursor: 'pointer', flexShrink: 0 }} />
                      </span>

                      {/* MARKET PRICE */}
                      <span className="text-right" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>
                        {formatPrice(currentPrice, dec)}
                      </span>

                      {/* MARKET VALUE */}
                      {visibleColumns.has('marketValue') && (
                        <span className="text-right" style={{ fontFamily: 'monospace', color: S.textMuted, fontSize: 10 }}>
                          {marketValue.toFixed(2)}
                        </span>
                      )}

                      {/* COMMISSION */}
                      {visibleColumns.has('commission') && (
                        <span className="text-right" style={{ fontFamily: 'monospace', color: S.textMuted }}>
                          {(pos.commission ?? 0).toFixed(2)}
                        </span>
                      )}

                      {/* PROFIT/LOSS */}
                      <span
                        className="text-right font-bold"
                        style={{ fontFamily: 'monospace', color: isProfitable ? S.green : S.red }}
                      >
                        {formatPnL(pnl)}
                      </span>

                      {/* P/L IN % */}
                      {visibleColumns.has('pnlPct') && (
                        <span
                          className="text-right font-bold text-[11px]"
                          style={{ fontFamily: 'monospace', color: isProfitable ? S.green : S.red }}
                        >
                          {isProfitable ? '+' : ''}{pnlPct}%
                        </span>
                      )}

                      {/* A-HEDGE — per-position Auto Hedge toggle (disclaimer-gated).
                          Hedge legs themselves are never re-hedged. */}
                      <span className="flex items-center justify-center">
                        {(() => {
                          const isHedgeLeg = String((pos as unknown as { comment?: string | null }).comment ?? '').toLowerCase().startsWith('hedgeauto');
                          if (isHedgeLeg) {
                            return <span className="text-[8px] font-bold" style={{ color: '#CE93D8' }} title="This IS an Auto Hedge leg — it is managed by its basket and never re-hedged.">LEG</span>;
                          }
                          const effectiveOn = positionEffectivelyHedged(pos.id, pos.symbol);
                          return (
                            <button
                              onClick={() => {
                                if (effectiveOn) {
                                  setPositionHedgeEligible(pos.id, false);   // explicit per-position exclude
                                  hedgeAutoLog('toggle', `A-Hedge OFF for ${pos.symbol} position ${pos.id} (positions panel)`);
                                  setHedgeTick((t) => t + 1);
                                } else {
                                  setHedgeGatePos(pos);
                                }
                              }}
                              className="relative rounded-full transition-colors"
                              style={{ width: 30, height: 15, backgroundColor: effectiveOn ? '#00E5A0' : 'rgba(255,255,255,0.14)' }}
                              title={effectiveOn
                                ? `Auto Hedge is protecting this position (hedges after $${loadHedgeAutoParams().activationLossUsd} loss) — click to exclude it`
                                : 'Enable Auto Hedge protection for this position — disclaimer applies'}
                            >
                              <span className="absolute top-[2px] rounded-full bg-white transition-all" style={{ width: 11, height: 11, left: effectiveOn ? 17 : 2 }} />
                            </button>
                          );
                        })()}
                      </span>

                      {/* ACTIONS */}
                      <span className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleClosePosition(pos)}
                          disabled={closingId === pos.id}
                          className="flex items-center justify-center transition-colors"
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 3,
                            opacity: closingId === pos.id ? 0.2 : 0.4,
                            cursor: closingId === pos.id ? 'not-allowed' : 'pointer',
                            color: '#fff',
                          }}
                          onMouseEnter={(e) => { if (closingId !== pos.id) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = S.red; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = '#fff'; }}
                          title="Close position"
                        >
                          <X size={12} />
                        </button>
                        <button
                          onClick={() => setEditingPosition(pos)}
                          className="flex items-center justify-center transition-colors"
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 3,
                            opacity: 0.4,
                            cursor: 'pointer',
                            color: '#fff',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = S.accentBlue; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = '#fff'; }}
                          title="Edit SL/TP"
                        >
                          <Pencil size={10} />
                        </button>
                      </span>

                      {/* REMARK — editable */}
                      {visibleColumns.has('remark') && (
                        <input
                          type="text"
                          placeholder="Add note..."
                          defaultValue=""
                          className="bg-transparent outline-none w-full"
                          style={{
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: 10,
                            fontFamily: 'monospace',
                            border: 'none',
                            borderBottom: '1px solid transparent',
                            padding: '1px 4px',
                            transition: 'border-color 0.15s',
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderBottomColor = S.accentBlue; }}
                          onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Summary row */}
                {openPositions.length > 0 && (
                  <div
                    className="grid gap-0 px-2 text-[11px] font-bold"
                    style={{
                      gridTemplateColumns: colTemplate,
                      borderTop: `1px solid ${S.border}`,
                      background: S.headerBg,
                      height: 28,
                      alignItems: 'center',
                    }}
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    {visibleColumns.has('entryValue') && <span />}
                    <span />
                    <span />
                    <span />
                    {visibleColumns.has('marketValue') && <span />}
                    {visibleColumns.has('commission') && (
                      <span className="text-right" style={{ fontFamily: 'monospace', color: S.textMuted }}>
                        {totalCommission.toFixed(2)}
                      </span>
                    )}
                    <span
                      className="text-right"
                      style={{ fontFamily: 'monospace', color: totalProfit >= 0 ? S.green : S.red }}
                    >
                      {formatPnL(totalProfit)}
                    </span>
                    {visibleColumns.has('pnlPct') && <span />}
                    <span />
                    <span />
                    {visibleColumns.has('remark') && <span style={{ color: S.textDim, fontSize: 9 }}>TOTAL</span>}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ---------- PENDING ORDERS TAB ---------- */}
        {activeTab === 'pending' && (
          <>
            {pendingOrders.length === 0 ? (
              <div
                className="flex items-center justify-center h-32 text-[12px]"
                style={{ color: S.textDim }}
              >
                No pending orders
              </div>
            ) : (
              <>
                <div
                  className="grid gap-0 px-2 text-[11px] uppercase tracking-wider font-semibold sticky top-0 z-10"
                  style={{
                    gridTemplateColumns: 'minmax(40px,1fr) minmax(70px,1fr) minmax(52px,1fr) minmax(80px,1fr) minmax(58px,1fr) minmax(90px,1fr) minmax(72px,1fr) minmax(72px,1fr) minmax(68px,1fr) minmax(42px,0.5fr)',
                    background: S.headerBg,
                    borderBottom: `1px solid ${S.border}`,
                    color: S.textDim,
                    height: 28,
                    alignItems: 'center',
                  }}
                >
                  <span>#</span>
                  <span>Time</span>
                  <span>Type</span>
                  <span>Symbol</span>
                  <span className="text-right">Size</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">S/L</span>
                  <span className="text-right">T/P</span>
                  <span>Status</span>
                  <span className="text-center">Act</span>
                </div>

                {pendingOrders.map((ord, idx) => {
                  const dec = getDecimals(ord.symbol);
                  const isAlt = idx % 2 === 1;
                  return (
                    <div
                      key={ord.id}
                      className="grid gap-0 px-2 text-[12px] transition-colors"
                      style={{
                        gridTemplateColumns: 'minmax(40px,1fr) minmax(70px,1fr) minmax(52px,1fr) minmax(80px,1fr) minmax(58px,1fr) minmax(90px,1fr) minmax(72px,1fr) minmax(72px,1fr) minmax(68px,1fr) minmax(42px,0.5fr)',
                        borderBottom: `1px solid ${S.border}`,
                        background: isAlt ? S.rowAltBg : 'transparent',
                        height: 32,
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = S.rowHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isAlt ? S.rowAltBg : 'transparent'; }}
                    >
                      <span style={{ color: S.textMuted, fontFamily: 'monospace', fontSize: 10 }}>{idx + 1}</span>
                      <span style={{ color: S.textMuted, fontFamily: 'monospace', fontSize: 10 }}>
                        {formatTime(ord.created_at)}
                      </span>
                      <span
                        className="font-bold text-[12px]"
                        style={{ color: ord.direction === 'BUY' ? S.green : S.red }}
                      >
                        {ord.direction === 'BUY' ? 'Buy' : 'Sell'}
                      </span>
                      <span className="font-semibold" style={{ color: '#fff' }}>{ord.symbol}</span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                        {formatLot(ord.requested_size)}
                      </span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>
                        {ord.requested_price ? formatPrice(ord.requested_price, dec) : '--'}
                      </span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: S.textMuted }}>
                        {ord.sl ? formatPrice(ord.sl, dec) : '--'}
                      </span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: S.textMuted }}>
                        {ord.tp ? formatPrice(ord.tp, dec) : '--'}
                      </span>
                      <span className="capitalize text-[9px]" style={{ color: S.textMuted }}>
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                      <span className="flex items-center justify-center">
                        <button
                          onClick={() => handleCancelOrder(ord.id)}
                          disabled={cancellingId === ord.id}
                          className="flex items-center justify-center transition-colors"
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 3,
                            opacity: cancellingId === ord.id ? 0.2 : 0.4,
                            cursor: cancellingId === ord.id ? 'not-allowed' : 'pointer',
                            color: '#fff',
                          }}
                          onMouseEnter={(e) => { if (cancellingId !== ord.id) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = S.red; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = '#fff'; }}
                          title="Cancel order"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ---------- HISTORY TAB ---------- */}
        {activeTab === 'history' && (
          <>
            {tradeHistory.length === 0 ? (
              <div
                className="flex items-center justify-center h-32 text-[12px]"
                style={{ color: S.textDim }}
              >
                No trade history available
              </div>
            ) : (
              <>
                <div
                  className="grid gap-0 px-2 text-[11px] uppercase tracking-wider font-semibold sticky top-0 z-10"
                  style={{
                    gridTemplateColumns: histColTemplate,
                    background: S.headerBg,
                    borderBottom: `1px solid ${S.border}`,
                    color: S.textDim,
                    height: 28,
                    alignItems: 'center',
                  }}
                >
                  <ColHeader label="#" />
                  <ColHeader label="Time" field="time" />
                  <ColHeader label="Type" field="type" />
                  <ColHeader label="Symbol" field="symbol" />
                  <ColHeader label="Lot Size" field="size" align="right" />
                  <ColHeader label="Entry" field="entry" align="right" />
                  <ColHeader label="Close" align="right" />
                  <ColHeader label="S/L" align="right" />
                  <ColHeader label="T/P" align="right" />
                  <ColHeader label="Commission" align="right" />
                  <ColHeader label="P/L" field="pnl" align="right" />
                  <ColHeader label="P/L %" align="right" />
                  <ColHeader label="Closed" align="right" />
                </div>

                {sortedHistory().map((pos, idx) => {
                  const dec = getDecimals(pos.symbol);
                  const pnl = pos.realized_pnl ?? 0;
                  const isProfitable = pnl >= 0;
                  const entryValue = pos.open_price * pos.size * 100000;
                  const pnlPct = calcPnlPercent(pnl, entryValue);
                  const closedDate = pos.closed_at
                    ? new Date(pos.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '--';
                  const isAlt = idx % 2 === 1;

                  return (
                    <div
                      key={pos.id}
                      className="grid gap-0 px-2 text-[12px] transition-colors"
                      style={{
                        gridTemplateColumns: histColTemplate,
                        borderBottom: `1px solid ${S.border}`,
                        background: isAlt ? S.rowAltBg : 'transparent',
                        height: 32,
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = S.rowHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isAlt ? S.rowAltBg : 'transparent'; }}
                    >
                      <span style={{ color: S.textMuted, fontFamily: 'monospace', fontSize: 10 }}>{idx + 1}</span>
                      <span style={{ color: S.textMuted, fontFamily: 'monospace', fontSize: 10 }}>
                        {formatTime(pos.opened_at)}
                      </span>
                      <span
                        className="font-bold text-[12px]"
                        style={{ color: pos.direction === 'BUY' ? S.green : S.red }}
                      >
                        {pos.direction === 'BUY' ? 'Buy' : 'Sell'}
                      </span>
                      <span className="font-semibold" style={{ color: '#fff' }}>{pos.symbol}</span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                        {formatLot(pos.size)}
                      </span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>
                        {formatPrice(pos.open_price, dec)}
                      </span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>
                        {pos.close_price ? formatPrice(pos.close_price, dec) : '--'}
                      </span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: S.textMuted }}>
                        {pos.sl ? formatPrice(pos.sl, dec) : '--'}
                      </span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: S.textMuted }}>
                        {pos.tp ? formatPrice(pos.tp, dec) : '--'}
                      </span>
                      <span className="text-right" style={{ fontFamily: 'monospace', color: S.textMuted }}>
                        {(pos.commission ?? 0).toFixed(2)}
                      </span>
                      <span
                        className="text-right font-bold"
                        style={{ fontFamily: 'monospace', color: isProfitable ? S.green : S.red }}
                      >
                        {formatPnL(pnl)}
                      </span>
                      <span
                        className="text-right font-bold text-[11px]"
                        style={{ fontFamily: 'monospace', color: isProfitable ? S.green : S.red }}
                      >
                        {isProfitable ? '+' : ''}{pnlPct}%
                      </span>
                      <span className="text-right text-[9px]" style={{ color: S.textMuted }}>{closedDate}</span>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ---------- INBOX TAB ---------- */}
        {activeTab === 'inbox' && (
          <div
            className="flex flex-col items-center justify-center h-32 gap-2"
            style={{ color: S.textDim }}
          >
            <Mail size={20} style={{ opacity: 0.3 }} />
            <span className="text-[12px]">No messages</span>
          </div>
        )}

        {/* ---------- LOGS TAB ---------- */}
        {activeTab === 'logs' && (
          <div
            className="flex flex-col items-center justify-center h-32 gap-2"
            style={{ color: S.textDim }}
          >
            <FileText size={20} style={{ opacity: 0.3 }} />
            <span className="text-[12px]">No activity logs</span>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      {editingPosition && (
        <EditOrderModal
          position={editingPosition}
          onClose={() => setEditingPosition(null)}
          onSuccess={() => {
            triggerRefresh();
          }}
        />
      )}

      {/* A-Hedge disclaimer gate — per-position Auto Hedge enable */}
      {hedgeGatePos && (
        <div className="fixed inset-0 z-[9700] flex items-center justify-center overflow-y-auto p-4" style={{ backgroundColor: 'rgba(3,7,12,0.85)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) { setHedgeGatePos(null); setHedgeTyped(''); } }}>
          <div className="my-4 w-full max-w-[560px] rounded-xl border p-5 shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(0,229,160,0.5)' }}>
            <div className="mb-2 text-[15px] font-bold text-white">
              Enable Auto Hedge for {hedgeGatePos.symbol} {hedgeGatePos.direction} {formatLot(hedgeGatePos.size)}
            </div>
            <p className="mb-2 text-[10px] leading-relaxed text-white/55">
              The independent Hedge Trade engine will monitor this position and may open correlated hedge trades once it loses more than the
              configured threshold (currently ${loadHedgeAutoParams().activationLossUsd}), within your basket and daily limits. EMIL has no
              execution authority in this module. The engine evaluates while a Hedge Trade window is open.
            </p>
            <p className="mb-2 rounded border px-3 py-2 text-[9px] leading-relaxed" style={{ borderColor: 'rgba(255,179,0,0.3)', backgroundColor: 'rgba(255,179,0,0.05)', color: 'rgba(255,213,120,0.9)' }}>
              {HEDGE_AUTO_DISCLAIMER}
            </p>
            {!isHedgeAutoConsented() && (
              <>
                <p className="mb-1 text-[10px] text-white/55">First activation — type <b className="text-white">I ACCEPT HEDGE RISK</b> to record consent:</p>
                <input value={hedgeTyped} onChange={(e) => setHedgeTyped(e.target.value)} placeholder="I ACCEPT HEDGE RISK"
                  className="mb-3 w-full rounded bg-white/[0.06] px-2 py-1.5 text-[11px] text-white outline-none" />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setHedgeGatePos(null); setHedgeTyped(''); }}
                className="rounded px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
                Cancel
              </button>
              <button
                disabled={!isHedgeAutoConsented() && hedgeTyped.trim().toUpperCase() !== 'I ACCEPT HEDGE RISK'}
                onClick={() => {
                  if (!isHedgeAutoConsented()) {
                    recordHedgeAutoConsent(hedgeTyped.trim(), loadHedgeAutoParams(), activeAccountId);
                    hedgeAutoLog('consent', 'Auto Hedge consent recorded from the positions panel A-Hedge toggle');
                  }
                  setHedgeAutoOn(true);
                  setPositionHedgeEligible(hedgeGatePos.id, true);
                  hedgeAutoLog('toggle', `A-Hedge ON for ${hedgeGatePos.symbol} position ${hedgeGatePos.id} (positions panel) — engine active`);
                  setFeedback({ type: 'success', message: `Auto Hedge armed for ${hedgeGatePos.symbol} — the engine evaluates while a Hedge Trade window is open.` });
                  setHedgeGatePos(null); setHedgeTyped('');
                  setHedgeTick((t) => t + 1);
                }}
                className="rounded px-4 py-2 text-[11px] font-bold text-black transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: 'linear-gradient(180deg,#00E5A0,#00B87F)' }}>
                I ACCEPT — protect this position
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
