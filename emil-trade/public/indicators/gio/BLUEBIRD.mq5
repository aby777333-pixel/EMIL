//+------------------------------------------------------------------+
//|                                                     BLUEBIRD.mq5 |
//|                       Kalman Trend Levels Indicator (BLUEBIRD)   |
//|                       Converted from Pine Script [BigBeluga]     |
//+------------------------------------------------------------------+
#property copyright "BLUEBIRD - Kalman Trend Levels"
#property version   "1.00"
#property description "BLUEBIRD - Dual Kalman filter trend indicator with trend zones & retest signals"
#property indicator_chart_window
#property indicator_buffers 12
#property indicator_plots   3

//--- plot Short Kalman
#property indicator_label1  "Short Kalman"
#property indicator_type1   DRAW_COLOR_LINE
#property indicator_color1  clrLimeGreen,clrCrimson
#property indicator_style1  STYLE_SOLID
#property indicator_width1  1

//--- plot Long Kalman
#property indicator_label2  "Long Kalman"
#property indicator_type2   DRAW_COLOR_LINE
#property indicator_color2  clrLimeGreen,clrCrimson
#property indicator_style2  STYLE_SOLID
#property indicator_width2  2

//--- plot Candles
#property indicator_label3  "BLUEBIRD Candles"
#property indicator_type3   DRAW_COLOR_CANDLES
#property indicator_color3  clrLimeGreen,clrCrimson,clrGray
#property indicator_style3  STYLE_SOLID
#property indicator_width3  1

//--- inputs
input int    InpShortLen    = 50;            // Short Kalman Length
input int    InpLongLen     = 150;           // Long Kalman Length
input bool   InpRetestSig   = false;         // Show Retest Signals
input bool   InpCandleColor = true;          // Color Candles
input color  InpUpColor     = clrLimeGreen;  // Up Color
input color  InpDnColor     = clrCrimson;    // Down Color
input double InpKalmanR     = 0.01;          // Kalman Measurement Noise (R)
input double InpKalmanQ     = 0.10;          // Kalman Process Noise (Q)
input int    InpAtrPeriod   = 200;           // ATR Period (zones)
input double InpAtrMult     = 0.5;           // ATR Multiplier (zones)
input bool   InpDrawZones   = true;          // Draw Trend Zones (rectangles)
input bool   InpDrawLabels  = true;          // Draw Trend-Flip Labels

//--- plotted buffers
double ShortKBuf[];
double ShortKCol[];
double LongKBuf[];
double LongKCol[];
double COpen[];
double CHigh[];
double CLow[];
double CClose[];
double CColor[];

//--- internal/signal buffers
double TrendBuf[];   // +1 trend up, -1 trend down
double BuyBuf[];     // 1 on bullish flip
double SellBuf[];    // 1 on bearish flip

//--- ATR handle
int    g_atrHandle = INVALID_HANDLE;

//--- Kalman state (advances once per CLOSED bar)
double g_shortEst = 0.0;
double g_shortErr = 1.0;
double g_longEst  = 0.0;
double g_longErr  = 1.0;
bool   g_kalmanInit = false;
int    g_lastClosedIndex = -1; // last bar whose state was committed

//--- Active zone tracking
string g_lowerZoneName = "";
string g_upperZoneName = "";
string g_prefix        = "BLUEBIRD_";

//+------------------------------------------------------------------+
//| Initialization                                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    SetIndexBuffer(0,  ShortKBuf,  INDICATOR_DATA);
    SetIndexBuffer(1,  ShortKCol,  INDICATOR_COLOR_INDEX);
    SetIndexBuffer(2,  LongKBuf,   INDICATOR_DATA);
    SetIndexBuffer(3,  LongKCol,   INDICATOR_COLOR_INDEX);
    SetIndexBuffer(4,  COpen,      INDICATOR_DATA);
    SetIndexBuffer(5,  CHigh,      INDICATOR_DATA);
    SetIndexBuffer(6,  CLow,       INDICATOR_DATA);
    SetIndexBuffer(7,  CClose,     INDICATOR_DATA);
    SetIndexBuffer(8,  CColor,     INDICATOR_COLOR_INDEX);
    SetIndexBuffer(9,  TrendBuf,   INDICATOR_CALCULATIONS);
    SetIndexBuffer(10, BuyBuf,     INDICATOR_CALCULATIONS);
    SetIndexBuffer(11, SellBuf,    INDICATOR_CALCULATIONS);

    PlotIndexSetInteger(0, PLOT_LINE_COLOR, 0, InpUpColor);
    PlotIndexSetInteger(0, PLOT_LINE_COLOR, 1, InpDnColor);
    PlotIndexSetInteger(1, PLOT_LINE_COLOR, 0, InpUpColor);
    PlotIndexSetInteger(1, PLOT_LINE_COLOR, 1, InpDnColor);
    PlotIndexSetInteger(2, PLOT_LINE_COLOR, 0, InpUpColor);
    PlotIndexSetInteger(2, PLOT_LINE_COLOR, 1, InpDnColor);
    PlotIndexSetInteger(2, PLOT_LINE_COLOR, 2, clrGray);

    PlotIndexSetInteger(0, PLOT_DRAW_BEGIN, InpLongLen + 2);
    PlotIndexSetInteger(1, PLOT_DRAW_BEGIN, InpLongLen + 2);
    PlotIndexSetInteger(2, PLOT_DRAW_BEGIN, InpLongLen + 2);

    IndicatorSetString(INDICATOR_SHORTNAME, "BLUEBIRD - Kalman Trend Levels");
    IndicatorSetInteger(INDICATOR_DIGITS, _Digits);

    g_atrHandle = iATR(_Symbol, _Period, InpAtrPeriod);
    if(g_atrHandle == INVALID_HANDLE)
    {
        Print("BLUEBIRD: failed to create ATR handle");
        return INIT_FAILED;
    }

    ResetKalman();
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Deinitialization                                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    if(g_atrHandle != INVALID_HANDLE)
        IndicatorRelease(g_atrHandle);

    ObjectsDeleteAll(0, g_prefix);
    ChartRedraw();
}

//+------------------------------------------------------------------+
//| Reset Kalman state                                               |
//+------------------------------------------------------------------+
void ResetKalman()
{
    g_shortEst  = 0.0;
    g_shortErr  = 1.0;
    g_longEst   = 0.0;
    g_longErr   = 1.0;
    g_kalmanInit = false;
    g_lastClosedIndex = -1;
    g_lowerZoneName = "";
    g_upperZoneName = "";
}

//+------------------------------------------------------------------+
//| Kalman filter step                                               |
//+------------------------------------------------------------------+
double KalmanStep(const double src, double &estimate, double &errorEst, const int length)
{
    double errorMeas  = InpKalmanR * length;
    double prediction = estimate;
    double gain       = errorEst / (errorEst + errorMeas);
    estimate          = prediction + gain * (src - prediction);
    errorEst          = (1.0 - gain) * errorEst + InpKalmanQ / length;
    return estimate;
}

//+------------------------------------------------------------------+
//| Object helpers                                                   |
//+------------------------------------------------------------------+
void CreateRect(const string name, datetime t1, double p1, datetime t2, double p2, color clr)
{
    if(ObjectFind(0, name) < 0)
        ObjectCreate(0, name, OBJ_RECTANGLE, 0, t1, p1, t2, p2);
    ObjectSetInteger(0, name, OBJPROP_TIME, 0, t1);
    ObjectSetDouble (0, name, OBJPROP_PRICE, 0, p1);
    ObjectSetInteger(0, name, OBJPROP_TIME, 1, t2);
    ObjectSetDouble (0, name, OBJPROP_PRICE, 1, p2);
    ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
    ObjectSetInteger(0, name, OBJPROP_FILL, true);
    ObjectSetInteger(0, name, OBJPROP_BACK, true);
    ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
    ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
}

void ExtendRect(const string name, datetime t2)
{
    if(name == "" || ObjectFind(0, name) < 0) return;
    ObjectSetInteger(0, name, OBJPROP_TIME, 1, t2);
}

void CreateArrow(const string name, datetime t, double price, bool up, color clr)
{
    if(ObjectFind(0, name) < 0)
        ObjectCreate(0, name, up ? OBJ_ARROW_UP : OBJ_ARROW_DOWN, 0, t, price);
    ObjectSetInteger(0, name, OBJPROP_TIME, 0, t);
    ObjectSetDouble (0, name, OBJPROP_PRICE, 0, price);
    ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
    ObjectSetInteger(0, name, OBJPROP_WIDTH, 3);
    ObjectSetInteger(0, name, OBJPROP_ANCHOR, up ? ANCHOR_TOP : ANCHOR_BOTTOM);
    ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
    ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
}

void CreateText(const string name, datetime t, double price, string txt, color clr, bool up)
{
    if(ObjectFind(0, name) < 0)
        ObjectCreate(0, name, OBJ_TEXT, 0, t, price);
    ObjectSetInteger(0, name, OBJPROP_TIME, 0, t);
    ObjectSetDouble (0, name, OBJPROP_PRICE, 0, price);
    ObjectSetString (0, name, OBJPROP_TEXT, txt);
    ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
    ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
    ObjectSetInteger(0, name, OBJPROP_ANCHOR, up ? ANCHOR_LOWER : ANCHOR_UPPER);
    ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
    ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
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
    if(rates_total < InpLongLen + 5) return 0;

    //--- ATR copy
    double atrArr[];
    ArraySetAsSeries(atrArr, false);
    int atrCopied = CopyBuffer(g_atrHandle, 0, 0, rates_total, atrArr);
    if(atrCopied <= 0) return 0;

    int start;
    if(prev_calculated == 0)
    {
        ObjectsDeleteAll(0, g_prefix);
        ResetKalman();
        g_shortEst = close[0];
        g_longEst  = close[0];
        g_kalmanInit = true;
        start = 1;
    }
    else
    {
        // Resume from the last CLOSED bar so the forming bar gets recomputed each tick
        start = (g_lastClosedIndex >= 1) ? g_lastClosedIndex + 1 : prev_calculated - 1;
        if(start < 1) start = 1;
    }

    // Snapshot of committed state taken before processing the forming bar
    double snapShortEst = g_shortEst, snapShortErr = g_shortErr;
    double snapLongEst  = g_longEst,  snapLongErr  = g_longErr;

    for(int i = start; i < rates_total; i++)
    {
        bool isLastBar = (i == rates_total - 1);

        // Each iteration represents one bar. For non-last bars we commit state.
        // For the last (forming) bar we snapshot first, compute, then restore so
        // the next tick recomputes from the same committed baseline.
        if(isLastBar)
        {
            snapShortEst = g_shortEst; snapShortErr = g_shortErr;
            snapLongEst  = g_longEst;  snapLongErr  = g_longErr;
        }

        ShortKBuf[i] = KalmanStep(close[i], g_shortEst, g_shortErr, InpShortLen);
        LongKBuf[i]  = KalmanStep(close[i], g_longEst,  g_longErr,  InpLongLen);

        bool trendUp = ShortKBuf[i] > LongKBuf[i];
        TrendBuf[i]  = trendUp ? 1.0 : -1.0;

        // Line colors (0 = up color, 1 = down color)
        LongKCol[i] = trendUp ? 0 : 1;

        bool shortRising = true;
        if(i >= 2) shortRising = (ShortKBuf[i] > ShortKBuf[i-2]);
        ShortKCol[i] = shortRising ? 0 : 1;

        // Colored candles
        COpen[i]  = open[i];
        CHigh[i]  = high[i];
        CLow[i]   = low[i];
        CClose[i] = close[i];

        if(InpCandleColor)
        {
            if(trendUp && shortRising)         CColor[i] = 0;
            else if(!trendUp && !shortRising)  CColor[i] = 1;
            else                               CColor[i] = 2;
        }
        else
        {
            CColor[i] = 2;
        }

        // Trend flip detection
        BuyBuf[i]  = 0.0;
        SellBuf[i] = 0.0;

        if(i >= 1)
        {
            bool prevTrendUp = TrendBuf[i-1] > 0.0;
            double atrVal    = (i < ArraySize(atrArr) ? atrArr[i] : 0.0) * InpAtrMult;

            if(trendUp && !prevTrendUp)
            {
                BuyBuf[i] = 1.0;
                string zname = g_prefix + "LZONE_" + IntegerToString((int)time[i]);
                if(InpDrawZones)
                {
                    CreateRect(zname, time[i], low[i] + atrVal, time[i], low[i], InpUpColor);
                    g_lowerZoneName = zname;
                    g_upperZoneName = "";
                }
                if(InpDrawLabels)
                {
                    CreateArrow(g_prefix + "BUY_" + IntegerToString((int)time[i]),
                                time[i], low[i], true, InpUpColor);
                    CreateText (g_prefix + "BTXT_" + IntegerToString((int)time[i]),
                                time[i], ShortKBuf[i],
                                DoubleToString(close[i], _Digits),
                                InpUpColor, true);
                }
            }
            else if(!trendUp && prevTrendUp)
            {
                SellBuf[i] = 1.0;
                string zname = g_prefix + "UZONE_" + IntegerToString((int)time[i]);
                if(InpDrawZones)
                {
                    CreateRect(zname, time[i], high[i], time[i], high[i] - atrVal, InpDnColor);
                    g_upperZoneName = zname;
                    g_lowerZoneName = "";
                }
                if(InpDrawLabels)
                {
                    CreateArrow(g_prefix + "SELL_" + IntegerToString((int)time[i]),
                                time[i], high[i], false, InpDnColor);
                    CreateText (g_prefix + "STXT_" + IntegerToString((int)time[i]),
                                time[i], ShortKBuf[i],
                                DoubleToString(close[i], _Digits),
                                InpDnColor, false);
                }
            }
            else
            {
                // Extend the active zone to current bar
                if(InpDrawZones)
                {
                    if(trendUp && g_lowerZoneName != "") ExtendRect(g_lowerZoneName, time[i]);
                    else if(!trendUp && g_upperZoneName != "") ExtendRect(g_upperZoneName, time[i]);
                }

                // Retest signals
                if(InpRetestSig && i >= 1)
                {
                    // Bearish retest: price tagged upper zone bottom then closed below
                    if(!trendUp && g_upperZoneName != "" && ObjectFind(0, g_upperZoneName) >= 0)
                    {
                        double zoneBottom = ObjectGetDouble(0, g_upperZoneName, OBJPROP_PRICE, 1);
                        if(high[i] < zoneBottom && high[i-1] >= zoneBottom)
                            CreateText(g_prefix + "RX_" + IntegerToString((int)time[i-1]),
                                       time[i-1], high[i-1], "x", InpDnColor, false);
                    }
                    // Bullish retest: price tagged lower zone top then closed above
                    if(trendUp && g_lowerZoneName != "" && ObjectFind(0, g_lowerZoneName) >= 0)
                    {
                        double zoneTop = ObjectGetDouble(0, g_lowerZoneName, OBJPROP_PRICE, 0);
                        if(low[i] > zoneTop && low[i-1] <= zoneTop)
                            CreateText(g_prefix + "R+_" + IntegerToString((int)time[i-1]),
                                       time[i-1], low[i-1], "+", InpUpColor, true);
                    }
                }
            }
        }

        // After processing: commit closed bars, roll back the forming bar
        if(isLastBar)
        {
            // Restore so the next tick recomputes the forming bar from the same baseline
            g_shortEst = snapShortEst; g_shortErr = snapShortErr;
            g_longEst  = snapLongEst;  g_longErr  = snapLongErr;
        }
        else
        {
            g_lastClosedIndex = i;
        }
    }

    return rates_total;
}
//+------------------------------------------------------------------+
