import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Eye, Check, X, Code2, Rocket, Loader2, Plug, AlertTriangle } from 'lucide-react';
import { Card, Badge, Skeleton, fmtMoney, Modal } from '../components/ui';
import { MiniVotes } from '../components/AgentVotes';
import { StrategyDetail } from '../components/StrategyDetail';
import { useStrategies, useApprove, useReject, useGeneratePipeline } from '../hooks/useApi';
import { useStore } from '../store';
import type { Strategy } from '../types';

const FILTERS = ['All', 'PENDING', 'PAPER', 'APPROVED', 'REJECTED'];

export default function Strategies() {
  const [filter, setFilter] = useState('All');
  const { data: strategies, isLoading } = useStrategies();
  const [detail, setDetail] = useState<Strategy | null>(null);
  const [approveTarget, setApproveTarget] = useState<Strategy | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Strategy | null>(null);
  const [liveTarget, setLiveTarget] = useState<Strategy | null>(null);
  const generate = useGeneratePipeline();
  const mode = useStore((s) => s.mode);

  const filtered = (strategies || []).filter((s) => filter === 'All' || s.status === filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Strategies</h2>
          <p className="text-sm text-subtext">AI-generated strategies with backtests, votes & EA export.</p>
        </div>
        <button className="btn-primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
          <Play size={15} /> Generate Strategies
        </button>
      </div>

      <div className="flex gap-1 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-primary/15 text-primary border border-primary/40'
                : 'text-subtext border border-border hover:text-text'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <StrategyCard
              key={s.id}
              s={s}
              demo={mode === 'demo'}
              onView={() => setDetail(s)}
              onApprove={() => setApproveTarget(s)}
              onReject={() => setRejectTarget(s)}
              onGoLive={() => setLiveTarget(s)}
            />
          ))}
        </div>
      )}

      <StrategyDetail strategy={detail} onClose={() => setDetail(null)} />
      <ApproveModal strategy={approveTarget} onClose={() => setApproveTarget(null)} />
      <RejectModal strategy={rejectTarget} onClose={() => setRejectTarget(null)} />
      <GoLiveModal strategy={liveTarget} onClose={() => setLiveTarget(null)} />
    </div>
  );
}

function StrategyCard({
  s,
  demo,
  onView,
  onApprove,
  onReject,
  onGoLive,
}: {
  s: Strategy;
  demo: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onGoLive: () => void;
}) {
  const m = s.backtest?.metrics || {};
  const isPending = s.status === 'PENDING';
  return (
    <Card className="flex flex-col gap-3 glass-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold truncate">{s.name}</h3>
          <p className="text-xs text-subtext line-clamp-2 mt-0.5">{s.description}</p>
        </div>
        <Badge status={s.status as string}>{s.status}</Badge>
      </div>

      <div className="flex flex-wrap gap-1">
        {(s.config?.markets || []).slice(0, 4).map((mk) => (
          <span key={mk} className="badge border border-border text-subtext bg-bg text-[10px]">
            {mk}
          </span>
        ))}
      </div>

      {isPending && (
        <div className="text-[11px] text-warning bg-warning/10 border border-warning/30 rounded-lg px-2 py-1 font-semibold">
          ⚠️ Awaiting Your Approval
        </div>
      )}
      {s.status === 'PAPER' && (
        <div className="text-[11px] text-success bg-success/10 border border-success/30 rounded-lg px-2 py-1 font-semibold">
          ✅ Approved — Paper Trading
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Return" value={m.total_return_pct != null ? `${m.total_return_pct}%` : '—'} good={(m.total_return_pct || 0) >= 0} />
        <Metric label="Sharpe" value={m.sharpe != null ? String(m.sharpe) : '—'} good={(m.sharpe || 0) >= 1} />
        <Metric label="Max DD" value={m.max_drawdown_pct != null ? `${m.max_drawdown_pct}%` : '—'} good={false} />
        <Metric label="Win Rate" value={m.win_rate_pct != null ? `${m.win_rate_pct}%` : '—'} good={(m.win_rate_pct || 0) >= 50} />
        <Metric label="Profit F." value={m.profit_factor != null ? String(m.profit_factor) : '—'} good={(m.profit_factor || 0) >= 1.2} />
        <Metric label="Risk" value={String(s.config?.risk_level || '—')} good />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-subtext">
        <span className="text-success">▲ {s.config?.best_regime || '—'}</span>
        <span className="text-danger">▼ {s.config?.worst_regime || '—'}</span>
      </div>

      {s.config?.explanation && (
        <p className="text-[11px] text-subtext leading-snug line-clamp-2 italic border-l-2 border-primary/40 pl-2">
          {s.config.explanation}
        </p>
      )}

      {s.votes && s.votes.length > 0 && <MiniVotes votes={s.votes} />}

      <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
        <button className="btn-ghost !py-1.5 text-xs flex-1" onClick={onView}>
          <Eye size={13} /> Details
        </button>
        {isPending && (
          <>
            <button className="btn-success !py-1.5 text-xs" onClick={onApprove}>
              <Check size={13} /> {demo ? 'Deploy Demo' : 'Approve'}
            </button>
            <button className="btn-danger !py-1.5 text-xs" onClick={onReject}>
              <X size={13} />
            </button>
          </>
        )}
        <button className="btn-ghost !py-1.5 text-xs" onClick={onView} title="Generate EA">
          <Code2 size={13} />
        </button>
        {s.status === 'PAPER' && (
          <button
            className="btn-primary !py-1.5 text-xs"
            title="Deploy to live trading"
            onClick={onGoLive}
          >
            <Rocket size={13} /> Live
          </button>
        )}
      </div>
    </Card>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="glass !rounded-lg p-1.5 border border-border">
      <div className="text-[9px] text-subtext uppercase">{label}</div>
      <div className={`text-xs font-bold font-mono ${good ? 'text-success' : 'text-text'}`}>{value}</div>
    </div>
  );
}

function ApproveModal({ strategy, onClose }: { strategy: Strategy | null; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const approve = useApprove();
  const m = strategy?.backtest?.metrics || {};

  const submit = () => {
    if (!strategy) return;
    approve.mutate(strategy.id);
    onClose();
    setConfirmed(false);
  };

  return (
    <Modal open={!!strategy} onClose={onClose} title={<span className="text-success">Approve Strategy</span>}>
      {strategy && (
        <div className="flex flex-col gap-4">
          <div className="font-bold">{strategy.name}</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SummaryStat label="Return" value={m.total_return_pct != null ? `${m.total_return_pct}%` : '—'} />
            <SummaryStat label="Sharpe" value={m.sharpe != null ? String(m.sharpe) : '—'} />
            <SummaryStat label="Max DD" value={m.max_drawdown_pct != null ? `${m.max_drawdown_pct}%` : '—'} />
            <SummaryStat label="Win Rate" value={m.win_rate_pct != null ? `${m.win_rate_pct}%` : '—'} />
            <SummaryStat label="Profit F." value={m.profit_factor != null ? String(m.profit_factor) : '—'} />
            <SummaryStat label="Trades" value={m.num_trades != null ? String(m.num_trades) : '—'} />
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-[#00ff88]"
            />
            <span>I confirm this strategy meets my risk requirements.</span>
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-success" disabled={!confirmed || approve.isPending} onClick={submit}>
              {approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve →
              Paper
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function RejectModal({ strategy, onClose }: { strategy: Strategy | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const reject = useReject();
  const submit = () => {
    if (!strategy) return;
    reject.mutate({ id: strategy.id, reason });
    onClose();
    setReason('');
  };
  return (
    <Modal open={!!strategy} onClose={onClose} title={<span className="text-danger">Reject Strategy</span>}>
      {strategy && (
        <div className="flex flex-col gap-4">
          <div className="font-bold">{strategy.name}</div>
          <div>
            <label className="text-xs text-subtext mb-1 block">Reason for rejection</label>
            <textarea
              className="input h-24 resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. drawdown too high for my risk profile"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-danger" onClick={submit} disabled={reject.isPending}>
              <X size={14} /> Reject
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function GoLiveModal({ strategy, onClose }: { strategy: Strategy | null; onClose: () => void }) {
  const navigate = useNavigate();
  const setMode = useStore((s) => s.setMode);
  const pushToast = useStore((s) => s.pushToast);

  const goToSettings = () => {
    onClose();
    navigate('/settings');
    pushToast({ type: 'info', message: 'Connect a broker under Broker Connections to enable live trading.' });
  };

  return (
    <Modal
      open={!!strategy}
      onClose={onClose}
      title={<span className="text-primary flex items-center gap-2"><Rocket size={16} /> Deploy to Live Trading</span>}
    >
      {strategy && (
        <div className="flex flex-col gap-4">
          <div className="font-bold">{strategy.name}</div>
          <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              Live trading places <b>real orders</b> with real capital. To go live you must connect a
              broker and switch the app into <b>Live</b> mode. Until then this strategy keeps running in
              paper mode.
            </span>
          </div>
          <ul className="text-xs text-subtext list-disc pl-5 space-y-1">
            <li>Connect a supported broker (MT5, Alpaca, IBKR, Binance, OANDA…) in Settings.</li>
            <li>Switch the trading mode to <b>Live</b>.</li>
            <li>Re-confirm this strategy to route orders to your broker.</li>
          </ul>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setMode('live');
                pushToast({ type: 'warning', message: 'Switched to Live mode — connect a broker to route real orders.' });
                onClose();
              }}
            >
              Switch to Live Mode
            </button>
            <button className="btn-primary" onClick={goToSettings}>
              <Plug size={14} /> Go to Settings
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass !rounded-lg p-2 border border-border">
      <div className="text-[10px] text-subtext uppercase">{label}</div>
      <div className="text-sm font-bold font-mono">{value}</div>
    </div>
  );
}
