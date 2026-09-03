#property strict
#property indicator_chart_window
#property indicator_buffers 4
#property indicator_plots   4

#property indicator_label1  "AbsTrendUp"
#property indicator_type1   DRAW_LINE
#property indicator_color1  clrLime
#property indicator_width1  2

#property indicator_label2  "AbsTrendDown"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrTomato
#property indicator_width2  2

#property indicator_label3  "AbsBuy"
#property indicator_type3   DRAW_ARROW
#property indicator_color3  clrAqua
#property indicator_width3  1

#property indicator_label4  "AbsSell"
#property indicator_type4   DRAW_ARROW
#property indicator_color4  clrOrangeRed
#property indicator_width4  1

//=========================== Inputs ===========================//
input string InpGeneralHeader = "===== Absolute Indicator: General =====";
input bool   InpOnlyAllowedSymbols = true;
input bool   InpEnableAlerts = true;
input bool   InpEnablePushAlert = false;
input bool   InpEnableEmailAlert = false;

input string InpTrendHeader = "===== Trend Engine =====";
input int    InpFastEMA = 20;
input int    InpMidEMA = 50;
input int    InpSlowEMA = 200;
input int    InpADXPeriod = 14;
input double InpMinADX = 25.0;
input int    InpATRPeriod = 14;
input double InpATRExpansionFactor = 1.10;
input int    InpVolumeMAPeriod = 20;
input double InpVolumeMultiplier = 1.10;

input string InpChopHeader = "===== Chop Filters =====";
input int    InpBBPeriod = 20;
input double InpBBDeviation = 2.0;
input double InpBBSqueezeThreshold = 0.010;
input int    InpChopPeriod = 14;
input double InpMaxChoppiness = 61.8;
input double InpMinBodyPercent = 45.0;
input int    InpMaxEMACrossingsLookback = 12;

input string InpVisualHeader = "===== Visual Elements =====";
input int    InpSRLookback = 80;
input color  InpSupportColor = clrDeepSkyBlue;
input color  InpResistanceColor = clrIndianRed;
input color  InpOrderBlockBullColor = clrPaleGreen;
input color  InpOrderBlockBearColor = clrMistyRose;
input color  InpFvgBullColor = clrAquamarine;
input color  InpFvgBearColor = clrLightSalmon;
input bool   InpDrawOrderBlocks = true;
input bool   InpDrawFVG = true;
input bool   InpDrawLiquiditySweepMarks = true;

//=========================== Buffers ===========================//
double g_upTrend[];
double g_downTrend[];
double g_buyArrow[];
double g_sellArrow[];

datetime g_lastAlertBar = 0;

//====================== Cached Indicator Handles ======================//
// Handles must be created ONCE and reused. Creating + releasing a handle
// on every call returns EMPTY_VALUE because MQL5 computes handle data
// asynchronously — the data is never ready before the handle is released.
#define ABS_MAX_HANDLES 64
long g_hKey[ABS_MAX_HANDLES];
int  g_hVal[ABS_MAX_HANDLES];
int  g_hCount = 0;

int GetCachedHandle(const int type, const ENUM_TIMEFRAMES tf, const int period)
{
   long key = ((long)type << 40) | ((long)tf << 16) | (long)period;
   for(int i = 0; i < g_hCount; i++)
      if(g_hKey[i] == key) return g_hVal[i];

   int h = INVALID_HANDLE;
   switch(type)
   {
      case 0: h = iMA(_Symbol, tf, period, 0, MODE_EMA, PRICE_CLOSE);           break;
      case 1: h = iADX(_Symbol, tf, period);                                    break;
      case 2: h = iATR(_Symbol, tf, period);                                    break;
      case 3: h = iBands(_Symbol, tf, period, 0, InpBBDeviation, PRICE_CLOSE);  break;
   }

   if(h != INVALID_HANDLE && g_hCount < ABS_MAX_HANDLES)
   {
      g_hKey[g_hCount] = key;
      g_hVal[g_hCount] = h;
      g_hCount++;
   }
   return h;
}

void ReleaseCachedHandles()
{
   for(int i = 0; i < g_hCount; i++)
      if(g_hVal[i] != INVALID_HANDLE)
         IndicatorRelease(g_hVal[i]);
   g_hCount = 0;
}

bool HandlesReady()
{
   ENUM_TIMEFRAMES tfs[3] = {PERIOD_M1, PERIOD_M5, PERIOD_M15};
   for(int i = 0; i < 3; i++)
   {
      if(BarsCalculated(GetCachedHandle(0, tfs[i], InpFastEMA)) <= 0) return false;
      if(BarsCalculated(GetCachedHandle(0, tfs[i], InpMidEMA))  <= 0) return false;
      if(BarsCalculated(GetCachedHandle(0, tfs[i], InpSlowEMA)) <= 0) return false;
   }
   if(BarsCalculated(GetCachedHandle(0, PERIOD_CURRENT, InpFastEMA))   <= 0) return false;
   if(BarsCalculated(GetCachedHandle(0, PERIOD_CURRENT, InpMidEMA))    <= 0) return false;
   if(BarsCalculated(GetCachedHandle(0, PERIOD_CURRENT, InpSlowEMA))   <= 0) return false;
   if(BarsCalculated(GetCachedHandle(1, PERIOD_CURRENT, InpADXPeriod)) <= 0) return false;
   if(BarsCalculated(GetCachedHandle(2, PERIOD_CURRENT, InpATRPeriod)) <= 0) return false;
   if(BarsCalculated(GetCachedHandle(2, PERIOD_CURRENT, 1))            <= 0) return false;
   if(BarsCalculated(GetCachedHandle(3, PERIOD_CURRENT, InpBBPeriod))  <= 0) return false;
   return true;
}

//=========================== Helpers ===========================//
bool IsAllowedSymbol(string sym)
{
   string s = sym;
   StringToUpper(s);
   if(StringFind(s, "XAU") >= 0) return true;
   if(StringFind(s, "NAS") >= 0) return true;
   if(StringFind(s, "USTEC") >= 0) return true;
   if(StringFind(s, "US100") >= 0) return true;
   return false;
}

double IndicatorValue(int handle, int bufferIndex, int shift)
{
   double b[];
   ArraySetAsSeries(b, true);
   if(CopyBuffer(handle, bufferIndex, shift, 1, b) != 1)
      return EMPTY_VALUE;
   return b[0];
}

double EMA(ENUM_TIMEFRAMES tf, int period, int shift)
{
   int h = GetCachedHandle(0, tf, period);
   if(h == INVALID_HANDLE) return EMPTY_VALUE;
   return IndicatorValue(h, 0, shift);
}

double ADX(ENUM_TIMEFRAMES tf, int period, int shift)
{
   int h = GetCachedHandle(1, tf, period);
   if(h == INVALID_HANDLE) return EMPTY_VALUE;
   return IndicatorValue(h, 0, shift);
}

double ATR(ENUM_TIMEFRAMES tf, int period, int shift)
{
   int h = GetCachedHandle(2, tf, period);
   if(h == INVALID_HANDLE) return EMPTY_VALUE;
   return IndicatorValue(h, 0, shift);
}

bool MTFBull(int shift)
{
   ENUM_TIMEFRAMES tfs[3] = {PERIOD_M1, PERIOD_M5, PERIOD_M15};
   for(int i=0;i<3;i++)
   {
      double e20 = EMA(tfs[i], InpFastEMA, shift);
      double e50 = EMA(tfs[i], InpMidEMA, shift);
      double e200 = EMA(tfs[i], InpSlowEMA, shift);
      double c = iClose(_Symbol, tfs[i], shift);
      if(e20==EMPTY_VALUE || e50==EMPTY_VALUE || e200==EMPTY_VALUE) return false;
      if(!(e20>e50 && e50>e200 && c>e20)) return false;
   }
   return true;
}

bool MTFBear(int shift)
{
   ENUM_TIMEFRAMES tfs[3] = {PERIOD_M1, PERIOD_M5, PERIOD_M15};
   for(int i=0;i<3;i++)
   {
      double e20 = EMA(tfs[i], InpFastEMA, shift);
      double e50 = EMA(tfs[i], InpMidEMA, shift);
      double e200 = EMA(tfs[i], InpSlowEMA, shift);
      double c = iClose(_Symbol, tfs[i], shift);
      if(e20==EMPTY_VALUE || e50==EMPTY_VALUE || e200==EMPTY_VALUE) return false;
      if(!(e20<e50 && e50<e200 && c<e20)) return false;
   }
   return true;
}

bool MarketStructureBull(int shift)
{
   double h1 = iHigh(_Symbol, PERIOD_CURRENT, shift+2);
   double h2 = iHigh(_Symbol, PERIOD_CURRENT, shift+1);
   double l1 = iLow(_Symbol, PERIOD_CURRENT, shift+2);
   double l2 = iLow(_Symbol, PERIOD_CURRENT, shift+1);
   return (h2>h1 && l2>l1);
}

bool MarketStructureBear(int shift)
{
   double h1 = iHigh(_Symbol, PERIOD_CURRENT, shift+2);
   double h2 = iHigh(_Symbol, PERIOD_CURRENT, shift+1);
   double l1 = iLow(_Symbol, PERIOD_CURRENT, shift+2);
   double l2 = iLow(_Symbol, PERIOD_CURRENT, shift+1);
   return (h2<h1 && l2<l1);
}

bool VolumeConfirmed(int shift)
{
   long v = (long)iVolume(_Symbol, PERIOD_CURRENT, shift);
   double sum = 0.0;
   for(int i=shift+1; i<shift+1+InpVolumeMAPeriod; i++)
      sum += (double)iVolume(_Symbol, PERIOD_CURRENT, i);
   double avg = sum / InpVolumeMAPeriod;
   return ((double)v >= avg*InpVolumeMultiplier);
}

bool CandleBodyStrong(int shift)
{
   double o=iOpen(_Symbol, PERIOD_CURRENT, shift);
   double c=iClose(_Symbol, PERIOD_CURRENT, shift);
   double h=iHigh(_Symbol, PERIOD_CURRENT, shift);
   double l=iLow(_Symbol, PERIOD_CURRENT, shift);
   double range=h-l;
   if(range<=0.0) return false;
   return (MathAbs(c-o)/range*100.0 >= InpMinBodyPercent);
}

double BollingerBandwidth(int shift)
{
   int h=GetCachedHandle(3, PERIOD_CURRENT, InpBBPeriod);
   if(h==INVALID_HANDLE) return 999.0;

   double up[],mid[],low[];
   ArraySetAsSeries(up,true);
   ArraySetAsSeries(mid,true);
   ArraySetAsSeries(low,true);

   if(CopyBuffer(h,0,shift,1,up)!=1 || CopyBuffer(h,1,shift,1,mid)!=1 || CopyBuffer(h,2,shift,1,low)!=1)
      return 999.0;

   if(mid[0]==0.0) return 999.0;
   return (up[0]-low[0])/MathAbs(mid[0]);
}

bool ATRExpansion(int shift)
{
   double atrNow = ATR(PERIOD_CURRENT, InpATRPeriod, shift);
   if(atrNow==EMPTY_VALUE || atrNow<=0.0) return false;

   int h = GetCachedHandle(2, PERIOD_CURRENT, InpATRPeriod);
   if(h == INVALID_HANDLE) return false;

   double arr[];
   ArraySetAsSeries(arr,true);
   int n=20;
   if(CopyBuffer(h,0,shift+1,n,arr)<n)
      return false;

   double avg=0.0;
   for(int i=0;i<n;i++) avg+=arr[i];
   avg/=n;

   return (atrNow > avg*InpATRExpansionFactor);
}

double ChoppinessIndex(int period, int shift)
{
   int atrH = GetCachedHandle(2, PERIOD_CURRENT, 1);
   if(atrH==INVALID_HANDLE) return 100.0;

   double atrBuf[];
   ArraySetAsSeries(atrBuf,true);
   if(CopyBuffer(atrH,0,shift,period,atrBuf)<period)
      return 100.0;

   double sumAtr=0.0;
   for(int i=0;i<period;i++) sumAtr += atrBuf[i];

   int hhIdx=iHighest(_Symbol, PERIOD_CURRENT, MODE_HIGH, period, shift);
   int llIdx=iLowest(_Symbol, PERIOD_CURRENT, MODE_LOW, period, shift);
   double hh=iHigh(_Symbol, PERIOD_CURRENT, hhIdx);
   double ll=iLow(_Symbol, PERIOD_CURRENT, llIdx);

   if(hh-ll<=0.0 || sumAtr<=0.0) return 100.0;
   return 100.0*(MathLog10(sumAtr/(hh-ll))/MathLog10((double)period));
}

int CountRecentEMACrosses(int shift)
{
   int crosses=0;
   for(int i=shift; i<shift+InpMaxEMACrossingsLookback; i++)
   {
      double f1=EMA(PERIOD_CURRENT, InpFastEMA, i);
      double m1=EMA(PERIOD_CURRENT, InpMidEMA, i);
      double f2=EMA(PERIOD_CURRENT, InpFastEMA, i+1);
      double m2=EMA(PERIOD_CURRENT, InpMidEMA, i+1);
      if(f1==EMPTY_VALUE || m1==EMPTY_VALUE || f2==EMPTY_VALUE || m2==EMPTY_VALUE) continue;
      if((f1>m1 && f2<m2) || (f1<m1 && f2>m2)) crosses++;
   }
   return crosses;
}

bool DetectFVG(int direction, int shift)
{
   double h3 = iHigh(_Symbol, PERIOD_CURRENT, shift+2);
   double l3 = iLow(_Symbol, PERIOD_CURRENT, shift+2);
   double h1 = iHigh(_Symbol, PERIOD_CURRENT, shift);
   double l1 = iLow(_Symbol, PERIOD_CURRENT, shift);

   if(direction>0) return (l1>h3);
   return (h1<l3);
}

bool DetectOrderBlock(int direction, int shift)
{
   double o2=iOpen(_Symbol, PERIOD_CURRENT, shift+1);
   double c2=iClose(_Symbol, PERIOD_CURRENT, shift+1);
   double o1=iOpen(_Symbol, PERIOD_CURRENT, shift);
   double c1=iClose(_Symbol, PERIOD_CURRENT, shift);
   double atr=ATR(PERIOD_CURRENT, InpATRPeriod, shift);
   if(atr==EMPTY_VALUE || atr<=0.0) return false;

   if(direction>0) return (c2<o2 && c1>o1 && MathAbs(c1-o1)>0.6*atr);
   return (c2>o2 && c1<o1 && MathAbs(c1-o1)>0.6*atr);
}

bool DetectLiquiditySweep(int direction, int shift)
{
   int lookback = 20;
   int hi = iHighest(_Symbol, PERIOD_CURRENT, MODE_HIGH, lookback, shift+1);
   int lo = iLowest(_Symbol, PERIOD_CURRENT, MODE_LOW, lookback, shift+1);

   double keyHigh=iHigh(_Symbol, PERIOD_CURRENT, hi);
   double keyLow=iLow(_Symbol, PERIOD_CURRENT, lo);

   double h=iHigh(_Symbol, PERIOD_CURRENT, shift);
   double l=iLow(_Symbol, PERIOD_CURRENT, shift);
   double c=iClose(_Symbol, PERIOD_CURRENT, shift);

   if(direction>0) return (l<keyLow && c>keyLow);
   return (h>keyHigh && c<keyHigh);
}

int EvaluateSignalAtShift(int shift)
{
   double adx=ADX(PERIOD_CURRENT, InpADXPeriod, shift);
   if(adx==EMPTY_VALUE || adx<InpMinADX) return 0;
   if(!ATRExpansion(shift)) return 0;
   if(BollingerBandwidth(shift)<InpBBSqueezeThreshold) return 0;
   if(ChoppinessIndex(InpChopPeriod, shift)>InpMaxChoppiness) return 0;
   if(CountRecentEMACrosses(shift)>=3) return 0;
   if(!CandleBodyStrong(shift)) return 0;
   if(!VolumeConfirmed(shift)) return 0;

   bool bull = MTFBull(shift) && MarketStructureBull(shift);
   bool bear = MTFBear(shift) && MarketStructureBear(shift);

   if(DetectLiquiditySweep(+1, shift)) bull = bull && true;
   if(DetectLiquiditySweep(-1, shift)) bear = bear && true;

   // confirm with structural features
   bull = bull && (DetectOrderBlock(+1, shift) || DetectFVG(+1, shift));
   bear = bear && (DetectOrderBlock(-1, shift) || DetectFVG(-1, shift));

   if(bull) return 1;
   if(bear) return -1;
   return 0;
}

string TrendLabel(ENUM_TIMEFRAMES tf)
{
   double e20=EMA(tf, InpFastEMA, 1);
   double e50=EMA(tf, InpMidEMA, 1);
   double e200=EMA(tf, InpSlowEMA, 1);
   if(e20==EMPTY_VALUE||e50==EMPTY_VALUE||e200==EMPTY_VALUE) return "N/A";
   if(e20>e50 && e50>e200) return "Bull";
   if(e20<e50 && e50<e200) return "Bear";
   return "Mixed";
}

void DrawOrUpdateHLine(string name, double price, color clr, int width=1, ENUM_LINE_STYLE style=STYLE_DOT)
{
   if(price<=0.0) return;
   if(ObjectFind(0, name)<0)
   {
      ObjectCreate(0, name, OBJ_HLINE, 0, 0, price);
      ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
      ObjectSetInteger(0, name, OBJPROP_WIDTH, width);
      ObjectSetInteger(0, name, OBJPROP_STYLE, style);
   }
   ObjectSetDouble(0, name, OBJPROP_PRICE, price);
}

void DrawRectangle(string name, datetime t1, double p1, datetime t2, double p2, color clr)
{
   if(ObjectFind(0, name) < 0)
      ObjectCreate(0, name, OBJ_RECTANGLE, 0, t1, p1, t2, p2);

   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_BACK, true);
   ObjectSetInteger(0, name, OBJPROP_FILL, true);
   ObjectSetInteger(0, name, OBJPROP_STYLE, STYLE_SOLID);
   ObjectSetInteger(0, name, OBJPROP_WIDTH, 1);

   ObjectMove(0, name, 0, t1, p1);
   ObjectMove(0, name, 1, t2, p2);
}

void DrawAdvancedZones()
{
   // Support & Resistance
   int hi = iHighest(_Symbol, PERIOD_CURRENT, MODE_HIGH, InpSRLookback, 1);
   int lo = iLowest(_Symbol, PERIOD_CURRENT, MODE_LOW, InpSRLookback, 1);

   double resistance = iHigh(_Symbol, PERIOD_CURRENT, hi);
   double support = iLow(_Symbol, PERIOD_CURRENT, lo);

   DrawOrUpdateHLine("ABS_SR_RES", resistance, InpResistanceColor, 1, STYLE_DASH);
   DrawOrUpdateHLine("ABS_SR_SUP", support, InpSupportColor, 1, STYLE_DASH);

   // Simple Order Block zones from recent candle clusters
   if(InpDrawOrderBlocks)
   {
      datetime t1 = iTime(_Symbol, PERIOD_CURRENT, 10);
      datetime t2 = iTime(_Symbol, PERIOD_CURRENT, 1);

      double obBullHigh = MathMax(iOpen(_Symbol, PERIOD_CURRENT, 3), iClose(_Symbol, PERIOD_CURRENT, 3));
      double obBullLow  = MathMin(iOpen(_Symbol, PERIOD_CURRENT, 3), iClose(_Symbol, PERIOD_CURRENT, 3));

      double obBearHigh = MathMax(iOpen(_Symbol, PERIOD_CURRENT, 4), iClose(_Symbol, PERIOD_CURRENT, 4));
      double obBearLow  = MathMin(iOpen(_Symbol, PERIOD_CURRENT, 4), iClose(_Symbol, PERIOD_CURRENT, 4));

      DrawRectangle("ABS_OB_BULL", t1, obBullHigh, t2, obBullLow, InpOrderBlockBullColor);
      DrawRectangle("ABS_OB_BEAR", t1, obBearHigh, t2, obBearLow, InpOrderBlockBearColor);
   }

   // FVG zones
   if(InpDrawFVG)
   {
      datetime t1 = iTime(_Symbol, PERIOD_CURRENT, 8);
      datetime t2 = iTime(_Symbol, PERIOD_CURRENT, 1);

      if(DetectFVG(+1, 1))
      {
         double highGap = iLow(_Symbol, PERIOD_CURRENT, 1);
         double lowGap = iHigh(_Symbol, PERIOD_CURRENT, 3);
         DrawRectangle("ABS_FVG_BULL", t1, highGap, t2, lowGap, InpFvgBullColor);
      }

      if(DetectFVG(-1, 1))
      {
         double highGap = iLow(_Symbol, PERIOD_CURRENT, 3);
         double lowGap = iHigh(_Symbol, PERIOD_CURRENT, 1);
         DrawRectangle("ABS_FVG_BEAR", t1, highGap, t2, lowGap, InpFvgBearColor);
      }
   }

   // Liquidity sweep markers
   if(InpDrawLiquiditySweepMarks)
   {
      if(DetectLiquiditySweep(+1,1))
      {
         string n="ABS_LS_BULL";
         datetime tt=iTime(_Symbol, PERIOD_CURRENT, 1);
         double pp=iLow(_Symbol, PERIOD_CURRENT, 1);
         if(ObjectFind(0,n)<0) ObjectCreate(0,n,OBJ_ARROW,0,tt,pp);
         ObjectSetInteger(0,n,OBJPROP_ARROWCODE,241);
         ObjectSetInteger(0,n,OBJPROP_COLOR,clrLime);
         ObjectMove(0,n,0,tt,pp);
      }
      if(DetectLiquiditySweep(-1,1))
      {
         string n="ABS_LS_BEAR";
         datetime tt=iTime(_Symbol, PERIOD_CURRENT, 1);
         double pp=iHigh(_Symbol, PERIOD_CURRENT, 1);
         if(ObjectFind(0,n)<0) ObjectCreate(0,n,OBJ_ARROW,0,tt,pp);
         ObjectSetInteger(0,n,OBJPROP_ARROWCODE,242);
         ObjectSetInteger(0,n,OBJPROP_COLOR,clrTomato);
         ObjectMove(0,n,0,tt,pp);
      }
   }
}

void UpdateDashboard(int signal)
{
   string state = "Choppy";
   if(signal==1 || signal==-1)
      state = "Trending";

   string msg = "Absolute Indicator\n"
                + "State: " + state + "\n"
                + "M1: " + TrendLabel(PERIOD_M1) + " | "
                + "M5: " + TrendLabel(PERIOD_M5) + " | "
                + "M15: " + TrendLabel(PERIOD_M15) + "\n"
                + "ADX: " + DoubleToString(ADX(PERIOD_CURRENT, InpADXPeriod, 1), 1) + "\n"
                + "Spread: " + IntegerToString((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD));

   string name = "ABS_DASH";
   if(ObjectFind(0, name) < 0)
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);

   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, 10);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, 20);
   ObjectSetInteger(0, name, OBJPROP_COLOR, (state=="Trending" ? clrLime : clrOrange));
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 10);
   ObjectSetString(0, name, OBJPROP_TEXT, msg);
}

void TriggerAlerts(int signal)
{
   if(!InpEnableAlerts) return;

   datetime barTime = iTime(_Symbol, PERIOD_CURRENT, 1);
   if(barTime == g_lastAlertBar) return;

   if(signal==0) return;

   string direction = (signal>0 ? "BUY" : "SELL");
   string msg = "Absolute Signal " + direction + " on " + _Symbol + " " + EnumToString((ENUM_TIMEFRAMES)Period());

   Alert(msg);
   if(InpEnablePushAlert) SendNotification(msg);
   if(InpEnableEmailAlert) SendMail("Absolute Indicator Signal", msg);

   g_lastAlertBar = barTime;
}

//=========================== Indicator Events ===========================//
int OnInit()
{
   SetIndexBuffer(0, g_upTrend, INDICATOR_DATA);
   SetIndexBuffer(1, g_downTrend, INDICATOR_DATA);
   SetIndexBuffer(2, g_buyArrow, INDICATOR_DATA);
   SetIndexBuffer(3, g_sellArrow, INDICATOR_DATA);

   ArraySetAsSeries(g_upTrend, true);
   ArraySetAsSeries(g_downTrend, true);
   ArraySetAsSeries(g_buyArrow, true);
   ArraySetAsSeries(g_sellArrow, true);

   PlotIndexSetInteger(2, PLOT_ARROW, 233);
   PlotIndexSetInteger(3, PLOT_ARROW, 234);

   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(2, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(3, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   IndicatorSetString(INDICATOR_SHORTNAME, "AbsoluteIndicator");

   // Pre-create all indicator handles so data starts computing immediately
   HandlesReady();

   if(InpOnlyAllowedSymbols && !IsAllowedSymbol(_Symbol))
      Print("[AbsoluteIndicator] Symbol outside intended set (XAU/NASDAQ family): ", _Symbol);

   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   ReleaseCachedHandles();

   string pref = "ABS_";
   int total = ObjectsTotal(0);
   for(int i=total-1; i>=0; i--)
   {
      string name = ObjectName(0, i);
      if(StringFind(name, pref) == 0)
         ObjectDelete(0, name);
   }
}

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
   if(rates_total < 300)
      return 0;

   // Wait until all indicator handles have computed data (async in MQL5).
   // Returning 0 forces a full recalculation on the next tick.
   if(!HandlesReady())
      return 0;

   // Buffers are series; the incoming price arrays must match, otherwise
   // high[i]/low[i] point at mirrored bars and arrows land in the wrong place.
   ArraySetAsSeries(time, true);
   ArraySetAsSeries(open, true);
   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(close, true);

   // Buffers are SERIES: index 0 = newest bar. On the first pass compute the
   // most recent 200 bars; afterwards only refresh the newly formed bars.
   int start;
   if(prev_calculated > 0)
   {
      start = rates_total - prev_calculated + 1;
      if(start < 2) start = 2;
      if(start > 200) start = 200;
   }
   else
      start = 200;

   if(start > rates_total - 3)
      start = rates_total - 3;

   // On a full recalculation, wipe the entire buffers so stale/zero values
   // outside the computed window can't distort the chart scale.
   if(prev_calculated <= 0)
   {
      ArrayInitialize(g_upTrend, EMPTY_VALUE);
      ArrayInitialize(g_downTrend, EMPTY_VALUE);
      ArrayInitialize(g_buyArrow, EMPTY_VALUE);
      ArrayInitialize(g_sellArrow, EMPTY_VALUE);
   }

   for(int i=start; i>=0; i--)
   {
      g_upTrend[i] = EMPTY_VALUE;
      g_downTrend[i] = EMPTY_VALUE;
      g_buyArrow[i] = EMPTY_VALUE;
      g_sellArrow[i] = EMPTY_VALUE;

      if(InpOnlyAllowedSymbols && !IsAllowedSymbol(_Symbol))
         continue;

      double e20 = EMA(PERIOD_CURRENT, InpFastEMA, i);
      if(e20 == EMPTY_VALUE) continue;

      int sig = EvaluateSignalAtShift(i);
      if(sig > 0)
      {
         g_upTrend[i] = e20;
         g_buyArrow[i] = low[i] - (ATR(PERIOD_CURRENT, InpATRPeriod, i) * 0.2);
      }
      else if(sig < 0)
      {
         g_downTrend[i] = e20;
         g_sellArrow[i] = high[i] + (ATR(PERIOD_CURRENT, InpATRPeriod, i) * 0.2);
      }
      else
      {
         // Visualize probable trend even when no entry signal (MTF trend alignment)
         if(MTFBull(i)) g_upTrend[i] = e20;
         else if(MTFBear(i)) g_downTrend[i] = e20;
      }
   }

   int latestSignal = EvaluateSignalAtShift(1);
   UpdateDashboard(latestSignal);
   DrawAdvancedZones();
   TriggerAlerts(latestSignal);

   ChartRedraw();

   return rates_total;
}
