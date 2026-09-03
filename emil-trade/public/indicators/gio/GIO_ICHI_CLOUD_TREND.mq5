//+------------------------------------------------------------------+
//|                                       GIO_ICHI_CLOUD_TREND.mq5    |
//|                                       GIO ICHI CLOUD TREND        |
//|                                                                  |
//|  Chart indicator: MT5 built-in Ichimoku Kumo (cloud only) plus  |
//|  an internal Donchian Trend Ribbon, producing non-repainting    |
//|  Buy / Sell arrows on CLOSED candles.                            |
//|                                                                  |
//|  BUY  : previous closed candle closes ABOVE the cloud AND the    |
//|         Donchian ribbon is GREEN (bullish).                      |
//|  SELL : previous closed candle closes BELOW the cloud AND the    |
//|         Donchian ribbon is RED (bearish).                        |
//|                                                                  |
//|  Hidden buffers (Signal / Cloud position / Ribbon direction)    |
//|  let an EA or another tool read the state via iCustom.           |
//+------------------------------------------------------------------+
#property copyright "GIO"
#property link      ""
#property version   "1.00"
#property strict
#property indicator_chart_window
#property indicator_buffers 7
#property indicator_plots   6

//--- Plot 1 : Kumo (cloud) as a filling between Span A and Span B
//    Muted teal / maroon to match the TradingView SuperIchi cloud look.
#property indicator_label1  "Span A;Span B"
#property indicator_type1   DRAW_FILLING
#property indicator_color1  clrTeal, clrMaroon
#property indicator_width1  1

//--- Plot 2 : Buy arrow
#property indicator_label2  "Buy"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrLime
#property indicator_width2  2

//--- Plot 3 : Sell arrow
#property indicator_label3  "Sell"
#property indicator_type3   DRAW_ARROW
#property indicator_color3  clrRed
#property indicator_width3  2

//--- Plot 4..6 : hidden state buffers (readable through iCustom)
#property indicator_label4  "Signal"
#property indicator_type4   DRAW_NONE
#property indicator_label5  "RibbonDir"
#property indicator_type5   DRAW_NONE
#property indicator_label6  "CloudPos"
#property indicator_type6   DRAW_NONE

//==================================================================
//  INPUTS
//==================================================================
input group "Ichimoku Cloud";
input int    InpTenkan        = 9;    // Tenkan-Sen
input int    InpKijun         = 26;   // Kijun-Sen
input int    InpSenkouB       = 52;   // Senkou Span B
//  Displacement is fixed at Kijun (26) by the MT5 built-in Ichimoku.

input group "Donchian Trend Ribbon";
input int    InpRibbonPeriod  = 20;   // Ribbon Period

input group "Signals";
input bool   InpShowArrows    = true;  // Draw Buy/Sell arrows
input bool   InpShowSignalTags = true; // Draw BUY/SELL text tags
input int    InpSignalHistoryBars = 500; // How far back to draw tags
input double InpArrowOffsetPoints = 60.0; // Arrow distance from candle (points)
input int    InpMinBarsBetweenSignals = 3; // Min bars between signals (0 = off)

input group "Dashboard";
input bool   InpShowDashboard = true;  // Show info panel
input bool   InpDarkPanel     = true;  // Dark panel background
input int    InpATRPeriod     = 14;    // ATR period (panel)

input group "Alerts";
input bool   InpAlertPopup    = true;  // Popup alert
input bool   InpAlertPush     = false; // Push notification
input bool   InpAlertEmail    = false; // Email alert
input bool   InpAlertSound    = false; // Sound alert
input string InpAlertSoundFile = "alert.wav";

//==================================================================
//  BUFFERS / GLOBALS
//==================================================================
double SpanABuffer[];
double SpanBBuffer[];
double BuyArrowBuffer[];
double SellArrowBuffer[];
double SignalBuffer[];
double RibbonDirBuffer[];
double CloudPosBuffer[];

int      g_ichiHandle = INVALID_HANDLE;
int      g_atrHandle  = INVALID_HANDLE;
string   PREFIX       = "GIO_ICT_";
datetime g_lastAlertBar = 0;

//+------------------------------------------------------------------+
//| Donchian ribbon trend at one bar (series indexing, 1 = last)     |
//|  +1 bullish, -1 bearish, else carries the previous trend.        |
//+------------------------------------------------------------------+
int RibbonTrendAt(const double &high[],
                  const double &low[],
                  const double &close[],
                  const int total,
                  const int index,
                  const int length,
                  const int previousTrend)
{
   if(index + length >= total)
      return previousTrend;

   double highestHigh = high[index + 1];
   double lowestLow   = low[index + 1];

   for(int offset = 2; offset <= length; offset++)
   {
      const int lookbackIndex = index + offset;
      if(lookbackIndex >= total)
         break;

      if(high[lookbackIndex] > highestHigh)
         highestHigh = high[lookbackIndex];
      if(low[lookbackIndex] < lowestLow)
         lowestLow = low[lookbackIndex];
   }

   if(close[index] > highestHigh)
      return 1;
   if(close[index] < lowestLow)
      return -1;

   return previousTrend;
}

//+------------------------------------------------------------------+
string TFToString(const ENUM_TIMEFRAMES tf)
{
   string s = EnumToString(tf);
   StringReplace(s, "PERIOD_", "");
   return s;
}

//+------------------------------------------------------------------+
void DrawSignalTag(const string name, const datetime when, const double price,
                   const string text, const color clr)
{
   const string obj = PREFIX + name;
   if(ObjectFind(0, obj) < 0)
      ObjectCreate(0, obj, OBJ_TEXT, 0, when, price);
   else
      ObjectMove(0, obj, 0, when, price);

   ObjectSetString(0, obj, OBJPROP_TEXT, text);
   ObjectSetInteger(0, obj, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, obj, OBJPROP_FONTSIZE, 9);
   ObjectSetInteger(0, obj, OBJPROP_ANCHOR, ANCHOR_CENTER);
   ObjectSetInteger(0, obj, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, obj, OBJPROP_HIDDEN, true);
}

//+------------------------------------------------------------------+
void SetPanelLabel(const string name, const string text, const int x, const int y,
                   const color clr, const int size, const bool bold)
{
   const string obj = PREFIX + name;
   if(ObjectFind(0, obj) < 0)
      ObjectCreate(0, obj, OBJ_LABEL, 0, 0, 0);

   ObjectSetInteger(0, obj, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, obj, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, obj, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, obj, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, obj, OBJPROP_FONTSIZE, size);
   ObjectSetString(0, obj, OBJPROP_FONT, bold ? "Arial Bold" : "Consolas");
   ObjectSetString(0, obj, OBJPROP_TEXT, text);
   ObjectSetInteger(0, obj, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, obj, OBJPROP_HIDDEN, true);
}

//+------------------------------------------------------------------+
void SetPanelBG(const int w, const int h)
{
   const string obj = PREFIX + "BG";
   if(ObjectFind(0, obj) < 0)
      ObjectCreate(0, obj, OBJ_RECTANGLE_LABEL, 0, 0, 0);

   ObjectSetInteger(0, obj, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, obj, OBJPROP_XDISTANCE, 8);
   ObjectSetInteger(0, obj, OBJPROP_YDISTANCE, 18);
   ObjectSetInteger(0, obj, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, obj, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, obj, OBJPROP_BGCOLOR, InpDarkPanel ? C'18,18,18' : clrWhiteSmoke);
   ObjectSetInteger(0, obj, OBJPROP_BORDER_COLOR, InpDarkPanel ? clrDimGray : clrSilver);
   ObjectSetInteger(0, obj, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, obj, OBJPROP_BACK, false);
   ObjectSetInteger(0, obj, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, obj, OBJPROP_HIDDEN, true);
}

//+------------------------------------------------------------------+
string DirWord(const int dir, const string pos, const string neg, const string zero)
{
   if(dir > 0) return pos;
   if(dir < 0) return neg;
   return zero;
}

//+------------------------------------------------------------------+
void DrawDashboard(const int cloudPos, const int ribbonDir, const int signal,
                   const double atr)
{
   if(!InpShowDashboard)
      return;

   SetPanelBG(250, 168);
   const color title = InpDarkPanel ? clrWhite : clrBlack;
   const color muted = InpDarkPanel ? clrSilver : clrDimGray;
   const color green = clrLime;
   const color red   = clrTomato;

   const int composite = (cloudPos > 0 && ribbonDir > 0) ? 1 :
                         ((cloudPos < 0 && ribbonDir < 0) ? -1 : 0);

   SetPanelLabel("T_TITLE", "GIO ICHI CLOUD TREND", 18, 26, title, 10, true);

   SetPanelLabel("T_TREND", "Trend     : " + DirWord(composite, "BULLISH", "BEARISH", "MIXED"),
                 18, 48, composite > 0 ? green : (composite < 0 ? red : muted), 9, false);
   SetPanelLabel("T_CLOUD", "Cloud     : " + DirWord(cloudPos, "PRICE ABOVE", "PRICE BELOW", "INSIDE"),
                 18, 66, cloudPos > 0 ? green : (cloudPos < 0 ? red : muted), 9, false);
   SetPanelLabel("T_RIB", "Ribbon    : " + DirWord(ribbonDir, "GREEN", "RED", "NEUTRAL"),
                 18, 84, ribbonDir > 0 ? green : (ribbonDir < 0 ? red : muted), 9, false);
   SetPanelLabel("T_SIG", "Signal    : " + DirWord(signal, "BUY", "SELL", "-- none --"),
                 18, 102, signal > 0 ? green : (signal < 0 ? red : muted), 9, true);

   const long spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   SetPanelLabel("T_SPRD", "Spread    : " + IntegerToString((int)spread) + " pts", 18, 120, muted, 9, false);
   SetPanelLabel("T_ATR", "ATR(" + IntegerToString(InpATRPeriod) + ")   : " +
                 DoubleToString(atr / _Point, 0) + " pts", 18, 138, muted, 9, false);
   SetPanelLabel("T_TF", "Timeframe : " + TFToString((ENUM_TIMEFRAMES)_Period), 18, 156, muted, 9, false);
}

//+------------------------------------------------------------------+
void FireAlerts(const int signal, const datetime barTime)
{
   if(signal == 0 || barTime == g_lastAlertBar)
      return;

   g_lastAlertBar = barTime;
   const string what = (signal > 0 ? "BUY signal" : "SELL signal");
   const string msg  = _Symbol + " " + TFToString((ENUM_TIMEFRAMES)_Period) +
                       " | GIO ICHI CLOUD TREND " + what;

   if(InpAlertPopup) Alert(msg);
   if(InpAlertPush)  SendNotification(msg);
   if(InpAlertEmail) SendMail("GIO ICHI CLOUD TREND", msg);
   if(InpAlertSound) PlaySound(InpAlertSoundFile);
}

//+------------------------------------------------------------------+
int OnInit()
{
   SetIndexBuffer(0, SpanABuffer,     INDICATOR_DATA);
   SetIndexBuffer(1, SpanBBuffer,     INDICATOR_DATA);
   SetIndexBuffer(2, BuyArrowBuffer,  INDICATOR_DATA);
   SetIndexBuffer(3, SellArrowBuffer, INDICATOR_DATA);
   SetIndexBuffer(4, SignalBuffer,    INDICATOR_DATA);
   SetIndexBuffer(5, RibbonDirBuffer, INDICATOR_DATA);
   SetIndexBuffer(6, CloudPosBuffer,  INDICATOR_DATA);

   ArraySetAsSeries(SpanABuffer,     true);
   ArraySetAsSeries(SpanBBuffer,     true);
   ArraySetAsSeries(BuyArrowBuffer,  true);
   ArraySetAsSeries(SellArrowBuffer, true);
   ArraySetAsSeries(SignalBuffer,    true);
   ArraySetAsSeries(RibbonDirBuffer, true);
   ArraySetAsSeries(CloudPosBuffer,  true);

   PlotIndexSetInteger(1, PLOT_ARROW, 233);   // up arrow (Wingdings)
   PlotIndexSetInteger(2, PLOT_ARROW, 234);   // down arrow

   for(int p = 0; p < 6; p++)
      PlotIndexSetDouble(p, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   g_ichiHandle = iIchimoku(_Symbol, _Period, InpTenkan, InpKijun, InpSenkouB);
   g_atrHandle  = iATR(_Symbol, _Period, MathMax(1, InpATRPeriod));

   if(g_ichiHandle == INVALID_HANDLE || g_atrHandle == INVALID_HANDLE)
   {
      Print("GIO ICHI CLOUD TREND: failed to create indicator handles.");
      return INIT_FAILED;
   }

   IndicatorSetString(INDICATOR_SHORTNAME, "GIO ICHI CLOUD TREND");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(g_ichiHandle != INVALID_HANDLE) IndicatorRelease(g_ichiHandle);
   if(g_atrHandle  != INVALID_HANDLE) IndicatorRelease(g_atrHandle);
   ObjectsDeleteAll(0, PREFIX);
}

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
   const int ribbonLen = MathMax(2, InpRibbonPeriod);
   const int minBars   = MathMax(InpSenkouB + InpKijun, ribbonLen) + 30;
   if(rates_total < minBars)
      return 0;

   ArraySetAsSeries(time,  true);
   ArraySetAsSeries(open,  true);
   ArraySetAsSeries(high,  true);
   ArraySetAsSeries(low,   true);
   ArraySetAsSeries(close, true);

   //--- Pull the Ichimoku Kumo (Span A / Span B) for the whole chart
   if(CopyBuffer(g_ichiHandle, SENKOUSPANA_LINE, 0, rates_total, SpanABuffer) <= 0)
      return prev_calculated;
   if(CopyBuffer(g_ichiHandle, SENKOUSPANB_LINE, 0, rates_total, SpanBBuffer) <= 0)
      return prev_calculated;

   //--- Treat not-yet-calculated cloud values (0) as empty so they do not draw
   for(int i = 0; i < rates_total; i++)
   {
      if(SpanABuffer[i] == 0.0) SpanABuffer[i] = EMPTY_VALUE;
      if(SpanBBuffer[i] == 0.0) SpanBBuffer[i] = EMPTY_VALUE;
   }

   //--- Clear the arrow / state buffers for the whole range
   ArrayInitialize(BuyArrowBuffer,  EMPTY_VALUE);
   ArrayInitialize(SellArrowBuffer, EMPTY_VALUE);
   ArrayInitialize(SignalBuffer,    0.0);
   ArrayInitialize(RibbonDirBuffer, 0.0);
   ArrayInitialize(CloudPosBuffer,  0.0);

   //--- Latest ATR (for the dashboard)
   double atrTmp[1];
   double atr = 0.0;
   if(CopyBuffer(g_atrHandle, 0, 0, 1, atrTmp) == 1)
      atr = atrTmp[0];

   const double arrowOffset = InpArrowOffsetPoints * _Point;

   //--- Reset the youngest bars (no completed signal there)
   BuyArrowBuffer[0]  = EMPTY_VALUE;
   SellArrowBuffer[0] = EMPTY_VALUE;
   SignalBuffer[0]    = 0.0;
   RibbonDirBuffer[0] = 0.0;
   CloudPosBuffer[0]  = 0.0;

   //--- Walk from oldest computable bar up to the last CLOSED bar (index 1)
   int trend = 0;
   int sigPrev = 0;        // alignment of the chronologically-previous bar
   int freshAtBar1 = 0;    // fresh transition signal on the last closed bar
   int lastSigBar = -1;    // bar index of the last emitted signal (for spacing)
   const int minGap = MathMax(0, InpMinBarsBetweenSignals);
   const int oldest = rates_total - ribbonLen - 2;

   for(int i = oldest; i >= 1; i--)
   {
      trend = RibbonTrendAt(high, low, close, rates_total, i, ribbonLen, trend);
      RibbonDirBuffer[i] = (double)trend;

      BuyArrowBuffer[i]  = EMPTY_VALUE;
      SellArrowBuffer[i] = EMPTY_VALUE;
      SignalBuffer[i]    = 0.0;
      CloudPosBuffer[i]  = 0.0;

      const double spanA = SpanABuffer[i];
      const double spanB = SpanBBuffer[i];
      if(spanA == EMPTY_VALUE || spanB == EMPTY_VALUE || spanA == 0.0 || spanB == 0.0)
      {
         sigPrev = 0;   // no cloud here -> "no signal" for the transition logic
         continue;
      }

      const double cloudTop = MathMax(spanA, spanB);
      const double cloudBot = MathMin(spanA, spanB);

      int cloudPos = 0;
      if(close[i] > cloudTop)      cloudPos = 1;
      else if(close[i] < cloudBot) cloudPos = -1;
      CloudPosBuffer[i] = (double)cloudPos;

      int signal = 0;
      if(cloudPos > 0 && trend > 0)      signal = 1;   // BUY alignment
      else if(cloudPos < 0 && trend < 0) signal = -1;  // SELL alignment
      SignalBuffer[i] = (double)signal;                // current alignment (dashboard / iCustom)

      // A *fresh* signal is only the bar where the alignment first appears (a
      // transition). This produces ONE arrow per setup instead of an arrow on
      // every bar of the trend.
      const bool freshBuy  = (signal ==  1 && sigPrev !=  1);
      const bool freshSell = (signal == -1 && sigPrev != -1);

      // Enforce a minimum spacing (in bars) since the previous emitted signal
      // so a flickering ribbon cannot stack arrows a few bars apart.
      const bool spaced = (lastSigBar < 0 || (lastSigBar - i) >= minGap);
      const bool emit   = (freshBuy || freshSell) && spaced;

      if(emit && freshBuy)
      {
         if(InpShowArrows)
            BuyArrowBuffer[i] = low[i] - arrowOffset;
         if(InpShowSignalTags && i <= InpSignalHistoryBars)
            DrawSignalTag("BUY_" + IntegerToString((long)time[i]), time[i],
                          low[i] - arrowOffset * 1.8, "BUY", clrLime);
      }
      else if(emit && freshSell)
      {
         if(InpShowArrows)
            SellArrowBuffer[i] = high[i] + arrowOffset;
         if(InpShowSignalTags && i <= InpSignalHistoryBars)
            DrawSignalTag("SELL_" + IntegerToString((long)time[i]), time[i],
                          high[i] + arrowOffset * 1.8, "SELL", clrRed);
      }

      if(emit)
         lastSigBar = i;
      if(i == 1)
         freshAtBar1 = emit ? (freshBuy ? 1 : -1) : 0;

      sigPrev = signal;
   }

   //--- Dashboard shows the current alignment; alerts fire ONCE per fresh signal
   const int sig1 = (int)SignalBuffer[1];
   DrawDashboard((int)CloudPosBuffer[1], (int)RibbonDirBuffer[1], sig1, atr);
   FireAlerts(freshAtBar1, time[1]);

   return rates_total;
}
//+------------------------------------------------------------------+
