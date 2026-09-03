//+------------------------------------------------------------------+
//|                                       GoldTradingIndicator.mq5    |
//|                    GIO GOLD SYSTEM  -  Signal Scanner & Dashboard |
//|                                                                  |
//|  Visual companion for the Gold Trading EA.                       |
//|  - Non-repainting Buy/Sell arrows (confirmed on CLOSED bars)     |
//|  - Trend EMAs, dynamic Support / Resistance lines                |
//|  - Live dashboard: trend, bias, spread, session, meters          |
//|  - Signal-strength / Volatility / AI-confidence meters (0-100)   |
//|  - Market-state classifier + trade-quality rating               |
//|                                                                  |
//|  NOTE: This is a decision-support tool. It does NOT guarantee    |
//|  profit. Always test on a demo account first.                   |
//+------------------------------------------------------------------+
#property copyright "GHL India Ventures / GIO4X"
#property version   "1.00"
#property description "GIO GOLD SYSTEM - Signal Scanner, S/R zones, meters & dashboard (non-repainting)"
#property indicator_chart_window
#property indicator_buffers 4
#property indicator_plots   4

//--- Plot 1 : Buy arrow
#property indicator_label1  "Buy Signal"
#property indicator_type1   DRAW_ARROW
#property indicator_color1  C'46,196,132'
#property indicator_width1  2
//--- Plot 2 : Sell arrow
#property indicator_label2  "Sell Signal"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  C'232,90,100'
#property indicator_width2  2
//--- Plot 3 : Fast EMA (trend)
#property indicator_label3  "EMA Fast"
#property indicator_type3   DRAW_LINE
#property indicator_color3  C'64,196,222'
#property indicator_width3  1
//--- Plot 4 : Slow EMA (trend)
#property indicator_label4  "EMA Slow"
#property indicator_type4   DRAW_LINE
#property indicator_color4  C'214,178,84'
#property indicator_width4  1

//==================== COLOR PALETTE (subtle, modern) ================
#define CLR_PANEL_BG   C'19,21,29'
#define CLR_PANEL_BG2  C'26,29,39'
#define CLR_HEADER     C'33,37,50'
#define CLR_BORDER     C'46,52,68'
#define CLR_GOLD       C'214,178,84'
#define CLR_TEXT       C'226,232,240'
#define CLR_MUTED      C'140,150,166'
#define CLR_GREEN      C'46,196,132'
#define CLR_RED        C'232,90,100'
#define CLR_CYAN       C'64,196,222'
#define CLR_AMBER      C'240,176,80'
#define CLR_PURPLE     C'150,130,220'

//==================== INPUTS ========================================
input group "=== Trend / Signal ==="
input int    EmaFastPeriod   = 12;      // Fast EMA period
input int    EmaSlowPeriod   = 34;      // Slow EMA period
input int    RsiPeriod       = 14;      // RSI period
input int    AtrPeriod       = 14;      // ATR period
input int    SrLookback      = 60;      // Support/Resistance lookback (bars)
input bool   ShowArrows      = true;    // Show Buy/Sell arrows
input bool   ShowEmaLines    = true;    // Show trend EMA lines
input bool   ShowSR          = true;    // Show Support/Resistance lines

input group "=== Sessions (server time) ==="
input int    SessionStartHour= 7;       // Trading session start hour
input int    SessionEndHour  = 21;      // Trading session end hour

input group "=== Dashboard ==="
input bool   ShowDashboard   = true;    // Show on-chart dashboard
input int    PanelX          = 16;      // Panel X (px from left)
input int    PanelY          = 30;      // Panel Y (px from top)

input group "=== Alerts ==="
input bool   AlertPopup      = false;   // Pop-up alert on signal
input bool   AlertPush       = false;   // Push notification on signal
input bool   AlertEmail      = false;   // Email on signal
input bool   AlertSound      = false;   // Sound on signal
input string AlertSoundFile  = "alert.wav";

//==================== BUFFERS =======================================
double BuyBuf[];
double SellBuf[];
double EmaFastBuf[];
double EmaSlowBuf[];

//==================== HANDLES / STATE ===============================
int      hEmaFast = INVALID_HANDLE;
int      hEmaSlow = INVALID_HANDLE;
int      hRsi     = INVALID_HANDLE;
int      hAtr     = INVALID_HANDLE;
datetime g_lastAlertBar = 0;
string   PFX = "GGS_";     // object prefix

//+------------------------------------------------------------------+
//| Small object helpers                                             |
//+------------------------------------------------------------------+
void RLabel(string name,int x,int y,int w,int h,color bg,color border)
{
   if(ObjectFind(0,name)<0)
      ObjectCreate(0,name,OBJ_RECTANGLE_LABEL,0,0,0);
   ObjectSetInteger(0,name,OBJPROP_XDISTANCE,x);
   ObjectSetInteger(0,name,OBJPROP_YDISTANCE,y);
   ObjectSetInteger(0,name,OBJPROP_XSIZE,w);
   ObjectSetInteger(0,name,OBJPROP_YSIZE,h);
   ObjectSetInteger(0,name,OBJPROP_BGCOLOR,bg);
   ObjectSetInteger(0,name,OBJPROP_BORDER_TYPE,BORDER_FLAT);
   ObjectSetInteger(0,name,OBJPROP_COLOR,border);
   ObjectSetInteger(0,name,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,name,OBJPROP_BACK,false);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,name,OBJPROP_HIDDEN,true);
}

void TLabel(string name,int x,int y,string txt,color clr,int size,string font,ENUM_ANCHOR_POINT anchor)
{
   if(ObjectFind(0,name)<0)
      ObjectCreate(0,name,OBJ_LABEL,0,0,0);
   ObjectSetInteger(0,name,OBJPROP_XDISTANCE,x);
   ObjectSetInteger(0,name,OBJPROP_YDISTANCE,y);
   ObjectSetString (0,name,OBJPROP_TEXT,txt);
   ObjectSetInteger(0,name,OBJPROP_COLOR,clr);
   ObjectSetInteger(0,name,OBJPROP_FONTSIZE,size);
   ObjectSetString (0,name,OBJPROP_FONT,font);
   ObjectSetInteger(0,name,OBJPROP_ANCHOR,anchor);
   ObjectSetInteger(0,name,OBJPROP_CORNER,CORNER_LEFT_UPPER);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,name,OBJPROP_HIDDEN,true);
}

//--- horizontal meter bar (background + proportional fill)
void Meter(string name,int x,int y,int w,int h,double pct,color fill)
{
   double v = pct; if(v<0) v=0; if(v>100) v=100;
   RLabel(name+"_bg",x,y,w,h,CLR_PANEL_BG2,CLR_BORDER);
   int fw=(int)MathRound((double)w*v/100.0);
   if(fw<1 && v>0) fw=1;
   if(fw>w) fw=w;
   RLabel(name+"_fg",x,y,fw,h,fill,fill);
}

//+------------------------------------------------------------------+
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
{
   SetIndexBuffer(0,BuyBuf,INDICATOR_DATA);
   SetIndexBuffer(1,SellBuf,INDICATOR_DATA);
   SetIndexBuffer(2,EmaFastBuf,INDICATOR_DATA);
   SetIndexBuffer(3,EmaSlowBuf,INDICATOR_DATA);

   PlotIndexSetInteger(0,PLOT_ARROW,233);   // up arrow
   PlotIndexSetInteger(1,PLOT_ARROW,234);   // down arrow
   for(int p=0;p<4;p++)
      PlotIndexSetDouble(p,PLOT_EMPTY_VALUE,EMPTY_VALUE);

   if(!ShowArrows){ PlotIndexSetInteger(0,PLOT_DRAW_TYPE,DRAW_NONE); PlotIndexSetInteger(1,PLOT_DRAW_TYPE,DRAW_NONE); }
   if(!ShowEmaLines){ PlotIndexSetInteger(2,PLOT_DRAW_TYPE,DRAW_NONE); PlotIndexSetInteger(3,PLOT_DRAW_TYPE,DRAW_NONE); }

   hEmaFast = iMA(_Symbol,_Period,EmaFastPeriod,0,MODE_EMA,PRICE_CLOSE);
   hEmaSlow = iMA(_Symbol,_Period,EmaSlowPeriod,0,MODE_EMA,PRICE_CLOSE);
   hRsi     = iRSI(_Symbol,_Period,RsiPeriod,PRICE_CLOSE);
   hAtr     = iATR(_Symbol,_Period,AtrPeriod);

   if(hEmaFast==INVALID_HANDLE || hEmaSlow==INVALID_HANDLE ||
      hRsi==INVALID_HANDLE || hAtr==INVALID_HANDLE)
   {
      Print("GIO GOLD Indicator: failed to create indicator handles.");
      return(INIT_FAILED);
   }

   IndicatorSetString(INDICATOR_SHORTNAME,"GIO GOLD Scanner");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| OnDeinit                                                         |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   ObjectsDeleteAll(0,PFX);
   if(hEmaFast!=INVALID_HANDLE) IndicatorRelease(hEmaFast);
   if(hEmaSlow!=INVALID_HANDLE) IndicatorRelease(hEmaSlow);
   if(hRsi!=INVALID_HANDLE)     IndicatorRelease(hRsi);
   if(hAtr!=INVALID_HANDLE)     IndicatorRelease(hAtr);
   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//| Session check                                                    |
//+------------------------------------------------------------------+
bool InSession()
{
   MqlDateTime dt; TimeToStruct(TimeCurrent(),dt);
   int h=dt.hour;
   if(SessionStartHour<=SessionEndHour)
      return(h>=SessionStartHour && h<SessionEndHour);
   return(h>=SessionStartHour || h<SessionEndHour); // overnight session
}

//+------------------------------------------------------------------+
//| Composite 0-100 score for current bias                           |
//+------------------------------------------------------------------+
double CompositeScore(const double &ef[],const double &es[],const double &rsi[],
                      const double &atr[],bool &isBull)
{
   isBull = ef[1] >= es[1];
   double score=0;

   // Trend distance (EMA fast vs slow, normalised by ATR)
   double gap = MathAbs(ef[1]-es[1]);
   double norm = (atr[1]>0)? gap/atr[1] : 0;
   score += MathMin(35.0, norm*35.0);

   // Slope strength of fast EMA
   double slope = MathAbs(ef[1]-ef[4]);
   double snorm = (atr[1]>0)? slope/atr[1] : 0;
   score += MathMin(25.0, snorm*25.0);

   // RSI conviction (distance from 50 in the bias direction)
   double rconv = isBull ? (rsi[1]-50.0) : (50.0-rsi[1]);
   score += MathMax(0.0,MathMin(25.0, rconv*1.2));

   // Alignment bonus (fast slope agrees with bias)
   bool slopeUp = ef[1]>ef[2];
   if((isBull && slopeUp) || (!isBull && !slopeUp)) score += 15.0;

   if(score<0) score=0; if(score>100) score=100;
   return score;
}

//+------------------------------------------------------------------+
//| Volatility meter 0-100 (ATR vs its own recent average)           |
//+------------------------------------------------------------------+
double VolatilityPct(const double &atr[],int n)
{
   double sum=0; int c=0;
   for(int i=1;i<=n && i<ArraySize(atr);i++){ sum+=atr[i]; c++; }
   if(c==0) return 0;
   double avg=sum/c;
   if(avg<=0) return 0;
   double r=atr[1]/avg;            // 1.0 = average
   double pct=(r-0.5)*100.0;       // 0.5x -> 0 , 1.5x -> 100
   if(pct<0) pct=0; if(pct>100) pct=100;
   return pct;
}

//+------------------------------------------------------------------+
//| Market-state classifier                                          |
//+------------------------------------------------------------------+
string ClassifyMarket(const double &ef[],const double &es[],const double &rsi[],
                      const double &atr[],double volPct,color &outClr)
{
   double gap=MathAbs(ef[1]-es[1]);
   double norm=(atr[1]>0)? gap/atr[1] : 0;
   bool trending = norm>0.6;
   bool volatile_ = volPct>72;
   bool quiet     = volPct<28;

   if(rsi[1]>72 || rsi[1]<28){ outClr=CLR_PURPLE; return "REVERSAL RISK"; }
   if(volatile_){ outClr=CLR_AMBER; return "VOLATILE"; }
   if(trending){ outClr=CLR_CYAN; return (ef[1]>=es[1])?"TRENDING UP":"TRENDING DOWN"; }
   if(quiet){ outClr=CLR_MUTED; return "LOW VOLUME / QUIET"; }
   outClr=CLR_MUTED; return "RANGING";
}

//+------------------------------------------------------------------+
//| Trade-quality rating from score                                  |
//+------------------------------------------------------------------+
string Quality(double s,color &c)
{
   if(s>=85){ c=CLR_GREEN;  return "EXCELLENT"; }
   if(s>=70){ c=CLR_GREEN;  return "STRONG";    }
   if(s>=55){ c=CLR_CYAN;   return "GOOD";      }
   if(s>=40){ c=CLR_AMBER;  return "AVERAGE";   }
   c=CLR_RED; return "POOR";
}

//+------------------------------------------------------------------+
//| Dynamic Support / Resistance (recent swing hi/lo) as lines       |
//+------------------------------------------------------------------+
void DrawSR(const double &high[],const double &low[],int rates_total)
{
   if(!ShowSR) return;
   int lb=SrLookback; if(lb>rates_total-2) lb=rates_total-2;
   if(lb<5) return;
   double res=high[1], sup=low[1];
   for(int i=1;i<=lb;i++){ if(high[i]>res) res=high[i]; if(low[i]<sup) sup=low[i]; }

   string rn=PFX+"RES", sn=PFX+"SUP", rt=PFX+"REST", st=PFX+"SUPT";
   if(ObjectFind(0,rn)<0) ObjectCreate(0,rn,OBJ_HLINE,0,0,res);
   ObjectSetDouble(0,rn,OBJPROP_PRICE,res);
   ObjectSetInteger(0,rn,OBJPROP_COLOR,CLR_RED);
   ObjectSetInteger(0,rn,OBJPROP_STYLE,STYLE_DOT);
   ObjectSetInteger(0,rn,OBJPROP_WIDTH,1);
   ObjectSetInteger(0,rn,OBJPROP_BACK,true);
   ObjectSetInteger(0,rn,OBJPROP_SELECTABLE,false);

   if(ObjectFind(0,sn)<0) ObjectCreate(0,sn,OBJ_HLINE,0,0,sup);
   ObjectSetDouble(0,sn,OBJPROP_PRICE,sup);
   ObjectSetInteger(0,sn,OBJPROP_COLOR,CLR_GREEN);
   ObjectSetInteger(0,sn,OBJPROP_STYLE,STYLE_DOT);
   ObjectSetInteger(0,sn,OBJPROP_WIDTH,1);
   ObjectSetInteger(0,sn,OBJPROP_BACK,true);
   ObjectSetInteger(0,sn,OBJPROP_SELECTABLE,false);
}

//+------------------------------------------------------------------+
//| Dashboard render                                                 |
//+------------------------------------------------------------------+
void DrawDashboard(bool isBull,double score,double volPct,string mstate,color mclr,
                   string lastSig,color lastClr)
{
   if(!ShowDashboard) return;
   int x=PanelX, y=PanelY;
   int W=262, pad=14;
   int rowH=21;

   // shell + header
   RLabel(PFX+"shell",x,y,W,352,CLR_PANEL_BG,CLR_BORDER);
   RLabel(PFX+"hdr",  x,y,W,36,CLR_HEADER,CLR_BORDER);
   RLabel(PFX+"accent",x,y,4,36,CLR_GOLD,CLR_GOLD);
   TLabel(PFX+"title",x+pad,y+8,"GIO GOLD  •  SCANNER",CLR_GOLD,11,"Segoe UI Semibold",ANCHOR_LEFT_UPPER);

   int cy=y+46;
   int rx=x+pad;            // label left
   int vx=x+W-pad;          // value right

   string tf=StringSubstr(EnumToString((ENUM_TIMEFRAMES)_Period),7);
   color trendClr = isBull?CLR_GREEN:CLR_RED;
   string trendTx = isBull?"BULLISH ▲":"BEARISH ▼";

   // rows: label + value
   string L[7]; string V[7]; color C[7];
   L[0]="Symbol / TF";  V[0]=_Symbol+"  "+tf;                 C[0]=CLR_TEXT;
   L[1]="Trend";        V[1]=trendTx;                          C[1]=trendClr;
   L[2]="Last Signal";  V[2]=lastSig;                          C[2]=lastClr;
   L[3]="Market State"; V[3]=mstate;                           C[3]=mclr;
   L[4]="Spread";       V[4]=DoubleToString(CurrentSpreadPts(),0)+" pts"; C[4]=SpreadClr();
   L[5]="Session";      V[5]=InSession()?"OPEN":"CLOSED";      C[5]=InSession()?CLR_GREEN:CLR_MUTED;
   color qClr; string qTx=Quality(score,qClr);
   L[6]="Trade Quality";V[6]=qTx;                              C[6]=qClr;

   for(int i=0;i<7;i++)
   {
      TLabel(PFX+"l"+(string)i,rx,cy,L[i],CLR_MUTED,9,"Segoe UI",ANCHOR_LEFT_UPPER);
      TLabel(PFX+"v"+(string)i,vx,cy,V[i],C[i],9,"Consolas",ANCHOR_RIGHT_UPPER);
      cy+=rowH;
   }

   // divider
   RLabel(PFX+"div",rx,cy+2,W-2*pad,1,CLR_BORDER,CLR_BORDER);
   cy+=12;

   // meters
   int mW=W-2*pad;
   double sigPct = score;                        // signal strength
   double aiPct  = (score*0.7 + (100-MathAbs(50-volPct))*0.3); // blended confidence
   if(aiPct<0) aiPct=0; if(aiPct>100) aiPct=100;

   TLabel(PFX+"m1t",rx,cy,"Signal Strength",CLR_MUTED,9,"Segoe UI",ANCHOR_LEFT_UPPER);
   TLabel(PFX+"m1v",vx,cy,DoubleToString(sigPct,0)+"%",CLR_TEXT,9,"Consolas",ANCHOR_RIGHT_UPPER);
   Meter(PFX+"m1",rx,cy+16,mW,8,sigPct, sigPct>=55?CLR_GREEN:(sigPct>=40?CLR_AMBER:CLR_RED));
   cy+=34;

   TLabel(PFX+"m2t",rx,cy,"Volatility",CLR_MUTED,9,"Segoe UI",ANCHOR_LEFT_UPPER);
   TLabel(PFX+"m2v",vx,cy,DoubleToString(volPct,0)+"%",CLR_TEXT,9,"Consolas",ANCHOR_RIGHT_UPPER);
   Meter(PFX+"m2",rx,cy+16,mW,8,volPct,CLR_AMBER);
   cy+=34;

   TLabel(PFX+"m3t",rx,cy,"AI Confidence",CLR_MUTED,9,"Segoe UI",ANCHOR_LEFT_UPPER);
   TLabel(PFX+"m3v",vx,cy,DoubleToString(aiPct,0)+"%",CLR_TEXT,9,"Consolas",ANCHOR_RIGHT_UPPER);
   Meter(PFX+"m3",rx,cy+16,mW,8,aiPct,CLR_CYAN);
   cy+=34;

   TLabel(PFX+"foot",rx,cy+2,"Decision-support • demo test first",CLR_MUTED,8,"Segoe UI",ANCHOR_LEFT_UPPER);
}

//--- spread helpers
double CurrentSpreadPts()
{
   double sp=(double)SymbolInfoInteger(_Symbol,SYMBOL_SPREAD);
   return sp;
}
color SpreadClr()
{
   double sp=CurrentSpreadPts();
   if(sp<=25) return CLR_GREEN;
   if(sp<=60) return CLR_AMBER;
   return CLR_RED;
}

//+------------------------------------------------------------------+
//| Fire alerts once per new signal bar                              |
//+------------------------------------------------------------------+
void MaybeAlert(bool buy,bool sell,datetime barTime)
{
   if(!(AlertPopup||AlertPush||AlertEmail||AlertSound)) return;
   if(!(buy||sell)) return;
   if(barTime==g_lastAlertBar) return;
   g_lastAlertBar=barTime;
   string dir = buy?"BUY":"SELL";
   string msg = "GIO GOLD: "+dir+" signal  "+_Symbol+"  "+
                StringSubstr(EnumToString((ENUM_TIMEFRAMES)_Period),7);
   if(AlertPopup) Alert(msg);
   if(AlertPush)  SendNotification(msg);
   if(AlertEmail) SendMail("GIO GOLD Signal",msg);
   if(AlertSound) PlaySound(AlertSoundFile);
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
   if(rates_total < EmaSlowPeriod+6) return(0);

   ArraySetAsSeries(time,true);
   ArraySetAsSeries(high,true);
   ArraySetAsSeries(low,true);
   ArraySetAsSeries(close,true);

   ArraySetAsSeries(BuyBuf,true);
   ArraySetAsSeries(SellBuf,true);
   ArraySetAsSeries(EmaFastBuf,true);
   ArraySetAsSeries(EmaSlowBuf,true);

   static double ef[],es[],rsi[],atr[];
   ArraySetAsSeries(ef,true); ArraySetAsSeries(es,true);
   ArraySetAsSeries(rsi,true); ArraySetAsSeries(atr,true);

   if(CopyBuffer(hEmaFast,0,0,rates_total,ef)<=0) return(prev_calculated);
   if(CopyBuffer(hEmaSlow,0,0,rates_total,es)<=0) return(prev_calculated);
   if(CopyBuffer(hRsi,0,0,rates_total,rsi)<=0)    return(prev_calculated);
   if(CopyBuffer(hAtr,0,0,rates_total,atr)<=0)    return(prev_calculated);

   // copy EMA into plot buffers
   for(int i=0;i<rates_total;i++){ EmaFastBuf[i]=ef[i]; EmaSlowBuf[i]=es[i]; }

   // determine recompute window
   int start;
   if(prev_calculated==0) start=rates_total-2;
   else                   start=rates_total-prev_calculated+1;
   if(start>rates_total-2) start=rates_total-2;
   if(start<1)             start=1;

   bool newBuy=false,newSell=false;

   for(int i=start;i>=1;i--)
   {
      BuyBuf[i]=EMPTY_VALUE;
      SellBuf[i]=EMPTY_VALUE;

      if((i+1)>=rates_total) continue;

      bool crossUp = (ef[i+1]<=es[i+1] && ef[i]>es[i]);
      bool crossDn = (ef[i+1]>=es[i+1] && ef[i]<es[i]);
      double off=(atr[i]>0)? atr[i]*0.6 : _Point*300;

      if(ShowArrows && crossUp && rsi[i]>=50.0)
      {
         BuyBuf[i]=low[i]-off;
         if(i==1) newBuy=true;
      }
      if(ShowArrows && crossDn && rsi[i]<=50.0)
      {
         SellBuf[i]=high[i]+off;
         if(i==1) newSell=true;
      }
   }

   // ---- live analytics for dashboard (uses closed bar [1]) ----
   bool isBull;
   double score=CompositeScore(ef,es,rsi,atr,isBull);
   double volPct=VolatilityPct(atr,50);
   color mclr; string mstate=ClassifyMarket(ef,es,rsi,atr,volPct,mclr);

   // last confirmed signal label
   string lastSig="—"; color lastClr=CLR_MUTED;
   for(int i=1;i<=SrLookback && i<rates_total;i++)
   {
      if(BuyBuf[i]!=EMPTY_VALUE){ lastSig="BUY  ▲"; lastClr=CLR_GREEN; break; }
      if(SellBuf[i]!=EMPTY_VALUE){ lastSig="SELL ▼"; lastClr=CLR_RED; break; }
   }

   DrawSR(high,low,rates_total);
   DrawDashboard(isBull,score,volPct,mstate,mclr,lastSig,lastClr);
   MaybeAlert(newBuy,newSell,time[1]);
   ChartRedraw(0);

   return(rates_total);
}
//+------------------------------------------------------------------+
