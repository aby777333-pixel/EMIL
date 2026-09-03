import { create } from 'zustand';
import type { TradingMode, AgentStatus, MarketTick } from '../types';

export interface Toast {
  id: number;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export interface PipelineStep {
  step: number;
  agent: string;
  status: string;
  description: string;
}

interface AppState {
  mode: TradingMode;
  setMode: (m: TradingMode) => void;

  connected: boolean;
  setConnected: (c: boolean) => void;

  // live agent statuses keyed by agent name
  agentStatus: Record<string, { status: AgentStatus; message?: string; step?: number }>;
  setAgentStatus: (agent: string, status: AgentStatus, message?: string, step?: number) => void;
  resetAgents: () => void;

  pipelineSteps: PipelineStep[];
  pushPipelineStep: (s: PipelineStep) => void;

  // live ticks keyed by symbol
  ticks: Record<string, MarketTick>;
  setTick: (t: MarketTick) => void;
  setTicks: (ts: MarketTick[]) => void;

  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: number) => void;

  killModalOpen: boolean;
  setKillModal: (o: boolean) => void;

  pipelineRunning: boolean;
  setPipelineRunning: (r: boolean) => void;
}

let toastId = 0;

export const useStore = create<AppState>((set) => ({
  mode: 'demo',
  setMode: (mode) => set({ mode }),

  connected: false,
  setConnected: (connected) => set({ connected }),

  agentStatus: {},
  setAgentStatus: (agent, status, message, step) =>
    set((s) => ({
      agentStatus: { ...s.agentStatus, [agent]: { status, message, step } },
    })),
  resetAgents: () => set({ agentStatus: {}, pipelineSteps: [] }),

  pipelineSteps: [],
  pushPipelineStep: (step) =>
    set((s) => ({ pipelineSteps: [...s.pipelineSteps.slice(-40), step] })),

  ticks: {},
  setTick: (t) => set((s) => ({ ticks: { ...s.ticks, [t.symbol]: t } })),
  setTicks: (ts) =>
    set(() => {
      const map: Record<string, MarketTick> = {};
      for (const t of ts) map[t.symbol] = t;
      return { ticks: map };
    }),

  toasts: [],
  pushToast: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: ++toastId }].slice(-6) })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  killModalOpen: false,
  setKillModal: (killModalOpen) => set({ killModalOpen }),

  pipelineRunning: false,
  setPipelineRunning: (pipelineRunning) => set({ pipelineRunning }),
}));
