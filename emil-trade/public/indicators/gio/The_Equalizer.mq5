//+------------------------------------------------------------------+
//|                                             The_Equalizer.mq5     |
//|                    Adaptive Trend + Momentum Equilibrium Engine   |
//|                                (c) 2026  The Equalizer Project    |
//+------------------------------------------------------------------+
//| v1.10 - Regime-aware. Avoids sideways/range markets and only     |
//|         signals on TREND CHANGES inside a confirmed trend.        |
//|                                                                  |
//| Regime engine (0..100 Trend Regime Score):                       |
//|   - ADX               (trend strength)      weight 0.40           |
//|   - Kaufman Eff. Ratio (directional purity)  weight 0.40          |
//|   - Bollinger width expansion (breakout)     weight 0.20          |
//| Below threshold => RANGE => no signals. Above => TREND => armed.  |
//|                                                                  |
//| Signal = a fresh directional STATE transition (down/flat -> up    |
//|          or up/flat -> down) while trending. It does NOT re-fire   |
//|          bar after bar; it acts once, at the change.             |
//|                                                                  |
//| Buffer contract (read by The Equalizer EA via iCustom):          |
//|   0 Baseline  1 Upper  2 Lower  3 Buy  4 Sell                     |
//|   5 Score(-100..100)  6 Flag(+1/-1/0)  7 Regime(0..100)           |
//|   8 State(+1/-1/0, internal)                                      |
//| Non-repaint: evaluated on CLOSED bars only.                      |
//+------------------------------------------------------------------+
#property copyright "The Equalizer"
#property link      ""
#property version   "1.10"
#property description "The Equalizer - regime-aware trend-change signals. Avoids range markets. Tuned for XAUUSD."
#property indicator_chart_window
#property indicator_buffers 9
#property indicator_plots   5

//--- Plot 0: Baseline
#property indicator_label1  "EQ Baseline"
#property indicator_type1   DRAW_LINE
#property indicator_color1  clrGold
#property indicator_style1  STYLE_SOLID
#property indicator_width1  2
//--- Plot 1: Upper band
#property indicator_label2  "EQ Upper"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrSlateGray
#property indicator_style2  STYLE_DOT
#property indicator_width2  1
//--- Plot 2: Lower band
#property indicator_label3  "EQ Lower"
#property indicator_type3   DRAW_LINE
#property indicator_color3  clrSlateGray
#property indicator_style3  STYLE_DOT
#property indicator_width3  1
//--- Plot 3: Buy arrow
#property indicator_label4  "EQ Buy"
#property indicator_type4   DRAW_ARROW
#property indicator_color4  clrLime
#property indicator_width4  2
//--- Plot 4: Sell arrow
#property indicator_label5  "EQ Sell"
#property indicator_type5   DRAW_ARROW
#property indicator_color5  clrRed
#property indicator_width5  2

//--- inputs (ORDER MATTERS: The Equalizer EA iCustom must match exactly)
input int    InpKamaPeriod      = 10;    // Baseline (AMA) period
input int    InpKamaFast        = 2;     // Baseline fast EMA
input int    InpKamaSlow        = 30;    // Baseline slow EMA
input int    InpAtrPeriod       = 14;    // ATR period (bands / normalize)
input double InpBandMult        = 1.5;   // Band width (ATR multiple)
input int    InpRsiPeriod       = 14;    // RSI period
input int    InpMomPeriod       = 10;    // Momentum lookback (bars)
input double InpSignalThreshold = 25.0;  // Momentum score threshold (0..100)
input bool   InpRequireSlope    = true;  // Require baseline slope agreement
//--- regime filter (avoid range markets)
input int    InpAdxPeriod       = 14;    // ADX period
input double InpAdxMinLevel     = 20.0;  // ADX level where trend "counts"
input int    InpErPeriod        = 14;    // Kaufman Efficiency Ratio period
input double InpErMinLevel      = 0.30;  // ER level where trend "counts"
input int    InpBbPeriod        = 20;    // Bollinger period
input double InpBbDev           = 2.0;   // Bollinger deviations
input int    InpBbwAvgPeriod    = 50;    // Band-width average (squeeze ref)
input double InpRegimeThreshold = 45.0;  // Regime score to ARM signals (trend)
input double InpRangeResetLevel = 30.0;  // Below this = confirmed range (reset)

//--- buffers
double BaselineBuf[];
double UpperBuf[];
double LowerBuf[];
double BuyBuf[];
double SellBuf[];
double ScoreBuf[];
double FlagBuf[];
double RegimeBuf[];
double StateBuf[];

//--- indicator handles
int hAMA   = INVALID_HANDLE;
int hATR   = INVALID_HANDLE;
int hRSI   = INVALID_HANDLE;
int hADX   = INVALID_HANDLE;
int hBands = INVALID_HANDLE;

//--- composite momentum weights
const double W_TREND = 0.45;
const double W_RSI   = 0.30;
const double W_MOM   = 0.25;
//--- regime weights
const double W_ADX = 0.40;
const double W_ER  = 0.40;
const double W_BBW = 0.20;

//+------------------------------------------------------------------+
double Clamp(const double v, const double lo, const double hi)
{
   if(v < lo) return(lo);
   if(v > hi) return(hi);
   return(v);
}

//+------------------------------------------------------------------+
int OnInit()
{
   SetIndexBuffer(0, BaselineBuf, INDICATOR_DATA);
   SetIndexBuffer(1, UpperBuf,    INDICATOR_DATA);
   SetIndexBuffer(2, LowerBuf,    INDICATOR_DATA);
   SetIndexBuffer(3, BuyBuf,      INDICATOR_DATA);
   SetIndexBuffer(4, SellBuf,     INDICATOR_DATA);
   SetIndexBuffer(5, ScoreBuf,    INDICATOR_DATA);
   SetIndexBuffer(6, FlagBuf,     INDICATOR_DATA);
   SetIndexBuffer(7, RegimeBuf,   INDICATOR_DATA);
   SetIndexBuffer(8, StateBuf,    INDICATOR_DATA);

   PlotIndexSetInteger(3, PLOT_ARROW, 233);
   PlotIndexSetInteger(4, PLOT_ARROW, 234);
   PlotIndexSetDouble(3, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(4, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   IndicatorSetInteger(INDICATOR_DIGITS, _Digits);
   IndicatorSetString(INDICATOR_SHORTNAME, "The Equalizer");

   hAMA   = iAMA(_Symbol, _Period, InpKamaPeriod, InpKamaFast, InpKamaSlow, 0, PRICE_CLOSE);
   hATR   = iATR(_Symbol, _Period, InpAtrPeriod);
   hRSI   = iRSI(_Symbol, _Period, InpRsiPeriod, PRICE_CLOSE);
   hADX   = iADX(_Symbol, _Period, InpAdxPeriod);
   hBands = iBands(_Symbol, _Period, InpBbPeriod, 0, InpBbDev, PRICE_CLOSE);

   if(hAMA == INVALID_HANDLE || hATR == INVALID_HANDLE || hRSI == INVALID_HANDLE ||
      hADX == INVALID_HANDLE || hBands == INVALID_HANDLE)
   {
      Print("The Equalizer: failed to create one or more indicator handles.");
      return(INIT_FAILED);
   }
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(hAMA   != INVALID_HANDLE) IndicatorRelease(hAMA);
   if(hATR   != INVALID_HANDLE) IndicatorRelease(hATR);
   if(hRSI   != INVALID_HANDLE) IndicatorRelease(hRSI);
   if(hADX   != INVALID_HANDLE) IndicatorRelease(hADX);
   if(hBands != INVALID_HANDLE) IndicatorRelease(hBands);
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
   int need = InpBbPeriod + InpBbwAvgPeriod;
   need = (int)MathMax(need, InpKamaSlow);
   need = (int)MathMax(need, InpAtrPeriod);
   need = (int)MathMax(need, InpRsiPeriod);
   need = (int)MathMax(need, InpMomPeriod);
   need = (int)MathMax(need, InpAdxPeriod);
   need = (int)MathMax(need, InpErPeriod);
   need += 5;

   if(rates_total <= need)
      return(0);

   ArraySetAsSeries(time,  true);
   ArraySetAsSeries(high,  true);
   ArraySetAsSeries(low,   true);
   ArraySetAsSeries(close, true);

   ArraySetAsSeries(BaselineBuf, true);
   ArraySetAsSeries(UpperBuf,    true);
   ArraySetAsSeries(LowerBuf,    true);
   ArraySetAsSeries(BuyBuf,      true);
   ArraySetAsSeries(SellBuf,     true);
   ArraySetAsSeries(ScoreBuf,    true);
   ArraySetAsSeries(FlagBuf,     true);
   ArraySetAsSeries(RegimeBuf,   true);
   ArraySetAsSeries(StateBuf,    true);

   if(BarsCalculated(hAMA)   < rates_total) return(prev_calculated);
   if(BarsCalculated(hATR)   < rates_total) return(prev_calculated);
   if(BarsCalculated(hRSI)   < rates_total) return(prev_calculated);
   if(BarsCalculated(hADX)   < rates_total) return(prev_calculated);
   if(BarsCalculated(hBands) < rates_total) return(prev_calculated);

   double amaArr[], atrArr[], rsiArr[], adxArr[], bbUpArr[], bbLoArr[];
   ArraySetAsSeries(amaArr,  true);
   ArraySetAsSeries(atrArr,  true);
   ArraySetAsSeries(rsiArr,  true);
   ArraySetAsSeries(adxArr,  true);
   ArraySetAsSeries(bbUpArr, true);
   ArraySetAsSeries(bbLoArr, true);

   if(CopyBuffer(hAMA,   0, 0, rates_total, amaArr)  <= 0) return(prev_calculated);
   if(CopyBuffer(hATR,   0, 0, rates_total, atrArr)  <= 0) return(prev_calculated);
   if(CopyBuffer(hRSI,   0, 0, rates_total, rsiArr)  <= 0) return(prev_calculated);
   if(CopyBuffer(hADX,   0, 0, rates_total, adxArr)  <= 0) return(prev_calculated);
   if(CopyBuffer(hBands, 1, 0, rates_total, bbUpArr) <= 0) return(prev_calculated);
   if(CopyBuffer(hBands, 2, 0, rates_total, bbLoArr) <= 0) return(prev_calculated);

   int toCompute;
   if(prev_calculated == 0)
      toCompute = rates_total - need;
   else
      toCompute = rates_total - prev_calculated + 1;

   if(toCompute > rates_total - need) toCompute = rates_total - need;
   if(toCompute < 1) toCompute = 1;

   for(int i = toCompute - 1; i >= 0; i--)
   {
      double baseline = amaArr[i];
      double atr      = atrArr[i];
      double rsi      = rsiArr[i];

      BaselineBuf[i] = baseline;
      UpperBuf[i]    = baseline + atr * InpBandMult;
      LowerBuf[i]    = baseline - atr * InpBandMult;

      BuyBuf[i]  = EMPTY_VALUE;
      SellBuf[i] = EMPTY_VALUE;
      FlagBuf[i] = 0.0;

      double prevState = StateBuf[i + 1];

      if(atr <= 0.0)
      {
         ScoreBuf[i]  = 0.0;
         RegimeBuf[i] = 0.0;
         StateBuf[i]  = prevState;
         continue;
      }

      //================= MOMENTUM SCORE ==============================
      double td = Clamp((close[i] - baseline) / (atr * InpBandMult), -1.0, 1.0);
      double rc = Clamp((rsi - 50.0) / 50.0, -1.0, 1.0);

      double mc = 0.0;
      if(i + InpMomPeriod < rates_total)
         mc = (close[i] - close[i + InpMomPeriod]) / (atr * 3.0);
      mc = Clamp(mc, -1.0, 1.0);

      double score = 100.0 * (W_TREND * td + W_RSI * rc + W_MOM * mc);
      ScoreBuf[i] = score;

      //================= REGIME SCORE (avoid range) =================
      double adxComp = Clamp((adxArr[i] - InpAdxMinLevel) / 15.0, 0.0, 1.0);

      //--- Kaufman Efficiency Ratio
      double erComp = 0.0;
      if(i + InpErPeriod < rates_total)
      {
         double direction = MathAbs(close[i] - close[i + InpErPeriod]);
         double noise = 0.0;
         for(int k = 0; k < InpErPeriod; k++)
            noise += MathAbs(close[i + k] - close[i + k + 1]);
         double er = (noise > 0.0) ? (direction / noise) : 0.0;
         erComp = Clamp((er - InpErMinLevel) / (1.0 - InpErMinLevel), 0.0, 1.0);
      }

      //--- Bollinger band-width expansion vs its average (squeeze ref)
      double bbwComp = 0.0;
      if(i + InpBbwAvgPeriod - 1 < rates_total)
      {
         double bbw = bbUpArr[i] - bbLoArr[i];
         double sum = 0.0;
         for(int k = 0; k < InpBbwAvgPeriod; k++)
            sum += (bbUpArr[i + k] - bbLoArr[i + k]);
         double avg = sum / (double)InpBbwAvgPeriod;
         double ratio = (avg > 0.0) ? (bbw / avg) : 1.0;
         bbwComp = Clamp((ratio - 1.0) / 0.5, 0.0, 1.0);
      }

      double regime = 100.0 * (W_ADX * adxComp + W_ER * erComp + W_BBW * bbwComp);
      RegimeBuf[i] = regime;

      //================= TREND-CHANGE STATE MACHINE ================
      bool slopeUp   = true;
      bool slopeDown = true;
      if(InpRequireSlope && (i + 1) < rates_total)
      {
         slopeUp   = (amaArr[i] > amaArr[i + 1]);
         slopeDown = (amaArr[i] < amaArr[i + 1]);
      }

      bool trending = (regime >= InpRegimeThreshold);
      bool ranging  = (regime <  InpRangeResetLevel);

      bool rawBull = trending && (close[i] > baseline) && slopeUp   && (score >  InpSignalThreshold);
      bool rawBear = trending && (close[i] < baseline) && slopeDown && (score < -InpSignalThreshold);

      double newState;
      if(rawBull)      newState =  1.0;
      else if(rawBear) newState = -1.0;
      else if(ranging) newState =  0.0;   // confirmed range: flatten bias
      else             newState = prevState; // neutral zone: hold last bias

      StateBuf[i] = newState;

      //--- fire only on a genuine change of direction
      if(newState == 1.0 && prevState != 1.0)
      {
         BuyBuf[i]  = low[i] - atr * 0.5;
         FlagBuf[i] = 1.0;
      }
      else if(newState == -1.0 && prevState != -1.0)
      {
         SellBuf[i] = high[i] + atr * 0.5;
         FlagBuf[i] = -1.0;
      }
   }

   return(rates_total);
}
//+------------------------------------------------------------------+
