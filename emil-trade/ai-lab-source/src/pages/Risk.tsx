import { useState } from 'react';
import { Shield, Power, SlidersHorizontal, Ban, Check } from 'lucide-react';
import { Card, SectionTitle, Badge } from '../components/ui';
import { useStore } from '../store';

// Full risk-control surface (system / account / portfolio / strategy / trade level).
const LIMITS: { key: string; label: string; value: string; level: string }[] = [
  { key: 'per_trade', label: 'Max risk per trade', value: '2.0%', level: 'Trade' },
  { key: 'sl', label: 'Stop-loss', value: 'ATR ×1.5 (or fixed)', level: 'Trade' },
  { key: 'tp', label: 'Take-profit', value: 'ATR ×3.0', level: 'Trade' },
  { key: 'trail', label: 'Trailing stop / break-even', value: 'On @ +1R', level: 'Trade' },
  { key: 'order_size', label: 'Max order size', value: '5.0 lots', level: 'Trade' },
  { key: 'daily', label: 'Max daily loss', value: '$500', level: 'Account' },
  { key: 'weekly', label: 'Max weekly loss', value: '$1,500', level: 'Account' },
  { key: 'monthly', label: 'Max monthly loss', value: '$4,000', level: 'Account' },
  { key: 'dd', label: 'Max drawdown', value: '12%', level: 'Account' },
  { key: 'max_pos', label: 'Max open positions', value: '8', level: 'Account' },
  { key: 'freq', label: 'Max trade frequency', value: '20 / day', level: 'Account' },
  { key: 'sym', label: 'Max exposure per symbol', value: '15%', level: 'Portfolio' },
  { key: 'class', label: 'Max exposure per asset class', value: '30%', level: 'Portfolio' },
  { key: 'corr', label: 'Max correlated exposure', value: '40%', level: 'Portfolio' },
  { key: 'lev', label: 'Max leverage', value: '10:1', level: 'Portfolio' },
  { key: 'margin', label: 'Max margin usage', value: '50%', level: 'Portfolio' },
  { key: 'cooldown', label: 'Cool-down after losses', value: '30 min', level: 'Strategy' },
  { key: 'streak', label: 'Consecutive-loss suspension', value: '5 losses', level: 'Strategy' },
  { key: 'news', label: 'News-event restriction', value: 'High-impact ±15 min', level: 'Strategy' },
  { key: 'weekend', label: 'Weekend holding', value: 'Blocked', level: 'Strategy' },
  { key: 'session', label: 'Session restriction', value: 'RTH only', level: 'Strategy' },
];

const LEVEL_COLOR: Record<string, string> = {
  Trade: '#00d4ff', Account: '#facc15', Portfolio: '#a78bfa', Strategy: '#00ff88',
};

const KILL_ACTIONS = [
  'Prevent new orders', 'Cancel pending orders', 'Close selected positions',
  'Close all positions', 'Disable one strategy', 'Disable all strategies',
  'Disconnect execution (keep monitoring)',
];

export default function Risk() {
  const setKillModal = useStore((s) => s.setKillModal);
  const pushToast = useStore((s) => s.pushToast);
  const [actions, setActions] = useState<Record<string, boolean>>({
    'Prevent new orders': true, 'Cancel pending orders': true, 'Close all positions': false,
  });
  const [scope, setScope] = useState<'strategy' | 'account' | 'global'>('account');

  const toggle = (a: string) => setActions((s) => ({ ...s, [a]: !s[a] }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Risk &amp; Controls</h2>
        <p className="text-sm text-subtext">
          System, account, portfolio, strategy and trade-level limits, plus the layered kill switch.
          The risk engine is deterministic — AI agents can never bypass it.
        </p>
      </div>

      <Card>
        <SectionTitle right={<SlidersHorizontal size={14} className="text-primary" />}>Default Risk Limits</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {LIMITS.map((l) => (
            <div key={l.key} className="glass !rounded-lg p-2.5 border border-border flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{l.label}</div>
                <span className="text-[9px] font-bold uppercase" style={{ color: LEVEL_COLOR[l.level] }}>{l.level}</span>
              </div>
              <span className="text-xs font-mono text-primary shrink-0 ml-2">{l.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-danger/40">
          <SectionTitle right={<Power size={14} className="text-danger" />}>Emergency Kill Switch</SectionTitle>
          <p className="text-xs text-subtext mb-3">Choose the scope and the actions the kill switch performs when triggered.</p>
          <div className="flex gap-1 mb-3">
            {(['strategy', 'account', 'global'] as const).map((sc) => (
              <button key={sc} onClick={() => setScope(sc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${scope === sc ? 'bg-danger/15 text-danger border border-danger/40' : 'text-subtext border border-border hover:text-text'}`}>
                {sc}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
            {KILL_ACTIONS.map((a) => (
              <label key={a} className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={!!actions[a]} onChange={() => toggle(a)} className="accent-[#ff4444]" />
                {a}
              </label>
            ))}
          </div>
          <button className="btn-danger w-full justify-center animate-pulseGlow" style={{ animationDuration: '2.4s' }}
            onClick={() => setKillModal(true)}>
            <Power size={15} /> Trigger {scope} kill switch
          </button>
        </Card>

        <Card>
          <SectionTitle right={<Shield size={14} className="text-primary" />}>Live Risk Status</SectionTitle>
          <div className="flex flex-col gap-2.5">
            <RiskBar label="Daily loss used" value={38} cap="$500" />
            <RiskBar label="Drawdown" value={22} cap="12%" />
            <RiskBar label="Margin usage" value={54} cap="50%" warn />
            <RiskBar label="Open positions" value={62} cap="8" />
            <RiskBar label="Correlated exposure" value={31} cap="40%" />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Badge status="APPROVED"><Check size={11} /> risk engine active</Badge>
            <Badge status="REJECTED"><Ban size={11} /> agents cannot override</Badge>
          </div>
          <button className="btn-ghost w-full justify-center mt-3" onClick={() => pushToast({ type: 'success', message: 'Risk limits saved.' })}>
            Save limits
          </button>
        </Card>
      </div>
    </div>
  );
}

function RiskBar({ label, value, cap, warn }: { label: string; value: number; cap: string; warn?: boolean }) {
  const color = value >= 80 ? '#ff4444' : warn || value >= 60 ? '#facc15' : '#00ff88';
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-subtext">{label}</span>
        <span className="font-mono" style={{ color }}>{value}% of {cap}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-bg overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}
