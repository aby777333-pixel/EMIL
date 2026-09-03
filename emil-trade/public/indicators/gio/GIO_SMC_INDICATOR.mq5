//+------------------------------------------------------------------+
//|                                            GIO_SMC_INDICATOR.mq5 |
//|        Smart Money Concepts - MT5 conversion (from Pine v5)      |
//|                                                                  |
//|  Original concept & logic: (c) LuxAlgo - "Smart Money Concepts"  |
//|  Licensed CC BY-NC-SA 4.0                                        |
//|  https://creativecommons.org/licenses/by-nc-sa/4.0/              |
//|                                                                  |
//|  Faithful 1:1 parameter port. All inputs, defaults, colors and   |
//|  behaviours mirror the Pine Script original:                     |
//|   - Internal structure (BOS/CHoCH) on fixed 5-bar legs           |
//|   - Swing structure (BOS/CHoCH) on user-length legs (default 50) |
//|   - Internal & swing Order Blocks with ATR / Cum. Mean Range     |
//|     volatility filter and Close / High-Low mitigation            |
//|   - Equal Highs / Equal Lows (EQH/EQL)                           |
//|   - Fair Value Gaps (auto threshold, MTF, extend)                |
//|   - Previous Daily / Weekly / Monthly high & low levels          |
//|   - Premium / Discount / Equilibrium zones                       |
//|   - Strong/Weak High & Low trailing swing lines                  |
//|   - Trend-colored candles (internal structure trend)             |
//|                                                                  |
//|  Notes: all state is evaluated on CLOSED bars (non-repainting,   |
//|  pivots confirm "length" bars after the extreme, exactly like    |
//|  the Pine leg() logic). Popup alerts are gated by one MT5-only   |
//|  switch (EnableAlerts) since MT5 has no alertcondition() picker. |
//+------------------------------------------------------------------+
#property copyright "Original (c) LuxAlgo - CC BY-NC-SA 4.0 | MT5 port"
#property link      "https://creativecommons.org/licenses/by-nc-sa/4.0/"
#property version   "1.00"
// (MQL5 - strict mode is default)
#property indicator_chart_window
#property indicator_buffers 5
#property indicator_plots   1
#property indicator_type1   DRAW_COLOR_CANDLES
#property indicator_label1  "SMC Trend Candle"

//+------------------------------------------------------------------+
//| Enumerations (mirror the Pine string options)                    |
//+------------------------------------------------------------------+
enum ENUM_SMC_MODE
  {
   SMC_HISTORICAL = 0,  // Historical
   SMC_PRESENT    = 1   // Present
  };

enum ENUM_SMC_STYLE
  {
   SMC_COLORED    = 0,  // Colored
   SMC_MONOCHROME = 1   // Monochrome
  };

enum ENUM_SMC_STRUCT
  {
   SMC_ALL   = 0,       // All
   SMC_BOS   = 1,       // BOS
   SMC_CHOCH = 2        // CHoCH
  };

enum ENUM_SMC_TEXT
  {
   SMC_TINY   = 7,      // Tiny
   SMC_SMALL  = 8,      // Small
   SMC_NORMAL = 10      // Normal
  };

enum ENUM_SMC_OBFILTER
  {
   SMC_ATR   = 0,       // Atr
   SMC_RANGE = 1        // Cumulative Mean Range
  };

enum ENUM_SMC_MITIGATION
  {
   SMC_CLOSE   = 0,     // Close
   SMC_HIGHLOW = 1      // High/Low
  };

enum ENUM_SMC_LSTYLE
  {
   SMC_SOLID  = 0,      // Solid
   SMC_DASHED = 1,      // Dashed
   SMC_DOTTED = 2       // Dotted
  };

//+------------------------------------------------------------------+
//| Inputs - identical set, defaults and grouping to the original    |
//+------------------------------------------------------------------+
input group "Smart Money Concepts"
input ENUM_SMC_MODE       InpMode                    = SMC_HISTORICAL;   // Mode
input ENUM_SMC_STYLE      InpStyle                   = SMC_COLORED;      // Style
input bool                InpColorCandles            = false;            // Color Candles

input group "Real Time Internal Structure"
input bool                InpShowInternals           = true;             // Show Internal Structure
input ENUM_SMC_STRUCT     InpShowInternalBull        = SMC_ALL;          // Bullish Structure
input color               InpInternalBullColor       = C'8,153,129';     // Bullish Structure Color
input ENUM_SMC_STRUCT     InpShowInternalBear        = SMC_ALL;          // Bearish Structure
input color               InpInternalBearColor       = C'242,54,69';     // Bearish Structure Color
input bool                InpConfluenceFilter        = false;            // Confluence Filter
input ENUM_SMC_TEXT       InpInternalLabelSize       = SMC_TINY;         // Internal Label Size

input group "Real Time Swing Structure"
input bool                InpShowStructure           = true;             // Show Swing Structure
input ENUM_SMC_STRUCT     InpShowSwingBull           = SMC_ALL;          // Bullish Structure
input color               InpSwingBullColor          = C'8,153,129';     // Bullish Structure Color
input ENUM_SMC_STRUCT     InpShowSwingBear           = SMC_ALL;          // Bearish Structure
input color               InpSwingBearColor          = C'242,54,69';     // Bearish Structure Color
input ENUM_SMC_TEXT       InpSwingLabelSize          = SMC_SMALL;        // Swing Label Size
input bool                InpShowSwings              = false;            // Show Swings Points
input int                 InpSwingsLength            = 50;               // Swings Length (min 10)
input bool                InpShowHighLowSwings       = true;             // Show Strong/Weak High/Low

input group "Order Blocks"
input bool                InpShowInternalOrderBlocks = true;             // Internal Order Blocks
input int                 InpInternalOrderBlocksSize = 5;                // Internal Order Blocks Count (1-20)
input bool                InpShowSwingOrderBlocks    = false;            // Swing Order Blocks
input int                 InpSwingOrderBlocksSize    = 5;                // Swing Order Blocks Count (1-20)
input ENUM_SMC_OBFILTER   InpOrderBlockFilter        = SMC_ATR;          // Order Block Filter
input ENUM_SMC_MITIGATION InpOrderBlockMitigation    = SMC_HIGHLOW;      // Order Block Mitigation
input color               InpInternalBullOBColor     = C'49,121,245';    // Internal Bullish OB
input color               InpInternalBearOBColor     = C'247,124,128';   // Internal Bearish OB
input color               InpSwingBullOBColor        = C'24,72,204';     // Bullish OB
input color               InpSwingBearOBColor        = C'178,40,51';     // Bearish OB

input group "EQH/EQL"
input bool                InpShowEqualHighsLows      = true;             // Equal High/Low
input int                 InpEqualHighsLowsLength    = 3;                // Bars Confirmation (min 1)
input double              InpEqualHighsLowsThreshold = 0.1;              // Threshold (0 - 0.5)
input ENUM_SMC_TEXT       InpEqualHighsLowsSize      = SMC_TINY;         // Label Size

input group "Fair Value Gaps"
input bool                InpShowFairValueGaps       = false;            // Fair Value Gaps
input bool                InpFVGAutoThreshold        = true;             // Auto Threshold
input ENUM_TIMEFRAMES     InpFVGTimeframe            = PERIOD_CURRENT;   // Timeframe
input color               InpFVGBullColor            = C'0,255,104';     // Bullish FVG
input color               InpFVGBearColor            = C'255,0,8';       // Bearish FVG
input int                 InpFVGExtend               = 1;                // Extend FVG (min 0)

input group "Highs & Lows MTF"
input bool                InpShowDailyLevels         = false;            // Daily
input ENUM_SMC_LSTYLE     InpDailyLevelsStyle        = SMC_SOLID;        // Daily Style
input color               InpDailyLevelsColor        = C'33,87,243';     // Daily Color
input bool                InpShowWeeklyLevels        = false;            // Weekly
input ENUM_SMC_LSTYLE     InpWeeklyLevelsStyle       = SMC_SOLID;        // Weekly Style
input color               InpWeeklyLevelsColor       = C'33,87,243';     // Weekly Color
input bool                InpShowMonthlyLevels       = false;            // Monthly
input ENUM_SMC_LSTYLE     InpMonthlyLevelsStyle      = SMC_SOLID;        // Monthly Style
input color               InpMonthlyLevelsColor      = C'33,87,243';     // Monthly Color

input group "Premium & Discount Zones"
input bool                InpShowPremiumDiscount     = false;            // Premium/Discount Zones
input color               InpPremiumZoneColor        = C'242,54,69';     // Premium Zone
input color               InpEquilibriumZoneColor    = C'135,139,148';   // Equilibrium Zone
input color               InpDiscountZoneColor       = C'8,153,129';     // Discount Zone

input group "Alerts (MT5)"
input bool                InpEnableAlerts            = false;            // Enable Popup Alerts

//+------------------------------------------------------------------+
//| Constants                                                        |
//+------------------------------------------------------------------+
#define SMC_BULLISH   (+1)
#define SMC_BEARISH   (-1)
#define BULLISH_LEG   1
#define BEARISH_LEG   0

// monochrome palette
#define MONO_BULL_CLR C'178,181,190'
#define MONO_BEAR_CLR C'93,96,107'

// pivot slot indices
#define PH_SWING 0
#define PL_SWING 1
#define PH_INT   2
#define PL_INT   3
#define PH_EQ    4
#define PL_EQ    5

// leg context indices
#define LEG_SWING 0
#define LEG_INT   1
#define LEG_EQ    2

//+------------------------------------------------------------------+
//| Data structures (mirror the Pine UDTs)                           |
//+------------------------------------------------------------------+
struct SPivot
  {
   double            currentLevel;
   double            lastLevel;
   bool              valid;      // currentLevel assigned (Pine: not na)
   bool              lastValid;  // lastLevel assigned
   bool              crossed;
   datetime          barTime;
   int               barIndex;
  };

struct SOrderBlock
  {
   double            barHigh;
   double            barLow;
   datetime          barTime;
   int               bias;
  };

struct SFVG
  {
   double            top;
   double            bottom;
   int               bias;
   long              id;         // used to rebuild the two box object names
  };

//+------------------------------------------------------------------+
//| Indicator buffers (trend colored candles)                        |
//+------------------------------------------------------------------+
double BufOpen[];
double BufHigh[];
double BufLow[];
double BufClose[];
double BufColor[];

//+------------------------------------------------------------------+
//| Global state                                                     |
//+------------------------------------------------------------------+
string      g_prefix        = "GIOSMC_";
int         g_next          = 0;      // next confirmed bar to process
long        g_counter       = 0;      // historical object name counter
long        g_fvgId         = 0;      // fair value gap id counter
bool        g_live          = false;  // history fully processed at least once

SPivot      g_pivots[6];
int         g_leg[3];
int         g_swingTrend    = 0;
int         g_internalTrend = 0;

// trailing swing extremes
double      g_trailTop         = 0.0;
double      g_trailBottom      = 0.0;
datetime    g_trailBarTime     = 0;
int         g_trailBarIndex    = -1;
datetime    g_trailLastTopTime = 0;
datetime    g_trailLastBotTime = 0;
bool        g_trailTopInit     = false;
bool        g_trailBotInit     = false;

// volatility bookkeeping
double      g_atr[];        // Wilder ATR(200) per bar
double      g_pHigh[];      // parsed highs (volatility-swapped)
double      g_pLow[];       // parsed lows
double      g_cumTR         = 0.0;
double      g_cumFVGDelta   = 0.0;

// order blocks (index 0 = newest, capped at 100 like the original)
SOrderBlock g_internalOB[];
SOrderBlock g_swingOB[];

// fair value gaps
SFVG        g_fvgs[];

//+------------------------------------------------------------------+
//| Sanitized (clamped) copies of the constrained inputs             |
//+------------------------------------------------------------------+
int    g_swingsLength = 50;
int    g_eqLength     = 3;
double g_eqThreshold  = 0.1;
int    g_iObCount     = 5;
int    g_sObCount     = 5;

//+------------------------------------------------------------------+
//| Color helpers (Style: Colored / Monochrome)                      |
//+------------------------------------------------------------------+
color SwingBullColor()        { return (InpStyle == SMC_MONOCHROME) ? (color)MONO_BULL_CLR : InpSwingBullColor;    }
color SwingBearColor()        { return (InpStyle == SMC_MONOCHROME) ? (color)MONO_BEAR_CLR : InpSwingBearColor;    }
color InternalBullColor()     { return (InpStyle == SMC_MONOCHROME) ? (color)MONO_BULL_CLR : InpInternalBullColor; }
color InternalBearColor()     { return (InpStyle == SMC_MONOCHROME) ? (color)MONO_BEAR_CLR : InpInternalBearColor; }
color FVGBullColor()          { return (InpStyle == SMC_MONOCHROME) ? (color)MONO_BULL_CLR : InpFVGBullColor;      }
color FVGBearColor()          { return (InpStyle == SMC_MONOCHROME) ? (color)MONO_BEAR_CLR : InpFVGBearColor;      }
color PremiumZoneColor()      { return (InpStyle == SMC_MONOCHROME) ? (color)MONO_BEAR_CLR : InpPremiumZoneColor;  }
color DiscountZoneColor()     { return (InpStyle == SMC_MONOCHROME) ? (color)MONO_BULL_CLR : InpDiscountZoneColor; }

color OrderBlockColor(const bool internal, const int bias)
  {
   if(InpStyle == SMC_MONOCHROME)
      return (bias == SMC_BEARISH) ? (color)MONO_BEAR_CLR : (color)MONO_BULL_CLR;
   if(internal)
      return (bias == SMC_BEARISH) ? InpInternalBearOBColor : InpInternalBullOBColor;
   return (bias == SMC_BEARISH) ? InpSwingBearOBColor : InpSwingBullOBColor;
  }

//+------------------------------------------------------------------+
//| Small utilities                                                  |
//+------------------------------------------------------------------+
double HighestRange(const double &arr[], const int from, const int to)
  {
   double m = arr[from];
   for(int k = from + 1; k <= to; k++)
      if(arr[k] > m)
         m = arr[k];
   return m;
  }

double LowestRange(const double &arr[], const int from, const int to)
  {
   double m = arr[from];
   for(int k = from + 1; k <= to; k++)
      if(arr[k] < m)
         m = arr[k];
   return m;
  }

ENUM_LINE_STYLE MapLineStyle(const ENUM_SMC_LSTYLE st)
  {
   if(st == SMC_DASHED)
      return STYLE_DASH;
   if(st == SMC_DOTTED)
      return STYLE_DOT;
   return STYLE_SOLID;
  }

void ResetPivot(SPivot &p)
  {
   p.currentLevel = 0.0;
   p.lastLevel    = 0.0;
   p.valid        = false;
   p.lastValid    = false;
   p.crossed      = false;
   p.barTime      = 0;
   p.barIndex     = -1;
  }

void QueueAlert(const string msg)
  {
   if(g_live && InpEnableAlerts)
      Alert("GIO SMC | ", _Symbol, " ", StringSubstr(EnumToString((ENUM_TIMEFRAMES)Period()), 7), " | ", msg);
  }

//+------------------------------------------------------------------+
//| Chart object helpers                                             |
//+------------------------------------------------------------------+
void ObjLine(const string name, const datetime t1, const double p1,
             const datetime t2, const double p2, const color clr,
             const ENUM_LINE_STYLE st, const int width = 1)
  {
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_TREND, 0, t1, p1, t2, p2);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, name, OBJPROP_RAY_RIGHT, false);
      ObjectSetInteger(0, name, OBJPROP_BACK, false);
     }
   ObjectMove(0, name, 0, t1, p1);
   ObjectMove(0, name, 1, t2, p2);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_STYLE, st);
   ObjectSetInteger(0, name, OBJPROP_WIDTH, width);
   ObjectSetInteger(0, name, OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
  }

void ObjText(const string name, const datetime t, const double price,
             const string txt, const color clr,
             const ENUM_ANCHOR_POINT anchor, const int fontsize)
  {
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_TEXT, 0, t, price);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, name, OBJPROP_BACK, false);
      ObjectSetString(0, name, OBJPROP_FONT, "Arial");
     }
   ObjectMove(0, name, 0, t, price);
   ObjectSetString(0, name, OBJPROP_TEXT, txt);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_ANCHOR, anchor);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fontsize);
   ObjectSetInteger(0, name, OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
  }

void ObjRect(const string name, const datetime t1, const double p1,
             const datetime t2, const double p2, const color clr)
  {
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_RECTANGLE, 0, t1, p1, t2, p2);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, name, OBJPROP_BACK, true);
     }
   ObjectMove(0, name, 0, t1, p1);
   ObjectMove(0, name, 1, t2, p2);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_FILL, true);
   ObjectSetInteger(0, name, OBJPROP_WIDTH, 1);
   ObjectSetInteger(0, name, OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
  }

void ObjHide(const string name)
  {
   if(ObjectFind(0, name) >= 0)
      ObjectSetInteger(0, name, OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
  }

//+------------------------------------------------------------------+
//| Order block array helpers (index 0 = newest, cap 100)            |
//+------------------------------------------------------------------+
void UnshiftOB(SOrderBlock &arr[], const SOrderBlock &v)
  {
   int n = ArraySize(arr);
   if(n >= 100)                       // pop the oldest, like the original
     {
      ArrayResize(arr, 99);
      n = 99;
     }
   ArrayResize(arr, n + 1);
   for(int k = n; k > 0; k--)
      arr[k] = arr[k - 1];
   arr[0] = v;
  }

void RemoveOB(SOrderBlock &arr[], const int idx)
  {
   int n = ArraySize(arr);
   if(idx < 0 || idx >= n)
      return;
   for(int k = idx; k < n - 1; k++)
      arr[k] = arr[k + 1];
   ArrayResize(arr, n - 1);
  }

void RemoveFVG(SFVG &arr[], const int idx)
  {
   int n = ArraySize(arr);
   if(idx < 0 || idx >= n)
      return;
   for(int k = idx; k < n - 1; k++)
      arr[k] = arr[k + 1];
   ArrayResize(arr, n - 1);
  }

//+------------------------------------------------------------------+
//| Candle buffer fill (plotcandle equivalent)                       |
//+------------------------------------------------------------------+
void FillCandleBuffer(const int i, const double &open[], const double &high[],
                      const double &low[], const double &close[])
  {
   if(!InpColorCandles)
     {
      BufOpen[i]  = EMPTY_VALUE;
      BufHigh[i]  = EMPTY_VALUE;
      BufLow[i]   = EMPTY_VALUE;
      BufClose[i] = EMPTY_VALUE;
      BufColor[i] = 0.0;
      return;
     }
   BufOpen[i]  = open[i];
   BufHigh[i]  = high[i];
   BufLow[i]   = low[i];
   BufClose[i] = close[i];
   // candleColor = internalTrend.bias == BULLISH ? bull : bear
   BufColor[i] = (g_internalTrend == SMC_BULLISH) ? 0.0 : 1.0;
  }

//+------------------------------------------------------------------+
//| drawLabel equivalent (swing point HH/HL/LL/LH labels)            |
//+------------------------------------------------------------------+
void DrawSwingLabel(const int barIdx, const double price, const string tag,
                    const color clr, const bool below, const datetime &time[])
  {
   string ctx = below ? "SWL" : "SWH";
   string suffix;
   if(InpMode == SMC_PRESENT)
      suffix = ctx;                       // reuse => old one is replaced
   else
     {
      suffix = ctx + "_" + IntegerToString(g_counter);
      g_counter++;
     }
   // label_up sits below the point, label_down sits above it
   ObjText(g_prefix + "SWT_" + suffix, time[barIdx], price, tag, clr,
           below ? ANCHOR_UPPER : ANCHOR_LOWER, (int)SMC_SMALL);
  }

//+------------------------------------------------------------------+
//| drawEqualHighLow equivalent                                      |
//+------------------------------------------------------------------+
void DrawEqualHighLow(const int i, const int pivotIdx, const double level,
                      const int size, const bool equalHigh, const datetime &time[])
  {
   string tag        = equalHigh ? "EQH" : "EQL";
   color  clr        = equalHigh ? SwingBearColor() : SwingBullColor();
   string suffix;
   if(InpMode == SMC_PRESENT)
      suffix = tag;
   else
     {
      suffix = tag + "_" + IntegerToString(g_counter);
      g_counter++;
     }
   ObjLine(g_prefix + "EQL_" + suffix, g_pivots[pivotIdx].barTime,
           g_pivots[pivotIdx].currentLevel, time[i - size], level, clr, STYLE_DOT);

   int mid = (int)MathRound(0.5 * (g_pivots[pivotIdx].barIndex + i - size));
   if(mid < 0)
      mid = 0;
   if(mid > i)
      mid = i;
   ObjText(g_prefix + "EQT_" + suffix, time[mid], level, tag, clr,
           equalHigh ? ANCHOR_LOWER : ANCHOR_UPPER, (int)InpEqualHighsLowsSize);
  }

//+------------------------------------------------------------------+
//| drawStructure equivalent (BOS/CHoCH line + label)                |
//+------------------------------------------------------------------+
void DrawStructure(const int i, const int pivotIdx, const string tag,
                   const color clr, const bool internal, const bool bullish,
                   const datetime &time[])
  {
   string ctx = internal ? (bullish ? "IB" : "IR") : (bullish ? "SB" : "SR");
   string suffix;
   if(InpMode == SMC_PRESENT)
      suffix = ctx;
   else
     {
      suffix = ctx + "_" + IntegerToString(g_counter);
      g_counter++;
     }
   double level = g_pivots[pivotIdx].currentLevel;
   ObjLine(g_prefix + "STL_" + suffix, g_pivots[pivotIdx].barTime, level,
           time[i], level, clr, internal ? STYLE_DASH : STYLE_SOLID);

   int mid = (int)MathRound(0.5 * (g_pivots[pivotIdx].barIndex + i));
   if(mid < 0)
      mid = 0;
   if(mid > i)
      mid = i;
   int fontsize = internal ? (int)InpInternalLabelSize : (int)InpSwingLabelSize;
   // bullish break => label.style_label_down (above the line); bearish => below
   ObjText(g_prefix + "STT_" + suffix, time[mid], level, tag, clr,
           bullish ? ANCHOR_LOWER : ANCHOR_UPPER, fontsize);
  }

//+------------------------------------------------------------------+
//| storeOrdeBlock equivalent                                        |
//+------------------------------------------------------------------+
void StoreOrderBlock(const int pivotBarIndex, const int i, const bool internal,
                     const int bias, const datetime &time[])
  {
   if((!internal && !InpShowSwingOrderBlocks) || (internal && !InpShowInternalOrderBlocks))
      return;
   if(pivotBarIndex < 0 || pivotBarIndex >= i)
      return;

   // slice [pivotBarIndex, i-1] like Pine's slice(p_ivot.barIndex, bar_index)
   int best = pivotBarIndex;
   if(bias == SMC_BEARISH)
     {
      for(int k = pivotBarIndex + 1; k < i; k++)
         if(g_pHigh[k] > g_pHigh[best])
            best = k;
     }
   else
     {
      for(int k = pivotBarIndex + 1; k < i; k++)
         if(g_pLow[k] < g_pLow[best])
            best = k;
     }

   SOrderBlock ob;
   ob.barHigh = g_pHigh[best];
   ob.barLow  = g_pLow[best];
   ob.barTime = time[best];
   ob.bias    = bias;

   if(internal)
      UnshiftOB(g_internalOB, ob);
   else
      UnshiftOB(g_swingOB, ob);
  }

//+------------------------------------------------------------------+
//| deleteOrderBlocks equivalent (mitigation check)                  |
//+------------------------------------------------------------------+
void DeleteOrderBlocks(const int i, const bool internal, const double &high[],
                       const double &low[], const double &close[])
  {
   double bearSrc = (InpOrderBlockMitigation == SMC_CLOSE) ? close[i] : high[i];
   double bullSrc = (InpOrderBlockMitigation == SMC_CLOSE) ? close[i] : low[i];

   if(internal)
     {
      for(int k = ArraySize(g_internalOB) - 1; k >= 0; k--)
        {
         if(g_internalOB[k].bias == SMC_BEARISH && bearSrc > g_internalOB[k].barHigh)
           {
            RemoveOB(g_internalOB, k);
            QueueAlert("Price broke bearish internal OB");
           }
         else if(g_internalOB[k].bias == SMC_BULLISH && bullSrc < g_internalOB[k].barLow)
           {
            RemoveOB(g_internalOB, k);
            QueueAlert("Price broke bullish internal OB");
           }
        }
     }
   else
     {
      for(int k = ArraySize(g_swingOB) - 1; k >= 0; k--)
        {
         if(g_swingOB[k].bias == SMC_BEARISH && bearSrc > g_swingOB[k].barHigh)
           {
            RemoveOB(g_swingOB, k);
            QueueAlert("Price broke bearish swing OB");
           }
         else if(g_swingOB[k].bias == SMC_BULLISH && bullSrc < g_swingOB[k].barLow)
           {
            RemoveOB(g_swingOB, k);
            QueueAlert("Price broke bullish swing OB");
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| drawOrderBlocks equivalent (last-bar rendering, reused rects)    |
//+------------------------------------------------------------------+
void DrawOrderBlocksNow(const bool internal, const datetime rightTime)
  {
   int maxCount = internal ? g_iObCount : g_sObCount;
   int total    = internal ? ArraySize(g_internalOB) : ArraySize(g_swingOB);
   int n        = (int)MathMin(maxCount, total);
   string base  = internal ? "IOB_" : "SOB_";

   for(int k = 0; k < n; k++)
     {
      SOrderBlock ob;
      if(internal)
         ob = g_internalOB[k];
      else
         ob = g_swingOB[k];
      color clr = OrderBlockColor(internal, ob.bias);
      ObjRect(g_prefix + base + IntegerToString(k), ob.barTime, ob.barHigh,
              rightTime, ob.barLow, clr);
     }
   for(int k = n; k < 20; k++)
      ObjHide(g_prefix + base + IntegerToString(k));
  }

//+------------------------------------------------------------------+
//| leg() + getCurrentStructure() equivalent                         |
//+------------------------------------------------------------------+
void GetCurrentStructure(const int i, const int size, const bool equalHL,
                         const bool internal, const datetime &time[],
                         const double &high[], const double &low[])
  {
   if(size < 1 || i < size)
      return;

   int ctx = equalHL ? LEG_EQ : (internal ? LEG_INT : LEG_SWING);

   // leg(): newLegHigh = high[size] > ta.highest(size); newLegLow = low[size] < ta.lowest(size)
   int    leg     = g_leg[ctx];
   double highest = HighestRange(high, i - size + 1, i);
   double lowest  = LowestRange(low, i - size + 1, i);
   if(high[i - size] > highest)
      leg = BEARISH_LEG;
   else if(low[i - size] < lowest)
      leg = BULLISH_LEG;

   int change = leg - g_leg[ctx];
   g_leg[ctx] = leg;
   if(change == 0)
      return;                                 // no new pivot

   bool pivotLow = (change == +1);            // startOfBullishLeg => swing low
   int  pi       = i - size;

   if(pivotLow)
     {
      int idx = equalHL ? PL_EQ : (internal ? PL_INT : PL_SWING);

      if(equalHL && g_pivots[idx].valid &&
         MathAbs(g_pivots[idx].currentLevel - low[pi]) < g_eqThreshold * g_atr[i])
        {
         DrawEqualHighLow(i, idx, low[pi], size, false, time);
         QueueAlert("Equal lows detected");
        }

      g_pivots[idx].lastLevel    = g_pivots[idx].currentLevel;
      g_pivots[idx].lastValid    = g_pivots[idx].valid;
      g_pivots[idx].currentLevel = low[pi];
      g_pivots[idx].valid        = true;
      g_pivots[idx].crossed      = false;
      g_pivots[idx].barTime      = time[pi];
      g_pivots[idx].barIndex     = pi;

      if(!equalHL && !internal)
        {
         g_trailBottom      = g_pivots[idx].currentLevel;
         g_trailBarTime     = g_pivots[idx].barTime;
         g_trailBarIndex    = g_pivots[idx].barIndex;
         g_trailLastBotTime = g_pivots[idx].barTime;
         g_trailBotInit     = true;
        }

      if(InpShowSwings && !internal && !equalHL)
        {
         string tag = (g_pivots[idx].lastValid && g_pivots[idx].currentLevel < g_pivots[idx].lastLevel) ? "LL" : "HL";
         DrawSwingLabel(pi, g_pivots[idx].currentLevel, tag, SwingBullColor(), true, time);
        }
     }
   else
     {
      int idx = equalHL ? PH_EQ : (internal ? PH_INT : PH_SWING);

      if(equalHL && g_pivots[idx].valid &&
         MathAbs(g_pivots[idx].currentLevel - high[pi]) < g_eqThreshold * g_atr[i])
        {
         DrawEqualHighLow(i, idx, high[pi], size, true, time);
         QueueAlert("Equal highs detected");
        }

      g_pivots[idx].lastLevel    = g_pivots[idx].currentLevel;
      g_pivots[idx].lastValid    = g_pivots[idx].valid;
      g_pivots[idx].currentLevel = high[pi];
      g_pivots[idx].valid        = true;
      g_pivots[idx].crossed      = false;
      g_pivots[idx].barTime      = time[pi];
      g_pivots[idx].barIndex     = pi;

      if(!equalHL && !internal)
        {
         g_trailTop         = g_pivots[idx].currentLevel;
         g_trailBarTime     = g_pivots[idx].barTime;
         g_trailBarIndex    = g_pivots[idx].barIndex;
         g_trailLastTopTime = g_pivots[idx].barTime;
         g_trailTopInit     = true;
        }

      if(InpShowSwings && !internal && !equalHL)
        {
         string tag = (g_pivots[idx].lastValid && g_pivots[idx].currentLevel > g_pivots[idx].lastLevel) ? "HH" : "LH";
         DrawSwingLabel(pi, g_pivots[idx].currentLevel, tag, SwingBearColor(), false, time);
        }
     }
  }

//+------------------------------------------------------------------+
//| displayStructure equivalent (BOS/CHoCH detection + OB storage)   |
//+------------------------------------------------------------------+
void DisplayStructure(const int i, const bool internal, const datetime &time[],
                      const double &open[], const double &high[],
                      const double &low[], const double &close[])
  {
   if(i < 1)
      return;

   bool bullishBar = true;
   bool bearishBar = true;
   if(InpConfluenceFilter)
     {
      double upperWick = high[i] - MathMax(close[i], open[i]);
      double lowerWick = MathMin(close[i], open[i]) - low[i];
      bullishBar = upperWick > lowerWick;
      bearishBar = upperWick < lowerWick;
     }

   //--- bullish: crossover of close above the pivot HIGH ---------------
   int  hiIdx = internal ? PH_INT : PH_SWING;
   bool extraBull = internal
                    ? (g_pivots[PH_INT].currentLevel != g_pivots[PH_SWING].currentLevel && bullishBar)
                    : true;

   if(g_pivots[hiIdx].valid && !g_pivots[hiIdx].crossed && extraBull &&
      close[i] > g_pivots[hiIdx].currentLevel && close[i - 1] <= g_pivots[hiIdx].currentLevel)
     {
      int    bias = internal ? g_internalTrend : g_swingTrend;
      string tag  = (bias == SMC_BEARISH) ? "CHoCH" : "BOS";

      if(internal)
         QueueAlert((tag == "CHoCH") ? "Internal Bullish CHoCH formed" : "Internal Bullish BOS formed");
      else
         QueueAlert((tag == "CHoCH") ? "Bullish CHoCH formed" : "Bullish BOS formed");

      g_pivots[hiIdx].crossed = true;
      if(internal)
         g_internalTrend = SMC_BULLISH;
      else
         g_swingTrend = SMC_BULLISH;

      ENUM_SMC_STRUCT filter = internal ? InpShowInternalBull : InpShowSwingBull;
      bool showFlag          = internal ? InpShowInternals : InpShowStructure;
      bool displayCondition  = showFlag &&
                               (filter == SMC_ALL ||
                                (filter == SMC_BOS && tag != "CHoCH") ||
                                (filter == SMC_CHOCH && tag == "CHoCH"));
      if(displayCondition)
         DrawStructure(i, hiIdx, tag, internal ? InternalBullColor() : SwingBullColor(),
                       internal, true, time);

      if((internal && InpShowInternalOrderBlocks) || (!internal && InpShowSwingOrderBlocks))
         StoreOrderBlock(g_pivots[hiIdx].barIndex, i, internal, SMC_BULLISH, time);
     }

   //--- bearish: crossunder of close below the pivot LOW ---------------
   int  loIdx = internal ? PL_INT : PL_SWING;
   bool extraBear = internal
                    ? (g_pivots[PL_INT].currentLevel != g_pivots[PL_SWING].currentLevel && bearishBar)
                    : true;

   if(g_pivots[loIdx].valid && !g_pivots[loIdx].crossed && extraBear &&
      close[i] < g_pivots[loIdx].currentLevel && close[i - 1] >= g_pivots[loIdx].currentLevel)
     {
      int    bias = internal ? g_internalTrend : g_swingTrend;
      string tag  = (bias == SMC_BULLISH) ? "CHoCH" : "BOS";

      if(internal)
         QueueAlert((tag == "CHoCH") ? "Internal Bearish CHoCH formed" : "Internal Bearish BOS formed");
      else
         QueueAlert((tag == "CHoCH") ? "Bearish CHoCH formed" : "Bearish BOS formed");

      g_pivots[loIdx].crossed = true;
      if(internal)
         g_internalTrend = SMC_BEARISH;
      else
         g_swingTrend = SMC_BEARISH;

      ENUM_SMC_STRUCT filter = internal ? InpShowInternalBear : InpShowSwingBear;
      bool showFlag          = internal ? InpShowInternals : InpShowStructure;
      bool displayCondition  = showFlag &&
                               (filter == SMC_ALL ||
                                (filter == SMC_BOS && tag != "CHoCH") ||
                                (filter == SMC_CHOCH && tag == "CHoCH"));
      if(displayCondition)
         DrawStructure(i, loIdx, tag, internal ? InternalBearColor() : SwingBearColor(),
                       internal, false, time);

      if((internal && InpShowInternalOrderBlocks) || (!internal && InpShowSwingOrderBlocks))
         StoreOrderBlock(g_pivots[loIdx].barIndex, i, internal, SMC_BEARISH, time);
     }
  }

//+------------------------------------------------------------------+
//| Fair Value Gaps                                                  |
//+------------------------------------------------------------------+
ENUM_TIMEFRAMES FVGTimeframe()
  {
   if(InpFVGTimeframe == PERIOD_CURRENT)
      return (ENUM_TIMEFRAMES)Period();
   // a lower-than-chart FVG timeframe is meaningless: fall back to chart TF
   if(PeriodSeconds(InpFVGTimeframe) < PeriodSeconds((ENUM_TIMEFRAMES)Period()))
      return (ENUM_TIMEFRAMES)Period();
   return InpFVGTimeframe;
  }

void DeleteFairValueGaps(const int i, const double &high[], const double &low[])
  {
   for(int k = ArraySize(g_fvgs) - 1; k >= 0; k--)
     {
      bool mitigated = (low[i] < g_fvgs[k].bottom && g_fvgs[k].bias == SMC_BULLISH) ||
                       (high[i] > g_fvgs[k].top && g_fvgs[k].bias == SMC_BEARISH);
      if(mitigated)
        {
         ObjectDelete(0, g_prefix + "FVGT_" + IntegerToString(g_fvgs[k].id));
         ObjectDelete(0, g_prefix + "FVGB_" + IntegerToString(g_fvgs[k].id));
         RemoveFVG(g_fvgs, k);
        }
     }
  }

void NewFVGBoxes(const datetime leftTime, const datetime rightTime,
                 const double top, const double bottom, const color clr, const long id)
  {
   double mid = 0.5 * (top + bottom);
   ObjRect(g_prefix + "FVGT_" + IntegerToString(id), leftTime, top, rightTime, mid, clr);
   ObjRect(g_prefix + "FVGB_" + IntegerToString(id), leftTime, mid, rightTime, bottom, clr);
  }

void DrawFairValueGaps(const int i, const datetime &time[], const double &open[],
                       const double &high[], const double &low[], const double &close[])
  {
   ENUM_TIMEFRAMES tf = FVGTimeframe();
   bool     sameTF = (tf == (ENUM_TIMEFRAMES)Period());
   bool     newTimeframe;
   double   lastClose, lastOpen, currentHigh, currentLow, last2High, last2Low;
   datetime lastTime, currentTime;

   if(sameTF)
     {
      if(i < 2)
         return;
      newTimeframe = true;                   // timeframe.change('') is true on each new bar
      lastClose    = close[i - 1];
      lastOpen     = open[i - 1];
      lastTime     = time[i - 1];
      currentHigh  = high[i];
      currentLow   = low[i];
      currentTime  = time[i];
      last2High    = high[i - 2];
      last2Low     = low[i - 2];
     }
   else
     {
      int sh = iBarShift(_Symbol, tf, time[i], false);
      if(sh < 0 || i < 1)
         return;
      int shPrev   = iBarShift(_Symbol, tf, time[i - 1], false);
      newTimeframe = (sh != shPrev);
      if(sh + 2 >= Bars(_Symbol, tf))
         return;                             // not enough HTF history yet
      lastClose   = iClose(_Symbol, tf, sh + 1);
      lastOpen    = iOpen(_Symbol, tf, sh + 1);
      lastTime    = iTime(_Symbol, tf, sh + 1);
      currentHigh = iHigh(_Symbol, tf, sh);
      currentLow  = iLow(_Symbol, tf, sh);
      currentTime = iTime(_Symbol, tf, sh);
      last2High   = iHigh(_Symbol, tf, sh + 2);
      last2Low    = iLow(_Symbol, tf, sh + 2);
     }

   if(lastOpen == 0.0)
      return;

   double barDeltaPercent = (lastClose - lastOpen) / (lastOpen * 100.0);
   if(newTimeframe)
      g_cumFVGDelta += MathAbs(barDeltaPercent);
   double threshold = 0.0;
   if(InpFVGAutoThreshold && i > 0)
      threshold = g_cumFVGDelta / (double)i * 2.0;

   bool bullishFVG = currentLow > last2High && lastClose > last2High &&
                     barDeltaPercent > threshold && newTimeframe;
   bool bearishFVG = currentHigh < last2Low && lastClose < last2Low &&
                     (-barDeltaPercent) > threshold && newTimeframe;

   int barSec = PeriodSeconds(PERIOD_CURRENT);
   datetime rightTime = currentTime + (long)InpFVGExtend * (long)barSec;

   if(bullishFVG)
     {
      QueueAlert("Bullish FVG formed");
      SFVG f;
      f.top    = currentLow;
      f.bottom = last2High;
      f.bias   = SMC_BULLISH;
      f.id     = g_fvgId;
      g_fvgId++;
      NewFVGBoxes(lastTime, rightTime, f.top, f.bottom, FVGBullColor(), f.id);
      // unshift
      int n = ArraySize(g_fvgs);
      ArrayResize(g_fvgs, n + 1);
      for(int k = n; k > 0; k--)
         g_fvgs[k] = g_fvgs[k - 1];
      g_fvgs[0] = f;
     }
   if(bearishFVG)
     {
      QueueAlert("Bearish FVG formed");
      SFVG f;
      f.top    = currentHigh;
      f.bottom = last2Low;
      f.bias   = SMC_BEARISH;
      f.id     = g_fvgId;
      g_fvgId++;
      NewFVGBoxes(lastTime, rightTime, f.top, f.bottom, FVGBearColor(), f.id);
      int n = ArraySize(g_fvgs);
      ArrayResize(g_fvgs, n + 1);
      for(int k = n; k > 0; k--)
         g_fvgs[k] = g_fvgs[k - 1];
      g_fvgs[0] = f;
     }
  }

//+------------------------------------------------------------------+
//| Trailing extremes (updateTrailingExtremes equivalent)            |
//+------------------------------------------------------------------+
void UpdateTrailingExtremes(const int i, const datetime &time[],
                            const double &high[], const double &low[])
  {
   // Pine: math.max(high, na) stays na - nothing updates until the
   // first swing pivots initialise the extremes
   if(g_trailTopInit && high[i] >= g_trailTop)
     {
      g_trailTop         = high[i];
      g_trailLastTopTime = time[i];
     }
   if(g_trailBotInit && low[i] <= g_trailBottom)
     {
      g_trailBottom      = low[i];
      g_trailLastBotTime = time[i];
     }
  }

//+------------------------------------------------------------------+
//| Strong/Weak High-Low lines (drawHighLowSwings equivalent)        |
//+------------------------------------------------------------------+
void DrawHighLowSwings(const datetime rightTime)
  {
   if(!g_trailTopInit || !g_trailBotInit)
      return;
   ObjLine(g_prefix + "HLS_TL", g_trailLastTopTime, g_trailTop, rightTime, g_trailTop,
           SwingBearColor(), STYLE_SOLID);
   ObjText(g_prefix + "HLS_TT", rightTime, g_trailTop,
           (g_swingTrend == SMC_BEARISH) ? "Strong High" : "Weak High",
           SwingBearColor(), ANCHOR_LOWER, (int)SMC_TINY);
   ObjLine(g_prefix + "HLS_BL", g_trailLastBotTime, g_trailBottom, rightTime, g_trailBottom,
           SwingBullColor(), STYLE_SOLID);
   ObjText(g_prefix + "HLS_BT", rightTime, g_trailBottom,
           (g_swingTrend == SMC_BULLISH) ? "Strong Low" : "Weak Low",
           SwingBullColor(), ANCHOR_UPPER, (int)SMC_TINY);
  }

//+------------------------------------------------------------------+
//| Premium / Discount / Equilibrium zones                           |
//+------------------------------------------------------------------+
void DrawPremiumDiscountZones(const int lastIdx, const datetime &time[])
  {
   if(!g_trailTopInit || !g_trailBotInit || g_trailBarIndex < 0)
      return;

   datetime lastTime = time[lastIdx];
   int mid = (int)MathRound(0.5 * (g_trailBarIndex + lastIdx));
   if(mid < 0)
      mid = 0;
   if(mid > lastIdx)
      mid = lastIdx;
   datetime midTime = time[mid];

   // Premium: top .. 0.95*top + 0.05*bottom
   double premBottom = 0.95 * g_trailTop + 0.05 * g_trailBottom;
   ObjRect(g_prefix + "ZONE_P", g_trailBarTime, g_trailTop, lastTime, premBottom,
           PremiumZoneColor());
   ObjText(g_prefix + "ZONT_P", midTime, g_trailTop, "Premium", PremiumZoneColor(),
           ANCHOR_LOWER, (int)SMC_SMALL);

   // Equilibrium band
   double eqTop    = 0.525 * g_trailTop + 0.475 * g_trailBottom;
   double eqBottom = 0.525 * g_trailBottom + 0.475 * g_trailTop;
   double eqLevel  = 0.5 * (g_trailTop + g_trailBottom);
   ObjRect(g_prefix + "ZONE_E", g_trailBarTime, eqTop, lastTime, eqBottom,
           InpEquilibriumZoneColor);
   ObjText(g_prefix + "ZONT_E", lastTime, eqLevel, "Equilibrium", InpEquilibriumZoneColor,
           ANCHOR_LEFT, (int)SMC_SMALL);

   // Discount: 0.95*bottom + 0.05*top .. bottom
   double discTop = 0.95 * g_trailBottom + 0.05 * g_trailTop;
   ObjRect(g_prefix + "ZONE_D", g_trailBarTime, discTop, lastTime, g_trailBottom,
           DiscountZoneColor());
   ObjText(g_prefix + "ZONT_D", midTime, g_trailBottom, "Discount", DiscountZoneColor(),
           ANCHOR_UPPER, (int)SMC_SMALL);
  }

//+------------------------------------------------------------------+
//| Previous Daily / Weekly / Monthly high-low levels                |
//+------------------------------------------------------------------+
void DrawPeriodLevels(const ENUM_TIMEFRAMES tf, const string tag,
                      const ENUM_SMC_LSTYLE lstyle, const color clr,
                      const int lastIdx, const datetime &time[],
                      const double &high[], const double &low[])
  {
   string lnT = g_prefix + "LVL_" + tag + "_HL";
   string lnB = g_prefix + "LVL_" + tag + "_LL";
   string lbT = g_prefix + "LVL_" + tag + "_HT";
   string lbB = g_prefix + "LVL_" + tag + "_LT";

   // skip if chart timeframe is higher than the level timeframe
   if(PeriodSeconds(PERIOD_CURRENT) > PeriodSeconds(tf))
     {
      ObjHide(lnT);
      ObjHide(lnB);
      ObjHide(lbT);
      ObjHide(lbB);
      return;
     }

   datetime rightTime = time[lastIdx] + 20L * (long)PeriodSeconds(PERIOD_CURRENT);
   bool sameTF = ((ENUM_TIMEFRAMES)Period() == tf);

   double   parsedTop, parsedBottom;
   datetime topTime, bottomTime;

   if(sameTF)
     {
      parsedTop    = high[lastIdx];
      parsedBottom = low[lastIdx];
      topTime      = time[lastIdx];
      bottomTime   = time[lastIdx];
     }
   else
     {
      if(Bars(_Symbol, tf) < 2)
         return;
      parsedTop    = iHigh(_Symbol, tf, 1);
      parsedBottom = iLow(_Symbol, tf, 1);
      datetime prevStart = iTime(_Symbol, tf, 1);
      datetime currStart = iTime(_Symbol, tf, 0);
      if(parsedTop == 0.0 || prevStart == 0)
         return;
      // locate the chart bars of the extremes within the previous period
      int sStart = iBarShift(_Symbol, PERIOD_CURRENT, prevStart, false);
      int sEnd   = iBarShift(_Symbol, PERIOD_CURRENT, currStart, false);
      topTime    = prevStart;
      bottomTime = prevStart;
      if(sStart > sEnd && sEnd >= 0)
        {
         int count = sStart - sEnd;
         int ih    = iHighest(_Symbol, PERIOD_CURRENT, MODE_HIGH, count, sEnd + 1);
         int il    = iLowest(_Symbol, PERIOD_CURRENT, MODE_LOW, count, sEnd + 1);
         if(ih >= 0)
            topTime = iTime(_Symbol, PERIOD_CURRENT, ih);
         if(il >= 0)
            bottomTime = iTime(_Symbol, PERIOD_CURRENT, il);
        }
     }

   ENUM_LINE_STYLE st = MapLineStyle(lstyle);
   ObjLine(lnT, topTime, parsedTop, rightTime, parsedTop, clr, st);
   ObjText(lbT, rightTime, parsedTop, "P" + tag + "H", clr, ANCHOR_LEFT, (int)SMC_SMALL);
   ObjLine(lnB, bottomTime, parsedBottom, rightTime, parsedBottom, clr, st);
   ObjText(lbB, rightTime, parsedBottom, "P" + tag + "L", clr, ANCHOR_LEFT, (int)SMC_SMALL);
  }

//+------------------------------------------------------------------+
//| Per-bar processing (one Pine script execution per closed bar)    |
//+------------------------------------------------------------------+
void ProcessBar(const int i, const datetime &time[], const double &open[],
                const double &high[], const double &low[], const double &close[])
  {
   //--- volatility bookkeeping (ta.atr(200) / ta.cum(ta.tr)/bar_index)
   double tr;
   if(i == 0)
      tr = high[0] - low[0];
   else
      tr = MathMax(high[i] - low[i],
                   MathMax(MathAbs(high[i] - close[i - 1]),
                           MathAbs(low[i] - close[i - 1])));
   g_cumTR += tr;
   if(i == 0)
      g_atr[0] = tr;
   else if(i < 200)
      g_atr[i] = (g_atr[i - 1] * (double)i + tr) / (double)(i + 1);
   else
      g_atr[i] = (g_atr[i - 1] * 199.0 + tr) / 200.0;

   double vol = (InpOrderBlockFilter == SMC_ATR) ? g_atr[i]
                : ((i > 0) ? g_cumTR / (double)i : tr);
   bool highVolatilityBar = (high[i] - low[i]) >= (2.0 * vol);
   g_pHigh[i] = highVolatilityBar ? low[i] : high[i];
   g_pLow[i]  = highVolatilityBar ? high[i] : low[i];

   //--- plotcandle (uses the internal trend bias BEFORE this bar updates it)
   FillCandleBuffer(i, open, high, low, close);

   //--- trailing extremes
   if(InpShowHighLowSwings || InpShowPremiumDiscount)
      UpdateTrailingExtremes(i, time, high, low);

   //--- FVG mitigation
   if(InpShowFairValueGaps)
      DeleteFairValueGaps(i, high, low);

   //--- swing / internal / equal structure detection
   GetCurrentStructure(i, g_swingsLength, false, false, time, high, low);
   GetCurrentStructure(i, 5, false, true, time, high, low);
   if(InpShowEqualHighsLows)
      GetCurrentStructure(i, g_eqLength, true, false, time, high, low);

   //--- BOS / CHoCH detection + order block storage
   if(InpShowInternals || InpShowInternalOrderBlocks || InpColorCandles)
      DisplayStructure(i, true, time, open, high, low, close);
   if(InpShowStructure || InpShowSwingOrderBlocks || InpShowHighLowSwings)
      DisplayStructure(i, false, time, open, high, low, close);

   //--- order block mitigation
   if(InpShowInternalOrderBlocks)
      DeleteOrderBlocks(i, true, high, low, close);
   if(InpShowSwingOrderBlocks)
      DeleteOrderBlocks(i, false, high, low, close);

   //--- fair value gap detection
   if(InpShowFairValueGaps)
      DrawFairValueGaps(i, time, open, high, low, close);
  }

//+------------------------------------------------------------------+
//| Last-bar visuals (things Pine redraws on barstate.islast)        |
//+------------------------------------------------------------------+
void RedrawLastBarVisuals(const int rates_total, const datetime &time[],
                          const double &high[], const double &low[])
  {
   int lastIdx = rates_total - 1;
   datetime rightTime = time[lastIdx] + 20L * (long)PeriodSeconds(PERIOD_CURRENT);

   if(InpShowHighLowSwings)
      DrawHighLowSwings(rightTime);
   if(InpShowPremiumDiscount)
      DrawPremiumDiscountZones(lastIdx, time);

   if(InpShowInternalOrderBlocks)
      DrawOrderBlocksNow(true, rightTime);
   if(InpShowSwingOrderBlocks)
      DrawOrderBlocksNow(false, rightTime);

   if(InpShowDailyLevels)
      DrawPeriodLevels(PERIOD_D1, "D", InpDailyLevelsStyle, InpDailyLevelsColor,
                       lastIdx, time, high, low);
   if(InpShowWeeklyLevels)
      DrawPeriodLevels(PERIOD_W1, "W", InpWeeklyLevelsStyle, InpWeeklyLevelsColor,
                       lastIdx, time, high, low);
   if(InpShowMonthlyLevels)
      DrawPeriodLevels(PERIOD_MN1, "M", InpMonthlyLevelsStyle, InpMonthlyLevelsColor,
                       lastIdx, time, high, low);
  }

//+------------------------------------------------------------------+
//| Full state reset                                                 |
//+------------------------------------------------------------------+
void ResetAll()
  {
   ObjectsDeleteAll(0, g_prefix);

   g_next        = 0;
   g_counter     = 0;
   g_fvgId       = 0;
   g_live        = false;
   g_cumTR       = 0.0;
   g_cumFVGDelta = 0.0;

   for(int k = 0; k < 6; k++)
      ResetPivot(g_pivots[k]);
   for(int k = 0; k < 3; k++)
      g_leg[k] = 0;

   g_swingTrend    = 0;
   g_internalTrend = 0;

   g_trailTop         = 0.0;
   g_trailBottom      = 0.0;
   g_trailBarTime     = 0;
   g_trailBarIndex    = -1;
   g_trailLastTopTime = 0;
   g_trailLastBotTime = 0;
   g_trailTopInit     = false;
   g_trailBotInit     = false;

   ArrayResize(g_internalOB, 0);
   ArrayResize(g_swingOB, 0);
   ArrayResize(g_fvgs, 0);
  }

//+------------------------------------------------------------------+
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
  {
   //--- clamp constrained inputs to the Pine minval/maxval ranges
   g_swingsLength = (int)MathMax(InpSwingsLength, 10);
   g_eqLength     = (int)MathMax(InpEqualHighsLowsLength, 1);
   g_eqThreshold  = MathMin(MathMax(InpEqualHighsLowsThreshold, 0.0), 0.5);
   g_iObCount     = (int)MathMin((int)MathMax(InpInternalOrderBlocksSize, 1), 20);
   g_sObCount     = (int)MathMin((int)MathMax(InpSwingOrderBlocksSize, 1), 20);

   g_prefix = StringFormat("GIOSMC_%u_", GetTickCount());

   SetIndexBuffer(0, BufOpen, INDICATOR_DATA);
   SetIndexBuffer(1, BufHigh, INDICATOR_DATA);
   SetIndexBuffer(2, BufLow, INDICATOR_DATA);
   SetIndexBuffer(3, BufClose, INDICATOR_DATA);
   SetIndexBuffer(4, BufColor, INDICATOR_COLOR_INDEX);

   ArraySetAsSeries(BufOpen, false);
   ArraySetAsSeries(BufHigh, false);
   ArraySetAsSeries(BufLow, false);
   ArraySetAsSeries(BufClose, false);
   ArraySetAsSeries(BufColor, false);

   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetInteger(0, PLOT_COLOR_INDEXES, 2);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 0, SwingBullColor());
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 1, SwingBearColor());
   PlotIndexSetInteger(0, PLOT_SHOW_DATA, InpColorCandles);

   IndicatorSetString(INDICATOR_SHORTNAME, "GIO SMC");
   IndicatorSetInteger(INDICATOR_DIGITS, _Digits);

   ResetAll();
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| OnDeinit                                                         |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   ObjectsDeleteAll(0, g_prefix);
   ChartRedraw();
  }

//+------------------------------------------------------------------+
//| OnCalculate                                                      |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
  {
   if(rates_total < 10)
      return(0);

   //--- force natural indexing (0 = oldest bar), like Pine's bar_index
   ArraySetAsSeries(time, false);
   ArraySetAsSeries(open, false);
   ArraySetAsSeries(high, false);
   ArraySetAsSeries(low, false);
   ArraySetAsSeries(close, false);

   if(prev_calculated == 0)
      ResetAll();

   //--- per-bar auxiliary arrays
   if(ArraySize(g_atr) < rates_total)
     {
      ArrayResize(g_atr, rates_total, 10000);
      ArrayResize(g_pHigh, rates_total, 10000);
      ArrayResize(g_pLow, rates_total, 10000);
     }

   //--- process all newly CONFIRMED bars exactly once
   int  lastConfirmed = rates_total - 2;
   bool processed     = false;
   for(int i = g_next; i <= lastConfirmed && !IsStopped(); i++)
     {
      ProcessBar(i, time, open, high, low, close);
      processed = true;
     }
   if(g_next <= lastConfirmed)
      g_next = lastConfirmed + 1;

   //--- keep the live (forming) bar's candle plot in sync
   FillCandleBuffer(rates_total - 1, open, high, low, close);

   //--- last-bar visuals (order blocks, zones, strong/weak, MTF levels)
   if(processed || prev_calculated == 0)
     {
      RedrawLastBarVisuals(rates_total, time, high, low);
      ChartRedraw();
     }

   g_live = true;
   return(rates_total);
  }
//+------------------------------------------------------------------+
