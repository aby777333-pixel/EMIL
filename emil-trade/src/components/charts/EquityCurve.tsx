'use client';

import { useState, useMemo, useId } from 'react';

interface DataPoint {
  date: string;
  value: number;
}

interface EquityCurveProps {
  data: DataPoint[];
  height?: number;
}

export function EquityCurve({ data, height = 200 }: EquityCurveProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: DataPoint } | null>(null);
  const gradientId = useId();

  const width = 600; // Internal SVG width, scales with container
  const padding = { top: 16, right: 16, bottom: 24, left: 16 };

  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const points = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartW,
      y: padding.top + (1 - (d.value - min) / range) * chartH,
      data: d,
    }));

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

    // Area fill path
    const areaPath = [
      `M ${points[0].x},${padding.top + chartH}`,
      `L ${points[0].x},${points[0].y}`,
      ...points.slice(1).map((p) => `L ${p.x},${p.y}`),
      `L ${points[points.length - 1].x},${padding.top + chartH}`,
      'Z',
    ].join(' ');

    return { points, polyline, areaPath, min, max };
  }, [data, height]);

  if (!chart) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-surface text-xs text-muted"
        style={{ height }}
      >
        Insufficient data
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines (horizontal) */}
        {[0.25, 0.5, 0.75].map((pct) => {
          const y = padding.top + pct * (height - padding.top - padding.bottom);
          return (
            <line
              key={pct}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}

        {/* Area fill */}
        <path d={chart.areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <polyline
          points={chart.polyline}
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Hover targets */}
        {chart.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={12}
            fill="transparent"
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, point: p.data })}
          />
        ))}

        {/* Tooltip dot */}
        {tooltip && (
          <circle
            cx={tooltip.x}
            cy={tooltip.y}
            r={4}
            fill="var(--accent)"
            stroke="var(--bg-elevated)"
            strokeWidth={2}
          />
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border-strong bg-elevated px-3 py-2 shadow-xl"
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100 - 12}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="mono text-xs font-semibold text-foreground">
            {tooltip.point.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </p>
          <p className="text-[10px] text-muted">{tooltip.point.date}</p>
        </div>
      )}
    </div>
  );
}
