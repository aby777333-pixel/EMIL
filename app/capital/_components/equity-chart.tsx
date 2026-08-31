'use client'

import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts'

export default function EquityChart({ points }: { points: any[] }) {
  const data = (points ?? []).map((p: any) => ({
    date: p?.date ?? '',
    equity: p?.equity ?? 0,
    drawdown: -(p?.drawdownPct ?? 0),
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#80D8C3" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#80D8C3" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
        <YAxis yAxisId="eq" tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} tickFormatter={(v: any) => `$${Math.round(v / 100) / 10}k`} />
        <YAxis yAxisId="dd" orientation="right" tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: any) => `${v}%`} />
        <Tooltip contentStyle={{ background: '#0f1520', border: '1px solid #1e293b', fontSize: 11 }} labelStyle={{ color: '#94a3b8' }} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Area yAxisId="eq" type="monotone" dataKey="equity" name="Equity" stroke="#80D8C3" strokeWidth={2} fill="url(#eqGrad)" animationDuration={900} />
        <Line yAxisId="dd" type="monotone" dataKey="drawdown" name="Drawdown %" stroke="#FF6363" strokeWidth={1.5} dot={false} animationDuration={900} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
