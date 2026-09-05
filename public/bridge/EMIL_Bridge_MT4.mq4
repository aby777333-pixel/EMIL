//+------------------------------------------------------------------+
//|                                              EMIL_Bridge_MT4.mq4 |
//|  EMIL platform bridge for MetaTrader 4 — streams account, open    |
//|  orders and closed trades to your EMIL workspace. READ-ONLY.      |
//|                                                                    |
//|  Setup: MT4 → Tools → Options → Expert Advisors → tick "Allow      |
//|  WebRequest for listed URL" and add your EMIL host. Attach to any  |
//|  chart, paste the token from EMIL → Connect Your Platform.         |
//+------------------------------------------------------------------+
#property copyright "EMIL"
#property version   "1.00"
#property strict

input string EmilUrl           = "https://your-emil-host/api/bridge/mt";
input string EmilToken         = "";
input int    IntervalSec       = 10;
input int    DealsLookbackDays = 30;

int      g_lastHistoryTicket = 0;
int      g_failures = 0;

string Esc(string s)
  {
   string r = s;
   StringReplace(r, "\\", "\\\\");
   StringReplace(r, "\"", "\\\"");
   return r;
  }
string D(double v, int digits = 5) { return DoubleToString(v, digits); }
string L(long v) { return IntegerToString(v); }

int OnInit()
  {
   if(StringLen(EmilToken) < 20) { Print("EMIL Bridge: set EmilToken."); return(INIT_PARAMETERS_INCORRECT); }
   EventSetTimer(MathMax(3, IntervalSec));
   Print("EMIL Bridge (MT4) started → ", EmilUrl);
   SendSnapshot();
   return(INIT_SUCCEEDED);
  }
void OnDeinit(const int reason) { EventKillTimer(); }
void OnTimer() { SendSnapshot(); }

string BuildAccountJson()
  {
   string j = "{";
   j += "\"login\":" + L(AccountNumber());
   j += ",\"broker\":\"" + Esc(AccountCompany()) + "\"";
   j += ",\"server\":\"" + Esc(AccountServer()) + "\"";
   j += ",\"currency\":\"" + Esc(AccountCurrency()) + "\"";
   j += ",\"balance\":" + D(AccountBalance(), 2);
   j += ",\"equity\":" + D(AccountEquity(), 2);
   j += ",\"margin\":" + D(AccountMargin(), 2);
   j += ",\"freeMargin\":" + D(AccountFreeMargin(), 2);
   j += ",\"profit\":" + D(AccountProfit(), 2);
   j += ",\"leverage\":" + L(AccountLeverage());
   j += ",\"build\":" + L(TerminalInfoInteger(TERMINAL_BUILD));
   j += ",\"platform\":\"mt4\"";
   j += "}";
   return j;
  }

string BuildPositionsJson()
  {
   string j = "[";
   int n = 0;
   for(int i = 0; i < OrdersTotal(); i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      int type = OrderType();
      if(type != OP_BUY && type != OP_SELL) continue; // skip pending orders
      string sym = OrderSymbol();
      int digits = (int)MarketInfo(sym, MODE_DIGITS);
      double current = (type == OP_BUY) ? MarketInfo(sym, MODE_BID) : MarketInfo(sym, MODE_ASK);
      if(n > 0) j += ",";
      j += "{\"ticket\":\"" + L(OrderTicket()) + "\"";
      j += ",\"symbol\":\"" + Esc(sym) + "\"";
      j += ",\"type\":\"" + (type == OP_BUY ? "buy" : "sell") + "\"";
      j += ",\"volume\":" + D(OrderLots(), 2);
      j += ",\"price\":" + D(OrderOpenPrice(), digits);
      j += ",\"current\":" + D(current, digits);
      j += ",\"sl\":" + D(OrderStopLoss(), digits);
      j += ",\"tp\":" + D(OrderTakeProfit(), digits);
      j += ",\"profit\":" + D(OrderProfit(), 2);
      j += ",\"swap\":" + D(OrderSwap(), 2);
      j += ",\"time\":" + L((long)OrderOpenTime());
      j += "}";
      n++;
     }
   j += "]";
   return j;
  }

string BuildDealsJson()
  {
   string j = "[";
   int n = 0;
   int maxTicket = g_lastHistoryTicket;
   datetime from = TimeCurrent() - DealsLookbackDays * 86400;
   for(int i = 0; i < OrdersHistoryTotal(); i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      int type = OrderType();
      if(type != OP_BUY && type != OP_SELL) continue;
      if(OrderCloseTime() == 0 || OrderCloseTime() < from) continue;
      if(OrderTicket() <= g_lastHistoryTicket) continue;
      string sym = OrderSymbol();
      int digits = (int)MarketInfo(sym, MODE_DIGITS);
      if(n > 0) j += ",";
      j += "{\"ticket\":\"" + L(OrderTicket()) + "\"";
      j += ",\"symbol\":\"" + Esc(sym) + "\"";
      j += ",\"type\":\"" + (type == OP_BUY ? "buy" : "sell") + "\"";
      j += ",\"entry\":1";
      j += ",\"volume\":" + D(OrderLots(), 2);
      j += ",\"price\":" + D(OrderClosePrice(), digits);
      j += ",\"profit\":" + D(OrderProfit(), 2);
      j += ",\"commission\":" + D(OrderCommission(), 2);
      j += ",\"swap\":" + D(OrderSwap(), 2);
      j += ",\"time\":" + L((long)OrderCloseTime());
      j += "}";
      n++;
      if(OrderTicket() > maxTicket) maxTicket = OrderTicket();
      if(n >= 400) break;
     }
   j += "]";
   g_lastHistoryTicket = maxTicket;
   return j;
  }

void SendSnapshot()
  {
   string json = "{\"account\":" + BuildAccountJson() + ",\"positions\":" + BuildPositionsJson() + ",\"deals\":" + BuildDealsJson() + "}";
   char data[];
   char result[];
   string resultHeaders;
   int len = StringToCharArray(json, data, 0, WHOLE_ARRAY, CP_UTF8) - 1;
   if(len < 0) len = 0;
   ArrayResize(data, len);
   string headers = "Content-Type: application/json\r\nX-Bridge-Token: " + EmilToken + "\r\nUser-Agent: EMIL-Bridge-MT4/1.0\r\n";
   ResetLastError();
   int code = WebRequest("POST", EmilUrl, headers, 8000, data, result, resultHeaders);
   if(code == -1)
     {
      int err = GetLastError();
      g_failures++;
      if(err == 4060) Print("EMIL Bridge: URL not allowed — add ", EmilUrl, " under Tools → Options → Expert Advisors.");
      else Print("EMIL Bridge: WebRequest failed, error ", err);
      return;
     }
   if(code >= 200 && code < 300) { g_failures = 0; }
   else
     {
      g_failures++;
      Print("EMIL Bridge: server responded ", code, " ", StringSubstr(CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8), 0, 200));
     }
  }
//+------------------------------------------------------------------+
