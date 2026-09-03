'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
} from 'lightweight-charts';
import { IndicatorLibrary } from '@/components/charts/IndicatorLibrary';
import { PriceEngine } from '@/lib/trading/price-engine';
import {
  OHLCVBuilder,
  TF_TO_RESOLUTION,
  type Resolution,
} from '@/lib/trading/ohlcv-builder';
import {
  sma, ema, rsi, macd, bollingerBands, atr, stochastic, vwap,
} from '@/lib/trading/indicators';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D'] as const;

const CHART_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD',
  'US30', 'NAS100', 'SPX500', 'USOIL', 'UKOIL', 'NATGAS',
];

// Indicators from the library that this chart can render, mapped by shortName.
const SUPPORTED_INDICATORS = new Set(['SMA', 'EMA', 'RSI', 'VWAP', 'BB', 'MACD', 'ATR', 'Stoch']);

const OVERLAY_COLORS: Record<string, string> = {
  SMA: '#FFD700',
  EMA: '#4ECDC4',
  VWAP: '#E040FB',
  BB_upper: 'rgba(41,171,226,0.55)',
  BB_middle: 'rgba(41,171,226,0.3)',
  BB_lower: 'rgba(41,171,226,0.55)',
  RSI: '#FF9800',
  MACD_line: '#2196F3',
  MACD_signal: '#FF5722',
  ATR: '#AB47BC',
  Stoch_k: '#2196F3',
  Stoch_d: '#FF5722',
};

export default function RaptorChartsPage() {
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['EMA', 'RSI', 'VWAP']);
  const [symbol, setSymbol] = useState('EURUSD');
  const [tf, setTf] = useState<string>('1H');
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>>(new Map());

  const engineRef = useRef<PriceEngine | null>(null);
  const builderRef = useRef<OHLCVBuilder | null>(null);
  const lastBarTimeRef = useRef<number>(0);
  const symbolRef = useRef(symbol);
  const tfRef = useRef(tf);
  const loadRef = useRef<() => void>(() => {});

  symbolRef.current = symbol;
  tfRef.current = tf;

  const handleAddIndicator = (shortName: string) => {
    setActiveIndicators((prev) =>
      prev.includes(shortName) ? prev.filter((i) => i !== shortName) : [...prev, shortName]
    );
  };

  // ── Chart + engine lifecycle ────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#060D16' },
        textColor: 'rgba(255,255,255,0.5)',
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(41,171,226,0.4)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#0091D5' },
        horzLine: { color: 'rgba(41,171,226,0.4)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#0091D5' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)', scaleMargins: { top: 0.08, bottom: 0.2 } },
      timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true, secondsVisible: false, rightOffset: 5 },
    });
    chartRef.current = chart;

    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#00C27A', downColor: '#C1121F',
      borderUpColor: '#00C27A', borderDownColor: '#C1121F',
      wickUpColor: '#00C27A', wickDownColor: '#C1121F',
    });

    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volumeRef.current = vol;

    const engine = new PriceEngine();
    engineRef.current = engine;
    const builder = new OHLCVBuilder(engine);
    builderRef.current = builder;

    engine.start((ticks) => {
      for (const tick of ticks) builder.processTick(tick);
      const sym = symbolRef.current;
      const res = TF_TO_RESOLUTION[tfRef.current] as Resolution;
      const current = builder.getCurrentBar(sym, res);
      if (!current || !candleRef.current || !volumeRef.current) return;

      if (current.time > lastBarTimeRef.current) {
        loadRef.current();
      } else {
        candleRef.current.update({ time: current.time as Time, open: current.open, high: current.high, low: current.low, close: current.close });
        volumeRef.current.update({
          time: current.time as Time,
          value: current.volume,
          color: current.close >= current.open ? 'rgba(0,194,122,0.15)' : 'rgba(193,18,31,0.15)',
        });
      }
      setLastPrice(current.close);
    }, 800);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);

    return () => {
      engine.stop();
      ro.disconnect();
      indicatorSeriesRef.current.clear();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      engineRef.current = null;
      builderRef.current = null;
    };
  }, []);

  // ── Data + indicators loader ────────────────────────────────
  const loadData = useCallback(() => {
    const chart = chartRef.current;
    const candles = candleRef.current;
    const volume = volumeRef.current;
    const builder = builderRef.current;
    if (!chart || !candles || !volume || !builder) return;

    const res = TF_TO_RESOLUTION[tf] as Resolution;
    if (!res) return;
    const bars = builder.getAllBars(symbol, res);
    if (bars.length === 0) return;

    candles.setData(bars.map((b): CandlestickData => ({ time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close })));
    volume.setData(bars.map((b): HistogramData => ({
      time: b.time as Time,
      value: b.volume,
      color: b.close >= b.open ? 'rgba(0,194,122,0.15)' : 'rgba(193,18,31,0.15)',
    })));
    lastBarTimeRef.current = bars[bars.length - 1].time;
    setLastPrice(bars[bars.length - 1].close);

    // ── Indicator series ──
    const times = bars.map((b) => b.time as Time);
    const closes = bars.map((b) => b.close);
    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);
    const volumes = bars.map((b) => b.volume);

    const toLine = (vals: (number | null)[]): LineData[] => {
      const out: LineData[] = [];
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] !== null) out.push({ time: times[i], value: vals[i]! });
      }
      return out;
    };

    // Remove series for indicators no longer active.
    const wanted = new Set<string>();
    for (const id of activeIndicators) {
      if (!SUPPORTED_INDICATORS.has(id)) continue;
      if (id === 'BB') { wanted.add('BB_upper'); wanted.add('BB_middle'); wanted.add('BB_lower'); }
      else if (id === 'MACD') { wanted.add('MACD_line'); wanted.add('MACD_signal'); }
      else if (id === 'Stoch') { wanted.add('Stoch_k'); wanted.add('Stoch_d'); }
      else wanted.add(id);
    }
    for (const [key, series] of indicatorSeriesRef.current.entries()) {
      if (!wanted.has(key)) {
        try { chart.removeSeries(series); } catch { /* noop */ }
        indicatorSeriesRef.current.delete(key);
      }
    }

    const getLine = (key: string, color: string, scaleId?: string): ISeriesApi<'Line'> => {
      const existing = indicatorSeriesRef.current.get(key);
      if (existing) return existing as ISeriesApi<'Line'>;
      const s = chart.addSeries(LineSeries, {
        color, lineWidth: 1,
        priceScaleId: scaleId || 'right',
        lastValueVisible: false, priceLineVisible: false,
      });
      if (scaleId && scaleId !== 'right') {
        s.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      }
      indicatorSeriesRef.current.set(key, s);
      return s;
    };

    for (const id of activeIndicators) {
      if (!SUPPORTED_INDICATORS.has(id)) continue;
      try {
        switch (id) {
          case 'SMA':
            getLine('SMA', OVERLAY_COLORS.SMA).setData(toLine(sma(closes, 20)));
            break;
          case 'EMA':
            getLine('EMA', OVERLAY_COLORS.EMA).setData(toLine(ema(closes, 50)));
            break;
          case 'VWAP':
            getLine('VWAP', OVERLAY_COLORS.VWAP).setData(vwap(highs, lows, closes, volumes).map((v, i) => ({ time: times[i], value: v })));
            break;
          case 'BB': {
            const bb = bollingerBands(closes, 20, 2);
            getLine('BB_upper', OVERLAY_COLORS.BB_upper).setData(toLine(bb.upper));
            getLine('BB_middle', OVERLAY_COLORS.BB_middle).setData(toLine(bb.middle));
            getLine('BB_lower', OVERLAY_COLORS.BB_lower).setData(toLine(bb.lower));
            break;
          }
          case 'RSI':
            getLine('RSI', OVERLAY_COLORS.RSI, 'rsi').setData(toLine(rsi(closes, 14)));
            break;
          case 'MACD': {
            const m = macd(closes, 12, 26, 9);
            getLine('MACD_line', OVERLAY_COLORS.MACD_line, 'macd').setData(toLine(m.macd));
            getLine('MACD_signal', OVERLAY_COLORS.MACD_signal, 'macd').setData(toLine(m.signal));
            break;
          }
          case 'ATR':
            getLine('ATR', OVERLAY_COLORS.ATR, 'atr').setData(toLine(atr(highs, lows, closes, 14)));
            break;
          case 'Stoch': {
            const st = stochastic(highs, lows, closes, 14, 3);
            getLine('Stoch_k', OVERLAY_COLORS.Stoch_k, 'stoch').setData(toLine(st.k));
            getLine('Stoch_d', OVERLAY_COLORS.Stoch_d, 'stoch').setData(toLine(st.d));
            break;
          }
        }
      } catch { /* indicator failures must never break the chart */ }
    }

    chart.timeScale().scrollToRealTime();
  }, [symbol, tf, activeIndicators]);

  loadRef.current = loadData;

  useEffect(() => { loadData(); }, [loadData]);

  const decimals = engineRef.current?.getConfig(symbol)?.decimals ?? 5;
  const activeSupported = activeIndicators.filter((i) => SUPPORTED_INDICATORS.has(i));

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">RAPTOR CHARTS</h1>
          <p className="text-xs text-white/30">Indigenous charting platform — 155+ indicators, 50+ drawing tools, 15 chart types</p>
        </div>
        {lastPrice !== null && (
          <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-sm" style={{ color: '#0091D5' }}>
            {symbol} {lastPrice.toFixed(decimals)}
          </div>
        )}
      </div>

      {/* Chart toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-t-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="rounded-md border border-white/10 bg-[#0A0F1A] px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-[#0091D5]"
        >
          {CHART_SYMBOLS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className="rounded px-2 py-1 font-mono text-[11px] transition-colors"
              style={{
                backgroundColor: tf === t ? 'rgba(41,171,226,0.15)' : 'transparent',
                color: tf === t ? '#0091D5' : 'rgba(255,255,255,0.45)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {activeSupported.length > 0 && (
          <span className="font-mono text-[10px] text-white/30">
            Active: {activeSupported.join(' · ')}
          </span>
        )}
        <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(255,152,0,0.15)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.3)' }}>
          SIM
        </span>
      </div>

      {/* Chart canvas */}
      <div className="rounded-b-xl border border-t-0 border-white/5" style={{ backgroundColor: '#060D16' }}>
        <div ref={containerRef} className="h-[420px] w-full md:h-[480px]" />
      </div>

      <div className="mt-6">
        <IndicatorLibrary onAddIndicator={handleAddIndicator} activeIndicators={activeIndicators} />
      </div>
    </div>
  );
}
