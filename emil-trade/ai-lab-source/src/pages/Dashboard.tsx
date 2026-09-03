import { useMemo } from 'react';
import {
  Layers,
  Briefcase,
  TrendingUp,
  Target,
  Activity,
  Play,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MarketTicker } from '../components/MarketTicker';
import { AgentFlow } from '../components/AgentFlow';
import { Card, ConfidenceBar, StatusDot, Skeleton, SectionTitle, fmtMoney, pnlColor } from '../components/ui';
import { useDashboard, useAgents, useGeneratePipeline } from '../hooks/useApi';
import { useStore } from '../store';
import { AGENTS, agentMeta } from '../data/agents';

const MODE_INFO: Record<string, { title: string; desc: string; color: string }> = {
  demo: {
    title: 'Demo Mode',
    desc: 'Strategies auto-approve and trades simulate instantly with animations. Safe sandbox — no real orders.',
    color: '#00d4ff',
  },
  paper: {
    title: 'Paper Trading Mode',
    desc: 'Approved strategies trade against live simulated fills. No real capital at risk.',
    color: '#ffaa00',
  },
  live: {
    title: 'Live Trading Mode',
    desc: '⚠️ Real orders routed to connected brokers. Every strategy requires explicit approval.',
    color: '#ff4444',
  },
};

export default function Dashboard() {
  const { data, isLoading } = useDashboard();
  const { data: agents } = useAgents();
  const mode = useStore((s) => s.mode);
  const liveAgentStatus = useStore((s) => s.agentStatus);
  const generate = useGeneratePipeline();
  const navigate = useNavigate();

  const mi = MODE_INFO[mode];

  const kpis = data?.summary;
  const winRate = useMemo(() => {
    const strategies = data?.recent_strategies || [];
    const rates = strategies
      .map((s) => s.backtest?.metrics?.win_rate_pct)
      .filter((v): v is number => typeof v === 'number');
    if (!rates.length) return 0;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <MarketTicker />

      {/* Mode banner */}
      <div
        className="glass p-4 flex items-center justify-between border-l-4"
        style={{ borderLeftColor: mi.color }}
      >
        <div>
          <div className="text-lg font-bold" style={{ color: mi.color }}>
            {mi.title}
          </div>
          <div className="text-sm text-subtext max-w-2xl">{mi.desc}</div>
        </div>
        <button
          className="btn-primary"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
        >
          <Play size={15} /> Generate Strategies
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Layers size={18} />} label="Total Strategies" value={kpis?.total_strategies} loading={isLoading} />
        <KpiCard icon={<Briefcase size={18} />} label="Active Positions" value={kpis?.open_positions} loading={isLoading} />
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="Today's PnL"
          value={kpis ? `$${fmtMoney(kpis.total_pnl)}` : undefined}
          valueClass={pnlColor(kpis?.total_pnl)}
          loading={isLoading}
        />
        <KpiCard
          icon={<Target size={18} />}
          label="Avg Win Rate"
          value={`${winRate.toFixed(1)}%`}
          loading={isLoading}
        />
      </div>

      {/* Agent status grid + pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <SectionTitle right={<span className="text-xs text-subtext">15-agent pipeline</span>}>
            Pipeline Visual
          </SectionTitle>
          <AgentFlow height={380} />
        </Card>

        <Card>
          <SectionTitle>Agent Status</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {AGENTS.map((a) => {
              const live = liveAgentStatus[a.name];
              const remote = agents?.find((x) => x.name === a.name);
              const status = live?.status || (remote?.status as any) || 'idle';
              const meta = agentMeta(a.name);
              return (
                <div key={a.name} className="glass !rounded-lg p-2.5 border border-border">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{meta.icon}</span>
                    <span className="text-xs font-semibold truncate flex-1">{meta.label}</span>
                    <StatusDot status={status} />
                  </div>
                  <ConfidenceBar
                    value={status === 'complete' ? 1 : status === 'running' ? 0.6 : 0.15}
                    color={status === 'complete' ? '#00ff88' : meta.color}
                  />
                  <div className="text-[9px] text-subtext mt-1 truncate">
                    {live?.message || meta.description}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Regime + Activity feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <SectionTitle>Market Regime</SectionTitle>
          {data?.regime ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-primary">{data.regime.regime}</span>
                <span className="badge border border-primary/40 text-primary bg-primary/10">
                  {Math.round((data.regime.confidence || 0) * 100)}% conf
                </span>
              </div>
              <ConfidenceBar value={data.regime.confidence || 0} />
              <p className="text-xs text-subtext mt-3 leading-relaxed">{data.regime.description}</p>
            </div>
          ) : (
            <Skeleton className="h-24" />
          )}
        </Card>

        <Card className="xl:col-span-2">
          <SectionTitle right={<Activity size={14} className="text-primary" />}>Recent Activity</SectionTitle>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-auto">
            {(data?.recent_events || []).map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b border-border/50 last:border-0">
                <StatusDot status={e.event_type.includes('error') ? 'error' : 'complete'} />
                <span className="flex-1 text-text/90">{e.message}</span>
                <span className="text-subtext whitespace-nowrap">
                  {e.created_at ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true }) : ''}
                </span>
              </div>
            ))}
            {!data?.recent_events?.length && <Skeleton className="h-24" />}
          </div>
        </Card>
      </div>

      <div className="flex justify-center">
        <button className="btn-ghost" onClick={() => navigate('/pipeline')}>
          Open full pipeline view →
        </button>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  valueClass = '',
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number;
  valueClass?: string;
  loading?: boolean;
}) {
  return (
    <Card className="glass-hover">
      <div className="flex items-center gap-2 text-subtext text-xs font-semibold uppercase tracking-wide mb-2">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      {loading || value == null ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <div className={`kpi-value ${valueClass}`}>{value}</div>
      )}
    </Card>
  );
}
