'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock, CandlestickChart, BarChart3, TrendingUp, AreaChart,
  Activity, Pencil, LayoutGrid, Trash2, ChevronDown, HelpCircle, Bot,
  MousePointer2, ArrowUpRight, Circle, GitCommitHorizontal,
  Flag, LineChart, Square, Ruler, Minus, Move,
  Columns2, Rows2, Columns3, Rows3, Grid2x2, LayoutPanelLeft, Grid3x3,
  GripVertical, Star, Zap, Layers,
} from 'lucide-react';
import { INDICATOR_DEFS, type IndicatorId } from './IndicatorPanel';
import { useEALibrary } from './useEALibrary';
import CustomEAInfoModal from './CustomEAInfoModal';
import type { CustomEA } from '@/lib/trading/custom-ea';
import { builtinInputsFor } from '@/lib/trading/ea-params';

// ─── Types ───────────────────────────────────────────────────────

export type ChartType =
  | 'candlestick' | 'hollow' | 'bar' | 'line' | 'area' | 'baseline'
  | 'heikinashi' | 'renko' | 'linebreak' | 'kagi' | 'pnf' | 'rangebar';
export type LayoutType = 'single' | 'split' | 'vsplit' | 'h3' | 'v3' | 'quarters' | 'onefive' | 'table3x2';

const TIMEFRAMES = [
  { label: '5 Seconds', value: '5s' }, { label: '10 Seconds', value: '10s' },
  { label: '15 Seconds', value: '15s' }, { label: '30 Seconds', value: '30s' },
  { label: '1 Minute', value: '1m' }, { label: '2 Minutes', value: '2m' },
  { label: '3 Minutes', value: '3m' }, { label: '5 Minutes', value: '5m' },
  { label: '10 Minutes', value: '10m' }, { label: '15 Minutes', value: '15m' },
  { label: '20 Minutes', value: '20m' }, { label: '30 Minutes', value: '30m' },
  { label: '45 Minutes', value: '45m' },
  { label: '1 Hour', value: '1H' }, { label: '2 Hours', value: '2H' },
  { label: '3 Hours', value: '3H' }, { label: '4 Hours', value: '4H' },
  { label: '6 Hours', value: '6H' }, { label: '8 Hours', value: '8H' },
  { label: '12 Hours', value: '12H' },
  { label: '1 Day', value: '1D' }, { label: '1 Week', value: '1W' },
  { label: '1 Month', value: '1Mo' },
];

const CHART_TYPES: { label: string; value: ChartType; icon: React.ReactNode }[] = [
  { label: 'Bars', value: 'bar', icon: <BarChart3 size={16} /> },
  { label: 'Candles', value: 'candlestick', icon: <CandlestickChart size={16} /> },
  { label: 'Hollow Candles', value: 'hollow', icon: <CandlestickChart size={16} /> },
  { label: 'Heikin Ashi', value: 'heikinashi', icon: <CandlestickChart size={16} /> },
  { label: 'Line', value: 'line', icon: <TrendingUp size={16} /> },
  { label: 'Area', value: 'area', icon: <AreaChart size={16} /> },
  { label: 'Baseline', value: 'baseline', icon: <AreaChart size={16} /> },
  { label: 'Renko', value: 'renko', icon: <Grid2x2 size={16} /> },
  { label: 'Line Break', value: 'linebreak', icon: <BarChart3 size={16} /> },
  { label: 'Kagi', value: 'kagi', icon: <Activity size={16} /> },
  { label: 'Point & Figure', value: 'pnf', icon: <Grid3x3 size={16} /> },
  { label: 'Range Bars', value: 'rangebar', icon: <BarChart3 size={16} /> },
];

const DRAWING_TOOLS = [
  { label: 'ABCD Pattern', icon: <GitCommitHorizontal size={16} /> },
  { label: 'Arrow', icon: <ArrowUpRight size={16} /> },
  { label: 'Circle', icon: <Circle size={16} /> },
  { label: 'Fibonacci Arcs', icon: <Activity size={16} /> },
  { label: 'Fibonacci Retracement', icon: <GitCommitHorizontal size={16} /> },
  { label: 'Flag', icon: <Flag size={16} /> },
  { label: 'Forecast', icon: <LineChart size={16} /> },
  { label: 'Gann Box', icon: <Square size={16} /> },
  { label: 'Gann Fan', icon: <Move size={16} /> },
  { label: 'Head And Shoulders', icon: <Activity size={16} /> },
  { label: 'Horizontal Line', icon: <Minus size={16} /> },
  { label: 'Line', icon: <TrendingUp size={16} /> },
  { label: 'Long Position', icon: <TrendingUp size={16} /> },
  { label: 'Parallel Channel', icon: <Columns2 size={16} /> },
  { label: 'Short Position', icon: <TrendingUp size={16} style={{ transform: 'scaleY(-1)' }} /> },
  { label: 'Rectangle', icon: <Square size={16} /> },
  { label: 'Ruler / Measure', icon: <Ruler size={16} /> },
  { label: 'Text', icon: <MousePointer2 size={16} /> },
  { label: 'Trend Line', icon: <TrendingUp size={16} /> },
];

const LAYOUTS: { label: string; value: LayoutType; icon: React.ReactNode }[] = [
  { label: 'Single', value: 'single', icon: <Square size={16} /> },
  { label: 'Split', value: 'split', icon: <Columns2 size={16} /> },
  { label: 'Vertical Split', value: 'vsplit', icon: <Rows2 size={16} /> },
  { label: 'Horizontal x3', value: 'h3', icon: <Rows3 size={16} /> },
  { label: 'Vertical x3', value: 'v3', icon: <Columns3 size={16} /> },
  { label: 'Quarters', value: 'quarters', icon: <Grid2x2 size={16} /> },
  { label: 'One+Five', value: 'onefive', icon: <LayoutPanelLeft size={16} /> },
  { label: 'Table 3x2', value: 'table3x2', icon: <Grid3x3 size={16} /> },
];

// ─── EA / Robot definitions ───────────────────────────────────────

export interface EAConfig {
  id: string; name: string; description: string;
  pairs: string[]; timeframes: string[];
  type: 'scalper' | 'trend' | 'reversal' | 'hybrid' | 'grid' | 'hedge' | 'martingale';
  rating: number; status: string;
  custom?: boolean;
  strategyKind?: string;
}

// Real EA library imported from the owner's MQL5 collection
// ("EA BACK UP JULY 2026"). Descriptions come from each EA's source header.
// The id doubles as ea_instances.strategy_id when attached to a chart.
export const EA_LIBRARY: EAConfig[] = [
  { id: '1da5f188-c659-4843-b91d-4fdc003002dc', name: 'Bad Boy v3.0', description: 'Confirmed trend-reversal engine: flip-trades only on major reversals, signal-synced with the BadBoy indicator.', pairs: ['EURUSD','GBPUSD','XAUUSD'], timeframes: ['15m','1H'], type: 'reversal', rating: 4.7, status: 'available' },
  { id: '24fa1777-47b0-48bd-af9a-2044d1010a70', name: 'BLUEBIRD', description: 'Kalman Trend Levels EA: rides adaptive Kalman trend bands with dynamic risk management.', pairs: ['EURUSD','GBPUSD','XAUUSD'], timeframes: ['1H','4H'], type: 'trend', rating: 4.5, status: 'available' },
  { id: 'f689e46f-b6b2-4be8-9ed8-978ef2147d4e', name: 'BOLCD v1.0', description: 'Bollinger Bands + MACD confluence: buys lower-band MACD cross-ups, sells upper-band cross-downs. Middle-band TP, ATR trailing, partial close.', pairs: ['EURUSD','GBPUSD','USDJPY'], timeframes: ['15m','1H'], type: 'reversal', rating: 4.6, status: 'available' },
  { id: 'c11d80f8-c68a-42fc-8ada-04055df910a4', name: 'EMA Pullback', description: '9/21 EMA pullback system: buys uptrend pullbacks into the EMA zone with swing-based stops and risk-based sizing.', pairs: ['EURUSD','GBPUSD','AUDUSD'], timeframes: ['15m','1H'], type: 'trend', rating: 4.8, status: 'available' },
  { id: 'b042aa5e-3cec-44c3-914d-ccae0bc4740c', name: 'Fibonacci Bands', description: 'Fibonacci Bands (BigBeluga) strategy converted from Pine Script; band-touch entries with trend filtering.', pairs: ['EURUSD','XAUUSD'], timeframes: ['1H','4H'], type: 'trend', rating: 4.2, status: 'available' },
  { id: '7a5eb3b5-ff39-4559-a057-050386a820f0', name: 'Gentleman', description: 'Automated trend-reversal system with range-market avoidance, driven by the Gentleman indicator.', pairs: ['EURUSD','GBPUSD','USDJPY'], timeframes: ['1H'], type: 'reversal', rating: 4.6, status: 'available' },
  { id: '3fcc4545-7c16-497b-bed1-f6afc0d18f37', name: 'GIOLINEREG V1', description: 'LinReg Candles EA with SL-multiplier recovery: 5-entry recovery ladder with auto reset and on-chart panel.', pairs: ['EURUSD','GBPUSD'], timeframes: ['15m','1H'], type: 'martingale', rating: 4.3, status: 'available' },
  { id: '2d99660e-4168-4457-bc2d-5f121bd02a62', name: 'Gulliver', description: 'Trades the Gulliver trend indicator via iCustom with adaptive risk sizing.', pairs: ['EURUSD','GBPUSD','USDJPY'], timeframes: ['1H','4H'], type: 'trend', rating: 4.4, status: 'available' },
  { id: 'bf858c10-157f-40f1-915a-ceb23d6d162e', name: 'Ichimokuthadi', description: 'Advanced Ichimoku Cloud engine: auto-adaptive across all timeframes, majors and gold.', pairs: ['EURUSD','GBPUSD','XAUUSD'], timeframes: ['15m','1H','4H'], type: 'trend', rating: 4.5, status: 'available' },
  { id: '88bbb135-579c-418c-8795-23f6970b306b', name: 'Karakattakaran', description: 'Advanced Kalman trend engine: auto-adaptive across all timeframes, all pairs and gold.', pairs: ['EURUSD','GBPUSD','XAUUSD'], timeframes: ['15m','1H','4H'], type: 'trend', rating: 4.6, status: 'available' },
  { id: '1a2a7591-b872-489e-afe9-ecae05f676d9', name: 'Kondacheval v1.1', description: 'Professional trend-pullback EA (EMA-zone entries) with martingale lot recovery on SL and reset on TP.', pairs: ['EURUSD','GBPUSD'], timeframes: ['15m','1H'], type: 'martingale', rating: 4.4, status: 'available' },
  { id: 'a1cc822a-87d9-4c24-9735-8311402b3601', name: 'Linegration V-02', description: 'LinReg candle-colour engine: green flips long, red flips short, with opposite-signal exits.', pairs: ['EURUSD'], timeframes: ['15m','1H'], type: 'trend', rating: 4.1, status: 'available' },
  { id: 'c6dd62fa-6d15-4d8e-b577-f93642e75b0a', name: 'Linegration V-01', description: 'LinReg Candles + signal-line crossover entries, converted from TradingView Pine Script.', pairs: ['EURUSD'], timeframes: ['15m','1H'], type: 'trend', rating: 4.0, status: 'available' },
  { id: '05b87485-7f6f-46f4-b522-8f51fc90f704', name: 'LNL GIO', description: 'Trades L&L Trend System stop-line flips.', pairs: ['EURUSD','GBPUSD'], timeframes: ['1H','4H'], type: 'trend', rating: 4.2, status: 'available' },
  { id: 'fd4b518d-c248-4889-92a5-c50394556571', name: 'Naughty Girl v1.1', description: 'SAR scalping expert: SAR flip + EMA trend + RSI filter, SAR-based trailing stop and partial close.', pairs: ['EURUSD','GBPUSD'], timeframes: ['1m','5m'], type: 'scalper', rating: 4.5, status: 'available' },
  { id: 'be1030dc-47fa-4b9a-a176-8368ff8332f5', name: 'Padayappa', description: 'Kalman Trend Levels EA built on the BigBeluga concept: adaptive trend-level entries.', pairs: ['EURUSD','XAUUSD'], timeframes: ['1H'], type: 'trend', rating: 4.3, status: 'available' },
  { id: '8717afe9-36dd-4ada-824d-07f2fed0c9eb', name: 'Paruthiveeran', description: 'Trend-reversal engine combining LinReg candles, Kalman filter and ADX; auto-detects scalp, day-trade or positional mode.', pairs: ['EURUSD','GBPUSD','XAUUSD'], timeframes: ['5m','1H','4H'], type: 'hybrid', rating: 4.7, status: 'available' },
  { id: '6fb4b3e9-20e4-45cd-b3e8-911d01036a14', name: 'Pattern GIO', description: 'Trades 16 classical chart-pattern signals: head & shoulders, wedges, triangles, double tops and more.', pairs: ['EURUSD','GBPUSD','USDJPY'], timeframes: ['1H','4H'], type: 'hybrid', rating: 4.4, status: 'available' },
  { id: 'd85d1178-de66-4ed4-8349-39a98c5edc7d', name: 'Profit Predator v1.0', description: '5-engine adaptive EA: auto-scalps M1-M5, swing-trades M15-M30, day-trades H1 and above.', pairs: ['EURUSD','GBPUSD','XAUUSD'], timeframes: ['1m','15m','1H'], type: 'hybrid', rating: 4.8, status: 'available' },
  { id: '8cd15b06-2e6c-4e40-bbe8-1c33e7471bbf', name: 'Pro Hybrid Trend Reversal', description: 'Hybrid trend-reversal system combining multiple confirmation engines.', pairs: ['EURUSD','GBPUSD'], timeframes: ['1H'], type: 'reversal', rating: 4.2, status: 'available' },
  { id: '5792de3d-317f-4fb3-a6f0-b69f7b47be71', name: 'SAR VI v1.1', description: 'Parabolic SAR trend + Vortex indicator cross confirmation (777 Capital Markets build).', pairs: ['EURUSD','GBPUSD','USDJPY'], timeframes: ['15m','1H'], type: 'trend', rating: 4.4, status: 'available' },
  { id: '2c83500d-ffa7-4a28-9f0e-deaa07fcd347', name: 'SSL Hybrid', description: 'Automated NNFX SSL Hybrid system, ported from Mihkel00 Pine Script.', pairs: ['EURUSD','GBPUSD','AUDUSD'], timeframes: ['1H','4H'], type: 'trend', rating: 4.5, status: 'available' },
  { id: 'bbaec02d-b5e9-45c0-a44a-e91433a120d9', name: 'SuperIchi Annamalai', description: 'SuperIchi candle-colour + cloud-filter trading engine (Annamalai build).', pairs: ['EURUSD','XAUUSD'], timeframes: ['1H'], type: 'trend', rating: 4.3, status: 'available' },
  { id: '7e6cedd9-6e9f-4a33-b2b6-838c647edff2', name: 'SuperIchi', description: 'Trading engine built on the LuxAlgo SuperIchi indicator logic.', pairs: ['EURUSD','XAUUSD'], timeframes: ['1H','4H'], type: 'trend', rating: 4.3, status: 'available' },
  { id: '8be4d74d-e25d-4a9e-b596-66c7d226cb3a', name: 'Walter Vetrivel', description: 'Day & positional trend EA: LinReg + Kalman + EMA200 bias + ADX + session time filter.', pairs: ['EURUSD','GBPUSD'], timeframes: ['1H','1D'], type: 'hybrid', rating: 4.6, status: 'available' },
];

const EA_TYPE_COLORS: Record<string, string> = {
  scalper: '#FF9800', trend: '#00C27A', reversal: '#E040FB', hybrid: '#FFD700', grid: '#0091D5', hedge: '#AB47BC', martingale: '#FF5252',
};

// ─── Portal Dropdown ──────────────────────────────────────────────
// Renders at document.body level so nothing can cover it

function PortalDropdown({
  anchorRef,
  open,
  onClose,
  width,
  maxHeight,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  width: number;
  maxHeight?: number;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    // Delay listener to avoid closing on the same click that opened it
    const timer = setTimeout(() => document.addEventListener('mousedown', handle), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handle); };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width,
        maxHeight: maxHeight || 480,
        overflowY: 'auto',
        backgroundColor: '#111118',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
        zIndex: 99999,
        scrollbarWidth: 'thin' as const,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

// ─── Toolbar Props ────────────────────────────────────────────────

interface ChartToolbarProps {
  selectedTf: string;
  onTfChange: (tf: string) => void;
  chartType: ChartType;
  onChartTypeChange: (ct: ChartType) => void;
  oneClickTrading: boolean;
  onOneClickTradingToggle: () => void;
  activeIndicators: Set<IndicatorId>;
  onShowIndicators: () => void;
  onClearAll: () => void;
  activeLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  // Object Tree (§7)
  drawings: { type: string }[];
  onRemoveDrawing: (index: number) => void;
  onClearDrawings: () => void;
  scriptPlots: number;
  onClearScriptPlots: () => void;
  onRemoveIndicator: (id: IndicatorId) => void;
}

const TF_FAV_KEY = 'raptor_fav_timeframes';

export default function ChartToolbar({
  selectedTf, onTfChange, chartType, onChartTypeChange,
  oneClickTrading, onOneClickTradingToggle,
  activeIndicators, onShowIndicators, onClearAll,
  activeLayout, onLayoutChange,
  drawings, onRemoveDrawing, onClearDrawings,
  scriptPlots, onClearScriptPlots, onRemoveIndicator,
}: ChartToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Favorite timeframes (§2/§11) — starred TFs float to the top of the
  // timeframe dropdown; persisted in localStorage.
  const [favTfs, setFavTfs] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { const a = JSON.parse(localStorage.getItem(TF_FAV_KEY) || '[]'); return new Set(Array.isArray(a) ? a : []); }
    catch { return new Set(); }
  });
  const toggleFavTf = useCallback((v: string) => {
    setFavTfs((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      try { localStorage.setItem(TF_FAV_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const tfRef = useRef<HTMLButtonElement>(null);
  const ctRef = useRef<HTMLButtonElement>(null);
  const toolsRef = useRef<HTMLButtonElement>(null);
  const layoutRef = useRef<HTMLButtonElement>(null);
  const eaRef = useRef<HTMLButtonElement>(null);
  const objectsRef = useRef<HTMLButtonElement>(null);
  // Custom-EA info panel (§16)
  const [infoEa, setInfoEa] = useState<CustomEA | null>(null);

  const toggle = useCallback((id: string) => setOpenDropdown((p) => p === id ? null : id), []);
  const close = useCallback(() => setOpenDropdown(null), []);

  // Merged EA library (built-in + uploaded custom) and the upload flow.
  const { all: eaList, fileInputRef, handleFile, remove: removeCustom } = useEALibrary();
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const onUploadClick = useCallback(() => fileInputRef.current?.click(), [fileInputRef]);
  const onFileChosen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-uploading the same file
    if (!file) return;
    const res = await handleFile(file);
    setUploadMsg(res.ok
      ? { ok: true, text: `"${res.name}" converted and added — drag it onto the chart.` }
      : { ok: false, text: res.error ?? 'Upload failed.' });
    setTimeout(() => setUploadMsg(null), 5000);
  }, [handleFile]);

  const tfDef = TIMEFRAMES.find((t) => t.value === selectedTf) || TIMEFRAMES[4];
  const ctDef = CHART_TYPES.find((c) => c.value === chartType) || CHART_TYPES[1];
  const btn = 'flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-all shrink-0 cursor-pointer';

  return (
    <div
      className="flex items-center gap-1.5 px-3 border-b shrink-0 overflow-x-auto"
      style={{ height: 44, minHeight: 44, backgroundColor: '#0D1117', borderColor: 'rgba(255,255,255,0.06)', scrollbarWidth: 'none' }}
    >
      {/* 1-Click Trading */}
      <div className="flex items-center gap-2 mr-2 shrink-0">
        <button
          onClick={onOneClickTradingToggle}
          className="relative rounded-full transition-colors"
          style={{ width: 36, height: 18, backgroundColor: oneClickTrading ? '#0091D5' : 'rgba(255,255,255,0.12)' }}
        >
          <div className="absolute top-[2px] rounded-full transition-all bg-white" style={{ width: 14, height: 14, left: oneClickTrading ? 20 : 2 }} />
        </button>
        <span className="text-[11px] font-semibold text-white whitespace-nowrap">1-Click Trading</span>
        <HelpCircle size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>

      <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

      {/* ── Timeframe ── */}
      <button ref={tfRef} onClick={() => toggle('tf')} className={`${btn} bg-[#0091D5] text-white`}>
        <Clock size={14} /> {tfDef.label} <ChevronDown size={12} />
      </button>
      <PortalDropdown anchorRef={tfRef} open={openDropdown === 'tf'} onClose={close} width={210}>
        <div className="py-1">
          {(() => { const favList = TIMEFRAMES.filter((t) => favTfs.has(t.value)); return [...favList, ...TIMEFRAMES].map((tf, i) => {
            const isFavRow = i < favList.length;
            return (
            <div key={`${isFavRow ? 'fav-' : ''}${tf.value}`} className="flex items-center transition-colors hover:bg-[rgba(255,255,255,0.06)]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', backgroundColor: isFavRow ? 'rgba(255,215,0,0.03)' : 'transparent' }}>
              <button onClick={() => { onTfChange(tf.value); close(); }}
                className="flex flex-1 items-center gap-3 px-3 py-2.5 text-[12px]"
                style={{ color: selectedTf === tf.value ? '#0091D5' : 'rgba(255,255,255,0.7)', fontWeight: selectedTf === tf.value ? 600 : 400 }}
              >
                <Clock size={14} style={{ opacity: 0.5 }} /> {tf.label}
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleFavTf(tf.value); }}
                title={favTfs.has(tf.value) ? 'Remove from favorites' : 'Add to favorites'}
                className="px-2 py-2.5"
                style={{ color: favTfs.has(tf.value) ? '#FFD700' : 'rgba(255,255,255,0.2)' }}
              >
                <Star size={12} fill={favTfs.has(tf.value) ? '#FFD700' : 'none'} />
              </button>
            </div>
            );
          }); })()}
        </div>
      </PortalDropdown>

      {/* ── Chart Type ── */}
      <button ref={ctRef} onClick={() => toggle('ct')} className={`${btn} bg-[rgba(255,255,255,0.06)] text-white`}>
        {ctDef.icon} {ctDef.label} <ChevronDown size={12} />
      </button>
      <PortalDropdown anchorRef={ctRef} open={openDropdown === 'ct'} onClose={close} width={180}>
        <div className="py-1">
          {CHART_TYPES.map((ct) => (
            <button key={ct.value} onClick={() => { onChartTypeChange(ct.value); close(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] transition-colors hover:bg-[rgba(255,255,255,0.06)]"
              style={{ color: chartType === ct.value ? '#0091D5' : 'rgba(255,255,255,0.7)', fontWeight: chartType === ct.value ? 600 : 400, borderBottom: '1px solid rgba(255,255,255,0.03)' }}
            >
              {ct.icon} {ct.label}
            </button>
          ))}
        </div>
      </PortalDropdown>

      <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

      {/* ── Indicators ── */}
      <button onClick={() => { onShowIndicators(); close(); }}
        className={`${btn} ${activeIndicators.size > 0 ? 'bg-[#0091D5] text-white' : 'text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'}`}
      >
        <Activity size={14} /> Indicators
        {activeIndicators.size > 0 && <span className="text-[9px] bg-white/20 px-1 rounded">{activeIndicators.size}</span>}
      </button>

      {/* ── Tools ── */}
      <button ref={toolsRef} onClick={() => toggle('tools')} className={`${btn} text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]`}>
        <Pencil size={14} /> Tools <ChevronDown size={12} />
      </button>
      <PortalDropdown anchorRef={toolsRef} open={openDropdown === 'tools'} onClose={close} width={240} maxHeight={420}>
        <div className="py-1">
          {DRAWING_TOOLS.map((tool) => (
            <button key={tool.label} onClick={() => { window.dispatchEvent(new CustomEvent('raptor-drawing-tool', { detail: tool.label })); close(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] text-[rgba(255,255,255,0.7)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
            >
              <span style={{ color: '#0091D5' }}>{tool.icon}</span> {tool.label}
            </button>
          ))}
        </div>
      </PortalDropdown>

      {/* ── Objects (Object Tree §7) ── */}
      <button ref={objectsRef} onClick={() => toggle('objects')} className={`${btn} text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]`}>
        <Layers size={14} /> Objects
        {(activeIndicators.size + drawings.length + (scriptPlots > 0 ? 1 : 0)) > 0 && (
          <span className="text-[9px] bg-white/20 px-1 rounded">{activeIndicators.size + drawings.length + (scriptPlots > 0 ? 1 : 0)}</span>
        )}
        <ChevronDown size={12} />
      </button>
      <PortalDropdown anchorRef={objectsRef} open={openDropdown === 'objects'} onClose={close} width={280} maxHeight={440}>
        <div className="py-1">
          {/* Indicators */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span>Indicators ({activeIndicators.size})</span>
          </div>
          {activeIndicators.size === 0 && (
            <div className="px-3 pb-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>None active</div>
          )}
          {[...activeIndicators].map((id) => {
            const def = INDICATOR_DEFS.find((d) => d.id === id);
            return (
              <div key={id} className="flex items-center justify-between px-3 py-1.5 hover:bg-[rgba(255,255,255,0.04)]">
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.75)' }}>{def?.name ?? id}</span>
                <button onClick={() => onRemoveIndicator(id)} title="Remove indicator" className="text-white/30 hover:text-red-400"><Trash2 size={12} /></button>
              </div>
            );
          })}
          {/* Drawings */}
          <div className="mt-1 flex items-center justify-between border-t px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <span>Drawings ({drawings.length})</span>
            {drawings.length > 0 && (
              <button onClick={onClearDrawings} className="text-[9px] normal-case text-red-400/70 hover:text-red-400">Clear all</button>
            )}
          </div>
          {drawings.length === 0 && (
            <div className="px-3 pb-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>None drawn</div>
          )}
          {drawings.map((d, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 hover:bg-[rgba(255,255,255,0.04)]">
              <span className="text-[11px] capitalize" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {d.type === 'longpos' ? 'Long Position' : d.type === 'shortpos' ? 'Short Position' : d.type === 'channel' ? 'Parallel Channel' : d.type} #{i + 1}
              </span>
              <button onClick={() => onRemoveDrawing(i)} title="Remove drawing" className="text-white/30 hover:text-red-400"><Trash2 size={12} /></button>
            </div>
          ))}
          {/* Raptor Script plots */}
          <div className="mt-1 flex items-center justify-between border-t px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <span>Script plots ({scriptPlots})</span>
            {scriptPlots > 0 && (
              <button onClick={onClearScriptPlots} className="text-[9px] normal-case text-red-400/70 hover:text-red-400">Clear plots</button>
            )}
          </div>
          {scriptPlots === 0 && (
            <div className="px-3 pb-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>No script running</div>
          )}
        </div>
      </PortalDropdown>

      {/* ── Multiscreen ── */}
      <button ref={layoutRef} onClick={() => toggle('layout')} className={`${btn} text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]`}>
        <LayoutGrid size={14} /> Multiscreen <ChevronDown size={12} />
      </button>
      <PortalDropdown anchorRef={layoutRef} open={openDropdown === 'layout'} onClose={close} width={210}>
        <div className="py-1">
          {LAYOUTS.map((l) => (
            <button key={l.value} onClick={() => { onLayoutChange(l.value); close(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] transition-colors hover:bg-[rgba(255,255,255,0.06)]"
              style={{ color: activeLayout === l.value ? '#0091D5' : 'rgba(255,255,255,0.7)', fontWeight: activeLayout === l.value ? 600 : 400, borderBottom: '1px solid rgba(255,255,255,0.03)' }}
            >
              <span style={{ color: '#0091D5' }}>{l.icon}</span> {l.label}
            </button>
          ))}
        </div>
      </PortalDropdown>

      {/* ── EAs / Robots ── */}
      <button ref={eaRef} onClick={() => toggle('ea')} className={`${btn} text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]`}>
        <Bot size={14} /> EAs / Robots <ChevronDown size={12} />
      </button>
      <PortalDropdown anchorRef={eaRef} open={openDropdown === 'ea'} onClose={close} width={360} maxHeight={500}>
        <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[12px] font-semibold text-white">Expert Advisors</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,145,213,0.15)', color: '#0091D5' }}>{eaList.length} available</span>
        </div>
        <div className="text-[9px] px-3 py-1.5" style={{ color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          Drag and drop an EA onto the chart to activate it
        </div>
        <div className="py-1">
          {eaList.map((ea) => (
            <div key={ea.id} draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', JSON.stringify(ea)); e.dataTransfer.effectAllowed = 'copy'; }}
              className="px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-start gap-2">
                <GripVertical size={14} style={{ color: 'rgba(255,255,255,0.15)', marginTop: 2 }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold text-white truncate">{ea.name}</span>
                    <span className="text-[8px] px-1 py-0.5 rounded uppercase font-bold shrink-0" style={{ backgroundColor: `${EA_TYPE_COLORS[ea.type]}20`, color: EA_TYPE_COLORS[ea.type] }}>{ea.type}</span>
                    {ea.custom && (
                      <span className="text-[8px] px-1 py-0.5 rounded uppercase font-bold shrink-0" style={{ backgroundColor: 'rgba(0,194,122,0.15)', color: '#00C27A' }}>Custom</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setInfoEa({ ...ea, builtin: !ea.custom, ...(ea.custom ? {} : { inputs: builtinInputsFor(ea.id, ea.strategyKind) }) } as unknown as CustomEA); close(); }}
                      className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: 'rgba(0,145,213,0.12)', color: '#0091D5', border: '1px solid rgba(0,145,213,0.3)' }}
                      title="EA Properties — Common, Inputs, source code"
                    >
                      Properties
                    </button>
                    {ea.custom && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeCustom(ea.id); }}
                        className="shrink-0 text-[rgba(255,255,255,0.3)] hover:text-red-400"
                        title="Remove custom EA"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] mb-1.5" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{ea.description}</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>Pairs:</span>
                      {ea.pairs.map((p) => <span key={p} className="text-[9px] font-mono px-1 rounded" style={{ backgroundColor: 'rgba(0,145,213,0.1)', color: '#0091D5' }}>{p}</span>)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>TF:</span>
                      {ea.timeframes.map((tf) => <span key={tf} className="text-[9px] font-mono px-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>{tf}</span>)}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={9} fill={i < Math.floor(ea.rating) ? '#FFD700' : 'transparent'} style={{ color: i < Math.floor(ea.rating) ? '#FFD700' : 'rgba(255,255,255,0.15)' }} />)}
                      <span className="text-[9px] ml-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{ea.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
          {uploadMsg && (
            <div className="mb-2 rounded-md px-2 py-1.5 text-[10px]" style={{
              backgroundColor: uploadMsg.ok ? 'rgba(0,194,122,0.12)' : 'rgba(255,82,82,0.12)',
              color: uploadMsg.ok ? '#00C27A' : '#FF5252',
              border: `1px solid ${uploadMsg.ok ? 'rgba(0,194,122,0.3)' : 'rgba(255,82,82,0.3)'}`,
            }}>
              {uploadMsg.text}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".mq5,.ex5,.pine,.txt" className="hidden" onChange={onFileChosen} />
          <button
            onClick={onUploadClick}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-[11px] font-semibold transition-all hover:bg-[rgba(0,145,213,0.15)]"
            style={{ border: '1px dashed rgba(0,145,213,0.3)', color: '#0091D5' }}
          >
            <Zap size={14} /> Upload Custom EA (.mq5, .ex5, .pine)
          </button>
        </div>
      </PortalDropdown>

      <div className="flex-1" />

      {/* Clear All */}
      <button onClick={onClearAll} className={`${btn} text-red-400 hover:bg-red-500/10 hover:text-red-300`} title="Clear all indicators, EAs and drawings">
        <Trash2 size={14} /> Clear All
      </button>

      {/* Custom EA info panel (§16) */}
      {infoEa && <CustomEAInfoModal ea={infoEa} onClose={() => setInfoEa(null)} />}
    </div>
  );
}
