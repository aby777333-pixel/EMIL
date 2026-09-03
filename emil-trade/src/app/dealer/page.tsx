'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

import DealerTopBar from '@/components/dealer/DealerTopBar';
import PriceTicker from '@/components/dealer/PriceTicker';
import NewsCountdown from '@/components/dealer/NewsCountdown';
import OrderQueue from '@/components/dealer/OrderQueue';
import DealerRadar from '@/components/dealer/DealerRadar';
import ExecutionConsole from '@/components/dealer/ExecutionConsole';
import OpenBookMonitor from '@/components/dealer/OpenBookMonitor';
import CounterpartyWatch from '@/components/dealer/CounterpartyWatch';
import DealerBlotter from '@/components/dealer/DealerBlotter';
import NexusPanel from '@/components/dealer/NexusPanel';
import HotkeyOverlay from '@/components/dealer/HotkeyOverlay';
import DealerMediaPanel from '@/components/dealer/DealerMediaPanel';
import AIAutoDealer from '@/components/dealer/AIAutoDealer';
import HedgingPanel from '@/components/dealer/HedgingPanel';
import SessionPnLChart from '@/components/dealer/SessionPnLChart';

import { useDealerHotkeys } from '@/lib/hooks/useDealerHotkeys';
import {
  useDealingDeskStore,
  usePriceFeedStore,
  useExposureStore,
  useAlertStore,
} from '@/stores/dealer';
import { useNexusStore } from '@/stores/nexus';

import type {
  Trade,
  SymbolExposure,
  SystemAlert,
  PriceTick,
} from '@/lib/dealer/types';

// ===============================================================
// Mock seed data
// ===============================================================

const SEED_ORDERS: Trade[] = [
  {
    id: 'ORD-001',
    account_id: 'ACC-10042',
    client_id: 'CLT-3001',
    symbol: 'EURUSD',
    direction: 'buy',
    type: 'market',
    status: 'pending_validation',
    requested_price: 1.08452,
    fill_price: null,
    requested_size: 5.0,
    filled_size: 0,
    remaining_size: 5.0,
    sl: 1.08200,
    tp: 1.08900,
    trailing_stop_pips: null,
    time_in_force: 'IOC',
    commission: 0,
    swap: 0,
    floating_pnl: 0,
    realized_pnl: null,
    routing_mode: null,
    lp_order_id: null,
    lp_fill_price: null,
    lp_name: null,
    slippage: 0,
    latency_ms: null,
    source: 'MT5-Web',
    comment: '',
    dealer_id: null,
    dealer_action: null,
    risk_score: 35,
    toxic_score: 12,
    margin_used: 5420,
    created_at: new Date(Date.now() - 8000).toISOString(),
    updated_at: new Date(Date.now() - 8000).toISOString(),
    filled_at: null,
    closed_at: null,
    expired_at: null,
  },
  {
    id: 'ORD-002',
    account_id: 'ACC-10078',
    client_id: 'CLT-3015',
    symbol: 'GBPUSD',
    direction: 'sell',
    type: 'market',
    status: 'risk_check',
    requested_price: 1.27130,
    fill_price: null,
    requested_size: 10.0,
    filled_size: 0,
    remaining_size: 10.0,
    sl: 1.27400,
    tp: 1.26500,
    trailing_stop_pips: null,
    time_in_force: 'IOC',
    commission: 0,
    swap: 0,
    floating_pnl: 0,
    realized_pnl: null,
    routing_mode: null,
    lp_order_id: null,
    lp_fill_price: null,
    lp_name: null,
    slippage: 0,
    latency_ms: null,
    source: 'FIX-API',
    comment: 'High volume client',
    dealer_id: null,
    dealer_action: null,
    risk_score: 72,
    toxic_score: 58,
    margin_used: 12730,
    created_at: new Date(Date.now() - 5200).toISOString(),
    updated_at: new Date(Date.now() - 5200).toISOString(),
    filled_at: null,
    closed_at: null,
    expired_at: null,
  },
  {
    id: 'ORD-003',
    account_id: 'ACC-10115',
    client_id: 'CLT-3042',
    symbol: 'XAUUSD',
    direction: 'buy',
    type: 'limit',
    status: 'pending_new',
    requested_price: 2342.50,
    fill_price: null,
    requested_size: 2.0,
    filled_size: 0,
    remaining_size: 2.0,
    sl: 2335.00,
    tp: 2360.00,
    trailing_stop_pips: null,
    time_in_force: 'GTC',
    commission: 0,
    swap: 0,
    floating_pnl: 0,
    realized_pnl: null,
    routing_mode: null,
    lp_order_id: null,
    lp_fill_price: null,
    lp_name: null,
    slippage: 0,
    latency_ms: null,
    source: 'MT5-Desktop',
    comment: '',
    dealer_id: null,
    dealer_action: null,
    risk_score: 20,
    toxic_score: 5,
    margin_used: 9370,
    created_at: new Date(Date.now() - 3400).toISOString(),
    updated_at: new Date(Date.now() - 3400).toISOString(),
    filled_at: null,
    closed_at: null,
    expired_at: null,
  },
  {
    id: 'ORD-004',
    account_id: 'ACC-10042',
    client_id: 'CLT-3001',
    symbol: 'USDJPY',
    direction: 'sell',
    type: 'market',
    status: 'margin_check',
    requested_price: 154.820,
    fill_price: null,
    requested_size: 3.0,
    filled_size: 0,
    remaining_size: 3.0,
    sl: 155.100,
    tp: 154.200,
    trailing_stop_pips: null,
    time_in_force: 'IOC',
    commission: 0,
    swap: 0,
    floating_pnl: 0,
    realized_pnl: null,
    routing_mode: null,
    lp_order_id: null,
    lp_fill_price: null,
    lp_name: null,
    slippage: 0,
    latency_ms: null,
    source: 'MT5-Web',
    comment: '',
    dealer_id: null,
    dealer_action: null,
    risk_score: 35,
    toxic_score: 12,
    margin_used: 2910,
    created_at: new Date(Date.now() - 1800).toISOString(),
    updated_at: new Date(Date.now() - 1800).toISOString(),
    filled_at: null,
    closed_at: null,
    expired_at: null,
  },
  {
    id: 'ORD-005',
    account_id: 'ACC-10200',
    client_id: 'CLT-3088',
    symbol: 'BTCUSD',
    direction: 'buy',
    type: 'market',
    status: 'routing',
    requested_price: 67480.00,
    fill_price: null,
    requested_size: 0.5,
    filled_size: 0,
    remaining_size: 0.5,
    sl: 66500.00,
    tp: 69000.00,
    trailing_stop_pips: null,
    time_in_force: 'IOC',
    commission: 0,
    swap: 0,
    floating_pnl: 0,
    realized_pnl: null,
    routing_mode: 'a_book',
    lp_order_id: null,
    lp_fill_price: null,
    lp_name: null,
    slippage: 0,
    latency_ms: null,
    source: 'REST-API',
    comment: 'Institutional desk',
    dealer_id: null,
    dealer_action: null,
    risk_score: 45,
    toxic_score: 30,
    margin_used: 33740,
    created_at: new Date(Date.now() - 600).toISOString(),
    updated_at: new Date(Date.now() - 600).toISOString(),
    filled_at: null,
    closed_at: null,
    expired_at: null,
  },
];

const SEED_POSITIONS: Trade[] = [
  { ...SEED_ORDERS[0], id: 'POS-101', status: 'filled', fill_price: 1.08440, filled_size: 2.0, remaining_size: 0, floating_pnl: 124.50, routing_mode: 'b_book', created_at: new Date(Date.now() - 3600000).toISOString(), filled_at: new Date(Date.now() - 3595000).toISOString() },
  { ...SEED_ORDERS[0], id: 'POS-102', symbol: 'GBPUSD', direction: 'sell', status: 'filled', fill_price: 1.27180, filled_size: 5.0, remaining_size: 0, floating_pnl: -310.00, routing_mode: 'a_book', lp_name: 'LMAX', created_at: new Date(Date.now() - 7200000).toISOString(), filled_at: new Date(Date.now() - 7195000).toISOString() },
  { ...SEED_ORDERS[0], id: 'POS-103', symbol: 'XAUUSD', direction: 'buy', status: 'filled', fill_price: 2340.80, requested_size: 1.0, filled_size: 1.0, remaining_size: 0, floating_pnl: 580.00, routing_mode: 'a_book', lp_name: 'Currenex', created_at: new Date(Date.now() - 5400000).toISOString(), filled_at: new Date(Date.now() - 5395000).toISOString() },
  { ...SEED_ORDERS[0], id: 'POS-104', symbol: 'USDJPY', direction: 'buy', status: 'filled', fill_price: 154.650, requested_size: 8.0, filled_size: 8.0, remaining_size: 0, floating_pnl: -215.30, routing_mode: 'b_book', created_at: new Date(Date.now() - 1800000).toISOString(), filled_at: new Date(Date.now() - 1795000).toISOString() },
  { ...SEED_ORDERS[0], id: 'POS-105', symbol: 'BTCUSD', direction: 'sell', status: 'filled', fill_price: 67320.00, requested_size: 0.25, filled_size: 0.25, remaining_size: 0, floating_pnl: 42.50, routing_mode: 'a_book', lp_name: 'B2C2', created_at: new Date(Date.now() - 900000).toISOString(), filled_at: new Date(Date.now() - 895000).toISOString() },
  { ...SEED_ORDERS[0], id: 'POS-106', symbol: 'EURUSD', direction: 'sell', status: 'filled', fill_price: 1.08510, requested_size: 3.0, filled_size: 3.0, remaining_size: 0, floating_pnl: 67.20, routing_mode: 'hybrid', created_at: new Date(Date.now() - 600000).toISOString(), filled_at: new Date(Date.now() - 595000).toISOString() },
  { ...SEED_ORDERS[0], id: 'POS-107', symbol: 'GBPJPY', direction: 'buy', status: 'filled', fill_price: 196.420, requested_size: 4.0, filled_size: 4.0, remaining_size: 0, floating_pnl: -890.00, routing_mode: 'b_book', created_at: new Date(Date.now() - 14400000).toISOString(), filled_at: new Date(Date.now() - 14395000).toISOString() },
  { ...SEED_ORDERS[0], id: 'POS-108', symbol: 'AUDUSD', direction: 'buy', status: 'filled', fill_price: 0.66320, requested_size: 6.0, filled_size: 6.0, remaining_size: 0, floating_pnl: 180.00, routing_mode: 'a_book', lp_name: 'LMAX', created_at: new Date(Date.now() - 10800000).toISOString(), filled_at: new Date(Date.now() - 10795000).toISOString() },
  { ...SEED_ORDERS[0], id: 'POS-109', symbol: 'NZDUSD', direction: 'sell', status: 'filled', fill_price: 0.60150, requested_size: 2.5, filled_size: 2.5, remaining_size: 0, floating_pnl: -55.80, routing_mode: 'b_book', created_at: new Date(Date.now() - 21600000).toISOString(), filled_at: new Date(Date.now() - 21595000).toISOString() },
  { ...SEED_ORDERS[0], id: 'POS-110', symbol: 'USDCAD', direction: 'buy', status: 'filled', fill_price: 1.36240, requested_size: 7.0, filled_size: 7.0, remaining_size: 0, floating_pnl: 320.10, routing_mode: 'hybrid', created_at: new Date(Date.now() - 28800000).toISOString(), filled_at: new Date(Date.now() - 28795000).toISOString() },
];

const SEED_EXPOSURES: SymbolExposure[] = [
  { symbol: 'EURUSD', net_position: 13.1, total_buy: 45.2, total_sell: 32.1, unrealized_pnl: 840000, client_count: 14, risk_level: 'high', max_exposure_lots: 100, utilization_pct: 77.3, is_breached: false },
  { symbol: 'XAUUSD', net_position: -3.5, total_buy: 8.5, total_sell: 12.0, unrealized_pnl: 4800000, client_count: 6, risk_level: 'extreme', max_exposure_lots: 25, utilization_pct: 82.0, is_breached: true },
  { symbol: 'BTCUSD', net_position: 1.6, total_buy: 2.1, total_sell: 0.5, unrealized_pnl: 176000, client_count: 4, risk_level: 'medium', max_exposure_lots: 5, utilization_pct: 52.0, is_breached: false },
  { symbol: 'GBPJPY', net_position: -3.4, total_buy: 15.3, total_sell: 18.7, unrealized_pnl: 660000, client_count: 3, risk_level: 'high', max_exposure_lots: 50, utilization_pct: 68.0, is_breached: false },
  { symbol: 'USDJPY', net_position: 2.5, total_buy: 22.0, total_sell: 19.5, unrealized_pnl: 620000, client_count: 11, risk_level: 'high', max_exposure_lots: 60, utilization_pct: 69.2, is_breached: false },
  { symbol: 'GBPUSD', net_position: 2.3, total_buy: 11.2, total_sell: 8.9, unrealized_pnl: 254000, client_count: 9, risk_level: 'medium', max_exposure_lots: 40, utilization_pct: 50.3, is_breached: false },
];

const SEED_ALERTS: SystemAlert[] = [
  {
    id: 'ALR-001',
    severity: 'warning',
    category: 'toxic_flow',
    title: 'Toxic flow detected',
    message: 'Client CLT-3015 has a toxic score of 58. Recent pattern: 12 consecutive winning scalps under 30s hold time.',
    source: 'risk-engine',
    target_type: 'client',
    target_id: 'CLT-3015',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    auto_resolved: false,
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'ALR-002',
    severity: 'critical',
    category: 'exposure_breach',
    title: 'GBPJPY exposure elevated',
    message: 'Net long 4.0 lots on GBPJPY with unrealized loss of -$890. Consider hedging or reducing.',
    source: 'exposure-monitor',
    target_type: 'symbol',
    target_id: 'GBPJPY',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    auto_resolved: false,
    created_at: new Date(Date.now() - 45000).toISOString(),
  },
  {
    id: 'ALR-003',
    severity: 'info',
    category: 'lp_disconnect',
    title: 'LP latency spike',
    message: 'Currenex average latency increased to 85ms (baseline: 12ms). Monitor for execution quality degradation.',
    source: 'lp-monitor',
    target_type: null,
    target_id: null,
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    auto_resolved: false,
    created_at: new Date(Date.now() - 20000).toISOString(),
  },
];

// ---------------------------------------------------------------
// Price feed simulation
// ---------------------------------------------------------------

const BASE_PRICES: Record<string, { bid: number; ask: number; spread: number }> = {
  EURUSD:  { bid: 1.08440, ask: 1.08455, spread: 1.5 },
  GBPUSD:  { bid: 1.27120, ask: 1.27140, spread: 2.0 },
  XAUUSD:  { bid: 2342.30, ask: 2342.80, spread: 50.0 },
  USDJPY:  { bid: 154.810, ask: 154.830, spread: 2.0 },
  BTCUSD:  { bid: 67460.0, ask: 67490.0, spread: 3000 },
  GBPJPY:  { bid: 196.400, ask: 196.440, spread: 4.0 },
  AUDUSD:  { bid: 0.66310, ask: 0.66330, spread: 2.0 },
  NZDUSD:  { bid: 0.60140, ask: 0.60160, spread: 2.0 },
  USDCAD:  { bid: 1.36230, ask: 1.36260, spread: 3.0 },
  EURGBP:  { bid: 0.85620, ask: 0.85640, spread: 2.0 },
  EURJPY:  { bid: 166.450, ask: 166.475, spread: 2.5 },
  USDCHF:  { bid: 0.88450, ask: 0.88470, spread: 2.0 },
  XAGUSD:  { bid: 29.142, ask: 29.178, spread: 3.6 },
  ETHUSD:  { bid: 3284.20, ask: 3285.80, spread: 160 },
  US500:   { bid: 5842.30, ask: 5843.50, spread: 120 },
  US30:    { bid: 42850.0, ask: 42855.0, spread: 500 },
  NAS100:  { bid: 20480.0, ask: 20484.0, spread: 400 },
  USOIL:   { bid: 78.42, ask: 78.48, spread: 6.0 },
};

const TWO_DECIMAL_SYMBOLS = new Set([
  'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD',
  'US500', 'US30', 'NAS100', 'USOIL',
]);

function priceDecimals(symbol: string): number {
  if (TWO_DECIMAL_SYMBOLS.has(symbol)) return 2;
  if (symbol.includes('JPY')) return 3;
  return 5;
}

function generatePriceTicks(): PriceTick[] {
  return Object.entries(BASE_PRICES).map(([symbol, base]) => {
    const decimals = priceDecimals(symbol);
    const jitter = (Math.random() - 0.5) * base.spread * 0.4;
    const bid = +(base.bid + jitter * 0.0001).toFixed(decimals);
    const ask = +(bid + base.spread * 0.0001).toFixed(decimals);
    const mid = +((bid + ask) / 2).toFixed(decimals);
    return {
      symbol,
      bid,
      ask,
      mid,
      spread: +(ask - bid).toFixed(decimals),
      volume: Math.floor(Math.random() * 500) + 50,
      timestamp: Date.now(),
      source: 'mock-feed',
    };
  });
}

// ---------------------------------------------------------------
// initDealerData -- loads seed data and starts intervals
// Returns a cleanup function to clear intervals
// ---------------------------------------------------------------

function initDealerData(): () => void {
  const deskStore = useDealingDeskStore.getState();
  const priceStore = usePriceFeedStore.getState();
  const exposureStore = useExposureStore.getState();
  const alertStore = useAlertStore.getState();

  // 1. Load pending orders
  for (const order of SEED_ORDERS) {
    deskStore.addOrder(order);
  }

  // 2. Load open positions
  for (const position of SEED_POSITIONS) {
    deskStore.addPosition(position);
  }

  // 3. Load exposures
  exposureStore.setAll(SEED_EXPOSURES);

  // 4. Load alerts
  for (const alert of SEED_ALERTS) {
    alertStore.addAlert(alert);
  }

  // 5. Seed initial prices
  priceStore.updatePrices(generatePriceTicks());

  // 6. Start price feed (every 500ms)
  const priceInterval = setInterval(() => {
    usePriceFeedStore.getState().updatePrices(generatePriceTicks());
  }, 500);

  // 7. PnL recalculation interval (every 2s)
  const pnlInterval = setInterval(() => {
    const prices = usePriceFeedStore.getState().prices;
    const positions = useDealingDeskStore.getState().openPositions;

    for (const pos of positions) {
      const tick = prices[pos.symbol];
      if (!tick) continue;

      const priceRef = pos.direction === 'buy' ? tick.bid : tick.ask;
      const entryPrice = pos.fill_price ?? pos.requested_price ?? 0;
      const diff = pos.direction === 'buy' ? priceRef - entryPrice : entryPrice - priceRef;
      const pipMultiplier = pos.symbol.includes('JPY') ? 100 : pos.symbol === 'XAUUSD' ? 1 : pos.symbol === 'BTCUSD' ? 1 : 10000;
      const pnl = +(diff * pipMultiplier * pos.filled_size * 10).toFixed(2);

      if (Math.abs(pnl - pos.floating_pnl) > 0.01) {
        useDealingDeskStore.getState().updateTrade({
          ...pos,
          floating_pnl: pnl,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }, 2000);

  // Return cleanup
  return () => {
    clearInterval(priceInterval);
    clearInterval(pnlInterval);
  };
}

// ===============================================================
// Dealer Page Component
// ===============================================================

export default function DealerPage() {
  const cleanupRef = useRef<(() => void) | null>(null);
  const blotterVisible = useDealingDeskStore((s) => s.blotterVisible);
  const orders = useDealingDeskStore((s) => s.orders);
  const selectedOrderId = useDealingDeskStore((s) => s.selectedOrderId);
  const selectOrder = useDealingDeskStore((s) => s.selectOrder);
  const removeOrder = useDealingDeskStore((s) => s.removeOrder);
  const resetSession = useDealingDeskStore((s) => s.resetSession);

  const nexusOpen = useNexusStore((s) => s.isOpen);
  const toggleNexus = useNexusStore((s) => s.togglePanel);
  const [hotkeyOverlayVisible, setHotkeyOverlayVisible] = useState(false);
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const [hedgingOpen, setHedgingOpen] = useState(false);

  // Initialize seed data on mount
  useEffect(() => {
    cleanupRef.current = initDealerData();
    return () => {
      if (cleanupRef.current) cleanupRef.current();
      resetSession();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hotkey handlers
  const hotkeyHandlers = useCallback(() => {
    const currentIdx = orders.findIndex((o) => o.id === selectedOrderId);

    return {
      accept: () => {
        if (selectedOrderId) removeOrder(selectedOrderId);
      },
      requote: () => {
        // Requote logic handled by ExecutionConsole
      },
      delay: () => {
        // Delay logic handled by ExecutionConsole
      },
      reject: () => {
        if (selectedOrderId) removeOrder(selectedOrderId);
      },
      force_close: () => {
        // Force close handled by ExecutionConsole
      },
      select_prev: () => {
        if (orders.length === 0) return;
        const prevIdx = currentIdx <= 0 ? orders.length - 1 : currentIdx - 1;
        selectOrder(orders[prevIdx].id);
      },
      select_next: () => {
        if (orders.length === 0) return;
        const nextIdx = currentIdx >= orders.length - 1 ? 0 : currentIdx + 1;
        selectOrder(orders[nextIdx].id);
      },
      load_order: () => {
        if (!selectedOrderId && orders.length > 0) {
          selectOrder(orders[0].id);
        }
      },
      clear: () => {
        selectOrder(null);
      },
      toggle_book: () => {
        // Handled by OpenBookMonitor
      },
      toggle_nexus: () => {
        toggleNexus();
      },
      emergency_flatten: () => {
        console.log('EMERGENCY FLATTEN triggered');
      },
      hotkey_overlay: () => {
        setHotkeyOverlayVisible((v) => !v);
      },
    };
  }, [orders, selectedOrderId, selectOrder, removeOrder, toggleNexus])();

  useDealerHotkeys(hotkeyHandlers);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0a0a0f] text-white">
      {/* Top Bar -- 56px fixed, includes AI Auto switch */}
      <div className="h-14 flex-shrink-0 flex items-center">
        <div className="flex-1">
          <DealerTopBar />
        </div>
        <div className="flex-shrink-0 pr-3">
          <AIAutoDealer />
        </div>
      </div>

      {/* Price Ticker -- 32px, with LIVE TV button at right end */}
      <div className="flex-shrink-0 flex items-center" style={{ height: 32 }}>
        <div className="flex-1 h-full overflow-hidden">
          <PriceTicker />
        </div>
        <button
          onClick={() => setHedgingOpen((v) => !v)}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 h-full text-[9px] font-bold tracking-wider transition border-l border-white/5"
          style={hedgingOpen ? {
            backgroundColor: '#00B4D818',
            color: '#00B4D8',
            animation: 'pulse-backlight-cyan 2s ease-in-out infinite',
            boxShadow: '0 0 12px #00B4D840, inset 0 0 8px #00B4D815',
          } : {
            backgroundColor: 'rgba(255,255,255,0.03)',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          HEDGE
        </button>
        <button
          onClick={() => setMediaPanelOpen((v) => !v)}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 h-full text-[9px] font-bold tracking-wider transition border-l border-white/5"
          style={mediaPanelOpen ? {
            backgroundColor: '#E5091418',
            color: '#ff4560',
            animation: 'pulse-backlight-red 1.8s ease-in-out infinite',
            boxShadow: '0 0 14px #E5091450, inset 0 0 10px #E5091418',
          } : {
            backgroundColor: 'rgba(255,255,255,0.03)',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${mediaPanelOpen ? 'animate-ping bg-red-500 opacity-75' : 'bg-white/30'}`} />
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${mediaPanelOpen ? 'bg-red-500' : 'bg-white/30'}`} />
          </span>
          LIVE TV
        </button>
      </div>

      {/* News Countdown Banner -- 48px, shows when event imminent */}
      <NewsCountdown />

      {/* Main 3-zone row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Order Queue + Dealer Radar -- 280px */}
        <div className="w-[280px] flex-shrink-0 border-r border-white/5 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <OrderQueue />
          </div>
          <DealerRadar />
        </div>

        {/* Centre: Execution Console -- flex-1 */}
        <div className="flex-1 overflow-hidden relative">
          <ExecutionConsole />
          <HedgingPanel isOpen={hedgingOpen} onClose={() => setHedgingOpen(false)} />
        </div>

        {/* Right: Open Book Monitor + Counterparty Watch -- 320px */}
        <div className="w-[320px] flex-shrink-0 border-l border-white/5 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <OpenBookMonitor />
          </div>
          <CounterpartyWatch />
        </div>
      </div>

      {/* Bottom: Dealer Blotter -- 80px + sparkline */}
      {blotterVisible && (
        <div className="flex-shrink-0 border-t border-white/5">
          <SessionPnLChart />
          <div className="h-20">
            <DealerBlotter />
          </div>
        </div>
      )}

      {/* NEXUS AI Co-Pilot Panel */}
      <NexusPanel
        isOpen={nexusOpen}
        onClose={toggleNexus}
        onApplyRecommendation={(rec) => {
          console.log('Applied NEXUS recommendation:', rec);
        }}
      />

      {/* Hotkey Reference Overlay */}
      <HotkeyOverlay
        isOpen={hotkeyOverlayVisible}
        onClose={() => setHotkeyOverlayVisible(false)}
      />

      {/* Dealer Media Panel (Live TV + Video Chat) */}
      <DealerMediaPanel
        isOpen={mediaPanelOpen}
        onClose={() => setMediaPanelOpen(false)}
      />
    </div>
  );
}
