'use client';

/**
 * Tiny inline SVG sparkline (~80x20). Renders a stroked path against
 * a soft gradient fill. No interactivity — purely a glyph that lives
 * inside stat cards. For full charts use the EquityChart component.
 */
export default function Sparkline({
  data,
  width = 96,
  height = 28,
  positive = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}) {
  if (data.length < 2) {
    return <div style={{ width, height }} aria-hidden />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${path} L${width.toFixed(1)},${height} L0,${height} Z`;
  const color = positive ? 'var(--g-pnl-positive)' : 'var(--g-pnl-negative)';
  const gradId = `g-spark-${positive ? 'p' : 'n'}-${data.length}-${Math.round(data[0] * 100)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.32} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
