//+------------------------------------------------------------------+
//|                                          GIO LNL TREND CLOUD.mq5 |
//|         1:1 MQL5 conversion of "LNL Trend System" (Pine Script)  |
//|                     Original study logic (c) L&L Capital          |
//+------------------------------------------------------------------+
//  GIO LNL TREND CLOUD is an ATR based day trading system designed
//  for intraday traders and scalpers. Components:
//    1) Trend Line  - 13 EMA, colored by an 8/13/21/34 VWMA stack.
//    2) Stop Line   - ATR deviation line(s) with a flip state machine.
//  5 Trend Modes: Tight / Normal / Loose / FOMC / Net (the "net"
//  combines all ATR widths into one stop-line net).
//  Trend Bars: DMI/ADX colored candles (ADX > 20 = trending).
//  HTF System: optional higher time frame Trend/Stop lines + cloud,
//  with Auto or Manual aggregation.
//
//  All parameters, values and logic are kept exactly as in the
//  original study. No parameters were changed or altered.
//+------------------------------------------------------------------+
#property copyright   "GIO"
#property version     "1.00"
#property description "GIO LNL TREND CLOUD - ATR based day trading trend system."
#property description "Trend Line (13 EMA) + ATR Stop Lines with 5 trend modes"
#property description "(Tight, Normal, Loose, FOMC, Net), DMI/ADX Trend Bars,"
#property description "HTF trend system (Auto/Manual) and trend clouds."
#property indicator_chart_window
#property indicator_buffers 33
#property indicator_plots   15

//--- trend modes (ATR aggressiveness), identical to the original
enum ENUM_TREND_MODE
  {
   MODE_TIGHT  = 0,  // Tight
   MODE_NORMAL = 1,  // Normal
   MODE_LOOSE  = 2,  // Loose
   MODE_FOMC   = 3,  // FOMC
   MODE_NET    = 4   // Net
  };

//--- HTF aggregation modes
enum ENUM_HTF_MODE
  {
   HTF_AUTO   = 0,   // Auto
   HTF_MANUAL = 1    // Manual
  };

//+------------------------------------------------------------------+
//| Inputs (kept 1:1 with the original study)                        |
//+------------------------------------------------------------------+
input group "Settings"
input ENUM_TREND_MODE InpTrendMode   = MODE_NORMAL;      // Trend Mode
input ENUM_HTF_MODE   InpHTFMode     = HTF_AUTO;         // HTF Mode
input ENUM_TIMEFRAMES InpHTFManual   = PERIOD_H1;        // HTF Aggregation (Manual mode)

input group "Trend Bars"
input bool  InpShowTrendBars = true;                     // Show Trend Bars
input color InpBarBullish    = C'39,194,46';             // Bullish
input color InpBarBearish    = C'255,0,0';               // Bearish
input color InpBarNeutral    = C'67,70,81';              // Neutral

input group "Trend Line"
input bool  InpShowTrend     = true;                     // Show Trend Line
input color InpTrendBullish  = C'39,194,46';             // Bullish
input color InpTrendBearish  = C'255,0,0';               // Bearish
input color InpTrendNeutral  = C'67,70,81';              // Neutral

input group "Stop Line"
input bool  InpShowStop      = true;                     // Show Stop Line
input color InpStopBullish   = C'39,194,46';             // Bullish
input color InpStopBearish   = C'255,0,0';               // Bearish

input group "Higher Time Frame Trend Line"
input bool  InpShowTrend2    = false;                    // Show HTF Trend Line
input color InpTrend2Bullish = C'39,194,46';             // Bullish
input color InpTrend2Bearish = C'255,0,0';               // Bearish
input color InpTrend2Neutral = C'67,70,81';              // Neutral

input group "Higher Time Frame Stop Line"
input bool  InpShowStop2     = false;                    // Show HTF Stop Line
input color InpStop2Bullish  = C'39,194,46';             // Bullish
input color InpStop2Bearish  = C'255,0,0';               // Bearish

input group "Trend Cloud"
input bool  InpShowCloud     = true;                     // Show Cloud
input color InpCloudBullish  = C'10,44,12';              // Bullish (pre-dimmed for dark charts)
input color InpCloudBearish  = C'44,10,10';              // Bearish (pre-dimmed for dark charts)

input group "Higher Time Frame Trend Cloud"
input bool  InpShowHTFCloud  = false;                    // Show HTF Cloud
input color InpCloud2Bullish = C'10,44,12';              // Bullish
input color InpCloud2Bearish = C'44,10,10';              // Bearish

//+------------------------------------------------------------------+
//| Indicator buffers                                                |
//+------------------------------------------------------------------+
//--- plot 0: main trend cloud (filling)
double BufFillTop[];
double BufFillBot[];
//--- plot 1: HTF trend cloud (filling)
double BufFillTop2[];
double BufFillBot2[];
//--- plot 2: trend bars (color candles)
double BufCandleO[];
double BufCandleH[];
double BufCandleL[];
double BufCandleC[];
double BufCandleClr[];
//--- plot 3: trend line (13 EMA)
double BufTrend[];
double BufTrendClr[];
//--- plot 4: stop line (main ATR)
double BufStop[];
double BufStopClr[];
//--- plot 5: stop line (ATR - 20)
double BufStopA[];
double BufStopAClr[];
//--- plots 6-8: net stop lines (ATR - 40 / -60 / -80), Net mode only
double BufNet[];
double BufNetClr[];
double BufNet1[];
double BufNet1Clr[];
double BufNet2[];
double BufNet2Clr[];
//--- plot 9: HTF trend line
double BufTrend2[];
double BufTrend2Clr[];
//--- plot 10: HTF stop line (main ATR)
double BufStop2[];
double BufStop2Clr[];
//--- plot 11: HTF stop line (ATR - 20)
double BufStop2A[];
double BufStop2AClr[];
//--- plots 12-14: HTF net stop lines, Net mode only
double BufHNet[];
double BufHNetClr[];
double BufHNet1[];
double BufHNet1Clr[];
double BufHNet2[];
double BufHNet2Clr[];

//+------------------------------------------------------------------+
//| Internal state arrays (current time frame)                       |
//+------------------------------------------------------------------+
double m_tr[];        // true range
double m_emaTr8[];    // EMA(TR, 8) - ATR base
double m_trend[];     // EMA(close, 13) - Trend Line
double m_rmaPlus[];   // RMA(+DM, 14)
double m_rmaMinus[];  // RMA(-DM, 14)
double m_rmaTr14[];   // RMA(TR, 14)
double m_adx[];       // RMA(DX, 14)
int    m_T[];         // stop line state, main ATR
int    m_T11[];       // stop line state, ATR - 20
int    m_TNET[];      // stop line state, ATR - 40 (Net)
int    m_TNET1[];     // stop line state, ATR - 60 (Net)
int    m_TNET2[];     // stop line state, ATR - 80 (Net)

//+------------------------------------------------------------------+
//| Higher time frame data                                           |
//+------------------------------------------------------------------+
#define HTF_BARS 3000

MqlRates g_htfRates[];
int      g_htfCount     = 0;
datetime g_lastHTFTime  = 0;
double   g_lastHTFClose = 0.0;
datetime g_firstHTFTime = 0;

double g_h_emaTr[];     // HTF EMA(TR, 8)
double g_h_trend[];     // HTF EMA(close, 13)
int    g_h_trendClr[];  // HTF trend line color index (0 bull / 1 bear / 2 neutral)
double g_h_stopMain[];  // HTF stop values (EMPTY_VALUE when no state)
int    g_h_TMain[];
double g_h_stopA[];
int    g_h_TA[];
double g_h_stopN[];
int    g_h_TN[];
double g_h_stopN1[];
int    g_h_TN1[];
double g_h_stopN2[];
int    g_h_TN2[];

//--- globals
ENUM_TIMEFRAMES g_htf    = PERIOD_CURRENT;
int             g_atrLen = 80;

//--- EMA smoothing factors
const double A8  = 2.0 / 9.0;    // EMA(8)
const double A13 = 2.0 / 14.0;   // EMA(13)

//+------------------------------------------------------------------+
//| ATR length per trend mode (identical to the original)            |
//+------------------------------------------------------------------+
int AtrLengthForMode(const ENUM_TREND_MODE mode)
  {
   switch(mode)
     {
      case MODE_TIGHT:  return(60);
      case MODE_NORMAL: return(80);
      case MODE_LOOSE:  return(100);
      case MODE_FOMC:   return(120);
      case MODE_NET:    return(140);
     }
   return(80);
  }

//+------------------------------------------------------------------+
//| Auto HTF aggregation (mirrors the original time frame pairs)     |
//+------------------------------------------------------------------+
ENUM_TIMEFRAMES AutoHTF(const ENUM_TIMEFRAMES tf)
  {
   switch(tf)
     {
      case PERIOD_M1:
      case PERIOD_M2:
      case PERIOD_M3:
      case PERIOD_M4:  return(PERIOD_M5);
      case PERIOD_M5:
      case PERIOD_M10:
      case PERIOD_M15: return(PERIOD_M30);
      case PERIOD_M30:
      case PERIOD_H1:
      case PERIOD_H2:  return(PERIOD_H4);
      case PERIOD_H3:
      case PERIOD_H4:  return(PERIOD_D1);
      case PERIOD_D1:  return(PERIOD_W1);
      case PERIOD_W1:  return(PERIOD_MN1);
      case PERIOD_MN1: return(PERIOD_MN1);
      default:         return(tf);
     }
  }

//+------------------------------------------------------------------+
//| Configure one color plot                                         |
//+------------------------------------------------------------------+
void ConfigPlot(const int plot_index, const ENUM_DRAW_TYPE draw_type,
                const string label, const int width, const int ncolors,
                const color c0, const color c1, const color c2)
  {
   PlotIndexSetInteger(plot_index, PLOT_DRAW_TYPE, draw_type);
   PlotIndexSetString(plot_index, PLOT_LABEL, label);
   PlotIndexSetInteger(plot_index, PLOT_LINE_WIDTH, width);
   PlotIndexSetInteger(plot_index, PLOT_COLOR_INDEXES, ncolors);
   PlotIndexSetInteger(plot_index, PLOT_LINE_COLOR, 0, c0);
   if(ncolors > 1)
      PlotIndexSetInteger(plot_index, PLOT_LINE_COLOR, 1, c1);
   if(ncolors > 2)
      PlotIndexSetInteger(plot_index, PLOT_LINE_COLOR, 2, c2);
   PlotIndexSetDouble(plot_index, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   if(draw_type == DRAW_COLOR_ARROW)
      PlotIndexSetInteger(plot_index, PLOT_ARROW, 158);   // small dot ("-" tiny char equivalent)
  }

//+------------------------------------------------------------------+
//| Custom indicator initialization function                         |
//+------------------------------------------------------------------+
int OnInit()
  {
   int b = 0;
//--- plot 0: main cloud
   SetIndexBuffer(b++, BufFillTop,   INDICATOR_DATA);
   SetIndexBuffer(b++, BufFillBot,   INDICATOR_DATA);
//--- plot 1: HTF cloud
   SetIndexBuffer(b++, BufFillTop2,  INDICATOR_DATA);
   SetIndexBuffer(b++, BufFillBot2,  INDICATOR_DATA);
//--- plot 2: trend bars
   SetIndexBuffer(b++, BufCandleO,   INDICATOR_DATA);
   SetIndexBuffer(b++, BufCandleH,   INDICATOR_DATA);
   SetIndexBuffer(b++, BufCandleL,   INDICATOR_DATA);
   SetIndexBuffer(b++, BufCandleC,   INDICATOR_DATA);
   SetIndexBuffer(b++, BufCandleClr, INDICATOR_COLOR_INDEX);
//--- plot 3: trend line
   SetIndexBuffer(b++, BufTrend,     INDICATOR_DATA);
   SetIndexBuffer(b++, BufTrendClr,  INDICATOR_COLOR_INDEX);
//--- plot 4: stop line main
   SetIndexBuffer(b++, BufStop,      INDICATOR_DATA);
   SetIndexBuffer(b++, BufStopClr,   INDICATOR_COLOR_INDEX);
//--- plot 5: stop line A
   SetIndexBuffer(b++, BufStopA,     INDICATOR_DATA);
   SetIndexBuffer(b++, BufStopAClr,  INDICATOR_COLOR_INDEX);
//--- plots 6-8: net lines
   SetIndexBuffer(b++, BufNet,       INDICATOR_DATA);
   SetIndexBuffer(b++, BufNetClr,    INDICATOR_COLOR_INDEX);
   SetIndexBuffer(b++, BufNet1,      INDICATOR_DATA);
   SetIndexBuffer(b++, BufNet1Clr,   INDICATOR_COLOR_INDEX);
   SetIndexBuffer(b++, BufNet2,      INDICATOR_DATA);
   SetIndexBuffer(b++, BufNet2Clr,   INDICATOR_COLOR_INDEX);
//--- plot 9: HTF trend line
   SetIndexBuffer(b++, BufTrend2,    INDICATOR_DATA);
   SetIndexBuffer(b++, BufTrend2Clr, INDICATOR_COLOR_INDEX);
//--- plot 10: HTF stop main
   SetIndexBuffer(b++, BufStop2,     INDICATOR_DATA);
   SetIndexBuffer(b++, BufStop2Clr,  INDICATOR_COLOR_INDEX);
//--- plot 11: HTF stop A
   SetIndexBuffer(b++, BufStop2A,    INDICATOR_DATA);
   SetIndexBuffer(b++, BufStop2AClr, INDICATOR_COLOR_INDEX);
//--- plots 12-14: HTF net lines
   SetIndexBuffer(b++, BufHNet,      INDICATOR_DATA);
   SetIndexBuffer(b++, BufHNetClr,   INDICATOR_COLOR_INDEX);
   SetIndexBuffer(b++, BufHNet1,     INDICATOR_DATA);
   SetIndexBuffer(b++, BufHNet1Clr,  INDICATOR_COLOR_INDEX);
   SetIndexBuffer(b++, BufHNet2,     INDICATOR_DATA);
   SetIndexBuffer(b++, BufHNet2Clr,  INDICATOR_COLOR_INDEX);

//--- plot 0: main trend cloud (filling: color 0 when Trend > Stop = bullish)
   PlotIndexSetInteger(0, PLOT_DRAW_TYPE, DRAW_FILLING);
   PlotIndexSetString(0, PLOT_LABEL, "Trend Cloud");
   PlotIndexSetInteger(0, PLOT_COLOR_INDEXES, 2);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 0, InpCloudBullish);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 1, InpCloudBearish);
   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, EMPTY_VALUE);

//--- plot 1: HTF trend cloud
   PlotIndexSetInteger(1, PLOT_DRAW_TYPE, DRAW_FILLING);
   PlotIndexSetString(1, PLOT_LABEL, "HTF Trend Cloud");
   PlotIndexSetInteger(1, PLOT_COLOR_INDEXES, 2);
   PlotIndexSetInteger(1, PLOT_LINE_COLOR, 0, InpCloud2Bullish);
   PlotIndexSetInteger(1, PLOT_LINE_COLOR, 1, InpCloud2Bearish);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, EMPTY_VALUE);

//--- plot 2: trend bars (DMI/ADX colored candles)
   PlotIndexSetInteger(2, PLOT_DRAW_TYPE, DRAW_COLOR_CANDLES);
   PlotIndexSetString(2, PLOT_LABEL, "Trend Bars Open;Trend Bars High;Trend Bars Low;Trend Bars Close");
   PlotIndexSetInteger(2, PLOT_COLOR_INDEXES, 3);
   PlotIndexSetInteger(2, PLOT_LINE_COLOR, 0, InpBarBullish);
   PlotIndexSetInteger(2, PLOT_LINE_COLOR, 1, InpBarBearish);
   PlotIndexSetInteger(2, PLOT_LINE_COLOR, 2, InpBarNeutral);
   PlotIndexSetDouble(2, PLOT_EMPTY_VALUE, EMPTY_VALUE);

//--- plot 3: trend line
   ConfigPlot(3, DRAW_COLOR_LINE, "Trend", 2, 3, InpTrendBullish, InpTrendBearish, InpTrendNeutral);
//--- plots 4-8: stop lines
   ConfigPlot(4, DRAW_COLOR_ARROW, "StopLine",     1, 2, InpStopBullish, InpStopBearish, clrNONE);
   ConfigPlot(5, DRAW_COLOR_ARROW, "StopLine2",    1, 2, InpStopBullish, InpStopBearish, clrNONE);
   ConfigPlot(6, DRAW_COLOR_ARROW, "StopLineNET",  1, 2, InpStopBullish, InpStopBearish, clrNONE);
   ConfigPlot(7, DRAW_COLOR_ARROW, "StopLineNET1", 1, 2, InpStopBullish, InpStopBearish, clrNONE);
   ConfigPlot(8, DRAW_COLOR_ARROW, "StopLineNET2", 1, 2, InpStopBullish, InpStopBearish, clrNONE);
//--- plot 9: HTF trend line
   ConfigPlot(9, DRAW_COLOR_LINE, "Trend2", 2, 3, InpTrend2Bullish, InpTrend2Bearish, InpTrend2Neutral);
//--- plots 10-14: HTF stop lines
   ConfigPlot(10, DRAW_COLOR_ARROW, "HTF StopLine",     1, 2, InpStop2Bullish, InpStop2Bearish, clrNONE);
   ConfigPlot(11, DRAW_COLOR_ARROW, "HTF StopLine A",   1, 2, InpStop2Bullish, InpStop2Bearish, clrNONE);
   ConfigPlot(12, DRAW_COLOR_ARROW, "HTF StopLineNET",  1, 2, InpStop2Bullish, InpStop2Bearish, clrNONE);
   ConfigPlot(13, DRAW_COLOR_ARROW, "HTF StopLineNET1", 1, 2, InpStop2Bullish, InpStop2Bearish, clrNONE);
   ConfigPlot(14, DRAW_COLOR_ARROW, "HTF StopLineNET2", 1, 2, InpStop2Bullish, InpStop2Bearish, clrNONE);

//--- resolve mode & HTF aggregation
   g_atrLen = AtrLengthForMode(InpTrendMode);
   g_htf    = (InpHTFMode == HTF_AUTO) ? AutoHTF(_Period) : InpHTFManual;
   if(g_htf == PERIOD_CURRENT)
      g_htf = _Period;

   g_htfCount     = 0;
   g_lastHTFTime  = 0;
   g_lastHTFClose = 0.0;
   g_firstHTFTime = 0;

   IndicatorSetInteger(INDICATOR_DIGITS, _Digits);
   IndicatorSetString(INDICATOR_SHORTNAME, "GIO LNL TREND CLOUD");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| VWMA on current time frame arrays                                |
//+------------------------------------------------------------------+
double VwmaTF(const double &price[], const long &vol[], const int i, const int len)
  {
   int n = (int)MathMin(len, i + 1);
   double sp = 0.0, sv = 0.0;
   for(int k = i - n + 1; k <= i; k++)
     {
      double v = (double)vol[k];
      sp += price[k] * v;
      sv += v;
     }
   return((sv > 0.0) ? sp / sv : price[i]);
  }

//+------------------------------------------------------------------+
//| VWMA on HTF rates                                                |
//+------------------------------------------------------------------+
double VwmaHTF(const int i, const int len)
  {
   int n = (int)MathMin(len, i + 1);
   double sp = 0.0, sv = 0.0;
   for(int k = i - n + 1; k <= i; k++)
     {
      double v = (double)g_htfRates[k].tick_volume;
      sp += g_htfRates[k].close * v;
      sv += v;
     }
   return((sv > 0.0) ? sp / sv : g_htfRates[i].close);
  }

//+------------------------------------------------------------------+
//| Last HTF bar index with time <= t (binary search), -1 if none    |
//+------------------------------------------------------------------+
int HTFIndexByTime(const datetime t)
  {
   int lo = 0, hi = g_htfCount - 1, res = -1;
   while(lo <= hi)
     {
      int mid = (lo + hi) / 2;
      if(g_htfRates[mid].time <= t)
        {
         res = mid;
         lo  = mid + 1;
        }
      else
         hi = mid - 1;
     }
   return(res);
  }

//+------------------------------------------------------------------+
//| Recompute the full HTF trend system (Trend Line + Stop Lines)    |
//+------------------------------------------------------------------+
bool UpdateHTF()
  {
   ArraySetAsSeries(g_htfRates, false);
   int copied = CopyRates(_Symbol, g_htf, 0, HTF_BARS, g_htfRates);
   if(copied <= 1)
      return(false);

//--- skip recompute if nothing changed
   datetime lt = g_htfRates[copied - 1].time;
   double   lc = g_htfRates[copied - 1].close;
   if(copied == g_htfCount && lt == g_lastHTFTime &&
      lc == g_lastHTFClose && g_htfRates[0].time == g_firstHTFTime)
      return(true);

   g_htfCount     = copied;
   g_lastHTFTime  = lt;
   g_lastHTFClose = lc;
   g_firstHTFTime = g_htfRates[0].time;

   ArrayResize(g_h_emaTr,    g_htfCount);
   ArrayResize(g_h_trend,    g_htfCount);
   ArrayResize(g_h_trendClr, g_htfCount);
   ArrayResize(g_h_stopMain, g_htfCount);
   ArrayResize(g_h_TMain,    g_htfCount);
   ArrayResize(g_h_stopA,    g_htfCount);
   ArrayResize(g_h_TA,       g_htfCount);
   ArrayResize(g_h_stopN,    g_htfCount);
   ArrayResize(g_h_TN,       g_htfCount);
   ArrayResize(g_h_stopN1,   g_htfCount);
   ArrayResize(g_h_TN1,      g_htfCount);
   ArrayResize(g_h_stopN2,   g_htfCount);
   ArrayResize(g_h_TN2,      g_htfCount);

   bool isNet    = (InpTrendMode == MODE_NET);
   bool prevDnA  = false;   // original uses previous-bar Down condition on these HTF lines
   bool prevDnN  = false;
   bool prevDnN1 = false;
   bool prevDnN2 = false;

   for(int i = 0; i < g_htfCount; i++)
     {
      double h = g_htfRates[i].high;
      double l = g_htfRates[i].low;
      double c = g_htfRates[i].close;

      double tr;
      if(i == 0)
         tr = h - l;
      else
        {
         double pc = g_htfRates[i - 1].close;
         tr = MathMax(h - l, MathMax(MathAbs(h - pc), MathAbs(l - pc)));
        }

      g_h_emaTr[i] = (i == 0) ? tr : tr * A8 + g_h_emaTr[i - 1] * (1.0 - A8);
      g_h_trend[i] = (i == 0) ? c  : c * A13 + g_h_trend[i - 1] * (1.0 - A13);

      //--- VWMA stack for HTF trend line color
      double v8  = VwmaHTF(i, 8);
      double v13 = VwmaHTF(i, 13);
      double v21 = VwmaHTF(i, 21);
      double v34 = VwmaHTF(i, 34);
      bool eu = (v8 > v13 && v13 > v21 && v21 > v34);
      bool ed = (v8 < v13 && v13 < v21 && v21 < v34);
      g_h_trendClr[i] = (ed && c <= g_h_trend[i]) ? 1 : (eu && c >= g_h_trend[i]) ? 0 : 2;

      double base = g_h_emaTr[i];

      //--- HTF stop line, main ATR
      double atr = (double)g_atrLen / 100.0 * base;
      bool up = (c > g_h_trend[i] + atr);
      bool dn = (c < g_h_trend[i] - atr);
      g_h_TMain[i]    = up ? 1 : dn ? -1 : ((i == 0) ? 0 : g_h_TMain[i - 1]);
      g_h_stopMain[i] = (g_h_TMain[i] == 1) ? g_h_trend[i] - atr :
                        (g_h_TMain[i] == -1) ? g_h_trend[i] + atr : EMPTY_VALUE;

      //--- HTF stop line, ATR - 20 (previous-bar Down, as in the original)
      double atrA = (double)(g_atrLen - 20) / 100.0 * base;
      bool upA = (c > g_h_trend[i] + atrA);
      bool dnA = (c < g_h_trend[i] - atrA);
      g_h_TA[i]    = upA ? 1 : prevDnA ? -1 : ((i == 0) ? 0 : g_h_TA[i - 1]);
      g_h_stopA[i] = (g_h_TA[i] == 1) ? g_h_trend[i] - atrA :
                     (g_h_TA[i] == -1) ? g_h_trend[i] + atrA : EMPTY_VALUE;
      prevDnA = dnA;

      //--- HTF net lines (Net mode only)
      if(isNet)
        {
         double atrN = (double)(g_atrLen - 40) / 100.0 * base;
         bool upN = (c > g_h_trend[i] + atrN);
         bool dnN = (c < g_h_trend[i] - atrN);
         g_h_TN[i]    = upN ? 1 : prevDnN ? -1 : ((i == 0) ? 0 : g_h_TN[i - 1]);
         g_h_stopN[i] = (g_h_TN[i] == 1) ? g_h_trend[i] - atrN :
                        (g_h_TN[i] == -1) ? g_h_trend[i] + atrN : EMPTY_VALUE;
         prevDnN = dnN;

         double atrN1 = (double)(g_atrLen - 60) / 100.0 * base;
         bool upN1 = (c > g_h_trend[i] + atrN1);
         bool dnN1 = (c < g_h_trend[i] - atrN1);
         g_h_TN1[i]    = upN1 ? 1 : prevDnN1 ? -1 : ((i == 0) ? 0 : g_h_TN1[i - 1]);
         g_h_stopN1[i] = (g_h_TN1[i] == 1) ? g_h_trend[i] - atrN1 :
                         (g_h_TN1[i] == -1) ? g_h_trend[i] + atrN1 : EMPTY_VALUE;
         prevDnN1 = dnN1;

         double atrN2 = (double)(g_atrLen - 80) / 100.0 * base;
         bool upN2 = (c > g_h_trend[i] + atrN2);
         bool dnN2 = (c < g_h_trend[i] - atrN2);
         g_h_TN2[i]    = upN2 ? 1 : prevDnN2 ? -1 : ((i == 0) ? 0 : g_h_TN2[i - 1]);
         g_h_stopN2[i] = (g_h_TN2[i] == 1) ? g_h_trend[i] - atrN2 :
                         (g_h_TN2[i] == -1) ? g_h_trend[i] + atrN2 : EMPTY_VALUE;
         prevDnN2 = dnN2;
        }
      else
        {
         g_h_TN[i]  = 0;  g_h_stopN[i]  = EMPTY_VALUE;
         g_h_TN1[i] = 0;  g_h_stopN1[i] = EMPTY_VALUE;
         g_h_TN2[i] = 0;  g_h_stopN2[i] = EMPTY_VALUE;
         prevDnN = false; prevDnN1 = false; prevDnN2 = false;
        }
     }
   return(true);
  }

//+------------------------------------------------------------------+
//| Map one HTF stop line onto a chart bar                           |
//+------------------------------------------------------------------+
void MapHTFStop(const bool show, const int i, const int h,
                const double &val[], const int &st[],
                double &buf[], double &clr[])
  {
   if(show && h >= 0 && st[h] != 0 && val[h] != EMPTY_VALUE)
     {
      buf[i] = val[h];
      clr[i] = (st[h] == 1) ? 0.0 : 1.0;
     }
   else
      buf[i] = EMPTY_VALUE;
  }

//+------------------------------------------------------------------+
//| Custom indicator iteration function                              |
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
   if(rates_total < 2)
      return(0);

   ArraySetAsSeries(time, false);
   ArraySetAsSeries(open, false);
   ArraySetAsSeries(high, false);
   ArraySetAsSeries(low, false);
   ArraySetAsSeries(close, false);
   ArraySetAsSeries(tick_volume, false);

//--- size internal state arrays
   if(ArraySize(m_tr) < rates_total)
     {
      ArrayResize(m_tr,       rates_total);
      ArrayResize(m_emaTr8,   rates_total);
      ArrayResize(m_trend,    rates_total);
      ArrayResize(m_rmaPlus,  rates_total);
      ArrayResize(m_rmaMinus, rates_total);
      ArrayResize(m_rmaTr14,  rates_total);
      ArrayResize(m_adx,      rates_total);
      ArrayResize(m_T,        rates_total);
      ArrayResize(m_T11,      rates_total);
      ArrayResize(m_TNET,     rates_total);
      ArrayResize(m_TNET1,    rates_total);
      ArrayResize(m_TNET2,    rates_total);
     }

//--- higher time frame system
   bool htfNeeded = (InpShowTrend2 || InpShowStop2 || InpShowHTFCloud);
   if(htfNeeded)
     {
      if(!UpdateHTF() && prev_calculated == 0)
         return(0);    // HTF history not ready yet, retry on next tick
     }

//--- determine the first bar to (re)calculate
   int start = (prev_calculated > 0) ? prev_calculated - 1 : 0;

   if(htfNeeded && g_htfCount > 0 && prev_calculated > 0)
     {
      // recalc from the first chart bar of the forming HTF bar (live HTF updates)
      datetime lastHTF = g_htfRates[g_htfCount - 1].time;
      int j = rates_total - 1;
      while(j > 0 && time[j - 1] >= lastHTF)
         j--;
      if(j < start)
         start = j;
     }

   int hIdx = -1;
   if(htfNeeded && g_htfCount > 0)
      hIdx = HTFIndexByTime(time[start]);

   bool isNet = (InpTrendMode == MODE_NET);

//--- main loop
   for(int i = start; i < rates_total; i++)
     {
      //--- True Range and base series
      double tr;
      if(i == 0)
         tr = high[i] - low[i];
      else
         tr = MathMax(high[i] - low[i],
                      MathMax(MathAbs(high[i] - close[i - 1]),
                              MathAbs(low[i] - close[i - 1])));
      m_tr[i]     = tr;
      m_emaTr8[i] = (i == 0) ? tr       : tr * A8 + m_emaTr8[i - 1] * (1.0 - A8);
      m_trend[i]  = (i == 0) ? close[i] : close[i] * A13 + m_trend[i - 1] * (1.0 - A13);

      //--- Trend Bars: DMI / ADX
      double upMove = (i == 0) ? 0.0 : high[i] - high[i - 1];
      double dnMove = (i == 0) ? 0.0 : low[i - 1] - low[i];
      double bullDM = (upMove > dnMove && upMove > 0.0) ? upMove : 0.0;
      double bearDM = (dnMove > upMove && dnMove > 0.0) ? dnMove : 0.0;
      m_rmaPlus[i]  = (i == 0) ? bullDM : (m_rmaPlus[i - 1] * 13.0 + bullDM) / 14.0;
      m_rmaMinus[i] = (i == 0) ? bearDM : (m_rmaMinus[i - 1] * 13.0 + bearDM) / 14.0;
      m_rmaTr14[i]  = (i == 0) ? tr     : (m_rmaTr14[i - 1] * 13.0 + tr) / 14.0;
      double dmiUp = (m_rmaTr14[i] > 0.0) ? 100.0 * m_rmaPlus[i] / m_rmaTr14[i] : 0.0;
      double dmiDn = (m_rmaTr14[i] > 0.0) ? 100.0 * m_rmaMinus[i] / m_rmaTr14[i] : 0.0;
      double dx = ((dmiUp + dmiDn) > 0.0) ? 100.0 * MathAbs(dmiUp - dmiDn) / (dmiUp + dmiDn) : 0.0;
      m_adx[i] = (i == 0) ? dx : (m_adx[i - 1] * 13.0 + dx) / 14.0;

      if(InpShowTrendBars)
        {
         BufCandleO[i] = open[i];
         BufCandleH[i] = high[i];
         BufCandleL[i] = low[i];
         BufCandleC[i] = close[i];
         BufCandleClr[i] = (dmiUp > dmiDn && m_adx[i] > 20.0) ? 0.0 :
                           (dmiUp < dmiDn && m_adx[i] > 20.0) ? 1.0 : 2.0;
        }
      else
        {
         BufCandleO[i] = EMPTY_VALUE;
         BufCandleH[i] = EMPTY_VALUE;
         BufCandleL[i] = EMPTY_VALUE;
         BufCandleC[i] = EMPTY_VALUE;
         BufCandleClr[i] = 2.0;
        }

      //--- Trend Line color: VWMA stack 8 / 13 / 21 / 34
      double v8  = VwmaTF(close, tick_volume, i, 8);
      double v13 = VwmaTF(close, tick_volume, i, 13);
      double v21 = VwmaTF(close, tick_volume, i, 21);
      double v34 = VwmaTF(close, tick_volume, i, 34);
      bool emaup = (v8 > v13 && v13 > v21 && v21 > v34);
      bool emadn = (v8 < v13 && v13 < v21 && v21 < v34);

      if(InpShowTrend)
        {
         BufTrend[i]    = m_trend[i];
         BufTrendClr[i] = (emadn && close[i] <= m_trend[i]) ? 1.0 :
                          (emaup && close[i] >= m_trend[i]) ? 0.0 : 2.0;
        }
      else
         BufTrend[i] = EMPTY_VALUE;

      //--- Stop Line, main ATR
      double atrBase = m_emaTr8[i];
      double atrMain = (double)g_atrLen / 100.0 * atrBase;
      bool up1 = (close[i] > m_trend[i] + atrMain);
      bool dn1 = (close[i] < m_trend[i] - atrMain);
      m_T[i] = up1 ? 1 : dn1 ? -1 : ((i == 0) ? 0 : m_T[i - 1]);
      double stopMain = EMPTY_VALUE;
      if(m_T[i] == 1)
         stopMain = m_trend[i] - atrMain;
      else if(m_T[i] == -1)
         stopMain = m_trend[i] + atrMain;

      if(InpShowStop && stopMain != EMPTY_VALUE)
        {
         BufStop[i]    = stopMain;
         BufStopClr[i] = (m_T[i] == 1) ? 0.0 : 1.0;
        }
      else
         BufStop[i] = EMPTY_VALUE;

      //--- Stop Line, ATR - 20 (plotted in all modes)
      double atrA = (double)(g_atrLen - 20) / 100.0 * atrBase;
      bool up11 = (close[i] > m_trend[i] + atrA);
      bool dn11 = (close[i] < m_trend[i] - atrA);
      m_T11[i] = up11 ? 1 : dn11 ? -1 : ((i == 0) ? 0 : m_T11[i - 1]);
      if(InpShowStop && m_T11[i] != 0)
        {
         BufStopA[i]    = (m_T11[i] == 1) ? m_trend[i] - atrA : m_trend[i] + atrA;
         BufStopAClr[i] = (m_T11[i] == 1) ? 0.0 : 1.0;
        }
      else
         BufStopA[i] = EMPTY_VALUE;

      //--- Net Stop Lines, ATR - 40 / -60 / -80 (Net mode only)
      if(isNet)
        {
         double atrN = (double)(g_atrLen - 40) / 100.0 * atrBase;
         bool upN = (close[i] > m_trend[i] + atrN);
         bool dnN = (close[i] < m_trend[i] - atrN);
         m_TNET[i] = upN ? 1 : dnN ? -1 : ((i == 0) ? 0 : m_TNET[i - 1]);
         if(InpShowStop && m_TNET[i] != 0)
           {
            BufNet[i]    = (m_TNET[i] == 1) ? m_trend[i] - atrN : m_trend[i] + atrN;
            BufNetClr[i] = (m_TNET[i] == 1) ? 0.0 : 1.0;
           }
         else
            BufNet[i] = EMPTY_VALUE;

         double atrN1 = (double)(g_atrLen - 60) / 100.0 * atrBase;
         bool upN1 = (close[i] > m_trend[i] + atrN1);
         bool dnN1 = (close[i] < m_trend[i] - atrN1);
         m_TNET1[i] = upN1 ? 1 : dnN1 ? -1 : ((i == 0) ? 0 : m_TNET1[i - 1]);
         if(InpShowStop && m_TNET1[i] != 0)
           {
            BufNet1[i]    = (m_TNET1[i] == 1) ? m_trend[i] - atrN1 : m_trend[i] + atrN1;
            BufNet1Clr[i] = (m_TNET1[i] == 1) ? 0.0 : 1.0;
           }
         else
            BufNet1[i] = EMPTY_VALUE;

         double atrN2 = (double)(g_atrLen - 80) / 100.0 * atrBase;
         bool upN2 = (close[i] > m_trend[i] + atrN2);
         bool dnN2 = (close[i] < m_trend[i] - atrN2);
         m_TNET2[i] = upN2 ? 1 : dnN2 ? -1 : ((i == 0) ? 0 : m_TNET2[i - 1]);
         if(InpShowStop && m_TNET2[i] != 0)
           {
            BufNet2[i]    = (m_TNET2[i] == 1) ? m_trend[i] - atrN2 : m_trend[i] + atrN2;
            BufNet2Clr[i] = (m_TNET2[i] == 1) ? 0.0 : 1.0;
           }
         else
            BufNet2[i] = EMPTY_VALUE;
        }
      else
        {
         m_TNET[i]  = 0;  BufNet[i]  = EMPTY_VALUE;
         m_TNET1[i] = 0;  BufNet1[i] = EMPTY_VALUE;
         m_TNET2[i] = 0;  BufNet2[i] = EMPTY_VALUE;
        }

      //--- Trend Cloud (between Trend Line and main Stop Line)
      if(InpShowCloud && stopMain != EMPTY_VALUE)
        {
         BufFillTop[i] = m_trend[i];
         BufFillBot[i] = stopMain;
        }
      else
        {
         BufFillTop[i] = EMPTY_VALUE;
         BufFillBot[i] = EMPTY_VALUE;
        }

      //--- Higher Time Frame system mapping
      if(htfNeeded && g_htfCount > 0)
        {
         while(hIdx + 1 < g_htfCount && g_htfRates[hIdx + 1].time <= time[i])
            hIdx++;

         if(InpShowTrend2 && hIdx >= 0)
           {
            BufTrend2[i]    = g_h_trend[hIdx];
            BufTrend2Clr[i] = (double)g_h_trendClr[hIdx];
           }
         else
            BufTrend2[i] = EMPTY_VALUE;

         MapHTFStop(InpShowStop2, i, hIdx, g_h_stopMain, g_h_TMain, BufStop2,  BufStop2Clr);
         MapHTFStop(InpShowStop2, i, hIdx, g_h_stopA,    g_h_TA,    BufStop2A, BufStop2AClr);
         MapHTFStop(InpShowStop2, i, hIdx, g_h_stopN,    g_h_TN,    BufHNet,   BufHNetClr);
         MapHTFStop(InpShowStop2, i, hIdx, g_h_stopN1,   g_h_TN1,   BufHNet1,  BufHNet1Clr);
         MapHTFStop(InpShowStop2, i, hIdx, g_h_stopN2,   g_h_TN2,   BufHNet2,  BufHNet2Clr);

         if(InpShowHTFCloud && hIdx >= 0 && g_h_TMain[hIdx] != 0 && g_h_stopMain[hIdx] != EMPTY_VALUE)
           {
            BufFillTop2[i] = g_h_trend[hIdx];
            BufFillBot2[i] = g_h_stopMain[hIdx];
           }
         else
           {
            BufFillTop2[i] = EMPTY_VALUE;
            BufFillBot2[i] = EMPTY_VALUE;
           }
        }
      else
        {
         BufTrend2[i]   = EMPTY_VALUE;
         BufStop2[i]    = EMPTY_VALUE;
         BufStop2A[i]   = EMPTY_VALUE;
         BufHNet[i]     = EMPTY_VALUE;
         BufHNet1[i]    = EMPTY_VALUE;
         BufHNet2[i]    = EMPTY_VALUE;
         BufFillTop2[i] = EMPTY_VALUE;
         BufFillBot2[i] = EMPTY_VALUE;
        }
     }

   return(rates_total);
  }
//+------------------------------------------------------------------+
