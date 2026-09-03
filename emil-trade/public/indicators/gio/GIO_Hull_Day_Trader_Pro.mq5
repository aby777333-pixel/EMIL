#property strict
#property indicator_chart_window
#property indicator_buffers 8
#property indicator_plots   6

#property indicator_label1  "Hull"
#property indicator_type1   DRAW_COLOR_LINE
#property indicator_color1  clrLime, clrRed
#property indicator_style1  STYLE_SOLID
#property indicator_width1  2

#property indicator_label2  "Hull Ribbon"
#property indicator_type2   DRAW_FILLING
#property indicator_color2  clrPaleGreen, clrMistyRose

#property indicator_label3  "Buy Signal"
#property indicator_type3   DRAW_ARROW
#property indicator_color3  clrLime
#property indicator_width3  2

#property indicator_label4  "Sell Signal"
#property indicator_type4   DRAW_ARROW
#property indicator_color4  clrRed
#property indicator_width4  2

#property indicator_label5  "Confirmed Trend"
#property indicator_type5   DRAW_NONE

#property indicator_label6  "ATR"
#property indicator_type6   DRAW_NONE

input group "Hull Settings"
input int                InpHullPeriod          = 70;
input ENUM_APPLIED_PRICE InpAppliedPrice        = PRICE_CLOSE;
input int                InpDonchianPeriod      = 20;

input group "ATR Settings"
input int                InpATRPeriod           = 14;
input double             InpATRMultiplier       = 3.0;

input group "Signal Display"
input int                InpArrowSize           = 2;
input color              InpBuyArrowColor       = clrLime;
input color              InpSellArrowColor      = clrRed;
input bool               InpEnableAlerts        = true;
input bool               InpPopupAlert          = true;
input bool               InpPushAlert           = false;
input bool               InpEmailAlert          = false;
input bool               InpShowRibbon          = true;
input bool               InpShowDashboard       = true;
input bool               InpShowTrendBackground = false;

input group "Session Display"
input int                InpSessionStartHour    = 0;
input int                InpSessionEndHour      = 24;

double HullBuffer[];
double HullColorBuffer[];
double RibbonUpperBuffer[];
double RibbonLowerBuffer[];
double BuyArrowBuffer[];
double SellArrowBuffer[];
double TrendBuffer[];
double AtrBuffer[];

double PriceBuffer[];
double FastWmaBuffer[];
double SlowWmaBuffer[];
double RawHullBuffer[];
double TrueRangeBuffer[];
int    HullTrendBuffer[];
int    DonchianTrendBuffer[];

datetime LastBuyAlertTime  = 0;
datetime LastSellAlertTime = 0;

int OnInit()
{
   IndicatorSetString(INDICATOR_SHORTNAME, "GIO Hull Day Trader Pro");
   IndicatorSetInteger(INDICATOR_DIGITS, _Digits);

   SetIndexBuffer(0, HullBuffer, INDICATOR_DATA);
   SetIndexBuffer(1, HullColorBuffer, INDICATOR_COLOR_INDEX);
   SetIndexBuffer(2, RibbonUpperBuffer, INDICATOR_DATA);
   SetIndexBuffer(3, RibbonLowerBuffer, INDICATOR_DATA);
   SetIndexBuffer(4, BuyArrowBuffer, INDICATOR_DATA);
   SetIndexBuffer(5, SellArrowBuffer, INDICATOR_DATA);
   SetIndexBuffer(6, TrendBuffer, INDICATOR_DATA);
   SetIndexBuffer(7, AtrBuffer, INDICATOR_DATA);

   PlotIndexSetInteger(0, PLOT_COLOR_INDEXES, 2);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 0, clrLime);
   PlotIndexSetInteger(0, PLOT_LINE_COLOR, 1, clrRed);

   PlotIndexSetInteger(1, PLOT_LINE_COLOR, 0, clrPaleGreen);
   PlotIndexSetInteger(1, PLOT_LINE_COLOR, 1, clrMistyRose);

   PlotIndexSetInteger(2, PLOT_ARROW, 233);
   PlotIndexSetInteger(2, PLOT_LINE_WIDTH, InpArrowSize);
   PlotIndexSetInteger(2, PLOT_LINE_COLOR, 0, InpBuyArrowColor);

   PlotIndexSetInteger(3, PLOT_ARROW, 234);
   PlotIndexSetInteger(3, PLOT_LINE_WIDTH, InpArrowSize);
   PlotIndexSetInteger(3, PLOT_LINE_COLOR, 0, InpSellArrowColor);

   for(int plot = 0; plot < 6; plot++)
      PlotIndexSetDouble(plot, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   PlotIndexSetInteger(4, PLOT_SHOW_DATA, false);
   PlotIndexSetInteger(5, PLOT_SHOW_DATA, false);

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   if(InpShowDashboard)
      Comment("");
}

int MaxInt(const int left, const int right)
{
   return (left > right) ? left : right;
}

int ClampHour(const int value, const bool allow_24)
{
   const int upper = allow_24 ? 24 : 23;
   if(value < 0)
      return 0;
   if(value > upper)
      return upper;
   return value;
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
   if(rates_total < 10)
      return 0;

   ArraySetAsSeries(time, false);
   ArraySetAsSeries(open, false);
   ArraySetAsSeries(high, false);
   ArraySetAsSeries(low, false);
   ArraySetAsSeries(close, false);

   ResizeWorkArrays(rates_total);

   const int hull_period     = MaxInt(2, InpHullPeriod);
   const int half_period     = MaxInt(1, hull_period / 2);
   const int sqrt_period     = MaxInt(1, (int)MathRound(MathSqrt((double)hull_period)));
   const int donchian_period = MaxInt(2, InpDonchianPeriod);
   const int atr_period      = MaxInt(1, InpATRPeriod);

   for(int i = 0; i < rates_total; i++)
   {
      PriceBuffer[i]       = AppliedPrice(i, open, high, low, close);
      HullBuffer[i]        = EMPTY_VALUE;
      RibbonUpperBuffer[i] = EMPTY_VALUE;
      RibbonLowerBuffer[i] = EMPTY_VALUE;
      BuyArrowBuffer[i]    = EMPTY_VALUE;
      SellArrowBuffer[i]   = EMPTY_VALUE;
      TrendBuffer[i]       = 0.0;
      AtrBuffer[i]         = EMPTY_VALUE;
      HullColorBuffer[i]   = 0.0;
      HullTrendBuffer[i]   = 0;
      DonchianTrendBuffer[i] = 0;
   }

   for(int i = 0; i < rates_total; i++)
   {
      FastWmaBuffer[i] = WeightedMA(PriceBuffer, i, half_period);
      SlowWmaBuffer[i] = WeightedMA(PriceBuffer, i, hull_period);
      RawHullBuffer[i] = EMPTY_VALUE;

      if(FastWmaBuffer[i] != EMPTY_VALUE && SlowWmaBuffer[i] != EMPTY_VALUE)
         RawHullBuffer[i] = 2.0 * FastWmaBuffer[i] - SlowWmaBuffer[i];
   }

   for(int i = 0; i < rates_total; i++)
   {
      HullBuffer[i] = WeightedMA(RawHullBuffer, i, sqrt_period);
      AtrBuffer[i]  = AtrAt(i, high, low, close, atr_period);

      if(i >= 2 && HullBuffer[i] != EMPTY_VALUE && HullBuffer[i - 2] != EMPTY_VALUE)
      {
         HullTrendBuffer[i] = (HullBuffer[i] > HullBuffer[i - 2]) ? 1 : -1;
         HullColorBuffer[i] = (HullTrendBuffer[i] == 1) ? 0.0 : 1.0;

         if(InpShowRibbon)
         {
            RibbonUpperBuffer[i] = HullBuffer[i];
            RibbonLowerBuffer[i] = HullBuffer[i - 2];
         }
      }

      DonchianTrendBuffer[i] = DonchianTrendAt(i, high, low, close, donchian_period);

      if(HullTrendBuffer[i] == 1 && DonchianTrendBuffer[i] == 1)
         TrendBuffer[i] = 1.0;
      else if(HullTrendBuffer[i] == -1 && DonchianTrendBuffer[i] == -1)
         TrendBuffer[i] = -1.0;
      else
         TrendBuffer[i] = 0.0;
   }

   const int current_bar = rates_total - 1;
   for(int i = 1; i < current_bar; i++)
   {
      const int trend = (int)TrendBuffer[i];
      const int previous_trend = (int)TrendBuffer[i - 1];

      if(trend == 1 && previous_trend != 1)
         BuyArrowBuffer[i] = low[i] - ArrowOffset(i);
      else if(trend == -1 && previous_trend != -1)
         SellArrowBuffer[i] = high[i] + ArrowOffset(i);
   }

   const int closed_bar = rates_total - 2;
   if(closed_bar > 0)
   {
      SendSignalAlerts(closed_bar, time);
      UpdateDashboard(closed_bar);
   }

   return rates_total;
}

void ResizeWorkArrays(const int size)
{
   ArrayResize(PriceBuffer, size);
   ArrayResize(FastWmaBuffer, size);
   ArrayResize(SlowWmaBuffer, size);
   ArrayResize(RawHullBuffer, size);
   ArrayResize(TrueRangeBuffer, size);
   ArrayResize(HullTrendBuffer, size);
   ArrayResize(DonchianTrendBuffer, size);
}

double AppliedPrice(const int index,
                    const double &open[],
                    const double &high[],
                    const double &low[],
                    const double &close[])
{
   switch(InpAppliedPrice)
   {
      case PRICE_OPEN:
         return open[index];
      case PRICE_HIGH:
         return high[index];
      case PRICE_LOW:
         return low[index];
      case PRICE_MEDIAN:
         return (high[index] + low[index]) / 2.0;
      case PRICE_TYPICAL:
         return (high[index] + low[index] + close[index]) / 3.0;
      case PRICE_WEIGHTED:
         return (high[index] + low[index] + close[index] + close[index]) / 4.0;
      case PRICE_CLOSE:
      default:
         return close[index];
   }
}

double WeightedMA(const double &values[], const int index, const int length)
{
   if(length <= 1)
      return values[index];

   if(index < length - 1)
      return EMPTY_VALUE;

   double weighted_sum = 0.0;
   double weight_total = 0.0;

   for(int offset = 0; offset < length; offset++)
   {
      const double value = values[index - offset];
      if(value == EMPTY_VALUE)
         return EMPTY_VALUE;

      const double weight = (double)(length - offset);
      weighted_sum += value * weight;
      weight_total += weight;
   }

   if(weight_total <= 0.0)
      return EMPTY_VALUE;

   return weighted_sum / weight_total;
}

int DonchianTrendAt(const int index,
                    const double &high[],
                    const double &low[],
                    const double &close[],
                    const int period)
{
   if(index <= period)
      return (index > 0) ? DonchianTrendBuffer[index - 1] : 0;

   double highest = high[index - 1];
   double lowest  = low[index - 1];

   for(int offset = 2; offset <= period; offset++)
   {
      const int lookback = index - offset;
      if(high[lookback] > highest)
         highest = high[lookback];
      if(low[lookback] < lowest)
         lowest = low[lookback];
   }

   if(close[index] > highest)
      return 1;

   if(close[index] < lowest)
      return -1;

   return DonchianTrendBuffer[index - 1];
}

double AtrAt(const int index,
             const double &high[],
             const double &low[],
             const double &close[],
             const int period)
{
   const double previous_close = (index > 0) ? close[index - 1] : close[index];
   const double tr1 = high[index] - low[index];
   const double tr2 = MathAbs(high[index] - previous_close);
   const double tr3 = MathAbs(low[index] - previous_close);
   TrueRangeBuffer[index] = MathMax(tr1, MathMax(tr2, tr3));

   if(index < period - 1)
      return EMPTY_VALUE;

   double sum = 0.0;
   for(int offset = 0; offset < period; offset++)
      sum += TrueRangeBuffer[index - offset];

   return sum / (double)period;
}

double ArrowOffset(const int index)
{
   if(AtrBuffer[index] != EMPTY_VALUE && AtrBuffer[index] > 0.0)
      return AtrBuffer[index] * 0.20;

   return 10.0 * _Point;
}

void SendSignalAlerts(const int index, const datetime &time[])
{
   if(!InpEnableAlerts)
      return;

   if(BuyArrowBuffer[index] != EMPTY_VALUE && time[index] != LastBuyAlertTime)
   {
      LastBuyAlertTime = time[index];
      Notify("BUY");
   }

   if(SellArrowBuffer[index] != EMPTY_VALUE && time[index] != LastSellAlertTime)
   {
      LastSellAlertTime = time[index];
      Notify("SELL");
   }
}

void Notify(const string signal)
{
   const string message = StringFormat("GIO Hull Day Trader Pro %s signal on %s %s at %s",
                                       signal,
                                       _Symbol,
                                       EnumToString((ENUM_TIMEFRAMES)_Period),
                                       TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS));

   if(InpPopupAlert)
      Alert(message);
   if(InpPushAlert)
      SendNotification(message);
   if(InpEmailAlert)
      SendMail("GIO Hull Day Trader Pro", message);
}

void UpdateDashboard(const int closed_bar)
{
   if(!InpShowDashboard)
   {
      Comment("");
      return;
   }

   const int trend = (int)TrendBuffer[closed_bar];
   const int hull_trend = HullTrendBuffer[closed_bar];
   const int ribbon_trend = DonchianTrendBuffer[closed_bar];
   const double atr = AtrBuffer[closed_bar];
   const long spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   const bool in_session = IsInsideDisplaySession();

   const string text =
      "GIO Hull Day Trader Pro\n"
      "Current Trend: " + TrendText(trend) + "\n"
      "Current ATR: " + PriceText(atr) + "\n"
      "ATR TP Distance: " + PriceText((atr == EMPTY_VALUE) ? EMPTY_VALUE : atr * InpATRMultiplier) + "\n"
      "Hull Status: " + TrendText(hull_trend) + "\n"
      "Ribbon Status: " + TrendText(ribbon_trend) + "\n"
      "Current Spread: " + IntegerToString((int)spread) + " points\n"
      "Trading Session: " + (in_session ? "Active" : "Inactive") + "\n"
      "Last Signal: " + LastSignalText(closed_bar);

   Comment(text);
}

string TrendText(const int trend)
{
   if(trend > 0)
      return "Bullish";
   if(trend < 0)
      return "Bearish";
   return "No Trend";
}

string PriceText(const double value)
{
   if(value == EMPTY_VALUE || value <= 0.0)
      return "n/a";
   return DoubleToString(value, _Digits);
}

string LastSignalText(const int closed_bar)
{
   for(int i = closed_bar; i >= 0; i--)
   {
      if(BuyArrowBuffer[i] != EMPTY_VALUE)
         return "Buy";
      if(SellArrowBuffer[i] != EMPTY_VALUE)
         return "Sell";
   }

   return "None";
}

bool IsInsideDisplaySession()
{
   const int start_hour = ClampHour(InpSessionStartHour, false);
   const int end_hour = ClampHour(InpSessionEndHour, true);

   if(start_hour == end_hour)
      return true;

   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);
   const int hour = now.hour;

   if(start_hour < end_hour)
      return (hour >= start_hour && hour < end_hour);

   return (hour >= start_hour || hour < end_hour);
}
