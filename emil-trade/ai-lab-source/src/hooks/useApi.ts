import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useStore } from '../store';
import { AGENTS, agentMeta } from '../data/agents';

// When no live backend WebSocket is connected (e.g. the lab is embedded as a
// standalone demo inside the Raptor terminal), drive the multi-agent flow
// entirely client-side so the pipeline is fully visual. Each agent lights up,
// runs, then completes in sequence, streaming steps into the live timeline.
let simTimers: ReturnType<typeof setTimeout>[] = [];

function agentResultLine(name: string): string {
  const lines: Record<string, string> = {
    MarketDataAgent: 'Pulled OHLCV + depth for 40 instruments across 8 venues.',
    ScannerAgent: 'Ranked universe — 12 momentum / 6 breakout candidates flagged.',
    ResearchAgent: 'Extracted 5 hypotheses from quant papers (sources attached).',
    SentimentAgent: 'Scored news & social flow — net risk-on, 0.61 confidence.',
    FundamentalAgent: 'Macro + valuation screen cleared for 4 candidate symbols.',
    RegimeDetectionAgent: 'Detected TRENDING regime, 0.72 confidence.',
    TechnicalIndicatorAgent: 'Computed SMA/RSI/MACD/ATR/Bollinger on all timeframes.',
    StrategyGenerationAgent: 'Synthesised 6 candidate strategies.',
    BacktestingAgent: 'Completed 6 backtests with cost & slippage modelling.',
    RobustnessAgent: 'Walk-forward + Monte Carlo passed on 4/6 strategies.',
    RiskCheckAgent: 'Validated 4/6 against drawdown & exposure limits.',
    RankingAgent: 'Scored & ranked survivors on weighted multi-metric score.',
    VotingAgent: 'Multi-agent debate reached consensus on top candidates.',
    ExecutionAgent: 'Execution adapter armed (demo) — duplicate-order guard active.',
    MonitoringAgent: 'Monitoring online — awaiting your approval to deploy.',
  };
  return lines[name] || `${agentMeta(name).label} finished.`;
}

export function simulatePipeline(onDone?: () => void) {
  const st = useStore.getState();
  simTimers.forEach(clearTimeout);
  simTimers = [];
  st.resetAgents();
  st.setPipelineRunning(true);

  const perAgent = 620; // ms between agents
  AGENTS.forEach((a, i) => {
    simTimers.push(
      setTimeout(() => {
        useStore.getState().setAgentStatus(a.name, 'running', 'analysing…', i + 1);
      }, i * perAgent),
    );
    simTimers.push(
      setTimeout(() => {
        const msg = agentResultLine(a.name);
        useStore.getState().setAgentStatus(a.name, 'complete', msg, i + 1);
        useStore.getState().pushPipelineStep({
          step: i + 1,
          agent: a.name,
          status: 'complete',
          description: msg,
        });
      }, i * perAgent + perAgent * 0.62),
    );
  });

  simTimers.push(
    setTimeout(() => {
      useStore.getState().setPipelineRunning(false);
      onDone?.();
    }, AGENTS.length * perAgent + 400),
  );
}

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 8000 });
}

export function useMarkets() {
  return useQuery({ queryKey: ['markets'], queryFn: api.markets, refetchInterval: 5000 });
}

export function useMarketData(symbol: string, timeframe = '1H') {
  return useQuery({
    queryKey: ['market-data', symbol, timeframe],
    queryFn: () => api.marketData(symbol, timeframe),
    enabled: !!symbol,
  });
}

export function useStrategies(status?: string) {
  return useQuery({
    queryKey: ['strategies', status],
    queryFn: () => api.strategies(status),
    refetchInterval: 10000,
  });
}

export function useStrategy(id: number | null) {
  return useQuery({
    queryKey: ['strategy', id],
    queryFn: () => api.strategy(id as number),
    enabled: id != null,
  });
}

export function usePositions(status = 'open') {
  return useQuery({
    queryKey: ['positions', status],
    queryFn: () => api.positions(status),
    refetchInterval: 5000,
  });
}

export function useResearch() {
  return useQuery({ queryKey: ['research'], queryFn: api.research });
}

export function useAuditLog(limit = 100) {
  return useQuery({ queryKey: ['audit', limit], queryFn: () => api.auditLog(limit), refetchInterval: 8000 });
}

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: api.agents, refetchInterval: 4000 });
}

export function useRegime() {
  return useQuery({ queryKey: ['regime'], queryFn: api.regime, refetchInterval: 30000 });
}

export function useBrokers() {
  return useQuery({ queryKey: ['brokers'], queryFn: api.brokers });
}

export function useGeneratePipeline() {
  const pushToast = useStore((s) => s.pushToast);
  const resetAgents = useStore((s) => s.resetAgents);
  const setPipelineRunning = useStore((s) => s.setPipelineRunning);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.generateStrategies,
    onMutate: () => {
      resetAgents();
      setPipelineRunning(true);
    },
    onSuccess: () => {
      pushToast({ type: 'info', message: 'AI agent pipeline started — watch the flow.' });
      // If a live backend is streaming agent events over the WebSocket, let it
      // drive the flow. Otherwise (standalone demo embed) simulate it locally
      // so every stage is still fully visual.
      if (!useStore.getState().connected) {
        simulatePipeline(() => qc.invalidateQueries({ queryKey: ['strategies'] }));
      } else {
        setTimeout(() => qc.invalidateQueries({ queryKey: ['strategies'] }), 12000);
      }
    },
    onError: () => pushToast({ type: 'error', message: 'Failed to start pipeline.' }),
  });
}

export function useApprove() {
  const pushToast = useStore((s) => s.pushToast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.approve(id),
    onSuccess: () => {
      pushToast({ type: 'success', message: 'Strategy approved → Paper trading.' });
      qc.invalidateQueries({ queryKey: ['strategies'] });
    },
  });
}

export function useReject() {
  const pushToast = useStore((s) => s.pushToast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.reject(id, reason),
    onSuccess: () => {
      pushToast({ type: 'warning', message: 'Strategy rejected.' });
      qc.invalidateQueries({ queryKey: ['strategies'] });
    },
  });
}

export function useKillSwitch() {
  const pushToast = useStore((s) => s.pushToast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => api.killSwitch(reason),
    onSuccess: (r: any) => {
      pushToast({ type: 'error', message: `🛑 Kill switch — ${r.closed ?? 0} positions closed.` });
      qc.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
