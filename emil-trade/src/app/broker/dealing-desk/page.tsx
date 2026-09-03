'use client';

import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, ArrowUpDown, Check, X, Clock, Zap } from 'lucide-react';

/* ───────────── Types ───────────── */
interface TradeEvent {
  id: string;
  action: 'Open Buy' | 'Open Sell' | 'Close Buy' | 'Close Sell';
  client: string;
  symbol: string;
  size: number;
  price: number;
  status: 'pending' | 'filled' | 'rejected' | 'delayed';
  route: 'A' | 'B' | '—';
  time: string;
}

interface SymbolExposure {
  symbol: string;
  longLots: number;
  shortLots: number;
  netLots: number;
  netUsd: number;
}

/* ───────────── Mock generators ───────────── */
const SYMBOLS = ['EURUSD', 'XAUUSD', 'GBPUSD', 'BTCUSD', 'USDJPY', 'NAS100', 'USOIL', 'US30'];

function mockTrade(i: number): TradeEvent {
  const actions: TradeEvent['action'][] = ['Open Buy', 'Open Sell', 'Close Buy', 'Close Sell'];
  const sym = SYMBOLS[i % SYMBOLS.length];
  const sizes = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5];
  const now = new Date();
  return {
    id: `t-${Date.now()}-${i}`,
    action: actions[i % 4],
    client: `ACC-${6200000 + Math.floor(Math.random() * 9999)}`,
    symbol: sym,
    size: sizes[i % sizes.length],
    price: sym === 'XAUUSD' ? 2340 + Math.random() * 20 : sym === 'BTCUSD' ? 68000 + Math.random() * 2000 : 1.04 + Math.random() * 0.01,
    status: i % 7 === 0 ? 'pending' : 'filled',
    route: i % 3 === 0 ? 'A' : 'B',
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds() - i).padStart(2, '0')}`,
  };
}

function calcExposure(): SymbolExposure[] {
  return SYMBOLS.map(sym => {
    const longLots = Math.round(Math.random() * 50 * 100) / 100;
    const shortLots = Math.round(Math.random() * 50 * 100) / 100;
    const net = Math.round((longLots - shortLots) * 100) / 100;
    const multiplier = sym === 'XAUUSD' ? 100 : sym === 'BTCUSD' ? 1 : sym.includes('US') ? 10 : 100000;
    return { symbol: sym, longLots, shortLots, netLots: net, netUsd: Math.round(net * multiplier) };
  });
}

/* ═══════════════════════════════════════════ */
/*   Dealing Desk — Simple. Not "smart."     */
/* ═══════════════════════════════════════════ */
export default function DealingDeskPage() {
  const [trades, setTrades] = useState<TradeEvent[]>(() => Array.from({ length: 20 }, (_, i) => mockTrade(i)));
  const [exposure] = useState<SymbolExposure[]>(calcExposure);
  const listRef = useRef<HTMLDivElement>(null);

  /* Live feed — new trade every 2.5s */
  useEffect(() => {
    let c = 20;
    const iv = setInterval(() => {
      setTrades(prev => [mockTrade(c++), ...prev].slice(0, 60));
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  const pendingOrders = trades.filter(t => t.status === 'pending');

  const handleApprove = (id: string) => {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, status: 'filled' as const } : t));
  };
  const handleReject = (id: string) => {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected' as const } : t));
  };
  const handleDelay = (id: string) => {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, status: 'delayed' as const } : t));
  };

  return (
    <div className="p-5 space-y-4" style={{ background: 'var(--bg-primary)' }}>
      <div>
        <h1 className="text-lg font-bold text-white">Dealing Desk</h1>
        <p className="text-[11px] text-white/30">Live trade feed. Manual controls. Exposure. Hedge.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* ─── LEFT: Live Trade Feed + Manual Controls ─── */}
        <div className="space-y-4">
          {/* Manual Controls — pending orders */}
          {pendingOrders.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: '#f59e0b30', background: '#f59e0b08' }}>
              <div className="text-xs font-semibold text-[#f59e0b] uppercase tracking-wider">
                {pendingOrders.length} Pending — Manual Review
              </div>
              {pendingOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.action.includes('Buy') ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
                    {order.action}
                  </span>
                  <span className="text-xs font-mono text-white">{order.symbol}</span>
                  <span className="text-xs font-mono text-white/40">{order.size} lots</span>
                  <span className="text-[10px] text-white/25">{order.client}</span>
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => handleApprove(order.id)} className="p-1.5 rounded bg-[#00dc82]/10 hover:bg-[#00dc82]/20 text-[#00dc82]" title="Approve">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleReject(order.id)} className="p-1.5 rounded bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444]" title="Reject">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelay(order.id)} className="p-1.5 rounded bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#f59e0b]" title="Delay">
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Live Trade Feed */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Live Trade Feed</span>
              <span className="text-[10px] text-white/20">{trades.length} events</span>
            </div>
            <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 460 }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-white/25 uppercase text-[10px] tracking-wider" style={{ background: 'var(--bg-elevated)' }}>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-2 py-2 text-left">Symbol</th>
                    <th className="px-2 py-2 text-right">Size</th>
                    <th className="px-2 py-2 text-right">Price</th>
                    <th className="px-2 py-2 text-left">Client</th>
                    <th className="px-2 py-2 text-center">Route</th>
                    <th className="px-2 py-2 text-center">Status</th>
                    <th className="px-2 py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, idx) => (
                    <tr key={t.id + idx} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border)', animation: idx === 0 ? 'fadeSlide .3s ease-out' : undefined }}>
                      <td className="px-3 py-1.5">
                        <span className={`text-[10px] font-bold ${t.action.includes('Buy') ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>{t.action}</span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-white/70">{t.symbol}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-white/50">{t.size}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-white/40">{t.price.toFixed(t.symbol === 'BTCUSD' ? 0 : t.symbol === 'XAUUSD' ? 2 : 5)}</td>
                      <td className="px-2 py-1.5 text-white/30">{t.client}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${t.route === 'A' ? 'bg-[#00b4ff]/10 text-[#00b4ff]' : 'bg-white/5 text-white/30'}`}>{t.route}</span>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          t.status === 'filled' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                          t.status === 'rejected' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                          t.status === 'delayed' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                          'bg-white/5 text-white/30'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-white/25">{t.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Exposure + One-Click Hedge ─── */}
        <div className="space-y-4">
          {/* Exposure View */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
              <ArrowUpDown className="w-3.5 h-3.5 text-white/30" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Net Exposure</span>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-white/20 text-[10px] uppercase" style={{ background: 'var(--bg-elevated)' }}>
                  <th className="px-3 py-2 text-left">Symbol</th>
                  <th className="px-2 py-2 text-right">Long</th>
                  <th className="px-2 py-2 text-right">Short</th>
                  <th className="px-2 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-center">Hedge</th>
                </tr>
              </thead>
              <tbody>
                {exposure.map(e => (
                  <tr key={e.symbol} className="border-b hover:bg-white/[0.02]" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-3 py-2 font-mono font-medium text-white/70">{e.symbol}</td>
                    <td className="px-2 py-2 text-right font-mono text-[#00dc82]/60">{e.longLots.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-mono text-[#ef4444]/60">{e.shortLots.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">
                      <span className={`font-mono font-bold ${e.netLots >= 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
                        {e.netLots >= 0 ? '+' : ''}{e.netLots.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {Math.abs(e.netLots) > 1 ? (
                        <button className="text-[9px] px-2 py-1 rounded bg-[#00b4ff]/10 text-[#00b4ff] hover:bg-[#00b4ff]/20 font-medium transition-colors">
                          <Zap className="w-3 h-3 inline mr-0.5" />Hedge
                        </button>
                      ) : (
                        <span className="text-[9px] text-white/15">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Card */}
          <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Risk Summary
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-black/20 rounded-lg p-2.5">
                <div className="text-[10px] text-white/25 mb-0.5">Total Gross</div>
                <div className="text-sm font-mono font-bold text-white">
                  {exposure.reduce((s, e) => s + e.longLots + e.shortLots, 0).toFixed(1)} lots
                </div>
              </div>
              <div className="bg-black/20 rounded-lg p-2.5">
                <div className="text-[10px] text-white/25 mb-0.5">High Risk</div>
                <div className="text-sm font-mono font-bold text-[#f59e0b]">
                  {exposure.filter(e => Math.abs(e.netLots) > 10).length} symbols
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeSlide { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
