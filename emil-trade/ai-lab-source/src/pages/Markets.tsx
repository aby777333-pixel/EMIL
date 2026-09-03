import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
} from 'recharts';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Card, Badge, Skeleton, Modal, fmtPct, fmtMoney } from '../components/ui';
import { useMarkets, useMarketData } from '../hooks/useApi';
import { useStore } from '../store';
import type { MarketTick } from '../types';

const TABS = ['All', 'Forex', 'Stocks', 'Crypto', 'Indices', 'Metals', 'Energies', 'Indian', 'CFDs'];

export default function Markets() {
  const { data, isLoading } = useMarkets();
  const liveTicks = useStore((s) => s.ticks);
  const [tab, setTab] = useState('All');
  const [selected, setSelected] = useState<string | null>(null);

  const ticks = useMemo<MarketTick[]>(() => {
    const base = data?.symbols || [];
    const merged = base.map((t) => liveTicks[t.symbol] || t);
    return tab === 'All' ? merged : merged.filter((t) => t.group === tab);
  }, [data, liveTicks, tab]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Markets</h2>
          <p className="text-sm text-subtext">
            Live market data via the Raptor Market API (Finnhub · EODHD · Twelve Data · Yahoo · Binance).
            Falls back to simulated ticks if the feed is unavailable. Trade execution stays simulated.
          </p>
        </div>
        <Link to="/explore" className="btn-primary !py-1.5 shrink-0">
          <Search size={15} /> Search any instrument
        </Link>
      </div>

      <div className="flex gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t
                ? 'bg-primary/15 text-primary border border-primary/40'
                : 'text-subtext border border-border hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {ticks.map((t) => (
            <SymbolCard key={t.symbol} tick={t} onClick={() => setSelected(t.symbol)} />
          ))}
        </div>
      )}

      <SymbolModal symbol={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SymbolCard({ tick, onClick }: { tick: MarketTick; onClick: () => void }) {
  const up = tick.change_pct >= 0;
  const spark = useMemo(() => {
    // deterministic-ish sparkline from price
    const pts = [];
    let v = tick.prev_close;
    for (let i = 0; i < 20; i++) {
      v += (Math.random() - 0.5) * tick.price * 0.006;
      pts.push({ i, v });
    }
    pts.push({ i: 20, v: tick.price });
    return pts;
  }, [tick.symbol, tick.price]);

  return (
    <Card className="glass-hover !p-3 flex flex-col gap-1.5" onClick={onClick}>
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">{tick.symbol}</span>
        <Badge className="!text-[9px] border border-border text-subtext bg-bg">{tick.group}</Badge>
      </div>
      <div className="h-9">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={up ? '#00ff88' : '#ff4444'}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-end justify-between">
        <span className="font-mono font-bold">{tick.price}</span>
        <span className={`font-mono text-xs font-semibold ${up ? 'text-success' : 'text-danger'}`}>
          {fmtPct(tick.change_pct)}
        </span>
      </div>
    </Card>
  );
}

function SymbolModal({ symbol, onClose }: { symbol: string | null; onClose: () => void }) {
  const [tf, setTf] = useState('1H');
  const { data, isLoading } = useMarketData(symbol || '', tf);

  const candles = useMemo(() => {
    return (data?.candles || []).slice(-90).map((c, i) => ({
      i,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      // encode candle as [low, high] wick and body via composed rendering
      range: [c.low, c.high],
      body: [Math.min(c.open, c.close), Math.max(c.open, c.close)],
      up: c.close >= c.open,
    }));
  }, [data]);

  const TFS = ['15M', '1H', '4H', '1D'];

  return (
    <Modal open={!!symbol} onClose={onClose} wide title={<span className="font-mono">{symbol}</span>}>
      <div className="flex gap-1 mb-3">
        {TFS.map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              tf === t ? 'bg-primary/15 text-primary border border-primary/40' : 'text-subtext border border-border'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={candles} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
            <XAxis dataKey="i" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} orientation="right" />
            <Tooltip
              contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any, name: string) => {
                if (Array.isArray(v)) return [`${fmtMoney(v[0])} – ${fmtMoney(v[1])}`, name];
                return [fmtMoney(v), name];
              }}
            />
            {/* wick */}
            <Bar dataKey="range" barSize={1.5} shape={(p: any) => <CandleShape {...p} wick />} isAnimationActive={false} />
            {/* body */}
            <Bar dataKey="body" shape={(p: any) => <CandleShape {...p} />} isAnimationActive={false} />
            <Line type="monotone" dataKey="close" stroke="#00d4ff" strokeWidth={1} dot={false} opacity={0.35} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <p className="text-[11px] text-subtext mt-2">
        Candlestick chart (OHLC) rendered with Recharts ComposedChart. Green = up bar, red = down bar.
      </p>
    </Modal>
  );
}

function CandleShape(props: any) {
  const { x, y, width, height, payload, wick } = props;
  const color = payload.up ? '#00ff88' : '#ff4444';
  if (wick) {
    return <rect x={x + width / 2 - 0.75} y={y} width={1.5} height={Math.max(height, 1)} fill={color} opacity={0.7} />;
  }
  return <rect x={x} y={y} width={width} height={Math.max(height, 1)} fill={color} rx={1} />;
}
