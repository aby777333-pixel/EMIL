'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';
import DashboardCard from './DashboardCard';

type RangeKey = '1D' | '1W' | '1M' | '3M' | 'YTD' | 'ALL';

const RANGE_DAYS: Record<RangeKey, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  YTD: 0,
  ALL: 0,
};

interface EquityPoint {
  /** ISO date string */
  date: string;
  /** equity value as a plain number — Decimal not needed for chart pixels */
  value: number;
}

/**
 * Lightweight-Charts area series of the equity curve. Range tabs filter
 * the in-memory series — no refetch. Empty / sparse data renders an
 * empty-state card instead of a flat line.
 */
export default function EquityChart({ points }: { points: EquityPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [range, setRange] = useState<RangeKey>('1M');

  const filtered = useMemo(() => filterByRange(points, range), [points, range]);

  // Mount the chart once.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: 'rgba(245,245,247,0.6)',
        fontFamily: 'var(--font-mono, monospace)',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false, secondsVisible: false },
      crosshair: {
        vertLine: { color: 'rgba(255,255,255,0.15)', width: 1 },
        horzLine: { color: 'rgba(255,255,255,0.15)', width: 1 },
      },
      handleScroll: false,
      handleScale: false,
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#DC2626',
      topColor: 'rgba(220,38,38,0.32)',
      bottomColor: 'rgba(220,38,38,0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Push filtered data whenever range or source points change.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const data = filtered.map((p) => ({
      time: (p.date.split('T')[0]) as Time,
      value: p.value,
    }));
    series.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [filtered]);

  const hasData = points.length >= 2;

  return (
    <DashboardCard
      title="Equity performance"
      trailing={
        <div className="flex gap-1">
          {(Object.keys(RANGE_DAYS) as RangeKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setRange(k)}
              className="text-[11px] px-2 py-1 rounded transition-colors"
              style={{
                color: range === k ? 'var(--g-text-primary)' : 'var(--g-text-muted)',
                background: range === k ? 'rgba(255,255,255,0.04)' : 'transparent',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {k}
            </button>
          ))}
        </div>
      }
      padding="sm"
    >
      <div className="relative" style={{ height: 240 }}>
        {hasData ? (
          <div ref={containerRef} className="absolute inset-0" />
        ) : (
          <EmptyState />
        )}
      </div>
    </DashboardCard>
  );
}

function EmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        No equity history yet
      </div>
      <div className="mt-1 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
        Place your first trade to start the curve.
      </div>
    </div>
  );
}

function filterByRange(points: EquityPoint[], range: RangeKey): EquityPoint[] {
  if (points.length === 0) return points;
  if (range === 'ALL') return points;

  const now = Date.now();
  if (range === 'YTD') {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
    return points.filter((p) => new Date(p.date).getTime() >= startOfYear);
  }
  const cutoff = now - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
  return points.filter((p) => new Date(p.date).getTime() >= cutoff);
}

export type { EquityPoint };
