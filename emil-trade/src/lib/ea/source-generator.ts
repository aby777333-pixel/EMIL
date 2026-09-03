// ═══════════════════════════════════════════════════════════════
// RAPTOR EA Source Generator — assembles a complete, compile-ready
// MQL5 Expert Advisor from selected building blocks, the way the
// commercial "EA generators" do it, but in OUR way:
//   · a hard stop loss on every position (not optional),
//   · no martingale / no grid — sizing never scales after losses,
//   · new-bar evaluation, magic-number scoping, spread gate and
//     order-error handling by default (EA-construction discipline
//     distilled from the owner's EA library + the EA-programming
//     literature EMIL studied).
// The output is plain MQL5 source the trader can read, audit,
// compile in MetaEditor, or drop back into the platform converter.
// ═══════════════════════════════════════════════════════════════

export type EntryEngine =
  | 'ma-cross' | 'rsi-revert' | 'donchian-breakout'
  | 'ichimoku-tk' | 'bollinger-revert' | 'momentum-seq';

export interface GeneratorConfig {
  name: string;
  entry: EntryEngine;
  // Entry params
  fastPeriod: number;      // ma-cross fast / momentum seq length
  slowPeriod: number;      // ma-cross slow / donchian & bollinger period
  rsiPeriod: number;
  // Filters
  useAdxFilter: boolean;   adxMin: number;
  useHtfFilter: boolean;   // higher-TF EMA(50) trend agreement (H1)
  useSessionFilter: boolean; sessionStart: number; sessionEnd: number;
  maxSpreadPoints: number;
  // Exits / risk
  atrStops: boolean;       // ATR-multiple SL/TP vs fixed points
  slAtrMult: number; tpAtrMult: number;
  slPoints: number; tpPoints: number;
  useTrailing: boolean; trailAtrMult: number;
  useBreakeven: boolean; breakevenAtrMult: number;
  closeOnOpposite: boolean;
  // Sizing
  riskPercent: number;     // 0 = fixed lot
  fixedLot: number;
  magic: number;
}

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  name: 'Raptor Generated EA',
  entry: 'ma-cross',
  fastPeriod: 10, slowPeriod: 30, rsiPeriod: 14,
  useAdxFilter: true, adxMin: 20,
  useHtfFilter: true,
  useSessionFilter: false, sessionStart: 7, sessionEnd: 20,
  maxSpreadPoints: 30,
  atrStops: true, slAtrMult: 1.5, tpAtrMult: 2.5, slPoints: 300, tpPoints: 600,
  useTrailing: true, trailAtrMult: 1.2,
  useBreakeven: true, breakevenAtrMult: 1.0,
  closeOnOpposite: true,
  riskPercent: 1.0, fixedLot: 0.01,
  magic: 20260721,
};

export const ENTRY_ENGINES: Record<EntryEngine, { label: string; blurb: string }> = {
  'ma-cross':          { label: 'MA Crossover',        blurb: 'Fresh fast/slow EMA cross on the closed bar — the classic trend trigger' },
  'rsi-revert':        { label: 'RSI Reversion',       blurb: 'RSI leaves oversold upward = buy, leaves overbought downward = sell' },
  'donchian-breakout': { label: 'Donchian Breakout',   blurb: 'Close beyond the N-bar extreme flips the trend — ride the breakout leg' },
  'ichimoku-tk':       { label: 'Ichimoku TK Cross',   blurb: 'Tenkan/Kijun cross taken only on the trend side of the cloud' },
  'bollinger-revert':  { label: 'Bollinger Reversion', blurb: 'Close beyond a band that snaps back inside fades the stretch' },
  'momentum-seq':      { label: 'Momentum Sequence',   blurb: 'N candles pushing one way and the last close confirming — join the push' },
};

const sig = (c: GeneratorConfig): { indicators: string; signalFn: string } => {
  switch (c.entry) {
    case 'ma-cross': return {
      indicators: `   hFast = iMA(_Symbol, PERIOD_CURRENT, InpFastPeriod, 0, MODE_EMA, PRICE_CLOSE);
   hSlow = iMA(_Symbol, PERIOD_CURRENT, InpSlowPeriod, 0, MODE_EMA, PRICE_CLOSE);
   if(hFast == INVALID_HANDLE || hSlow == INVALID_HANDLE) return(INIT_FAILED);`,
      signalFn: `   double fast[], slow[];
   if(CopyBuffer(hFast, 0, 1, 2, fast) < 2 || CopyBuffer(hSlow, 0, 1, 2, slow) < 2) return 0;
   // fresh cross on the last CLOSED bar only (non-repainting)
   if(fast[1] > slow[1] && fast[0] <= slow[0]) return  1;
   if(fast[1] < slow[1] && fast[0] >= slow[0]) return -1;
   return 0;`,
    };
    case 'rsi-revert': return {
      indicators: `   hRsi = iRSI(_Symbol, PERIOD_CURRENT, InpRsiPeriod, PRICE_CLOSE);
   if(hRsi == INVALID_HANDLE) return(INIT_FAILED);`,
      signalFn: `   double rsi[];
   if(CopyBuffer(hRsi, 0, 1, 2, rsi) < 2) return 0;
   // leaving the extreme, not entering it — the turn, not the knife
   if(rsi[0] < 30.0 && rsi[1] >= 30.0) return  1;
   if(rsi[0] > 70.0 && rsi[1] <= 70.0) return -1;
   return 0;`,
    };
    case 'donchian-breakout': return {
      indicators: `   // Donchian needs no handle — computed from bars directly`,
      signalFn: `   int hh = iHighest(_Symbol, PERIOD_CURRENT, MODE_HIGH, InpSlowPeriod, 2);
   int ll = iLowest (_Symbol, PERIOD_CURRENT, MODE_LOW,  InpSlowPeriod, 2);
   if(hh < 0 || ll < 0) return 0;
   double chHigh = iHigh(_Symbol, PERIOD_CURRENT, hh);
   double chLow  = iLow (_Symbol, PERIOD_CURRENT, ll);
   double c1     = iClose(_Symbol, PERIOD_CURRENT, 1);
   if(c1 > chHigh) return  1;   // close beyond the prior N-bar extreme
   if(c1 < chLow)  return -1;
   return 0;`,
    };
    case 'ichimoku-tk': return {
      indicators: `   hIchi = iIchimoku(_Symbol, PERIOD_CURRENT, 9, 26, 52);
   if(hIchi == INVALID_HANDLE) return(INIT_FAILED);`,
      signalFn: `   double tk[], kj[], spanA[], spanB[];
   if(CopyBuffer(hIchi, 0, 1, 2, tk)    < 2) return 0;   // Tenkan
   if(CopyBuffer(hIchi, 1, 1, 2, kj)    < 2) return 0;   // Kijun
   if(CopyBuffer(hIchi, 2, 1, 1, spanA) < 1) return 0;
   if(CopyBuffer(hIchi, 3, 1, 1, spanB) < 1) return 0;
   double c1 = iClose(_Symbol, PERIOD_CURRENT, 1);
   double cloudTop = MathMax(spanA[0], spanB[0]);
   double cloudBot = MathMin(spanA[0], spanB[0]);
   // TK cross taken only on the trend side of the cloud; inside = no-trade
   if(tk[1] > kj[1] && tk[0] <= kj[0] && c1 > cloudTop) return  1;
   if(tk[1] < kj[1] && tk[0] >= kj[0] && c1 < cloudBot) return -1;
   return 0;`,
    };
    case 'bollinger-revert': return {
      indicators: `   hBands = iBands(_Symbol, PERIOD_CURRENT, InpSlowPeriod, 0, 2.0, PRICE_CLOSE);
   if(hBands == INVALID_HANDLE) return(INIT_FAILED);`,
      signalFn: `   double up[], lo[];
   if(CopyBuffer(hBands, 1, 1, 2, up) < 2 || CopyBuffer(hBands, 2, 1, 2, lo) < 2) return 0;
   double c1 = iClose(_Symbol, PERIOD_CURRENT, 1);
   double c2 = iClose(_Symbol, PERIOD_CURRENT, 2);
   // the SNAP BACK inside the band is the trigger — never the raw poke out
   if(c2 < lo[1] && c1 > lo[0]) return  1;
   if(c2 > up[1] && c1 < up[0]) return -1;
   return 0;`,
    };
    case 'momentum-seq': return {
      indicators: `   // momentum sequence reads raw bars — no handle needed`,
      signalFn: `   int bull = 0, bear = 0;
   for(int i = 1; i <= InpFastPeriod; i++)
     {
      if(iClose(_Symbol, PERIOD_CURRENT, i) > iOpen(_Symbol, PERIOD_CURRENT, i)) bull++;
      else bear++;
     }
   double c1 = iClose(_Symbol, PERIOD_CURRENT, 1);
   double cN = iClose(_Symbol, PERIOD_CURRENT, InpFastPeriod + 1);
   if(bull == InpFastPeriod && c1 > cN) return  1;   // unanimous push, still extending
   if(bear == InpFastPeriod && c1 < cN) return -1;
   return 0;`,
    };
  }
};

export function generateMql5(c: GeneratorConfig): string {
  const s = sig(c);
  const safeName = c.name.replace(/[^\w ]/g, '').trim() || 'Raptor Generated EA';
  return `//+------------------------------------------------------------------+
//| ${safeName}.mq5
//| Generated by the EMIL TRADE EA Source Generator
//| Entry engine: ${ENTRY_ENGINES[c.entry].label}
//|
//| RAPTOR construction rules baked in (not optional):
//|  - hard stop loss on EVERY position
//|  - no martingale, no grid — size never scales after a loss
//|  - closed-bar signals only (non-repainting)
//|  - magic-number scoping + spread gate + order-error handling
//+------------------------------------------------------------------+
#property copyright "Generated by EMIL TRADE"
#property version   "1.00"
#include <Trade/Trade.mqh>

//--- Entry inputs
input int    InpFastPeriod      = ${c.fastPeriod};      // Fast period / sequence length
input int    InpSlowPeriod      = ${c.slowPeriod};      // Slow period / channel length
input int    InpRsiPeriod       = ${c.rsiPeriod};       // RSI period
//--- Filters
input bool   InpUseAdxFilter    = ${c.useAdxFilter};    // Require ADX trend strength
input double InpAdxMin          = ${c.adxMin.toFixed(1)};    // Min ADX to trade
input bool   InpUseHtfFilter    = ${c.useHtfFilter};    // Require H1 EMA(50) agreement
input bool   InpUseSession      = ${c.useSessionFilter};    // Restrict to session hours
input int    InpSessionStart    = ${c.sessionStart};       // Session start hour (server)
input int    InpSessionEnd      = ${c.sessionEnd};      // Session end hour (server)
input int    InpMaxSpreadPts    = ${c.maxSpreadPoints};      // Max spread (points)
//--- Exits & risk (a hard SL is always attached)
input bool   InpAtrStops        = ${c.atrStops};    // ATR-scaled SL/TP (else fixed points)
input double InpSlAtrMult       = ${c.slAtrMult.toFixed(2)};    // SL = ATR x this
input double InpTpAtrMult       = ${c.tpAtrMult.toFixed(2)};    // TP = ATR x this
input int    InpSlPoints        = ${c.slPoints};     // Fixed SL (points)
input int    InpTpPoints        = ${c.tpPoints};     // Fixed TP (points)
input bool   InpUseTrailing     = ${c.useTrailing};    // ATR trailing stop
input double InpTrailAtrMult    = ${c.trailAtrMult.toFixed(2)};    // Trail distance = ATR x this
input bool   InpUseBreakeven    = ${c.useBreakeven};    // Move SL to entry after cushion
input double InpBeAtrMult       = ${c.breakevenAtrMult.toFixed(2)};    // Breakeven trigger = ATR x this
input bool   InpCloseOnOpposite = ${c.closeOnOpposite};    // Opposite signal closes position
//--- Sizing (fixed fraction — NEVER scales after losses)
input double InpRiskPercent     = ${c.riskPercent.toFixed(2)};    // % equity risked vs SL (0 = fixed lot)
input double InpFixedLot        = ${c.fixedLot.toFixed(2)};    // Fixed lot when risk% = 0
input long   InpMagic           = ${c.magic};  // Magic number

CTrade   trade;
int      hAtr = INVALID_HANDLE, hAdx = INVALID_HANDLE, hHtf = INVALID_HANDLE;
int      hFast = INVALID_HANDLE, hSlow = INVALID_HANDLE, hRsi = INVALID_HANDLE;
int      hIchi = INVALID_HANDLE, hBands = INVALID_HANDLE;
datetime lastBar = 0;

//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagic);
   trade.SetDeviationInPoints(10);
   hAtr = iATR(_Symbol, PERIOD_CURRENT, 14);
   if(hAtr == INVALID_HANDLE) return(INIT_FAILED);
   if(InpUseAdxFilter)
     {
      hAdx = iADX(_Symbol, PERIOD_CURRENT, 14);
      if(hAdx == INVALID_HANDLE) return(INIT_FAILED);
     }
   if(InpUseHtfFilter)
     {
      hHtf = iMA(_Symbol, PERIOD_H1, 50, 0, MODE_EMA, PRICE_CLOSE);
      if(hHtf == INVALID_HANDLE) return(INIT_FAILED);
     }
${s.indicators}
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {}
//+------------------------------------------------------------------+
//| Signal: +1 buy, -1 sell, 0 none — closed bars only               |
//+------------------------------------------------------------------+
int Signal()
  {
${s.signalFn}
  }
//+------------------------------------------------------------------+
bool FiltersPass(int dir)
  {
   // Spread gate — execution cost must never eat the edge
   long spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > InpMaxSpreadPts) return false;
   // Session window
   if(InpUseSession)
     {
      MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
      if(dt.hour < InpSessionStart || dt.hour >= InpSessionEnd) return false;
     }
   // ADX regime floor — trend logic is refused a ranging market
   if(InpUseAdxFilter)
     {
      double adx[];
      if(CopyBuffer(hAdx, 0, 1, 1, adx) < 1) return false;
      if(adx[0] < InpAdxMin) return false;
     }
   // Higher-timeframe agreement — trade with the bigger current
   if(InpUseHtfFilter)
     {
      double htf[];
      if(CopyBuffer(hHtf, 0, 1, 1, htf) < 1) return false;
      double h1close = iClose(_Symbol, PERIOD_H1, 1);
      if(dir > 0 && h1close < htf[0]) return false;
      if(dir < 0 && h1close > htf[0]) return false;
     }
   return true;
  }
//+------------------------------------------------------------------+
double Atr()
  {
   double a[];
   if(CopyBuffer(hAtr, 0, 1, 1, a) < 1) return 0.0;
   return a[0];
  }
//+------------------------------------------------------------------+
//| Fixed-fractional sizing vs the ACTUAL stop distance              |
//+------------------------------------------------------------------+
double LotFor(double slDistance)
  {
   if(InpRiskPercent <= 0.0 || slDistance <= 0.0) return InpFixedLot;
   double tickVal  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickVal <= 0.0 || tickSize <= 0.0) return InpFixedLot;
   double lossPerLot = slDistance / tickSize * tickVal;
   if(lossPerLot <= 0.0) return InpFixedLot;
   double riskMoney = AccountInfoDouble(ACCOUNT_EQUITY) * InpRiskPercent / 100.0;
   double lots = riskMoney / lossPerLot;
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minL = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxL = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   lots = MathFloor(lots / step) * step;
   return MathMin(MathMax(lots, minL), maxL);
  }
//+------------------------------------------------------------------+
bool HaveDir(int dir)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket)) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long type = PositionGetInteger(POSITION_TYPE);
      if(dir > 0 && type == POSITION_TYPE_BUY)  return true;
      if(dir < 0 && type == POSITION_TYPE_SELL) return true;
     }
   return false;
  }
//+------------------------------------------------------------------+
void CloseDir(int dir)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket)) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long type = PositionGetInteger(POSITION_TYPE);
      if((dir > 0 && type == POSITION_TYPE_BUY) || (dir < 0 && type == POSITION_TYPE_SELL))
         trade.PositionClose(ticket);
     }
  }
//+------------------------------------------------------------------+
void Manage()
  {
   double atr = Atr();
   if(atr <= 0.0) return;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket)) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      long   type  = PositionGetInteger(POSITION_TYPE);
      double open  = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl    = PositionGetDouble(POSITION_SL);
      double tp    = PositionGetDouble(POSITION_TP);
      double bid   = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask   = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(type == POSITION_TYPE_BUY)
        {
         double profit = bid - open;
         if(InpUseBreakeven && profit >= atr * InpBeAtrMult && sl < open)
            trade.PositionModify(ticket, open + _Point, tp);
         else if(InpUseTrailing && profit > 0)
           {
            double newSl = bid - atr * InpTrailAtrMult;
            if(newSl > sl && newSl < bid) trade.PositionModify(ticket, newSl, tp);
           }
        }
      else
        {
         double profit = open - ask;
         if(InpUseBreakeven && profit >= atr * InpBeAtrMult && (sl > open || sl == 0.0))
            trade.PositionModify(ticket, open - _Point, tp);
         else if(InpUseTrailing && profit > 0)
           {
            double newSl = ask + atr * InpTrailAtrMult;
            if((newSl < sl || sl == 0.0) && newSl > ask) trade.PositionModify(ticket, newSl, tp);
           }
        }
     }
  }
//+------------------------------------------------------------------+
void OnTick()
  {
   Manage();   // trailing / breakeven run every tick
   // Signals evaluate ONCE per closed bar — non-repainting by design
   datetime cur = iTime(_Symbol, PERIOD_CURRENT, 0);
   if(cur == lastBar) return;
   lastBar = cur;

   int dir = Signal();
   if(dir == 0) return;
   if(InpCloseOnOpposite) CloseDir(-dir);
   if(HaveDir(dir)) return;                 // one position per direction
   if(!FiltersPass(dir)) return;

   double atr = Atr();
   double slDist = InpAtrStops ? atr * InpSlAtrMult : InpSlPoints * _Point;
   double tpDist = InpAtrStops ? atr * InpTpAtrMult : InpTpPoints * _Point;
   if(slDist <= 0.0) return;                // no stop, no trade — ever
   double lots = LotFor(slDist);
   if(lots <= 0.0) return;

   if(dir > 0)
     {
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(!trade.Buy(lots, _Symbol, 0.0, ask - slDist, tpDist > 0 ? ask + tpDist : 0.0))
         Print("Buy failed: ", trade.ResultRetcodeDescription());
     }
   else
     {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      if(!trade.Sell(lots, _Symbol, 0.0, bid + slDist, tpDist > 0 ? bid - tpDist : 0.0))
         Print("Sell failed: ", trade.ResultRetcodeDescription());
     }
  }
//+------------------------------------------------------------------+
`;
}
