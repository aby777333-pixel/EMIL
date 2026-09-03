//+------------------------------------------------------------------+
//|                                            GIO_Kalman_Trend.mq5   |
//|                         GIO Kalman Trend Trading System           |
//|        Faithful MT5 port of "Kalman Trend Levels [BigBeluga]"     |
//|                                                                   |
//|  Dual Kalman-filtered trend lines (Short + Long) with            |
//|  Buy/Sell crossover signals exposed via iCustom() buffers.       |
//+------------------------------------------------------------------+
#property copyright "GIO / GHL India Ventures"
#property version   "1.00"
#property description "Dual Kalman trend filter with crossover signals. iCustom-ready for GIO_Kalman_EA."
#property strict

#property indicator_chart_window
#property indicator_buffers 7
#property indicator_plots   4

//--- Plot 0 : Short Kalman line --------------------------------------
#property indicator_label1  "Short Kalman"
#property indicator_type1   DRAW_LINE
#property indicator_color1  clrDodgerBlue
#property indicator_style1  STYLE_SOLID
#property indicator_width1  1

//--- Plot 1 : Long Kalman line ---------------------------------------
#property indicator_label2  "Long Kalman"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrOrange
#property indicator_style2  STYLE_SOLID
#property indicator_width2  2

//--- Plot 2 : Buy arrow ----------------------------------------------
#property indicator_label3  "Buy Signal"
#property indicator_type3   DRAW_ARROW
#property indicator_color3  clrLime
#property indicator_width3  2

//--- Plot 3 : Sell arrow ---------------------------------------------
#property indicator_label4  "Sell Signal"
#property indicator_type4   DRAW_ARROW
#property indicator_color4  clrRed
#property indicator_width4  2

//+------------------------------------------------------------------+
//| Inputs                                                            |
//+------------------------------------------------------------------+
input int    InpShortLen   = 50;     // Short Kalman Length
input int    InpLongLen    = 150;    // Long Kalman Length
input double InpR          = 0.01;   // Measurement noise (R)
input double InpQ          = 0.10;   // Process noise (Q)
input bool   InpShowArrows = true;   // Show Buy/Sell Arrows
input bool   InpAlerts     = false;  // Enable Alerts
input int    InpArrowGap   = 10;     // Arrow offset (points)

//+------------------------------------------------------------------+
//| Buffers                                                           |
//+------------------------------------------------------------------+
double ShortKalmanBuf[];   // 0 - plotted, EA reads this
double LongKalmanBuf[];    // 1 - plotted, EA reads this
double BuyBuf[];           // 2 - plotted arrow
double SellBuf[];          // 3 - plotted arrow
double TrendBuf[];         // 4 - calc only (+1 up / -1 down), EA convenience
double ShortErrBuf[];      // 5 - calc only (Kalman error estimate, short)
double LongErrBuf[];       // 6 - calc only (Kalman error estimate, long)

//+------------------------------------------------------------------+
//| OnInit                                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   if(InpShortLen < 1 || InpLongLen < 1)
   {
      Print("GIO_Kalman_Trend: lengths must be >= 1");
      return(INIT_PARAMETERS_INCORRECT);
   }
   if(InpR <= 0.0 || InpQ < 0.0)
   {
      Print("GIO_Kalman_Trend: R must be > 0 and Q must be >= 0");
      return(INIT_PARAMETERS_INCORRECT);
   }

   SetIndexBuffer(0, ShortKalmanBuf, INDICATOR_DATA);
   SetIndexBuffer(1, LongKalmanBuf,  INDICATOR_DATA);
   SetIndexBuffer(2, BuyBuf,         INDICATOR_DATA);
   SetIndexBuffer(3, SellBuf,        INDICATOR_DATA);
   SetIndexBuffer(4, TrendBuf,       INDICATOR_CALCULATIONS);
   SetIndexBuffer(5, ShortErrBuf,    INDICATOR_CALCULATIONS);
   SetIndexBuffer(6, LongErrBuf,     INDICATOR_CALCULATIONS);

   //--- arrow glyphs + empty values
   PlotIndexSetInteger(2, PLOT_ARROW, 233);            // up arrow
   PlotIndexSetInteger(3, PLOT_ARROW, 234);            // down arrow
   PlotIndexSetInteger(2, PLOT_ARROW_SHIFT, -8);
   PlotIndexSetInteger(3, PLOT_ARROW_SHIFT,  8);
   PlotIndexSetDouble(2, PLOT_EMPTY_VALUE, 0.0);
   PlotIndexSetDouble(3, PLOT_EMPTY_VALUE, 0.0);

   IndicatorSetInteger(INDICATOR_DIGITS, _Digits);
   IndicatorSetString(INDICATOR_SHORTNAME,
                      StringFormat("GIO_Kalman_Trend(%d,%d)", InpShortLen, InpLongLen));

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| OnCalculate                                                       |
//|  Arrays are NON-series here (index 0 = oldest bar), so the        |
//|  Kalman recursion runs naturally oldest -> newest, exactly        |
//|  matching the Pine `var` forward computation.                     |
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
   if(rates_total < 3)
      return(0);

   //--- constant measurement noise (matches Pine: error_meas = R * length)
   const double errMeasS = InpR * (double)InpShortLen;
   const double errMeasL = InpR * (double)InpLongLen;
   const double qShort   = InpQ / (double)InpShortLen;
   const double qLong    = InpQ / (double)InpLongLen;

   int start = (prev_calculated == 0) ? 0 : prev_calculated - 1;

   for(int i = start; i < rates_total; i++)
   {
      //--- seed the very first bar
      if(i == 0)
      {
         ShortKalmanBuf[0] = close[0];
         LongKalmanBuf[0]  = close[0];
         ShortErrBuf[0]    = 1.0;
         LongErrBuf[0]     = 1.0;
         TrendBuf[0]       = 0.0;
         BuyBuf[0]         = 0.0;
         SellBuf[0]        = 0.0;
         continue;
      }

      //=== SHORT Kalman ============================================
      double predS = ShortKalmanBuf[i-1];
      double gainS = ShortErrBuf[i-1] / (ShortErrBuf[i-1] + errMeasS);
      ShortKalmanBuf[i] = predS + gainS * (close[i] - predS);
      ShortErrBuf[i]    = (1.0 - gainS) * ShortErrBuf[i-1] + qShort;

      //=== LONG Kalman =============================================
      double predL = LongKalmanBuf[i-1];
      double gainL = LongErrBuf[i-1] / (LongErrBuf[i-1] + errMeasL);
      LongKalmanBuf[i]  = predL + gainL * (close[i] - predL);
      LongErrBuf[i]     = (1.0 - gainL) * LongErrBuf[i-1] + qLong;

      //=== Trend & crossover =======================================
      double trendNow  = (ShortKalmanBuf[i] > LongKalmanBuf[i]) ? 1.0 : -1.0;
      double trendPrev = TrendBuf[i-1];
      TrendBuf[i]      = trendNow;

      BuyBuf[i]  = 0.0;
      SellBuf[i] = 0.0;

      //--- ignore the first ever transition (trendPrev == 0 = unset)
      if(trendPrev != 0.0 && trendNow != trendPrev)
      {
         if(trendNow > 0.0)                          // Short crossed ABOVE Long
         {
            if(InpShowArrows)
               BuyBuf[i] = low[i] - InpArrowGap * _Point;
         }
         else                                        // Short crossed BELOW Long
         {
            if(InpShowArrows)
               SellBuf[i] = high[i] + InpArrowGap * _Point;
         }
      }
   }

   //--- non-repainting alert: fire once on the most recently CLOSED bar
   if(InpAlerts && rates_total >= 2)
   {
      static datetime s_lastAlertBar = 0;
      int closed = rates_total - 2;
      if(time[closed] != s_lastAlertBar)
      {
         double tNow  = (ShortKalmanBuf[closed]   > LongKalmanBuf[closed])   ? 1.0 : -1.0;
         double tPrev = (closed >= 1 && ShortKalmanBuf[closed-1] > LongKalmanBuf[closed-1]) ? 1.0 : -1.0;
         if(tNow != tPrev)
         {
            string tf = EnumToString((ENUM_TIMEFRAMES)Period());
            if(tNow > 0.0) Alert("GIO Kalman BUY  ", _Symbol, " ", tf);
            else           Alert("GIO Kalman SELL ", _Symbol, " ", tf);
            s_lastAlertBar = time[closed];
         }
      }
   }

   return(rates_total);
}
//+------------------------------------------------------------------+
