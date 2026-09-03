'use client';

import { useState } from 'react';
import { Download, Upload, Plus, Trash2 } from 'lucide-react';

/* ───────────── Gauge Chart (SVG semi-circle) ───────────── */
function GaugeChart({ label, pct }: { label: string; pct: number }) {
  const r = 42, cx = 50, cy = 52, strokeW = 8;
  const circ = Math.PI * r; // half-circle circumference
  const greenLen = circ * (pct / 100);
  const redLen = circ - greenLen;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 60" className="w-28">
        {/* Red arc (background) */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--loss)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          opacity={0.3}
        />
        {/* Green arc (value) */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--profit)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${greenLen} ${redLen}`}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold">
          {pct.toFixed(2)}%
        </text>
      </svg>
      <span className="text-[10px] text-white/40 mt-1">{label}</span>
    </div>
  );
}

/* ───────────── PnL by Trade Reasons line chart ───────────── */
function TradeReasonsChart() {
  const W = 420, H = 160, padL = 10, padR = 60, padT = 15, padB = 25;
  const bW = W - padL - padR, bH = H - padT - padB;
  const pts = 30;
  const data = Array.from({ length: pts }, (_, i) => {
    const p = i / (pts - 1);
    return 18300000 * p * (1 + 0.04 * Math.sin(p * 8));
  });
  const maxV = Math.max(...data);
  const yOf = (v: number) => padT + bH - (v / maxV) * bH;
  const xOf = (i: number) => padL + (i / (pts - 1)) * bW;
  const pathD = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(v)}`).join(' ');
  const areaD = pathD + ` L ${xOf(pts - 1)} ${padT + bH} L ${xOf(0)} ${padT + bH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="trGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--profit)" stopOpacity={0.2} />
          <stop offset="100%" stopColor="var(--profit)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((pct, i) => {
        const y = padT + bH * (1 - pct);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.04)" />
            <text x={W - padR + 4} y={y + 3} fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">
              ${(maxV * pct / 1e6).toFixed(1)}M
            </text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#trGrad)" />
      <path d={pathD} fill="none" stroke="var(--profit)" strokeWidth={1.5} />
    </svg>
  );
}

/* ───────────── World Map (simplified) ───────────── */
function WorldMap() {
  const regions = [
    { name: 'Americas', x: 30, y: 25, w: 80, h: 60, color: 'var(--profit)', vol: '$4.2M' },
    { name: 'Europe', x: 150, y: 15, w: 60, h: 45, color: 'var(--gold)', vol: '$6.8M' },
    { name: 'Africa', x: 160, y: 65, w: 45, h: 40, color: 'rgba(255,255,255,0.1)', vol: '$0.3M' },
    { name: 'Asia', x: 240, y: 20, w: 90, h: 55, color: '#E07020', vol: '$5.1M' },
    { name: 'Oceania', x: 290, y: 80, w: 40, h: 25, color: 'rgba(255,255,255,0.08)', vol: '$0.8M' },
  ];
  return (
    <svg viewBox="0 0 370 120" className="w-full" style={{ height: 120 }}>
      {regions.map((r, i) => (
        <g key={i}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={4} fill={r.color} opacity={0.2} stroke={r.color} strokeWidth={1} strokeOpacity={0.4} />
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 4} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" opacity={0.7}>{r.name}</text>
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 8} textAnchor="middle" fill={r.color} fontSize="8" fontFamily="monospace" fontWeight="bold">{r.vol}</text>
        </g>
      ))}
    </svg>
  );
}

/* ───────────── Card wrapper ───────────── */
function DashCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border p-4 ${className}`} style={{ borderColor: 'var(--border)', background: '#111116' }}>
      <div className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*        Total PnL & Winners Page            */
/* ═══════════════════════════════════════════ */
export default function PnLPage() {
  return (
    <div className="p-4 min-h-screen" style={{ background: '#0B0B0D' }}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white tracking-wide">TOTAL PnL &amp; WINNERS</h1>
        <div className="flex items-center gap-2">
          {[
            { icon: <Upload className="w-3.5 h-3.5" />, label: 'Import' },
            { icon: <Download className="w-3.5 h-3.5" />, label: 'Export' },
            { icon: <Plus className="w-3.5 h-3.5" />, label: 'Add Widget' },
            { icon: <Trash2 className="w-3.5 h-3.5" />, label: 'Delete dashboard' },
          ].map(b => (
            <button
              key={b.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border transition-colors"
              style={{
                borderColor: b.label === 'Delete dashboard' ? 'rgba(255,69,96,0.3)' : 'var(--border-strong)',
                color: b.label === 'Delete dashboard' ? 'var(--loss)' : 'var(--text-secondary)',
                background: '#111116',
              }}
            >
              {b.icon} {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Widget Grid 2x3 */}
      <div className="grid grid-cols-3 gap-4">
        {/* ─── ROW 1 ─── */}
        {/* Card 1: Total PnL */}
        <DashCard title="Total PnL">
          <div className="mono text-2xl font-bold mb-1" style={{ color: 'var(--profit)' }}>$8,875,170.04</div>
          <div className="text-[10px] text-white/30 mb-3">Session Total PnL</div>
          <div className="mono text-lg font-bold" style={{ color: 'var(--loss)' }}>-$4,039,465.53</div>
          <div className="text-[10px] text-white/30">Change of Unrealized PnL</div>
        </DashCard>

        {/* Card 2: Net Deposit + Realized */}
        <DashCard title="Session Metrics">
          <div className="space-y-3">
            <div>
              <div className="mono text-lg font-bold" style={{ color: 'var(--profit)' }}>$34,181,143.16</div>
              <div className="text-[10px] text-white/30">Session Net Deposit</div>
            </div>
            <div>
              <div className="mono text-lg font-bold" style={{ color: 'var(--profit)' }}>$12,914,635.58</div>
              <div className="text-[10px] text-white/30">Session Realized PnL</div>
            </div>
          </div>
        </DashCard>

        {/* Card 3: Total Monthly PnL */}
        <DashCard title="Total Monthly PnL">
          {[
            { label: 'Broker Daily PnL', value: '$0.00' },
            { label: 'Broker Weekly PnL', value: '$0.00' },
            { label: 'Broker Monthly PnL', value: '$0.00' },
          ].map((m, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[11px] text-white/40">{m.label}</span>
              <span className="mono text-sm text-white/60">{m.value}</span>
            </div>
          ))}
        </DashCard>

        {/* ─── ROW 2 ─── */}
        {/* Card 4: Symbol info */}
        <DashCard title="EURUSD">
          <div className="flex items-center gap-4 mb-3">
            <div>
              <div className="text-[10px] text-white/30">Bid</div>
              <div className="mono text-sm font-bold" style={{ color: 'var(--profit)' }}>1.05309</div>
            </div>
            <div>
              <div className="text-[10px] text-white/30">Ask</div>
              <div className="mono text-sm font-bold" style={{ color: 'var(--loss)' }}>1.05328</div>
            </div>
            <div>
              <div className="text-[10px] text-white/30">Spread</div>
              <div className="mono text-sm font-bold text-white/70">1.9</div>
            </div>
          </div>
          <div className="text-[10px] text-white/25">Last update: 15:49:22 UTC</div>
        </DashCard>

        {/* Card 5: Last Executed Order */}
        <DashCard title="Last Executed Order">
          <div className="space-y-2">
            {[
              { label: 'Order type', value: 'Open Sell', color: 'var(--loss)' },
              { label: 'Recency', value: 'A few seconds' },
              { label: 'Book', value: 'B-Book', color: 'var(--gold)' },
              { label: 'Account', value: '6204488' },
              { label: 'Server', value: 'Demo MT5' },
              { label: 'Volume', value: '0.11 lots' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[10px] text-white/30">{row.label}</span>
                <span className="mono text-[11px] font-medium" style={{ color: row.color || 'var(--text-secondary)' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </DashCard>

        {/* Card 6: All Winners Percent */}
        <DashCard title="All Winners Percent">
          <div className="flex items-center justify-around pt-2">
            <GaugeChart label="Monthly Winners" pct={38.83} />
            <GaugeChart label="Weekly Winners" pct={38.73} />
            <GaugeChart label="Daily Winners" pct={43.61} />
          </div>
        </DashCard>

        {/* ─── ROW 3 ─── */}
        {/* Card 7: PnL by Trade Reasons */}
        <DashCard title="PnL by Trade Reasons" className="col-span-2">
          <TradeReasonsChart />
        </DashCard>

        {/* Card 8: B-Book Net World Map */}
        <DashCard title="B-Book: Net World Map">
          <WorldMap />
        </DashCard>
      </div>
    </div>
  );
}
