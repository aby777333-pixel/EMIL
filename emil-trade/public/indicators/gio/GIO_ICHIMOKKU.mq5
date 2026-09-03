//+------------------------------------------------------------------+
//|                                             GIO_ICHIMOKKU.mq5     |
//|                          Ichimoku Buy & Sell Signals (MT5 port)  |
//|                                                                  |
//|  Faithful MQL5 conversion of the TradingView Pine v4 study       |
//|  "Ichimoku Buy & Sell Signals" (© ozzy_livin).                   |
//|                                                                  |
//|  Lines are built as Donchian midpoints (highest+lowest)/2:       |
//|    Tenkan     = donchian(ConversionPeriods)                      |
//|    Kijun      = donchian(BasePeriods)                            |
//|    Senkou A   = (Tenkan + Kijun) / 2   (shifted forward)         |
//|    Senkou B   = donchian(LaggingSpan2Periods) (shifted forward)  |
//|  Cloud fill : green when SenkouA > SenkouB, red otherwise.       |
//|  Signals    : green dot on Tenkan when Tenkan crosses UP Kijun,  |
//|               orange dot on Kijun when Tenkan crosses DOWN Kijun.|
//+------------------------------------------------------------------+
#property copyright "GHL India Ventures / GIO4X"
#property link      ""
#property version   "1.00"
#property description "GIO ICHIMOKKU - Ichimoku Buy & Sell Signals (Tenkan/Kijun cross + Kumo cloud)"

#property indicator_chart_window
#property indicator_buffers 8
#property indicator_plots   7

//--- Plot 1 : Tenkan (Conversion Line)
#property indicator_type1   DRAW_LINE
#property indicator_color1  C'0,188,212'          // #00BCD4 cyan
#property indicator_width1  1
#property indicator_label1  "Tenkan"

//--- Plot 2 : Kijun (Base Line)
#property indicator_type2   DRAW_LINE
#property indicator_color2  C'244,67,54'          // #F44336 red
#property indicator_width2  1
#property indicator_label2  "Kijun"

//--- Plot 3 : Senkou A (Lead 1)
#property indicator_type3   DRAW_LINE
#property indicator_color3  C'76,175,80'          // #4CAF50 green
#property indicator_width3  1
#property indicator_label3  "Senkou A (Lead 1)"

//--- Plot 4 : Senkou B (Lead 2)
#property indicator_type4   DRAW_LINE
#property indicator_color4  C'255,82,82'          // #FF5252 coral
#property indicator_width4  1
#property indicator_label4  "Senkou B (Lead 2)"

//--- Plot 5 : Kumo cloud fill (green up / red down)
#property indicator_type5   DRAW_FILLING
#property indicator_color5  C'76,175,80',C'255,82,82'
#property indicator_label5  "Kumo Cloud"

//--- Plot 6 : Cross Long (green dot on Tenkan)
#property indicator_type6   DRAW_ARROW
#property indicator_color6  C'0,255,0'            // #00FF00 lime
#property indicator_width6  2
#property indicator_label6  "Cross Long"

//--- Plot 7 : Cross Short (orange dot on Kijun)
#property indicator_type7   DRAW_ARROW
#property indicator_color7  C'255,152,0'          // #FF9800 orange
#property indicator_width7  2
#property indicator_label7  "Cross Short"

//+------------------------------------------------------------------+
//| Inputs (match the TradingView "Inputs" panel exactly)            |
//+------------------------------------------------------------------+
input int  ConversionPeriods   = 20;    // Conversion Line Length
input int  BasePeriods         = 60;    // Base Line Length
input int  LaggingSpan2Periods = 120;   // Lagging Span 2 Length
input int  Displacement        = 30;    // Displacement
input bool EnableAlerts        = false; // Enable Cross Alerts (popup)
input bool EnablePush          = false; // Enable Push Notifications

//+------------------------------------------------------------------+
//| Indicator buffers                                                |
//+------------------------------------------------------------------+
double TenkanBuf[];      // buffer 0 -> plot 0
double KijunBuf[];       // buffer 1 -> plot 1
double SenkouABuf[];     // buffer 2 -> plot 2
double SenkouBBuf[];     // buffer 3 -> plot 3
double FillUpBuf[];      // buffer 4 -> plot 4 (filling upper)
double FillDnBuf[];      // buffer 5 -> plot 4 (filling lower)
double CrossLongBuf[];   // buffer 6 -> plot 5
double CrossShortBuf[];  // buffer 7 -> plot 6

//--- runtime copies (clamped to minval = 1)
int    g_conv;
int    g_base;
int    g_span2;
int    g_shift;

datetime g_lastAlertTime = 0;

//+------------------------------------------------------------------+
//| Donchian helpers (highest high / lowest low over a window)       |
//+------------------------------------------------------------------+
double Highest(const double &arr[], const int len, const int idx)
{
   double m = arr[idx];
   for(int k = 1; k < len; k++)
   {
      double v = arr[idx - k];
      if(v > m) m = v;
   }
   return m;
}

double Lowest(const double &arr[], const int len, const int idx)
{
   double m = arr[idx];
   for(int k = 1; k < len; k++)
   {
      double v = arr[idx - k];
      if(v < m) m = v;
   }
   return m;
}

double Donchian(const double &highArr[], const double &lowArr[], const int len, const int idx)
{
   return (Highest(highArr, len, idx) + Lowest(lowArr, len, idx)) / 2.0;
}

//+------------------------------------------------------------------+
//| Custom indicator initialization                                  |
//+------------------------------------------------------------------+
int OnInit()
{
   //--- clamp inputs (Pine minval = 1)
   g_conv  = (ConversionPeriods   < 1) ? 1 : ConversionPeriods;
   g_base  = (BasePeriods         < 1) ? 1 : BasePeriods;
   g_span2 = (LaggingSpan2Periods < 1) ? 1 : LaggingSpan2Periods;
   int disp = (Displacement < 1) ? 1 : Displacement;
   g_shift = disp - 1;                 // Pine: offset = displacement - 1

   //--- bind buffers (order must match plot/property order)
   SetIndexBuffer(0, TenkanBuf,     INDICATOR_DATA);
   SetIndexBuffer(1, KijunBuf,      INDICATOR_DATA);
   SetIndexBuffer(2, SenkouABuf,    INDICATOR_DATA);
   SetIndexBuffer(3, SenkouBBuf,    INDICATOR_DATA);
   SetIndexBuffer(4, FillUpBuf,     INDICATOR_DATA);
   SetIndexBuffer(5, FillDnBuf,     INDICATOR_DATA);
   SetIndexBuffer(6, CrossLongBuf,  INDICATOR_DATA);
   SetIndexBuffer(7, CrossShortBuf, INDICATOR_DATA);

   //--- forward displacement for the cloud (Senkou A/B lines + fill)
   PlotIndexSetInteger(2, PLOT_SHIFT, g_shift);
   PlotIndexSetInteger(3, PLOT_SHIFT, g_shift);
   PlotIndexSetInteger(4, PLOT_SHIFT, g_shift);

   //--- draw-begin so partial windows are not plotted
   PlotIndexSetInteger(0, PLOT_DRAW_BEGIN, g_conv - 1);
   PlotIndexSetInteger(1, PLOT_DRAW_BEGIN, g_base - 1);
   PlotIndexSetInteger(2, PLOT_DRAW_BEGIN, g_base - 1);
   PlotIndexSetInteger(3, PLOT_DRAW_BEGIN, g_span2 - 1);
   PlotIndexSetInteger(4, PLOT_DRAW_BEGIN, g_span2 - 1);
   PlotIndexSetInteger(5, PLOT_DRAW_BEGIN, g_base);
   PlotIndexSetInteger(6, PLOT_DRAW_BEGIN, g_base);

   //--- empty value = no draw
   for(int p = 0; p < 7; p++)
      PlotIndexSetDouble(p, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   //--- big filled circles for the cross signals (Wingdings 159)
   PlotIndexSetInteger(5, PLOT_ARROW, 159);
   PlotIndexSetInteger(6, PLOT_ARROW, 159);

   //--- names
   IndicatorSetString(INDICATOR_SHORTNAME, "GIO ICHIMOKKU");
   IndicatorSetInteger(INDICATOR_DIGITS, _Digits);

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Custom indicator iteration                                       |
//+------------------------------------------------------------------+
int OnCalculate(const int        rates_total,
                const int        prev_calculated,
                const datetime  &time[],
                const double    &open[],
                const double    &high[],
                const double    &low[],
                const double    &close[],
                const long      &tick_volume[],
                const long      &volume[],
                const int       &spread[])
{
   //--- need at least enough bars for the slowest window
   if(rates_total < g_span2 + 1)
      return(0);

   //--- incremental start (recompute the last known bar too)
   int start = (prev_calculated > 0) ? prev_calculated - 1 : 0;
   if(start < 0) start = 0;

   for(int i = start; i < rates_total; i++)
   {
      //--- reset this bar
      TenkanBuf[i]     = EMPTY_VALUE;
      KijunBuf[i]      = EMPTY_VALUE;
      SenkouABuf[i]    = EMPTY_VALUE;
      SenkouBBuf[i]    = EMPTY_VALUE;
      FillUpBuf[i]     = EMPTY_VALUE;
      FillDnBuf[i]     = EMPTY_VALUE;
      CrossLongBuf[i]  = EMPTY_VALUE;
      CrossShortBuf[i] = EMPTY_VALUE;

      double conv = EMPTY_VALUE;
      double base = EMPTY_VALUE;

      //--- Tenkan
      if(i >= g_conv - 1)
      {
         conv = Donchian(high, low, g_conv, i);
         TenkanBuf[i] = conv;
      }

      //--- Kijun
      if(i >= g_base - 1)
      {
         base = Donchian(high, low, g_base, i);
         KijunBuf[i] = base;
      }

      //--- Senkou A = (Tenkan + Kijun)/2 (plotted forward via PLOT_SHIFT)
      if(conv != EMPTY_VALUE && base != EMPTY_VALUE)
      {
         double leadA = (conv + base) / 2.0;
         SenkouABuf[i] = leadA;
         FillUpBuf[i]  = leadA;
      }

      //--- Senkou B = donchian(LaggingSpan2Periods)
      if(i >= g_span2 - 1)
      {
         double leadB = Donchian(high, low, g_span2, i);
         SenkouBBuf[i] = leadB;
         FillDnBuf[i]  = leadB;
      }

      //--- Tenkan/Kijun crossover signals (Pine crossover semantics)
      //    crossover(x,y) := x > y && x[1] <= y[1]
      if(i >= g_base && conv != EMPTY_VALUE && base != EMPTY_VALUE)
      {
         double convPrev = TenkanBuf[i - 1];   // already computed midpoints
         double basePrev = KijunBuf[i - 1];

         if(convPrev != EMPTY_VALUE && basePrev != EMPTY_VALUE)
         {
            // Cross Long  : Tenkan crosses ABOVE Kijun -> dot on Tenkan
            if(conv > base && convPrev <= basePrev)
               CrossLongBuf[i] = conv;

            // Cross Short : Tenkan crosses BELOW Kijun -> dot on Kijun
            if(base > conv && basePrev <= convPrev)
               CrossShortBuf[i] = base;
         }
      }
   }

   //--- alerts on the last CLOSED bar only (no repaint)
   if((EnableAlerts || EnablePush) && rates_total > 2)
   {
      int b = rates_total - 2;
      if(time[b] != g_lastAlertTime)
      {
         if(CrossLongBuf[b] != EMPTY_VALUE)
         {
            string msg = "GIO ICHIMOKKU: BUY signal (Tenkan crossed UP Kijun) " +
                         _Symbol + " " + EnumToString((ENUM_TIMEFRAMES)_Period);
            if(EnableAlerts) Alert(msg);
            if(EnablePush)   SendNotification(msg);
            g_lastAlertTime = time[b];
         }
         else if(CrossShortBuf[b] != EMPTY_VALUE)
         {
            string msg = "GIO ICHIMOKKU: SELL signal (Tenkan crossed DOWN Kijun) " +
                         _Symbol + " " + EnumToString((ENUM_TIMEFRAMES)_Period);
            if(EnableAlerts) Alert(msg);
            if(EnablePush)   SendNotification(msg);
            g_lastAlertTime = time[b];
         }
      }
   }

   return(rates_total);
}
//+------------------------------------------------------------------+
