#property copyright "GIO"
#property link      ""
#property version   "1.00"
#property strict
#property indicator_chart_window
#property indicator_buffers 13
#property indicator_plots   13

#property indicator_label1  "EMA Fast"
#property indicator_type1   DRAW_LINE
#property indicator_color1  clrOrange
#property indicator_width1  1

#property indicator_label2  "EMA Mid"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrDodgerBlue
#property indicator_width2  1

#property indicator_label3  "EMA Slow"
#property indicator_type3   DRAW_LINE
#property indicator_color3  clrSilver
#property indicator_width3  1

#property indicator_label4  "Signal Direction"
#property indicator_type4   DRAW_NONE
#property indicator_label5  "Trend Score"
#property indicator_type5   DRAW_NONE
#property indicator_label6  "BOS Direction"
#property indicator_type6   DRAW_NONE
#property indicator_label7  "CHOCH Direction"
#property indicator_type7   DRAW_NONE
#property indicator_label8  "Zone Top"
#property indicator_type8   DRAW_NONE
#property indicator_label9  "Zone Bottom"
#property indicator_type9   DRAW_NONE
#property indicator_label10 "FVG Top"
#property indicator_type10  DRAW_NONE
#property indicator_label11 "FVG Bottom"
#property indicator_type11  DRAW_NONE
#property indicator_label12 "EMA Direction"
#property indicator_type12  DRAW_NONE
#property indicator_label13 "Donchian Direction"
#property indicator_type13  DRAW_NONE

//+------------------------------------------------------------------+
//|                        EMBEDDED CORE                             |
//|  Self-contained GIO Market Structure engine. No external custom |
//|  include is required, so the "file not found" compile cascade   |
//|  cannot happen. The include guard below is kept as a safety net: |
//|  if the old header is ALSO added to the project, it is skipped   |
//|  instead of double-defining everything.                          |
//|  NOTE: if you change the core logic, update it in BOTH the       |
//|  indicator and the EA (search for this EMBEDDED CORE banner).    |
//+------------------------------------------------------------------+
#ifndef GIO_MARKET_STRUCTURE_CORE_MQH
#define GIO_MARKET_STRUCTURE_CORE_MQH

enum ENUM_GMS_STRUCTURE_SCOPE
{
   GMS_SCOPE_EXTERNAL = 0,
   GMS_SCOPE_INTERNAL = 1,
   GMS_SCOPE_BOTH     = 2
};

struct GMSZone
{
   int      dir;
   double   top;
   double   bottom;
   datetime startTime;
   int      startIndex;
   bool     active;
};

struct GMSState
{
   bool     valid;
   datetime closedTime;
   double   closedClose;
   double   point;

   int      structureDir;
   int      emaDir;
   int      donchianDir;
   int      compositeDir;

   int      lastBosDir;
   int      lastChochDir;
   int      barsSinceBOS;
   int      barsSinceCHOCH;

   double   lastSwingHigh;
   double   lastSwingLow;
   datetime lastSwingHighTime;
   datetime lastSwingLowTime;
   string   lastHighLabel;
   string   lastLowLabel;

   double   emaFast;
   double   emaMid;
   double   emaSlow;

   GMSZone  bullOB;
   GMSZone  bearOB;
   GMSZone  bullFVG;
   GMSZone  bearFVG;

   bool     inBullOB;
   bool     inBearOB;
   bool     inBullFVG;
   bool     inBearFVG;
   bool     buySetup;
   bool     sellSetup;
};

void GMS_ResetZone(GMSZone &zone)
{
   zone.dir        = 0;
   zone.top        = 0.0;
   zone.bottom     = 0.0;
   zone.startTime  = 0;
   zone.startIndex = -1;
   zone.active     = false;
}

void GMS_ResetState(GMSState &state)
{
   state.valid             = false;
   state.closedTime        = 0;
   state.closedClose       = 0.0;
   state.point             = 0.0;
   state.structureDir      = 0;
   state.emaDir            = 0;
   state.donchianDir       = 0;
   state.compositeDir      = 0;
   state.lastBosDir        = 0;
   state.lastChochDir      = 0;
   state.barsSinceBOS      = 1000000;
   state.barsSinceCHOCH    = 1000000;
   state.lastSwingHigh     = 0.0;
   state.lastSwingLow      = 0.0;
   state.lastSwingHighTime = 0;
   state.lastSwingLowTime  = 0;
   state.lastHighLabel     = "--";
   state.lastLowLabel      = "--";
   state.emaFast           = 0.0;
   state.emaMid            = 0.0;
   state.emaSlow           = 0.0;
   state.inBullOB          = false;
   state.inBearOB          = false;
   state.inBullFVG         = false;
   state.inBearFVG         = false;
   state.buySetup          = false;
   state.sellSetup         = false;
   GMS_ResetZone(state.bullOB);
   GMS_ResetZone(state.bearOB);
   GMS_ResetZone(state.bullFVG);
   GMS_ResetZone(state.bearFVG);
}

string GMS_DirectionText(const int dir)
{
   if(dir > 0)
      return "Bullish";
   if(dir < 0)
      return "Bearish";
   return "Neutral";
}

string GMS_TFToString(const ENUM_TIMEFRAMES timeframe)
{
   switch(timeframe)
   {
      case PERIOD_M1:  return "M1";
      case PERIOD_M2:  return "M2";
      case PERIOD_M3:  return "M3";
      case PERIOD_M4:  return "M4";
      case PERIOD_M5:  return "M5";
      case PERIOD_M6:  return "M6";
      case PERIOD_M10: return "M10";
      case PERIOD_M12: return "M12";
      case PERIOD_M15: return "M15";
      case PERIOD_M20: return "M20";
      case PERIOD_M30: return "M30";
      case PERIOD_H1:  return "H1";
      case PERIOD_H2:  return "H2";
      case PERIOD_H3:  return "H3";
      case PERIOD_H4:  return "H4";
      case PERIOD_H6:  return "H6";
      case PERIOD_H8:  return "H8";
      case PERIOD_H12: return "H12";
      case PERIOD_D1:  return "D1";
      case PERIOD_W1:  return "W1";
      case PERIOD_MN1: return "MN1";
      default:         return EnumToString(timeframe);
   }
}

int GMS_Sign(const double value)
{
   if(value > 0.0)
      return 1;
   if(value < 0.0)
      return -1;
   return 0;
}

double GMS_MidPrice(const GMSZone &zone)
{
   return (zone.top + zone.bottom) * 0.5;
}

bool GMS_IsBullCandle(const MqlRates &bar)
{
   return (bar.close > bar.open);
}

bool GMS_IsBearCandle(const MqlRates &bar)
{
   return (bar.close < bar.open);
}

bool GMS_IsSwingHigh(const MqlRates &rates[], const int total, const int index, const int length)
{
   if(index - length < 0 || index + length >= total)
      return false;

   const double level = rates[index].high;
   for(int offset = 1; offset <= length; offset++)
   {
      if(level <= rates[index - offset].high || level <= rates[index + offset].high)
         return false;
   }
   return true;
}

bool GMS_IsSwingLow(const MqlRates &rates[], const int total, const int index, const int length)
{
   if(index - length < 0 || index + length >= total)
      return false;

   const double level = rates[index].low;
   for(int offset = 1; offset <= length; offset++)
   {
      if(level >= rates[index - offset].low || level >= rates[index + offset].low)
         return false;
   }
   return true;
}

double GMS_EMAFromRates(const MqlRates &rates[], const int total, const int period, const int shift)
{
   if(period <= 1 || total <= shift)
      return rates[shift].close;

   const double alpha = 2.0 / ((double)period + 1.0);
   double ema = rates[total - 1].close;

   for(int index = total - 2; index >= shift; index--)
      ema = alpha * rates[index].close + (1.0 - alpha) * ema;

   return ema;
}

int GMS_EMATrend(const double fast, const double mid, const double slow)
{
   if(fast > mid && mid > slow)
      return 1;
   if(fast < mid && mid < slow)
      return -1;
   return 0;
}

int GMS_DonchianDirection(const MqlRates &rates[], const int total, const int length, const int shift)
{
   if(length < 2 || total <= shift + length + 2)
      return 0;

   int trend = 0;
   const int oldest = total - length - 2;
   for(int index = oldest; index >= shift; index--)
   {
      double highestHigh = rates[index + 1].high;
      double lowestLow   = rates[index + 1].low;

      for(int offset = 2; offset <= length; offset++)
      {
         const int lookbackIndex = index + offset;
         if(lookbackIndex >= total)
            break;

         if(rates[lookbackIndex].high > highestHigh)
            highestHigh = rates[lookbackIndex].high;
         if(rates[lookbackIndex].low < lowestLow)
            lowestLow = rates[lookbackIndex].low;
      }

      if(rates[index].close > highestHigh)
         trend = 1;
      else if(rates[index].close < lowestLow)
         trend = -1;
   }
   return trend;
}

bool GMS_BarTouchesZone(const MqlRates &bar, const GMSZone &zone)
{
   if(!zone.active)
      return false;

   return (bar.low <= zone.top && bar.high >= zone.bottom);
}

bool GMS_HasMinimumDistance(const double distance, const double point, const double minimumPoints)
{
   if(minimumPoints <= 0.0)
      return true;

   return (MathAbs(distance) >= minimumPoints * point);
}

void GMS_FindOrderBlock(const MqlRates &rates[], const int total, const int breakIndex, const int pivotIndex, const int dir, GMSZone &zone)
{
   GMS_ResetZone(zone);

   int fromIndex = breakIndex + 1;
   int toIndex   = pivotIndex - 1;

   if(fromIndex >= total)
      return;

   if(toIndex < fromIndex)
      toIndex = MathMin(total - 1, breakIndex + 25);

   toIndex = MathMin(toIndex, MathMin(total - 1, breakIndex + 80));

   int selected = -1;
   for(int index = fromIndex; index <= toIndex; index++)
   {
      if(dir > 0 && GMS_IsBearCandle(rates[index]))
      {
         selected = index;
         break;
      }
      if(dir < 0 && GMS_IsBullCandle(rates[index]))
      {
         selected = index;
         break;
      }
   }

   if(selected < 0)
   {
      double bestValue = (dir > 0 ? 100000000000.0 : -100000000000.0);
      for(int index = fromIndex; index <= toIndex; index++)
      {
         if(dir > 0 && rates[index].low < bestValue)
         {
            bestValue = rates[index].low;
            selected = index;
         }
         if(dir < 0 && rates[index].high > bestValue)
         {
            bestValue = rates[index].high;
            selected = index;
         }
      }
   }

   if(selected < 0)
      return;

   zone.dir        = dir;
   zone.top        = rates[selected].high;
   zone.bottom     = rates[selected].low;
   zone.startTime  = rates[selected].time;
   zone.startIndex = selected;
   zone.active     = true;
}

bool GMS_DetectFVG(const MqlRates &rates[], const int total, const int index, const double point, const double minimumPoints, GMSZone &zone)
{
   GMS_ResetZone(zone);

   if(index + 2 >= total)
      return false;

   const double minDistance = minimumPoints * point;

   if(rates[index].low > rates[index + 2].high && (rates[index].low - rates[index + 2].high) >= minDistance)
   {
      zone.dir        = 1;
      zone.top        = rates[index].low;
      zone.bottom     = rates[index + 2].high;
      zone.startTime  = rates[index + 2].time;
      zone.startIndex = index + 2;
      zone.active     = true;
      return true;
   }

   if(rates[index].high < rates[index + 2].low && (rates[index + 2].low - rates[index].high) >= minDistance)
   {
      zone.dir        = -1;
      zone.top        = rates[index + 2].low;
      zone.bottom     = rates[index].high;
      zone.startTime  = rates[index + 2].time;
      zone.startIndex = index + 2;
      zone.active     = true;
      return true;
   }

   return false;
}

void GMS_UpdateZoneValidity(const MqlRates &bar, GMSZone &bullOB, GMSZone &bearOB, GMSZone &bullFVG, GMSZone &bearFVG)
{
   if(bullOB.active && bar.close < bullOB.bottom)
      bullOB.active = false;
   if(bearOB.active && bar.close > bearOB.top)
      bearOB.active = false;

   if(bullFVG.active && bar.low <= bullFVG.bottom)
      bullFVG.active = false;
   if(bearFVG.active && bar.high >= bearFVG.top)
      bearFVG.active = false;
}

int GMS_CompositeDirection(const GMSState &state)
{
   if(state.structureDir > 0 && state.emaDir > 0 && state.donchianDir > 0)
      return 1;
   if(state.structureDir < 0 && state.emaDir < 0 && state.donchianDir < 0)
      return -1;
   return 0;
}

bool GMS_Evaluate(const string symbol,
                  const ENUM_TIMEFRAMES timeframe,
                  const int swingLength,
                  const int emaFastPeriod,
                  const int emaMidPeriod,
                  const int emaSlowPeriod,
                  const int donchianLength,
                  const int lookbackBars,
                  int shift,
                  const double minimumFVGPoints,
                  const double minimumBOSPoints,
                  GMSState &state)
{
   GMS_ResetState(state);

   if(shift < 1)
      shift = 1;

   const int safeSwing = MathMax(1, swingLength);
   const int copyBars = MathMax(lookbackBars, MathMax(emaSlowPeriod + 100, donchianLength + safeSwing * 4 + 100));

   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   const int copied = CopyRates(symbol, timeframe, 0, copyBars, rates);
   if(copied <= shift + safeSwing * 2 + 10)
      return false;

   ArraySetAsSeries(rates, true);
   const int total = ArraySize(rates);
   const double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(point <= 0.0)
      return false;

   state.valid       = true;
   state.point       = point;
   state.closedTime  = rates[shift].time;
   state.closedClose = rates[shift].close;
   state.emaFast     = GMS_EMAFromRates(rates, total, emaFastPeriod, shift);
   state.emaMid      = GMS_EMAFromRates(rates, total, emaMidPeriod, shift);
   state.emaSlow     = GMS_EMAFromRates(rates, total, emaSlowPeriod, shift);
   state.emaDir      = GMS_EMATrend(state.emaFast, state.emaMid, state.emaSlow);
   state.donchianDir = GMS_DonchianDirection(rates, total, donchianLength, shift);

   double lastHigh = 0.0;
   double prevHigh = 0.0;
   double lastLow  = 0.0;
   double prevLow  = 0.0;
   int    lastHighIndex = -1;
   int    lastLowIndex  = -1;
   bool   haveHigh = false;
   bool   haveLow  = false;
   bool   havePrevHigh = false;
   bool   havePrevLow  = false;
   int    highType = 0;
   int    lowType  = 0;
   int    structureDir = 0;

   GMSZone bullOB;
   GMSZone bearOB;
   GMSZone bullFVG;
   GMSZone bearFVG;
   GMS_ResetZone(bullOB);
   GMS_ResetZone(bearOB);
   GMS_ResetZone(bullFVG);
   GMS_ResetZone(bearFVG);

   const int oldestIndex = total - safeSwing - 1;

   for(int index = oldestIndex; index >= shift; index--)
   {
      if(index >= shift + safeSwing)
      {
         if(GMS_IsSwingHigh(rates, total, index, safeSwing))
         {
            if(haveHigh)
            {
               prevHigh = lastHigh;
               havePrevHigh = true;
            }

            lastHigh = rates[index].high;
            lastHighIndex = index;
            haveHigh = true;

            if(havePrevHigh)
               highType = (lastHigh > prevHigh ? 1 : -1);

            state.lastSwingHigh = lastHigh;
            state.lastSwingHighTime = rates[index].time;
            state.lastHighLabel = (highType > 0 ? "HH" : (highType < 0 ? "LH" : "H"));
         }

         if(GMS_IsSwingLow(rates, total, index, safeSwing))
         {
            if(haveLow)
            {
               prevLow = lastLow;
               havePrevLow = true;
            }

            lastLow = rates[index].low;
            lastLowIndex = index;
            haveLow = true;

            if(havePrevLow)
               lowType = (lastLow > prevLow ? 1 : -1);

            state.lastSwingLow = lastLow;
            state.lastSwingLowTime = rates[index].time;
            state.lastLowLabel = (lowType > 0 ? "HL" : (lowType < 0 ? "LL" : "L"));
         }
      }

      if(highType > 0 && lowType > 0)
         structureDir = 1;
      else if(highType < 0 && lowType < 0)
         structureDir = -1;

      bool bullBreak = false;
      bool bearBreak = false;

      if(haveHigh && index + 1 < total && rates[index].close > lastHigh && rates[index + 1].close <= lastHigh)
         bullBreak = GMS_HasMinimumDistance(rates[index].close - lastHigh, point, minimumBOSPoints);

      if(haveLow && index + 1 < total && rates[index].close < lastLow && rates[index + 1].close >= lastLow)
         bearBreak = GMS_HasMinimumDistance(lastLow - rates[index].close, point, minimumBOSPoints);

      if(bullBreak)
      {
         GMS_FindOrderBlock(rates, total, index, lastHighIndex, 1, bullOB);
         if(structureDir < 0)
         {
            state.lastChochDir = 1;
            state.barsSinceCHOCH = index - shift;
         }
         else
         {
            state.lastBosDir = 1;
            state.barsSinceBOS = index - shift;
         }
         structureDir = 1;
         haveHigh = false;
      }

      if(bearBreak)
      {
         GMS_FindOrderBlock(rates, total, index, lastLowIndex, -1, bearOB);
         if(structureDir > 0)
         {
            state.lastChochDir = -1;
            state.barsSinceCHOCH = index - shift;
         }
         else
         {
            state.lastBosDir = -1;
            state.barsSinceBOS = index - shift;
         }
         structureDir = -1;
         haveLow = false;
      }

      GMSZone detectedFVG;
      if(GMS_DetectFVG(rates, total, index, point, minimumFVGPoints, detectedFVG))
      {
         if(detectedFVG.dir > 0)
            bullFVG = detectedFVG;
         else if(detectedFVG.dir < 0)
            bearFVG = detectedFVG;
      }

      GMS_UpdateZoneValidity(rates[index], bullOB, bearOB, bullFVG, bearFVG);
   }

   state.structureDir = structureDir;
   state.bullOB = bullOB;
   state.bearOB = bearOB;
   state.bullFVG = bullFVG;
   state.bearFVG = bearFVG;
   state.inBullOB = GMS_BarTouchesZone(rates[shift], state.bullOB);
   state.inBearOB = GMS_BarTouchesZone(rates[shift], state.bearOB);
   state.inBullFVG = GMS_BarTouchesZone(rates[shift], state.bullFVG);
   state.inBearFVG = GMS_BarTouchesZone(rates[shift], state.bearFVG);
   state.compositeDir = GMS_CompositeDirection(state);

   const bool bullishCandle = GMS_IsBullCandle(rates[shift]);
   const bool bearishCandle = GMS_IsBearCandle(rates[shift]);

   state.buySetup = (state.structureDir > 0 &&
                     state.emaDir > 0 &&
                     state.donchianDir > 0 &&
                     state.lastBosDir > 0 &&
                     (state.inBullOB || state.inBullFVG) &&
                     bullishCandle);

   state.sellSetup = (state.structureDir < 0 &&
                      state.emaDir < 0 &&
                      state.donchianDir < 0 &&
                      state.lastBosDir < 0 &&
                      (state.inBearOB || state.inBearFVG) &&
                      bearishCandle);

   return true;
}

int GMS_TimeframeContribution(const string symbol,
                              const ENUM_TIMEFRAMES timeframe,
                              const int weight,
                              const int swingLength,
                              const int emaFastPeriod,
                              const int emaMidPeriod,
                              const int emaSlowPeriod,
                              const int donchianLength,
                              const int lookbackBars,
                              const double minimumFVGPoints,
                              const double minimumBOSPoints)
{
   if(weight <= 0)
      return 0;

   GMSState state;
   if(!GMS_Evaluate(symbol, timeframe, swingLength, emaFastPeriod, emaMidPeriod, emaSlowPeriod,
                    donchianLength, lookbackBars, 1, minimumFVGPoints, minimumBOSPoints, state))
      return 0;

   return state.compositeDir * weight;
}

#endif
//+------------------------------------------------------------------+
//|                      END EMBEDDED CORE                           |
//+------------------------------------------------------------------+

enum ENUM_GMS_PANEL_CORNER
{
   GMS_PANEL_TOP_LEFT = 0,
   GMS_PANEL_TOP_RIGHT = 1,
   GMS_PANEL_BOTTOM_LEFT = 2,
   GMS_PANEL_BOTTOM_RIGHT = 3
};

input group "General";
input int                  InpLookbackBars       = 900;
input bool                 InpShowDashboard      = true;
input ENUM_GMS_PANEL_CORNER InpDashboardCorner   = GMS_PANEL_TOP_RIGHT;
input bool                 InpDarkDashboard      = true;

input group "Market Structure";
input ENUM_GMS_STRUCTURE_SCOPE InpStructureScope = GMS_SCOPE_EXTERNAL;
input int                  InpExternalSwingLength = 20;
input int                  InpInternalSwingLength = 5;
input int                  InpSwingLabelBars     = 300;
input bool                 InpShowSwingLabels    = true;
input bool                 InpShowStructureLines = true;
input color                InpBullColor          = clrMediumSeaGreen;
input color                InpBearColor          = clrTomato;
input color                InpNeutralColor       = clrSilver;
input color                InpChochColor         = clrGold;

input group "EMA";
input bool                 InpShowEMA            = true;
input int                  InpEmaFastPeriod      = 20;
input int                  InpEmaMidPeriod       = 50;
input int                  InpEmaSlowPeriod      = 200;

input group "Donchian Ribbon";
input int                  InpDonchianLength     = 20;
input bool                 InpShowRibbonHint     = true;

input group "Order Blocks";
input bool                 InpShowOrderBlocks    = true;
input int                  InpZoneExtendBars     = 80;
input bool                 InpFreshZonesOnly     = false;

input group "Fair Value Gaps";
input bool                 InpShowFVG            = true;
input double               InpMinimumFVGPoints   = 5.0;

input group "Liquidity";
input bool                 InpShowLiquidity      = true;
input double               InpEqualHighLowPoints = 20.0;

input group "Premium Discount";
input bool                 InpShowPremiumDiscount = false;

input group "Alerts";
input bool                 InpAlertPopup         = true;
input bool                 InpAlertPush          = false;
input bool                 InpAlertEmail         = false;
input bool                 InpAlertSound         = false;
input string               InpAlertSoundFile     = "alert.wav";

input group "Multi-Timeframe Dashboard";
input bool                 InpTF1Enabled         = true;
input ENUM_TIMEFRAMES      InpTF1                = PERIOD_M5;
input int                  InpTF1Weight          = 1;
input bool                 InpTF2Enabled         = true;
input ENUM_TIMEFRAMES      InpTF2                = PERIOD_M15;
input int                  InpTF2Weight          = 1;
input bool                 InpTF3Enabled         = true;
input ENUM_TIMEFRAMES      InpTF3                = PERIOD_H1;
input int                  InpTF3Weight          = 2;
input bool                 InpTF4Enabled         = true;
input ENUM_TIMEFRAMES      InpTF4                = PERIOD_H4;
input int                  InpTF4Weight          = 2;
input bool                 InpTF5Enabled         = true;
input ENUM_TIMEFRAMES      InpTF5                = PERIOD_D1;
input int                  InpTF5Weight          = 3;
input bool                 InpTF6Enabled         = true;
input ENUM_TIMEFRAMES      InpTF6                = PERIOD_W1;
input int                  InpTF6Weight          = 4;
input bool                 InpTF7Enabled         = false;
input ENUM_TIMEFRAMES      InpTF7                = PERIOD_MN1;
input int                  InpTF7Weight          = 4;
input bool                 InpTF8Enabled         = false;
input ENUM_TIMEFRAMES      InpTF8                = PERIOD_MN1;
input int                  InpTF8Weight          = 4;

double EmaFastBuffer[];
double EmaMidBuffer[];
double EmaSlowBuffer[];
double SignalDirectionBuffer[];
double TrendScoreBuffer[];
double BosDirectionBuffer[];
double ChochDirectionBuffer[];
double ZoneTopBuffer[];
double ZoneBottomBuffer[];
double FvgTopBuffer[];
double FvgBottomBuffer[];
double EmaDirectionBuffer[];
double DonchianDirectionBuffer[];

string PREFIX = "GIO_MS_PRO_";
datetime g_lastAlertBar = 0;
int g_dashX = 0;   // absolute X pixel offset of the dashboard (computed per corner)
int g_dashY = 0;   // absolute Y pixel offset of the dashboard (computed per corner)

int ActiveSwingLength()
{
   if(InpStructureScope == GMS_SCOPE_INTERNAL)
      return MathMax(1, InpInternalSwingLength);
   return MathMax(1, InpExternalSwingLength);
}

color DirectionColor(const int dir)
{
   if(dir > 0)
      return InpBullColor;
   if(dir < 0)
      return InpBearColor;
   return InpNeutralColor;
}

void ClearObjects()
{
   ObjectsDeleteAll(0, PREFIX);
}

void SetLabel(const string name,
              const string text,
              const int x,
              const int y,
              const color textColor,
              const int fontSize,
              const bool bold)
{
   const string objectName = PREFIX + name;
   if(ObjectFind(0, objectName) < 0)
      ObjectCreate(0, objectName, OBJ_LABEL, 0, 0, 0);

   // Anchor to top-left and offset by g_dashX/g_dashY so the monospaced
   // columns stay aligned and the panel never slides under the price scale.
   ObjectSetInteger(0, objectName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, objectName, OBJPROP_ANCHOR, ANCHOR_LEFT_UPPER);
   ObjectSetInteger(0, objectName, OBJPROP_XDISTANCE, g_dashX + x);
   ObjectSetInteger(0, objectName, OBJPROP_YDISTANCE, g_dashY + y);
   ObjectSetInteger(0, objectName, OBJPROP_COLOR, textColor);
   ObjectSetInteger(0, objectName, OBJPROP_FONTSIZE, fontSize);
   ObjectSetString(0, objectName, OBJPROP_FONT, bold ? "Arial Bold" : "Consolas");
   ObjectSetString(0, objectName, OBJPROP_TEXT, text);
   ObjectSetInteger(0, objectName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, objectName, OBJPROP_HIDDEN, true);
}

void SetPanelBackground(const int width, const int height)
{
   const string objectName = PREFIX + "DASH_BG";
   if(ObjectFind(0, objectName) < 0)
      ObjectCreate(0, objectName, OBJ_RECTANGLE_LABEL, 0, 0, 0);

   ObjectSetInteger(0, objectName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, objectName, OBJPROP_XDISTANCE, g_dashX + 8);
   ObjectSetInteger(0, objectName, OBJPROP_YDISTANCE, g_dashY + 12);
   ObjectSetInteger(0, objectName, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, objectName, OBJPROP_YSIZE, height);
   ObjectSetInteger(0, objectName, OBJPROP_BGCOLOR, InpDarkDashboard ? clrBlack : clrWhiteSmoke);
   ObjectSetInteger(0, objectName, OBJPROP_BORDER_COLOR, InpDarkDashboard ? clrDimGray : clrSilver);
   ObjectSetInteger(0, objectName, OBJPROP_BACK, false);
   ObjectSetInteger(0, objectName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, objectName, OBJPROP_HIDDEN, true);
}

void FillEMA(const double &close[], const int ratesTotal, const int period, double &buffer[])
{
   if(ratesTotal <= 0)
      return;

   const double alpha = 2.0 / ((double)MathMax(1, period) + 1.0);
   for(int index = ratesTotal - 1; index >= 0; index--)
   {
      if(index == ratesTotal - 1)
         buffer[index] = close[index];
      else
         buffer[index] = alpha * close[index] + (1.0 - alpha) * buffer[index + 1];

      if(!InpShowEMA)
         buffer[index] = EMPTY_VALUE;
   }
}

int AddScore(const bool enabled, const ENUM_TIMEFRAMES timeframe, const int weight)
{
   if(!enabled)
      return 0;

   return GMS_TimeframeContribution(_Symbol, timeframe, weight, ActiveSwingLength(), InpEmaFastPeriod,
                                    InpEmaMidPeriod, InpEmaSlowPeriod, InpDonchianLength,
                                    InpLookbackBars, InpMinimumFVGPoints, 0.0);
}

int CalculateTrendScore()
{
   int score = 0;
   score += AddScore(InpTF1Enabled, InpTF1, InpTF1Weight);
   score += AddScore(InpTF2Enabled, InpTF2, InpTF2Weight);
   score += AddScore(InpTF3Enabled, InpTF3, InpTF3Weight);
   score += AddScore(InpTF4Enabled, InpTF4, InpTF4Weight);
   score += AddScore(InpTF5Enabled, InpTF5, InpTF5Weight);
   score += AddScore(InpTF6Enabled, InpTF6, InpTF6Weight);
   score += AddScore(InpTF7Enabled, InpTF7, InpTF7Weight);
   score += AddScore(InpTF8Enabled, InpTF8, InpTF8Weight);
   return score;
}

//+------------------------------------------------------------------+
//| Dashboard cell helpers (mirror the TradingView column layout)    |
//+------------------------------------------------------------------+
string MS_Arrow(const int dir)
{
   if(dir > 0) return ShortToString(0x2191);   // up arrow
   if(dir < 0) return ShortToString(0x2193);   // down arrow
   return "-";
}

// SWING H/L : a little slider showing where price sits between the
// last swing Low (L) and swing High (H).
string MS_SwingSlider(const double low, const double high, const double price)
{
   const string bar = ShortToString(0x2500);   // box-drawing horizontal
   const string dot = ShortToString(0x25CF);   // filled circle
   if(high <= low)
      return "L" + bar + bar + bar + bar + bar + bar + bar + bar + bar + "H";

   double frac = (price - low) / (high - low);
   if(frac < 0.0) frac = 0.0;
   if(frac > 1.0) frac = 1.0;

   const int seg = 9;
   const int pos = (int)MathRound(frac * (seg - 1));
   string track = "";
   for(int i = 0; i < seg; i++)
      track += (i == pos) ? dot : bar;
   return "L" + track + "H";
}

// STRUCTURE : the last three swing labels in order, e.g. "LL-LH-LL".
string MS_StructureSeq(const string symbol, const ENUM_TIMEFRAMES tf,
                       const int swingLen, int &dirOut)
{
   dirOut = 0;
   const int len = MathMax(1, swingLen);

   MqlRates r[];
   ArraySetAsSeries(r, true);
   const int need = MathMax(300, len * 12 + 60);
   const int total = CopyRates(symbol, tf, 0, need, r);
   if(total < len * 2 + 5)
      return "--";

   double prevHigh = 0.0, prevLow = 0.0;
   bool haveHigh = false, haveLow = false;
   string seq[];
   ArrayResize(seq, 0);

   for(int i = total - len - 1; i >= len; i--)
   {
      bool sh = true, sl = true;
      for(int j = 1; j <= len; j++)
      {
         if(r[i].high <= r[i - j].high || r[i].high <= r[i + j].high) sh = false;
         if(r[i].low  >= r[i - j].low  || r[i].low  >= r[i + j].low ) sl = false;
      }

      if(sh)
      {
         string lab = "H";
         if(haveHigh) lab = (r[i].high > prevHigh) ? "HH" : "LH";
         prevHigh = r[i].high; haveHigh = true;
         const int n = ArraySize(seq); ArrayResize(seq, n + 1); seq[n] = lab;
      }
      if(sl)
      {
         string lab = "L";
         if(haveLow) lab = (r[i].low > prevLow) ? "HL" : "LL";
         prevLow = r[i].low; haveLow = true;
         const int n = ArraySize(seq); ArrayResize(seq, n + 1); seq[n] = lab;
      }
   }

   const int cnt = ArraySize(seq);
   if(cnt == 0)
      return "--";

   string outStr = "";
   const int start = MathMax(0, cnt - 3);
   for(int k = start; k < cnt; k++)
      outStr += (k > start ? "-" : "") + seq[k];

   const string last = seq[cnt - 1];
   if(last == "HH" || last == "HL")      dirOut = 1;
   else if(last == "LL" || last == "LH") dirOut = -1;
   return outStr;
}

// ORDER BLOCK : nearest active OB and its % distance from price.
void MS_OrderBlockCell(const GMSState &st, const double price, string &txt, int &dirOut)
{
   dirOut = 0;
   txt = "--";

   if(st.inBullOB) { txt = "IN BULL OB"; dirOut = 1;  return; }
   if(st.inBearOB) { txt = "IN BEAR OB"; dirOut = -1; return; }

   const bool hb = st.bullOB.active;
   const bool hr = st.bearOB.active;
   if(!hb && !hr || price <= 0.0)
      return;

   const double bullMid = hb ? (st.bullOB.top + st.bullOB.bottom) * 0.5 : 0.0;
   const double bearMid = hr ? (st.bearOB.top + st.bearOB.bottom) * 0.5 : 0.0;
   const double dBull = hb ? (bullMid - price) / price * 100.0 : 0.0;
   const double dBear = hr ? (bearMid - price) / price * 100.0 : 0.0;

   bool useBull;
   if(hb && hr) useBull = (MathAbs(dBull) <= MathAbs(dBear));
   else         useBull = hb;

   if(useBull) { txt = StringFormat("BULL OB (%+.2f%%)", dBull); dirOut = 1; }
   else        { txt = StringFormat("BEAR OB (%+.2f%%)", dBear); dirOut = -1; }
}

// EMA-9 TREND : slope of a 9-period EMA over the last few bars (%).
double MS_EMA9Trend(const string symbol, const ENUM_TIMEFRAMES tf, int &dirOut)
{
   dirOut = 0;
   MqlRates r[];
   ArraySetAsSeries(r, true);
   const int total = CopyRates(symbol, tf, 0, 60, r);
   if(total < 20)
      return 0.0;

   const double e1 = GMS_EMAFromRates(r, total, 9, 1);
   const double e2 = GMS_EMAFromRates(r, total, 9, 6);
   if(e2 == 0.0)
      return 0.0;

   const double pct = (e1 - e2) / e2 * 100.0;
   dirOut = GMS_Sign(pct);
   return pct;
}

//+------------------------------------------------------------------+
//| One dashboard row : TF | SWING H/L | STRUCTURE | OB | EMA-9       |
//+------------------------------------------------------------------+
void DrawDashboardRow(const int row, const ENUM_TIMEFRAMES timeframe, const int weight, int &score)
{
   GMSState st;
   const bool ok = GMS_Evaluate(_Symbol, timeframe, ActiveSwingLength(), InpEmaFastPeriod,
                                InpEmaMidPeriod, InpEmaSlowPeriod, InpDonchianLength,
                                InpLookbackBars, 1, InpMinimumFVGPoints, 0.0, st);
   score += (ok ? st.compositeDir * weight : 0);

   const int    y   = 64 + row * 19;
   const string idx = IntegerToString(row);
   const color  tfCol = InpDarkDashboard ? clrWhite : clrBlack;
   const color  neutral = InpNeutralColor;

   SetLabel("R_TF_" + idx, GMS_TFToString(timeframe), 14, y, tfCol, 8, true);

   if(!ok)
   {
      SetLabel("R_SW_" + idx, "n/a", 46,  y, neutral, 8, false);
      SetLabel("R_ST_" + idx, "--",  168, y, neutral, 8, false);
      SetLabel("R_OB_" + idx, "--",  258, y, neutral, 8, false);
      SetLabel("R_EM_" + idx, "--",  398, y, neutral, 8, false);
      return;
   }

   // SWING H/L
   SetLabel("R_SW_" + idx, MS_SwingSlider(st.lastSwingLow, st.lastSwingHigh, st.closedClose),
            46, y, DirectionColor(st.structureDir), 8, false);

   // STRUCTURE
   int seqDir = 0;
   const string seq = MS_StructureSeq(_Symbol, timeframe, ActiveSwingLength(), seqDir);
   const int strDir = (st.structureDir != 0 ? st.structureDir : seqDir);
   SetLabel("R_ST_" + idx, seq + " " + MS_Arrow(strDir), 168, y, DirectionColor(strDir), 8, false);

   // ORDER BLOCK
   string obTxt; int obDir;
   MS_OrderBlockCell(st, st.closedClose, obTxt, obDir);
   SetLabel("R_OB_" + idx, obTxt + " " + MS_Arrow(obDir), 258, y, DirectionColor(obDir), 8, false);

   // EMA-9 TREND
   int emaDir;
   const double emaPct = MS_EMA9Trend(_Symbol, timeframe, emaDir);
   SetLabel("R_EM_" + idx, StringFormat("%+.2f%% ", emaPct) + MS_Arrow(emaDir),
            398, y, DirectionColor(emaDir), 8, false);
}

//+------------------------------------------------------------------+
//| Full dashboard                                                   |
//+------------------------------------------------------------------+
void DrawDashboard(const GMSState &state)
{
   if(!InpShowDashboard)
      return;

   int rowsCount = 0;
   if(InpTF1Enabled) rowsCount++;
   if(InpTF2Enabled) rowsCount++;
   if(InpTF3Enabled) rowsCount++;
   if(InpTF4Enabled) rowsCount++;
   if(InpTF5Enabled) rowsCount++;
   if(InpTF6Enabled) rowsCount++;
   if(InpTF7Enabled) rowsCount++;
   if(InpTF8Enabled) rowsCount++;
   if(rowsCount < 1) rowsCount = 1;

   // Place the panel in the chosen corner using an absolute pixel offset so it
   // always sits INSIDE the chart area (clear of the right-hand price scale).
   const int panelW = 488;
   const int panelH = 64 + rowsCount * 19 + 46;
   const int chartW = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS, 0);
   const int chartH = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS, 0);
   const bool isRight  = (InpDashboardCorner == GMS_PANEL_TOP_RIGHT ||
                          InpDashboardCorner == GMS_PANEL_BOTTOM_RIGHT);
   const bool isBottom = (InpDashboardCorner == GMS_PANEL_BOTTOM_LEFT ||
                          InpDashboardCorner == GMS_PANEL_BOTTOM_RIGHT);
   g_dashX = isRight  ? MathMax(0, chartW - panelW - 16) : 0;
   g_dashY = isBottom ? MathMax(0, chartH - panelH - 10) : 0;

   SetPanelBackground(panelW, panelH);
   const color titleColor = InpDarkDashboard ? clrWhite : clrBlack;
   const color mutedColor = InpDarkDashboard ? clrSilver : clrDimGray;

   SetLabel("DASH_TITLE", "MARKET STRUCTURE DASHBOARD", 14, 20, titleColor, 9, true);
   SetLabel("H_TF", "TF",          14,  44, mutedColor, 8, true);
   SetLabel("H_SW", "SWING H/L",   46,  44, mutedColor, 8, true);
   SetLabel("H_ST", "STRUCTURE",   168, 44, mutedColor, 8, true);
   SetLabel("H_OB", "ORDER BLOCK", 258, 44, mutedColor, 8, true);
   SetLabel("H_EM", "EMA-9 TREND", 398, 44, mutedColor, 8, true);

   int score = 0;
   int vrow = 0;
   if(InpTF1Enabled) { DrawDashboardRow(vrow, InpTF1, InpTF1Weight, score); vrow++; }
   if(InpTF2Enabled) { DrawDashboardRow(vrow, InpTF2, InpTF2Weight, score); vrow++; }
   if(InpTF3Enabled) { DrawDashboardRow(vrow, InpTF3, InpTF3Weight, score); vrow++; }
   if(InpTF4Enabled) { DrawDashboardRow(vrow, InpTF4, InpTF4Weight, score); vrow++; }
   if(InpTF5Enabled) { DrawDashboardRow(vrow, InpTF5, InpTF5Weight, score); vrow++; }
   if(InpTF6Enabled) { DrawDashboardRow(vrow, InpTF6, InpTF6Weight, score); vrow++; }
   if(InpTF7Enabled) { DrawDashboardRow(vrow, InpTF7, InpTF7Weight, score); vrow++; }
   if(InpTF8Enabled) { DrawDashboardRow(vrow, InpTF8, InpTF8Weight, score); vrow++; }

   const int baseY = 64 + vrow * 19 + 6;
   const int overall = GMS_Sign((double)score);
   SetLabel("F_BIAS", "OVERALL: " + GMS_DirectionText(overall) + StringFormat("  (score %+d)", score),
            14, baseY, DirectionColor(overall), 9, true);

   const string sig = state.buySetup ? "BUY SETUP" : (state.sellSetup ? "SELL SETUP" : "--");
   SetLabel("F_NOW", "NOW: " + GMS_DirectionText(state.structureDir) +
            "  BOS " + IntegerToString(state.lastBosDir) +
            "  CHOCH " + IntegerToString(state.lastChochDir) + "  | " + sig,
            14, baseY + 18,
            state.buySetup ? InpBullColor : (state.sellSetup ? InpBearColor : mutedColor), 8, false);
}

void DrawZone(const string name, const GMSZone &zone, const color zoneColor, const datetime endTime, const string text)
{
   if(!zone.active)
      return;

   const string objectName = PREFIX + name;
   if(ObjectFind(0, objectName) < 0)
      ObjectCreate(0, objectName, OBJ_RECTANGLE, 0, zone.startTime, zone.top, endTime, zone.bottom);
   else
   {
      ObjectMove(0, objectName, 0, zone.startTime, zone.top);
      ObjectMove(0, objectName, 1, endTime, zone.bottom);
   }

   ObjectSetInteger(0, objectName, OBJPROP_COLOR, zoneColor);
   ObjectSetInteger(0, objectName, OBJPROP_BACK, true);
   ObjectSetInteger(0, objectName, OBJPROP_STYLE, STYLE_SOLID);
   ObjectSetInteger(0, objectName, OBJPROP_WIDTH, 1);
   ObjectSetInteger(0, objectName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, objectName, OBJPROP_HIDDEN, true);

   const string labelName = objectName + "_LABEL";
   if(ObjectFind(0, labelName) < 0)
      ObjectCreate(0, labelName, OBJ_TEXT, 0, zone.startTime, GMS_MidPrice(zone));
   else
      ObjectMove(0, labelName, 0, zone.startTime, GMS_MidPrice(zone));

   ObjectSetString(0, labelName, OBJPROP_TEXT, text);
   ObjectSetInteger(0, labelName, OBJPROP_COLOR, zoneColor);
   ObjectSetInteger(0, labelName, OBJPROP_FONTSIZE, 8);
   ObjectSetInteger(0, labelName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, labelName, OBJPROP_HIDDEN, true);
}

void DrawPremiumDiscount(const GMSState &state, const datetime endTime)
{
   if(!InpShowPremiumDiscount)
      return;

   if(state.lastSwingHigh <= 0.0 || state.lastSwingLow <= 0.0 || state.lastSwingHigh <= state.lastSwingLow)
      return;

   const datetime startTime = (state.lastSwingHighTime < state.lastSwingLowTime ? state.lastSwingHighTime : state.lastSwingLowTime);
   const double equilibrium = (state.lastSwingHigh + state.lastSwingLow) * 0.5;

   GMSZone premium;
   GMSZone discount;
   GMS_ResetZone(premium);
   GMS_ResetZone(discount);

   premium.dir = -1;
   premium.top = state.lastSwingHigh;
   premium.bottom = equilibrium;
   premium.startTime = startTime;
   premium.active = true;

   discount.dir = 1;
   discount.top = equilibrium;
   discount.bottom = state.lastSwingLow;
   discount.startTime = startTime;
   discount.active = true;

   DrawZone("PREMIUM", premium, clrMaroon, endTime, "Premium");
   DrawZone("DISCOUNT", discount, clrDarkGreen, endTime, "Discount");

   const string eqName = PREFIX + "EQUILIBRIUM";
   if(ObjectFind(0, eqName) < 0)
      ObjectCreate(0, eqName, OBJ_TREND, 0, startTime, equilibrium, endTime, equilibrium);
   else
   {
      ObjectMove(0, eqName, 0, startTime, equilibrium);
      ObjectMove(0, eqName, 1, endTime, equilibrium);
   }

   ObjectSetInteger(0, eqName, OBJPROP_COLOR, InpNeutralColor);
   ObjectSetInteger(0, eqName, OBJPROP_STYLE, STYLE_DOT);
   ObjectSetInteger(0, eqName, OBJPROP_RAY_RIGHT, false);
   ObjectSetInteger(0, eqName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, eqName, OBJPROP_HIDDEN, true);
}

void DrawSwingText(const string name,
                   const datetime when,
                   const double price,
                   const string label,
                   const color labelColor)
{
   const string objectName = PREFIX + name;
   if(ObjectFind(0, objectName) < 0)
      ObjectCreate(0, objectName, OBJ_TEXT, 0, when, price);
   else
      ObjectMove(0, objectName, 0, when, price);

   ObjectSetString(0, objectName, OBJPROP_TEXT, label);
   ObjectSetInteger(0, objectName, OBJPROP_COLOR, labelColor);
   ObjectSetInteger(0, objectName, OBJPROP_FONTSIZE, 8);
   ObjectSetInteger(0, objectName, OBJPROP_ANCHOR, ANCHOR_CENTER);
   ObjectSetInteger(0, objectName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, objectName, OBJPROP_HIDDEN, true);
}

void DrawSwingHistory(const datetime &time[],
                      const double &high[],
                      const double &low[],
                      const int ratesTotal,
                      const int swingLength)
{
   if(!InpShowSwingLabels || ratesTotal <= swingLength * 2 + 5)
      return;

   double prevHigh = 0.0;
   double prevLow = 0.0;
   bool haveHigh = false;
   bool haveLow = false;
   const double offset = MathMax(20.0 * _Point, 0.0001);

   for(int index = ratesTotal - swingLength - 1; index >= swingLength; index--)
   {
      bool swingHigh = true;
      bool swingLow = true;
      for(int j = 1; j <= swingLength; j++)
      {
         if(high[index] <= high[index - j] || high[index] <= high[index + j])
            swingHigh = false;
         if(low[index] >= low[index - j] || low[index] >= low[index + j])
            swingLow = false;
      }

      if(swingHigh)
      {
         string label = "H";
         if(haveHigh)
            label = (high[index] > prevHigh ? "HH" : "LH");
         prevHigh = high[index];
         haveHigh = true;

         if(index <= InpSwingLabelBars)
            DrawSwingText("SW_H_" + IntegerToString((long)time[index]), time[index], high[index] + offset, label, label == "HH" ? InpBullColor : InpBearColor);
      }

      if(swingLow)
      {
         string label = "L";
         if(haveLow)
            label = (low[index] > prevLow ? "HL" : "LL");
         prevLow = low[index];
         haveLow = true;

         if(index <= InpSwingLabelBars)
            DrawSwingText("SW_L_" + IntegerToString((long)time[index]), time[index], low[index] - offset, label, label == "HL" ? InpBullColor : InpBearColor);
      }
   }
}

void DrawLiquidity(const datetime &time[],
                   const double &high[],
                   const double &low[],
                   const double &close[],
                   const int ratesTotal,
                   const int swingLength)
{
   if(!InpShowLiquidity || ratesTotal <= swingLength * 2 + 5)
      return;

   const double tolerance = MathMax(0.0, InpEqualHighLowPoints) * _Point;
   double previousSwingHigh = 0.0;
   double previousSwingLow = 0.0;
   datetime previousHighTime = 0;
   datetime previousLowTime = 0;
   const double offset = MathMax(25.0 * _Point, 0.0001);

   for(int index = ratesTotal - swingLength - 1; index >= swingLength; index--)
   {
      bool swingHigh = true;
      bool swingLow = true;
      for(int j = 1; j <= swingLength; j++)
      {
         if(high[index] <= high[index - j] || high[index] <= high[index + j])
            swingHigh = false;
         if(low[index] >= low[index - j] || low[index] >= low[index + j])
            swingLow = false;
      }

      if(swingHigh)
      {
         if(previousSwingHigh > 0.0 && MathAbs(high[index] - previousSwingHigh) <= tolerance && index <= InpSwingLabelBars)
         {
            DrawSwingText("EQH_" + IntegerToString((long)time[index]), time[index], high[index] + offset * 2.0, "EQH", InpChochColor);
            DrawSwingText("EQH_PREV_" + IntegerToString((long)previousHighTime), previousHighTime, previousSwingHigh + offset * 2.0, "EQH", InpChochColor);
         }

         previousSwingHigh = high[index];
         previousHighTime = time[index];
      }

      if(swingLow)
      {
         if(previousSwingLow > 0.0 && MathAbs(low[index] - previousSwingLow) <= tolerance && index <= InpSwingLabelBars)
         {
            DrawSwingText("EQL_" + IntegerToString((long)time[index]), time[index], low[index] - offset * 2.0, "EQL", InpChochColor);
            DrawSwingText("EQL_PREV_" + IntegerToString((long)previousLowTime), previousLowTime, previousSwingLow - offset * 2.0, "EQL", InpChochColor);
         }

         previousSwingLow = low[index];
         previousLowTime = time[index];
      }
   }

   if(previousSwingHigh > 0.0 && high[1] > previousSwingHigh && close[1] < previousSwingHigh)
      DrawSwingText("SWEEP_H_" + IntegerToString((long)time[1]), time[1], high[1] + offset * 3.0, "Sweep H", InpChochColor);

   if(previousSwingLow > 0.0 && low[1] < previousSwingLow && close[1] > previousSwingLow)
      DrawSwingText("SWEEP_L_" + IntegerToString((long)time[1]), time[1], low[1] - offset * 3.0, "Sweep L", InpChochColor);
}

void FireAlert(const string message)
{
   const string fullMessage = _Symbol + " " + GMS_TFToString((ENUM_TIMEFRAMES)_Period) + " | " + message;
   if(InpAlertPopup)
      Alert(fullMessage);
   if(InpAlertPush)
      SendNotification(fullMessage);
   if(InpAlertEmail)
      SendMail("GIO Market Structure PRO", fullMessage);
   if(InpAlertSound)
      PlaySound(InpAlertSoundFile);
}

void ProcessAlerts(const GMSState &state)
{
   if(state.closedTime == g_lastAlertBar)
      return;

   g_lastAlertBar = state.closedTime;

   if(state.barsSinceBOS == 0 && state.lastBosDir > 0)
      FireAlert("Bullish BOS");
   if(state.barsSinceBOS == 0 && state.lastBosDir < 0)
      FireAlert("Bearish BOS");
   if(state.barsSinceCHOCH == 0 && state.lastChochDir > 0)
      FireAlert("Bullish CHOCH");
   if(state.barsSinceCHOCH == 0 && state.lastChochDir < 0)
      FireAlert("Bearish CHOCH");
   if(state.buySetup)
      FireAlert("Buy setup");
   if(state.sellSetup)
      FireAlert("Sell setup");
}

int OnInit()
{
   SetIndexBuffer(0, EmaFastBuffer, INDICATOR_DATA);
   SetIndexBuffer(1, EmaMidBuffer, INDICATOR_DATA);
   SetIndexBuffer(2, EmaSlowBuffer, INDICATOR_DATA);
   SetIndexBuffer(3, SignalDirectionBuffer, INDICATOR_DATA);
   SetIndexBuffer(4, TrendScoreBuffer, INDICATOR_DATA);
   SetIndexBuffer(5, BosDirectionBuffer, INDICATOR_DATA);
   SetIndexBuffer(6, ChochDirectionBuffer, INDICATOR_DATA);
   SetIndexBuffer(7, ZoneTopBuffer, INDICATOR_DATA);
   SetIndexBuffer(8, ZoneBottomBuffer, INDICATOR_DATA);
   SetIndexBuffer(9, FvgTopBuffer, INDICATOR_DATA);
   SetIndexBuffer(10, FvgBottomBuffer, INDICATOR_DATA);
   SetIndexBuffer(11, EmaDirectionBuffer, INDICATOR_DATA);
   SetIndexBuffer(12, DonchianDirectionBuffer, INDICATOR_DATA);

   ArraySetAsSeries(EmaFastBuffer, true);
   ArraySetAsSeries(EmaMidBuffer, true);
   ArraySetAsSeries(EmaSlowBuffer, true);
   ArraySetAsSeries(SignalDirectionBuffer, true);
   ArraySetAsSeries(TrendScoreBuffer, true);
   ArraySetAsSeries(BosDirectionBuffer, true);
   ArraySetAsSeries(ChochDirectionBuffer, true);
   ArraySetAsSeries(ZoneTopBuffer, true);
   ArraySetAsSeries(ZoneBottomBuffer, true);
   ArraySetAsSeries(FvgTopBuffer, true);
   ArraySetAsSeries(FvgBottomBuffer, true);
   ArraySetAsSeries(EmaDirectionBuffer, true);
   ArraySetAsSeries(DonchianDirectionBuffer, true);

   for(int plot = 3; plot < 13; plot++)
      PlotIndexSetDouble(plot, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   IndicatorSetString(INDICATOR_SHORTNAME, "GIO Market Structure PRO");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   ClearObjects();
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
   if(rates_total < MathMax(InpEmaSlowPeriod, InpDonchianLength) + ActiveSwingLength() * 2 + 20)
      return 0;

   ArraySetAsSeries(time, true);
   ArraySetAsSeries(open, true);
   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(close, true);

   FillEMA(close, rates_total, InpEmaFastPeriod, EmaFastBuffer);
   FillEMA(close, rates_total, InpEmaMidPeriod, EmaMidBuffer);
   FillEMA(close, rates_total, InpEmaSlowPeriod, EmaSlowBuffer);

   const int trendScore = CalculateTrendScore();

   GMSState state;
   const bool ok = GMS_Evaluate(_Symbol, (ENUM_TIMEFRAMES)_Period, ActiveSwingLength(), InpEmaFastPeriod,
                                InpEmaMidPeriod, InpEmaSlowPeriod, InpDonchianLength,
                                InpLookbackBars, 1, InpMinimumFVGPoints, 0.0, state);

   if(!ok)
      return rates_total;

   for(int index = 0; index < MathMin(rates_total, 5); index++)
   {
      SignalDirectionBuffer[index] = EMPTY_VALUE;
      TrendScoreBuffer[index] = EMPTY_VALUE;
      BosDirectionBuffer[index] = EMPTY_VALUE;
      ChochDirectionBuffer[index] = EMPTY_VALUE;
      ZoneTopBuffer[index] = EMPTY_VALUE;
      ZoneBottomBuffer[index] = EMPTY_VALUE;
      FvgTopBuffer[index] = EMPTY_VALUE;
      FvgBottomBuffer[index] = EMPTY_VALUE;
      EmaDirectionBuffer[index] = EMPTY_VALUE;
      DonchianDirectionBuffer[index] = EMPTY_VALUE;
   }

   SignalDirectionBuffer[1] = (double)state.compositeDir;
   TrendScoreBuffer[1] = (double)trendScore;
   BosDirectionBuffer[1] = (double)state.lastBosDir;
   ChochDirectionBuffer[1] = (double)state.lastChochDir;
   EmaDirectionBuffer[1] = (double)state.emaDir;
   DonchianDirectionBuffer[1] = (double)state.donchianDir;

   if(state.bullOB.active)
   {
      ZoneTopBuffer[1] = state.bullOB.top;
      ZoneBottomBuffer[1] = state.bullOB.bottom;
   }
   else if(state.bearOB.active)
   {
      ZoneTopBuffer[1] = state.bearOB.top;
      ZoneBottomBuffer[1] = state.bearOB.bottom;
   }

   if(state.bullFVG.active)
   {
      FvgTopBuffer[1] = state.bullFVG.top;
      FvgBottomBuffer[1] = state.bullFVG.bottom;
   }
   else if(state.bearFVG.active)
   {
      FvgTopBuffer[1] = state.bearFVG.top;
      FvgBottomBuffer[1] = state.bearFVG.bottom;
   }

   ClearObjects();
   const datetime zoneEnd = time[0] + (datetime)((long)PeriodSeconds((ENUM_TIMEFRAMES)_Period) * (long)MathMax(1, InpZoneExtendBars));

   GMSZone visibleBullOB = state.bullOB;
   GMSZone visibleBearOB = state.bearOB;
   if(InpFreshZonesOnly)
   {
      if(state.inBullOB)
         visibleBullOB.active = false;
      if(state.inBearOB)
         visibleBearOB.active = false;
   }

   if(InpShowOrderBlocks)
   {
      DrawZone("BULL_OB", visibleBullOB, InpBullColor, zoneEnd, "Bull OB");
      DrawZone("BEAR_OB", visibleBearOB, InpBearColor, zoneEnd, "Bear OB");
   }

   if(InpShowFVG)
   {
      DrawZone("BULL_FVG", state.bullFVG, InpBullColor, zoneEnd, "Bull FVG");
      DrawZone("BEAR_FVG", state.bearFVG, InpBearColor, zoneEnd, "Bear FVG");
   }

   DrawPremiumDiscount(state, zoneEnd);

   if(InpShowStructureLines)
   {
      if(state.barsSinceBOS <= InpSwingLabelBars)
      {
         const int bosIndex = 1 + state.barsSinceBOS;
         if(bosIndex < rates_total)
            DrawSwingText("BOS_" + IntegerToString((long)time[bosIndex]), time[bosIndex], close[bosIndex], "BOS", DirectionColor(state.lastBosDir));
      }
      if(state.barsSinceCHOCH <= InpSwingLabelBars)
      {
         const int chochIndex = 1 + state.barsSinceCHOCH;
         if(chochIndex < rates_total)
            DrawSwingText("CHOCH_" + IntegerToString((long)time[chochIndex]), time[chochIndex], close[chochIndex], "CHOCH", InpChochColor);
      }
   }

   DrawSwingHistory(time, high, low, rates_total, ActiveSwingLength());
   DrawLiquidity(time, high, low, close, rates_total, ActiveSwingLength());
   DrawDashboard(state);
   ProcessAlerts(state);

   return rates_total;
}
