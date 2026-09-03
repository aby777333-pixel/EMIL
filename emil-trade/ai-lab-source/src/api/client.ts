import type {
  DashboardData,
  MarketTick,
  Strategy,
  Position,
  ResearchPaper,
  AuditEvent,
  Candle,
  Indicators,
  Regime,
  AgentState,
} from '../types';
import {
  mockDashboard,
  mockTicks,
  mockStrategies,
  mockPositions,
  mockResearch,
  mockEvents,
  mockCandles,
  mockRegime,
  groupFor,
  SYMBOL_GROUPS,
} from '../data/mock';
import { AGENTS } from '../data/agents';

export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || '';
export const WS_URL =
  (import.meta as any).env?.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

const TIMEOUT = 6000;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Attempt a live request; on any failure, resolve with the fallback value. */
async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const api = {
  async dashboard(): Promise<DashboardData> {
    return withFallback(() => req<DashboardData>('/api/dashboard'), mockDashboard());
  },

  async markets(): Promise<{ groups: Record<string, MarketTick[]>; symbols: MarketTick[] }> {
    return withFallback(
      () => req('/api/markets'),
      (() => {
        const symbols = mockTicks();
        const groups: Record<string, MarketTick[]> = {};
        for (const g of Object.keys(SYMBOL_GROUPS)) groups[g] = [];
        for (const t of symbols) (groups[t.group] ||= []).push(t);
        return { groups, symbols };
      })(),
    );
  },

  async marketData(
    symbol: string,
    timeframe = '1H',
    bars = 200,
  ): Promise<{ symbol: string; candles: Candle[]; indicators: Indicators }> {
    return withFallback(
      () => req(`/api/market-data/${symbol}?timeframe=${timeframe}&bars=${bars}`),
      { symbol, candles: mockCandles(symbol, bars), indicators: {} },
    );
  },

  async strategies(status?: string): Promise<Strategy[]> {
    const q = status ? `?status=${status}` : '';
    const data = await withFallback(
      () => req<{ strategies: Strategy[] }>(`/api/strategies${q}`),
      { strategies: mockStrategies() },
    );
    return data.strategies?.length ? data.strategies : mockStrategies();
  },

  async strategy(id: number): Promise<Strategy> {
    return withFallback(
      () => req<Strategy>(`/api/strategies/${id}`),
      mockStrategies().find((s) => s.id === id) || mockStrategies()[0],
    );
  },

  async generateStrategies(): Promise<{ status: string; message: string }> {
    return withFallback(
      () => req('/api/strategies/generate', { method: 'POST', body: '{}' }),
      { status: 'started', message: 'Pipeline started (demo mode).' },
    );
  },

  async approve(id: number, approvedBy = 'user'): Promise<any> {
    return withFallback(
      () =>
        req(`/api/strategies/${id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ approved_by: approvedBy }),
        }),
      { status: 'approved' },
    );
  },

  async reject(id: number, reason = ''): Promise<any> {
    return withFallback(
      () =>
        req(`/api/strategies/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
      { status: 'rejected' },
    );
  },

  async eaCode(id: number, platform: string): Promise<{ code: string; platform: string }> {
    return withFallback(
      () => req(`/api/strategies/${id}/ea-code?platform=${platform}`),
      { code: sampleEa(platform), platform },
    );
  },

  async positions(status = 'open'): Promise<{ positions: Position[]; total_pnl: number }> {
    return withFallback(
      () => req(`/api/positions?status=${status}`),
      (() => {
        const positions = mockPositions();
        return {
          positions,
          total_pnl: Number(positions.reduce((a, p) => a + p.pnl, 0).toFixed(2)),
        };
      })(),
    );
  },

  async killSwitch(reason = 'manual kill switch'): Promise<any> {
    return withFallback(
      () =>
        req('/api/positions/kill-switch', {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
      { status: 'kill_switch_triggered', closed: 0 },
    );
  },

  async openPosition(payload: {
    symbol: string;
    side: string;
    qty: number;
    strategy_id?: number;
  }): Promise<any> {
    return withFallback(
      () => req('/api/positions/open', { method: 'POST', body: JSON.stringify(payload) }),
      { filled: true, ...payload },
    );
  },

  async research(): Promise<ResearchPaper[]> {
    const data = await withFallback(
      () => req<{ papers: ResearchPaper[] }>('/api/research'),
      { papers: mockResearch() },
    );
    return data.papers?.length ? data.papers : mockResearch();
  },

  async auditLog(limit = 100): Promise<AuditEvent[]> {
    const data = await withFallback(
      () => req<{ events: AuditEvent[] }>(`/api/audit-log?limit=${limit}`),
      { events: mockEvents() },
    );
    return data.events?.length ? data.events : mockEvents();
  },

  async agents(): Promise<AgentState[]> {
    const data = await withFallback(
      () => req<{ agents: AgentState[] }>('/api/agents'),
      { agents: AGENTS.map((a) => ({ name: a.name, status: 'idle' as const })) },
    );
    return data.agents;
  },

  async regime(): Promise<Regime> {
    return withFallback(() => req<Regime>('/api/regime'), mockRegime);
  },

  async telegramConfigure(payload: {
    bot_token: string;
    chat_id: string;
    enabled: boolean;
  }): Promise<any> {
    return withFallback(
      () => req('/api/telegram/configure', { method: 'POST', body: JSON.stringify(payload) }),
      { status: 'configured', enabled: payload.enabled },
    );
  },

  async telegramTest(): Promise<any> {
    return withFallback(() => req('/api/telegram/test'), { ok: true, demo: true });
  },

  async brokers(): Promise<any[]> {
    const data = await withFallback(
      () => req<{ connections: any[] }>('/api/broker/connect'),
      { connections: [] },
    );
    return data.connections;
  },

  async connectBroker(payload: {
    broker_name: string;
    mode: string;
    api_key: string;
  }): Promise<any> {
    return withFallback(
      () => req('/api/broker/connect', { method: 'POST', body: JSON.stringify(payload) }),
      { status: 'connected', ...payload },
    );
  },

  async positionSize(payload: {
    capital: number;
    risk_pct: number;
    entry: number;
    stop: number;
    atr?: number;
  }): Promise<any> {
    return withFallback(
      () => req('/api/risk/position-size', { method: 'POST', body: JSON.stringify(payload) }),
      { qty: 0, risk_amount: payload.capital * payload.risk_pct },
    );
  },
};

function sampleEa(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes('pine'))
    return `//@version=5\nstrategy("GIO Raptor AI Strategy", overlay=true)\nfast = ta.sma(close, 10)\nslow = ta.sma(close, 30)\nif ta.crossover(fast, slow)\n    strategy.entry("Long", strategy.long)\nif ta.crossunder(fast, slow)\n    strategy.close("Long")`;
  if (p.includes('python'))
    return `# GIO Raptor AI Strategy (Python)\nimport pandas as pd\n\ndef signal(df: pd.DataFrame):\n    df['fast'] = df['close'].rolling(10).mean()\n    df['slow'] = df['close'].rolling(30).mean()\n    df['long'] = df['fast'] > df['slow']\n    return df`;
  if (p.includes('ctrader'))
    return `using cAlgo.API;\nnamespace cAlgo.Robots {\n  [Robot(AccessRights = AccessRights.None)]\n  public class GioRaptorBot : Robot {\n    protected override void OnBar() {\n      // SMA crossover entry logic\n    }\n  }\n}`;
  return `//+------------------------------------------------------------------+\n//| GIO Raptor AI Expert Advisor (MQL5)                             |\n//+------------------------------------------------------------------+\nint OnInit() { return(INIT_SUCCEEDED); }\nvoid OnTick() {\n   double fast = iMA(_Symbol,_Period,10,0,MODE_SMA,PRICE_CLOSE);\n   double slow = iMA(_Symbol,_Period,30,0,MODE_SMA,PRICE_CLOSE);\n   // crossover entry logic\n}`;
}

export { groupFor };
