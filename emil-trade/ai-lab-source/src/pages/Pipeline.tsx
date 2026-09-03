import { useState } from 'react';
import { Play, Loader2, Sparkles } from 'lucide-react';
import { AgentFlow } from '../components/AgentFlow';
import { Card, SectionTitle, StatusDot, ConfidenceBar } from '../components/ui';
import { useGeneratePipeline } from '../hooks/useApi';
import { useStore } from '../store';
import { AGENTS, agentMeta } from '../data/agents';

const EXAMPLES = [
  'Medium-risk strategy for NIFTY 50, EUR/USD, gold, Bitcoin and Nasdaq stocks. Risk 1% per trade. Backtest across regimes and send the strongest for approval.',
  'Mean-reversion basket on Bank Nifty options and large-cap Indian equities, intraday only.',
  'Trend-following on gold and crude with ATR stops; avoid high-impact news windows.',
];

export default function Pipeline() {
  const generate = useGeneratePipeline();
  const running = useStore((s) => s.pipelineRunning);
  const agentStatus = useStore((s) => s.agentStatus);
  const steps = useStore((s) => s.pipelineSteps);
  const pushToast = useStore((s) => s.pushToast);
  const [request, setRequest] = useState('');

  const completed = AGENTS.filter((a) => agentStatus[a.name]?.status === 'complete').length;
  const progress = (completed / AGENTS.length) * 100;

  const run = () => {
    if (request.trim()) {
      pushToast({ type: 'info', message: `Briefing agents: "${request.slice(0, 60)}${request.length > 60 ? '…' : ''}"` });
    }
    generate.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Strategy Pipeline</h2>
        <p className="text-sm text-subtext">
          Describe what you want — fifteen agents research, build, backtest, debate and rank it live.
        </p>
      </div>

      {/* Natural-language command bar */}
      <Card glow>
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-primary mt-2 shrink-0" />
          <div className="flex-1">
            <textarea
              className="input !h-20 text-sm leading-relaxed resize-none"
              placeholder="e.g. Create a medium-risk strategy for NIFTY 50, EUR/USD, gold, Bitcoin and Nasdaq stocks. Risk no more than 1% per trade. Backtest across market conditions and send the final candidates for my approval."
              value={request}
              onChange={(e) => setRequest(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setRequest(ex)}
                  className="badge border border-border text-subtext bg-bg hover:border-primary/50 hover:text-primary transition-colors text-left"
                >
                  {ex.slice(0, 42)}…
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary self-stretch" onClick={run} disabled={generate.isPending || running}>
            {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            {running ? 'Running…' : 'Run Agents'}
          </button>
        </div>
      </Card>

      {/* Overall progress */}
      <Card>
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-subtext font-semibold uppercase tracking-wide">Pipeline Progress</span>
          <span className="text-primary font-mono">
            {completed}/{AGENTS.length} agents
          </span>
        </div>
        <ConfidenceBar value={progress / 100} color={progress === 100 ? '#00ff88' : '#00d4ff'} />
      </Card>

      <Card>
        <AgentFlow height={460} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per-agent progress bars */}
        <Card>
          <SectionTitle>Agent Steps</SectionTitle>
          <div className="flex flex-col gap-2">
            {AGENTS.map((a, i) => {
              const st = agentStatus[a.name];
              const status = st?.status || 'idle';
              const meta = agentMeta(a.name);
              return (
                <div key={a.name} className="flex items-center gap-3">
                  <span className="text-xs text-subtext w-6 font-mono">{i + 1}</span>
                  <span className="text-base w-6">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold truncate">{meta.label}</span>
                      <StatusDot status={status} />
                    </div>
                    <ConfidenceBar
                      value={status === 'complete' ? 1 : status === 'running' ? 0.55 : 0.1}
                      color={status === 'complete' ? '#00ff88' : meta.color}
                    />
                    {st?.message && (
                      <div className="text-[10px] text-subtext mt-0.5 truncate">{st.message}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Streaming timeline */}
        <Card>
          <SectionTitle right={running ? <Loader2 size={14} className="animate-spin text-primary" /> : undefined}>
            Live Stream
          </SectionTitle>
          <div className="flex flex-col gap-1.5 max-h-[420px] overflow-auto font-mono text-xs">
            {steps.length === 0 && (
              <div className="text-subtext text-center py-8">
                No activity yet. Click <b className="text-primary">Generate Strategies</b> to start the pipeline.
              </div>
            )}
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2 py-1 border-b border-border/40 last:border-0">
                <span className="text-primary">[{s.step}]</span>
                <span className="text-subtext">{agentMeta(s.agent).label}</span>
                <span className="flex-1 text-text/80">{s.description}</span>
                <span
                  className={
                    s.status === 'complete'
                      ? 'text-success'
                      : s.status === 'error'
                        ? 'text-danger'
                        : 'text-primary'
                  }
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
