'use client';

// ---------------------------------------------------------------------------
// SessionPnLChart -- Tiny sparkline for cumulative B-book PnL in the blotter
// 60px tall, full width. SVG polyline. Green above zero, red below zero.
// ---------------------------------------------------------------------------

// Generate 20 mock data points: trending upward from ~-500 to ~+1500
const MOCK_PNL_POINTS = (() => {
  const points: number[] = [];
  let value = -300;
  for (let i = 0; i < 20; i++) {
    value += (Math.random() - 0.35) * 200;
    value = Math.max(-500, Math.min(1500, value));
    points.push(Math.round(value));
  }
  // Ensure upward trend: nudge last few values up
  points[17] = Math.max(points[17], 800);
  points[18] = Math.max(points[18], 1100);
  points[19] = Math.max(points[19], 1300);
  return points;
})();

export default function SessionPnLChart() {
  const points = MOCK_PNL_POINTS;
  const height = 60;
  const padding = 4;
  const chartHeight = height - padding * 2;

  // Find min/max for scaling
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const range = max - min || 1;

  // Map data to SVG coordinates
  // SVG Y is inverted: top = 0, bottom = height
  const toY = (val: number) =>
    padding + chartHeight - ((val - min) / range) * chartHeight;

  const zeroY = toY(0);

  // Build polyline points string
  // We'll use viewBox width of 100 for simplicity (auto-scales to container)
  const viewWidth = 100;
  const stepX = viewWidth / (points.length - 1);

  const polylinePoints = points
    .map((val, i) => `${(i * stepX).toFixed(1)},${toY(val).toFixed(1)}`)
    .join(' ');

  // Build separate green (above zero) and red (below zero) area paths
  // For simplicity, we use a single gradient line with colored segments
  // But the simplest approach: draw the line, then clip above/below zero

  return (
    <div className="w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${viewWidth} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        style={{ display: 'block' }}
      >
        {/* Dashed zero line */}
        <line
          x1="0"
          y1={zeroY}
          x2={viewWidth}
          y2={zeroY}
          stroke="#555566"
          strokeWidth="0.3"
          strokeDasharray="1.5 1"
        />

        {/* Green fill above zero */}
        <defs>
          <clipPath id="aboveZero">
            <rect x="0" y="0" width={viewWidth} height={zeroY} />
          </clipPath>
          <clipPath id="belowZero">
            <rect x="0" y={zeroY} width={viewWidth} height={height - zeroY} />
          </clipPath>
        </defs>

        {/* Green line segment (above zero) */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#00C853"
          strokeWidth="0.8"
          strokeLinejoin="round"
          clipPath="url(#aboveZero)"
        />

        {/* Red line segment (below zero) */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#E50914"
          strokeWidth="0.8"
          strokeLinejoin="round"
          clipPath="url(#belowZero)"
        />

        {/* Subtle fill areas */}
        <polygon
          points={`0,${zeroY} ${polylinePoints} ${viewWidth},${zeroY}`}
          fill="#00C853"
          fillOpacity="0.06"
          clipPath="url(#aboveZero)"
        />
        <polygon
          points={`0,${zeroY} ${polylinePoints} ${viewWidth},${zeroY}`}
          fill="#E50914"
          fillOpacity="0.06"
          clipPath="url(#belowZero)"
        />

        {/* End-point dot */}
        <circle
          cx={(points.length - 1) * stepX}
          cy={toY(points[points.length - 1])}
          r="1.2"
          fill={points[points.length - 1] >= 0 ? '#00C853' : '#E50914'}
        />

        {/* Current value label */}
        <text
          x={(points.length - 1) * stepX - 1}
          y={toY(points[points.length - 1]) - 3}
          fontSize="3.5"
          fill={points[points.length - 1] >= 0 ? '#00C853' : '#E50914'}
          textAnchor="end"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {points[points.length - 1] >= 0 ? '+' : ''}
          ${points[points.length - 1]}
        </text>
      </svg>
    </div>
  );
}
