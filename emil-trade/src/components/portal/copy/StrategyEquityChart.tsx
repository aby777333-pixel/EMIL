'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  AreaSeries,
  LineSeries,
  type IChartApi,
  type Time,
} from 'lightweight-charts';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

/**
 * Equity curve for a single strategy with drawdown shading. Two series:
 *  - main equity (area, crimson stroke)
 *  - running peak overlay (faint dashed line) — drawdown below it shades
 *    in muted negative tint via a third area series.
 */
export default function StrategyEquityChart({ curve }: { curve: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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

    // Compute the running peak so we can shade drawdowns explicitly.
    const peak: number[] = [];
    let running = curve[0] ?? 100;
    for (const v of curve) { running = Math.max(running, v); peak.push(running); }

    // Map indexes onto fake daily timestamps so lightweight-charts can
    // place them on the time axis without us inventing real dates.
    const baseDate = new Date(); baseDate.setUTCDate(baseDate.getUTCDate() - curve.length);
    const toTime = (i: number): Time => {
      const d = new Date(baseDate);
      d.setUTCDate(baseDate.getUTCDate() + i);
      return d.toISOString().split('T')[0] as Time;
    };

    const ddArea = chart.addSeries(AreaSeries, {
      lineColor: 'rgba(248,113,113,0.5)',
      topColor: 'rgba(248,113,113,0.18)',
      bottomColor: 'rgba(248,113,113,0)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ddArea.setData(curve.map((v, i) => ({ time: toTime(i), value: peak[i] })));

    const peakLine = chart.addSeries(LineSeries, {
      color: 'rgba(255,255,255,0.18)',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    peakLine.setData(curve.map((v, i) => ({ time: toTime(i), value: peak[i] })));

    const equity = chart.addSeries(AreaSeries, {
      lineColor: '#DC2626',
      topColor: 'rgba(220,38,38,0.32)',
      bottomColor: 'rgba(220,38,38,0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    equity.setData(curve.map((v, i) => ({ time: toTime(i), value: v })));

    chartRef.current = chart;

    const onResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    onResize();
    window.addEventListener('resize', onResize);
    chart.timeScale().fitContent();
    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [curve]);

  return (
    <DashboardCard title="Equity curve" padding="sm">
      <div className="relative" style={{ height: 280 }}>
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      <div className="flex items-center gap-4 px-1 mt-3 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
        <span className="inline-flex items-center gap-1.5">
          <span style={{ width: 8, height: 2, background: '#DC2626', borderRadius: 2 }} aria-hidden /> Equity
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span style={{ width: 8, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: 2, borderTop: '1px dashed rgba(255,255,255,0.4)' }} aria-hidden /> Running peak
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, background: 'rgba(248,113,113,0.18)' }} aria-hidden /> Drawdown
        </span>
      </div>
    </DashboardCard>
  );
}
