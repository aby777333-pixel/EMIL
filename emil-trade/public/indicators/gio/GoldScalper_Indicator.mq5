//+------------------------------------------------------------------+
//|                                       GoldScalper_Indicator.mq5 |
//|            Non-repainting M1 Gold (XAUUSD) Scalping Indicator   |
//|                                                                  |
//| Strategy (identical to GoldScalper_EA):                          |
//|  - M1 Fast/Slow EMA crossover (default 8/21) = entry trigger     |
//|  - M5 EMA(50) + M5 fast/slow EMA alignment = HTF trend filter    |
//|  - RSI(14) momentum confirmation                                 |
//|  - ATR(14) volatility filter (low / normal / abnormal regimes)   |
//|  - Price-action candle confirmation (body ratio, close vs EMA)   |
//|  - Sideways filter (M5 EMA compression measured in ATR units)    |
//|                                                                  |
//| NO REPAINTING: all signal logic uses CLOSED bars only (shift>=1).|
//| Signals are confirmed on candle close and never move afterwards. |
//+------------------------------------------------------------------+
#property copyright "GoldScalper"
#property link      ""
#property version   "1.00"
#property description "Non-repainting M1 gold scalping signal indicator with MTF trend, ATR SL/TP, session status, signal strength and info panel."
#property indicator_chart_window
#property indicator_buffers 2
#property indicator_plots   2

#property indicator_label1  "Buy Signal"
#property indicator_type1   DRAW_ARROW
#property indicator_color1  clrLime
#property indicator_width1  2

#property indicator_label2  "Sell Signal"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrRed
#property indicator_width2  2

//+------------------------------------------------------------------+
//| Inputs                                                           |
//+------------------------------------------------------------------+
input group "=== Strategy Core (keep identical to EA) ==="
input int      InpFastEMA        = 8;      // M1 Fast EMA period
input int      InpSlowEMA        = 21;     // M1 Slow EMA period
input int      InpM5TrendEMA     = 50;     // M5 Trend EMA period
input int      InpM5FastEMA      = 8;      // M5 Fast EMA period (alignment)
input int      InpM5SlowEMA      = 21;     // M5 Slow EMA period (alignment)
input int      InpRSIPeriod      = 14;     // RSI period
input double   InpRSIOverbought  = 70.0;   // RSI overbought level
input double   InpRSIOversold    = 30.0;   // RSI oversold level

input group "=== Volatility Filter (ATR) ==="
input int      InpATRPeriod      = 14;     // ATR period
input int      InpATRAvgPeriod   = 100;    // ATR average period (regime detection)
input double   InpMinATRPoints   = 15.0;   // Min ATR in points (below = LOW volatility, block)
input double   InpMaxATRMult     = 3.0;    // Max ATR as multiple of ATR average (above = ABNORMAL, block)

input group "=== Price Action / Sideways Filters ==="
input double   InpMinBodyRatio   = 0.30;   // Min candle body / range ratio (0..1)
input double   InpM5GapMinATR    = 0.10;   // Min M5 EMA fast-slow gap in ATR units (sideways filter)

input group "=== Signal Strength ==="
input int      InpMinStrength    = 60;     // Min signal strength 0-100 to show arrow

input group "=== Stops (display only) ==="
input double   InpSLMultATR      = 1.2;    // SL = ATR x this
input double   InpTPMultATR      = 1.8;    // TP = ATR x this
input bool     InpDrawSLTP       = true;   // Draw entry/SL/TP lines for last signal

input group "=== Sessions (broker server time, hours 0-23) ==="
input int      InpAsianStart     = 0;      // Asian session start hour
input int      InpAsianEnd       = 8;      // Asian session end hour
input int      InpLondonStart    = 8;      // London session start hour
input int      InpLondonEnd      = 17;     // London session end hour
input int      InpNYStart        = 13;     // New York session start hour
input int      InpNYEnd          = 22;     // New York session end hour
input bool     InpTradeAsian     = false;  // Treat Asian session as tradable
input bool     InpTradeLondon    = true;   // Treat London session as tradable
input bool     InpTradeNY        = true;   // Treat New York session as tradable

input group "=== Spread Filter ==="
input double   InpMaxSpreadPts   = 350;    // Max spread in points (0 = disable check)

input group "=== Alerts ==="
input bool     InpAlertPopup     = true;   // Popup alert
input bool     InpAlertSound     = true;   // Sound alert
input string   InpSoundFile      = "alert.wav"; // Sound file
input bool     InpAlertPush      = false;  // Push notification
input bool     InpAlertEmail     = false;  // Email alert

input group "=== Display ==="
input int      InpMaxBarsBack    = 2000;   // Max history bars to compute
input ENUM_BASE_CORNER InpCorner = CORNER_LEFT_UPPER; // Panel corner
input int      InpPanelX         = 10;     // Panel X offset
input int      InpPanelY         = 25;     // Panel Y offset
input int      InpFontSize       = 9;      // Panel font size
input color    InpPanelBg        = C'20,24,34';  // Panel background
input color    InpPanelText      = clrWhiteSmoke;// Panel text color

//+------------------------------------------------------------------+
//| Globals                                                          |
//+------------------------------------------------------------------+
double  BuyBuf[];
double  SellBuf[];

int     hEmaFast   = INVALID_HANDLE;
int     hEmaSlow   = INVALID_HANDLE;
int     hRSI       = INVALID_HANDLE;
int     hATR       = INVALID_HANDLE;
int     hM5Trend   = INVALID_HANDLE;
int     hM5Fast    = INVALID_HANDLE;
int     hM5Slow    = INVALID_HANDLE;

datetime g_lastAlertBar = 0;          // last signal bar we alerted on
const string PFX = "GSI_";            // object name prefix

// Snapshot of the latest evaluation (for the panel)
struct SignalInfo
  {
   int      direction;    // +1 buy, -1 sell, 0 none
   int      strength;     // 0-100
   double   atr;          // ATR at signal bar
   double   entry;        // entry (close of signal bar)
   double   sl;
   double   tp;
   int      volRegime;    // 0 normal, 1 low, 2 abnormal
   int      trend;        // M5 trend: +1 up, -1 down, 0 flat
   double   rsi;
   string   blockReason;  // why a would-be trigger got rejected ("" = none)
   bool     triggered;    // raw EMA cross occurred this bar
  };
SignalInfo g_last;                    // last closed-bar snapshot

//+------------------------------------------------------------------+
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
  {
   SetIndexBuffer(0, BuyBuf,  INDICATOR_DATA);
   SetIndexBuffer(1, SellBuf, INDICATOR_DATA);
   ArraySetAsSeries(BuyBuf,  true);
   ArraySetAsSeries(SellBuf, true);

   PlotIndexSetInteger(0, PLOT_ARROW, 233);  // up arrow
   PlotIndexSetInteger(1, PLOT_ARROW, 234);  // down arrow
   PlotIndexSetDouble (0, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble (1, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetInteger(0, PLOT_ARROW_SHIFT,  10);
   PlotIndexSetInteger(1, PLOT_ARROW_SHIFT, -10);

   IndicatorSetString(INDICATOR_SHORTNAME, "GoldScalper");
   IndicatorSetInteger(INDICATOR_DIGITS, _Digits);

   // --- indicator handles (created once, released in OnDeinit) ---
   hEmaFast = iMA (_Symbol, PERIOD_M1, InpFastEMA,    0, MODE_EMA, PRICE_CLOSE);
   hEmaSlow = iMA (_Symbol, PERIOD_M1, InpSlowEMA,    0, MODE_EMA, PRICE_CLOSE);
   hRSI     = iRSI(_Symbol, PERIOD_M1, InpRSIPeriod,     PRICE_CLOSE);
   hATR     = iATR(_Symbol, PERIOD_M1, InpATRPeriod);
   hM5Trend = iMA (_Symbol, PERIOD_M5, InpM5TrendEMA, 0, MODE_EMA, PRICE_CLOSE);
   hM5Fast  = iMA (_Symbol, PERIOD_M5, InpM5FastEMA,  0, MODE_EMA, PRICE_CLOSE);
   hM5Slow  = iMA (_Symbol, PERIOD_M5, InpM5SlowEMA,  0, MODE_EMA, PRICE_CLOSE);

   if(hEmaFast==INVALID_HANDLE || hEmaSlow==INVALID_HANDLE || hRSI==INVALID_HANDLE ||
      hATR==INVALID_HANDLE || hM5Trend==INVALID_HANDLE || hM5Fast==INVALID_HANDLE ||
      hM5Slow==INVALID_HANDLE)
     {
      Print("GSI: ERROR - failed to create indicator handles, err=", GetLastError());
      return(INIT_FAILED);
     }

   ZeroSignal(g_last);
   EventSetTimer(1); // refresh panel once per second even without ticks
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| OnDeinit                                                         |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   if(hEmaFast!=INVALID_HANDLE) IndicatorRelease(hEmaFast);
   if(hEmaSlow!=INVALID_HANDLE) IndicatorRelease(hEmaSlow);
   if(hRSI    !=INVALID_HANDLE) IndicatorRelease(hRSI);
   if(hATR    !=INVALID_HANDLE) IndicatorRelease(hATR);
   if(hM5Trend!=INVALID_HANDLE) IndicatorRelease(hM5Trend);
   if(hM5Fast !=INVALID_HANDLE) IndicatorRelease(hM5Fast);
   if(hM5Slow !=INVALID_HANDLE) IndicatorRelease(hM5Slow);
   ObjectsDeleteAll(0, PFX);
   ChartRedraw();
  }
//+------------------------------------------------------------------+
//| Helpers                                                          |
//+------------------------------------------------------------------+
void ZeroSignal(SignalInfo &s)
  {
   s.direction=0; s.strength=0; s.atr=0; s.entry=0; s.sl=0; s.tp=0;
   s.volRegime=0; s.trend=0; s.rsi=50.0; s.blockReason=""; s.triggered=false;
  }

// Copy a single buffer value; returns EMPTY_VALUE on failure
double BufVal(const int handle, const int shift)
  {
   double tmp[1];
   if(CopyBuffer(handle, 0, shift, 1, tmp) != 1)
      return(EMPTY_VALUE);
   return(tmp[0]);
  }

// Average of ATR over InpATRAvgPeriod bars starting at 'shift'
double ATRAverage(const int shift)
  {
   double a[];
   int need = MathMax(InpATRAvgPeriod, 2);
   if(CopyBuffer(hATR, 0, shift, need, a) != need)
      return(EMPTY_VALUE);
   double sum = 0.0;
   for(int i=0; i<need; i++) sum += a[i];
   return(sum / need);
  }

//+------------------------------------------------------------------+
//| Session helpers (broker server time)                             |
//+------------------------------------------------------------------+
bool HourInRange(const int h, const int start, const int end)
  {
   if(start <= end) return(h >= start && h < end);
   return(h >= start || h < end); // range crossing midnight
  }

// Session name + tradable flag for a given server time
string SessionStatus(const datetime t, bool &tradable)
  {
   MqlDateTime dt;
   TimeToStruct(t, dt);
   int h = dt.hour;
   bool asian  = HourInRange(h, InpAsianStart,  InpAsianEnd);
   bool london = HourInRange(h, InpLondonStart, InpLondonEnd);
   bool ny     = HourInRange(h, InpNYStart,     InpNYEnd);

   tradable = (asian && InpTradeAsian) || (london && InpTradeLondon) || (ny && InpTradeNY);

   if(london && ny) return("London/NY OVERLAP");
   if(london)       return("London");
   if(ny)           return("New York");
   if(asian)        return("Asian");
   return("Off-session");
  }

//+------------------------------------------------------------------+
//| Core signal evaluation on a CLOSED bar (shift >= 1)              |
//| Returns true if a valid (filtered) signal exists at that bar.    |
//| 'info' is always filled with the market snapshot for the panel.  |
//+------------------------------------------------------------------+
bool EvaluateSignal(const int shift, const datetime barTime,
                    const double o, const double h, const double l, const double c,
                    SignalInfo &info)
  {
   ZeroSignal(info);

   // --- M1 values on closed bars ---
   double ef[],  es[];   // fast/slow EMA, [0]=shift, [1]=shift+1
   ArraySetAsSeries(ef, true);
   ArraySetAsSeries(es, true);
   if(CopyBuffer(hEmaFast, 0, shift, 2, ef) != 2) return(false);
   if(CopyBuffer(hEmaSlow, 0, shift, 2, es) != 2) return(false);
   double rsi = BufVal(hRSI, shift);
   double atr = BufVal(hATR, shift);
   double atrAvg = ATRAverage(shift);
   if(rsi==EMPTY_VALUE || atr==EMPTY_VALUE || atrAvg==EMPTY_VALUE) return(false);

   info.rsi = rsi;
   info.atr = atr;

   // --- M5 values: always use the LAST CLOSED M5 bar relative to this M1
   //     bar's M5 bar (iBarShift + 1) => identical for history and live,
   //     therefore non-repainting. ---
   int m5idx = iBarShift(_Symbol, PERIOD_M5, barTime, false);
   if(m5idx < 0) return(false);
   int m5c = m5idx + 1; // last fully closed M5 bar
   double m5t = BufVal(hM5Trend, m5c);
   double m5f = BufVal(hM5Fast,  m5c);
   double m5s = BufVal(hM5Slow,  m5c);
   if(m5t==EMPTY_VALUE || m5f==EMPTY_VALUE || m5s==EMPTY_VALUE) return(false);
   double m5close = iClose(_Symbol, PERIOD_M5, m5c);
   if(m5close <= 0) return(false);

   // --- M5 trend direction ---
   bool m5Up   = (m5close > m5t) && (m5f > m5s);
   bool m5Down = (m5close < m5t) && (m5f < m5s);
   info.trend = m5Up ? 1 : (m5Down ? -1 : 0);

   // --- ATR volatility regime ---
   if(atr < InpMinATRPoints * _Point)      info.volRegime = 1; // low
   else if(atr > InpMaxATRMult * atrAvg)   info.volRegime = 2; // abnormal
   else                                    info.volRegime = 0; // normal

   // --- EMA crossover trigger on the closed signal bar ---
   bool crossUp   = (ef[0] > es[0]) && (ef[1] <= es[1]);
   bool crossDown = (ef[0] < es[0]) && (ef[1] >= es[1]);
   if(!crossUp && !crossDown)
      return(false); // no trigger; snapshot fields already filled

   info.triggered = true;
   int dir = crossUp ? 1 : -1;

   // --- Filters (each rejection records a reason) ---
   if(info.volRegime == 1) { info.blockReason = "Low volatility (ATR below minimum)"; return(false); }
   if(info.volRegime == 2) { info.blockReason = "Abnormal volatility (ATR spike)";    return(false); }

   // Sideways: M5 EMAs compressed
   if(MathAbs(m5f - m5s) < InpM5GapMinATR * atr)
     { info.blockReason = "Sideways market (M5 EMAs compressed)"; return(false); }

   // RSI momentum confirmation
   if(dir > 0 && !(rsi > 50.0 && rsi < InpRSIOverbought))
     { info.blockReason = "RSI not confirming buy"; return(false); }
   if(dir < 0 && !(rsi < 50.0 && rsi > InpRSIOversold))
     { info.blockReason = "RSI not confirming sell"; return(false); }

   // M5 higher-timeframe trend agreement
   if(dir > 0 && !m5Up)   { info.blockReason = "M5 trend not up";   return(false); }
   if(dir < 0 && !m5Down) { info.blockReason = "M5 trend not down"; return(false); }

   // Price-action candle confirmation
   double range = h - l;
   double body  = MathAbs(c - o);
   double bodyRatio = (range > 0.0) ? body / range : 0.0;
   bool candleOK = false;
   if(dir > 0) candleOK = (c > o) && (bodyRatio >= InpMinBodyRatio) && (c > ef[0]);
   else        candleOK = (c < o) && (bodyRatio >= InpMinBodyRatio) && (c < ef[0]);
   if(!candleOK) { info.blockReason = "Candle confirmation failed"; return(false); }

   // --- Signal strength score 0-100 (confluence) ---
   int score = 0;
   // 1) M1 EMA alignment quality: gap in ATR units, up to 15
   double gapATR = (atr > 0.0) ? MathAbs(ef[0] - es[0]) / atr : 0.0;
   score += (int)MathRound(MathMin(gapATR / 0.30, 1.0) * 15.0);
   // 2) RSI momentum distance from 50, up to 20
   double rsiDist = MathMin(MathAbs(rsi - 50.0) / 15.0, 1.0);
   score += (int)MathRound(rsiDist * 20.0);
   // 3) M5 trend agreement (already required): full alignment = 30
   score += 30;
   // 4) Normal ATR regime = 15
   if(info.volRegime == 0) score += 15;
   // 5) Candle body quality up to 20
   double bodyScore = MathMin((bodyRatio - InpMinBodyRatio) / (0.80 - InpMinBodyRatio), 1.0);
   if(bodyScore < 0.0) bodyScore = 0.0;
   score += (int)MathRound(bodyScore * 20.0);
   if(score > 100) score = 100;

   info.strength = score;
   if(score < InpMinStrength)
     { info.blockReason = StringFormat("Strength %d < %d", score, InpMinStrength); return(false); }

   // --- Valid signal ---
   info.direction = dir;
   info.entry = c;
   if(dir > 0) { info.sl = c - InpSLMultATR * atr; info.tp = c + InpTPMultATR * atr; }
   else        { info.sl = c + InpSLMultATR * atr; info.tp = c - InpTPMultATR * atr; }
   return(true);
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
   int lookback = MathMax(InpSlowEMA, MathMax(InpATRPeriod + InpATRAvgPeriod, InpRSIPeriod)) + 5;
   if(rates_total < lookback + 2)
      return(0);

   ArraySetAsSeries(time,  true);
   ArraySetAsSeries(open,  true);
   ArraySetAsSeries(high,  true);
   ArraySetAsSeries(low,   true);
   ArraySetAsSeries(close, true);

   int start; // oldest series index to (re)compute
   if(prev_calculated <= 0)
     {
      ArrayInitialize(BuyBuf,  EMPTY_VALUE);
      ArrayInitialize(SellBuf, EMPTY_VALUE);
      start = MathMin(rates_total - lookback - 1, InpMaxBarsBack);
     }
   else
     {
      start = rates_total - prev_calculated + 1;
      if(start < 1) start = 1;
     }

   // current forming bar never carries an arrow
   BuyBuf[0]  = EMPTY_VALUE;
   SellBuf[0] = EMPTY_VALUE;

   SignalInfo info;
   for(int i = start; i >= 1; i--)
     {
      BuyBuf[i]  = EMPTY_VALUE;
      SellBuf[i] = EMPTY_VALUE;
      bool ok = EvaluateSignal(i, time[i], open[i], high[i], low[i], close[i], info);
      if(ok)
        {
         if(info.direction > 0) BuyBuf[i]  = low[i];
         else                   SellBuf[i] = high[i];
        }
      if(i == 1)
        {
         g_last = info; // snapshot of the most recent closed bar
         if(ok)
           {
            if(InpDrawSLTP) DrawSignalLevels(time[1], info);
            FireAlerts(time[1], info);
           }
        }
     }

   UpdatePanel();
   return(rates_total);
  }
//+------------------------------------------------------------------+
//| Timer: keep panel fresh (spread/session change without ticks)    |
//+------------------------------------------------------------------+
void OnTimer()
  {
   UpdatePanel();
  }
//+------------------------------------------------------------------+
//| Alerts (fired once per signal bar)                               |
//+------------------------------------------------------------------+
void FireAlerts(const datetime barTime, const SignalInfo &info)
  {
   if(barTime == g_lastAlertBar) return; // already alerted for this bar
   g_lastAlertBar = barTime;

   string dir = (info.direction > 0) ? "BUY" : "SELL";
   string msg = StringFormat("GoldScalper %s %s | strength %d | entry %s | SL %s | TP %s",
                             _Symbol, dir, info.strength,
                             DoubleToString(info.entry, _Digits),
                             DoubleToString(info.sl, _Digits),
                             DoubleToString(info.tp, _Digits));

   bool tester = (bool)MQLInfoInteger(MQL_TESTER);
   if(InpAlertPopup && !tester) Alert(msg);
   if(InpAlertSound && !tester) PlaySound(InpSoundFile);
   if(InpAlertPush  && !tester) SendNotification(msg);
   if(InpAlertEmail && !tester) SendMail("GoldScalper signal", msg);
   Print("GSI: ", msg);
  }
//+------------------------------------------------------------------+
//| Draw entry/SL/TP lines + labels for the latest signal            |
//+------------------------------------------------------------------+
void DrawSignalLevels(const datetime barTime, const SignalInfo &info)
  {
   datetime t2 = barTime + 30 * 60; // extend lines 30 minutes to the right
   DrawLevel("ENTRY", barTime, t2, info.entry, clrDodgerBlue, "Entry " + DoubleToString(info.entry, _Digits));
   DrawLevel("SL",    barTime, t2, info.sl,    clrOrangeRed,  "SL "    + DoubleToString(info.sl, _Digits));
   DrawLevel("TP",    barTime, t2, info.tp,    clrLimeGreen,  "TP "    + DoubleToString(info.tp, _Digits));
  }

void DrawLevel(const string tag, const datetime t1, const datetime t2,
               const double price, const color clr, const string text)
  {
   string ln = PFX + "LN_" + tag;
   string lb = PFX + "LB_" + tag;
   if(ObjectFind(0, ln) < 0)
     {
      ObjectCreate(0, ln, OBJ_TREND, 0, t1, price, t2, price);
      ObjectSetInteger(0, ln, OBJPROP_RAY_RIGHT, false);
      ObjectSetInteger(0, ln, OBJPROP_STYLE, STYLE_DASH);
      ObjectSetInteger(0, ln, OBJPROP_WIDTH, 1);
      ObjectSetInteger(0, ln, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, ln, OBJPROP_HIDDEN, true);
     }
   ObjectSetInteger(0, ln, OBJPROP_COLOR, clr);
   ObjectMove(0, ln, 0, t1, price);
   ObjectMove(0, ln, 1, t2, price);

   if(ObjectFind(0, lb) < 0)
     {
      ObjectCreate(0, lb, OBJ_TEXT, 0, t2, price);
      ObjectSetInteger(0, lb, OBJPROP_FONTSIZE, 8);
      ObjectSetInteger(0, lb, OBJPROP_ANCHOR, ANCHOR_LEFT);
      ObjectSetInteger(0, lb, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, lb, OBJPROP_HIDDEN, true);
     }
   ObjectSetInteger(0, lb, OBJPROP_COLOR, clr);
   ObjectSetString (0, lb, OBJPROP_TEXT, text);
   ObjectMove(0, lb, 0, t2, price);
  }
//+------------------------------------------------------------------+
//| Info panel                                                       |
//+------------------------------------------------------------------+
void PanelLabel(const string name, const int x, const int y,
                const string text, const color clr)
  {
   string obj = PFX + name;
   if(ObjectFind(0, obj) < 0)
     {
      ObjectCreate(0, obj, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, obj, OBJPROP_CORNER, InpCorner);
      ObjectSetInteger(0, obj, OBJPROP_FONTSIZE, InpFontSize);
      ObjectSetString (0, obj, OBJPROP_FONT, "Consolas");
      ObjectSetInteger(0, obj, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, obj, OBJPROP_HIDDEN, true);
     }
   ObjectSetInteger(0, obj, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, obj, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, obj, OBJPROP_COLOR, clr);
   ObjectSetString (0, obj, OBJPROP_TEXT, text);
  }

void UpdatePanel()
  {
   // Background
   string bg = PFX + "BG";
   int width = 300, height = 218, rowH = 17;
   if(ObjectFind(0, bg) < 0)
     {
      ObjectCreate(0, bg, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, bg, OBJPROP_CORNER, InpCorner);
      ObjectSetInteger(0, bg, OBJPROP_BGCOLOR, InpPanelBg);
      ObjectSetInteger(0, bg, OBJPROP_BORDER_TYPE, BORDER_FLAT);
      ObjectSetInteger(0, bg, OBJPROP_COLOR, clrDimGray);
      ObjectSetInteger(0, bg, OBJPROP_BACK, false);
      ObjectSetInteger(0, bg, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, bg, OBJPROP_HIDDEN, true);
     }
   ObjectSetInteger(0, bg, OBJPROP_XDISTANCE, InpPanelX);
   ObjectSetInteger(0, bg, OBJPROP_YDISTANCE, InpPanelY);
   ObjectSetInteger(0, bg, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, bg, OBJPROP_YSIZE, height);

   int x = InpPanelX + 8;
   int y = InpPanelY + 6;

   // Data
   long   sprPts = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   bool   sessionTradable = false;
   string session = SessionStatus(TimeCurrent(), sessionTradable);

   string trendStr = (g_last.trend > 0) ? "UP" : (g_last.trend < 0 ? "DOWN" : "FLAT");
   color  trendClr = (g_last.trend > 0) ? clrLime : (g_last.trend < 0 ? clrTomato : clrSilver);

   string volStr = (g_last.volRegime == 0) ? "NORMAL" : (g_last.volRegime == 1 ? "LOW" : "ABNORMAL");
   color  volClr = (g_last.volRegime == 0) ? clrLime : clrOrange;

   string sigStr = ""; color sigClr = clrSilver;
   if(g_last.direction > 0)      { sigStr = StringFormat("BUY  (strength %d)", g_last.strength); sigClr = clrLime; }
   else if(g_last.direction < 0) { sigStr = StringFormat("SELL (strength %d)", g_last.strength); sigClr = clrTomato; }
   else if(g_last.triggered)     { sigStr = "Trigger rejected"; sigClr = clrOrange; }
   else                          { sigStr = "None"; sigClr = clrSilver; }

   // Trading allowed / blocked
   string allowStr = "ALLOWED"; color allowClr = clrLime;
   string reason = "";
   if(!sessionTradable)                         { allowStr = "BLOCKED"; allowClr = clrTomato; reason = "Off tradable session"; }
   else if(InpMaxSpreadPts > 0 && (double)sprPts > InpMaxSpreadPts)
                                                { allowStr = "BLOCKED"; allowClr = clrTomato; reason = "Spread too high"; }
   else if(g_last.volRegime == 1)               { allowStr = "BLOCKED"; allowClr = clrTomato; reason = "Low volatility"; }
   else if(g_last.volRegime == 2)               { allowStr = "BLOCKED"; allowClr = clrTomato; reason = "Abnormal volatility"; }

   string lastBlock = (g_last.blockReason != "") ? g_last.blockReason : "-";

   PanelLabel("T0",  x, y,            "GOLD SCALPER  " + _Symbol + " M1", clrGold);
   PanelLabel("T1",  x, y + rowH,     StringFormat("M5 Trend    : %s", trendStr), trendClr);
   PanelLabel("T2",  x, y + rowH*2,   StringFormat("Signal      : %s", sigStr), sigClr);
   PanelLabel("T3",  x, y + rowH*3,   StringFormat("RSI(%d)     : %.1f", InpRSIPeriod, g_last.rsi), InpPanelText);
   PanelLabel("T4",  x, y + rowH*4,   StringFormat("ATR(%d)     : %s (%s)", InpATRPeriod,
                       DoubleToString(g_last.atr, _Digits), volStr), volClr);
   PanelLabel("T5",  x, y + rowH*5,   StringFormat("Spread      : %d pts", (int)sprPts),
                       (InpMaxSpreadPts > 0 && (double)sprPts > InpMaxSpreadPts) ? clrTomato : InpPanelText);
   PanelLabel("T6",  x, y + rowH*6,   StringFormat("Session     : %s", session),
                       sessionTradable ? clrLime : clrSilver);
   PanelLabel("T7",  x, y + rowH*7,   StringFormat("Trading     : %s", allowStr), allowClr);
   PanelLabel("T8",  x, y + rowH*8,   StringFormat("Reason      : %s", (reason != "" ? reason : "-")), InpPanelText);
   PanelLabel("T9",  x, y + rowH*9,   StringFormat("Last filter : %s", lastBlock), clrSilver);
   if(g_last.direction != 0)
     {
      PanelLabel("TA", x, y + rowH*10, StringFormat("Entry %s SL %s",
                        DoubleToString(g_last.entry, _Digits), DoubleToString(g_last.sl, _Digits)), InpPanelText);
      PanelLabel("TB", x, y + rowH*11, StringFormat("TP    %s (%.1fxATR)",
                        DoubleToString(g_last.tp, _Digits), InpTPMultATR), InpPanelText);
     }
   else
     {
      PanelLabel("TA", x, y + rowH*10, "Entry -", clrSilver);
      PanelLabel("TB", x, y + rowH*11, "TP    -", clrSilver);
     }
   ChartRedraw();
  }
//+------------------------------------------------------------------+
