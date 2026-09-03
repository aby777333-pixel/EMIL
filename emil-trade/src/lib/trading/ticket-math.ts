// Order-ticket market math shared with the QuickTrade panel. Mirrors the
// helpers inside components/trading/order-ticket/OrderTicket.tsx so both
// tickets show identical pip values / margin / risk-preset sizing. (Kept as a
// separate module rather than refactoring the working OrderTicket.)

export function getTicketDecimals(symbol: string): number {
  if (symbol === 'USDJPY') return 3;
  if (symbol.startsWith('XAU')) return 2;
  if (symbol.startsWith('BTC') || symbol === 'US30' || symbol === 'NAS100') return 1;
  if (symbol.startsWith('ETH')) return 2;
  return 5;
}

export function getPipSize(symbol: string): number {
  if (symbol === 'USDJPY') return 0.01;
  if (symbol.startsWith('XAU')) return 0.1;
  if (symbol.startsWith('XAG')) return 0.01;
  if (symbol.startsWith('BTC')) return 1;
  if (symbol.startsWith('ETH')) return 0.1;
  if (symbol === 'US30' || symbol === 'NAS100' || symbol === 'SPX500') return 1;
  return 0.0001;
}

export function getContractSize(symbol: string): number {
  if (symbol.startsWith('XAU')) return 100;
  if (symbol.startsWith('XAG')) return 5000;
  if (symbol.startsWith('BTC')) return 1;
  if (symbol.startsWith('ETH')) return 1;
  if (symbol === 'US30' || symbol === 'NAS100' || symbol === 'SPX500') return 1;
  return 100000;
}

export function calcPipValue(symbol: string, lotSize: number): number {
  const pipSize = getPipSize(symbol);
  const contractSize = getContractSize(symbol);
  if (symbol.endsWith('USD') || symbol === 'XAUUSD' || symbol === 'XAGUSD') {
    return lotSize * contractSize * pipSize;
  }
  if (symbol === 'USDJPY') {
    return lotSize * contractSize * pipSize / 150;
  }
  return lotSize * contractSize * pipSize;
}

/** Margin estimate at 1:500, same formula as the order ticket. */
export function calcMarginRequired(symbol: string, lots: number, entryPrice: number): number {
  if (!entryPrice || lots <= 0) return 0;
  return (lots * getContractSize(symbol) * entryPrice) / 500;
}

/** Risk-preset lot sizing: risk pct% of balance over the SL distance
 *  (falls back to a 50-pip stop when no SL is set — same as the ticket). */
export function lotsForRiskPct(params: {
  symbol: string; balance: number; pct: number; entryPrice: number; sl: number | null;
}): number | null {
  const { symbol, balance, pct, entryPrice, sl } = params;
  if (!balance || balance <= 0) return null;
  const pipSize = getPipSize(symbol);
  const slPips = sl && sl > 0 && entryPrice > 0 ? Math.abs(entryPrice - sl) / pipSize : 50;
  if (slPips <= 0) return null;
  const pipVal1Lot = calcPipValue(symbol, 1);
  if (pipVal1Lot <= 0) return null;
  const lots = (balance * (pct / 100)) / (slPips * pipVal1Lot);
  return Math.max(0.01, Math.floor(lots * 100) / 100);
}
