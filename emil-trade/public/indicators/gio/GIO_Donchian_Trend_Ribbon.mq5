#property copyright "GIO"
#property link      ""
#property version   "1.00"
#property strict
#property indicator_separate_window
#property indicator_minimum 0
#property indicator_maximum 50
#property indicator_buffers 2
#property indicator_plots   1

#property indicator_label1 "Donchian Trend Ribbon"
#property indicator_type1  DRAW_COLOR_HISTOGRAM
#property indicator_color1 clrLime, clrGreen, clrRed, clrMaroon, clrSilver
#property indicator_width1 3

input int InpDonchianLength = 20;

double RibbonBuffer[];
double RibbonColorBuffer[];

int DonchianTrendAt(const double &high[],
                    const double &low[],
                    const double &close[],
                    const int ratesTotal,
                    const int index,
                    const int length,
                    const int previousTrend)
{
   if(index + length >= ratesTotal)
      return previousTrend;

   double highestHigh = high[index + 1];
   double lowestLow = low[index + 1];

   for(int offset = 2; offset <= length; offset++)
   {
      const int lookbackIndex = index + offset;
      if(lookbackIndex >= ratesTotal)
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

int OnInit()
{
   SetIndexBuffer(0, RibbonBuffer, INDICATOR_DATA);
   SetIndexBuffer(1, RibbonColorBuffer, INDICATOR_COLOR_INDEX);
   ArraySetAsSeries(RibbonBuffer, true);
   ArraySetAsSeries(RibbonColorBuffer, true);

   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   IndicatorSetString(INDICATOR_SHORTNAME, "GIO Donchian Trend Ribbon");
   return INIT_SUCCEEDED;
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
   const int length = MathMax(10, InpDonchianLength);
   if(rates_total <= length + 5)
      return 0;

   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(close, true);

   for(int index = rates_total - 1; index > rates_total - length - 3 && index >= 0; index--)
   {
      RibbonBuffer[index] = EMPTY_VALUE;
      RibbonColorBuffer[index] = 4.0;
   }

   int trend = 0;
   const int oldest = rates_total - length - 2;

   for(int index = oldest; index >= 0; index--)
   {
      trend = DonchianTrendAt(high, low, close, rates_total, index, length, trend);
      RibbonBuffer[index] = 50.0;

      if(trend > 0)
         RibbonColorBuffer[index] = 0.0;
      else if(trend < 0)
         RibbonColorBuffer[index] = 2.0;
      else
         RibbonColorBuffer[index] = 4.0;
   }

   return rates_total;
}
