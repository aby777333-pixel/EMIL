'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import { formatPrice, formatCurrency, cn } from '@/lib/utils/format';

// ─── Order type definitions ──────────────────────────────────────

type OrderTypeOption =
  | 'market'        // Market Execution
  | 'buy_limit'     // Buy Limit
  | 'sell_limit'    // Sell Limit
  | 'buy_stop'      // Buy Stop
  | 'sell_stop'     // Sell Stop
  | 'buy_stop_limit'  // Buy Stop Limit
  | 'sell_stop_limit'; // Sell Stop Limit

interface OrderTypeDef {
  value: OrderTypeOption;
  label: string;
  description: string;
  needsPrice: boolean;
  needsStopPrice: boolean; // for stop-limit orders
  forcedDirection?: 'BUY' | 'SELL';
}

const ORDER_TYPES: OrderTypeDef[] = [
  { value: 'market',          label: 'Market Execution',  description: 'Execute immediately at current market price', needsPrice: false, needsStopPrice: false },
  { value: 'buy_limit',       label: 'Buy Limit',         description: 'Buy when price drops to your target (below market)', needsPrice: true, needsStopPrice: false, forcedDirection: 'BUY' },
  { value: 'sell_limit',      label: 'Sell Limit',        description: 'Sell when price rises to your target (above market)', needsPrice: true, needsStopPrice: false, forcedDirection: 'SELL' },
  { value: 'buy_stop',        label: 'Buy Stop',          description: 'Buy when price breaks above your target', needsPrice: true, needsStopPrice: false, forcedDirection: 'BUY' },
  { value: 'sell_stop',       label: 'Sell Stop',         description: 'Sell when price breaks below your target', needsPrice: true, needsStopPrice: false, forcedDirection: 'SELL' },
  { value: 'buy_stop_limit',  label: 'Buy Stop Limit',    description: 'Place a buy limit when price hits the stop level', needsPrice: true, needsStopPrice: true, forcedDirection: 'BUY' },
  { value: 'sell_stop_limit', label: 'Sell Stop Limit',   description: 'Place a sell limit when price hits the stop level', needsPrice: true, needsStopPrice: true, forcedDirection: 'SELL' },
];

// ─── Helpers ─────────────────────────────────────────────────────

function getDecimals(symbol: string): number {
  if (symbol === 'USDJPY') return 3;
  if (symbol.startsWith('XAU')) return 2;
  if (symbol.startsWith('BTC') || symbol === 'US30' || symbol === 'NAS100') return 1;
  if (symbol.startsWith('ETH')) return 2;
  return 5;
}

function getPipSize(symbol: string): number {
  if (symbol === 'USDJPY') return 0.01;
  if (symbol.startsWith('XAU')) return 0.1;
  if (symbol.startsWith('XAG')) return 0.01;
  if (symbol.startsWith('BTC')) return 1;
  if (symbol.startsWith('ETH')) return 0.1;
  if (symbol === 'US30' || symbol === 'NAS100' || symbol === 'SPX500') return 1;
  return 0.0001;
}

function getContractSize(symbol: string): number {
  if (symbol.startsWith('XAU')) return 100;
  if (symbol.startsWith('XAG')) return 5000;
  if (symbol.startsWith('BTC')) return 1;
  if (symbol.startsWith('ETH')) return 1;
  if (symbol === 'US30' || symbol === 'NAS100' || symbol === 'SPX500') return 1;
  return 100000;
}

function calcPipValue(symbol: string, lotSize: number): number {
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

// Map our order type to the service's expected type
function toServiceOrderType(ot: OrderTypeOption): 'limit' | 'stop' {
  if (ot.includes('limit')) return 'limit';
  return 'stop';
}

// ─── Component ───────────────────────────────────────────────────

export default function OrderTicket() {
  const {
    activeSymbol, prices, orderDirection, setOrderDirection,
    activeAccountId, accountSummary, triggerRefresh,
  } = useTradingStore();

  const [lotSize, setLotSize] = useState('0.01');
  const [orderType, setOrderType] = useState<OrderTypeOption>('market');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState(''); // for stop-limit orders
  const [slValue, setSlValue] = useState('');
  const [tpValue, setTpValue] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [slTpMode, setSlTpMode] = useState<'price' | 'pips'>('price');
  const [showOrderTypes, setShowOrderTypes] = useState(false);

  const tick = prices[activeSymbol];
  const decimals = getDecimals(activeSymbol);
  const pipSize = getPipSize(activeSymbol);
  const bid = tick?.bid ?? 0;
  const ask = tick?.ask ?? 0;
  const lots = parseFloat(lotSize) || 0;

  const orderTypeDef = ORDER_TYPES.find((t) => t.value === orderType) || ORDER_TYPES[0];
  const isBuy = orderTypeDef.forcedDirection ? orderTypeDef.forcedDirection === 'BUY' : orderDirection === 'BUY';

  // When selecting a directional order type, force the direction
  const handleOrderTypeChange = useCallback((ot: OrderTypeOption) => {
    setOrderType(ot);
    setShowOrderTypes(false);
    const def = ORDER_TYPES.find((t) => t.value === ot);
    if (def?.forcedDirection) {
      setOrderDirection(def.forcedDirection);
    }
  }, [setOrderDirection]);

  const entryPrice = useMemo(() => {
    if (orderType === 'market') return isBuy ? ask : bid;
    return parseFloat(price) || (isBuy ? ask : bid);
  }, [orderType, isBuy, ask, bid, price]);

  const resolvedSL = useMemo(() => {
    const v = parseFloat(slValue);
    if (!v || v <= 0) return 0;
    if (slTpMode === 'price') return v;
    return isBuy ? entryPrice - v * pipSize : entryPrice + v * pipSize;
  }, [slValue, slTpMode, isBuy, entryPrice, pipSize]);

  const resolvedTP = useMemo(() => {
    const v = parseFloat(tpValue);
    if (!v || v <= 0) return 0;
    if (slTpMode === 'price') return v;
    return isBuy ? entryPrice + v * pipSize : entryPrice - v * pipSize;
  }, [tpValue, slTpMode, isBuy, entryPrice, pipSize]);

  const marginEstimate = useMemo(() => {
    if (!entryPrice || lots <= 0) return 0;
    const contractSize = getContractSize(activeSymbol);
    return (lots * contractSize * entryPrice) / 500;
  }, [entryPrice, lots, activeSymbol]);

  const pipValue = useMemo(() => calcPipValue(activeSymbol, lots), [activeSymbol, lots]);

  const riskCalc = useMemo(() => {
    if (!resolvedSL || entryPrice <= 0 || lots <= 0) return null;
    const slDistancePips = Math.abs(entryPrice - resolvedSL) / pipSize;
    const riskAmount = slDistancePips * pipValue;
    const balance = accountSummary.balance || 0;
    const riskPct = balance > 0 ? (riskAmount / balance) * 100 : 0;
    return { riskAmount, riskPct, slDistancePips };
  }, [resolvedSL, entryPrice, lots, pipSize, pipValue, accountSummary.balance]);

  const rrRatio = useMemo(() => {
    if (!resolvedSL || !resolvedTP || entryPrice <= 0) return null;
    const risk = Math.abs(entryPrice - resolvedSL);
    const reward = Math.abs(resolvedTP - entryPrice);
    if (risk <= 0) return null;
    return reward / risk;
  }, [resolvedSL, resolvedTP, entryPrice]);

  const applyRiskPreset = useCallback(
    (pct: number) => {
      const balance = accountSummary.balance;
      if (!balance || balance <= 0) return;
      let slPips = 0;
      if (resolvedSL && entryPrice > 0) {
        slPips = Math.abs(entryPrice - resolvedSL) / pipSize;
      } else if (slTpMode === 'pips' && parseFloat(slValue) > 0) {
        slPips = parseFloat(slValue);
      } else {
        slPips = 50;
      }
      if (slPips <= 0) return;
      const riskAmount = balance * (pct / 100);
      const pipVal1Lot = calcPipValue(activeSymbol, 1);
      if (pipVal1Lot <= 0) return;
      const newLots = riskAmount / (slPips * pipVal1Lot);
      setLotSize((Math.floor(newLots * 100) / 100).toFixed(2));
    },
    [accountSummary.balance, resolvedSL, entryPrice, pipSize, slTpMode, slValue, activeSymbol]
  );

  const riskColor = useMemo(() => {
    if (!riskCalc) return '#888';
    if (riskCalc.riskPct < 2) return '#00C853';
    if (riskCalc.riskPct <= 5) return '#FFC107';
    return '#FF5252';
  }, [riskCalc]);

  async function handlePlaceOrder() {
    if (!activeAccountId) {
      setFeedback({ type: 'error', message: 'No trading account selected' });
      return;
    }
    if (lots <= 0) return;
    setIsPlacing(true);
    setFeedback(null);

    try {
      if (orderType === 'market') {
        const fillPrice = isBuy ? ask : bid;
        if (fillPrice <= 0) {
          setFeedback({ type: 'error', message: 'No price available. Wait for market data.' });
          setIsPlacing(false);
          return;
        }
        const result = await orderService.placeMarketOrder({
          accountId: activeAccountId, symbol: activeSymbol, direction: orderDirection,
          size: lots, sl: resolvedSL > 0 ? resolvedSL : undefined,
          tp: resolvedTP > 0 ? resolvedTP : undefined, fillPrice,
        });
        if (result?.success) {
          setFeedback({ type: 'success', message: `${orderDirection} ${lots} ${activeSymbol} filled @ ${formatPrice(result.fill_price, decimals)}` });
          setSlValue(''); setTpValue(''); triggerRefresh();
        } else {
          setFeedback({ type: 'error', message: result?.error || 'Order failed' });
        }
      } else {
        // Pending order (limit, stop, or stop-limit)
        const orderPrice = parseFloat(price);
        if (!orderPrice || orderPrice <= 0) {
          setFeedback({ type: 'error', message: 'Enter a valid price for pending order' });
          setIsPlacing(false);
          return;
        }

        // Validate stop-limit orders need stop price too
        if (orderTypeDef.needsStopPrice) {
          const sp = parseFloat(stopPrice);
          if (!sp || sp <= 0) {
            setFeedback({ type: 'error', message: 'Enter a stop trigger price for stop-limit order' });
            setIsPlacing(false);
            return;
          }
        }

        const direction = orderTypeDef.forcedDirection || orderDirection;
        const result = await orderService.placePendingOrder({
          accountId: activeAccountId, symbol: activeSymbol, direction,
          orderType: toServiceOrderType(orderType), size: lots, price: orderPrice,
          sl: resolvedSL > 0 ? resolvedSL : undefined,
          tp: resolvedTP > 0 ? resolvedTP : undefined,
        });
        if (result?.success) {
          setFeedback({ type: 'success', message: `${orderTypeDef.label} ${lots} ${activeSymbol} @ ${formatPrice(orderPrice, decimals)} placed` });
          setPrice(''); setStopPrice(''); setSlValue(''); setTpValue(''); triggerRefresh();
        } else {
          setFeedback({ type: 'error', message: result?.error || 'Order failed' });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error placing order';
      setFeedback({ type: 'error', message });
    } finally {
      setIsPlacing(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  }

  // Button color based on direction
  const btnBg = isBuy ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500';
  const btnLabel = orderType === 'market'
    ? `Place ${isBuy ? 'Buy' : 'Sell'} Order`
    : `Place ${orderTypeDef.label}`;

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      {/* BUY / SELL toggle (only for market orders) */}
      {orderType === 'market' && (
        <div className="grid grid-cols-2 gap-1 rounded overflow-hidden">
          <button
            onClick={() => setOrderDirection('BUY')}
            className={cn('py-2 text-sm font-bold transition-all uppercase tracking-wider',
              isBuy ? 'bg-green-600 text-white' : 'bg-green-600/10 text-green-400 hover:bg-green-600/20')}
          >
            Buy
          </button>
          <button
            onClick={() => setOrderDirection('SELL')}
            className={cn('py-2 text-sm font-bold transition-all uppercase tracking-wider',
              !isBuy ? 'bg-red-600 text-white' : 'bg-red-600/10 text-red-400 hover:bg-red-600/20')}
          >
            Sell
          </button>
        </div>
      )}

      {/* Direction indicator for directional order types */}
      {orderType !== 'market' && orderTypeDef.forcedDirection && (
        <div className={cn('py-1.5 rounded text-center text-sm font-bold uppercase tracking-wider',
          isBuy ? 'bg-green-600/15 text-green-400 border border-green-600/30' : 'bg-red-600/15 text-red-400 border border-red-600/30')}>
          {orderTypeDef.forcedDirection} — {activeSymbol}
        </div>
      )}

      {/* Symbol */}
      <div className="text-center">
        <span className="text-base font-bold" style={{ color: '#0091D5' }}>{activeSymbol}</span>
      </div>

      {/* Bid / Ask */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded p-1.5" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div className="text-[9px] uppercase opacity-40 mb-0.5">Bid</div>
          <div className="font-mono text-base font-bold text-red-400">{bid > 0 ? formatPrice(bid, decimals) : '--'}</div>
        </div>
        <div className="rounded p-1.5" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div className="text-[9px] uppercase opacity-40 mb-0.5">Ask</div>
          <div className="font-mono text-base font-bold text-green-400">{ask > 0 ? formatPrice(ask, decimals) : '--'}</div>
        </div>
      </div>

      {/* Lot size */}
      <div>
        <label className="text-[10px] uppercase tracking-wider opacity-50 mb-1 block">Lot Size</label>
        <input type="number" value={lotSize} onChange={(e) => setLotSize(e.target.value)} step={0.01} min={0.01}
          className="w-full px-3 py-1.5 rounded text-sm font-mono outline-none border"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }} />
      </div>

      {/* Risk presets */}
      <div>
        <label className="text-[10px] uppercase tracking-wider opacity-50 mb-1 block">Risk Presets</label>
        <div className="grid grid-cols-4 gap-1">
          {[0.5, 1, 2, 5].map((pct) => (
            <button key={pct} onClick={() => applyRiskPreset(pct)}
              className="py-1 text-[10px] font-bold rounded transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: pct <= 1 ? '#00C853' : pct <= 2 ? '#FFC107' : '#FF5252' }}>
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Order Type — custom dropdown with all 7 types */}
      <div className="relative">
        <label className="text-[10px] uppercase tracking-wider opacity-50 mb-1 block">Order Type</label>
        <button
          onClick={() => setShowOrderTypes(!showOrderTypes)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded text-sm outline-none border cursor-pointer text-left"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
        >
          <span>{orderTypeDef.label}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4 }}>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {showOrderTypes && (
          <div className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden"
            style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', zIndex: 100 }}>
            {ORDER_TYPES.map((ot) => (
              <button key={ot.value} onClick={() => handleOrderTypeChange(ot.value)}
                className="w-full text-left px-3 py-2.5 transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)',
                  color: orderType === ot.value ? '#0091D5' : 'rgba(255,255,255,0.75)',
                  fontWeight: orderType === ot.value ? 600 : 400 }}>
                <div className="text-[12px]">{ot.label}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{ot.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price input (pending orders) */}
      {orderTypeDef.needsPrice && (
        <div>
          <label className="text-[10px] uppercase tracking-wider opacity-50 mb-1 block">
            {orderTypeDef.needsStopPrice ? 'Limit Price' : 'Price'}
          </label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
            step={Math.pow(10, -decimals)} placeholder={formatPrice(isBuy ? ask : bid, decimals)}
            className="w-full px-3 py-1.5 rounded text-sm font-mono outline-none border"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }} />
        </div>
      )}

      {/* Stop trigger price (stop-limit orders only) */}
      {orderTypeDef.needsStopPrice && (
        <div>
          <label className="text-[10px] uppercase tracking-wider opacity-50 mb-1 block">Stop Trigger Price</label>
          <input type="number" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)}
            step={Math.pow(10, -decimals)} placeholder={formatPrice(isBuy ? ask : bid, decimals)}
            className="w-full px-3 py-1.5 rounded text-sm font-mono outline-none border"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }} />
        </div>
      )}

      {/* SL/TP mode */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider opacity-50">SL / TP</span>
        <button onClick={() => setSlTpMode(slTpMode === 'price' ? 'pips' : 'price')}
          className="text-[10px] font-bold px-2 py-0.5 rounded transition-all"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: '#0091D5' }}>
          {slTpMode === 'price' ? 'PRICE' : 'PIPS'}
        </button>
      </div>

      {/* SL / TP inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] uppercase tracking-wider opacity-50 mb-0.5 block">Stop Loss {slTpMode === 'pips' ? '(pips)' : ''}</label>
          <input type="number" value={slValue} onChange={(e) => setSlValue(e.target.value)}
            step={slTpMode === 'pips' ? 1 : Math.pow(10, -decimals)} placeholder={slTpMode === 'pips' ? 'Pips' : 'Price'}
            className="w-full px-2 py-1.5 rounded text-sm font-mono outline-none border"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider opacity-50 mb-0.5 block">Take Profit {slTpMode === 'pips' ? '(pips)' : ''}</label>
          <input type="number" value={tpValue} onChange={(e) => setTpValue(e.target.value)}
            step={slTpMode === 'pips' ? 1 : Math.pow(10, -decimals)} placeholder={slTpMode === 'pips' ? 'Pips' : 'Price'}
            className="w-full px-2 py-1.5 rounded text-sm font-mono outline-none border"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }} />
        </div>
      </div>

      {/* Info rows */}
      <div className="flex flex-col gap-1">
        <div className="text-[11px] rounded px-2 py-1 flex justify-between" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <span className="opacity-50">Pip Value</span>
          <span className="font-mono" style={{ color: '#0091D5' }}>1 pip = ${pipValue.toFixed(2)}</span>
        </div>
        {rrRatio !== null && (
          <div className="text-[11px] rounded px-2 py-1 flex justify-between" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="opacity-50">R:R Ratio</span>
            <span className="font-mono font-bold" style={{ color: rrRatio >= 1.5 ? '#00C853' : '#FFC107' }}>1:{rrRatio.toFixed(1)}</span>
          </div>
        )}
        {riskCalc && (
          <div className="text-[11px] rounded px-2 py-1 flex justify-between" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="opacity-50">Risk</span>
            <span className="font-mono font-bold" style={{ color: riskColor }}>{riskCalc.riskPct.toFixed(1)}% (${riskCalc.riskAmount.toFixed(2)})</span>
          </div>
        )}
        <div className="text-[11px] rounded px-2 py-1 flex justify-between" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <span className="opacity-50">Margin Required</span>
          <span className="font-mono">{formatCurrency(marginEstimate)}</span>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={cn('text-xs rounded px-3 py-2 font-medium',
          feedback.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-red-600/20 text-red-400 border border-red-600/30')}>
          {feedback.message}
        </div>
      )}

      {/* Place Order button */}
      <button onClick={handlePlaceOrder} disabled={lots <= 0 || isPlacing}
        className={cn('w-full py-2.5 rounded font-bold text-sm uppercase tracking-wider transition-all text-white',
          btnBg, (lots <= 0 || isPlacing) && 'opacity-40 cursor-not-allowed')}>
        {isPlacing ? 'Placing...' : btnLabel}
      </button>
    </div>
  );
}
