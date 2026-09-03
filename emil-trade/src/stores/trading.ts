import { create } from 'zustand';
import type { PriceTick, Position, Order, AccountSummary, WatchlistItem } from '@/types/trading';

interface TradingState {
  // Selected symbol
  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;

  // Shared timeframe (drives BOTH the TradingView and RAPTOR charts). Value is
  // a user-facing TF label: '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W' | '1Mo'.
  activeTimeframe: string;
  setActiveTimeframe: (tf: string) => void;

  // RAPTOR-chart context mirrored here so shared features (Templates) can
  // snapshot it. Written by ChartPanel; read by the Templates menu.
  raptorChartType: string;
  setRaptorChartType: (t: string) => void;
  raptorIndicators: string[];
  setRaptorIndicators: (ids: string[]) => void;

  // Active account
  activeAccountId: string | null;
  setActiveAccountId: (id: string) => void;

  // Refresh trigger
  refreshPositions: boolean;
  triggerRefresh: () => void;

  // Price ticks
  prices: Record<string, PriceTick>;
  updatePrice: (tick: PriceTick) => void;

  // Positions
  positions: Position[];
  setPositions: (positions: Position[]) => void;
  updatePosition: (position: Position) => void;

  // Orders
  pendingOrders: Order[];
  setPendingOrders: (orders: Order[]) => void;

  // Account
  accountSummary: AccountSummary;
  setAccountSummary: (summary: AccountSummary) => void;

  // Watchlist
  watchlist: WatchlistItem[];
  setWatchlist: (items: WatchlistItem[]) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Order ticket
  orderDirection: 'BUY' | 'SELL';
  setOrderDirection: (dir: 'BUY' | 'SELL') => void;

  // 1-Click Trading — shared by the RAPTOR chart toolbar and the QuickTrade
  // panel so both switches always act in unison. ON = orders skip the
  // confirmation dialog.
  oneClickTrading: boolean;
  setOneClickTrading: (on: boolean) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  activeSymbol: 'EURUSD',
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),

  activeTimeframe: '1H',
  setActiveTimeframe: (tf) => set({ activeTimeframe: tf }),

  raptorChartType: 'candlestick',
  setRaptorChartType: (t) => set({ raptorChartType: t }),
  raptorIndicators: [],
  setRaptorIndicators: (ids) => set({ raptorIndicators: ids }),

  activeAccountId: null,
  setActiveAccountId: (id) => set({ activeAccountId: id }),

  refreshPositions: false,
  triggerRefresh: () => set((state) => ({ refreshPositions: !state.refreshPositions })),

  prices: {},
  updatePrice: (tick) =>
    set((state) => ({
      prices: { ...state.prices, [tick.symbol]: tick },
    })),

  positions: [],
  setPositions: (positions) => set({ positions }),
  updatePosition: (position) =>
    set((state) => ({
      positions: state.positions.map((p) =>
        p.id === position.id ? position : p
      ),
    })),

  pendingOrders: [],
  setPendingOrders: (orders) => set({ pendingOrders: orders }),

  accountSummary: {
    balance: 0,
    equity: 0,
    margin_used: 0,
    free_margin: 0,
    margin_level_pct: 0,
    floating_pnl: 0,
    open_positions_count: 0,
  },
  setAccountSummary: (summary) => set({ accountSummary: summary }),

  watchlist: [],
  setWatchlist: (items) => set({ watchlist: items }),

  theme: 'dark',
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  orderDirection: 'BUY',
  setOrderDirection: (dir) => set({ orderDirection: dir }),

  oneClickTrading: false,
  setOneClickTrading: (on) => set({ oneClickTrading: on }),
}));
