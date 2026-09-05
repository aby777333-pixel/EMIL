//+------------------------------------------------------------------+
//|                                              EMIL_Bridge_MT5.mq5 |
//|  EMIL platform bridge — streams this terminal's account, open     |
//|  positions and recent deals to your EMIL workspace.               |
//|                                                                    |
//|  READ-ONLY: this EA never places, modifies or closes orders.       |
//|                                                                    |
//|  Setup (once):                                                     |
//|   1. EMIL → Connect Your Platform → "MetaTrader 5" → copy token.   |
//|   2. MT5 → Tools → Options → Expert Advisors → tick                |
//|      "Allow WebRequest for listed URL" and add your EMIL host      |
//|      (e.g. https://your-emil-host).                                |
//|   3. Attach this EA to any chart, paste the token into EmilToken,  |
//|      set EmilUrl to https://your-emil-host/api/bridge/mt.          |
//|   4. Enable Algo Trading (needed for timers/WebRequest only).      |
//+------------------------------------------------------------------+
#property copyright "EMIL"
#property version   "1.00"
#property strict

input string EmilUrl          = "https://your-emil-host/api/bridge/mt"; // EMIL bridge endpoint
input string EmilToken        = "";                                     // Bridge token from EMIL (emil_bridge_...)
input int    IntervalSec      = 10;                                     // Snapshot interval (seconds)
input int    DealsLookbackDays = 30;                                    // Deals history sent on first run

ulong  g_lastDealTicket = 0;
int    g_failures = 0;

//+------------------------------------------------------------------+
string Esc(const string s)
  {
   string r = s;
   StringReplace(r, "\\", "\\\\");
   StringReplace(r, "\"", "\\\"");
   StringReplace(r, "\n", " ");
   StringReplace(r, "\r", " ");
   return r;
  }
string D(const double v, const int digits = 5) { return DoubleToString(v, digits); }
string L(const long v) { return IntegerToString(v); }

//+------------------------------------------------------------------+
int OnInit()
  {
   if(StringLen(EmilToken) < 20)
     {
      Print("EMIL Bridge: set EmilToken (copy it from EMIL → Connect Your Platform).");
      return(INIT_PARAMETERS_INCORRECT);
     }
   EventSetTimer(MathMax(3, IntervalSec));
   Print("EMIL Bridge started → ", EmilUrl, " every ", IntervalSec, "s (read-only).");
   SendSnapshot();
   return(INIT_SUCCEEDED);
  }
void OnDeinit(const int reason) { EventKillTimer(); }
void OnTimer() { SendSnapshot(); }

//+------------------------------------------------------------------+
string BuildAccountJson()
  {
   string j = "{";
   j += "\"login\":" + L(AccountInfoInteger(ACCOUNT_LOGIN));
   j += ",\"broker\":\"" + Esc(AccountInfoString(ACCOUNT_COMPANY)) + "\"";
   j += ",\"server\":\"" + Esc(AccountInfoString(ACCOUNT_SERVER)) + "\"";
   j += ",\"currency\":\"" + Esc(AccountInfoString(ACCOUNT_CURRENCY)) + "\"";
   j += ",\"balance\":" + D(AccountInfoDouble(ACCOUNT_BALANCE), 2);
   j += ",\"equity\":" + D(AccountInfoDouble(ACCOUNT_EQUITY), 2);
   j += ",\"margin\":" + D(AccountInfoDouble(ACCOUNT_MARGIN), 2);
   j += ",\"freeMargin\":" + D(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2);
   j += ",\"profit\":" + D(AccountInfoDouble(ACCOUNT_PROFIT), 2);
   j += ",\"leverage\":" + L(AccountInfoInteger(ACCOUNT_LEVERAGE));
   j += ",\"build\":" + L(TerminalInfoInteger(TERMINAL_BUILD));
   j += ",\"platform\":\"mt5\"";
   j += "}";
   return j;
  }

string BuildPositionsJson()
  {
   string j = "[";
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket)) continue;
      string sym = PositionGetString(POSITION_SYMBOL);
      int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      if(i > 0) j += ",";
      j += "{\"ticket\":\"" + L((long)ticket) + "\"";
      j += ",\"symbol\":\"" + Esc(sym) + "\"";
      j += ",\"type\":\"" + (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell") + "\"";
      j += ",\"volume\":" + D(PositionGetDouble(POSITION_VOLUME), 2);
      j += ",\"price\":" + D(PositionGetDouble(POSITION_PRICE_OPEN), digits);
      j += ",\"current\":" + D(PositionGetDouble(POSITION_PRICE_CURRENT), digits);
      j += ",\"sl\":" + D(PositionGetDouble(POSITION_SL), digits);
      j += ",\"tp\":" + D(PositionGetDouble(POSITION_TP), digits);
      j += ",\"profit\":" + D(PositionGetDouble(POSITION_PROFIT), 2);
      j += ",\"swap\":" + D(PositionGetDouble(POSITION_SWAP), 2);
      j += ",\"time\":" + L(PositionGetInteger(POSITION_TIME));
      j += "}";
     }
   j += "]";
   return j;
  }

string BuildDealsJson()
  {
   string j = "[";
   datetime from = (g_lastDealTicket == 0) ? TimeCurrent() - DealsLookbackDays * 86400 : TimeCurrent() - 3 * 86400;
   if(!HistorySelect(from, TimeCurrent() + 60)) { return "[]"; }
   int total = HistoryDealsTotal();
   int n = 0;
   ulong maxTicket = g_lastDealTicket;
   for(int i = 0; i < total; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0 || ticket <= g_lastDealTicket) continue;
      long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue; // skip balance/credit rows
      string sym = HistoryDealGetString(ticket, DEAL_SYMBOL);
      if(StringLen(sym) == 0) continue;
      int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      if(n > 0) j += ",";
      j += "{\"ticket\":\"" + L((long)ticket) + "\"";
      j += ",\"symbol\":\"" + Esc(sym) + "\"";
      j += ",\"type\":\"" + (type == DEAL_TYPE_BUY ? "buy" : "sell") + "\"";
      j += ",\"entry\":" + L(HistoryDealGetInteger(ticket, DEAL_ENTRY));
      j += ",\"volume\":" + D(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2);
      j += ",\"price\":" + D(HistoryDealGetDouble(ticket, DEAL_PRICE), digits);
      j += ",\"profit\":" + D(HistoryDealGetDouble(ticket, DEAL_PROFIT), 2);
      j += ",\"commission\":" + D(HistoryDealGetDouble(ticket, DEAL_COMMISSION), 2);
      j += ",\"swap\":" + D(HistoryDealGetDouble(ticket, DEAL_SWAP), 2);
      j += ",\"time\":" + L(HistoryDealGetInteger(ticket, DEAL_TIME));
      j += "}";
      n++;
      if(ticket > maxTicket) maxTicket = ticket;
      if(n >= 400) break;
     }
   j += "]";
   g_lastDealTicket = maxTicket;
   return j;
  }

//+------------------------------------------------------------------+
void SendSnapshot()
  {
   string json = "{\"account\":" + BuildAccountJson() + ",\"positions\":" + BuildPositionsJson() + ",\"deals\":" + BuildDealsJson() + "}";
   char data[];
   char result[];
   string resultHeaders;
   int len = StringToCharArray(json, data, 0, WHOLE_ARRAY, CP_UTF8) - 1; // drop the terminating null
   if(len < 0) len = 0;
   ArrayResize(data, len);
   string headers = "Content-Type: application/json\r\nX-Bridge-Token: " + EmilToken + "\r\nUser-Agent: EMIL-Bridge-MT5/1.0\r\n";
   ResetLastError();
   int code = WebRequest("POST", EmilUrl, headers, 8000, data, result, resultHeaders);
   if(code == -1)
     {
      int err = GetLastError();
      g_failures++;
      if(err == 4014)
         Print("EMIL Bridge: URL not allowed. Add ", EmilUrl, " under Tools → Options → Expert Advisors → Allow WebRequest.");
      else
         Print("EMIL Bridge: WebRequest failed, error ", err);
      return;
     }
   if(code >= 200 && code < 300)
     {
      if(g_failures > 0) Print("EMIL Bridge: connection restored.");
      g_failures = 0;
     }
   else
     {
      g_failures++;
      string body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      Print("EMIL Bridge: server responded ", code, " ", StringSubstr(body, 0, 200));
      if(code == 401) Print("EMIL Bridge: token rejected — copy a fresh token from EMIL → Connect Your Platform.");
     }
  }
//+------------------------------------------------------------------+
