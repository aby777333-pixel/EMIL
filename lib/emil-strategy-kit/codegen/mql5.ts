import { ENGINES, type EngineId } from '../engines'
import { ATR_PERIOD, MIN_BARS } from '../strategies'
import type { EmilStrategySpec, Timeframe } from '../spec'
import { codeHeader, fileBaseName, formatNumber, toAscii } from './shared'

/**
 * Generates a MetaTrader 5 Expert Advisor that trades the spec the way EMIL
 * Trade's runtime does: evaluates on each closed bar of the signal timeframe,
 * acts only when the regime changes, closes the opposite position first,
 * places a fixed lot with ATR(14) stop and target, and honours the direction
 * filter. Indicator helpers reproduce EMIL Trade's formulas rather than
 * calling iMA/iRSI, whose seeding differs.
 */

const MQL_TIMEFRAMES: Record<Timeframe, string> = {
  '1m': 'PERIOD_M1',
  '5m': 'PERIOD_M5',
  '15m': 'PERIOD_M15',
  '30m': 'PERIOD_M30',
  '1H': 'PERIOD_H1',
  '4H': 'PERIOD_H4',
  '1D': 'PERIOD_D1',
}

type Helper = 'sma' | 'ema' | 'rsi' | 'macd' | 'bands' | 'atr' | 'sar' | 'midpoint'

const HELPER_DEPENDENCIES: Record<Helper, Helper[]> = {
  sma: [],
  ema: [],
  rsi: [],
  macd: ['ema'],
  bands: ['sma'],
  atr: [],
  sar: [],
  midpoint: [],
}

const HELPERS: Record<Helper, string> = {
  sma: `void EmilSMA(const double &src[], const int n, const int period, double &out[])
{
   ArrayResize(out, n);
   ArrayInitialize(out, EMPTY_VALUE);
   if(period < 1 || n < period) return;
   double sum = 0.0;
   for(int i = 0; i < period; i++) sum += src[i];
   out[period - 1] = sum / period;
   for(int i = period; i < n; i++)
     {
      sum += src[i] - src[i - period];
      out[i] = sum / period;
     }
}`,
  ema: `// EMA seeded with the SMA of the first 'period' values.
void EmilEMA(const double &src[], const int n, const int period, double &out[])
{
   ArrayResize(out, n);
   ArrayInitialize(out, EMPTY_VALUE);
   if(period < 1 || n < period) return;
   double sum = 0.0;
   for(int i = 0; i < period; i++) sum += src[i];
   double prev = sum / period;
   out[period - 1] = prev;
   double k = 2.0 / (period + 1);
   for(int i = period; i < n; i++)
     {
      prev = (src[i] - prev) * k + prev;
      out[i] = prev;
     }
}`,
  rsi: `// RSI with Wilder smoothing, seeded with the simple average of the first 'period' changes.
void EmilRSI(const double &src[], const int n, const int period, double &out[])
{
   ArrayResize(out, n);
   ArrayInitialize(out, EMPTY_VALUE);
   if(period < 1 || n < period + 1) return;
   double avgGain = 0.0, avgLoss = 0.0;
   for(int i = 1; i <= period; i++)
     {
      double change = src[i] - src[i - 1];
      if(change > 0.0) avgGain += change;
      else avgLoss -= change;
     }
   avgGain /= period;
   avgLoss /= period;
   out[period] = (avgLoss == 0.0) ? 100.0 : 100.0 - 100.0 / (1.0 + avgGain / avgLoss);
   for(int i = period + 1; i < n; i++)
     {
      double change = src[i] - src[i - 1];
      double gain = (change > 0.0) ? change : 0.0;
      double loss = (change < 0.0) ? -change : 0.0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i] = (avgLoss == 0.0) ? 100.0 : 100.0 - 100.0 / (1.0 + avgGain / avgLoss);
     }
}`,
  macd: `// MACD; the signal line is the SMA-seeded EMA of the MACD values that exist.
void EmilMACD(const double &src[], const int n, const int fastPeriod, const int slowPeriod, const int signalPeriod,
              double &line[], double &signal[], double &hist[])
{
   double fastEma[], slowEma[];
   EmilEMA(src, n, fastPeriod, fastEma);
   EmilEMA(src, n, slowPeriod, slowEma);
   ArrayResize(line, n);
   ArrayResize(signal, n);
   ArrayResize(hist, n);
   ArrayInitialize(line, EMPTY_VALUE);
   ArrayInitialize(signal, EMPTY_VALUE);
   ArrayInitialize(hist, EMPTY_VALUE);
   double values[];
   int index[];
   ArrayResize(values, n);
   ArrayResize(index, n);
   int m = 0;
   for(int i = 0; i < n; i++)
     {
      if(fastEma[i] == EMPTY_VALUE || slowEma[i] == EMPTY_VALUE) continue;
      line[i] = fastEma[i] - slowEma[i];
      values[m] = line[i];
      index[m] = i;
      m++;
     }
   if(m < signalPeriod) return;
   double signalEma[];
   EmilEMA(values, m, signalPeriod, signalEma);
   for(int k = 0; k < m; k++)
     {
      if(signalEma[k] == EMPTY_VALUE) continue;
      signal[index[k]] = signalEma[k];
      hist[index[k]] = line[index[k]] - signalEma[k];
     }
}`,
  bands: `// Bollinger Bands on an SMA with the population standard deviation.
void EmilBands(const double &src[], const int n, const int period, const double deviation,
               double &upper[], double &middle[], double &lower[])
{
   EmilSMA(src, n, period, middle);
   ArrayResize(upper, n);
   ArrayResize(lower, n);
   ArrayInitialize(upper, EMPTY_VALUE);
   ArrayInitialize(lower, EMPTY_VALUE);
   for(int i = period - 1; i < n; i++)
     {
      if(i < 0 || middle[i] == EMPTY_VALUE) continue;
      double sumSq = 0.0;
      for(int j = i - period + 1; j <= i; j++)
        {
         double diff = src[j] - middle[i];
         sumSq += diff * diff;
        }
      double sd = MathSqrt(sumSq / period);
      upper[i] = middle[i] + deviation * sd;
      lower[i] = middle[i] - deviation * sd;
     }
}`,
  atr: `// ATR with Wilder smoothing; the first true range is high - low.
void EmilATR(const double &high[], const double &low[], const double &close[], const int n, const int period, double &out[])
{
   ArrayResize(out, n);
   ArrayInitialize(out, EMPTY_VALUE);
   if(period < 1 || n < period + 1) return;
   double tr[];
   ArrayResize(tr, n);
   tr[0] = high[0] - low[0];
   for(int i = 1; i < n; i++)
      tr[i] = MathMax(high[i] - low[i], MathMax(MathAbs(high[i] - close[i - 1]), MathAbs(low[i] - close[i - 1])));
   double sum = 0.0;
   for(int i = 0; i < period; i++) sum += tr[i];
   double prev = sum / period;
   out[period - 1] = prev;
   for(int i = period; i < n; i++)
     {
      prev = (prev * (period - 1) + tr[i]) / period;
      out[i] = prev;
     }
}`,
  sar: `// Parabolic SAR as EMIL Trade computes it (extreme point updated before the reversal test).
void EmilSAR(const double &high[], const double &low[], const int n, const double step, const double maxStep, double &out[])
{
   ArrayResize(out, n);
   ArrayInitialize(out, EMPTY_VALUE);
   if(n < 2) return;
   bool isLong = true;
   double af = step;
   double ep = high[0];
   double sar = low[0];
   for(int i = 1; i < n; i++)
     {
      double prevSar = sar;
      if(isLong)
        {
         sar = prevSar + af * (ep - prevSar);
         sar = MathMin(sar, MathMin(low[i - 1], (i > 1) ? low[i - 2] : low[i - 1]));
         if(high[i] > ep) { ep = high[i]; af = MathMin(af + step, maxStep); }
         if(low[i] < sar) { isLong = false; sar = ep; ep = low[i]; af = step; }
        }
      else
        {
         sar = prevSar + af * (ep - prevSar);
         sar = MathMax(sar, MathMax(high[i - 1], (i > 1) ? high[i - 2] : high[i - 1]));
         if(low[i] < ep) { ep = low[i]; af = MathMin(af + step, maxStep); }
         if(high[i] > sar) { isLong = true; sar = ep; ep = high[i]; af = step; }
        }
      out[i] = sar;
     }
}`,
  midpoint: `// (highest high + lowest low) / 2 over the last 'period' bars, current bar included.
void EmilMidpoint(const double &high[], const double &low[], const int n, const int period, double &out[])
{
   ArrayResize(out, n);
   ArrayInitialize(out, EMPTY_VALUE);
   for(int i = period - 1; i < n; i++)
     {
      if(i < 0) continue;
      double hh = high[i], ll = low[i];
      for(int j = i - period + 1; j <= i; j++)
        {
         if(high[j] > hh) hh = high[j];
         if(low[j] < ll) ll = low[j];
        }
      out[i] = (hh + ll) / 2.0;
     }
}`,
}

/** Each engine's helpers and the body of EmilRegime (returns 1 buy, -1 sell, 0 none). */
const ENGINE_CODE: Record<EngineId, { helpers: Helper[]; body: string }> = {
  ema_pullback: {
    helpers: ['ema'],
    body: `   double fast[], slow[];
   EmilEMA(c, n, FastEMA, fast);
   EmilEMA(c, n, SlowEMA, slow);
   int i = n - 1;
   if(fast[i] == EMPTY_VALUE || slow[i] == EMPTY_VALUE) return 0;
   bool uptrend = fast[i] > slow[i];
   bool downtrend = fast[i] < slow[i];
   if(uptrend && l[i] <= fast[i] && c[i] >= slow[i] && c[i] > o[i]) return 1;
   if(downtrend && h[i] >= fast[i] && c[i] <= slow[i] && c[i] < o[i]) return -1;
   if(uptrend && c[i] > slow[i]) return 1;
   if(downtrend && c[i] < slow[i]) return -1;
   return 0;`,
  },
  rsi_macd: {
    helpers: ['rsi', 'macd'],
    body: `   double r[], line[], signal[], hist[];
   EmilRSI(c, n, RSIPeriod, r);
   EmilMACD(c, n, MACDFast, MACDSlow, MACDSignal, line, signal, hist);
   int i = n - 1;
   if(r[i] == EMPTY_VALUE || line[i] == EMPTY_VALUE || signal[i] == EMPTY_VALUE) return 0;
   if(r[i] >= RSIMidline && line[i] > signal[i]) return 1;
   if(r[i] <= RSIMidline && line[i] < signal[i]) return -1;
   return 0;`,
  },
  rsi_adaptive: {
    helpers: ['rsi', 'ema'],
    body: `   double r[], trend[];
   EmilRSI(c, n, RSIPeriod, r);
   EmilEMA(c, n, TrendEMA, trend);
   int i = n - 1;
   if(r[i] == EMPTY_VALUE || trend[i] == EMPTY_VALUE) return 0;
   if(r[i] > BuyLevel && c[i] > trend[i]) return 1;
   if(r[i] < SellLevel && c[i] < trend[i]) return -1;
   return 0;`,
  },
  sar_flip: {
    helpers: ['sar', 'ema', 'rsi'],
    body: `   double sar[], trend[], r[];
   EmilSAR(h, l, n, SARStep, SARMax, sar);
   EmilEMA(c, n, TrendEMA, trend);
   EmilRSI(c, n, RSIPeriod, r);
   int i = n - 1;
   if(sar[i] == EMPTY_VALUE || trend[i] == EMPTY_VALUE || r[i] == EMPTY_VALUE) return 0;
   if(sar[i] < c[i] && c[i] > trend[i] && r[i] > 48.0) return 1;
   if(sar[i] > c[i] && c[i] < trend[i] && r[i] < 52.0) return -1;
   return 0;`,
  },
  boll_macd: {
    helpers: ['bands', 'macd'],
    body: `   double upper[], middle[], lower[], line[], signal[], hist[];
   EmilBands(c, n, BBPeriod, BBDeviation, upper, middle, lower);
   EmilMACD(c, n, MACDFast, MACDSlow, MACDSignal, line, signal, hist);
   int i = n - 1;
   if(i < 1) return 0;
   if(lower[i] == EMPTY_VALUE || upper[i] == EMPTY_VALUE || middle[i] == EMPTY_VALUE || hist[i] == EMPTY_VALUE || hist[i - 1] == EMPTY_VALUE) return 0;
   if(c[i] <= lower[i] * 1.001 && hist[i] > hist[i - 1]) return 1;
   if(c[i] >= upper[i] * 0.999 && hist[i] < hist[i - 1]) return -1;
   return 0;`,
  },
  trend_reversal: {
    helpers: ['ema'],
    body: `   double fast[], slow[];
   EmilEMA(c, n, FastEMA, fast);
   EmilEMA(c, n, SlowEMA, slow);
   int i = n - 1;
   if(fast[i] == EMPTY_VALUE || slow[i] == EMPTY_VALUE) return 0;
   if(fast[i] > slow[i]) return 1;
   if(fast[i] < slow[i]) return -1;
   return 0;`,
  },
  kalman: {
    helpers: ['ema'],
    body: `   double fast[], slow[];
   EmilEMA(c, n, FastEMA, fast);
   EmilEMA(c, n, SlowEMA, slow);
   int i = n - 1;
   if(fast[i] == EMPTY_VALUE || slow[i] == EMPTY_VALUE) return 0;
   if(fast[i] > slow[i]) return 1;
   if(fast[i] < slow[i]) return -1;
   return 0;`,
  },
  linreg: {
    helpers: ['ema'],
    body: `   double e[];
   EmilEMA(c, n, EMAPeriod, e);
   int i = n - 1;
   if(i < 1 || e[i] == EMPTY_VALUE || e[i - 1] == EMPTY_VALUE) return 0;
   if(e[i] > e[i - 1]) return 1;
   if(e[i] < e[i - 1]) return -1;
   return 0;`,
  },
  ichimoku: {
    helpers: ['midpoint'],
    body: `   double conv[], base[], rawB[];
   EmilMidpoint(h, l, n, Tenkan, conv);
   EmilMidpoint(h, l, n, Kijun, base);
   EmilMidpoint(h, l, n, SenkouB, rawB);
   int i = n - 1;
   int j = i - Displacement;
   if(j < 0 || conv[i] == EMPTY_VALUE || base[i] == EMPTY_VALUE) return 0;
   if(conv[j] == EMPTY_VALUE || base[j] == EMPTY_VALUE || rawB[j] == EMPTY_VALUE) return 0;
   double spanA = (conv[j] + base[j]) / 2.0;
   double spanB = rawB[j];
   if(c[i] > MathMax(spanA, spanB) && conv[i] > base[i]) return 1;
   if(c[i] < MathMin(spanA, spanB) && conv[i] < base[i]) return -1;
   return 0;`,
  },
  ssl: {
    helpers: ['sma'],
    body: `   double hi[], lo[];
   EmilSMA(h, n, ChannelPeriod, hi);
   EmilSMA(l, n, ChannelPeriod, lo);
   int i = n - 1;
   if(hi[i] == EMPTY_VALUE || lo[i] == EMPTY_VALUE) return 0;
   if(c[i] > hi[i]) return 1;
   if(c[i] < lo[i]) return -1;
   return 0;`,
  },
  pattern: {
    helpers: [],
    body: `   int lookback = (int)MathMax(5, ExtremeLookback);
   if(n < lookback + 2) return 0;
   int i = n - 1;
   double winHigh = h[i - 1], winLow = l[i - 1];
   for(int j = i - lookback; j < i; j++)
     {
      if(h[j] > winHigh) winHigh = h[j];
      if(l[j] < winLow) winLow = l[j];
     }
   bool bullishEngulf = c[i] > o[i] && c[i - 1] < o[i - 1] && c[i] > o[i - 1] && o[i] < c[i - 1];
   bool bearishEngulf = c[i] < o[i] && c[i - 1] > o[i - 1] && c[i] < o[i - 1] && o[i] > c[i - 1];
   if(bullishEngulf && l[i] <= winLow * 1.001) return 1;
   if(bearishEngulf && h[i] >= winHigh * 0.999) return -1;
   return 0;`,
  },
}

function resolveHelpers(roots: readonly Helper[]): Helper[] {
  const order: Helper[] = ['sma', 'ema', 'rsi', 'macd', 'bands', 'atr', 'sar', 'midpoint']
  const needed = new Set<Helper>()
  const visit = (helper: Helper) => {
    if (needed.has(helper)) return
    needed.add(helper)
    HELPER_DEPENDENCIES[helper].forEach(visit)
  }
  roots.forEach(visit)
  return order.filter((helper) => needed.has(helper))
}

/** 6-digit magic number from the strategy id, stable across versions. */
function magicFrom(id: string): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619)
  return (Math.abs(hash) % 900000) + 100000
}

export function generateMql5(spec: EmilStrategySpec, brand = 'EMIL Strategy Builder'): string {
  const engine = ENGINES[spec.engine]
  const code = ENGINE_CODE[spec.engine]
  const helpers = resolveHelpers([...code.helpers, 'atr'])
  const groups = Array.from(new Set(engine.inputs.map((input) => input.group)))
  const inputs = groups
    .map((group) => {
      const lines = engine.inputs
        .filter((input) => input.group === group)
        .map((input) => `input ${input.type} ${input.name} = ${formatNumber(spec.params[input.name], input.type)}; // ${input.label}`)
      return [`input group "${group}"`, ...lines].join('\n')
    })
    .join('\n')
  const directionDefault = spec.risk.direction === 'long' ? 'EMIL_LONG_ONLY' : spec.risk.direction === 'short' ? 'EMIL_SHORT_ONLY' : 'EMIL_BOTH'
  const base = fileBaseName(spec)

  const rules = engine.rules(spec.params)
  return `${codeHeader(spec, brand, '//', true)}
#property copyright "${toAscii(brand)}"
#property version   "${Math.min(spec.version, 999)}.00"
#property description "${toAscii(spec.name)}"

#include <Trade\\Trade.mqh>

enum ENUM_EMIL_DIRECTION
  {
   EMIL_BOTH = 0,       // Long and short
   EMIL_LONG_ONLY = 1,  // Long only
   EMIL_SHORT_ONLY = 2  // Short only
  };

${inputs}
input group "Execution"
input ENUM_TIMEFRAMES SignalTimeframe = ${MQL_TIMEFRAMES[spec.timeframe]}; // Signal timeframe
input double Lots = ${formatNumber(spec.risk.lot, 'double')};                  // Fixed lot per entry
input double SLAtrMult = ${formatNumber(spec.risk.slAtrMult, 'double')};             // Stop-loss (x ATR ${ATR_PERIOD})
input double TPAtrMult = ${formatNumber(spec.risk.tpAtrMult, 'double')};             // Take-profit (x ATR ${ATR_PERIOD})
input ENUM_EMIL_DIRECTION TradeDirection = ${directionDefault}; // Trade direction
input int CalcBars = 500;                  // Closed bars used for indicators
input ulong MagicNumber = ${magicFrom(spec.id)};          // Magic number

#define EMIL_MIN_BARS ${MIN_BARS}
#define EMIL_ATR_PERIOD ${ATR_PERIOD}
#define EMIL_COMMENT "${base.slice(0, 20)}"

CTrade   g_trade;
datetime g_lastBarTime = 0;
int      g_lastRegime = 0;

${helpers.map((helper) => HELPERS[helper]).join('\n\n')}

// ${toAscii(engine.label)}, evaluated on the closed bars (oldest first). Returns 1 buy, -1 sell, 0 none.
//   Long:  ${toAscii(rules.long)}
//   Short: ${toAscii(rules.short)}
int EmilRegime(const double &o[], const double &h[], const double &l[], const double &c[], const int n)
{
${code.body}
}

int OnInit()
{
   if(CalcBars < EMIL_MIN_BARS)
     {
      Print("CalcBars must be at least ", EMIL_MIN_BARS);
      return(INIT_PARAMETERS_INCORRECT);
     }
   g_trade.SetExpertMagicNumber(MagicNumber);
   g_lastBarTime = 0;
   g_lastRegime = 0;
   return(INIT_SUCCEEDED);
}

// The position this EA holds on this symbol, or 0.
ulong EmilPositionTicket()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      return ticket;
     }
   return 0;
}

double EmilNormalizeVolume(const double volume)
{
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double v = (step > 0.0) ? MathFloor(volume / step + 0.0000001) * step : volume;
   return MathMax(minVolume, MathMin(maxVolume, v));
}

void OnTick()
{
   datetime closedBar = iTime(_Symbol, SignalTimeframe, 1);
   if(closedBar == 0 || closedBar == g_lastBarTime) return;

   MqlRates rates[];
   ArraySetAsSeries(rates, false);
   int n = CopyRates(_Symbol, SignalTimeframe, 1, CalcBars, rates);
   if(n < EMIL_MIN_BARS) return;
   g_lastBarTime = closedBar;

   double o[], h[], l[], c[];
   ArrayResize(o, n);
   ArrayResize(h, n);
   ArrayResize(l, n);
   ArrayResize(c, n);
   for(int i = 0; i < n; i++)
     {
      o[i] = rates[i].open;
      h[i] = rates[i].high;
      l[i] = rates[i].low;
      c[i] = rates[i].close;
     }

   int regime = EmilRegime(o, h, l, c, n);
   if(regime == 0 || regime == g_lastRegime) return;
   if(TradeDirection == EMIL_LONG_ONLY && regime < 0) return;
   if(TradeDirection == EMIL_SHORT_ONLY && regime > 0) return;

   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick)) return;

   ulong ticket = EmilPositionTicket();
   if(ticket != 0 && !g_trade.PositionClose(ticket))
     {
      Print("Could not close position ", ticket, ": ", g_trade.ResultRetcodeDescription());
      return;
     }
   g_lastRegime = 0;

   double atrValues[];
   EmilATR(h, l, c, n, EMIL_ATR_PERIOD, atrValues);
   double a = (atrValues[n - 1] == EMPTY_VALUE) ? 0.0 : atrValues[n - 1];
   double minDistance = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   double volume = EmilNormalizeVolume(Lots);
   bool placed = false;

   if(regime > 0)
     {
      double price = tick.ask;
      double sl = 0.0, tp = 0.0;
      if(a > 0.0)
        {
         sl = NormalizeDouble(price - MathMax(SLAtrMult * a, minDistance), _Digits);
         tp = NormalizeDouble(price + MathMax(TPAtrMult * a, minDistance), _Digits);
        }
      placed = g_trade.Buy(volume, _Symbol, 0.0, sl, tp, EMIL_COMMENT);
     }
   else
     {
      double price = tick.bid;
      double sl = 0.0, tp = 0.0;
      if(a > 0.0)
        {
         sl = NormalizeDouble(price + MathMax(SLAtrMult * a, minDistance), _Digits);
         tp = NormalizeDouble(price - MathMax(TPAtrMult * a, minDistance), _Digits);
        }
      placed = g_trade.Sell(volume, _Symbol, 0.0, sl, tp, EMIL_COMMENT);
     }

   uint retcode = g_trade.ResultRetcode();
   if(placed && (retcode == TRADE_RETCODE_DONE || retcode == TRADE_RETCODE_PLACED))
      g_lastRegime = regime;
   else
      Print("Order not placed: ", g_trade.ResultRetcodeDescription());
}
`
}
