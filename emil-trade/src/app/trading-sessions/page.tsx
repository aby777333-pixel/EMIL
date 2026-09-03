'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

interface SessionCell {
  open: string | null;
  close: string | null;
}

interface SymbolSessions {
  symbol: string;
  sessions: SessionCell[]; // index 0 = Mon, 6 = Sun
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOCK_SESSIONS: SymbolSessions[] = [
  {
    symbol: 'EURUSD',
    sessions: [
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '22:00' },
      { open: null, close: null },
      { open: '22:00', close: '23:59' },
    ],
  },
  {
    symbol: 'GBPUSD',
    sessions: [
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '22:00' },
      { open: null, close: null },
      { open: '22:00', close: '23:59' },
    ],
  },
  {
    symbol: 'USDJPY',
    sessions: [
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '22:00' },
      { open: null, close: null },
      { open: '22:00', close: '23:59' },
    ],
  },
  {
    symbol: 'XAUUSD',
    sessions: [
      { open: '01:00', close: '23:59' },
      { open: '01:00', close: '23:59' },
      { open: '01:00', close: '23:59' },
      { open: '01:00', close: '23:59' },
      { open: '01:00', close: '22:00' },
      { open: null, close: null },
      { open: '23:00', close: '23:59' },
    ],
  },
  {
    symbol: 'BTCUSD',
    sessions: [
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
    ],
  },
  {
    symbol: 'GBPJPY',
    sessions: [
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '23:59' },
      { open: '00:00', close: '22:00' },
      { open: null, close: null },
      { open: '22:00', close: '23:59' },
    ],
  },
];

export default function TradingSessionsPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      {/* Header */}
      <header className="border-b border-[#252530] bg-[#0B0B0D]/95 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/broker/overview">
              <Logo height={26} theme="dark" />
            </Link>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Link href="/broker/overview" className="hover:text-white/70 transition-colors">Market Configuration</Link>
              <span>/</span>
              <span className="text-white/80">Trading Sessions</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/trading-sessions/holidays"
              className="text-xs text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded border border-[#252530] hover:border-[#353540]"
            >
              Market Holidays
            </Link>
            <Link
              href="/trading-terms"
              className="text-xs text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded border border-[#252530] hover:border-[#353540]"
            >
              Trading Terms
            </Link>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Trading Sessions</h1>
          <p className="text-xs text-white/30 mt-1">Weekly trading schedule per instrument. All times shown in UTC.</p>
        </div>

        <div className="bg-[#111116] border border-[#252530] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#252530]">
                  <th className="text-left px-4 py-3 font-medium text-white/40 w-24">Symbol</th>
                  {DAYS.map((day) => (
                    <th key={day} className="text-center px-3 py-3 font-medium text-white/40 min-w-[110px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_SESSIONS.map((row) => (
                  <tr key={row.symbol} className="border-b border-[#1a1a22] hover:bg-[#161620] transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-white">{row.symbol}</td>
                    {row.sessions.map((session, dayIdx) => (
                      <td key={dayIdx} className="px-3 py-3 text-center">
                        {session.open != null ? (
                          <span className="font-mono text-white/60">
                            {session.open}
                            <span className="text-white/20 mx-0.5">-</span>
                            {session.close}
                          </span>
                        ) : (
                          <span className="text-white/15 font-medium">Closed</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 text-[10px] text-white/20">
          Note: BTCUSD trades 24/7. Forex pairs follow standard market hours (Sun 22:00 - Fri 22:00 UTC).
        </div>
      </main>
    </div>
  );
}
