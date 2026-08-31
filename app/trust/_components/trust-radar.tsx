'use client'

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts'

export default function TrustRadar({ data }: { data: any[] }) {
  const safe = data ?? []
  if (safe.length === 0) return <div className="h-full flex items-center justify-center text-xs text-slate-500">No trust breakdown available.</div>
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={safe} margin={{ top: 15, right: 40, bottom: 10, left: 40 }}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#475569' }} />
        <Tooltip contentStyle={{ background: '#0f1520', border: '1px solid #1e293b', fontSize: 11 }} labelStyle={{ color: '#94a3b8' }} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Radar name="Trust factor (0-100)" dataKey="value" stroke="#A19AD3" fill="#A19AD3" fillOpacity={0.35} animationDuration={900} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
