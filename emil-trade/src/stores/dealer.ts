// ===============================================================
// EMIL TRADE -- Dealing Desk Zustand Stores
// All dealer-related client state for the dealing desk UI
// ===============================================================

import { create } from 'zustand';
import type {
  Trade,
  PriceTick,
  SymbolExposure,
  SystemAlert,
  DealerAction,
  DealerSessionStats,
} from '@/lib/dealer/types';

// ---------------------------------------------------------------
// Store 1: useDealingDeskStore
// Core dealing desk state -- orders, positions, actions, session
// ---------------------------------------------------------------

interface DealingDeskState {
  orders: Trade[];
  selectedOrderId: string | null;
  openPositions: Trade[];
  recentActions: DealerAction[];
  sessionStats: DealerSessionStats;
  expertMode: boolean;
  blotterVisible: boolean;

  addOrder: (trade: Trade) => void;
  removeOrder: (tradeId: string) => void;
  selectOrder: (tradeId: string | null) => void;
  updateTrade: (trade: Trade) => void;
  addPosition: (trade: Trade) => void;
  removePosition: (tradeId: string) => void;
  addAction: (action: DealerAction) => void;
  toggleExpertMode: () => void;
  toggleBlotter: () => void;
  incrementStats: (field: keyof DealerSessionStats) => void;
  resetSession: () => void;
}

const initialSessionStats: DealerSessionStats = {
  dealer_id: '',
  session_start: new Date().toISOString(),
  trades_processed: 0,
  trades_approved: 0,
  trades_rejected: 0,
  trades_requoted: 0,
  avg_processing_ms: 0,
  a_book_count: 0,
  b_book_count: 0,
  hybrid_count: 0,
  total_volume_lots: 0,
  total_pnl: 0,
  alerts_acknowledged: 0,
  manual_overrides: 0,
};

export const useDealingDeskStore = create<DealingDeskState>((set) => ({
  orders: [],
  selectedOrderId: null,
  openPositions: [],
  recentActions: [],
  sessionStats: { ...initialSessionStats },
  expertMode: false,
  blotterVisible: true,

  addOrder: (trade) =>
    set((state) => ({
      orders: [...state.orders, trade].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    })),

  removeOrder: (tradeId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== tradeId),
      selectedOrderId:
        state.selectedOrderId === tradeId ? null : state.selectedOrderId,
    })),

  selectOrder: (tradeId) => set({ selectedOrderId: tradeId }),

  updateTrade: (trade) =>
    set((state) => {
      const isOpen =
        trade.status === 'filled' ||
        trade.status === 'partially_filled' ||
        trade.status === 'lp_accepted';
      if (isOpen) {
        return {
          orders: state.orders.filter((o) => o.id !== trade.id),
          openPositions: state.openPositions.some((p) => p.id === trade.id)
            ? state.openPositions.map((p) => (p.id === trade.id ? trade : p))
            : [...state.openPositions, trade],
        };
      }
      return {
        orders: state.orders.map((o) => (o.id === trade.id ? trade : o)),
        openPositions: state.openPositions.filter((p) => p.id !== trade.id),
      };
    }),

  addPosition: (trade) =>
    set((state) => ({
      openPositions: [...state.openPositions, trade],
    })),

  removePosition: (tradeId) =>
    set((state) => ({
      openPositions: state.openPositions.filter((p) => p.id !== tradeId),
    })),

  addAction: (action) =>
    set((state) => ({
      recentActions: [action, ...state.recentActions].slice(0, 50),
    })),

  toggleExpertMode: () =>
    set((state) => ({ expertMode: !state.expertMode })),

  toggleBlotter: () =>
    set((state) => ({ blotterVisible: !state.blotterVisible })),

  incrementStats: (field) =>
    set((state) => {
      const value = state.sessionStats[field];
      if (typeof value !== 'number') return state;
      return {
        sessionStats: {
          ...state.sessionStats,
          [field]: value + 1,
        },
      };
    }),

  resetSession: () =>
    set({
      orders: [],
      selectedOrderId: null,
      openPositions: [],
      recentActions: [],
      sessionStats: {
        ...initialSessionStats,
        session_start: new Date().toISOString(),
      },
    }),
}));

// ---------------------------------------------------------------
// Store 2: usePriceFeedStore
// Live price ticks and per-symbol history for sparklines
// ---------------------------------------------------------------

interface PriceFeedState {
  prices: Record<string, PriceTick>;
  priceHistory: Record<string, PriceTick[]>;
  lastUpdate: number;

  updatePrices: (ticks: PriceTick[]) => void;
  getPrice: (symbol: string) => PriceTick | undefined;
}

export const usePriceFeedStore = create<PriceFeedState>((set, get) => ({
  prices: {},
  priceHistory: {},
  lastUpdate: 0,

  updatePrices: (ticks) =>
    set((state) => {
      const nextPrices = { ...state.prices };
      const nextHistory = { ...state.priceHistory };

      for (const tick of ticks) {
        nextPrices[tick.symbol] = tick;
        const existing = nextHistory[tick.symbol] ?? [];
        nextHistory[tick.symbol] = [...existing, tick].slice(-20);
      }

      return {
        prices: nextPrices,
        priceHistory: nextHistory,
        lastUpdate: Date.now(),
      };
    }),

  getPrice: (symbol) => get().prices[symbol],
}));

// ---------------------------------------------------------------
// Store 3: useExposureStore
// Per-symbol exposure and aggregate gross exposure
// ---------------------------------------------------------------

interface ExposureState {
  exposures: Record<string, SymbolExposure>;
  totalGrossUSD: number;

  updateSymbol: (exposure: SymbolExposure) => void;
  setAll: (exposures: SymbolExposure[]) => void;
}

function computeGross(exposures: Record<string, SymbolExposure>): number {
  return Object.values(exposures).reduce(
    (sum, e) => sum + Math.abs(e.net_position),
    0
  );
}

export const useExposureStore = create<ExposureState>((set) => ({
  exposures: {},
  totalGrossUSD: 0,

  updateSymbol: (exposure) =>
    set((state) => {
      const next = { ...state.exposures, [exposure.symbol]: exposure };
      return { exposures: next, totalGrossUSD: computeGross(next) };
    }),

  setAll: (exposures) =>
    set(() => {
      const map: Record<string, SymbolExposure> = {};
      for (const e of exposures) {
        map[e.symbol] = e;
      }
      return { exposures: map, totalGrossUSD: computeGross(map) };
    }),
}));

// ---------------------------------------------------------------
// Store 4: useAlertStore
// System alerts with unread tracking
// ---------------------------------------------------------------

interface AlertState {
  alerts: SystemAlert[];
  unreadCount: number;

  addAlert: (alert: SystemAlert) => void;
  resolveAlert: (alertId: string) => void;
  clearAll: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    })),

  resolveAlert: (alertId) =>
    set((state) => {
      const target = state.alerts.find((a) => a.id === alertId);
      if (!target) return state;
      const wasUnread = !target.acknowledged;
      return {
        alerts: state.alerts.map((a) =>
          a.id === alertId
            ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : a
        ),
        unreadCount: wasUnread
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }),

  clearAll: () => set({ alerts: [], unreadCount: 0 }),
}));
