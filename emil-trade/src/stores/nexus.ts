// ===============================================================
// EMIL TRADE -- NEXUS AI Dealer Co-Pilot Store
// State management for the NEXUS AI assistant panel
// ===============================================================

import { create } from 'zustand';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface NexusChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface NexusRecommendation {
  routing: string;
  slippage: number;
  confidence: number;
  reasons: string[];
}

export interface NexusWatchItem {
  id: string;
  name: string;
  risk: string;
  icon: string;
}

// ---------------------------------------------------------------
// Store
// ---------------------------------------------------------------

interface NexusState {
  isOpen: boolean;
  chatMessages: NexusChatMessage[];
  recommendation: NexusRecommendation | null;
  watchList: NexusWatchItem[];

  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  addMessage: (msg: NexusChatMessage) => void;
  clearMessages: () => void;
  setRecommendation: (rec: NexusRecommendation | null) => void;
}

export const useNexusStore = create<NexusState>((set) => ({
  isOpen: false,

  chatMessages: [],

  recommendation: null,

  watchList: [
    { id: 'ACC-10078', name: 'Toxic 58/100', risk: 'warning', icon: 'alert' },
    { id: 'ACC-10200', name: 'Institutional', risk: 'flag', icon: 'zap' },
    { id: 'ACC-10042', name: 'Normal', risk: 'watch', icon: 'eye' },
    { id: 'ACC-10315', name: 'Scalper 72/100', risk: 'warning', icon: 'alert' },
  ],

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  addMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, msg],
    })),

  clearMessages: () => set({ chatMessages: [] }),

  setRecommendation: (rec) => set({ recommendation: rec }),
}));
