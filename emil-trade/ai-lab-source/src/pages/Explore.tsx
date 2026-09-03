import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Search, Loader2, Star, Brain, Blocks, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, SectionTitle, Badge, fmtMoney } from '../components/ui';
import { useStore } from '../store';

interface Result { symbol: string; name: string; exchange: string; type: string; currency: string; country: string }
interface Quote { symbol: string; price: number; prev_close: number; change: number; change_pct: number; currency: string; asset_class: string; source: string }
interface Candle { time: string; open: number; high: number; low: number; close: number; volume: number }

const POPULAR = ['AAPL', 'EURUSD', 'NIFTY50', 'BTCUSDT', 'GOLD', 'RELIANCE.NSE', 'TSLA.US', 'SENSEX'];
const TFS = [{ k: '1D', label: '1D' }, { k: '1h', label: '1H' }];
const WATCH_KEY = 'raptor_lab_watchlist';

export default function Explore() {
  const navigate = useNavigate();
  const pushToast = useStore((s) => s.pushToast);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [sel, setSel] = useState<Result | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [tf, setTf] = useState('1D');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [watch, setWatch] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '[]'); } catch { return []; }
  });

  const boxRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 1) { setResults([]); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/market/search?q=${encodeURIComponent(q.trim())}`);
        const d = await r.json();
        setResults(d.results || []);
        setShowResults(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 260);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowResults(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const loadSymbol = async (symbol: string, meta?: Result) => {
    setSel(meta || { symbol, name: symbol, exchange: '', type: '', currency: '', country: '' });
    setShowResults(false);
    setQ('');
    setLoading(true);
    setErr('');
    try {
      const [qr, cr] = await Promise.all([
        fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}&bars=120`).then((r) => r.ok ? r.json() : null),
      ]);
      if (qr && !qr.error) setQuote(qr); else { setQuote(null); setErr('No live quote for this instrument.'); }
      setCandles(cr?.candles || []);
    } catch { setErr('Feed unavailable. Try again.'); }
    finally { setLoading(false); }
  };

  // Refetch candles on timeframe change
  useEffect(() => {
    if (!sel) return;
    let alive = true;
    fetch(`/api/market/candles?symbol=${encodeURIComponent(sel.symbol)}&tf=${tf}&bars=120`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (alive) setCandles(d?.candles || []); })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tf]);

  const toggleWatch = (symbol: string) => {
    setWatch((w) => {
      const next = w.includes(symbol) ? w.filter((x) => x !== symbol) : [...w, symbol];
      try { localStorage.setItem(WATCH_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const chartData = useMemo(() => candles.map((c, i) => ({ i, close: c.close, t: c.time })), [candles]);
  const up = (quote?.change ?? 0) >= 0;
  const digits = quote && quote.price < 5 ? 4 : 2;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Explore Instruments</h2>
        <p className="text-sm text-subtext">
          Search any stock, currency pair, index or crypto worldwide, then analyse it — live quote, chart, and
          one click to run the agents or build a strategy on it.
        </p>
      </div>

      {/* Search box */}
      <div className="relative" ref={boxRef}>
        <div className="flex items-center gap-2 glass !rounded-xl px-3 py-2.5 border border-border focus-within:border-primary/50">
          <Search size={18} className="text-subtext shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder="Search stocks, forex, indices, crypto — e.g. Apple, EURUSD, NIFTY, Bitcoin, Reliance…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setShowResults(true)}
          />
          {searching && <Loader2 size={15} className="animate-spin text-primary shrink-0" />}
          {q && <button onClick={() => { setQ(''); setResults([]); }} className="text-subtext hover:text-text"><X size={15} /></button>}
        </div>

        {showResults && results.length > 0 && (
          <div className="absolute z-40 mt-1 w-full glass !rounded-xl border border-border shadow-2xl max-h-80 overflow-auto">
            {results.map((r) => (
              <button
                key={r.symbol}
                onClick={() => loadSymbol(r.symbol, r)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-border/30 transition-colors border-b border-border/30 last:border-0"
              >
                <span className="font-mono text-xs font-bold text-primary w-28 shrink-0 truncate">{r.symbol}</span>
                <span className="flex-1 text-xs truncate">{r.name}</span>
                <span className="text-[10px] text-subtext shrink-0">{r.type}</span>
                {r.currency && <span className="badge border border-border text-subtext bg-bg text-[9px] shrink-0">{r.currency}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-subtext uppercase tracking-wide mr-1">Popular</span>
        {POPULAR.map((s) => (
          <button key={s} onClick={() => loadSymbol(s)} className="badge border border-border text-subtext bg-bg hover:border-primary/50 hover:text-primary transition-colors">
            {s}
          </button>
        ))}
      </div>

      {/* Watchlist */}
      {watch.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-subtext uppercase tracking-wide mr-1">Watchlist</span>
          {watch.map((s) => (
            <button key={s} onClick={() => loadSymbol(s)} className="badge border border-warning/40 text-warning bg-warning/5 hover:brightness-125 transition-all">
              <Star size={10} /> {s}
            </button>
          ))}
        </div>
      )}

      {/* Analysis panel */}
      {sel && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold truncate">{sel.name}</span>
                  {quote && <Badge status={up ? 'APPROVED' : 'REJECTED'}>{up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{quote.change_pct >= 0 ? '+' : ''}{quote.change_pct}%</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-subtext mt-0.5">
                  <span className="font-mono">{sel.symbol}</span>
                  {sel.exchange && <span>· {sel.exchange}</span>}
                  {sel.type && <span>· {sel.type}</span>}
                </div>
              </div>
              <button onClick={() => toggleWatch(sel.symbol)} title="Watchlist"
                className={`p-2 rounded-lg transition-colors ${watch.includes(sel.symbol) ? 'text-warning' : 'text-subtext hover:text-text'}`}>
                <Star size={16} fill={watch.includes(sel.symbol) ? '#facc15' : 'none'} />
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-subtext"><Loader2 className="animate-spin inline" size={20} /> Loading…</div>
            ) : (
              <>
                {quote ? (
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-3xl font-bold font-mono">{fmtMoney(quote.price, digits)}</span>
                    <span className={`text-sm font-mono mb-1 ${up ? 'text-success' : 'text-danger'}`}>
                      {quote.change >= 0 ? '+' : ''}{fmtMoney(quote.change, digits)} ({quote.change_pct >= 0 ? '+' : ''}{quote.change_pct}%)
                    </span>
                    <span className="text-[10px] text-subtext mb-1.5 ml-auto">{quote.currency} · via {quote.source}</span>
                  </div>
                ) : (
                  <div className="text-xs text-danger mb-2">{err || 'No quote available.'}</div>
                )}

                <div className="flex gap-1 mb-2">
                  {TFS.map((t) => (
                    <button key={t.k} onClick={() => setTf(t.k)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${tf === t.k ? 'bg-primary/15 text-primary border border-primary/40' : 'text-subtext border border-border'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div style={{ height: 240 }}>
                  {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="exQ" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={up ? '#00ff88' : '#ff4444'} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={up ? '#00ff88' : '#ff4444'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" />
                        <XAxis dataKey="i" tick={false} axisLine={{ stroke: '#1e2d4a' }} />
                        <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} width={56} />
                        <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 12 }}
                          labelFormatter={() => ''} formatter={(v: any) => [fmtMoney(Number(v), digits), 'Close']} />
                        <Area type="monotone" dataKey="close" stroke={up ? '#00ff88' : '#ff4444'} fill="url(#exQ)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-subtext">No chart data for this instrument.</div>
                  )}
                </div>
              </>
            )}
          </Card>

          {/* Actions + stats */}
          <Card>
            <SectionTitle>Analyse</SectionTitle>
            <div className="flex flex-col gap-2">
              <button className="btn-primary justify-center" onClick={() => { pushToast({ type: 'info', message: `Briefing agents on ${sel.symbol}` }); navigate('/pipeline'); }}>
                <Brain size={15} /> Analyse with 15 agents
              </button>
              <button className="btn-ghost justify-center" onClick={() => { pushToast({ type: 'info', message: `Opening builder for ${sel.symbol}` }); navigate('/builder'); }}>
                <Blocks size={15} /> Build a strategy
              </button>
              <button className="btn-ghost justify-center" onClick={() => toggleWatch(sel.symbol)}>
                <Star size={15} /> {watch.includes(sel.symbol) ? 'Remove from' : 'Add to'} watchlist
              </button>
            </div>

            {candles.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat label="Open" value={fmtMoney(candles[candles.length - 1].open, digits)} />
                <Stat label="High" value={fmtMoney(Math.max(...candles.slice(-1).map(c => c.high)), digits)} color="#00ff88" />
                <Stat label="Low" value={fmtMoney(Math.min(...candles.slice(-1).map(c => c.low)), digits)} color="#ff4444" />
                <Stat label="Prev Close" value={quote ? fmtMoney(quote.prev_close, digits) : '—'} />
              </div>
            )}
            <p className="text-[10px] text-subtext mt-3">
              Data via the Raptor Market API. Analysis is simulated (demo) — no live orders.
            </p>
          </Card>
        </div>
      )}

      {!sel && (
        <Card>
          <div className="py-10 text-center text-subtext text-sm">
            Search above or pick a popular instrument to see a live quote, chart and analysis actions.
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass !rounded-lg p-2.5 border border-border">
      <div className="text-[10px] text-subtext uppercase tracking-wide">{label}</div>
      <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}
