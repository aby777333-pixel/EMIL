import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { PieChart as PieIcon, Scale, Layers } from 'lucide-react';
import { Card, SectionTitle, fmtMoney, fmtPct, pnlColor } from '../components/ui';
import { useStrategies } from '../hooks/useApi';
import { mockEquityCurve } from '../data/mock';

export default function Portfolio() {
  const { data: strategies } = useStrategies();
  const list = strategies || [];

  // equal-weight default, user-adjustable
  const [weights, setWeights] = useState<Record<number, number>>({});
  const getW = (id: number) => weights[id] ?? Math.round(100 / Math.max(list.length, 1));

  const setW = (id: number, v: number) => setWeights((w) => ({ ...w, [id]: v }));

  const combined = useMemo(() => {
    // Blend a few mock curves into a single portfolio equity line.
    const curves = list.slice(0, 6).map(() => mockEquityCurve());
    const n = curves[0]?.length || 0;
    return Array.from({ length: n }, (_, i) => {
      let eq = 0, bench = 0, w = 0;
      curves.forEach((c, ci) => {
        const wt = getW(list[ci]?.id ?? ci);
        eq += (c[i]?.equity ?? 10000) * wt;
        bench += (c[i]?.benchmark ?? 10000) * wt;
        w += wt;
      });
      return {
        i,
        equity: w ? Math.round(eq / w) : 10000,
        benchmark: w ? Math.round(bench / w) : 10000,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, weights]);

  const totalW = list.reduce((a, s) => a + getW(s.id), 0);
  const avgSharpe = avg(list.map((s) => s.backtest?.metrics?.sharpe));
  const avgDd = avg(list.map((s) => s.backtest?.metrics?.max_drawdown_pct));
  const finalEq = combined[combined.length - 1]?.equity ?? 10000;
  const retPct = ((finalEq - 10000) / 10000) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Portfolio Lab</h2>
        <p className="text-sm text-subtext">
          Combine strategies, allocate capital, cap correlation and stress-test the whole basket before deployment.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Layers size={16} />} label="Strategies" value={String(list.length)} />
        <Stat icon={<PieIcon size={16} />} label="Allocated" value={`${totalW}%`} />
        <Stat icon={<Scale size={16} />} label="Blended Sharpe" value={avgSharpe.toFixed(2)} />
        <Stat icon={<Scale size={16} />} label="Portfolio return" value={fmtPct(retPct)} valueClass={pnlColor(retPct)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Allocation */}
        <Card>
          <SectionTitle>Capital Allocation</SectionTitle>
          <div className="flex flex-col gap-3 max-h-[360px] overflow-auto pr-1">
            {list.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="truncate">{s.name}</span>
                  <span className="font-mono text-primary">{getW(s.id)}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={getW(s.id)}
                  onChange={(e) => setW(s.id, +e.target.value)}
                  className="w-full accent-[#00d4ff]"
                />
              </div>
            ))}
            {totalW !== 100 && (
              <p className="text-[11px] text-warning">Weights sum to {totalW}% — normalise to 100% before deployment.</p>
            )}
          </div>
        </Card>

        {/* Combined equity */}
        <Card className="lg:col-span-2">
          <SectionTitle right={<span className="text-[10px] text-subtext">blended equity vs benchmark</span>}>Portfolio Backtest</SectionTitle>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combined}>
                <defs>
                  <linearGradient id="pEq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} width={54} />
                <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="benchmark" stroke="#475569" fill="none" strokeWidth={1} />
                <Area type="monotone" dataKey="equity" stroke="#00d4ff" fill="url(#pEq)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <MiniStat label="Blended max DD" value={`${avgDd.toFixed(1)}%`} />
            <MiniStat label="Final equity" value={`$${fmtMoney(finalEq)}`} />
            <MiniStat label="Diversification" value={list.length > 3 ? 'Good' : 'Low'} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function avg(xs: (number | undefined)[]): number {
  const v = xs.filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

function Stat({ icon, label, value, valueClass = '' }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-subtext text-xs font-semibold uppercase tracking-wide mb-2">
        <span className="text-primary">{icon}</span>{label}
      </div>
      <div className={`kpi-value ${valueClass}`}>{value}</div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass !rounded-lg p-2.5">
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] text-subtext">{label}</div>
    </div>
  );
}
