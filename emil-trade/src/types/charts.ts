// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 12: RAPTOR CHARTS Types
// Indigenous charting platform built on TradingView lib
// ═══════════════════════════════════════════════════════════

// ─── Chart Types ────────────────────────────────────────────

export type ChartType =
  | 'candlestick' | 'ohlc_bar' | 'heikin_ashi' | 'renko' | 'point_figure'
  | 'kagi' | 'line_break' | 'range_bar' | 'tick_chart' | 'volume_chart'
  | 'footprint' | 'delta' | 'cumulative_delta' | 'bid_ask_split' | 'spread_chart';

export type ChartTimeframe =
  | 'tick' | '1s' | '5s' | '10s' | '15s' | '30s'
  | '1m' | '2m' | '3m' | '4m' | '5m' | '10m' | '15m' | '20m' | '30m' | '45m'
  | '1H' | '2H' | '3H' | '4H' | '6H' | '8H' | '12H'
  | 'D' | 'W' | 'M' | '3M' | '6M' | 'Y' | 'custom';

export type ChartLayout = 'single' | '2h' | '2v' | '4' | '6' | '9';

export interface ChartPanel {
  id: string;
  symbol: string;
  chartType: ChartType;
  timeframe: ChartTimeframe;
  indicators: AppliedIndicator[];
  drawings: ChartDrawing[];
  overlaySymbols: string[];
  sessionHighlighting: boolean;
  daySeparators: boolean;
  priceScale: 'normal' | 'percentage' | 'logarithmic' | 'inverted';
  volumeProfile: boolean;
  barReplay: boolean;
  barReplaySpeed: number;
}

export interface ChartLayoutConfig {
  id: string;
  name: string;
  layout: ChartLayout;
  panels: ChartPanel[];
  isDefault: boolean;
  createdAt: string;
}

// ─── Indicators ─────────────────────────────────────────────

export type IndicatorCategory =
  | 'trend' | 'oscillator' | 'volatility' | 'volume'
  | 'channel' | 'market_structure' | 'statistical'
  | 'gio_custom' | 'raptor_exclusive' | 'nexus_ai';

export interface IndicatorDefinition {
  id: string;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  description: string;
  params: IndicatorParam[];
  outputs: IndicatorOutput[];
  isOverlay: boolean;
  isRaptorExclusive: boolean;
  isNexusAI: boolean;
}

export interface IndicatorParam {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'color' | 'select';
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  options?: string[];
}

export interface IndicatorOutput {
  name: string;
  label: string;
  plotType: 'line' | 'histogram' | 'area' | 'dots' | 'cross' | 'columns' | 'cloud';
  color: string;
  lineWidth: number;
}

export interface AppliedIndicator {
  id: string;
  definitionId: string;
  name: string;
  params: Record<string, number | string | boolean>;
  isVisible: boolean;
  panelIndex: number;
}

// ─── Drawing Tools ──────────────────────────────────────────

export type DrawingCategory =
  | 'fibonacci' | 'gann' | 'geometric' | 'shapes' | 'patterns'
  | 'text' | 'measures' | 'special' | 'elliott' | 'harmonic';

export interface DrawingTool {
  id: string;
  name: string;
  category: DrawingCategory;
  icon: string;
  hotkey: string | null;
  requiresPoints: number;
}

export interface ChartDrawing {
  id: string;
  toolId: string;
  points: { time: number; price: number }[];
  style: DrawingStyle;
  isLocked: boolean;
  isVisible: boolean;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor: string | null;
  fillOpacity: number;
  fontSize: number | null;
  text: string | null;
}

// ─── Indicator Registry ─────────────────────────────────────

export const INDICATOR_REGISTRY: { category: IndicatorCategory; label: string; color: string; indicators: { name: string; shortName: string; isExclusive?: boolean }[] }[] = [
  {
    category: 'trend', label: 'Trend', color: '#00b4ff',
    indicators: [
      { name: 'Simple Moving Average', shortName: 'SMA' },
      { name: 'Exponential Moving Average', shortName: 'EMA' },
      { name: 'Weighted Moving Average', shortName: 'WMA' },
      { name: 'Double EMA', shortName: 'DEMA' },
      { name: 'Triple EMA', shortName: 'TEMA' },
      { name: 'Hull Moving Average', shortName: 'HMA' },
      { name: 'Volume Weighted MA', shortName: 'VWMA' },
      { name: 'Kaufman Adaptive MA', shortName: 'KAMA' },
      { name: 'McGinley Dynamic', shortName: 'McGinley' },
      { name: 'Arnaud Legoux MA', shortName: 'ALMA' },
      { name: 'Zero-Lag EMA', shortName: 'ZLEMA' },
      { name: 'Tillson T3', shortName: 'T3' },
      { name: 'ADX + DI', shortName: 'ADX' },
      { name: 'Parabolic SAR', shortName: 'SAR' },
      { name: 'Supertrend', shortName: 'ST' },
      { name: 'Aroon', shortName: 'Aroon' },
      { name: 'Vortex Indicator', shortName: 'VI' },
      { name: 'Choppiness Index', shortName: 'CHOP' },
      { name: 'Ichimoku Cloud', shortName: 'Ichimoku' },
      { name: 'Keltner Channels', shortName: 'KC' },
      { name: 'Donchian Channels', shortName: 'DC' },
      { name: 'Linear Regression Channel', shortName: 'LRC' },
      { name: 'Linear Regression', shortName: 'LREG' },
      { name: 'Price Channels', shortName: 'PC' },
    ],
  },
  {
    category: 'oscillator', label: 'Momentum & Oscillators', color: '#8b5cf6',
    indicators: [
      { name: 'RSI (Wilder)', shortName: 'RSI' },
      { name: 'Stochastic', shortName: 'Stoch' },
      { name: 'CCI', shortName: 'CCI' },
      { name: 'Williams %R', shortName: 'W%R' },
      { name: 'Momentum', shortName: 'MOM' },
      { name: 'Rate of Change', shortName: 'ROC' },
      { name: 'MACD', shortName: 'MACD' },
      { name: 'Awesome Oscillator', shortName: 'AO' },
      { name: 'Stochastic RSI', shortName: 'StochRSI' },
      { name: 'Ultimate Oscillator', shortName: 'UO' },
      { name: 'Schaff Trend Cycle', shortName: 'STC' },
      { name: 'Chande Momentum', shortName: 'CMO' },
      { name: 'TRIX', shortName: 'TRIX' },
      { name: 'PPO', shortName: 'PPO' },
      { name: 'DPO', shortName: 'DPO' },
      { name: 'Connors RSI', shortName: 'CRSI' },
      { name: 'Fisher Transform', shortName: 'Fisher' },
    ],
  },
  {
    category: 'volatility', label: 'Volatility', color: '#f59e0b',
    indicators: [
      { name: 'Bollinger Bands', shortName: 'BB' },
      { name: 'Bollinger %B', shortName: 'BB%B' },
      { name: 'BB Squeeze', shortName: 'BBSqueeze' },
      { name: 'Average True Range', shortName: 'ATR' },
      { name: 'Historical Volatility', shortName: 'HV' },
      { name: 'Chaikin Volatility', shortName: 'CV' },
      { name: 'Relative Volatility', shortName: 'RVI' },
      { name: 'Standard Deviation', shortName: 'StdDev' },
      { name: 'Bollinger Band Width', shortName: 'BBW' },
      { name: 'Keltner Channels', shortName: 'KELT' },
      { name: 'Donchian Width', shortName: 'DCW' },
      { name: 'Volatility Stop', shortName: 'VStop' },
    ],
  },
  {
    category: 'volume', label: 'Volume', color: '#00dc82',
    indicators: [
      { name: 'On-Balance Volume', shortName: 'OBV' },
      { name: 'VWAP', shortName: 'VWAP' },
      { name: 'Anchored VWAP', shortName: 'aVWAP' },
      { name: 'Volume Profile', shortName: 'VP' },
      { name: 'Money Flow Index', shortName: 'MFI' },
      { name: 'Chaikin Money Flow', shortName: 'CMF' },
      { name: 'Accumulation/Distribution', shortName: 'A/D' },
      { name: 'Force Index', shortName: 'FI' },
      { name: 'Volume Oscillator', shortName: 'VO' },
      { name: 'VWAP Bands', shortName: 'VWAPB' },
      { name: 'Volume', shortName: 'VOL' },
      { name: 'Volume Moving Average', shortName: 'VMA' },
      { name: 'Session VWAP', shortName: 'sVWAP' },
      { name: 'Fixed Range Volume Profile', shortName: 'FRVP' },
      { name: 'Visible Range Volume Profile', shortName: 'VRVP' },
      { name: 'Session Volume Profile', shortName: 'SVP' },
      { name: 'Buy & Sell Volume', shortName: 'BSV' },
      { name: 'Delta Volume', shortName: 'DVOL' },
      { name: 'Cumulative Delta', shortName: 'CVD' },
    ],
  },
  {
    category: 'market_structure', label: 'Market Structure', color: '#22d3ee',
    indicators: [
      { name: 'Pivot Points', shortName: 'PIVOT' },
      { name: 'Fibonacci Pivots', shortName: 'FPIVOT' },
      { name: 'Swing High / Low', shortName: 'SWING' },
      { name: 'Zig Zag', shortName: 'ZIGZAG' },
      { name: 'Fractals', shortName: 'FRACTAL' },
      { name: 'Support & Resistance', shortName: 'SR' },
      { name: 'Break of Structure', shortName: 'BOS' },
      { name: 'Change of Character', shortName: 'CHOCH' },
      { name: 'Fair Value Gap', shortName: 'FVG' },
      { name: 'Order Blocks', shortName: 'OB' },
      { name: 'Liquidity Zones', shortName: 'LIQZ' },
      { name: 'Supply & Demand', shortName: 'SND' },
      { name: 'Premium / Discount Zones', shortName: 'PDZ' },
      { name: 'Session High / Low', shortName: 'SESHL' },
      { name: 'Previous Day High / Low', shortName: 'PDHL' },
      { name: 'Previous Week High / Low', shortName: 'PWHL' },
      { name: 'Previous Month High / Low', shortName: 'PMHL' },
    ],
  },
  {
    category: 'statistical', label: 'Statistical & Quant', color: '#a78bfa',
    indicators: [
      { name: 'Correlation Coefficient', shortName: 'CORR' },
      { name: 'Beta', shortName: 'BETA' },
      { name: 'Z-Score', shortName: 'ZSCORE' },
      { name: 'Standard Deviation Bands', shortName: 'SDB' },
      { name: 'Linear Regression Channel (Stat)', shortName: 'LREGC' },
      { name: 'Polynomial Regression', shortName: 'POLYREG' },
      { name: 'Cointegration', shortName: 'COINT' },
      { name: 'Spread Analysis', shortName: 'SPREAD' },
      { name: 'Pair Trading Indicator', shortName: 'PAIR' },
      { name: 'Monte Carlo Bands', shortName: 'MCB' },
      { name: 'Kalman Filter', shortName: 'KALMAN' },
      { name: 'Hurst Exponent', shortName: 'HURST' },
      { name: 'Entropy', shortName: 'ENTROPY' },
      { name: 'Sharpe Ratio', shortName: 'SHARPE' },
      { name: 'Sortino Ratio', shortName: 'SORTINO' },
    ],
  },
  {
    category: 'gio_custom', label: 'GIO Custom', color: '#f5c518',
    indicators: [
      { name: 'GIO Absolute Indicator', shortName: 'ABS', isExclusive: true },
      { name: 'GIO BLUEBIRD (Dual Kalman Trend)', shortName: 'BLUE', isExclusive: true },
      { name: 'GIO LNL Trend Cloud (ATR)', shortName: 'LNL', isExclusive: true },
      { name: 'GIO Donchian Trend Ribbon', shortName: 'DTR', isExclusive: true },
      { name: 'GIO Hull Day Trader Pro', shortName: 'HULLDT', isExclusive: true },
      { name: 'GIO Ichimoku Signals', shortName: 'GICHI', isExclusive: true },
      { name: 'GIO Ichimoku Cloud Trend', shortName: 'ICT', isExclusive: true },
      { name: 'GIO Kalman Trend', shortName: 'GKALT', isExclusive: true },
      { name: 'GIO Market Structure PRO', shortName: 'MSPRO', isExclusive: true },
      { name: 'GIO Range Scanner', shortName: 'RSCAN', isExclusive: true },
      { name: 'GIO SMC (Smart Money Concepts)', shortName: 'SMC', isExclusive: true },
      { name: 'GIO VRVP S/R Matrix', shortName: 'VRVPM', isExclusive: true },
      { name: 'GIO Gold Scalper', shortName: 'GSCALP', isExclusive: true },
      { name: 'GIO Gold System', shortName: 'GGOLD', isExclusive: true },
      { name: 'GIO The Equalizer (Regime)', shortName: 'EQLZ', isExclusive: true },
    ],
  },
  {
    category: 'raptor_exclusive', label: 'RAPTOR Exclusive', color: '#ff6b35',
    indicators: [
      { name: 'RAPTOR PULSE', shortName: 'PULSE', isExclusive: true },
      { name: 'RAPTOR MOMENTUM WAVE', shortName: 'MWAVE', isExclusive: true },
      { name: 'RAPTOR LIQUIDITY MAP', shortName: 'LIQMAP', isExclusive: true },
      { name: 'RAPTOR SMART MONEY', shortName: 'SMART', isExclusive: true },
      { name: 'RAPTOR FLOW', shortName: 'FLOW', isExclusive: true },
      { name: 'RAPTOR REGIME', shortName: 'REGIME', isExclusive: true },
      { name: 'RAPTOR SENTIMENT BAR', shortName: 'SENT', isExclusive: true },
      { name: 'RAPTOR SIGNAL', shortName: 'SIGNAL', isExclusive: true },
    ],
  },
  {
    category: 'nexus_ai', label: 'NEXUS AI', color: '#8b5cf6',
    indicators: [
      { name: 'NEXUS Zones (S/R)', shortName: 'ZONES', isExclusive: true },
      { name: 'NEXUS Patterns (55+)', shortName: 'PATTERNS', isExclusive: true },
      { name: 'NEXUS Divergence', shortName: 'DIV', isExclusive: true },
      { name: 'NEXUS Entry Zones', shortName: 'ENTRY', isExclusive: true },
      { name: 'NEXUS Exit Zones', shortName: 'EXIT', isExclusive: true },
    ],
  },
];

export const DRAWING_TOOLS: { category: DrawingCategory; label: string; tools: { name: string; points: number }[] }[] = [
  { category: 'fibonacci', label: 'Fibonacci', tools: [{ name: 'Retracement', points: 2 }, { name: 'Extension', points: 3 }, { name: 'Fan', points: 2 }, { name: 'Arc', points: 2 }, { name: 'Timezone', points: 2 }, { name: 'Speed Lines', points: 2 }, { name: 'Spiral', points: 2 }] },
  { category: 'gann', label: 'Gann', tools: [{ name: 'Box', points: 2 }, { name: 'Fan', points: 2 }, { name: 'Square', points: 2 }, { name: 'Line', points: 2 }, { name: 'Grid', points: 2 }] },
  { category: 'geometric', label: 'Lines & Channels', tools: [{ name: 'Trend Line', points: 2 }, { name: 'Ray', points: 2 }, { name: 'Extended Line', points: 2 }, { name: 'Parallel Channel', points: 3 }, { name: 'Regression Channel', points: 2 }, { name: 'Pitchfork', points: 3 }] },
  { category: 'shapes', label: 'Shapes', tools: [{ name: 'Rectangle', points: 2 }, { name: 'Ellipse', points: 2 }, { name: 'Triangle', points: 3 }, { name: 'Polyline', points: -1 }, { name: 'Brush', points: -1 }] },
  { category: 'patterns', label: 'Pattern Templates', tools: [{ name: 'Head & Shoulders', points: 5 }, { name: 'Double Top/Bottom', points: 3 }, { name: 'Cup & Handle', points: 4 }, { name: 'Wedge', points: 4 }, { name: 'Flag', points: 4 }] },
  { category: 'text', label: 'Text & Labels', tools: [{ name: 'Text Label', points: 1 }, { name: 'Callout', points: 1 }, { name: 'Price Label', points: 1 }, { name: 'Note', points: 1 }] },
  { category: 'measures', label: 'Measurement', tools: [{ name: 'Date Range', points: 2 }, { name: 'Price Range', points: 2 }, { name: 'Date & Price Range', points: 2 }, { name: 'Bars Pattern', points: 2 }] },
  { category: 'special', label: 'Special', tools: [{ name: 'Long Position', points: 2 }, { name: 'Short Position', points: 2 }, { name: 'Ghost Feed', points: 2 }] },
  { category: 'elliott', label: 'Elliott Wave', tools: [{ name: 'Impulse (12345)', points: 6 }, { name: 'Correction (ABC)', points: 4 }] },
  { category: 'harmonic', label: 'Harmonic', tools: [{ name: 'Gartley', points: 5 }, { name: 'Bat', points: 5 }, { name: 'Butterfly', points: 5 }, { name: 'Crab', points: 5 }, { name: 'Shark', points: 5 }] },
];
