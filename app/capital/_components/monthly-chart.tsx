'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts'

export default function MonthlyChart({ monthly }: { monthly: any[] }) {
  const data = (monthly ?? []).map((m: any) => ({ month: m?.month ?? '', pl: m?.pl ?? 0 }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
        <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
        <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: any) => `$${v}`} />
        <Tooltip
          contentStyle={{ background: '#0f1520', border: '1px solid #1e293b', fontSize: 11, color: '#f1f5f9' }}
          labelStyle={{ color: '#94a3b8' }}
          itemStyle={{ color: '#f1f5f9' }}
          formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Monthly P/L']}
          cursor={{ fill: 'rgba(96,181,255,0.06)' }}
          offset={28}
          allowEscapeViewBox={{ x: false, y: true }}
          wrapperStyle={{ zIndex: 20, pointerEvents: 'none' }}
        />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="pl" name="Monthly P/L" radius={[3, 3, 0, 0]} animationDuration={900}>
          {data.map((d, i) => <Cell key={i} fill={(d?.pl ?? 0) >= 0 ? '#80D8C3' : '#FF6363'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
