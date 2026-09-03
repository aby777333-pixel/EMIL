// ═══════════════════════════════════════════════════════════
// EMIL TRADE — MQL5 Lexer (Tokenizer)
// Converts raw MQL5 source code into a stream of tokens
// ═══════════════════════════════════════════════════════════

import type { MQL5Token, MQL5TokenType } from '@/types/converter';
import { MQL5_KEYWORDS } from '@/types/converter';

const MQL5_TYPES = new Set([
  'int', 'uint', 'long', 'ulong', 'short', 'ushort', 'char', 'uchar',
  'double', 'float', 'bool', 'string', 'datetime', 'color', 'void',
  'ENUM_TIMEFRAMES', 'ENUM_MA_METHOD', 'ENUM_APPLIED_PRICE',
  'ENUM_ORDER_TYPE', 'ENUM_TRADE_REQUEST_ACTIONS', 'ENUM_POSITION_TYPE',
  'ENUM_DEAL_TYPE', 'ENUM_ORDER_TYPE_FILLING', 'ENUM_ORDER_TYPE_TIME',
  'ENUM_SYMBOL_INFO_DOUBLE', 'ENUM_SYMBOL_INFO_INTEGER',
  'ENUM_SYMBOL_INFO_STRING', 'ENUM_ACCOUNT_INFO_DOUBLE',
  'ENUM_ACCOUNT_INFO_INTEGER', 'MqlTradeRequest', 'MqlTradeResult',
  'MqlTick', 'MqlRates', 'MqlDateTime', 'MqlParam',
]);

const MQL5_BUILTINS = new Set([
  'Print', 'Comment', 'Alert', 'PlaySound', 'SendMail', 'SendNotification',
  'Sleep', 'ExpertRemove', 'MathAbs', 'MathMax', 'MathMin', 'MathPow',
  'MathSqrt', 'MathRound', 'MathFloor', 'MathCeil', 'MathLog', 'MathExp',
  'MathRand', 'MathSrand', 'MathMod', 'NormalizeDouble', 'StringLen',
  'StringFind', 'StringSubstr', 'StringReplace', 'StringConcatenate',
  'StringFormat', 'IntegerToString', 'DoubleToString', 'TimeToString',
  'StringToTime', 'StringToInteger', 'StringToDouble', 'TimeCurrent',
  'TimeLocal', 'TimeGMT', 'Period', 'Symbol', 'Point', 'Digits',
  'Ask', 'Bid', 'Close', 'Open', 'High', 'Low', 'Volume', 'Time',
  'Bars', 'iClose', 'iOpen', 'iHigh', 'iLow', 'iVolume', 'iTime',
  'iBars', 'iBarShift', 'iHighest', 'iLowest', 'CopyRates', 'CopyTime',
  'CopyOpen', 'CopyHigh', 'CopyLow', 'CopyClose', 'CopyTickVolume',
  'CopyBuffer', 'ArraySize', 'ArrayResize', 'ArrayInitialize',
  'ArrayMaximum', 'ArrayMinimum', 'ArrayCopy', 'ArraySort',
  'ArraySetAsSeries', 'ArrayIsSeries', 'ArrayFree',
  'SetIndexBuffer', 'SetIndexStyle', 'SetIndexLabel', 'SetIndexDrawBegin',
  'IndicatorSetString', 'IndicatorSetInteger', 'IndicatorSetDouble',
  'PlotIndexSetInteger', 'PlotIndexSetDouble', 'PlotIndexSetString',
  'PlotIndexGetInteger', 'IndicatorBuffers', 'IndicatorDigits',
  'IndicatorShortName', 'SetLevelValue', 'SetLevelStyle',
  'ObjectCreate', 'ObjectDelete', 'ObjectSetString', 'ObjectSetInteger',
  'ObjectSetDouble', 'ObjectFind', 'ObjectGetValueByTime',
  'ChartRedraw', 'ChartSetInteger', 'ChartGetInteger', 'ChartID',
  'iMA', 'iRSI', 'iMACD', 'iATR', 'iBands', 'iStochastic',
  'iCCI', 'iADX', 'iSAR', 'iIchimoku', 'iOBV', 'iMFI',
  'iAD', 'iWPR', 'iMomentum', 'iRVI', 'iBearsPower', 'iBullsPower',
  'iDeMarker', 'iForce', 'iOsMA', 'iVolumes', 'iCustom',
  'iAO', 'iAC', 'iAlligator', 'iFractals', 'iGator',
  'iBWMFI', 'iEnvelopes', 'iStdDev', 'iDEMA', 'iTEMA',
  'iFrAMA', 'iAMA', 'iVIDyA', 'iChaikin', 'iTRIX',
  'OrderSend', 'OrderModify', 'OrderClose', 'OrderDelete',
  'OrderCloseBy', 'OrderSelect', 'OrdersTotal', 'OrderTicket',
  'OrderType', 'OrderLots', 'OrderOpenPrice', 'OrderClosePrice',
  'OrderStopLoss', 'OrderTakeProfit', 'OrderMagicNumber',
  'OrderComment', 'OrderSymbol', 'OrderProfit', 'OrderSwap',
  'OrderCommission', 'OrderOpenTime', 'OrderCloseTime',
  'OrderExpiration', 'PositionSelect', 'PositionGetDouble',
  'PositionGetInteger', 'PositionGetString', 'PositionGetTicket',
  'PositionsTotal', 'HistorySelect', 'HistoryOrderSelect',
  'HistoryDealSelect', 'HistoryOrdersTotal', 'HistoryDealsTotal',
  'AccountBalance', 'AccountEquity', 'AccountFreeMargin',
  'AccountMargin', 'AccountProfit', 'AccountInfoDouble',
  'AccountInfoInteger', 'AccountInfoString',
  'SymbolInfoDouble', 'SymbolInfoInteger', 'SymbolInfoString',
  'SymbolInfoTick', 'MarketInfo', 'RefreshRates',
  'GetLastError', 'ResetLastError', 'GetTickCount',
  'EventSetTimer', 'EventKillTimer', 'EventSetMillisecondTimer',
  'GlobalVariableSet', 'GlobalVariableGet', 'GlobalVariableDel',
  'GlobalVariableCheck', 'FileOpen', 'FileClose', 'FileWrite',
  'FileWriteString', 'FileReadString', 'FileReadNumber',
  'FileDelete', 'FileIsExist', 'FileFlush',
  'MQLInfoInteger', 'MQLInfoString', 'TerminalInfoInteger',
  'TerminalInfoString', 'TerminalInfoDouble',
]);

const ENUM_VALUES = new Set([
  'MODE_SMA', 'MODE_EMA', 'MODE_SMMA', 'MODE_LWMA',
  'PRICE_CLOSE', 'PRICE_OPEN', 'PRICE_HIGH', 'PRICE_LOW',
  'PRICE_MEDIAN', 'PRICE_TYPICAL', 'PRICE_WEIGHTED',
  'PERIOD_CURRENT', 'PERIOD_M1', 'PERIOD_M5', 'PERIOD_M15',
  'PERIOD_M30', 'PERIOD_H1', 'PERIOD_H4', 'PERIOD_D1',
  'PERIOD_W1', 'PERIOD_MN1',
  'OP_BUY', 'OP_SELL', 'OP_BUYLIMIT', 'OP_SELLLIMIT',
  'OP_BUYSTOP', 'OP_SELLSTOP',
  'ORDER_TYPE_BUY', 'ORDER_TYPE_SELL', 'ORDER_TYPE_BUY_LIMIT',
  'ORDER_TYPE_SELL_LIMIT', 'ORDER_TYPE_BUY_STOP', 'ORDER_TYPE_SELL_STOP',
  'TRADE_ACTION_DEAL', 'TRADE_ACTION_PENDING', 'TRADE_ACTION_SLTP',
  'TRADE_ACTION_MODIFY', 'TRADE_ACTION_REMOVE',
  'POSITION_TYPE_BUY', 'POSITION_TYPE_SELL',
  'ORDER_FILLING_FOK', 'ORDER_FILLING_IOC', 'ORDER_FILLING_RETURN',
  'ORDER_TIME_GTC', 'ORDER_TIME_DAY', 'ORDER_TIME_SPECIFIED',
  'DRAW_LINE', 'DRAW_HISTOGRAM', 'DRAW_ARROW', 'DRAW_SECTION',
  'DRAW_NONE', 'DRAW_ZIGZAG', 'DRAW_FILLING', 'DRAW_BARS',
  'DRAW_CANDLES', 'DRAW_COLOR_LINE', 'DRAW_COLOR_HISTOGRAM',
  'STYLE_SOLID', 'STYLE_DASH', 'STYLE_DOT', 'STYLE_DASHDOT',
  'INDICATOR_DATA', 'INDICATOR_COLOR_INDEX', 'INDICATOR_CALCULATIONS',
  'SYMBOL_BID', 'SYMBOL_ASK', 'SYMBOL_POINT', 'SYMBOL_DIGITS',
  'SYMBOL_SPREAD', 'SYMBOL_VOLUME_MIN', 'SYMBOL_VOLUME_MAX',
  'SYMBOL_VOLUME_STEP', 'SYMBOL_TRADE_STOPS_LEVEL',
  'ACCOUNT_BALANCE', 'ACCOUNT_EQUITY', 'ACCOUNT_MARGIN',
  'ACCOUNT_MARGIN_FREE', 'ACCOUNT_PROFIT', 'ACCOUNT_LEVERAGE',
  'MODE_DIGITS', 'MODE_POINT', 'MODE_SPREAD', 'MODE_STOPLEVEL',
  'MODE_LOTSIZE', 'MODE_TICKVALUE', 'MODE_TICKSIZE',
  'MODE_SWAPLONG', 'MODE_SWAPSHORT', 'MODE_MINLOT', 'MODE_MAXLOT',
  'MODE_LOTSTEP', 'MODE_MARGINREQUIRED',
  'INIT_SUCCEEDED', 'INIT_FAILED', 'INIT_PARAMETERS_INCORRECT',
  'CLR_NONE', 'EMPTY_VALUE', 'WRONG_VALUE', 'EMPTY',
  'CHART_IS_OBJECT', 'OBJ_TREND', 'OBJ_HLINE', 'OBJ_VLINE',
  'OBJ_RECTANGLE', 'OBJ_TEXT', 'OBJ_LABEL',
  'OBJPROP_COLOR', 'OBJPROP_WIDTH', 'OBJPROP_STYLE',
  'clrNONE', 'clrRed', 'clrGreen', 'clrBlue', 'clrYellow',
  'clrWhite', 'clrBlack', 'clrOrange', 'clrGold', 'clrAqua',
  'clrLime', 'clrMagenta', 'clrSilver', 'clrGray',
  'FILE_READ', 'FILE_WRITE', 'FILE_CSV', 'FILE_TXT', 'FILE_BIN',
  'FILE_ANSI', 'FILE_UNICODE', 'FILE_COMMON',
]);

const OPERATORS = new Set([
  '+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=',
  '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '+=', '-=',
  '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '++', '--',
  '?', ':', '::', '->', '.',
]);

const PUNCTUATION = new Set([
  '(', ')', '{', '}', '[', ']', ';', ',',
]);

export class MQL5Lexer {
  private source: string;
  private pos: number;
  private line: number;
  private column: number;
  private tokens: MQL5Token[];

  constructor(source: string) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  tokenize(): MQL5Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const ch = this.source[this.pos];

      if (ch === '/' && this.pos + 1 < this.source.length) {
        const next = this.source[this.pos + 1];
        if (next === '/') { this.readLineComment(); continue; }
        if (next === '*') { this.readBlockComment(); continue; }
      }

      if (ch === '#') { this.readPreprocessor(); continue; }
      if (ch === '"') { this.readString(); continue; }
      if (ch === '\'') { this.readCharLiteral(); continue; }
      if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peek(1)))) {
        this.readNumber();
        continue;
      }
      if (this.isIdentStart(ch)) { this.readIdentifier(); continue; }
      if (PUNCTUATION.has(ch)) { this.readPunctuation(); continue; }
      if (this.isOperatorStart(ch)) { this.readOperator(); continue; }

      this.advance();
    }

    this.tokens.push({
      type: 'eof',
      value: '',
      line: this.line,
      column: this.column,
      offset: this.pos,
    });

    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
      } else if (ch === '\n') {
        this.advance();
        this.line++;
        this.column = 1;
      } else {
        break;
      }
    }
  }

  private readLineComment(): void {
    const startLine = this.line;
    const startCol = this.column;
    const startOffset = this.pos;
    let value = '';
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      value += this.source[this.pos];
      this.advance();
    }
    this.tokens.push({
      type: 'comment',
      value,
      line: startLine,
      column: startCol,
      offset: startOffset,
    });
  }

  private readBlockComment(): void {
    const startLine = this.line;
    const startCol = this.column;
    const startOffset = this.pos;
    let value = '/*';
    this.advance(); // /
    this.advance(); // *
    while (this.pos < this.source.length) {
      if (this.source[this.pos] === '*' && this.peek(1) === '/') {
        value += '*/';
        this.advance();
        this.advance();
        break;
      }
      if (this.source[this.pos] === '\n') {
        this.line++;
        this.column = 0;
      }
      value += this.source[this.pos];
      this.advance();
    }
    this.tokens.push({
      type: 'comment',
      value,
      line: startLine,
      column: startCol,
      offset: startOffset,
    });
  }

  private readPreprocessor(): void {
    const startLine = this.line;
    const startCol = this.column;
    const startOffset = this.pos;
    let value = '';
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      value += this.source[this.pos];
      this.advance();
    }
    this.tokens.push({
      type: 'preprocessor',
      value: value.trim(),
      line: startLine,
      column: startCol,
      offset: startOffset,
    });
  }

  private readString(): void {
    const startLine = this.line;
    const startCol = this.column;
    const startOffset = this.pos;
    let value = '"';
    this.advance(); // opening quote
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === '\\') {
        value += ch;
        this.advance();
        if (this.pos < this.source.length) {
          value += this.source[this.pos];
          this.advance();
        }
        continue;
      }
      if (ch === '"') {
        value += '"';
        this.advance();
        break;
      }
      value += ch;
      this.advance();
    }
    this.tokens.push({
      type: 'string',
      value,
      line: startLine,
      column: startCol,
      offset: startOffset,
    });
  }

  private readCharLiteral(): void {
    const startLine = this.line;
    const startCol = this.column;
    const startOffset = this.pos;
    let value = '\'';
    this.advance();
    while (this.pos < this.source.length && this.source[this.pos] !== '\'') {
      if (this.source[this.pos] === '\\') {
        value += this.source[this.pos];
        this.advance();
      }
      if (this.pos < this.source.length) {
        value += this.source[this.pos];
        this.advance();
      }
    }
    if (this.pos < this.source.length) {
      value += '\'';
      this.advance();
    }
    this.tokens.push({
      type: 'number',
      value,
      line: startLine,
      column: startCol,
      offset: startOffset,
    });
  }

  private readNumber(): void {
    const startLine = this.line;
    const startCol = this.column;
    const startOffset = this.pos;
    let value = '';

    if (this.source[this.pos] === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
      value += this.source[this.pos]; this.advance();
      value += this.source[this.pos]; this.advance();
      while (this.pos < this.source.length && this.isHexDigit(this.source[this.pos])) {
        value += this.source[this.pos];
        this.advance();
      }
    } else {
      while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
        value += this.source[this.pos];
        this.advance();
      }
      if (this.pos < this.source.length && this.source[this.pos] === '.') {
        value += '.';
        this.advance();
        while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
          value += this.source[this.pos];
          this.advance();
        }
      }
      if (this.pos < this.source.length && (this.source[this.pos] === 'e' || this.source[this.pos] === 'E')) {
        value += this.source[this.pos];
        this.advance();
        if (this.pos < this.source.length && (this.source[this.pos] === '+' || this.source[this.pos] === '-')) {
          value += this.source[this.pos];
          this.advance();
        }
        while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
          value += this.source[this.pos];
          this.advance();
        }
      }
    }

    this.tokens.push({
      type: 'number',
      value,
      line: startLine,
      column: startCol,
      offset: startOffset,
    });
  }

  private readIdentifier(): void {
    const startLine = this.line;
    const startCol = this.column;
    const startOffset = this.pos;
    let value = '';
    while (this.pos < this.source.length && this.isIdentChar(this.source[this.pos])) {
      value += this.source[this.pos];
      this.advance();
    }

    let type: MQL5TokenType = 'identifier';
    if (MQL5_KEYWORDS.has(value)) type = 'keyword';
    else if (MQL5_TYPES.has(value)) type = 'type';
    else if (MQL5_BUILTINS.has(value)) type = 'builtin';
    else if (ENUM_VALUES.has(value)) type = 'enum_value';

    this.tokens.push({
      type,
      value,
      line: startLine,
      column: startCol,
      offset: startOffset,
    });
  }

  private readPunctuation(): void {
    this.tokens.push({
      type: 'punctuation',
      value: this.source[this.pos],
      line: this.line,
      column: this.column,
      offset: this.pos,
    });
    this.advance();
  }

  private readOperator(): void {
    const startLine = this.line;
    const startCol = this.column;
    const startOffset = this.pos;

    const op = this.source[this.pos];
    this.advance();

    // Try 3-character operators
    if (this.pos + 1 < this.source.length) {
      const three = op + this.source[this.pos] + this.source[this.pos + 1];
      if (OPERATORS.has(three)) {
        this.advance();
        this.advance();
        this.tokens.push({ type: 'operator', value: three, line: startLine, column: startCol, offset: startOffset });
        return;
      }
    }

    // Try 2-character operators
    if (this.pos < this.source.length) {
      const two = op + this.source[this.pos];
      if (OPERATORS.has(two)) {
        this.advance();
        this.tokens.push({ type: 'operator', value: two, line: startLine, column: startCol, offset: startOffset });
        return;
      }
    }

    this.tokens.push({ type: 'operator', value: op, line: startLine, column: startCol, offset: startOffset });
  }

  private advance(): void {
    this.pos++;
    this.column++;
  }

  private peek(offset: number): string {
    const idx = this.pos + offset;
    return idx < this.source.length ? this.source[idx] : '\0';
  }

  private isDigit(ch: string): boolean { return ch >= '0' && ch <= '9'; }
  private isHexDigit(ch: string): boolean {
    return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
  }
  private isIdentStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }
  private isIdentChar(ch: string): boolean {
    return this.isIdentStart(ch) || this.isDigit(ch);
  }
  private isOperatorStart(ch: string): boolean {
    return '+-*/%=!<>&|^~?:.'.includes(ch);
  }
}
