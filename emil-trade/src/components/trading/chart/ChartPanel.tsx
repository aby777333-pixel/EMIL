'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
  ColorType,
} from 'lightweight-charts';
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  BarData,
  HistogramData,
  LineData,
  AreaData,
  Time,
  DeepPartial,
  ChartOptions,
} from 'lightweight-charts';
import {
  BarChart3,
  Crosshair,
  MousePointer2,
  Minus,
  MoveVertical,
  GitCommitHorizontal,
  Type,
  Square,
  Ruler,
  ZoomIn,
  ZoomOut,
  Magnet,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  TrendingUp,
  TrendingDown,
  Rows2,
  Play,
  Pause,
  StepForward,
  StepBack,
  Rewind,
  X,
} from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { formatPrice } from '@/lib/utils/format';
import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import type { OHLCVBar } from '@/types/trading';
import { TF_TO_RESOLUTION } from '@/lib/trading/ohlcv-builder';
import type { Resolution } from '@/lib/trading/ohlcv-builder';

// ─── §11 replay practice trading: types + rule-based grader ───────
// Trades are judged against the ACTUAL bars that followed each entry;
// every number below is measured, the grade formula is shown to the user.

interface ReplayTrade {
  dir: 'BUY' | 'SELL';
  entryIdx: number;
  entryPrice: number;
  exitIdx: number | null;
  exitPrice: number | null;
  autoClosed?: boolean;
}

interface GradedTrade extends ReplayTrade {
  pnlPct: number;
  barsHeld: number;
  mfePct: number;   // max favorable excursion while held
  maePct: number;   // max adverse excursion while held
  capture: number | null; // pnl / MFE (how much of the available move was kept)
}

interface ReplayReport {
  trades: GradedTrade[];
  wins: number;
  winRate: number;
  totalPnlPct: number;
  avgCapture: number | null;
  grade: string;
  observations: string[];
}

function gradeReplayTrades(trades: ReplayTrade[], bars: OHLCVBar[]): ReplayReport {
  const graded: GradedTrade[] = trades.map((t) => {
    const exitIdx = t.exitIdx as number;
    const exitPrice = t.exitPrice as number;
    const sign = t.dir === 'BUY' ? 1 : -1;
    const pnlPct = t.entryPrice > 0 ? (sign * (exitPrice - t.entryPrice) / t.entryPrice) * 100 : 0;
    let best = 0, worst = 0;
    for (let i = t.entryIdx; i <= Math.min(exitIdx, bars.length - 1); i++) {
      const fav = t.entryPrice > 0 ? (sign * ((t.dir === 'BUY' ? bars[i].high : bars[i].low) - t.entryPrice) / t.entryPrice) * 100 : 0;
      const adv = t.entryPrice > 0 ? (sign * ((t.dir === 'BUY' ? bars[i].low : bars[i].high) - t.entryPrice) / t.entryPrice) * 100 : 0;
      best = Math.max(best, fav);
      worst = Math.min(worst, adv);
    }
    return {
      ...t, pnlPct,
      barsHeld: exitIdx - t.entryIdx,
      mfePct: best, maePct: worst,
      capture: best > 0.0001 ? pnlPct / best : null,
    };
  });
  const wins = graded.filter((t) => t.pnlPct > 0).length;
  const winRate = graded.length ? (wins / graded.length) * 100 : 0;
  const totalPnlPct = graded.reduce((s, t) => s + t.pnlPct, 0);
  const captures = graded.map((t) => t.capture).filter((c): c is number => c != null);
  const avgCapture = captures.length ? captures.reduce((s, c) => s + c, 0) / captures.length : null;
  // Transparent grade: profitable + ≥60% wins = A, profitable = B,
  // roughly flat = C, losing = D, losing with <30% wins = F.
  const grade = totalPnlPct > 0.02 && winRate >= 60 ? 'A'
    : totalPnlPct > 0.02 ? 'B'
    : Math.abs(totalPnlPct) <= 0.02 ? 'C'
    : winRate < 30 ? 'F' : 'D';
  const observations: string[] = [];
  const bigMae = graded.filter((t) => t.pnlPct < 0 && t.maePct < 2 * t.pnlPct);
  if (bigMae.length > 0) observations.push(`${bigMae.length} losing trade(s) went at least twice as far against you as the final loss — earlier exits or tighter invalidation would have cut those.`);
  if (avgCapture != null && avgCapture < 0.4) observations.push(`On average you kept ${(avgCapture * 100).toFixed(0)}% of the best move available while in the trade — exits gave back most of the favorable excursion.`);
  if (avgCapture != null && avgCapture >= 0.7) observations.push(`You captured ${(avgCapture * 100).toFixed(0)}% of the available favorable move — strong exit timing.`);
  const quickies = graded.filter((t) => t.barsHeld <= 1);
  if (quickies.length > graded.length / 2 && graded.length >= 2) observations.push('Most trades were closed within a bar — scalping the replay rarely reflects a real plan; try letting the setup breathe.');
  const auto = graded.filter((t) => t.autoClosed).length;
  if (auto > 0) observations.push(`${auto} trade(s) were still open at replay end and auto-closed at the last bar — plan the exit before the entry.`);
  if (observations.length === 0) observations.push('No systematic issue detected in this small sample — repeat the drill on other periods before drawing conclusions.');
  return { trades: graded, wins, winRate, totalPnlPct, avgCapture, grade, observations };
}
import IndicatorPanel, {
  INDICATOR_DEFS,
  type IndicatorId,
} from './IndicatorPanel';
import ChartToolbar, { type ChartType, type LayoutType } from './ChartToolbar';
import {
  sma, ema, rsi, macd, bollingerBands, atr, stochastic, vwap,
  aroon, adx, donchianChannel, envelope, fractals, ichimoku,
  momentum, parabolicSAR, pivotPoints, bullsBearsPower,
  kalmanFilter, kama,
} from '@/lib/trading/indicators';

// ─── Helpers ─────────────────────────────────────────────────────

const SYMBOL_DESCRIPTIONS: Record<string, string> = {
  EURUSD: 'Euro vs US Dollar', GBPUSD: 'British Pound vs US Dollar',
  USDJPY: 'US Dollar vs Japanese Yen', XAUUSD: 'Gold vs US Dollar',
  XAGUSD: 'Silver vs US Dollar', BTCUSD: 'Bitcoin vs US Dollar',
  ETHUSD: 'Ethereum vs US Dollar', US30: 'Dow Jones Industrial Average',
  NAS100: 'Nasdaq 100 Index', SPX500: 'S&P 500 Index',
  USDCHF: 'US Dollar vs Swiss Franc', AUDUSD: 'Australian Dollar vs US Dollar',
  NZDUSD: 'New Zealand Dollar vs US Dollar', USDCAD: 'US Dollar vs Canadian Dollar',
  EURJPY: 'Euro vs Japanese Yen', GBPJPY: 'British Pound vs Japanese Yen',
  EURGBP: 'Euro vs British Pound', USOIL: 'US Crude Oil',
  UKOIL: 'UK Brent Crude Oil', NATGAS: 'Natural Gas',
};

type DrawingToolId = 'cursor' | 'crosshair' | 'trendline' | 'horizontal' | 'vertical' | 'fibonacci' | 'text' | 'rectangle' | 'channel' | 'longpos' | 'shortpos' | 'measure' | 'zoomin' | 'zoomout' | 'magnet' | 'lock' | 'visibility' | 'deleteall';

interface DrawingTool {
  id: DrawingToolId;
  label: string;
  icon: React.ReactNode;
  group: number;
  toggle?: boolean;
}

interface Drawing {
  type: string;
  startX: number; startY: number;
  endX: number; endY: number;
  color: string; text?: string;
}

const CANVAS_DRAWING_TOOLS: DrawingToolId[] = ['trendline', 'horizontal', 'vertical', 'fibonacci', 'text', 'rectangle', 'channel', 'longpos', 'shortpos', 'measure'];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
// Parallel-channel second line offset (px, perpendicular-ish vertical shift).
const CHANNEL_OFFSET = 40;

// Long/Short Position tool (§6): the drag defines entry → target; the stop is
// mirrored at half the target distance, so the drawn bracket is a 2:1 R:R
// (the label reflects the real drawn geometry).
function drawPositionZones(ctx: CanvasRenderingContext2D, type: string, sx: number, sy: number, ex: number, ey: number) {
  const left = Math.min(sx, ex);
  const width = Math.max(12, Math.abs(ex - sx));
  const entryY = sy, targetY = ey;
  const reward = Math.abs(entryY - targetY);
  const risk = Math.max(8, reward / 2);
  const isLong = type === 'longpos';
  const stopY = isLong ? entryY + risk : entryY - risk;
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#00C27A';
  ctx.fillRect(left, Math.min(entryY, targetY), width, Math.max(1, Math.abs(targetY - entryY)));
  ctx.fillStyle = '#C1121F';
  ctx.fillRect(left, Math.min(entryY, stopY), width, Math.max(1, Math.abs(stopY - entryY)));
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#FFFFFF';
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(left, entryY); ctx.lineTo(left + width, entryY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.fillStyle = '#FFFFFF';
  const rr = risk > 0 ? (reward / risk).toFixed(2) : '—';
  ctx.fillText(`${isLong ? 'LONG' : 'SHORT'} R:R ${rr}`, left + 4, Math.min(entryY, targetY, stopY) - 4);
}

function drawChannel(ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number) {
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx, sy + CHANNEL_OFFSET); ctx.lineTo(ex, ey + CHANNEL_OFFSET); ctx.stroke();
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
  ctx.lineTo(ex, ey + CHANNEL_OFFSET); ctx.lineTo(sx, sy + CHANNEL_OFFSET);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
}

// Heikin Ashi transform (pure). Smooths OHLC using the classic recurrence:
//   haClose = (o+h+l+c)/4;  haOpen = (prevHaOpen+prevHaClose)/2 (seed = (o+c)/2)
//   haHigh = max(h, haOpen, haClose);  haLow = min(l, haOpen, haClose)
function toHeikinAshi(bars: { time: number; open: number; high: number; low: number; close: number }[]): CandlestickData[] {
  const out: CandlestickData[] = [];
  let prevOpen = 0, prevClose = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = (b.open + b.high + b.low + b.close) / 4;
    const haOpen = i === 0 ? (b.open + b.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(b.high, haOpen, haClose);
    const haLow = Math.min(b.low, haOpen, haClose);
    out.push({ time: b.time as Time, open: haOpen, high: haHigh, low: haLow, close: haClose });
    prevOpen = haOpen; prevClose = haClose;
  }
  return out;
}

// ─── TV-style chart-type transforms (§8) ──────────────────────────
// All pure functions over the raw OHLCV bars. Types that re-shape the time
// axis (Renko / Line Break / P&F / Range Bars) emit bars stamped with the
// source bar's time, nudged +1s where needed so times stay strictly ascending.

type XBar = { time: number; open: number; high: number; low: number; close: number; volume: number };

// Sizing basis for brick/box/range/reversal: last ATR(14) of the series,
// falling back to 0.1% of the last close so tiny histories still render.
function lastAtrOf(bars: XBar[], period = 14): number {
  const a = atr(bars.map((b) => b.high), bars.map((b) => b.low), bars.map((b) => b.close), period);
  for (let i = a.length - 1; i >= 0; i--) { const v = a[i]; if (v != null && v > 0) return v; }
  const c = bars.length ? bars[bars.length - 1].close : 1;
  return Math.abs(c) * 0.001 || 0.0001;
}

function toRenko(bars: XBar[]): XBar[] {
  if (bars.length < 2) return bars;
  const brick = lastAtrOf(bars);
  const out: XBar[] = [];
  let level = bars[0].close;
  let lastTime = 0;
  const push = (open: number, close: number, src: XBar) => {
    const time = Math.max(src.time, lastTime + 1); lastTime = time;
    out.push({ time, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: src.volume });
  };
  for (const b of bars) {
    while (b.close >= level + brick) { push(level, level + brick, b); level += brick; }
    while (b.close <= level - brick) { push(level, level - brick, b); level -= brick; }
  }
  return out.length ? out : bars.slice(-1);
}

function toLineBreak(bars: XBar[], n = 3): XBar[] {
  const out: XBar[] = [];
  let lastTime = 0;
  const mk = (open: number, close: number, src: XBar) => {
    const time = Math.max(src.time, lastTime + 1); lastTime = time;
    out.push({ time, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: src.volume });
  };
  for (const b of bars) {
    if (out.length === 0) { if (b.close !== b.open) mk(b.open, b.close, b); continue; }
    const recent = out.slice(-n);
    const hi = Math.max(...recent.map((l) => Math.max(l.open, l.close)));
    const lo = Math.min(...recent.map((l) => Math.min(l.open, l.close)));
    const prev = out[out.length - 1];
    if (b.close > hi) mk(Math.max(prev.open, prev.close), b.close, b);
    else if (b.close < lo) mk(Math.min(prev.open, prev.close), b.close, b);
  }
  return out.length ? out : bars.slice(-1);
}

// Kagi rendered as a time-preserving reversal line: the level rides with price
// and only reverses after an ATR-sized counter-move.
function toKagi(bars: XBar[]): { time: number; value: number }[] {
  if (!bars.length) return [];
  const rev = lastAtrOf(bars);
  const out: { time: number; value: number }[] = [];
  let dir: 1 | -1 = 1;
  let level = bars[0].close;
  for (const b of bars) {
    if (dir === 1) {
      if (b.close > level) level = b.close;
      else if (level - b.close >= rev) { dir = -1; level = b.close; }
    } else {
      if (b.close < level) level = b.close;
      else if (b.close - level >= rev) { dir = 1; level = b.close; }
    }
    out.push({ time: b.time, value: level });
  }
  return out;
}

// Point & Figure: X/O columns approximated as one up/down bar per column
// (box = ATR/2, 3-box reversal).
function toPointFigure(bars: XBar[]): XBar[] {
  if (bars.length < 2) return bars;
  const box = lastAtrOf(bars) / 2 || 0.0001;
  const reversal = 3;
  const out: XBar[] = [];
  let lastTime = 0;
  let dir: 1 | -1 = 1;
  let colHigh = bars[0].close, colLow = bars[0].close, colVol = 0;
  let colSrc = bars[0];
  const flush = () => {
    const time = Math.max(colSrc.time, lastTime + 1); lastTime = time;
    out.push({
      time,
      open: dir === 1 ? colLow : colHigh,
      high: colHigh, low: colLow,
      close: dir === 1 ? colHigh : colLow,
      volume: colVol,
    });
  };
  for (const b of bars) {
    colVol += b.volume;
    if (dir === 1) {
      if (b.close > colHigh) { colHigh = b.close; colSrc = b; }
      else if (colHigh - b.close >= box * reversal) {
        flush(); dir = -1;
        colLow = b.close; colHigh = colHigh - box; colSrc = b; colVol = 0;
      }
    } else {
      if (b.close < colLow) { colLow = b.close; colSrc = b; }
      else if (b.close - colLow >= box * reversal) {
        flush(); dir = 1;
        colHigh = b.close; colLow = colLow + box; colSrc = b; colVol = 0;
      }
    }
  }
  flush();
  return out.length ? out : bars.slice(-1);
}

// Range Bars: each bar closes once its high-low range reaches the ATR.
function toRangeBars(bars: XBar[]): XBar[] {
  if (bars.length < 2) return bars;
  const range = lastAtrOf(bars);
  const out: XBar[] = [];
  let cur: XBar | null = null;
  let lastTime = 0;
  for (const b of bars) {
    if (!cur) { cur = { ...b }; continue; }
    cur.high = Math.max(cur.high, b.high);
    cur.low = Math.min(cur.low, b.low);
    cur.close = b.close;
    cur.volume += b.volume;
    if (cur.high - cur.low >= range) {
      const time = Math.max(cur.time, lastTime + 1); lastTime = time;
      out.push({ ...cur, time });
      cur = null;
    }
  }
  if (cur) { out.push({ ...cur, time: Math.max(cur.time, lastTime + 1) }); }
  return out.length ? out : bars.slice(-1);
}

// Chart types whose bars can't be updated incrementally on a tick — the whole
// series recomputes from source bars (same pattern Heikin Ashi already used).
const TRANSFORM_CHART_TYPES: ReadonlySet<string> = new Set(['heikinashi', 'renko', 'linebreak', 'kagi', 'pnf', 'rangebar']);

function getDecimals(symbol: string): number {
  if (['USDJPY', 'EURJPY', 'GBPJPY'].includes(symbol)) return 3;
  if (symbol.startsWith('XAU') || symbol.startsWith('ETH')) return 2;
  if (symbol === 'XAGUSD' || symbol === 'NATGAS') return 3;
  if (symbol.startsWith('BTC') || symbol === 'US30' || symbol === 'NAS100' || symbol === 'SPX500') return 1;
  if (symbol === 'USOIL' || symbol === 'UKOIL') return 2;
  return 5;
}

function ToolTooltip({ label, visible }: { label: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none whitespace-nowrap"
      style={{
        backgroundColor: '#1a1a28',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 4, padding: '4px 8px', fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      {label}
    </div>
  );
}

function renderDrawings(ctx: CanvasRenderingContext2D, drawings: Drawing[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  for (const d of drawings) {
    ctx.strokeStyle = d.color; ctx.fillStyle = d.color;
    ctx.lineWidth = 1; ctx.setLineDash([]);
    switch (d.type) {
      case 'trendline':
        ctx.beginPath(); ctx.moveTo(d.startX, d.startY); ctx.lineTo(d.endX, d.endY); ctx.stroke(); break;
      case 'horizontal':
        ctx.setLineDash([6,3]); ctx.beginPath(); ctx.moveTo(0, d.startY); ctx.lineTo(w, d.startY); ctx.stroke(); ctx.setLineDash([]); break;
      case 'vertical':
        ctx.setLineDash([6,3]); ctx.beginPath(); ctx.moveTo(d.startX, 0); ctx.lineTo(d.startX, h); ctx.stroke(); ctx.setLineDash([]); break;
      case 'rectangle':
        ctx.strokeRect(d.startX, d.startY, d.endX - d.startX, d.endY - d.startY); break;
      case 'channel':
        drawChannel(ctx, d.startX, d.startY, d.endX, d.endY); break;
      case 'longpos': case 'shortpos':
        drawPositionZones(ctx, d.type, d.startX, d.startY, d.endX, d.endY); break;
      case 'fibonacci': {
        const top = Math.min(d.startY, d.endY), bottom = Math.max(d.startY, d.endY), range = bottom - top;
        ctx.font = '10px JetBrains Mono, monospace';
        for (const level of FIB_LEVELS) {
          const y = bottom - level * range;
          ctx.setLineDash(level === 0 || level === 1 ? [] : [4,3]);
          ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(d.startX, y); ctx.lineTo(d.endX, y); ctx.stroke(); ctx.globalAlpha = 1;
          ctx.fillText(`${(level*100).toFixed(1)}%`, d.endX + 4, y + 3);
        }
        ctx.setLineDash([]); break;
      }
      case 'measure': {
        ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(d.startX, d.startY); ctx.lineTo(d.endX, d.endY); ctx.stroke(); ctx.setLineDash([]);
        const dx = d.endX - d.startX, dy = d.endY - d.startY;
        ctx.font = '11px JetBrains Mono, monospace'; ctx.fillStyle = '#fff';
        ctx.fillText(`${Math.sqrt(dx*dx+dy*dy).toFixed(0)}px`, (d.startX+d.endX)/2+6, (d.startY+d.endY)/2-6); break;
      }
      case 'text':
        if (d.text) { ctx.font = '13px JetBrains Mono, monospace'; ctx.fillText(d.text, d.startX, d.startY); } break;
    }
  }
}

// ─── Multiscreen Layout Grids ─────────────────────────────────────

const LAYOUT_GRIDS: Record<LayoutType, React.CSSProperties> = {
  single:    { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' },
  split:     { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' },
  vsplit:    { gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr' },
  h3:        { gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr 1fr' },
  v3:        { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr' },
  quarters:  { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' },
  onefive:   { gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr 1fr' },
  table3x2:  { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
};

// Extra symbols for secondary panes (main chart always shows activeSymbol)
const LAYOUT_EXTRA_PANES: Record<LayoutType, string[]> = {
  single:   [],
  split:    ['GBPUSD'],
  vsplit:   ['XAUUSD'],
  h3:       ['GBPUSD', 'XAUUSD'],
  v3:       ['GBPUSD', 'XAUUSD'],
  quarters: ['GBPUSD', 'XAUUSD', 'USDJPY'],
  onefive:  ['GBPUSD', 'XAUUSD', 'USDJPY', 'BTCUSD', 'US30'],
  table3x2: ['GBPUSD', 'XAUUSD', 'USDJPY', 'BTCUSD', 'US30'],
};

// Mini chart pane using TradingView widget for secondary screens
function MiniChartPane({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!ref.current || loaded.current) return;
    loaded.current = true;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.type = 'text/javascript';
    script.textContent = JSON.stringify({
      symbol: `FX:${symbol}`,
      width: '100%',
      height: '100%',
      locale: 'en',
      dateRange: '1D',
      colorTheme: 'dark',
      isTransparent: true,
      autosize: true,
      largeChartUrl: '',
      noTimeScale: false,
      chartOnly: false,
    });
    ref.current.innerHTML = '';
    ref.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="relative" style={{ backgroundColor: '#060D16', overflow: 'hidden' }}>
      <div ref={ref} className="absolute inset-0" />
      <div className="absolute top-1 left-2 z-10 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,145,213,0.15)', color: '#0091D5' }}>
        {symbol}
      </div>
    </div>
  );
}

// ─── Indicator Colors ─────────────────────────────────────────────

const INDICATOR_COLORS: Record<string, string> = {
  sma9: '#FFFF00', sma21: '#00FFFF', sma50: '#FFA500', sma200: '#FFFFFF',
  ema9: '#FF6B6B', ema21: '#4ECDC4', ema50: '#FFE66D', vwap: '#E040FB',
  bbands_upper: 'rgba(41,171,226,0.5)', bbands_middle: 'rgba(41,171,226,0.3)', bbands_lower: 'rgba(41,171,226,0.5)',
  rsi14: '#FF9800',
  macd_macd: '#2196F3', macd_signal: '#FF5722', macd_hist_pos: 'rgba(0,194,122,0.4)', macd_hist_neg: 'rgba(193,18,31,0.4)',
  atr14: '#AB47BC',
  stoch_k: '#2196F3', stoch_d: '#FF5722',
  // Extended
  aroon_up: '#00C27A', aroon_down: '#C1121F',
  adx_adx: '#FF9800', adx_plus: '#00C27A', adx_minus: '#C1121F',
  donchian_upper: '#00BCD4', donchian_middle: 'rgba(0,188,212,0.4)', donchian_lower: '#00BCD4',
  envelope_upper: '#AB47BC', envelope_basis: 'rgba(171,71,188,0.4)', envelope_lower: '#AB47BC',
  fractals_up: '#00C27A', fractals_down: '#C1121F',
  ichimoku_conversion: '#0091D5', ichimoku_base: '#FF5722', ichimoku_spanA: 'rgba(0,194,122,0.3)', ichimoku_spanB: 'rgba(193,18,31,0.3)', ichimoku_lagging: '#E040FB',
  momentum: '#FF9800', psar: '#E040FB',
  pp_pivot: '#FFD700', pp_r1: '#00C27A', pp_r2: 'rgba(0,194,122,0.5)', pp_r3: 'rgba(0,194,122,0.3)',
  pp_s1: '#C1121F', pp_s2: 'rgba(193,18,31,0.5)', pp_s3: 'rgba(193,18,31,0.3)',
  bullsbears_bulls: '#00C27A', bullsbears_bears: '#C1121F',
  // GIO custom
  gio_kalman_short: '#f5c518', gio_kalman_long: '#8b5cf6',
  gio_bluebird_short: '#22d3ee', gio_bluebird_long: '#2563eb',
  gio_eq_base: '#f5c518', gio_eq_upper: 'rgba(0,194,122,0.5)', gio_eq_lower: 'rgba(193,18,31,0.5)',
  gio_ribbon_upper: '#f5c518', gio_ribbon_mid: 'rgba(245,197,24,0.35)', gio_ribbon_lower: '#f5c518',
};

// ─── Main Component ────────────────────────────────────────────────

interface ChartPanelProps {
  ohlcvBuilder: OHLCVBuilder | null;
  isLiveData?: boolean;
}

export default function ChartPanel({ ohlcvBuilder, isLiveData = false }: ChartPanelProps) {
  const { activeSymbol, prices } = useTradingStore();
  const storeTf = useTradingStore((s) => s.activeTimeframe);
  const setStoreTf = useTradingStore((s) => s.setActiveTimeframe);
  const setRaptorChartType = useTradingStore((s) => s.setRaptorChartType);
  const setRaptorIndicators = useTradingStore((s) => s.setRaptorIndicators);
  const [selectedTf, setSelectedTf] = useState<string>(storeTf || '1H');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  // Shared with the QuickTrade panel via the store — both switches act in unison.
  const oneClickTrading = useTradingStore((s) => s.oneClickTrading);
  const setOneClickTrading = useTradingStore((s) => s.setOneClickTrading);
  const [activeLayout, setActiveLayout] = useState<LayoutType>('single');

  // Change timeframe locally AND publish to the shared store, so the RAPTOR
  // chart, the TradingView chart, and the shared Timeframe bar stay in lock-step.
  const changeTf = useCallback((tf: string) => {
    if (!TF_TO_RESOLUTION[tf]) return;
    setSelectedTf(tf);
    setStoreTf(tf);
  }, [setStoreTf]);

  // Mirror shared-store timeframe changes (from the shared bar / TV tab) into
  // this chart. Guarded so it never loops with changeTf.
  useEffect(() => {
    if (storeTf && storeTf !== selectedTf) setSelectedTf(storeTf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeTf]);

  // Listen for keyboard tf changes (any valid timeframe label).
  useEffect(() => {
    function handleTfChange(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (detail && TF_TO_RESOLUTION[detail]) changeTf(detail);
    }
    window.addEventListener('raptor-timeframe-change', handleTfChange);
    return () => window.removeEventListener('raptor-timeframe-change', handleTfChange);
  }, [changeTf]);

  // Listen for drawing tool selection from the toolbar dropdown
  useEffect(() => {
    const TOOL_LABEL_MAP: Record<string, DrawingToolId> = {
      'Trend Line': 'trendline', 'Horizontal Line': 'horizontal', 'Line': 'trendline',
      'Fibonacci Retracement': 'fibonacci', 'Fibonacci Arcs': 'fibonacci',
      'Rectangle': 'rectangle', 'Text': 'text', 'Ruler / Measure': 'measure',
      'Arrow': 'trendline', 'Circle': 'rectangle', 'Flag': 'rectangle',
      'Forecast': 'trendline', 'Gann Box': 'rectangle', 'Gann Fan': 'trendline',
      'Head And Shoulders': 'trendline', 'Parallel Channel': 'channel',
      'Long Position': 'longpos', 'Short Position': 'shortpos',
      'ABCD Pattern': 'trendline',
    };
    function handleToolSelect(e: Event) {
      const label = (e as CustomEvent<string>).detail;
      const toolId = TOOL_LABEL_MAP[label];
      if (toolId) setActiveTool(toolId);
    }
    window.addEventListener('raptor-drawing-tool', handleToolSelect);
    return () => window.removeEventListener('raptor-drawing-tool', handleToolSelect);
  }, []);

  // Indicator state
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(new Set());
  const [indicatorParams, setIndicatorParams] = useState<Record<IndicatorId, Record<string, number>>>({} as Record<IndicatorId, Record<string, number>>);

  // Mirror this chart's type + indicator set into the shared store so the
  // Templates menu (§1/§11) can snapshot it. Read-only publish.
  useEffect(() => { setRaptorChartType(chartType); }, [chartType, setRaptorChartType]);
  useEffect(() => { setRaptorIndicators([...activeIndicators]); }, [activeIndicators, setRaptorIndicators]);

  // Apply a saved template pushed from the shared Templates menu. Symbol + TF
  // arrive via the store; here we restore the RAPTOR chart-type + indicators.
  useEffect(() => {
    function onApply(e: Event) {
      const d = (e as CustomEvent<{ chartType?: string; indicators?: string[] }>).detail;
      if (!d) return;
      if (d.chartType) setChartType(d.chartType as ChartType);
      if (Array.isArray(d.indicators)) setActiveIndicators(new Set(d.indicators as IndicatorId[]));
    }
    window.addEventListener('raptor-apply-template', onApply);
    return () => window.removeEventListener('raptor-apply-template', onApply);
  }, []);

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<DrawingToolId>('cursor');
  const [magnetMode, setMagnetMode] = useState(false);
  const [lockDrawings, setLockDrawings] = useState(false);
  const [showDrawings, setShowDrawings] = useState(true);
  const [hoveredTool, setHoveredTool] = useState<DrawingToolId | null>(null);

  // Canvas drawing state
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  // Object Tree (§7): number of live Raptor Script plot series.
  const [scriptPlotCount, setScriptPlotCount] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [previewEnd, setPreviewEnd] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const customPriceLinesRef = useRef<Array<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>>>([]);

  // OHLC overlay
  const [ohlcValues, setOhlcValues] = useState<{ open: number; high: number; low: number; close: number; } | null>(null);

  // ─── Bar Replay (§12) ────────────────────────────
  // Replays loaded history bar-by-bar on the RAPTOR chart. While active, live
  // ticks are frozen and loadChartData renders only bars[0..replayIndex].
  const [replayActive, setReplayActive] = useState(false);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const replayTotalRef = useRef(0);

  const enterReplay = useCallback(() => {
    if (!ohlcvBuilder) return;
    const resolution = TF_TO_RESOLUTION[selectedTf] as Resolution; if (!resolution) return;
    const all = ohlcvBuilder.getAllBars(activeSymbol, resolution);
    if (all.length < 20) return; // not enough history to replay
    replayTotalRef.current = all.length;
    setReplayIndex(Math.max(10, Math.floor(all.length * 0.6)));
    setReplayPlaying(false);
    setReplayTrades([]);
    setReplayReport(null);
    setReplayActive(true);
  }, [ohlcvBuilder, selectedTf, activeSymbol]);

  // §11 replay practice trading — mark Buy/Sell against history and get an
  // honest, rule-based scorecard computed from the ACTUAL later bars.
  // Display-only: practice trades never touch the order service.
  const [replayTrades, setReplayTrades] = useState<ReplayTrade[]>([]);
  const [replayReport, setReplayReport] = useState<ReplayReport | null>(null);
  const replayEntryLineRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']> | null>(null);

  const getReplayBars = useCallback((): OHLCVBar[] => {
    if (!ohlcvBuilder) return [];
    const resolution = TF_TO_RESOLUTION[selectedTf] as Resolution;
    return resolution ? ohlcvBuilder.getAllBars(activeSymbol, resolution) : [];
  }, [ohlcvBuilder, selectedTf, activeSymbol]);

  const clearReplayEntryLine = useCallback(() => {
    if (replayEntryLineRef.current) {
      try { candleSeriesRef.current?.removePriceLine(replayEntryLineRef.current); } catch { /* noop */ }
      replayEntryLineRef.current = null;
    }
  }, []);

  const closeOpenReplayTrade = useCallback((atIdx: number, atPrice: number) => {
    setReplayTrades((prev) => prev.map((t) =>
      t.exitIdx == null && atIdx >= t.entryIdx ? { ...t, exitIdx: atIdx, exitPrice: atPrice } : t));
    clearReplayEntryLine();
  }, [clearReplayEntryLine]);

  const markReplayTrade = useCallback((dir: 'BUY' | 'SELL' | 'CLOSE') => {
    const bars = getReplayBars();
    const idx = Math.min(replayIndex, bars.length) - 1;
    const bar = bars[idx];
    if (!bar) return;
    const open = replayTrades.find((t) => t.exitIdx == null);
    if (dir === 'CLOSE') {
      if (open && idx >= open.entryIdx) closeOpenReplayTrade(idx, bar.close);
      return;
    }
    if (open) {
      if (open.dir === dir) return; // already in that direction
      if (idx >= open.entryIdx) closeOpenReplayTrade(idx, bar.close); // reverse
      else return;
    }
    setReplayTrades((prev) => [...prev, { dir, entryIdx: idx, entryPrice: bar.close, exitIdx: null, exitPrice: null }]);
    clearReplayEntryLine();
    try {
      replayEntryLineRef.current = candleSeriesRef.current?.createPriceLine({
        price: bar.close, color: dir === 'BUY' ? '#00C27A' : '#FF5252', lineWidth: 1 as const,
        lineStyle: LineStyle.Dashed, lineVisible: true, axisLabelVisible: true,
        title: `practice ${dir}`, axisLabelColor: dir === 'BUY' ? '#00C27A' : '#FF5252', axisLabelTextColor: '#ffffff',
      }) ?? null;
    } catch { /* noop */ }
  }, [getReplayBars, replayIndex, replayTrades, closeOpenReplayTrade, clearReplayEntryLine]);

  const exitReplay = useCallback(() => {
    setReplayPlaying(false);
    // Grade marked trades against the real bars before leaving.
    const bars = getReplayBars();
    setReplayTrades((trades) => {
      if (trades.length > 0 && bars.length > 0) {
        const endIdx = Math.min(replayIndex, bars.length) - 1;
        const closed = trades.map((t) => (t.exitIdx == null
          ? { ...t, exitIdx: Math.max(t.entryIdx, endIdx), exitPrice: bars[Math.max(t.entryIdx, endIdx)].close, autoClosed: true }
          : t));
        setReplayReport(gradeReplayTrades(closed, bars));
      }
      return [];
    });
    clearReplayEntryLine();
    setReplayActive(false);
  }, [getReplayBars, replayIndex, clearReplayEntryLine]);

  const replayStep = useCallback((dir: 1 | -1) => {
    setReplayIndex((i) => Math.min(replayTotalRef.current, Math.max(10, i + dir)));
  }, []);

  // Advance the replay while playing, at speed-scaled cadence.
  useEffect(() => {
    if (!replayActive || !replayPlaying) return;
    const id = setInterval(() => {
      setReplayIndex((i) => {
        if (i >= replayTotalRef.current) { setReplayPlaying(false); return i; }
        return i + 1;
      });
    }, Math.max(60, 700 / replaySpeed));
    return () => clearInterval(id);
  }, [replayActive, replayPlaying, replaySpeed]);

  // Leaving replay (or switching symbol/timeframe) resets to live.
  useEffect(() => { if (replayActive) exitReplay(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeSymbol, selectedTf]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const barSeriesRef = useRef<ISeriesApi<'Bar'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const baselineSeriesRef = useRef<ISeriesApi<'Baseline'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLineRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']> | null>(null);
  const lastBarTimeRef = useRef<number>(0);
  const lastCrosshairPriceRef = useRef<number | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>>(new Map());
  // Raptor Script (§5): user-authored script + its plotted line series.
  const scriptSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  // Seed from localStorage so a saved script survives reloads AND is applied even
  // when the RAPTOR chart mounts after the editor's apply-event fired (tab switch).
  const userScriptRef = useRef<string | null>(
    typeof window !== 'undefined'
      ? (() => { try { return localStorage.getItem('raptor_user_script'); } catch { return null; } })()
      : null,
  );

  // ─── Indicator handlers ──────────────────────────

  const handleIndicatorToggle = useCallback((id: IndicatorId) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleIndicatorParamsUpdate = useCallback((id: IndicatorId, params: Record<string, number>) => {
    setIndicatorParams((prev) => ({ ...prev, [id]: params }));
  }, []);

  // ─── Clear All ───────────────────────────────────

  const handleClearAll = useCallback(() => {
    // Clear indicators
    setActiveIndicators(new Set());
    // Clean up indicator series from chart
    const chart = chartRef.current;
    if (chart) {
      for (const [, series] of indicatorSeriesRef.current.entries()) {
        try { chart.removeSeries(series); } catch { /* noop */ }
      }
      indicatorSeriesRef.current.clear();
    }
    // Clear drawings
    setDrawings([]);
    for (const pl of customPriceLinesRef.current) {
      try { candleSeriesRef.current?.removePriceLine(pl); } catch { /* noop */ }
    }
    customPriceLinesRef.current = [];
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  // ─── Drawing tools config ────────────────────────

  const drawingTools: DrawingTool[] = [
    { id: 'cursor', label: 'Pointer', icon: <MousePointer2 size={18} />, group: 1 },
    { id: 'crosshair', label: 'Crosshair', icon: <Crosshair size={18} />, group: 1 },
    { id: 'trendline', label: 'Trend Line', icon: <TrendingUp size={18} />, group: 2 },
    { id: 'horizontal', label: 'Horizontal Line', icon: <Minus size={18} />, group: 2 },
    { id: 'vertical', label: 'Vertical Line', icon: <MoveVertical size={18} />, group: 2 },
    { id: 'fibonacci', label: 'Fibonacci', icon: <GitCommitHorizontal size={18} />, group: 3 },
    { id: 'text', label: 'Text', icon: <Type size={18} />, group: 3 },
    { id: 'rectangle', label: 'Rectangle', icon: <Square size={18} />, group: 3 },
    { id: 'channel', label: 'Parallel Channel', icon: <Rows2 size={18} />, group: 3 },
    { id: 'longpos', label: 'Long Position', icon: <TrendingUp size={18} />, group: 3 },
    { id: 'shortpos', label: 'Short Position', icon: <TrendingDown size={18} />, group: 3 },
    { id: 'measure', label: 'Measure', icon: <Ruler size={18} />, group: 4 },
    { id: 'zoomin', label: 'Zoom In', icon: <ZoomIn size={18} />, group: 4 },
    { id: 'zoomout', label: 'Zoom Out', icon: <ZoomOut size={18} />, group: 4 },
    { id: 'magnet', label: 'Magnet Mode', icon: <Magnet size={18} />, group: 5, toggle: true },
    { id: 'lock', label: 'Lock Drawings', icon: <Lock size={18} />, group: 5, toggle: true },
    { id: 'visibility', label: showDrawings ? 'Hide Drawings' : 'Show Drawings', icon: showDrawings ? <Eye size={18} /> : <EyeOff size={18} />, group: 5, toggle: true },
    { id: 'deleteall', label: 'Delete All Drawings', icon: <Trash2 size={18} />, group: 6, toggle: true },
  ];

  const handleToolClick = (tool: DrawingTool) => {
    if (tool.id === 'magnet') { setMagnetMode(!magnetMode); }
    else if (tool.id === 'lock') { setLockDrawings(!lockDrawings); }
    else if (tool.id === 'visibility') { setShowDrawings(!showDrawings); }
    else if (tool.id === 'deleteall') {
      setDrawings([]);
      for (const pl of customPriceLinesRef.current) { try { candleSeriesRef.current?.removePriceLine(pl); } catch {} }
      customPriceLinesRef.current = [];
      if (canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }
    } else if (tool.id === 'zoomin') {
      chartRef.current?.timeScale().applyOptions({ barSpacing: (chartRef.current.timeScale().options().barSpacing ?? 8) + 2 });
    } else if (tool.id === 'zoomout') {
      const current = chartRef.current?.timeScale().options().barSpacing ?? 8;
      chartRef.current?.timeScale().applyOptions({ barSpacing: Math.max(2, current - 2) });
    } else { setActiveTool(tool.id); }
  };

  const isToolActive = (tool: DrawingTool): boolean => {
    if (tool.id === 'magnet') return magnetMode;
    if (tool.id === 'lock') return lockDrawings;
    if (tool.id === 'visibility') return !showDrawings;
    if (tool.id === 'deleteall' || tool.id === 'zoomin' || tool.id === 'zoomout') return false;
    return activeTool === tool.id;
  };

  // ─── Canvas drawing handlers ─────────────────────

  const handleDrawStart = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (lockDrawings) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    if (activeTool === 'text') {
      const text = prompt('Enter text:');
      if (text) setDrawings((prev) => [...prev, { type: 'text', startX: x, startY: y, endX: x, endY: y, color: '#0091D5', text }]);
      return;
    }
    if (activeTool === 'vertical') {
      setDrawings((prev) => [...prev, { type: 'vertical', startX: x, startY: y, endX: x, endY: y, color: '#0091D5' }]);
      return;
    }
    if (activeTool === 'horizontal') {
      setDrawings((prev) => [...prev, { type: 'horizontal', startX: x, startY: y, endX: x, endY: y, color: '#0091D5' }]);
      if (lastCrosshairPriceRef.current !== null && candleSeriesRef.current) {
        const pl = candleSeriesRef.current.createPriceLine({ price: lastCrosshairPriceRef.current, color: '#0091D5', lineWidth: 1 as const, lineStyle: LineStyle.Dotted, lineVisible: true, axisLabelVisible: true, axisLabelColor: '#0091D5', axisLabelTextColor: '#ffffff' });
        customPriceLinesRef.current.push(pl);
      }
      return;
    }
    setDrawStart({ x, y }); setIsDrawing(true);
  }, [activeTool, lockDrawings]);

  const handleDrawMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setPreviewEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isDrawing, drawStart]);

  const handleDrawEnd = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    setDrawings((prev) => [...prev, { type: activeTool, startX: drawStart.x, startY: drawStart.y, endX: x, endY: y, color: '#0091D5' }]);
    setIsDrawing(false); setDrawStart(null); setPreviewEnd(null);
  }, [isDrawing, drawStart, activeTool]);

  // Repaint canvas
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    if (!showDrawings) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    renderDrawings(ctx, drawings, canvas.width, canvas.height);
    if (isDrawing && drawStart && previewEnd) {
      ctx.strokeStyle = 'rgba(41,171,226,0.6)'; ctx.fillStyle = 'rgba(41,171,226,0.6)';
      ctx.lineWidth = 1; ctx.setLineDash([4,4]);
      switch (activeTool) {
        case 'trendline': case 'measure':
          ctx.beginPath(); ctx.moveTo(drawStart.x, drawStart.y); ctx.lineTo(previewEnd.x, previewEnd.y); ctx.stroke();
          if (activeTool === 'measure') { const dx=previewEnd.x-drawStart.x, dy=previewEnd.y-drawStart.y; ctx.font='11px JetBrains Mono, monospace'; ctx.fillStyle='#fff'; ctx.setLineDash([]); ctx.fillText(`${Math.sqrt(dx*dx+dy*dy).toFixed(0)}px`,(drawStart.x+previewEnd.x)/2+6,(drawStart.y+previewEnd.y)/2-6); }
          break;
        case 'rectangle': ctx.strokeRect(drawStart.x, drawStart.y, previewEnd.x - drawStart.x, previewEnd.y - drawStart.y); break;
        case 'channel': drawChannel(ctx, drawStart.x, drawStart.y, previewEnd.x, previewEnd.y); break;
        case 'longpos': case 'shortpos': drawPositionZones(ctx, activeTool, drawStart.x, drawStart.y, previewEnd.x, previewEnd.y); break;
        case 'fibonacci': {
          const top=Math.min(drawStart.y,previewEnd.y), bottom=Math.max(drawStart.y,previewEnd.y), range=bottom-top;
          ctx.font='10px JetBrains Mono, monospace';
          for (const level of FIB_LEVELS) { const y=bottom-level*range; ctx.beginPath(); ctx.moveTo(drawStart.x, y); ctx.lineTo(previewEnd.x, y); ctx.stroke(); }
          break;
        }
      }
      ctx.setLineDash([]);
    }
  }, [drawings, isDrawing, drawStart, previewEnd, showDrawings, activeTool]);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current; const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const syncSize = () => {
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = width; canvas.height = height;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx && showDrawings) renderDrawings(ctx, drawings, canvas.width, canvas.height);
    };
    syncSize();
    const ro = new ResizeObserver(syncSize); ro.observe(parent);
    return () => ro.disconnect();
  }, [drawings, showDrawings]);

  // ─── Create chart ────────────────────────────────

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions: DeepPartial<ChartOptions> = {
      layout: { background: { type: ColorType.Solid, color: '#060D16' }, textColor: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace", fontSize: 11 },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(41,171,226,0.4)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#0091D5' },
        horzLine: { color: 'rgba(41,171,226,0.4)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#0091D5' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)', scaleMargins: { top: 0.1, bottom: 0.2 } },
      timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true, secondsVisible: false, rightOffset: 5, barSpacing: 8 },
      handleScroll: true, handleScale: true,
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) { setOhlcValues(null); return; }
      const candleData = param.seriesData.get(candleSeriesRef.current!) as CandlestickData | undefined;
      if (candleData && 'open' in candleData) {
        setOhlcValues({ open: candleData.open, high: candleData.high, low: candleData.low, close: candleData.close });
      }
      if (param.point) {
        const price = candleSeriesRef.current?.coordinateToPrice(param.point.y);
        if (price !== null && price !== undefined) lastCrosshairPriceRef.current = price;
      }
    });

    // Create all 4 series types
    const candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#00C27A', downColor: '#C1121F', borderUpColor: '#00C27A', borderDownColor: '#C1121F', wickUpColor: '#00C27A', wickDownColor: '#C1121F' });
    candleSeriesRef.current = candleSeries;

    const barSer = chart.addSeries(BarSeries, { upColor: '#00C27A', downColor: '#C1121F', visible: false });
    barSeriesRef.current = barSer;

    const lineSer = chart.addSeries(LineSeries, { color: '#0091D5', lineWidth: 2, visible: false });
    lineSeriesRef.current = lineSer;

    const areaSer = chart.addSeries(AreaSeries, {
      topColor: 'rgba(0,145,213,0.3)', bottomColor: 'rgba(0,145,213,0.02)',
      lineColor: '#0091D5', lineWidth: 2, visible: false,
    });
    areaSeriesRef.current = areaSer;

    const baselineSer = chart.addSeries(BaselineSeries, {
      topLineColor: '#00C27A', topFillColor1: 'rgba(0,194,122,0.25)', topFillColor2: 'rgba(0,194,122,0.03)',
      bottomLineColor: '#C1121F', bottomFillColor1: 'rgba(193,18,31,0.03)', bottomFillColor2: 'rgba(193,18,31,0.25)',
      lineWidth: 2, visible: false,
    });
    baselineSeriesRef.current = baselineSer;

    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) { const { width, height } = entry.contentRect; chart.applyOptions({ width, height }); }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      indicatorSeriesRef.current.clear();
      chart.remove();
      chartRef.current = null; candleSeriesRef.current = null; barSeriesRef.current = null;
      lineSeriesRef.current = null; areaSeriesRef.current = null; baselineSeriesRef.current = null;
      volumeSeriesRef.current = null;
      priceLineRef.current = null;
    };
  }, []);

  // Toggle chart type visibility. Candle-shaped types (Heikin Ashi, Hollow,
  // Renko, Line Break, P&F, Range Bars) all reuse the candlestick series —
  // loadChartData feeds it the transformed data. Kagi renders on the line
  // series; Baseline has its own series.
  useEffect(() => {
    const candleShaped = ['candlestick', 'hollow', 'heikinashi', 'renko', 'linebreak', 'pnf', 'rangebar'].includes(chartType);
    candleSeriesRef.current?.applyOptions({
      visible: candleShaped,
      // Hollow candles: transparent up-candle body, coloured border/wick.
      upColor: chartType === 'hollow' ? 'rgba(0,0,0,0)' : '#00C27A',
      borderUpColor: '#00C27A',
      wickUpColor: '#00C27A',
    });
    barSeriesRef.current?.applyOptions({ visible: chartType === 'bar' });
    lineSeriesRef.current?.applyOptions({ visible: chartType === 'line' || chartType === 'kagi' });
    areaSeriesRef.current?.applyOptions({ visible: chartType === 'area' });
    baselineSeriesRef.current?.applyOptions({ visible: chartType === 'baseline' });
  }, [chartType]);

  // Sub-minute timeframes need seconds on the time axis.
  useEffect(() => {
    chartRef.current?.timeScale().applyOptions({ secondsVisible: /^\d+s$/.test(selectedTf) });
  }, [selectedTf]);

  // NEXUS chart markers (§16): entry-zone levels as distinct, removable
  // price lines. Never touches or deletes trader drawings; cleared on
  // symbol change or via nexus-clear-zone.
  const nexusZoneLinesRef = useRef<Array<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>>>([]);
  useEffect(() => {
    const clearLines = () => {
      for (const pl of nexusZoneLinesRef.current) { try { candleSeriesRef.current?.removePriceLine(pl); } catch { /* noop */ } }
      nexusZoneLinesRef.current = [];
    };
    const onMark = (e: Event) => {
      const d = (e as CustomEvent<{ symbol: string; levels: { price: number; label: string; color: string }[] }>).detail;
      if (!d || d.symbol !== activeSymbol || !candleSeriesRef.current) return;
      clearLines();
      for (const lv of d.levels) {
        try {
          nexusZoneLinesRef.current.push(candleSeriesRef.current.createPriceLine({
            price: lv.price, color: lv.color, lineWidth: 1 as const, lineStyle: LineStyle.LargeDashed,
            lineVisible: true, axisLabelVisible: true, title: lv.label,
            axisLabelColor: lv.color, axisLabelTextColor: '#ffffff',
          }));
        } catch { /* noop */ }
      }
      window.dispatchEvent(new CustomEvent('nexus-zone-marked', { detail: { count: nexusZoneLinesRef.current.length } }));
    };
    const onClear = () => { clearLines(); window.dispatchEvent(new CustomEvent('nexus-zone-marked', { detail: { count: 0 } })); };
    window.addEventListener('nexus-mark-zone', onMark);
    window.addEventListener('nexus-clear-zone', onClear);
    return () => {
      window.removeEventListener('nexus-mark-zone', onMark);
      window.removeEventListener('nexus-clear-zone', onClear);
      clearLines();
    };
  }, [activeSymbol]);

  // ─── Indicator series helpers ────────────────────

  const getOrCreateLineSeries = useCallback((key: string, color: string, scaleId?: string, lineWidth: number = 1): ISeriesApi<'Line'> => {
    const existing = indicatorSeriesRef.current.get(key);
    if (existing) return existing as ISeriesApi<'Line'>;
    const chart = chartRef.current; if (!chart) throw new Error('Chart not initialized');
    const series = chart.addSeries(LineSeries, { color, lineWidth: lineWidth as 1|2|3|4, priceScaleId: scaleId || 'right', lastValueVisible: false, priceLineVisible: false });
    if (scaleId && scaleId !== 'right') series.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    indicatorSeriesRef.current.set(key, series);
    return series;
  }, []);

  const getOrCreateHistSeries = useCallback((key: string, scaleId: string): ISeriesApi<'Histogram'> => {
    const existing = indicatorSeriesRef.current.get(key);
    if (existing) return existing as ISeriesApi<'Histogram'>;
    const chart = chartRef.current; if (!chart) throw new Error('Chart not initialized');
    const series = chart.addSeries(HistogramSeries, { priceScaleId: scaleId, lastValueVisible: false, priceLineVisible: false });
    series.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    indicatorSeriesRef.current.set(key, series);
    return series;
  }, []);

  const cleanupIndicatorSeries = useCallback(() => {
    const chart = chartRef.current; if (!chart) return;
    const activeKeys = new Set<string>();
    for (const id of activeIndicators) {
      if (id === 'bbands') { activeKeys.add('bbands_upper'); activeKeys.add('bbands_middle'); activeKeys.add('bbands_lower'); }
      else if (id === 'macd') { activeKeys.add('macd_macd'); activeKeys.add('macd_signal'); activeKeys.add('macd_hist'); }
      else if (id === 'stoch') { activeKeys.add('stoch_k'); activeKeys.add('stoch_d'); }
      else if (id === 'aroon') { activeKeys.add('aroon_up'); activeKeys.add('aroon_down'); }
      else if (id === 'adx') { activeKeys.add('adx_adx'); activeKeys.add('adx_plus'); activeKeys.add('adx_minus'); }
      else if (id === 'donchian') { activeKeys.add('donchian_upper'); activeKeys.add('donchian_middle'); activeKeys.add('donchian_lower'); }
      else if (id === 'envelope') { activeKeys.add('envelope_upper'); activeKeys.add('envelope_basis'); activeKeys.add('envelope_lower'); }
      else if (id === 'fractals') { activeKeys.add('fractals_up'); activeKeys.add('fractals_down'); }
      else if (id === 'ichimoku') { activeKeys.add('ichimoku_conversion'); activeKeys.add('ichimoku_base'); activeKeys.add('ichimoku_spanA'); activeKeys.add('ichimoku_spanB'); activeKeys.add('ichimoku_lagging'); }
      else if (id === 'pivotpoints') { activeKeys.add('pp_pivot'); activeKeys.add('pp_r1'); activeKeys.add('pp_r2'); activeKeys.add('pp_r3'); activeKeys.add('pp_s1'); activeKeys.add('pp_s2'); activeKeys.add('pp_s3'); }
      else if (id === 'bullsbears') { activeKeys.add('bullsbears_bulls'); activeKeys.add('bullsbears_bears'); }
      else if (id === 'gio_kalman') { activeKeys.add('gio_kalman_short'); activeKeys.add('gio_kalman_long'); }
      else if (id === 'gio_bluebird') { activeKeys.add('gio_bluebird_short'); activeKeys.add('gio_bluebird_long'); }
      else if (id === 'gio_equalizer') { activeKeys.add('gio_eq_base'); activeKeys.add('gio_eq_upper'); activeKeys.add('gio_eq_lower'); }
      else if (id === 'gio_donchian_ribbon') { activeKeys.add('gio_ribbon_upper'); activeKeys.add('gio_ribbon_mid'); activeKeys.add('gio_ribbon_lower'); }
      else { activeKeys.add(id); }
    }
    for (const [key, series] of indicatorSeriesRef.current.entries()) {
      if (!activeKeys.has(key)) { try { chart.removeSeries(series); } catch {} indicatorSeriesRef.current.delete(key); }
    }
  }, [activeIndicators]);

  // ─── Apply indicators ────────────────────────────

  const applyIndicators = useCallback((times: Time[], closes: number[], highs: number[], lows: number[], volumes: number[]) => {
    if (!chartRef.current || times.length === 0) return;
    cleanupIndicatorSeries();

    const toLineData = (values: (number | null)[]): LineData[] => {
      const data: LineData[] = [];
      for (let i = 0; i < values.length; i++) { if (values[i] !== null) data.push({ time: times[i], value: values[i]! }); }
      return data;
    };

    for (const id of activeIndicators) {
      const def = INDICATOR_DEFS.find((d) => d.id === id); if (!def) continue;
      const params = indicatorParams[id] || def.defaultParams;
      try {
        switch (id) {
          case 'sma9': case 'sma21': case 'sma50': case 'sma200': {
            const values = sma(closes, params.period || def.defaultParams.period);
            getOrCreateLineSeries(id, INDICATOR_COLORS[id]).setData(toLineData(values)); break;
          }
          case 'ema9': case 'ema21': case 'ema50': {
            const values = ema(closes, params.period || def.defaultParams.period);
            getOrCreateLineSeries(id, INDICATOR_COLORS[id]).setData(toLineData(values)); break;
          }
          case 'vwap': {
            const values = vwap(highs, lows, closes, volumes);
            getOrCreateLineSeries(id, INDICATOR_COLORS[id]).setData(values.map((v, i) => ({ time: times[i], value: v }))); break;
          }
          case 'bbands': {
            const bb = bollingerBands(closes, params.period || 20, params.stdDev || 2);
            getOrCreateLineSeries('bbands_upper', INDICATOR_COLORS.bbands_upper).setData(toLineData(bb.upper));
            getOrCreateLineSeries('bbands_middle', INDICATOR_COLORS.bbands_middle).setData(toLineData(bb.middle));
            getOrCreateLineSeries('bbands_lower', INDICATOR_COLORS.bbands_lower).setData(toLineData(bb.lower)); break;
          }
          case 'rsi14': {
            const s = getOrCreateLineSeries(id, INDICATOR_COLORS[id], 'rsi');
            s.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
            s.setData(toLineData(rsi(closes, params.period || 14))); break;
          }
          case 'macd': {
            const m = macd(closes, params.fast || 12, params.slow || 26, params.signal || 9);
            const ms = getOrCreateLineSeries('macd_macd', INDICATOR_COLORS.macd_macd, 'macd');
            ms.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
            ms.setData(toLineData(m.macd));
            getOrCreateLineSeries('macd_signal', INDICATOR_COLORS.macd_signal, 'macd').setData(toLineData(m.signal));
            const histData: HistogramData[] = [];
            for (let i = 0; i < m.histogram.length; i++) { if (m.histogram[i] !== null) histData.push({ time: times[i], value: m.histogram[i]!, color: m.histogram[i]! >= 0 ? INDICATOR_COLORS.macd_hist_pos : INDICATOR_COLORS.macd_hist_neg }); }
            getOrCreateHistSeries('macd_hist', 'macd').setData(histData); break;
          }
          case 'atr14': {
            const s = getOrCreateLineSeries(id, INDICATOR_COLORS[id], 'atr');
            s.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
            s.setData(toLineData(atr(highs, lows, closes, params.period || 14))); break;
          }
          case 'stoch': {
            const st = stochastic(highs, lows, closes, params.kPeriod || 14, params.dPeriod || 3);
            const ks = getOrCreateLineSeries('stoch_k', INDICATOR_COLORS.stoch_k, 'stoch');
            ks.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
            ks.setData(toLineData(st.k));
            getOrCreateLineSeries('stoch_d', INDICATOR_COLORS.stoch_d, 'stoch').setData(toLineData(st.d)); break;
          }
          // ─── Extended Indicators ───────────────────
          case 'aroon': {
            const a = aroon(highs, lows, params.period || 25);
            const us = getOrCreateLineSeries('aroon_up', INDICATOR_COLORS.aroon_up, 'aroon');
            us.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
            us.setData(toLineData(a.up));
            getOrCreateLineSeries('aroon_down', INDICATOR_COLORS.aroon_down, 'aroon').setData(toLineData(a.down)); break;
          }
          case 'adx': {
            const a = adx(highs, lows, closes, params.period || 14);
            const as2 = getOrCreateLineSeries('adx_adx', INDICATOR_COLORS.adx_adx, 'adx');
            as2.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
            as2.setData(toLineData(a.adx));
            getOrCreateLineSeries('adx_plus', INDICATOR_COLORS.adx_plus, 'adx').setData(toLineData(a.plusDI));
            getOrCreateLineSeries('adx_minus', INDICATOR_COLORS.adx_minus, 'adx').setData(toLineData(a.minusDI)); break;
          }
          case 'donchian': {
            const dc = donchianChannel(highs, lows, params.period || 20);
            getOrCreateLineSeries('donchian_upper', INDICATOR_COLORS.donchian_upper).setData(toLineData(dc.upper));
            getOrCreateLineSeries('donchian_middle', INDICATOR_COLORS.donchian_middle).setData(toLineData(dc.middle));
            getOrCreateLineSeries('donchian_lower', INDICATOR_COLORS.donchian_lower).setData(toLineData(dc.lower)); break;
          }
          case 'envelope': {
            const env = envelope(closes, params.period || 20, params.percent || 2.5);
            getOrCreateLineSeries('envelope_upper', INDICATOR_COLORS.envelope_upper).setData(toLineData(env.upper));
            getOrCreateLineSeries('envelope_basis', INDICATOR_COLORS.envelope_basis).setData(toLineData(env.basis));
            getOrCreateLineSeries('envelope_lower', INDICATOR_COLORS.envelope_lower).setData(toLineData(env.lower)); break;
          }
          case 'fractals': {
            const f = fractals(highs, lows);
            getOrCreateLineSeries('fractals_up', INDICATOR_COLORS.fractals_up).setData(toLineData(f.up));
            getOrCreateLineSeries('fractals_down', INDICATOR_COLORS.fractals_down).setData(toLineData(f.down)); break;
          }
          case 'ichimoku': {
            const ic = ichimoku(highs, lows, closes, params.conversion || 9, params.base || 26, params.spanB || 52, params.displacement || 26);
            getOrCreateLineSeries('ichimoku_conversion', INDICATOR_COLORS.ichimoku_conversion).setData(toLineData(ic.conversion));
            getOrCreateLineSeries('ichimoku_base', INDICATOR_COLORS.ichimoku_base).setData(toLineData(ic.base));
            getOrCreateLineSeries('ichimoku_spanA', INDICATOR_COLORS.ichimoku_spanA).setData(toLineData(ic.spanA));
            getOrCreateLineSeries('ichimoku_spanB', INDICATOR_COLORS.ichimoku_spanB).setData(toLineData(ic.spanB));
            getOrCreateLineSeries('ichimoku_lagging', INDICATOR_COLORS.ichimoku_lagging).setData(toLineData(ic.lagging)); break;
          }
          case 'momentum': {
            const s = getOrCreateLineSeries('momentum', INDICATOR_COLORS.momentum, 'mom');
            s.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
            s.setData(toLineData(momentum(closes, params.period || 10))); break;
          }
          case 'psar': {
            getOrCreateLineSeries('psar', INDICATOR_COLORS.psar).setData(toLineData(parabolicSAR(highs, lows, params.step || 0.02, params.max || 0.2))); break;
          }
          case 'pivotpoints': {
            const pp = pivotPoints(highs, lows, closes);
            getOrCreateLineSeries('pp_pivot', INDICATOR_COLORS.pp_pivot).setData(toLineData(pp.pivot));
            getOrCreateLineSeries('pp_r1', INDICATOR_COLORS.pp_r1).setData(toLineData(pp.r1));
            getOrCreateLineSeries('pp_r2', INDICATOR_COLORS.pp_r2).setData(toLineData(pp.r2));
            getOrCreateLineSeries('pp_r3', INDICATOR_COLORS.pp_r3).setData(toLineData(pp.r3));
            getOrCreateLineSeries('pp_s1', INDICATOR_COLORS.pp_s1).setData(toLineData(pp.s1));
            getOrCreateLineSeries('pp_s2', INDICATOR_COLORS.pp_s2).setData(toLineData(pp.s2));
            getOrCreateLineSeries('pp_s3', INDICATOR_COLORS.pp_s3).setData(toLineData(pp.s3)); break;
          }
          case 'bullsbears': {
            const bb2 = bullsBearsPower(highs, lows, closes, params.period || 13);
            const bullsHist: HistogramData[] = [];
            const bearsHist: HistogramData[] = [];
            for (let i = 0; i < bb2.bulls.length; i++) {
              if (bb2.bulls[i] !== null) bullsHist.push({ time: times[i], value: bb2.bulls[i]!, color: INDICATOR_COLORS.bullsbears_bulls });
              if (bb2.bears[i] !== null) bearsHist.push({ time: times[i], value: bb2.bears[i]!, color: INDICATOR_COLORS.bullsbears_bears });
            }
            const bs = getOrCreateHistSeries('bullsbears_bulls', 'bbp');
            bs.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
            bs.setData(bullsHist);
            getOrCreateHistSeries('bullsbears_bears', 'bbp').setData(bearsHist); break;
          }
          // ─── GIO custom (ported from .mq5) ─────────
          case 'gio_kalman': {
            getOrCreateLineSeries('gio_kalman_short', INDICATOR_COLORS.gio_kalman_short, 'right', 2).setData(toLineData(kalmanFilter(closes, params.shortLen || 50)));
            getOrCreateLineSeries('gio_kalman_long', INDICATOR_COLORS.gio_kalman_long, 'right', 2).setData(toLineData(kalmanFilter(closes, params.longLen || 150))); break;
          }
          case 'gio_bluebird': {
            getOrCreateLineSeries('gio_bluebird_short', INDICATOR_COLORS.gio_bluebird_short, 'right', 2).setData(toLineData(kalmanFilter(closes, params.shortLen || 30)));
            getOrCreateLineSeries('gio_bluebird_long', INDICATOR_COLORS.gio_bluebird_long, 'right', 2).setData(toLineData(kalmanFilter(closes, params.longLen || 100))); break;
          }
          case 'gio_equalizer': {
            const base = kama(closes, params.period || 10, 2, 30);
            const av = atr(highs, lows, closes, params.atrPeriod || 14);
            const mult = params.bandMult || 1.5;
            const upper = base.map((b, i) => (b !== null && av[i] !== null) ? b + av[i]! * mult : null);
            const lower = base.map((b, i) => (b !== null && av[i] !== null) ? b - av[i]! * mult : null);
            getOrCreateLineSeries('gio_eq_base', INDICATOR_COLORS.gio_eq_base, 'right', 2).setData(toLineData(base));
            getOrCreateLineSeries('gio_eq_upper', INDICATOR_COLORS.gio_eq_upper).setData(toLineData(upper));
            getOrCreateLineSeries('gio_eq_lower', INDICATOR_COLORS.gio_eq_lower).setData(toLineData(lower)); break;
          }
          case 'gio_donchian_ribbon': {
            const dc = donchianChannel(highs, lows, params.period || 20);
            getOrCreateLineSeries('gio_ribbon_upper', INDICATOR_COLORS.gio_ribbon_upper).setData(toLineData(dc.upper));
            getOrCreateLineSeries('gio_ribbon_mid', INDICATOR_COLORS.gio_ribbon_mid, 'right', 2).setData(toLineData(dc.middle));
            getOrCreateLineSeries('gio_ribbon_lower', INDICATOR_COLORS.gio_ribbon_lower).setData(toLineData(dc.lower)); break;
          }
        }
      } catch { /* skip */ }
    }
  }, [activeIndicators, indicatorParams, cleanupIndicatorSeries, getOrCreateLineSeries, getOrCreateHistSeries]);

  // ─── Raptor Script engine (§5) ───────────────────
  // Evaluates the user's script against the real bar series and plots the lines
  // it emits via plot(). Re-runs on every data load so plots stay live. The
  // script is sandboxed to the provided series + indicator helpers (no globals).
  const clearScriptSeries = useCallback(() => {
    const chart = chartRef.current;
    for (const [, s] of scriptSeriesRef.current) { if (chart) { try { chart.removeSeries(s); } catch { /* noop */ } } }
    scriptSeriesRef.current.clear();
  }, []);

  const runUserScript = useCallback((bars: OHLCVBar[]) => {
    const chart = chartRef.current;
    if (!chart) return;
    clearScriptSeries();
    const code = userScriptRef.current;
    if (!code || bars.length === 0) return;
    const close = bars.map((b) => b.close);
    const high = bars.map((b) => b.high);
    const low = bars.map((b) => b.low);
    const openArr = bars.map((b) => b.open);
    const volume = bars.map((b) => b.volume);
    const t = bars.map((b) => b.time as Time);
    const n = bars.length;
    const COLORS = ['#0091D5', '#F5A623', '#7ED321', '#BD10E0', '#50E3C2', '#FF5252'];
    const plots: { series: (number | null)[]; color: string }[] = [];
    const plot = (series: (number | null)[], opts?: { color?: string }) => {
      if (Array.isArray(series)) plots.push({ series, color: opts?.color || COLORS[plots.length % COLORS.length] });
    };
    const highest = (arr: number[], p: number) => arr.map((_, i) => (i < p - 1 ? null : Math.max(...arr.slice(i - p + 1, i + 1))));
    const lowest = (arr: number[], p: number) => arr.map((_, i) => (i < p - 1 ? null : Math.min(...arr.slice(i - p + 1, i + 1))));
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(
        'close', 'high', 'low', 'open', 'volume', 'plot',
        'sma', 'ema', 'rsi', 'macd', 'atr', 'bb', 'kama', 'kalman', 'momentum', 'highest', 'lowest', 'Math',
        `"use strict";\n${code}`,
      );
      fn(close, high, low, openArr, volume, plot, sma, ema, rsi, macd, atr, bollingerBands, kama, kalmanFilter, momentum, highest, lowest, Math);
      plots.forEach((p, pi) => {
        const s = chart.addSeries(LineSeries, { color: p.color, lineWidth: 2, priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false });
        const data: LineData[] = [];
        for (let i = 0; i < n && i < p.series.length; i++) {
          const v = p.series[i];
          if (v != null && isFinite(v)) data.push({ time: t[i], value: v });
        }
        s.setData(data);
        scriptSeriesRef.current.set(`script_${pi}`, s);
      });
      setScriptPlotCount(plots.length);
      window.dispatchEvent(new CustomEvent('raptor-script-result', { detail: { ok: true, plots: plots.length } }));
    } catch (e) {
      clearScriptSeries();
      setScriptPlotCount(0);
      window.dispatchEvent(new CustomEvent('raptor-script-result', { detail: { ok: false, error: e instanceof Error ? e.message : String(e) } }));
    }
  }, [clearScriptSeries]);

  // ─── Load chart data ─────────────────────────────

  const loadChartData = useCallback(() => {
    if (!ohlcvBuilder || !candleSeriesRef.current || !barSeriesRef.current || !lineSeriesRef.current || !areaSeriesRef.current || !baselineSeriesRef.current || !volumeSeriesRef.current) return;
    const resolution = TF_TO_RESOLUTION[selectedTf] as Resolution;
    if (!resolution) return;
    const fetchedBars = ohlcvBuilder.getAllBars(activeSymbol, resolution);
    if (fetchedBars.length === 0) return;
    // Bar Replay (§12): render only up to the replay cursor; else the full history.
    const allBars = replayActive ? fetchedBars.slice(0, Math.min(replayIndex, fetchedBars.length)) : fetchedBars;
    if (allBars.length === 0) return;

    // TV-style chart types (§8): derive the displayed bars from the raw bars.
    // Time-reshaping types (Renko / Line Break / P&F / Range Bars) feed both the
    // candle series AND the indicators/script/volume, so overlays stay aligned
    // with what's on screen. Time-preserving types keep the raw bars.
    let displayBars = allBars;
    if (chartType === 'renko') displayBars = toRenko(allBars);
    else if (chartType === 'linebreak') displayBars = toLineBreak(allBars);
    else if (chartType === 'pnf') displayBars = toPointFigure(allBars);
    else if (chartType === 'rangebar') displayBars = toRangeBars(allBars);

    const candleData: CandlestickData[] = chartType === 'heikinashi'
      ? toHeikinAshi(allBars)
      : displayBars.map((bar) => ({ time: bar.time as Time, open: bar.open, high: bar.high, low: bar.low, close: bar.close }));
    const barData: BarData[] = allBars.map((bar) => ({ time: bar.time as Time, open: bar.open, high: bar.high, low: bar.low, close: bar.close }));
    const lineData: LineData[] = chartType === 'kagi'
      ? toKagi(allBars).map((p) => ({ time: p.time as Time, value: p.value }))
      : allBars.map((bar) => ({ time: bar.time as Time, value: bar.close }));
    const areaData: AreaData[] = allBars.map((bar) => ({ time: bar.time as Time, value: bar.close }));
    const volumeSrc = chartType === 'heikinashi' ? allBars : displayBars;
    const volumeData: HistogramData[] = volumeSrc.map((bar) => ({ time: bar.time as Time, value: bar.volume, color: bar.close >= bar.open ? 'rgba(0,194,122,0.15)' : 'rgba(193,18,31,0.15)' }));

    candleSeriesRef.current.setData(candleData);
    barSeriesRef.current.setData(barData);
    lineSeriesRef.current.setData(lineData);
    areaSeriesRef.current.setData(areaData);
    // Baseline pivots around the first visible close (session-open semantics).
    baselineSeriesRef.current.applyOptions({ baseValue: { type: 'price', price: allBars[0].close } });
    baselineSeriesRef.current.setData(areaData.map((d) => ({ time: d.time, value: d.value })));
    volumeSeriesRef.current.setData(volumeData);

    lastBarTimeRef.current = allBars[allBars.length - 1].time;

    // Price line
    if (priceLineRef.current && candleSeriesRef.current) { try { candleSeriesRef.current.removePriceLine(priceLineRef.current); } catch {} }
    const lastPrice = allBars[allBars.length - 1].close;
    priceLineRef.current = candleSeriesRef.current.createPriceLine({ price: lastPrice, color: '#0091D5', lineWidth: 1 as const, lineStyle: LineStyle.Dotted, lineVisible: true, axisLabelVisible: true, axisLabelColor: '#0091D5', axisLabelTextColor: '#ffffff' });

    // Apply indicators + user script on the same bars the chart displays.
    const src = displayBars;
    const times = src.map((b) => b.time as Time);
    const closes = src.map((b) => b.close);
    const highs = src.map((b) => b.high);
    const lows = src.map((b) => b.low);
    const volumes = src.map((b) => b.volume);
    applyIndicators(times, closes, highs, lows, volumes);
    runUserScript(src);

    chartRef.current?.timeScale().scrollToRealTime();
  }, [activeSymbol, selectedTf, ohlcvBuilder, applyIndicators, runUserScript, chartType, replayActive, replayIndex]);

  useEffect(() => { loadChartData(); }, [loadChartData]);

  // Apply / clear a script pushed from the shared Script editor.
  useEffect(() => {
    const onApply = (e: Event) => {
      const d = (e as CustomEvent<{ code?: string }>).detail;
      userScriptRef.current = d?.code ?? null;
      loadChartData();
    };
    const onClear = () => { userScriptRef.current = null; clearScriptSeries(); setScriptPlotCount(0); };
    window.addEventListener('raptor-apply-script', onApply);
    window.addEventListener('raptor-clear-script', onClear);
    return () => {
      window.removeEventListener('raptor-apply-script', onApply);
      window.removeEventListener('raptor-clear-script', onClear);
    };
  }, [loadChartData, clearScriptSeries]);

  // Live tick updates
  useEffect(() => {
    if (replayActive) return; // frozen while replaying history
    if (!ohlcvBuilder || !candleSeriesRef.current || !barSeriesRef.current || !lineSeriesRef.current || !areaSeriesRef.current || !baselineSeriesRef.current || !volumeSeriesRef.current) return;
    const resolution = TF_TO_RESOLUTION[selectedTf] as Resolution; if (!resolution) return;
    const tick = prices[activeSymbol]; if (!tick) return;
    const currentBar = ohlcvBuilder.getCurrentBar(activeSymbol, resolution); if (!currentBar) return;

    // Transform chart types (Heikin Ashi / Renko / Line Break / Kagi / P&F /
    // Range Bars) derive every bar from the whole series, so an isolated
    // update would drift — recompute from source bars on every tick.
    if (TRANSFORM_CHART_TYPES.has(chartType)) { loadChartData(); if (priceLineRef.current) priceLineRef.current.applyOptions({ price: tick.mid }); return; }

    if (currentBar.time > lastBarTimeRef.current) { loadChartData(); }
    else {
      const t = currentBar.time as Time;
      candleSeriesRef.current.update({ time: t, open: currentBar.open, high: currentBar.high, low: currentBar.low, close: currentBar.close });
      barSeriesRef.current.update({ time: t, open: currentBar.open, high: currentBar.high, low: currentBar.low, close: currentBar.close });
      lineSeriesRef.current.update({ time: t, value: currentBar.close });
      areaSeriesRef.current.update({ time: t, value: currentBar.close });
      baselineSeriesRef.current.update({ time: t, value: currentBar.close });
      volumeSeriesRef.current.update({ time: t, value: currentBar.volume, color: currentBar.close >= currentBar.open ? 'rgba(0,194,122,0.15)' : 'rgba(193,18,31,0.15)' });
    }

    if (priceLineRef.current) priceLineRef.current.applyOptions({ price: tick.mid });
  }, [prices, activeSymbol, selectedTf, ohlcvBuilder, loadChartData, chartType, replayActive]);

  // ─── Display values ──────────────────────────────

  const currentTick = prices[activeSymbol];
  const decimals = getDecimals(activeSymbol);
  const displayOhlc = ohlcValues || (currentTick ? { open: currentTick.mid, high: currentTick.mid, low: currentTick.mid, close: currentTick.mid } : null);
  const canvasActive = CANVAS_DRAWING_TOOLS.includes(activeTool) && !lockDrawings;

  // Render drawing tools sidebar
  const renderToolsWithSeparators = () => {
    const elements: React.ReactNode[] = [];
    let lastGroup = 0;
    drawingTools.forEach((tool) => {
      if (tool.group !== lastGroup && lastGroup !== 0) {
        elements.push(<div key={`sep-${tool.group}`} className="w-full my-1" style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 4, marginRight: 4, width: 'calc(100% - 8px)' }} />);
      }
      lastGroup = tool.group;
      const active = isToolActive(tool);
      elements.push(
        <div key={tool.id} className="relative flex items-center justify-center">
          <button
            onClick={() => handleToolClick(tool)}
            onMouseEnter={() => setHoveredTool(tool.id)}
            onMouseLeave={() => setHoveredTool(null)}
            className="flex items-center justify-center transition-all duration-150"
            style={{ width: 30, height: 30, borderRadius: 4, backgroundColor: active ? 'rgba(41,171,226,0.15)' : 'transparent', color: active ? '#0091D5' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
            onMouseOver={(e) => { if (!active) { e.currentTarget.style.color = 'rgba(255,255,255,1)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; } }}
            onMouseOut={(e) => { if (!active) { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
          >
            {tool.icon}
          </button>
          <ToolTooltip label={tool.label} visible={hoveredTool === tool.id} />
        </div>
      );
    });
    return elements;
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Enhanced Chart Toolbar */}
      <ChartToolbar
        selectedTf={selectedTf}
        onTfChange={changeTf}
        chartType={chartType}
        onChartTypeChange={setChartType}
        oneClickTrading={oneClickTrading}
        onOneClickTradingToggle={() => setOneClickTrading(!oneClickTrading)}
        activeIndicators={activeIndicators}
        onShowIndicators={() => setShowIndicatorPanel(!showIndicatorPanel)}
        onClearAll={handleClearAll}
        activeLayout={activeLayout}
        onLayoutChange={setActiveLayout}
        drawings={drawings}
        onRemoveDrawing={(i) => setDrawings((prev) => prev.filter((_, di) => di !== i))}
        onClearDrawings={() => {
          setDrawings([]);
          for (const pl of customPriceLinesRef.current) { try { candleSeriesRef.current?.removePriceLine(pl); } catch { /* noop */ } }
          customPriceLinesRef.current = [];
        }}
        scriptPlots={scriptPlotCount}
        onClearScriptPlots={() => window.dispatchEvent(new CustomEvent('raptor-clear-script'))}
        onRemoveIndicator={handleIndicatorToggle}
      />

      {/* Symbol & OHLC info bar */}
      <div
        className="flex items-center gap-2 px-3 border-b shrink-0"
        style={{ height: 32, minHeight: 32, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="w-2 h-2 rounded-full mr-1 shrink-0" style={{ backgroundColor: currentTick ? '#00C27A' : '#C1121F', boxShadow: currentTick ? '0 0 6px rgba(0,194,122,0.5)' : '0 0 6px rgba(193,18,31,0.5)' }} />
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mr-1 shrink-0 uppercase tracking-wider" style={{ backgroundColor: isLiveData ? 'rgba(0,194,122,0.15)' : 'rgba(255,152,0,0.15)', color: isLiveData ? '#00C27A' : '#FF9800', border: `1px solid ${isLiveData ? 'rgba(0,194,122,0.3)' : 'rgba(255,152,0,0.3)'}` }}>
          {isLiveData ? 'LIVE' : 'SIM'}
        </span>
        <span className="text-[13px] font-bold mr-1 font-mono shrink-0" style={{ color: '#0091D5' }}>{activeSymbol}</span>
        {displayOhlc && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono"><span className="opacity-30">O</span><span style={{ color: 'var(--text-secondary)' }}>{formatPrice(displayOhlc.open, decimals)}</span></span>
            <span className="text-[11px] font-mono"><span className="opacity-30">H</span><span style={{ color: '#00C27A' }}>{formatPrice(displayOhlc.high, decimals)}</span></span>
            <span className="text-[11px] font-mono"><span className="opacity-30">L</span><span style={{ color: '#C1121F' }}>{formatPrice(displayOhlc.low, decimals)}</span></span>
            <span className="text-[11px] font-mono"><span className="opacity-30">C</span><span style={{ color: 'var(--text-secondary)' }}>{formatPrice(displayOhlc.close, decimals)}</span></span>
          </div>
        )}
      </div>

      {/* Main area: Drawing sidebar + Chart(s) */}
      <div className="flex-1 flex min-h-0">
        {/* Drawing tools sidebar */}
        <div
          className="flex flex-col items-center py-2 gap-0.5 shrink-0 overflow-y-auto"
          style={{ width: 40, backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
        >
          {renderToolsWithSeparators()}
        </div>

        {/* Chart grid area */}
        <div className="flex-1" style={{ display: 'grid', ...LAYOUT_GRIDS[activeLayout], gap: 1, backgroundColor: 'rgba(255,255,255,0.06)' }}>
          {/* Primary chart (always cell 1) */}
          <div
            className="relative"
            style={{ backgroundColor: '#060D16', zIndex: 1 }}
          >
            <div ref={chartContainerRef} className="absolute inset-0" />

            <canvas
              ref={canvasRef}
              className="absolute inset-0"
              style={{ pointerEvents: canvasActive ? 'auto' : 'none', zIndex: 10, cursor: canvasActive ? 'crosshair' : 'default' }}
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
            />

            {showIndicatorPanel && (
              <IndicatorPanel
                activeIndicators={activeIndicators}
                indicatorParams={indicatorParams}
                onToggle={handleIndicatorToggle}
                onUpdateParams={handleIndicatorParamsUpdate}
                onClose={() => setShowIndicatorPanel(false)}
              />
            )}

            {currentTick && (
              <div className="absolute top-2 right-2 z-20 px-3 py-1.5 rounded" style={{ backgroundColor: 'rgba(17,17,24,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 text-[12px] font-mono">
                  <div><span className="opacity-40 mr-1">B</span><span className="text-green-400">{formatPrice(currentTick.bid, decimals)}</span></div>
                  <div><span className="opacity-40 mr-1">A</span><span className="text-red-400">{formatPrice(currentTick.ask, decimals)}</span></div>
                  <div className="opacity-40"><span className="mr-1">S</span><span>{currentTick.spread.toFixed(decimals > 3 ? 1 : decimals)}</span></div>
                </div>
              </div>
            )}

            {!ohlcvBuilder && (
              <div className="absolute inset-0 flex items-center justify-center z-5">
                <div className="text-center opacity-30">
                  <BarChart3 size={48} className="mx-auto mb-3 animate-pulse" />
                  <div className="text-sm font-medium">Initializing chart...</div>
                </div>
              </div>
            )}

            {/* Bar Replay (§12) — toggle pill + transport controls */}
            {ohlcvBuilder && !replayActive && (
              <button
                onClick={enterReplay}
                title="Bar Replay — replay history bar by bar"
                className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:brightness-125"
                style={{ backgroundColor: 'rgba(17,17,24,0.85)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
              >
                <Rewind size={12} /> Replay
              </button>
            )}
            {replayActive && (
              <div
                className="absolute bottom-12 left-1/2 z-40 flex max-w-[94%] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-lg px-3 py-2 shadow-2xl"
                style={{ backgroundColor: 'rgba(10,15,26,0.96)', border: '1px solid rgba(41,171,226,0.35)' }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#0091D5' }}>Replay</span>
                <button onClick={() => replayStep(-1)} title="Step back" className="text-white/70 hover:text-white"><StepBack size={14} /></button>
                <button
                  onClick={() => setReplayPlaying((p) => !p)}
                  title={replayPlaying ? 'Pause' : 'Play'}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-black"
                  style={{ backgroundColor: '#0091D5' }}
                >
                  {replayPlaying ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button onClick={() => replayStep(1)} title="Step forward" className="text-white/70 hover:text-white"><StepForward size={14} /></button>
                <input
                  type="range"
                  min={10}
                  max={replayTotalRef.current || 100}
                  value={replayIndex}
                  onChange={(e) => { setReplayPlaying(false); setReplayIndex(parseInt(e.target.value, 10)); }}
                  className="w-40 accent-[#0091D5]"
                />
                <span className="font-mono text-[10px] text-white/50">{replayIndex}/{replayTotalRef.current}</span>
                {/* §11 practice trading — judged on exit against the real bars */}
                <div className="ml-1 flex items-center gap-1 border-l pl-2" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                  <button onClick={() => markReplayTrade('BUY')} title="Practice BUY at this bar's close"
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: 'rgba(0,194,122,0.18)', color: '#00C27A', border: '1px solid rgba(0,194,122,0.35)' }}>
                    BUY
                  </button>
                  <button onClick={() => markReplayTrade('SELL')} title="Practice SELL at this bar's close"
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: 'rgba(255,82,82,0.18)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.35)' }}>
                    SELL
                  </button>
                  <button onClick={() => markReplayTrade('CLOSE')} title="Close the open practice trade"
                    disabled={!replayTrades.some((t) => t.exitIdx == null)}
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white/60 disabled:opacity-25" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                    CLOSE
                  </button>
                  <span className="font-mono text-[9px] text-white/40" title="Practice trades marked (graded when you exit replay)">
                    {replayTrades.length}{replayTrades.some((t) => t.exitIdx == null) ? '·open' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[0.5, 1, 2, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setReplaySpeed(s)}
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors"
                      style={{ backgroundColor: replaySpeed === s ? 'rgba(41,171,226,0.2)' : 'transparent', color: replaySpeed === s ? '#0091D5' : 'rgba(255,255,255,0.45)' }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <button onClick={exitReplay} title="Exit replay — graded scorecard appears if you marked trades" className="ml-1 text-white/50 hover:text-red-400"><X size={14} /></button>
              </div>
            )}

            {/* §11 replay scorecard — rule-based, computed from real bars */}
            {replayReport && (
              <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onMouseDown={() => setReplayReport(null)}>
                <div className="max-h-[85%] w-[520px] max-w-[94%] overflow-y-auto rounded-xl border p-4 shadow-2xl"
                  style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.12)' }} onMouseDown={(e) => e.stopPropagation()}>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-bold text-white">Replay scorecard</div>
                      <div className="text-[9px] text-white/40">Rule-based — measured from your marked trades vs the actual bars. Not an opinion.</div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full text-[20px] font-black"
                      style={{
                        color: ['A', 'B'].includes(replayReport.grade) ? '#00C27A' : replayReport.grade === 'C' ? '#FFD700' : '#FF5252',
                        border: `2px solid ${['A', 'B'].includes(replayReport.grade) ? 'rgba(0,194,122,0.5)' : replayReport.grade === 'C' ? 'rgba(255,215,0,0.5)' : 'rgba(255,82,82,0.5)'}`,
                      }}>
                      {replayReport.grade}
                    </div>
                  </div>
                  <div className="mb-3 grid grid-cols-4 gap-2 text-center">
                    {([
                      ['Trades', String(replayReport.trades.length)],
                      ['Win rate', `${replayReport.winRate.toFixed(0)}%`],
                      ['Total P&L', `${replayReport.totalPnlPct >= 0 ? '+' : ''}${replayReport.totalPnlPct.toFixed(2)}%`],
                      ['Move captured', replayReport.avgCapture != null ? `${(replayReport.avgCapture * 100).toFixed(0)}%` : '—'],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="rounded-md border px-1 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                        <div className="text-[8px] uppercase tracking-wide text-white/35">{k}</div>
                        <div className="font-mono text-[12px] font-bold text-white/85">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3">
                    {replayReport.trades.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 border-t border-white/[0.05] py-1 font-mono text-[10px]">
                        <span className="w-9" style={{ color: t.dir === 'BUY' ? '#00C27A' : '#FF5252' }}>{t.dir}</span>
                        <span className="w-28 text-white/45">{t.entryPrice} → {t.exitPrice}</span>
                        <span className="w-14 text-white/40">{t.barsHeld} bar{t.barsHeld === 1 ? '' : 's'}</span>
                        <span className="w-16 text-right font-bold" style={{ color: t.pnlPct > 0 ? '#00C27A' : t.pnlPct < 0 ? '#FF5252' : 'rgba(255,255,255,0.5)' }}>
                          {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%
                        </span>
                        <span className="flex-1 text-right text-[9px] text-white/35" title="Max favorable / adverse excursion while held">
                          MFE +{t.mfePct.toFixed(2)}% · MAE {t.maePct.toFixed(2)}%{t.autoClosed ? ' · auto-closed' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3 space-y-1">
                    {replayReport.observations.map((o, i) => (
                      <div key={i} className="text-[10px] leading-snug text-white/55">• {o}</div>
                    ))}
                  </div>
                  <div className="mb-3 text-[8.5px] leading-snug text-white/30">
                    Grade rule: profitable &amp; ≥60% wins = A · profitable = B · flat = C · losing = D · losing &amp; &lt;30% wins = F.
                    Practice trades never touch your account. Small samples prove little — repeat on different periods.
                  </div>
                  <button onClick={() => setReplayReport(null)} className="w-full rounded py-1.5 text-[11px] font-bold text-black" style={{ backgroundColor: '#0091D5' }}>
                    Back to live chart
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Secondary chart panes for multiscreen layouts */}
          {LAYOUT_EXTRA_PANES[activeLayout]?.map((symbol, idx) => (
            <MiniChartPane key={`${activeLayout}-${idx}`} symbol={symbol} />
          ))}
        </div>
      </div>
    </div>
  );
}
