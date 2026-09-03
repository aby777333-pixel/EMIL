//+------------------------------------------------------------------+
//|                                           GIO_VRVP_SR_Matrix.mq5 |
//|          GIO - Volume Profile Support / Resistance Matrix        |
//|   Faithful MQL5 port of "HexaTrades VRVP Visible Range S/R"      |
//|   Profile math and signal conditions preserved 1:1 from Pine.    |
//+------------------------------------------------------------------+
#property copyright   "GHL India Ventures - GIO"
#property link        "https://www.gio4x.com"
#property version     "1.00"
#property description "Visible Range / Fixed Range Volume Profile with S/R zone matrix,"
#property description "POC / VAH / VAL, LVN levels, FVG boxes, stats dashboard,"
#property description "breakout / breakdown / touch / reject signals and alerts."
#property indicator_chart_window
#property indicator_buffers 4
#property indicator_plots   4

#property indicator_label1  "Buy Breakout"
#property indicator_type1   DRAW_ARROW
#property indicator_color1  clrLimeGreen
#property indicator_width1  2

#property indicator_label2  "Sell Breakdown"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  clrOrangeRed
#property indicator_width2  2

#property indicator_label3  "Support Touch"
#property indicator_type3   DRAW_ARROW
#property indicator_color3  clrMediumSeaGreen
#property indicator_width3  1

#property indicator_label4  "Resistance Reject"
#property indicator_type4   DRAW_ARROW
#property indicator_color4  clrTomato
#property indicator_width4  1

//--- dashboard position
enum ENUM_DB_POS
  {
   DB_TOP_RIGHT    = 0,  // Top Right
   DB_TOP_LEFT     = 1,  // Top Left
   DB_BOTTOM_RIGHT = 2,  // Bottom Right
   DB_BOTTOM_LEFT  = 3   // Bottom Left
  };

//==================================================================
//  INPUTS  (mirror of the Pine Script inputs, defaults preserved)
//==================================================================
input group "Profile"
input bool     InpUseFixed      = true;        // Use Fixed Candle Count
input int      InpLookback      = 360;         // Fixed Candles
input int      InpBins          = 110;         // Profile Bins / Rows
input int      InpVisScan       = 3000;        // Max Bars To Scan (Visible Range)

input group "Zones"
input int      InpNumZones      = 16;          // Max Volume Peaks To Test
input int      InpMaxPerSide    = 5;           // Max Zones Per Side
input double   InpHvnPct        = 45.0;        // Min Zone Strength (% of POC)
input int      InpMinRows       = 10;          // Min Distance Between Zones (rows)
input double   InpWidthMult     = 0.6;         // Zone Thickness Mult
input bool     InpUseATR        = true;        // Thickness From ATR
input bool     InpAnchorTouch   = false;       // Zones Start At Last Touch
input bool     InpShowStrength  = true;        // Show Strength %
input bool     InpShowTouches   = true;        // Show Retest Count

input group "Value Area"
input bool     InpShowPOC       = false;       // Show POC Line
input bool     InpShowVAHVAL    = false;       // Show VAH / VAL Lines
input double   InpVaPct         = 70.0;        // Value Area %

input group "Dashboard"
input bool     InpShowStats     = true;        // Show Stats Dashboard
input ENUM_DB_POS InpStatsPos   = DB_TOP_RIGHT;// Dashboard Position

input group "Profile View"
input bool     InpShowProfile   = true;        // Show Volume Profile
input int      InpProfWidth     = 110;         // Profile Width (bars)
input int      InpProfOffset    = 40;          // Profile Gap From Candles (bars)

input group "Nodes"
input bool     InpShowLVN       = true;        // Show LVN Levels
input double   InpLvnPct        = 25.0;        // LVN Pct Of POC

input group "Smart Money"
input bool     InpShowFVG       = false;       // Show Fair Value Gaps
input int      InpMaxFVG        = 6;           // Max FVGs

input group "Signals"
input bool     InpUseVolConf    = true;        // Volume Confirm
input int      InpVolMaLen      = 20;          // Volume MA Length
input bool     InpUseAlerts     = true;        // Enable Alerts
input double   InpApproachPct   = 0.5;         // Approach Alert Distance %

input group "Style"
input bool     InpShowLabels    = true;        // Show Labels
input color    InpSupFill       = clrGreen;         // Support Fill (strong)
input color    InpResFill       = clrRed;           // Resistance Fill (strong)
input color    InpBuyCol        = C'0,137,123';     // Buy Volume (dark teal)
input color    InpSellUpCol     = C'106,27,154';    // Sell Volume Above Price
input color    InpSellDnCol     = C'156,39,176';    // Sell Volume Below Price
input color    InpPocCol        = clrOrange;        // POC Color
input color    InpVaCol         = C'41,98,255';     // VAH / VAL Line Color
input color    InpLvnCol        = clrGray;          // LVN Color
input color    InpFvgCol        = clrYellow;        // FVG Box
input bool     InpUpdateOnTick  = false;            // Redraw On Every Tick

//==================================================================
//  GLOBALS
//==================================================================
double   BufBuy[];
double   BufSell[];
double   BufSupT[];
double   BufResRej[];

const string PFX = "GIOVRVP_";

datetime g_lastBarTime = 0;
double   g_prevNR      = EMPTY_VALUE;   // nearest resistance snapshot (previous bar close)
double   g_prevNS      = EMPTY_VALUE;   // nearest support snapshot (previous bar close)
double   g_atr         = 0.0;

//==================================================================
//  INIT / DEINIT
//==================================================================
int OnInit()
  {
   SetIndexBuffer(0,BufBuy,INDICATOR_DATA);
   SetIndexBuffer(1,BufSell,INDICATOR_DATA);
   SetIndexBuffer(2,BufSupT,INDICATOR_DATA);
   SetIndexBuffer(3,BufResRej,INDICATOR_DATA);

   ArraySetAsSeries(BufBuy,true);
   ArraySetAsSeries(BufSell,true);
   ArraySetAsSeries(BufSupT,true);
   ArraySetAsSeries(BufResRej,true);

   PlotIndexSetInteger(0,PLOT_ARROW,233);   // up arrow
   PlotIndexSetInteger(1,PLOT_ARROW,234);   // down arrow
   PlotIndexSetInteger(2,PLOT_ARROW,159);   // dot
   PlotIndexSetInteger(3,PLOT_ARROW,159);   // dot

   PlotIndexSetDouble(0,PLOT_EMPTY_VALUE,EMPTY_VALUE);
   PlotIndexSetDouble(1,PLOT_EMPTY_VALUE,EMPTY_VALUE);
   PlotIndexSetDouble(2,PLOT_EMPTY_VALUE,EMPTY_VALUE);
   PlotIndexSetDouble(3,PLOT_EMPTY_VALUE,EMPTY_VALUE);

   IndicatorSetString(INDICATOR_SHORTNAME,"GIO VRVP S/R Matrix");
   IndicatorSetInteger(INDICATOR_DIGITS,_Digits);

   g_lastBarTime = 0;
   g_prevNR      = EMPTY_VALUE;
   g_prevNS      = EMPTY_VALUE;

   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
   ObjectsDeleteAll(0,PFX,-1,-1);
   ChartRedraw(0);
  }

//==================================================================
//  MAIN CALCULATION
//==================================================================
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
   if(rates_total<50)
      return(rates_total);

   ArraySetAsSeries(time,true);

   if(prev_calculated==0)
     {
      ArrayInitialize(BufBuy,EMPTY_VALUE);
      ArrayInitialize(BufSell,EMPTY_VALUE);
      ArrayInitialize(BufSupT,EMPTY_VALUE);
      ArrayInitialize(BufResRej,EMPTY_VALUE);
     }

   bool newBar = (time[0]!=g_lastBarTime);
   if(newBar)
     {
      g_lastBarTime = time[0];
      BufBuy[0]     = EMPTY_VALUE;
      BufSell[0]    = EMPTY_VALUE;
      BufSupT[0]    = EMPTY_VALUE;
      BufResRej[0]  = EMPTY_VALUE;
      Recalc(true);
     }
   else if(InpUpdateOnTick)
      Recalc(false);

   return(rates_total);
  }

//==================================================================
//  CHART EVENTS - visible range mode follows scroll / zoom
//==================================================================
void OnChartEvent(const int id,const long &lparam,const double &dparam,const string &sparam)
  {
   if(id==CHARTEVENT_CHART_CHANGE && !InpUseFixed)
      Recalc(false);
  }

//==================================================================
//  CORE ENGINE  (Pine logic preserved 1:1)
//==================================================================
void Recalc(const bool evalSignals)
  {
   MqlRates rates[];
   ArraySetAsSeries(rates,true);

   int bins = InpBins;
   if(bins<20)
      bins = 20;
   if(bins>200)
      bins = 200;

   int need = InpLookback+5;
   if(!InpUseFixed)
      need = InpVisScan+5;
   if(need<InpVolMaLen+5)
      need = InpVolMaLen+5;
   if(need<300)
      need = 300;

   int copied = CopyRates(_Symbol,_Period,0,need,rates);
   if(copied<30)
      return;

   g_atr = WilderATR(rates,14);

   //--- Pass 1: window [rightIdx..leftIdx] and window high/low ---
   int rightIdx = 0;
   int leftIdx  = 0;
   if(InpUseFixed)
     {
      leftIdx = InpLookback-1;
      if(leftIdx>copied-1)
         leftIdx = copied-1;
     }
   else
     {
      int firstVis = (int)ChartGetInteger(0,CHART_FIRST_VISIBLE_BAR);
      int visBars  = (int)ChartGetInteger(0,CHART_VISIBLE_BARS);
      leftIdx  = firstVis;
      rightIdx = firstVis-visBars+1;
      if(rightIdx<0)
         rightIdx = 0;
      if(leftIdx>InpVisScan)
         leftIdx = InpVisScan;
      if(leftIdx>copied-1)
         leftIdx = copied-1;
      if(rightIdx>leftIdx)
         rightIdx = leftIdx;
     }
   if(leftIdx-rightIdx<3)
      return;

   double hi = -DBL_MAX;
   double lo =  DBL_MAX;
   for(int i=rightIdx;i<=leftIdx;i++)
     {
      if(rates[i].high>hi)
         hi = rates[i].high;
      if(rates[i].low<lo)
         lo = rates[i].low;
     }
   double binSize = (hi-lo)/(double)bins;
   if(binSize<=0.0)
      return;

   //--- redraw from scratch ---
   ObjectsDeleteAll(0,PFX,-1,-1);

   //--- Pass 2: volume-by-price, split into buy (up) / sell (down) ---
   double vp[];
   double vpUp[];
   double vpDn[];
   ArrayResize(vp,bins);
   ArrayResize(vpUp,bins);
   ArrayResize(vpDn,bins);
   ArrayInitialize(vp,0.0);
   ArrayInitialize(vpUp,0.0);
   ArrayInitialize(vpDn,0.0);

   for(int i=rightIdx;i<=leftIdx;i++)
     {
      int loBin = (int)((rates[i].low -lo)/binSize);
      int hiBin = (int)((rates[i].high-lo)/binSize);
      if(loBin<0)
         loBin = 0;
      if(loBin>bins-1)
         loBin = bins-1;
      if(hiBin<0)
         hiBin = 0;
      if(hiBin>bins-1)
         hiBin = bins-1;
      double share = (double)rates[i].tick_volume/(double)(hiBin-loBin+1);
      bool up = (rates[i].close>=rates[i].open);
      for(int bb=loBin;bb<=hiBin;bb++)
        {
         vp[bb] += share;
         if(up)
            vpUp[bb] += share;
         else
            vpDn[bb] += share;
        }
     }

   double pocVol = ArrMaxVal(vp,bins);
   double halfW  = (InpUseATR ? g_atr : binSize)*InpWidthMult/2.0;
   if(halfW<=0.0)
      halfW = binSize*0.3;

   datetime t0        = rates[0].time;
   datetime tZoneLeft = rates[leftIdx].time;
   int      rightBars = InpProfOffset+InpProfWidth;
   datetime tRight    = BarTimeAhead(t0,rightBars);
   datetime tLabel    = BarTimeAhead(t0,InpProfOffset);

   // Role reference: flip support<->resistance only on a confirmed close.
   double refClose = rates[1].close;

   //--- POC + Value Area (always computed; reused by lines + dashboard) ---
   int pocIdx = ArrIndexOf(vp,bins,pocVol);
   if(pocIdx<0)
      pocIdx = 0;
   double pocPx  = lo+((double)pocIdx+0.5)*binSize;
   double totVol = 0.0;
   for(int i=0;i<bins;i++)
      totVol += vp[i];
   double vaVol = pocVol;
   int upI = pocIdx;
   int dnI = pocIdx;
   while(vaVol<totVol*InpVaPct/100.0 && (upI<bins-1 || dnI>0))
     {
      double vUp = (upI<bins-1) ? vp[upI+1] : -1.0;
      double vDn = (dnI>0)      ? vp[dnI-1] : -1.0;
      if(vUp<0.0 && vDn<0.0)
         break;
      if(vUp>=vDn)
        {
         upI++;
         vaVol += vUp;
        }
      else
        {
         dnI--;
         vaVol += vDn;
        }
     }
   double vahPx = lo+((double)upI+0.5)*binSize;
   double valPx = lo+((double)dnI+0.5)*binSize;

   //--- Volume profile (buy/sell split, radiant, faces LEFT, right of price) ---
   if(InpShowProfile && pocVol>0.0)
     {
      double pocUp = MathMax(ArrMaxVal(vpUp,bins),1.0);
      double pocDn = MathMax(ArrMaxVal(vpDn,bins),1.0);
      for(int k=0;k<bins;k++)
        {
         double up   = vpUp[k];
         double dn   = vpDn[k];
         double vTot = up+dn;
         if(vTot<=0.0)
            continue;
         double mid = lo+((double)k+0.5)*binSize;
         double top = mid+binSize/2.0;
         double bot = mid-binSize/2.0;
         int upLen = (int)(up/pocVol*(double)InpProfWidth);
         int dnLen = (int)(dn/pocVol*(double)InpProfWidth);
         if(upLen+dnLen<1)
           {
            if(up>=dn)
              {
               upLen = 1;
               dnLen = 0;
              }
            else
              {
               upLen = 0;
               dnLen = 1;
              }
           }
         // Buy (teal) hugs the axis; color radiant by buy intensity.
         if(upLen>0)
           {
            color buyG = Blend(FadeToBg(InpBuyCol,0.10),InpBuyCol,up/pocUp);
            RectFill(PFX+"PB_"+IntegerToString(k),
                     BarTimeAhead(t0,rightBars-upLen),top,
                     BarTimeAhead(t0,rightBars),bot,buyG);
           }
         // Sell (purple) stacks to the left; brighter above price.
         if(dnLen>0)
           {
            color sellBase = (mid>rates[0].close) ? InpSellUpCol : InpSellDnCol;
            color sellG    = Blend(FadeToBg(sellBase,0.10),sellBase,dn/pocDn);
            RectFill(PFX+"PS_"+IntegerToString(k),
                     BarTimeAhead(t0,rightBars-upLen-dnLen),top,
                     BarTimeAhead(t0,rightBars-upLen),bot,sellG);
           }
        }
     }

   //--- POC line ---
   if(InpShowPOC && pocVol>0.0)
     {
      TrendLine(PFX+"POC",tZoneLeft,pocPx,tRight,InpPocCol,STYLE_SOLID,2);
      if(InpShowLabels)
         TextAt(PFX+"POC_L",tLabel,pocPx,"POC",InpPocCol,8);
     }

   //--- VAH / VAL lines ---
   if(InpShowVAHVAL && pocVol>0.0)
     {
      TrendLine(PFX+"VAH",tZoneLeft,vahPx,tRight,InpVaCol,STYLE_DASH,1);
      TrendLine(PFX+"VAL",tZoneLeft,valPx,tRight,InpVaCol,STYLE_DASH,1);
      if(InpShowLabels)
        {
         TextAt(PFX+"VAH_L",tLabel,vahPx,"VAH",InpVaCol,8);
         TextAt(PFX+"VAL_L",tLabel,valPx,"VAL",InpVaCol,8);
        }
     }

   //--- S/R zones (strength + retests + spacing + per-side cap) ---
   double nr = EMPTY_VALUE;
   double ns = EMPTY_VALUE;
   int resCount = 0;
   int supCount = 0;
   double zonePrices[];
   ArrayResize(zonePrices,0);
   int keptZones = 0;

   if(pocVol>0.0)
     {
      double vpCopy[];
      ArrayCopy(vpCopy,vp);
      double hvnT = pocVol*InpHvnPct/100.0;
      int scanned = 0;
      while(scanned<InpNumZones)
        {
         if(resCount>=InpMaxPerSide && supCount>=InpMaxPerSide)
            break;
         int bi = -1;
         double m = ArrMaxValIdx(vpCopy,bins,bi);
         if(m<hvnT)
            break;
         double price   = lo+((double)bi+0.5)*binSize;
         int    strength= (int)(m/pocVol*100.0);
         // Min gap measured in profile rows; floored at the zone thickness
         // so neighbouring boxes never overlap.
         double gapDist = MathMax((double)InpMinRows*binSize,halfW*2.0);
         int sepBins = (int)(gapDist/binSize);
         if(sepBins<1)
            sepBins = 1;
         int s0 = bi-sepBins;
         if(s0<0)
            s0 = 0;
         int s1 = bi+sepBins;
         if(s1>bins-1)
            s1 = bins-1;
         for(int s=s0;s<=s1;s++)
            vpCopy[s] = -1.0;
         // hard minimum distance vs already-kept zones
         bool tooClose = false;
         int zn = ArraySize(zonePrices);
         for(int zi=0;zi<zn;zi++)
           {
            if(MathAbs(zonePrices[zi]-price)<gapDist)
              {
               tooClose = true;
               break;
              }
           }
         bool isSup    = (price<refClose);
         bool sideFull = isSup ? (supCount>=InpMaxPerSide) : (resCount>=InpMaxPerSide);
         if(!tooClose && !sideFull)
           {
            ArrayResize(zonePrices,zn+1);
            zonePrices[zn] = price;
            int touches = ZoneRetests(rates,price,halfW,leftIdx,rightIdx);
            color hue        = isSup ? clrGreen : clrRed;
            color strongFill = isSup ? FadeToBg(InpSupFill,0.45) : FadeToBg(InpResFill,0.45);
            color fillC      = Blend(FadeToBg(hue,0.10),strongFill,(double)strength/100.0);
            color bordC      = hue;
            datetime tL = tZoneLeft;
            if(InpAnchorTouch)
              {
               int lt = LastTouch(rates,price,halfW,leftIdx);
               tL = rates[lt].time;
              }
            string base = PFX+"Z"+IntegerToString(keptZones);
            RectFill(base+"_F",tL,price+halfW,tRight,price-halfW,fillC);
            RectBorder(base+"_B",tL,price+halfW,tRight,price-halfW,bordC);
            if(InpShowLabels)
              {
               string txt = (isSup ? "Support" : "Resistance");
               if(InpShowStrength)
                  txt += " "+IntegerToString(strength)+"%";
               if(InpShowTouches && touches>1)
                  txt += "  x"+IntegerToString(touches);
               TextAt(base+"_L",tLabel,price,txt,bordC,8);
              }
            if(isSup)
              {
               if(ns==EMPTY_VALUE)
                  ns = price;
               else
                  ns = MathMax(ns,price);
               supCount++;
              }
            else
              {
               if(nr==EMPTY_VALUE)
                  nr = price;
               else
                  nr = MathMin(nr,price);
               resCount++;
              }
            keptZones++;
           }
         scanned++;
        }
     }

   //--- LVN imbalance levels (nearest local minima) ---
   if(InpShowLVN && pocVol>0.0)
     {
      double lvnT   = pocVol*InpLvnPct/100.0;
      double floorT = pocVol*0.03;
      int curIdx = (int)((rates[0].close-lo)/binSize);
      if(curIdx<0)
         curIdx = 0;
      if(curIdx>bins-1)
         curIdx = bins-1;
      int maxLvn = InpNumZones;
      if(maxLvn>5)
         maxLvn = 5;
      int foundLvn = 0;
      for(int d=1;d<=bins-1;d++)
        {
         if(foundLvn>=maxLvn)
            break;
         int li = curIdx-d;
         int ri = curIdx+d;
         if(li>=0 && IsLvnBin(vp,li,bins,lvnT,floorT))
           {
            double pl = lo+((double)li+0.5)*binSize;
            TrendLine(PFX+"LVN"+IntegerToString(foundLvn),tZoneLeft,pl,tRight,InpLvnCol,STYLE_DASH,1);
            if(InpShowLabels)
               TextAt(PFX+"LVN"+IntegerToString(foundLvn)+"_L",tLabel,pl,"LVN",clrGray,7);
            foundLvn++;
           }
         if(foundLvn<maxLvn && ri<=bins-1 && IsLvnBin(vp,ri,bins,lvnT,floorT))
           {
            double pr = lo+((double)ri+0.5)*binSize;
            TrendLine(PFX+"LVN"+IntegerToString(foundLvn),tZoneLeft,pr,tRight,InpLvnCol,STYLE_DASH,1);
            if(InpShowLabels)
               TextAt(PFX+"LVN"+IntegerToString(foundLvn)+"_L",tLabel,pr,"LVN",clrGray,7);
            foundLvn++;
           }
        }
     }

   //--- Fair Value Gaps (small yellow boxes, unfilled only) ---
   if(InpShowFVG && leftIdx>3)
     {
      double minLowNewer  = rates[0].low;
      double maxHighNewer = rates[0].high;
      int foundFVG = 0;
      for(int j=1;j<=leftIdx-2;j++)
        {
         if(foundFVG>=InpMaxFVG)
            break;
         bool isBull = (rates[j+2].high<rates[j].low);
         bool isBear = (rates[j+2].low >rates[j].high);
         if(isBull || isBear)
           {
            double gTop = isBull ? rates[j].low   : rates[j+2].low;
            double gBot = isBull ? rates[j+2].high: rates[j].high;
            bool isOpen = isBull ? (minLowNewer>gBot) : (maxHighNewer<gTop);
            if(isOpen)
              {
               string fn = PFX+"FVG"+IntegerToString(foundFVG);
               RectFill(fn+"_F",rates[j].time,gTop,t0,gBot,FadeToBg(InpFvgCol,0.20));
               RectBorder(fn+"_B",rates[j].time,gTop,t0,gBot,FadeToBg(clrYellow,0.70));
               datetime tm = (datetime)(((long)rates[j].time+(long)t0)/2);
               TextAt(fn+"_L",tm,(gTop+gBot)/2.0,"FVG",clrOrange,7);
               foundFVG++;
              }
           }
         if(rates[j].low<minLowNewer)
            minLowNewer = rates[j].low;
         if(rates[j].high>maxHighNewer)
            maxHighNewer = rates[j].high;
        }
     }

   //--- Stats dashboard ---
   if(InpShowStats && pocVol>0.0)
      DrawDashboard(pocPx,vahPx,valPx,nr,ns,rates[0].close,resCount,supCount);

   //--- Signals (evaluated on confirmed bar close, Pine crossover semantics) ---
   if(evalSignals && copied>InpVolMaLen+3)
     {
      double c1 = rates[1].close;
      double c2 = rates[2].close;
      bool volOk = true;
      if(InpUseVolConf)
        {
         double vma = 0.0;
         for(int i=1;i<=InpVolMaLen;i++)
            vma += (double)rates[i].tick_volume;
         vma /= (double)InpVolMaLen;
         volOk = ((double)rates[1].tick_volume>vma);
        }
      double nrRef = (g_prevNR!=EMPTY_VALUE) ? g_prevNR : nr;
      double nsRef = (g_prevNS!=EMPTY_VALUE) ? g_prevNS : ns;

      bool buySig   = (nr!=EMPTY_VALUE && volOk && c1>nr && c2<=nrRef);
      bool sellSig  = (ns!=EMPTY_VALUE && volOk && c1<ns && c2>=nsRef);
      bool supTouch = (ns!=EMPTY_VALUE && rates[1].low<=ns  && c1>ns);
      bool resRej   = (nr!=EMPTY_VALUE && rates[1].high>=nr && c1<nr);
      bool apprRes  = (nr!=EMPTY_VALUE && c1<nr && (nr-c1)<=nr*InpApproachPct/100.0);
      bool apprSup  = (ns!=EMPTY_VALUE && c1>ns && (c1-ns)<=ns*InpApproachPct/100.0);

      double off = (g_atr>0.0) ? g_atr*0.30 : binSize*2.0;
      if(ArraySize(BufBuy)>2)
        {
         if(buySig)
            BufBuy[1] = rates[1].low-off;
         if(sellSig)
            BufSell[1] = rates[1].high+off;
         if(supTouch)
            BufSupT[1] = rates[1].low-off*0.5;
         if(resRej)
            BufResRej[1] = rates[1].high+off*0.5;
        }

      if(InpUseAlerts)
        {
         string tag = _Symbol+" "+TfString()+": ";
         if(buySig)
            Alert(tag+"VRVP bullish breakout above resistance");
         if(sellSig)
            Alert(tag+"VRVP bearish breakdown below support");
         if(apprRes)
            Alert(tag+"Price approaching VRVP resistance");
         if(apprSup)
            Alert(tag+"Price approaching VRVP support");
        }

      g_prevNR = nr;
      g_prevNS = ns;
     }

   ChartRedraw(0);
  }

//==================================================================
//  DASHBOARD
//==================================================================
void DrawDashboard(const double pocPx,const double vahPx,const double valPx,
                   const double nr,const double ns,const double lastClose,
                   const int resCount,const int supCount)
  {
   bool isRight  = (InpStatsPos==DB_TOP_RIGHT || InpStatsPos==DB_BOTTOM_RIGHT);
   bool isBottom = (InpStatsPos==DB_BOTTOM_RIGHT || InpStatsPos==DB_BOTTOM_LEFT);
   ENUM_BASE_CORNER corner = CORNER_RIGHT_UPPER;
   if(InpStatsPos==DB_TOP_LEFT)
      corner = CORNER_LEFT_UPPER;
   if(InpStatsPos==DB_BOTTOM_RIGHT)
      corner = CORNER_RIGHT_LOWER;
   if(InpStatsPos==DB_BOTTOM_LEFT)
      corner = CORNER_LEFT_LOWER;

   string bg = PFX+"DB_BG";
   ObjectCreate(0,bg,OBJ_RECTANGLE_LABEL,0,0,0);
   ObjectSetInteger(0,bg,OBJPROP_CORNER,corner);
   ObjectSetInteger(0,bg,OBJPROP_XDISTANCE,isRight ? 222 : 8);
   ObjectSetInteger(0,bg,OBJPROP_YDISTANCE,isBottom ? 176 : 8);
   ObjectSetInteger(0,bg,OBJPROP_XSIZE,214);
   ObjectSetInteger(0,bg,OBJPROP_YSIZE,168);
   ObjectSetInteger(0,bg,OBJPROP_BGCOLOR,C'24,28,39');
   ObjectSetInteger(0,bg,OBJPROP_COLOR,C'70,80,105');
   ObjectSetInteger(0,bg,OBJPROP_BORDER_TYPE,BORDER_FLAT);
   ObjectSetInteger(0,bg,OBJPROP_BACK,false);
   ObjectSetInteger(0,bg,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,bg,OBJPROP_HIDDEN,true);

   string biasTxt = "Balanced";
   color  biasCol = clrSilver;
   if(lastClose>vahPx)
     {
      biasTxt = "Bullish";
      biasCol = clrLime;
     }
   else if(lastClose<valPx)
     {
      biasTxt = "Bearish";
      biasCol = C'255,82,82';
     }

   DBRow(0,"GIO VRVP MATRIX","",clrGoldenrod,clrGoldenrod,corner,isRight,isBottom);
   DBRow(1,"POC",DoubleToString(pocPx,_Digits),clrWhiteSmoke,clrOrange,corner,isRight,isBottom);
   DBRow(2,"VAH",DoubleToString(vahPx,_Digits),clrWhiteSmoke,clrWhiteSmoke,corner,isRight,isBottom);
   DBRow(3,"VAL",DoubleToString(valPx,_Digits),clrWhiteSmoke,clrWhiteSmoke,corner,isRight,isBottom);
   DBRow(4,"Nearest Res",(nr==EMPTY_VALUE) ? "-" : DoubleToString(nr,_Digits),clrWhiteSmoke,C'255,82,82',corner,isRight,isBottom);
   DBRow(5,"Nearest Sup",(ns==EMPTY_VALUE) ? "-" : DoubleToString(ns,_Digits),clrWhiteSmoke,C'38,166,154',corner,isRight,isBottom);
   DBRow(6,"Trend Bias",biasTxt,clrWhiteSmoke,biasCol,corner,isRight,isBottom);
   DBRow(7,"Zones R / S",IntegerToString(resCount)+" / "+IntegerToString(supCount),clrWhiteSmoke,clrWhiteSmoke,corner,isRight,isBottom);
  }

void DBRow(const int row,const string nameTxt,const string valTxt,
           const color nameCol,const color valCol,
           const ENUM_BASE_CORNER corner,const bool isRight,const bool isBottom)
  {
   int slot = isBottom ? (7-row) : row;
   int y    = 16+slot*19;
   DBText(PFX+"DBN"+IntegerToString(row),nameTxt,nameCol,y,false,corner,isRight,isBottom,
          (row==0) ? 10 : 9,(row==0) ? "Segoe UI Semibold" : "Segoe UI");
   if(valTxt!="")
      DBText(PFX+"DBV"+IntegerToString(row),valTxt,valCol,y,true,corner,isRight,isBottom,9,"Consolas");
  }

void DBText(const string name,const string txt,const color col,const int y,const bool valueCol,
            const ENUM_BASE_CORNER corner,const bool isRight,const bool isBottom,
            const int fs,const string font)
  {
   int x = 18;
   ENUM_ANCHOR_POINT anch = ANCHOR_LEFT_UPPER;
   if(!isRight)
     {
      if(!valueCol)
        {
         x    = 18;
         anch = isBottom ? ANCHOR_LEFT_LOWER : ANCHOR_LEFT_UPPER;
        }
      else
        {
         x    = 208;
         anch = isBottom ? ANCHOR_RIGHT_LOWER : ANCHOR_RIGHT_UPPER;
        }
     }
   else
     {
      if(!valueCol)
        {
         x    = 208;
         anch = isBottom ? ANCHOR_LEFT_LOWER : ANCHOR_LEFT_UPPER;
        }
      else
        {
         x    = 22;
         anch = isBottom ? ANCHOR_RIGHT_LOWER : ANCHOR_RIGHT_UPPER;
        }
     }
   ObjectCreate(0,name,OBJ_LABEL,0,0,0);
   ObjectSetInteger(0,name,OBJPROP_CORNER,corner);
   ObjectSetInteger(0,name,OBJPROP_ANCHOR,anch);
   ObjectSetInteger(0,name,OBJPROP_XDISTANCE,x);
   ObjectSetInteger(0,name,OBJPROP_YDISTANCE,y);
   ObjectSetString(0,name,OBJPROP_TEXT,txt);
   ObjectSetInteger(0,name,OBJPROP_COLOR,col);
   ObjectSetString(0,name,OBJPROP_FONT,font);
   ObjectSetInteger(0,name,OBJPROP_FONTSIZE,fs);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,name,OBJPROP_HIDDEN,true);
  }

//==================================================================
//  HELPERS - profile math (ports of the Pine helper functions)
//==================================================================
// Local-minimum (thin-volume) test, bounds-guarded.
bool IsLvnBin(const double &arr[],const int idx,const int n,const double lvnT,const double floorT)
  {
   if(idx<=0 || idx>=n-1)
      return false;
   double v  = arr[idx];
   double vl = arr[idx-1];
   double vr = arr[idx+1];
   return (v<lvnT && v>floorT && v<=vl && v<=vr);
  }

// Most recent bar offset whose range touched the band (newest hit, stops early).
int LastTouch(const MqlRates &r[],const double price,const double band,const int maxJ)
  {
   for(int j=0;j<=maxJ;j++)
     {
      if(r[j].high>=price-band && r[j].low<=price+band)
         return j;
     }
   return maxJ;
  }

// Count distinct retests: each time price re-enters the band from outside.
int ZoneRetests(const MqlRates &r[],const double price,const double band,
                const int oldest,const int newest)
  {
   int c = 0;
   bool wasInside = false;
   for(int j=oldest;j>=newest;j--)   // walks forward in time
     {
      bool nowInside = (r[j].high>=price-band && r[j].low<=price+band);
      if(nowInside && !wasInside)
         c++;
      wasInside = nowInside;
     }
   return c;
  }

double TrueRange(const MqlRates &r[],const int i)
  {
   double pc = r[i+1].close;
   double a  = r[i].high-r[i].low;
   double b  = MathAbs(r[i].high-pc);
   double c  = MathAbs(r[i].low-pc);
   return MathMax(a,MathMax(b,c));
  }

// Wilder ATR (ta.atr equivalent): SMA seed then recursive smoothing.
double WilderATR(const MqlRates &r[],const int period)
  {
   int n = ArraySize(r);
   if(n<period+2)
      return 0.0;
   int oldest = n-2;
   double atr = 0.0;
   int cnt = 0;
   int i = oldest;
   for(;i>oldest-period && i>=1;i--)
     {
      atr += TrueRange(r,i);
      cnt++;
     }
   if(cnt<1)
      return 0.0;
   atr /= (double)cnt;
   for(;i>=0;i--)
      atr = (atr*(double)(period-1)+TrueRange(r,i))/(double)period;
   return atr;
  }

double ArrMaxVal(const double &a[],const int n)
  {
   double m = -DBL_MAX;
   for(int i=0;i<n;i++)
     {
      if(a[i]>m)
         m = a[i];
     }
   return m;
  }

double ArrMaxValIdx(const double &a[],const int n,int &idx)
  {
   double m = -DBL_MAX;
   idx = -1;
   for(int i=0;i<n;i++)
     {
      if(a[i]>m)
        {
         m   = a[i];
         idx = i;
        }
     }
   return m;
  }

int ArrIndexOf(const double &a[],const int n,const double v)
  {
   for(int i=0;i<n;i++)
     {
      if(a[i]==v)
         return i;
     }
   return -1;
  }

//==================================================================
//  HELPERS - drawing
//==================================================================
datetime BarTimeAhead(const datetime t0,const int barsAhead)
  {
   if(barsAhead<=0)
      return t0;
   return (datetime)((long)t0+(long)PeriodSeconds(_Period)*(long)barsAhead);
  }

// Simulates Pine transparency by blending two colors.
color Blend(const color cFrom,const color cTo,double t)
  {
   if(t<0.0)
      t = 0.0;
   if(t>1.0)
      t = 1.0;
   uint f = (uint)cFrom;
   uint s = (uint)cTo;
   int r1 = (int)(f&0xFF);
   int g1 = (int)((f>>8)&0xFF);
   int b1 = (int)((f>>16)&0xFF);
   int r2 = (int)(s&0xFF);
   int g2 = (int)((s>>8)&0xFF);
   int b2 = (int)((s>>16)&0xFF);
   int r = r1+(int)MathRound((double)(r2-r1)*t);
   int g = g1+(int)MathRound((double)(g2-g1)*t);
   int b = b1+(int)MathRound((double)(b2-b1)*t);
   return (color)((uint)((b<<16)|(g<<8)|r));
  }

// weight = opacity fraction of c over the chart background (Pine transp 90 -> 0.10).
color FadeToBg(const color c,const double weight)
  {
   color bg = (color)ChartGetInteger(0,CHART_COLOR_BACKGROUND);
   return Blend(bg,c,weight);
  }

void RectFill(const string name,const datetime t1,const double p1,
              const datetime t2,const double p2,const color col)
  {
   ObjectCreate(0,name,OBJ_RECTANGLE,0,t1,p1,t2,p2);
   ObjectSetInteger(0,name,OBJPROP_COLOR,col);
   ObjectSetInteger(0,name,OBJPROP_FILL,true);
   ObjectSetInteger(0,name,OBJPROP_BACK,true);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,name,OBJPROP_HIDDEN,true);
  }

void RectBorder(const string name,const datetime t1,const double p1,
                const datetime t2,const double p2,const color col)
  {
   ObjectCreate(0,name,OBJ_RECTANGLE,0,t1,p1,t2,p2);
   ObjectSetInteger(0,name,OBJPROP_COLOR,col);
   ObjectSetInteger(0,name,OBJPROP_FILL,false);
   ObjectSetInteger(0,name,OBJPROP_WIDTH,1);
   ObjectSetInteger(0,name,OBJPROP_BACK,true);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,name,OBJPROP_HIDDEN,true);
  }

void TrendLine(const string name,const datetime t1,const double p,const datetime t2,
               const color col,const ENUM_LINE_STYLE style,const int width)
  {
   ObjectCreate(0,name,OBJ_TREND,0,t1,p,t2,p);
   ObjectSetInteger(0,name,OBJPROP_COLOR,col);
   ObjectSetInteger(0,name,OBJPROP_STYLE,style);
   ObjectSetInteger(0,name,OBJPROP_WIDTH,width);
   ObjectSetInteger(0,name,OBJPROP_RAY_RIGHT,false);
   ObjectSetInteger(0,name,OBJPROP_BACK,true);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,name,OBJPROP_HIDDEN,true);
  }

void TextAt(const string name,const datetime t,const double p,const string txt,
            const color col,const int fs)
  {
   ObjectCreate(0,name,OBJ_TEXT,0,t,p);
   ObjectSetString(0,name,OBJPROP_TEXT,txt);
   ObjectSetInteger(0,name,OBJPROP_COLOR,col);
   ObjectSetString(0,name,OBJPROP_FONT,"Segoe UI");
   ObjectSetInteger(0,name,OBJPROP_FONTSIZE,fs);
   ObjectSetInteger(0,name,OBJPROP_ANCHOR,ANCHOR_LEFT);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,name,OBJPROP_HIDDEN,true);
  }

string TfString()
  {
   string s = EnumToString(_Period);
   if(StringLen(s)>7)
      return StringSubstr(s,7);
   return s;
  }
//+------------------------------------------------------------------+
