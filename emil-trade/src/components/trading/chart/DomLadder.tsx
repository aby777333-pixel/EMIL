'use client';

import HeaderPortal from './HeaderPortal';
import { headerBtnStyle } from './header-theme';

// DOM / Level-2 price ladder (super-prompt §12). A cTrader-style click-to-trade
// ladder built from REAL top-of-book bid/ask (we don't fabricate depth). Each
// price level is a real market level; clicking BUY/SELL at a level places a real
// pending order (limit below / stop above the market) via the order service, or
// a market order at the touched market row. Your own working orders and open
// position are marked at their price levels. Lives in the shared header, so it
// works over BOTH the TradingView and RAPTOR charts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlignJustify, ChevronDown, X } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';

interface Tick { bid: number; ask: number; mid?: number; spread?: number }
interface WorkingOrder { id: string; direction: string; order_type: string; size: number; price: number }
interface OpenPos { id: string; direction: string; size: number; open_price: number }

const LEVELS = 10; // rows above and below the market (=> 2*LEVELS+1 rows)

function digitsFor(symbol: string, bid: number): number {
  if (['USDJPY', 'EURJPY', 'GBPJPY'].includes(symbol)) return 3;
  if (symbol.startsWith('XAU') || symbol.startsWith('ETH')) return 2;
  if (symbol === 'XAGUSD' || symbol === 'NATGAS') return 3;
  if (symbol.startsWith('BTC') || symbol === 'US30' || symbol === 'NAS100' || symbol === 'SPX500') return 1;
  if (symbol === 'USOIL' || symbol === 'UKOIL') return 2;
  return bid != null && bid >= 500 ? 2 : 5;
}

export default function DomLadder({
  activeSymbol, prices, onToast,
}: {
  activeSymbol: string;
  prices: Record<string, Tick | undefined>;
  onToast: (msg: string) => void;
}) {
  const accountId = useTradingStore((s) => s.activeAccountId);
  const triggerRefresh = useTradingStore((s) => s.triggerRefresh);
  const refreshPositions = useTradingStore((s) => s.refreshPositions);

  const [open, setOpen] = useState(false);
  const [lot, setLot] = useState('0.10');
  const [orders, setOrders] = useState<WorkingOrder[]>([]);
  const [positions, setPositions] = useState<OpenPos[]>([]);
  const [placing, setPlacing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const t = prices[activeSymbol];
  const bid = t?.bid, ask = t?.ask;
  const digits = digitsFor(activeSymbol, bid ?? 0);
  const step = Math.pow(10, -(Math.max(1, digits) - 1)); // 1-pip ladder step

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Load this symbol's working orders + open position when open / after a trade.
  const loadBook = useCallback(async () => {
    if (!accountId) { setOrders([]); setPositions([]); return; }
    try {
      const [ords, poss] = await Promise.all([
        orderService.getPendingOrders(accountId),
        orderService.getOpenPositions(accountId),
      ]);
      setOrders(((ords as WorkingOrder[]) || []).filter((o) => (o as unknown as { symbol: string }).symbol === activeSymbol));
      setPositions(((poss as OpenPos[]) || []).filter((p) => (p as unknown as { symbol: string }).symbol === activeSymbol));
    } catch { /* signed-out — ladder still shows the market */ }
  }, [accountId, activeSymbol]);

  useEffect(() => { if (open) loadBook(); }, [open, loadBook, refreshPositions]);

  // Build the ladder rows around the mid.
  const rows = useMemo(() => {
    if (bid == null || ask == null) return [] as { price: number }[];
    const mid = (bid + ask) / 2;
    const center = Math.round(mid / step) * step;
    const out: { price: number }[] = [];
    for (let i = LEVELS; i >= -LEVELS; i--) {
      out.push({ price: +(center + i * step).toFixed(digits) });
    }
    return out;
  }, [bid, ask, step, digits]);

  // Center the scroll on the market once populated / opened.
  useEffect(() => {
    if (!open || !bodyRef.current) return;
    const el = bodyRef.current;
    requestAnimationFrame(() => { el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; });
  }, [open, rows.length]);

  const place = useCallback(async (side: 'BUY' | 'SELL', price: number) => {
    if (!accountId) { onToast('Select a trading account first'); return; }
    if (bid == null || ask == null) { onToast(`No live price for ${activeSymbol}`); return; }
    const size = parseFloat(lot);
    if (!(size > 0)) { onToast('Enter a valid lot size'); return; }
    const atMarket = Math.abs(price - (side === 'BUY' ? ask : bid)) < step / 2;
    setPlacing(true);
    try {
      if (atMarket) {
        await orderService.placeMarketOrder({ accountId, symbol: activeSymbol, direction: side, size, fillPrice: side === 'BUY' ? ask : bid, comment: 'DOM' });
        onToast(`✓ ${side} ${size} ${activeSymbol} @ market`);
      } else {
        // Buy below market = limit, above = stop. Sell above = limit, below = stop.
        const orderType: 'limit' | 'stop' = side === 'BUY'
          ? (price < ask ? 'limit' : 'stop')
          : (price > bid ? 'limit' : 'stop');
        await orderService.placePendingOrder({ accountId, symbol: activeSymbol, direction: side, orderType, size, price, comment: 'DOM' });
        onToast(`✓ ${side} ${orderType} ${size} ${activeSymbol} @ ${price.toFixed(digits)}`);
      }
      triggerRefresh();
      loadBook();
    } catch (err) {
      onToast(`Order failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPlacing(false);
    }
  }, [accountId, activeSymbol, bid, ask, lot, step, digits, onToast, triggerRefresh, loadBook]);

  const cancel = useCallback(async (id: string) => {
    setPlacing(true);
    try { await orderService.cancelOrder(id); onToast('✓ Order cancelled'); triggerRefresh(); loadBook(); }
    catch (err) { onToast(`Cancel failed: ${err instanceof Error ? err.message : String(err)}`); }
    finally { setPlacing(false); }
  }, [onToast, triggerRefresh, loadBook]);

  const orderAt = (price: number, side: 'BUY' | 'SELL') =>
    orders.find((o) => o.direction === side && Math.abs(o.price - price) < step / 2);
  const posAt = (price: number) => positions.find((p) => Math.abs(p.open_price - price) < step / 2);

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="DOM — click-to-trade price ladder"
        className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
        style={headerBtnStyle('dom', open)}
      >
        <AlignJustify size={12} /> <span className="hidden 2xl:inline">DOM</span> <ChevronDown size={10} />
      </button>
      <HeaderPortal open={open} anchorRef={ref}>
        <div className="w-[280px] rounded-lg border shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-[12px] font-bold text-white">{activeSymbol}</span>
            <span className="text-[9px] text-white/40">spread {bid != null && ask != null ? ((ask - bid) / step).toFixed(1) : '—'}p</span>
          </div>
          {/* Lot row */}
          <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <label className="text-[10px] text-white/45">Lots</label>
            <input value={lot} onChange={(e) => setLot(e.target.value)} inputMode="decimal"
              className="w-16 rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-white outline-none" />
            <span className="ml-auto text-[9px] text-white/30">Buy ▏ Price ▏ Sell</span>
          </div>
          {/* Column labels */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-px px-3 pt-1 text-[8px] uppercase tracking-wide text-white/25">
            <span className="text-center">Buy</span><span className="px-2 text-center">Price</span><span className="text-center">Sell</span>
          </div>
          {/* Ladder */}
          <div ref={bodyRef} className="max-h-[320px] overflow-y-auto px-2 py-1">
            {rows.length === 0 && <div className="py-6 text-center text-[10px] text-white/30">Waiting for live price…</div>}
            {rows.map(({ price }) => {
              const isAsk = ask != null && Math.abs(price - Math.round(ask / step) * step) < step / 2;
              const isBid = bid != null && Math.abs(price - Math.round(bid / step) * step) < step / 2;
              const buyOrd = orderAt(price, 'BUY');
              const sellOrd = orderAt(price, 'SELL');
              const pos = posAt(price);
              return (
                <div key={price} className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-px" style={{ height: 20 }}>
                  {/* BUY cell */}
                  <button
                    disabled={placing}
                    onClick={() => buyOrd ? cancel(buyOrd.id) : place('BUY', price)}
                    className="flex items-center justify-center rounded-sm text-[9px] font-mono transition-colors hover:brightness-125 disabled:opacity-50"
                    style={{ backgroundColor: buyOrd ? 'rgba(0,194,122,0.35)' : 'rgba(0,194,122,0.08)', color: buyOrd ? '#00C27A' : 'rgba(0,194,122,0.55)' }}
                    title={buyOrd ? 'Cancel this working buy order' : `Buy at ${price.toFixed(digits)}`}
                  >
                    {buyOrd ? `✕ ${buyOrd.size}` : 'Buy'}
                  </button>
                  {/* Price cell */}
                  <div
                    className="flex items-center justify-center px-2 font-mono text-[10px]"
                    style={{
                      minWidth: 78,
                      backgroundColor: isAsk ? 'rgba(193,18,31,0.18)' : isBid ? 'rgba(0,194,122,0.18)' : 'transparent',
                      color: isAsk ? '#FF7A7A' : isBid ? '#4ADE9A' : pos ? '#0091D5' : 'rgba(255,255,255,0.7)',
                      fontWeight: isAsk || isBid || pos ? 700 : 400,
                    }}
                    title={pos ? `Open ${pos.direction} ${pos.size} @ ${pos.open_price}` : ''}
                  >
                    {pos ? '◆ ' : ''}{price.toFixed(digits)}
                  </div>
                  {/* SELL cell */}
                  <button
                    disabled={placing}
                    onClick={() => sellOrd ? cancel(sellOrd.id) : place('SELL', price)}
                    className="flex items-center justify-center rounded-sm text-[9px] font-mono transition-colors hover:brightness-125 disabled:opacity-50"
                    style={{ backgroundColor: sellOrd ? 'rgba(193,18,31,0.35)' : 'rgba(193,18,31,0.08)', color: sellOrd ? '#FF5252' : 'rgba(255,82,82,0.55)' }}
                    title={sellOrd ? 'Cancel this working sell order' : `Sell at ${price.toFixed(digits)}`}
                  >
                    {sellOrd ? `✕ ${sellOrd.size}` : 'Sell'}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t px-3 py-1.5 text-[8px] text-white/30" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span>◆ position · ✕ working order · click Buy/Sell to trade (limit/stop away from market)</span>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X size={12} /></button>
          </div>
        </div>
      </HeaderPortal>
    </div>
  );
}
