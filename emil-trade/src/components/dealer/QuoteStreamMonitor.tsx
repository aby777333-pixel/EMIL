'use client';

import { useState, useEffect } from 'react';
import { Wifi, Activity } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SymbolQuality {
  symbol: string;
  quality: number; // 0-100
  gaps: number;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const INITIAL_SYMBOLS: SymbolQuality[] = [
  { symbol: 'EURUSD', quality: 100, gaps: 0 },
  { symbol: 'XAUUSD', quality: 95, gaps: 2 },
  { symbol: 'BTCUSD', quality: 82, gaps: 5 },
  { symbol: 'GBPUSD', quality: 98, gaps: 1 },
  { symbol: 'USDJPY', quality: 100, gaps: 0 },
  { symbol: 'GBPJPY', quality: 91, gaps: 3 },
];

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function QualityBar({ percent }: { percent: number }) {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  const color =
    percent >= 95 ? '#00C853' : percent >= 80 ? '#FFB300' : '#E50914';

  return (
    <span className="font-mono text-[11px]" style={{ color }}>
      {'█'.repeat(filled)}
      <span style={{ color: '#252530' }}>{'░'.repeat(empty)}</span>
      {' '}
      <span style={{ color: '#888899' }}>{percent}%</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Spread Stability Bar
// ---------------------------------------------------------------------------

function SpreadBar({ percent }: { percent: number }) {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  const color =
    percent >= 90 ? '#00C853' : percent >= 70 ? '#FFB300' : '#E50914';

  return (
    <span className="font-mono text-[11px]">
      <span style={{ color }}>{'█'.repeat(filled)}</span>
      <span style={{ color: '#252530' }}>{'░'.repeat(empty)}</span>
      {' '}
      <span style={{ color: '#888899' }}>{percent}%</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function QuoteStreamMonitor() {
  const [latency, setLatency] = useState(4.2);
  const [tickRate, setTickRate] = useState(120);
  const [spreadStability, setSpreadStability] = useState(84);
  const [symbols, setSymbols] = useState<SymbolQuality[]>(INITIAL_SYMBOLS);
  const [lastGap, setLastGap] = useState<string>('None');

  // Simulate fluctuating values every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(+(3 + Math.random() * 4).toFixed(1));
      setTickRate(Math.floor(90 + Math.random() * 60));
      setSpreadStability(Math.floor(75 + Math.random() * 20));

      setSymbols((prev) =>
        prev.map((s) => ({
          ...s,
          quality: Math.min(
            100,
            Math.max(70, s.quality + Math.floor((Math.random() - 0.4) * 5))
          ),
          gaps: Math.max(0, s.gaps + (Math.random() > 0.8 ? 1 : 0)),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: 280,
        background: '#111116',
        borderRight: '1px solid #252530',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid #252530' }}
      >
        <Activity size={14} style={{ color: '#00BCD4' }} />
        <span
          className="text-[11px] font-bold tracking-widest uppercase"
          style={{ color: '#F2F2F2' }}
        >
          Quote Stream Health
        </span>
      </div>

      {/* Connection Status */}
      <div className="px-3 py-3 space-y-1.5 text-[11px] font-mono flex-shrink-0">
        <div className="flex justify-between">
          <span style={{ color: '#888899' }}>Feed:</span>
          <span style={{ color: '#F2F2F2' }}>
            TwelveData{' '}
            <span
              className="ml-1 inline-flex items-center gap-1"
              style={{ color: '#00C853' }}
            >
              <Wifi size={10} /> Connected
            </span>
          </span>
        </div>

        <div className="flex justify-between">
          <span style={{ color: '#888899' }}>Symbols streaming:</span>
          <span style={{ color: '#F2F2F2' }}>21/21</span>
        </div>

        <div className="flex justify-between">
          <span style={{ color: '#888899' }}>Avg latency:</span>
          <span
            style={{
              color: latency < 10 ? '#00C853' : latency < 20 ? '#FFB300' : '#E50914',
            }}
          >
            {latency}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span style={{ color: '#888899' }}>Tick rate:</span>
          <span style={{ color: '#F2F2F2' }}>~{tickRate}/sec</span>
        </div>

        <div className="flex justify-between">
          <span style={{ color: '#888899' }}>Last gap:</span>
          <span style={{ color: lastGap === 'None' ? '#00C853' : '#FFB300' }}>
            {lastGap}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span style={{ color: '#888899' }}>Spread stability:</span>
          <SpreadBar percent={spreadStability} />
        </div>
      </div>

      <div className="h-px mx-3" style={{ background: '#252530' }} />

      {/* Symbol Quality */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 min-h-0">
        <div className="mb-2">
          <span
            className="text-[9px] font-bold tracking-widest uppercase"
            style={{ color: '#888899' }}
          >
            Quote Quality by Symbol:
          </span>
        </div>

        <div className="space-y-1.5">
          {symbols.map((s) => (
            <div key={s.symbol} className="flex items-center justify-between">
              <span
                className="text-[11px] font-mono font-semibold w-16"
                style={{ color: '#F2F2F2' }}
              >
                {s.symbol}
              </span>
              <QualityBar percent={s.quality} />
              <span
                className="text-[10px] font-mono w-14 text-right"
                style={{ color: s.gaps === 0 ? '#00C853' : '#FFB300' }}
              >
                {s.gaps} gap{s.gaps !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
