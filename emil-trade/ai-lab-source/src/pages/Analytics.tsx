import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell,
} from 'recharts';
import { Card, SectionTitle } from '../components/ui';
import { mockEquityCurve } from '../data/mock';

const ASSETS = ['Forex', 'Stocks', 'Crypto', 'Indian', 'Metals', 'Energy', 'Indices'];
const REGIMES = [
  { label: 'Trending', color: '#00ff88' }, { label: 'Ranging', color: '#facc15' },
  { label: 'Volatile', color: '#ff4444' }, { label: 'Risk-off', color: '#a78bfa' },
  { label: 'Trending', color: '#00ff88' }, { label: 'Crisis', color: '#ff2222' },
  { label: 'Risk-on', color: '#38bdf8' }, { label: 'Ranging', color: '#facc15' },
];

// Deterministic pseudo-random so charts are stable across renders.
function rng(seed: number) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

export default function Analytics() {
  const monteCarlo = useMemo(() => {
    const paths = 24;
    const steps = 60;
    const data: any[] = Array.from({ length: steps }, (_, i) => ({ i }));
    for (let p = 0; p < paths; p++) {
      const r = rng(p + 1);
      let eq = 10000;
      for (let i = 0; i < steps; i++) {
        eq *= 1 + (r() - 0.45) * 0.03;
        data[i][`p${p}`] = Math.round(eq);
      }
    }
    return { data, paths };
  }, []);

  const walkForward = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => {
      const r = rng(i + 100);
      return { window: `W${i + 1}`, in_sample: +(0.8 + r() * 1.4).toFixed(2), out_sample: +(0.4 + r() * 1.3).toFixed(2) };
    }), []);

  const sensitivity = useMemo(() =>
    Array.from({ length: 11 }, (_, i) => {
      const period = 5 + i * 5;
      const r = rng(i + 200);
      return { period, sharpe: +(1.0 + Math.sin(i / 2) * 0.6 + r() * 0.3).toFixed(2) };
    }), []);

  const radar = useMemo(() => ([
    { k: 'Return', v: 78 }, { k: 'Risk-adj', v: 71 }, { k: 'Drawdown', v: 62 },
    { k: 'Robustness', v: 68 }, { k: 'Stability', v: 74 }, { k: 'Liquidity', v: 83 },
    { k: 'Capacity', v: 59 }, { k: 'Explainability', v: 80 },
  ]), []);

  const exposure = useMemo(() =>
    ASSETS.map((a, i) => { const r = rng(i + 300); return { asset: a, exposure: Math.round(5 + r() * 30) }; }), []);

  const corr = useMemo(() => {
    const r = rng(42);
    return ASSETS.map((_, i) => ASSETS.map((_, j) => i === j ? 1 : +((r() * 2 - 1)).toFixed(2)));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Analytics</h2>
        <p className="text-sm text-subtext">
          Robustness, risk and portfolio analytics — Monte Carlo, walk-forward, parameter sensitivity,
          correlation, risk radar, regime timeline and exposure. (Illustrative demo data.)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle right={<span className="text-[10px] text-subtext">{monteCarlo.paths} paths</span>}>Monte Carlo Simulation</SectionTitle>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monteCarlo.data}>
                <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={48} domain={['auto', 'auto']} />
                {Array.from({ length: monteCarlo.paths }, (_, p) => (
                  <Line key={p} type="monotone" dataKey={`p${p}`} stroke="#00d4ff" strokeWidth={1} dot={false} strokeOpacity={0.28} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle>Walk-Forward Analysis</SectionTitle>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={walkForward}>
                <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" />
                <XAxis dataKey="window" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="in_sample" fill="#00d4ff" name="In-sample Sharpe" />
                <Bar dataKey="out_sample" fill="#00ff88" name="Out-of-sample Sharpe" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-subtext mt-1">Large in/out-of-sample gaps flag overfitting.</p>
        </Card>

        <Card>
          <SectionTitle>Parameter Sensitivity</SectionTitle>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensitivity}>
                <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'MA period', fill: '#64748b', fontSize: 10, position: 'insideBottom', dy: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="sharpe" stroke="#facc15" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-subtext mt-1">A flat plateau = stable; a sharp single peak = fragile.</p>
        </Card>

        <Card>
          <SectionTitle>Strategy Risk Radar</SectionTitle>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#1e2d4a" />
                <PolarAngleAxis dataKey="k" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="v" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Market-Regime Timeline</SectionTitle>
          <div className="flex rounded-lg overflow-hidden border border-border h-10 mb-2">
            {REGIMES.map((r, i) => (
              <div key={i} className="flex-1 flex items-center justify-center text-[9px] font-semibold text-black/70"
                style={{ background: r.color }} title={r.label}>
                {r.label.slice(0, 4)}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-subtext"><span>-6mo</span><span>now</span></div>
          <div className="flex flex-wrap gap-2 mt-3">
            {[...new Set(REGIMES.map(r => r.label))].map((l) => {
              const c = REGIMES.find(r => r.label === l)!.color;
              return <span key={l} className="flex items-center gap-1 text-[10px] text-subtext"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>;
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle>Exposure Map</SectionTitle>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exposure} layout="vertical">
                <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="asset" tick={{ fill: '#94a3b8', fontSize: 10 }} width={54} />
                <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="exposure" radius={[0, 4, 4, 0]}>
                  {exposure.map((e, i) => <Cell key={i} fill={e.exposure > 25 ? '#ff4444' : e.exposure > 15 ? '#facc15' : '#00d4ff'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-subtext mt-1">Red = concentration above the per-asset-class cap.</p>
        </Card>
      </div>

      <Card>
        <SectionTitle>Correlation Matrix</SectionTitle>
        <div className="overflow-x-auto">
          <table className="text-[10px] font-mono">
            <thead>
              <tr><th className="p-1"></th>{ASSETS.map((a) => <th key={a} className="p-1 text-subtext">{a.slice(0, 3)}</th>)}</tr>
            </thead>
            <tbody>
              {corr.map((row, i) => (
                <tr key={i}>
                  <td className="p-1 text-subtext text-right pr-2">{ASSETS[i].slice(0, 3)}</td>
                  {row.map((v, j) => {
                    const pos = v >= 0;
                    const alpha = Math.abs(v);
                    const bg = pos ? `rgba(0,212,255,${alpha * 0.7})` : `rgba(255,68,68,${alpha * 0.7})`;
                    return <td key={j} className="p-1 text-center rounded" style={{ background: bg, color: alpha > 0.5 ? '#fff' : '#94a3b8', minWidth: 34 }}>{v.toFixed(2)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-subtext mt-2">Blue = positive correlation, red = negative. Used to cap correlated exposure across a portfolio.</p>
      </Card>
    </div>
  );
}
