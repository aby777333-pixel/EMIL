//+------------------------------------------------------------------+
//|                                            GIO_Range_Scanner.mq5  |
//|                          GIO4X / 777 Capital Markets - GIO RANGE  |
//|                                                                  |
//|  Purpose:                                                        |
//|    Scan the market regime and AVOID range / chop.                |
//|    Draws BUY / SELL continuation arrows only when the market is  |
//|    genuinely trending (not ranging), on the current chart TF.    |
//|    Shows a multi-timeframe panel (M1 / M5 / M15) + regime banner.|
//|                                                                  |
//|  Regime engine (why it avoids ranges):                           |
//|    - ADX >= threshold AND ADX rising (trend is strengthening)    |
//|    - +DI / -DI separation (clear directional pressure)           |
//|    - Kaufman Efficiency Ratio (price is going somewhere, not     |
//|      wandering back and forth)                                   |
//|    - EMA-cross chop counter (few crosses = clean trend)          |
//|    - Bollinger width vs ATR + expansion (no squeeze / dead zone) |
//|    These combine into a 0..100 RANGE SCORE. High score = range   |
//|    = STAND ASIDE.                                                 |
//+------------------------------------------------------------------+
#property copyright "GIO4X / 777 Capital Markets"
#property version   "2.00"
#property indicator_chart_window
#property indicator_buffers 2
#property indicator_plots   2

#property indicator_label1  "GIO Buy"
#property indicator_type1   DRAW_ARROW
#property indicator_color1  clrLime
#property indicator_width1  2

#property indicator_label2  "GIO Sell"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrRed
#property indicator_width2  2

//============================ Inputs ================================
input int    InpFastEMA          = 21;      // Fast EMA
input int    InpMidEMA           = 50;      // Mid EMA
input int    InpSlowEMA          = 200;     // Slow / trend EMA

input int    InpADXPeriod        = 14;      // ADX period
input double InpMinADX           = 23.0;    // Min ADX for a trend
input double InpMinDISpread       = 4.0;    // Min |+DI - -DI| separation

input int    InpATRPeriod        = 14;      // ATR period
input double InpMinATRPoints      = 100.0;  // Min ATR in points (dead-market floor)

input int    InpBandsPeriod      = 20;      // Bollinger period
input double InpBandsDeviation   = 2.0;     // Bollinger deviation
input double InpMinBBWidthATR     = 1.10;   // Min (BBupper-BBlower)/ATR (squeeze guard)

input int    InpERPeriod         = 10;      // Efficiency Ratio lookback
input double InpMinER            = 0.32;    // Min Efficiency Ratio (0..1)

input int    InpChopPeriod       = 20;      // EMA-cross chop lookback
input int    InpMaxEMACrosses     = 6;      // Max EMA crosses allowed in window

input int    InpMaxRangeScore     = 35;     // Trade only if range score <= this

input double InpPullbackATR       = 0.60;   // Bar must dip within this * ATR of fast EMA
input double InpMinBodyATR         = 0.25;  // Confirmation candle body >= this * ATR
input double InpArrowOffsetATR    = 0.60;   // Arrow distance from bar in ATR

input int    InpMaxDrawBars       = 1500;   // How many recent bars to draw arrows on
input bool   InpShowPanel         = true;   // Show MTF panel
input bool   InpShowBanner        = true;   // Show regime banner
input bool   InpAlertsOn          = false;  // Popup alert on new arrow

//============================ Buffers ==============================
double BuyBuffer[];
double SellBuffer[];

//============================ Handles (current TF) =================
int hFast, hMid, hSlow, hADX, hATR, hBands;

//============================ Handles (MTF panel) =================
ENUM_TIMEFRAMES TFs[3] = { PERIOD_M1, PERIOD_M5, PERIOD_M15 };
string          TFNames[3] = { "M1", "M5", "M15" };
int hFastTF[3], hMidTF[3], hSlowTF[3], hADXTF[3], hATRTF[3], hBandsTF[3];

string LP = "GIO_RANGE_";        // label prefix
datetime lastArrowBar = 0;

//============================ Regime struct =======================
struct Regime
{
   bool   ready;
   int    dir;       // 1 up, -1 down, 0 none
   bool   isRange;
   int    score;     // 0..100
   double adx;
   double er;
   double atr;
   double bbwATR;
   int    crosses;
};

//============================ Small helpers =======================
int Sgn(const double x)
{
   if(x > 0.0) return 1;
   if(x < 0.0) return -1;
   return 0;
}

double PointVal()
{
   return SymbolInfoDouble(_Symbol, SYMBOL_POINT);
}

bool CopyOne(const int handle, const int buffer, const int shift, double &value)
{
   double tmp[];
   ArraySetAsSeries(tmp, true);
   if(CopyBuffer(handle, buffer, shift, 1, tmp) <= 0) return false;
   value = tmp[0];
   if(value == EMPTY_VALUE) return false;
   return true;
}

double EfficiencyRatio(const double &c[], const int idx, const int period, const int maxIdx)
{
   if(idx + period > maxIdx) return 0.0;
   double net = MathAbs(c[idx] - c[idx + period]);
   double sum = 0.0;
   for(int k = 0; k < period; k++)
      sum += MathAbs(c[idx + k] - c[idx + k + 1]);
   if(sum <= 0.0) return 0.0;
   return net / sum;
}

int EmaCrosses(const double &c[], const double &f[], const int idx, const int period, const int maxIdx)
{
   if(idx + period + 1 > maxIdx) return 0;
   int cnt  = 0;
   int prev = Sgn(c[idx] - f[idx]);
   for(int k = 1; k <= period; k++)
   {
      int s = Sgn(c[idx + k] - f[idx + k]);
      if(s != 0 && prev != 0 && s != prev) cnt++;
      if(s != 0) prev = s;
   }
   return cnt;
}

//+------------------------------------------------------------------+
//| Core regime evaluation - shared logic                            |
//+------------------------------------------------------------------+
void EvalRegime(const double fast, const double mid, const double slow,
                const double adx, const double adxPrev,
                const double plusDI, const double minusDI,
                const double atr, const double bbUpper, const double bbLower,
                const double bbUpperPrev, const double bbLowerPrev,
                const double closeV, const double er, const int crosses,
                Regime &r)
{
   r.ready   = false;
   r.dir     = 0;
   r.isRange = true;
   r.score   = 100;
   r.adx     = adx;
   r.er      = er;
   r.atr     = atr;
   r.crosses = crosses;

   if(atr <= 0.0)
      return;

   double bbwATR     = (bbUpper - bbLower) / atr;
   double bbwATRprev = (bbUpperPrev - bbLowerPrev) / atr;
   bool   expanding  = (bbwATR > bbwATRprev);
   r.bbwATR = bbwATR;

   int score = 0;

   // 1) Trend strength
   if(adx < InpMinADX)          score += 30;
   else if(adx <= adxPrev)      score += 10;   // ADX not rising

   // 2) Directional efficiency (anti-chop core)
   if(er < InpMinER)            score += 25;

   // 3) Whipsaw / chop counter
   if(crosses > InpMaxEMACrosses) score += 20;

   // 4) Bollinger squeeze / dead zone (only penalise if not expanding out)
   if(bbwATR < InpMinBBWidthATR && !expanding) score += 20;

   // 5) Volatility floor
   if(atr < InpMinATRPoints * PointVal()) score += 10;

   // Direction from EMA alignment + DI pressure
   bool upAlign   = (fast > mid && mid > slow);
   bool dnAlign   = (fast < mid && mid < slow);
   bool diUp      = (plusDI - minusDI) >= InpMinDISpread;
   bool diDown    = (minusDI - plusDI) >= InpMinDISpread;

   int dir = 0;
   if(upAlign && diUp && closeV > fast)      dir = 1;
   else if(dnAlign && diDown && closeV < fast) dir = -1;

   if(dir == 0) score += 15;

   r.ready   = true;
   r.score   = score;
   r.isRange = (score > InpMaxRangeScore) || (dir == 0);
   r.dir     = r.isRange ? 0 : dir;
}

//+------------------------------------------------------------------+
//| Live regime for a given MTF handle set (shift = 1)               |
//+------------------------------------------------------------------+
bool PanelRegime(const int tf, Regime &r)
{
   double fast, mid, slow, adx, adxPrev, pDI, mDI, atr, up, lo, upP, loP;
   if(!CopyOne(hFastTF[tf],  0, 1, fast))    return false;
   if(!CopyOne(hMidTF[tf],   0, 1, mid))     return false;
   if(!CopyOne(hSlowTF[tf],  0, 1, slow))    return false;
   if(!CopyOne(hADXTF[tf],   0, 1, adx))     return false;
   if(!CopyOne(hADXTF[tf],   0, 2, adxPrev)) return false;
   if(!CopyOne(hADXTF[tf],   1, 1, pDI))     return false;
   if(!CopyOne(hADXTF[tf],   2, 1, mDI))     return false;
   if(!CopyOne(hATRTF[tf],   0, 1, atr))     return false;
   if(!CopyOne(hBandsTF[tf], 1, 1, up))      return false;
   if(!CopyOne(hBandsTF[tf], 2, 1, lo))      return false;
   if(!CopyOne(hBandsTF[tf], 1, 2, upP))     return false;
   if(!CopyOne(hBandsTF[tf], 2, 2, loP))     return false;

   double closeV = iClose(_Symbol, TFs[tf], 1);
   if(closeV <= 0.0) return false;

   // ER + chop from close & fast arrays
   int need = InpChopPeriod + InpERPeriod + 6;
   double c[], f[];
   ArraySetAsSeries(c, true);
   ArraySetAsSeries(f, true);
   if(CopyClose(_Symbol, TFs[tf], 0, need, c) <= 0)     return false;
   if(CopyBuffer(hFastTF[tf], 0, 0, need, f) <= 0)      return false;

   int maxIdx  = ArraySize(c) - 1;
   double er   = EfficiencyRatio(c, 1, InpERPeriod, maxIdx);
   int crosses = EmaCrosses(c, f, 1, InpChopPeriod, maxIdx);

   EvalRegime(fast, mid, slow, adx, adxPrev, pDI, mDI, atr, up, lo, upP, loP, closeV, er, crosses, r);
   return true;
}

//============================ Panel drawing =======================
string RegimeText(const Regime &r)
{
   if(!r.ready)   return "LOADING";
   if(r.isRange)  return "RANGE - AVOID";
   if(r.dir > 0)  return "UPTREND";
   if(r.dir < 0)  return "DOWNTREND";
   return "NO TRADE";
}

color RegimeColor(const Regime &r)
{
   if(!r.ready)  return clrSilver;
   if(r.isRange) return clrOrange;
   if(r.dir > 0) return clrLime;
   if(r.dir < 0) return clrTomato;
   return clrSilver;
}

void SetLabel(const string name, const int x, const int y, const string text,
              const color clr, const int fontsize = 10, const string font = "Consolas")
{
   if(ObjectFind(0, name) < 0)
   {
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
   }
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fontsize);
   ObjectSetString(0, name, OBJPROP_FONT, font);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
}

void UpdatePanel()
{
   if(!InpShowPanel && !InpShowBanner)
      return;

   Regime rc;
   bool curOk = false;

   // Current chart regime for the banner (reuse M-panel eval on current TF handles)
   {
      double fast, mid, slow, adx, adxPrev, pDI, mDI, atr, up, lo, upP, loP;
      if(CopyOne(hFast, 0, 1, fast) && CopyOne(hMid, 0, 1, mid) && CopyOne(hSlow, 0, 1, slow) &&
         CopyOne(hADX, 0, 1, adx) && CopyOne(hADX, 0, 2, adxPrev) &&
         CopyOne(hADX, 1, 1, pDI) && CopyOne(hADX, 2, 1, mDI) &&
         CopyOne(hATR, 0, 1, atr) &&
         CopyOne(hBands, 1, 1, up) && CopyOne(hBands, 2, 1, lo) &&
         CopyOne(hBands, 1, 2, upP) && CopyOne(hBands, 2, 2, loP))
      {
         double closeV = iClose(_Symbol, PERIOD_CURRENT, 1);
         int need = InpChopPeriod + InpERPeriod + 6;
         double c[], f[];
         ArraySetAsSeries(c, true);
         ArraySetAsSeries(f, true);
         if(closeV > 0.0 && CopyClose(_Symbol, PERIOD_CURRENT, 0, need, c) > 0 &&
            CopyBuffer(hFast, 0, 0, need, f) > 0)
         {
            int maxIdx  = ArraySize(c) - 1;
            double er   = EfficiencyRatio(c, 1, InpERPeriod, maxIdx);
            int crosses = EmaCrosses(c, f, 1, InpChopPeriod, maxIdx);
            EvalRegime(fast, mid, slow, adx, adxPrev, pDI, mDI, atr, up, lo, upP, loP, closeV, er, crosses, rc);
            curOk = true;
         }
      }
   }

   if(InpShowBanner && curOk)
   {
      string btxt = "GIO RANGE  |  " + _Symbol + "  " + EnumToString(_Period) + "   ->   " + RegimeText(rc)
                    + "   (score " + IntegerToString(rc.score) + ")";
      SetLabel(LP + "BANNER", 12, 20, btxt, RegimeColor(rc), 12, "Consolas");
   }

   if(InpShowPanel)
   {
      SetLabel(LP + "HDR", 12, 44, "MULTI-TIMEFRAME REGIME", clrWhite, 10);
      int y = 66;
      for(int i = 0; i < 3; i++)
      {
         Regime r;
         string line;
         if(PanelRegime(i, r))
         {
            line = StringFormat("%-4s %-14s ADX %5.1f  ER %4.2f  BB/ATR %4.2f  Chop %d",
                                TFNames[i], RegimeText(r), r.adx, r.er, r.bbwATR, r.crosses);
            SetLabel(LP + "TF" + IntegerToString(i), 12, y, line, RegimeColor(r), 9);
         }
         else
         {
            SetLabel(LP + "TF" + IntegerToString(i), 12, y, TFNames[i] + "  LOADING...", clrSilver, 9);
         }
         y += 18;
      }
   }
}

//============================ Init / Deinit =======================
int OnInit()
{
   SetIndexBuffer(0, BuyBuffer,  INDICATOR_DATA);
   SetIndexBuffer(1, SellBuffer, INDICATOR_DATA);
   ArraySetAsSeries(BuyBuffer,  true);
   ArraySetAsSeries(SellBuffer, true);

   PlotIndexSetInteger(0, PLOT_ARROW, 233);   // up arrow
   PlotIndexSetInteger(1, PLOT_ARROW, 234);   // down arrow
   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, 0.0);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, 0.0);
   PlotIndexSetInteger(0, PLOT_ARROW_SHIFT,  10);
   PlotIndexSetInteger(1, PLOT_ARROW_SHIFT, -10);

   IndicatorSetString(INDICATOR_SHORTNAME, "GIO RANGE Scanner");

   hFast  = iMA(_Symbol, PERIOD_CURRENT, InpFastEMA, 0, MODE_EMA, PRICE_CLOSE);
   hMid   = iMA(_Symbol, PERIOD_CURRENT, InpMidEMA,  0, MODE_EMA, PRICE_CLOSE);
   hSlow  = iMA(_Symbol, PERIOD_CURRENT, InpSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
   hADX   = iADX(_Symbol, PERIOD_CURRENT, InpADXPeriod);
   hATR   = iATR(_Symbol, PERIOD_CURRENT, InpATRPeriod);
   hBands = iBands(_Symbol, PERIOD_CURRENT, InpBandsPeriod, 0, InpBandsDeviation, PRICE_CLOSE);

   if(hFast == INVALID_HANDLE || hMid == INVALID_HANDLE || hSlow == INVALID_HANDLE ||
      hADX == INVALID_HANDLE || hATR == INVALID_HANDLE || hBands == INVALID_HANDLE)
   {
      Print("GIO RANGE: current-TF handle creation failed.");
      return INIT_FAILED;
   }

   for(int i = 0; i < 3; i++)
   {
      hFastTF[i]  = iMA(_Symbol, TFs[i], InpFastEMA, 0, MODE_EMA, PRICE_CLOSE);
      hMidTF[i]   = iMA(_Symbol, TFs[i], InpMidEMA,  0, MODE_EMA, PRICE_CLOSE);
      hSlowTF[i]  = iMA(_Symbol, TFs[i], InpSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
      hADXTF[i]   = iADX(_Symbol, TFs[i], InpADXPeriod);
      hATRTF[i]   = iATR(_Symbol, TFs[i], InpATRPeriod);
      hBandsTF[i] = iBands(_Symbol, TFs[i], InpBandsPeriod, 0, InpBandsDeviation, PRICE_CLOSE);

      if(hFastTF[i] == INVALID_HANDLE || hMidTF[i] == INVALID_HANDLE || hSlowTF[i] == INVALID_HANDLE ||
         hADXTF[i] == INVALID_HANDLE || hATRTF[i] == INVALID_HANDLE || hBandsTF[i] == INVALID_HANDLE)
      {
         Print("GIO RANGE: MTF handle creation failed on ", TFNames[i]);
         return INIT_FAILED;
      }
   }

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   ObjectDelete(0, LP + "BANNER");
   ObjectDelete(0, LP + "HDR");
   for(int i = 0; i < 3; i++)
      ObjectDelete(0, LP + "TF" + IntegerToString(i));

   IndicatorRelease(hFast);  IndicatorRelease(hMid);  IndicatorRelease(hSlow);
   IndicatorRelease(hADX);   IndicatorRelease(hATR);  IndicatorRelease(hBands);
   for(int i = 0; i < 3; i++)
   {
      IndicatorRelease(hFastTF[i]);  IndicatorRelease(hMidTF[i]);  IndicatorRelease(hSlowTF[i]);
      IndicatorRelease(hADXTF[i]);   IndicatorRelease(hATRTF[i]);  IndicatorRelease(hBandsTF[i]);
   }
}

//============================ Calculation =========================
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
   int minBars = InpSlowEMA + InpChopPeriod + InpERPeriod + 10;
   if(rates_total < minBars)
      return 0;

   ArrayInitialize(BuyBuffer,  0.0);
   ArrayInitialize(SellBuffer, 0.0);

   int barsToCopy = (int)MathMin(rates_total, InpMaxDrawBars + minBars);

   double fast[], mid[], slow[], adx[], pDI[], mDI[], atr[], up[], lo[], cl[], op[], hi[], lw[];
   ArraySetAsSeries(fast, true); ArraySetAsSeries(mid, true); ArraySetAsSeries(slow, true);
   ArraySetAsSeries(adx, true);  ArraySetAsSeries(pDI, true); ArraySetAsSeries(mDI, true);
   ArraySetAsSeries(atr, true);  ArraySetAsSeries(up, true);  ArraySetAsSeries(lo, true);
   ArraySetAsSeries(cl, true);   ArraySetAsSeries(op, true);  ArraySetAsSeries(hi, true);
   ArraySetAsSeries(lw, true);

   if(CopyBuffer(hFast, 0, 0, barsToCopy, fast) <= 0) return prev_calculated;
   if(CopyBuffer(hMid,  0, 0, barsToCopy, mid)  <= 0) return prev_calculated;
   if(CopyBuffer(hSlow, 0, 0, barsToCopy, slow) <= 0) return prev_calculated;
   if(CopyBuffer(hADX,  0, 0, barsToCopy, adx)  <= 0) return prev_calculated;
   if(CopyBuffer(hADX,  1, 0, barsToCopy, pDI)  <= 0) return prev_calculated;
   if(CopyBuffer(hADX,  2, 0, barsToCopy, mDI)  <= 0) return prev_calculated;
   if(CopyBuffer(hATR,  0, 0, barsToCopy, atr)  <= 0) return prev_calculated;
   if(CopyBuffer(hBands,1, 0, barsToCopy, up)   <= 0) return prev_calculated;
   if(CopyBuffer(hBands,2, 0, barsToCopy, lo)   <= 0) return prev_calculated;
   if(CopyClose(_Symbol, PERIOD_CURRENT, 0, barsToCopy, cl) <= 0) return prev_calculated;
   if(CopyOpen (_Symbol, PERIOD_CURRENT, 0, barsToCopy, op) <= 0) return prev_calculated;
   if(CopyHigh (_Symbol, PERIOD_CURRENT, 0, barsToCopy, hi) <= 0) return prev_calculated;
   if(CopyLow  (_Symbol, PERIOD_CURRENT, 0, barsToCopy, lw) <= 0) return prev_calculated;

   int maxIdx = barsToCopy - 1;
   int need   = (int)MathMax(InpERPeriod, InpChopPeriod + 1) + 2;

   for(int i = 1; i + need <= maxIdx && i <= InpMaxDrawBars; i++)
   {
      if(atr[i] <= 0.0)
         continue;

      double er    = EfficiencyRatio(cl, i, InpERPeriod, maxIdx);
      int    crs   = EmaCrosses(cl, fast, i, InpChopPeriod, maxIdx);

      Regime r;
      EvalRegime(fast[i], mid[i], slow[i], adx[i], adx[i + 2],
                 pDI[i], mDI[i], atr[i], up[i], lo[i], up[i + 1], lo[i + 1],
                 cl[i], er, crs, r);

      if(r.isRange || r.dir == 0)
         continue;

      double body = MathAbs(cl[i] - op[i]);

      if(r.dir == 1)
      {
         bool pulled  = (lw[i] <= fast[i] + InpPullbackATR * atr[i]);
         bool closed  = (cl[i] > fast[i]);
         bool bullBar = (cl[i] > op[i] && body >= InpMinBodyATR * atr[i]);
         if(pulled && closed && bullBar)
            BuyBuffer[i] = lw[i] - InpArrowOffsetATR * atr[i];
      }
      else // r.dir == -1
      {
         bool pulled  = (hi[i] >= fast[i] - InpPullbackATR * atr[i]);
         bool closed  = (cl[i] < fast[i]);
         bool bearBar = (cl[i] < op[i] && body >= InpMinBodyATR * atr[i]);
         if(pulled && closed && bearBar)
            SellBuffer[i] = hi[i] + InpArrowOffsetATR * atr[i];
      }
   }

   UpdatePanel();

   // Alert on a freshly closed bar's arrow
   if(InpAlertsOn && rates_total > 2)
   {
      datetime bt = time[rates_total - 2];
      if(bt != lastArrowBar)
      {
         if(BuyBuffer[1] != 0.0)  { Alert("GIO RANGE ", _Symbol, " ", EnumToString(_Period), " BUY"); lastArrowBar = bt; }
         if(SellBuffer[1] != 0.0) { Alert("GIO RANGE ", _Symbol, " ", EnumToString(_Period), " SELL"); lastArrowBar = bt; }
      }
   }

   return rates_total;
}
//+------------------------------------------------------------------+
