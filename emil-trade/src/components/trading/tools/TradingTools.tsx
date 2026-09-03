'use client';

import { useState, useMemo } from 'react';
import { useTradingStore } from '@/stores/trading';
import { ChevronDown, ChevronUp } from 'lucide-react';

/* ─── helpers ─── */

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

const inputCls = 'w-full px-2 py-1.5 rounded text-xs font-mono outline-none border';
const inputStyle = { backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' };
const labelCls = 'text-[10px] uppercase tracking-wider opacity-40 mb-1 block';

/* ─── Collapsible Card ─── */

function CalcCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: '#0091D5' }}
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="h-1" />
          {children}
        </div>
      )}
    </div>
  );
}

function ResultRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <span className="opacity-50">{label}</span>
      <span className="font-mono font-medium" style={{ color: color ?? '#0091D5' }}>{value}</span>
    </div>
  );
}

/* ─── Pip Calculator ─── */

function PipCalculator() {
  const { activeSymbol } = useTradingStore();
  const [sym, setSym] = useState(activeSymbol);
  const [lots, setLots] = useState('1.00');

  const pipValue = useMemo(() => calcPipValue(sym, parseFloat(lots) || 0), [sym, lots]);

  return (
    <CalcCard title="Pip Calculator" defaultOpen>
      <div>
        <label className={labelCls}>Symbol</label>
        <input className={inputCls} style={inputStyle} value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} />
      </div>
      <div>
        <label className={labelCls}>Lot Size</label>
        <input type="number" className={inputCls} style={inputStyle} value={lots} onChange={(e) => setLots(e.target.value)} step={0.01} min={0.01} />
      </div>
      <ResultRow label="1 Pip Value" value={`$${pipValue.toFixed(2)}`} />
    </CalcCard>
  );
}

/* ─── Position Size Calculator ─── */

function PositionSizeCalculator() {
  const { activeSymbol, accountSummary } = useTradingStore();
  const [sym, setSym] = useState(activeSymbol);
  const [bal, setBal] = useState(String(accountSummary.balance || 10000));
  const [riskPct, setRiskPct] = useState('2');
  const [slPips, setSlPips] = useState('50');

  const result = useMemo(() => {
    const b = parseFloat(bal) || 0;
    const r = parseFloat(riskPct) || 0;
    const s = parseFloat(slPips) || 0;
    if (b <= 0 || r <= 0 || s <= 0) return { riskAmount: 0, lotSize: 0 };
    const riskAmount = b * (r / 100);
    const pipVal1Lot = calcPipValue(sym, 1);
    if (pipVal1Lot <= 0) return { riskAmount, lotSize: 0 };
    const lotSize = riskAmount / (s * pipVal1Lot);
    return { riskAmount, lotSize: Math.floor(lotSize * 100) / 100 };
  }, [sym, bal, riskPct, slPips]);

  return (
    <CalcCard title="Position Size">
      <div>
        <label className={labelCls}>Symbol</label>
        <input className={inputCls} style={inputStyle} value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} />
      </div>
      <div>
        <label className={labelCls}>Account Balance ($)</label>
        <input type="number" className={inputCls} style={inputStyle} value={bal} onChange={(e) => setBal(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Risk %</label>
        <input type="number" className={inputCls} style={inputStyle} value={riskPct} onChange={(e) => setRiskPct(e.target.value)} step={0.5} min={0.1} />
      </div>
      <div>
        <label className={labelCls}>Stop Loss (Pips)</label>
        <input type="number" className={inputCls} style={inputStyle} value={slPips} onChange={(e) => setSlPips(e.target.value)} min={1} />
      </div>
      <ResultRow label="Risk Amount" value={`$${result.riskAmount.toFixed(2)}`} />
      <ResultRow label="Recommended Lots" value={result.lotSize.toFixed(2)} color="#00C853" />
    </CalcCard>
  );
}

/* ─── Margin Calculator ─── */

function MarginCalculator() {
  const { activeSymbol, prices } = useTradingStore();
  const [sym, setSym] = useState(activeSymbol);
  const [lots, setLots] = useState('0.10');
  const [lev, setLev] = useState('500');

  const margin = useMemo(() => {
    const l = parseFloat(lots) || 0;
    const leverage = parseFloat(lev) || 100;
    const tick = prices[sym];
    const price = tick ? tick.ask : 0;
    if (l <= 0 || price <= 0) return 0;
    const contractSize = getContractSize(sym);
    return (l * contractSize * price) / leverage;
  }, [sym, lots, lev, prices]);

  return (
    <CalcCard title="Margin Calculator">
      <div>
        <label className={labelCls}>Symbol</label>
        <input className={inputCls} style={inputStyle} value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} />
      </div>
      <div>
        <label className={labelCls}>Lot Size</label>
        <input type="number" className={inputCls} style={inputStyle} value={lots} onChange={(e) => setLots(e.target.value)} step={0.01} min={0.01} />
      </div>
      <div>
        <label className={labelCls}>Leverage</label>
        <input type="number" className={inputCls} style={inputStyle} value={lev} onChange={(e) => setLev(e.target.value)} min={1} />
      </div>
      <ResultRow label="Required Margin" value={`$${margin.toFixed(2)}`} />
    </CalcCard>
  );
}

/* ─── Profit/Loss Calculator ─── */

function PnLCalculator() {
  const { activeSymbol } = useTradingStore();
  const [sym, setSym] = useState(activeSymbol);
  const [dir, setDir] = useState<'BUY' | 'SELL'>('BUY');
  const [lots, setLots] = useState('0.10');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');

  const pnl = useMemo(() => {
    const l = parseFloat(lots) || 0;
    const en = parseFloat(entry) || 0;
    const ex = parseFloat(exit) || 0;
    if (l <= 0 || en <= 0 || ex <= 0) return null;
    const contractSize = getContractSize(sym);
    const pipSize = getPipSize(sym);
    const pips = dir === 'BUY' ? (ex - en) / pipSize : (en - ex) / pipSize;
    const pipVal = calcPipValue(sym, l);
    return { pips, amount: pips * pipVal };
  }, [sym, dir, lots, entry, exit]);

  return (
    <CalcCard title="Profit/Loss Calculator">
      <div>
        <label className={labelCls}>Symbol</label>
        <input className={inputCls} style={inputStyle} value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} />
      </div>
      <div>
        <label className={labelCls}>Direction</label>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setDir('BUY')}
            className="py-1.5 text-xs font-bold rounded uppercase"
            style={{
              backgroundColor: dir === 'BUY' ? 'rgba(0,200,83,0.3)' : 'var(--bg-primary)',
              color: dir === 'BUY' ? '#00C853' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${dir === 'BUY' ? 'rgba(0,200,83,0.4)' : 'var(--border)'}`,
            }}
          >
            Buy
          </button>
          <button
            onClick={() => setDir('SELL')}
            className="py-1.5 text-xs font-bold rounded uppercase"
            style={{
              backgroundColor: dir === 'SELL' ? 'rgba(255,82,82,0.3)' : 'var(--bg-primary)',
              color: dir === 'SELL' ? '#FF5252' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${dir === 'SELL' ? 'rgba(255,82,82,0.4)' : 'var(--border)'}`,
            }}
          >
            Sell
          </button>
        </div>
      </div>
      <div>
        <label className={labelCls}>Lot Size</label>
        <input type="number" className={inputCls} style={inputStyle} value={lots} onChange={(e) => setLots(e.target.value)} step={0.01} min={0.01} />
      </div>
      <div>
        <label className={labelCls}>Entry Price</label>
        <input type="number" className={inputCls} style={inputStyle} value={entry} onChange={(e) => setEntry(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Exit Price</label>
        <input type="number" className={inputCls} style={inputStyle} value={exit} onChange={(e) => setExit(e.target.value)} />
      </div>
      {pnl !== null && (
        <>
          <ResultRow label="Pips" value={pnl.pips.toFixed(1)} color={pnl.pips >= 0 ? '#00C853' : '#FF5252'} />
          <ResultRow label="P&L" value={`${pnl.amount >= 0 ? '+' : ''}$${pnl.amount.toFixed(2)}`} color={pnl.amount >= 0 ? '#00C853' : '#FF5252'} />
        </>
      )}
    </CalcCard>
  );
}

/* ─── Risk/Reward Calculator ─── */

function RiskRewardCalculator() {
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');

  const result = useMemo(() => {
    const en = parseFloat(entry) || 0;
    const s = parseFloat(sl) || 0;
    const t = parseFloat(tp) || 0;
    if (en <= 0 || s <= 0 || t <= 0) return null;
    const risk = Math.abs(en - s);
    const reward = Math.abs(t - en);
    if (risk <= 0) return null;
    const rr = reward / risk;
    const reqWinRate = 1 / (1 + rr) * 100;
    return { rr, reqWinRate };
  }, [entry, sl, tp]);

  return (
    <CalcCard title="Risk/Reward Calculator">
      <div>
        <label className={labelCls}>Entry Price</label>
        <input type="number" className={inputCls} style={inputStyle} value={entry} onChange={(e) => setEntry(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Stop Loss</label>
        <input type="number" className={inputCls} style={inputStyle} value={sl} onChange={(e) => setSl(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Take Profit</label>
        <input type="number" className={inputCls} style={inputStyle} value={tp} onChange={(e) => setTp(e.target.value)} />
      </div>
      {result !== null && (
        <>
          <ResultRow label="R:R Ratio" value={`1:${result.rr.toFixed(1)}`} color="#0091D5" />
          <ResultRow label="Min Win Rate" value={`${result.reqWinRate.toFixed(1)}%`} />
        </>
      )}
    </CalcCard>
  );
}

/* ─── Main Export ─── */

export default function TradingTools() {
  return (
    <div className="flex flex-col p-3 gap-2">
      <PipCalculator />
      <PositionSizeCalculator />
      <MarginCalculator />
      <PnLCalculator />
      <RiskRewardCalculator />
    </div>
  );
}
