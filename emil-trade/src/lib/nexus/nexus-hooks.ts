// ═══════════════════════════════════════════════════════════
// EMIL TRADE — NEXUS React Hooks
// Use NEXUS from any React component across the platform
// ═══════════════════════════════════════════════════════════

'use client';

import { useState, useCallback } from 'react';
import { nexus, type NexusModule } from '@/lib/nexus/nexus-api';
import type { NexusResponse } from '@/types/nexus';

interface UseNexusOptions {
  module: NexusModule;
  autoDisclaimer?: boolean;
}

interface UseNexusReturn {
  response: NexusResponse | null;
  isLoading: boolean;
  error: string | null;
  ask: (message: string, context?: Record<string, unknown>) => Promise<NexusResponse>;
  analyze: (context: Record<string, unknown>) => Promise<NexusResponse>;
  suggest: (context: Record<string, unknown>) => Promise<NexusResponse>;
  warn: (context: Record<string, unknown>) => Promise<NexusResponse>;
  draft: (context: Record<string, unknown>, purpose?: string) => Promise<NexusResponse>;
  report: (context: Record<string, unknown>) => Promise<NexusResponse>;
  coach: (context: Record<string, unknown>) => Promise<NexusResponse>;
  reset: () => void;
}

/**
 * Universal NEXUS hook — use from any component
 *
 * @example
 * const { ask, response, isLoading } = useNexus({ module: 'charts' });
 * await ask('Detect patterns on EURUSD H4', { symbol: 'EURUSD', timeframe: 'H4' });
 */
export function useNexus({ module }: UseNexusOptions): UseNexusReturn {
  const [response, setResponse] = useState<NexusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    method: 'analyze' | 'suggest' | 'warn' | 'draft' | 'report' | 'coach',
    context: Record<string, unknown>,
    userMessage?: string,
  ): Promise<NexusResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await nexus[method]({ module, context, userMessage });
      setResponse(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'NEXUS request failed';
      setError(msg);
      const fallback: NexusResponse = {
        response: msg, confidence: 0, sources: [], disclaimer: '', actions: [], sentiment: 'informational',
      };
      setResponse(fallback);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, [module]);

  const ask = useCallback((message: string, context: Record<string, unknown> = {}) =>
    execute('analyze', context, message), [execute]);

  const analyze = useCallback((context: Record<string, unknown>) =>
    execute('analyze', context), [execute]);

  const suggest = useCallback((context: Record<string, unknown>) =>
    execute('suggest', context), [execute]);

  const warn = useCallback((context: Record<string, unknown>) =>
    execute('warn', context), [execute]);

  const draft = useCallback((context: Record<string, unknown>, purpose?: string) =>
    execute('draft', context, purpose), [execute]);

  const report = useCallback((context: Record<string, unknown>) =>
    execute('report', context), [execute]);

  const coach = useCallback((context: Record<string, unknown>) =>
    execute('coach', context), [execute]);

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return { response, isLoading, error, ask, analyze, suggest, warn, draft, report, coach, reset };
}

/**
 * Pre-Trade NEXUS hook — specialized for order entry
 * Automatically runs pre-trade analysis when called
 */
export function useNexusPreTrade() {
  return useNexus({ module: 'order_entry' });
}

/**
 * Position Monitor NEXUS hook
 */
export function useNexusPositionMonitor() {
  return useNexus({ module: 'position_monitor' });
}

/**
 * CRM NEXUS hook — for lead scoring, churn prediction, email drafting
 */
export function useNexusCRM() {
  return useNexus({ module: 'crm' });
}

/**
 * Dealing Desk NEXUS hook — routing advice, risk alerts
 */
export function useNexusDesk() {
  return useNexus({ module: 'desk' });
}

/**
 * Chart Intelligence NEXUS hook — patterns, zones, overlays
 */
export function useNexusCharts() {
  return useNexus({ module: 'charts' });
}

/**
 * Compliance NEXUS hook — AML, SAR, regulatory
 */
export function useNexusComply() {
  return useNexus({ module: 'comply' });
}

/**
 * Education NEXUS hook — lessons, quizzes, debriefs
 */
export function useNexusEducation() {
  return useNexus({ module: 'education' });
}

/**
 * Communications NEXUS hook — sentiment, drafts, responses
 */
export function useNexusComms() {
  return useNexus({ module: 'comms' });
}

/**
 * Incident NEXUS hook — classification, playbook, escalation
 */
export function useNexusIncidents() {
  return useNexus({ module: 'incidents' });
}

/**
 * Intel NEXUS hook — natural language BI queries
 */
export function useNexusIntel() {
  return useNexus({ module: 'intel' });
}
