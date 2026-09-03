'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

interface MarketHoliday {
  id: string;
  name: string;
  holiday_date: string;
  affected_groups: string[];
  close_early_at: string | null;
  note: string | null;
}

const MOCK_HOLIDAYS: MarketHoliday[] = [
  { id: 'h1',  name: "New Year's Day",     holiday_date: '2026-01-01', affected_groups: ['Forex', 'Metals', 'Energies', 'WorldIndices', 'USStocks', 'Bonds'], close_early_at: null, note: 'All traditional markets closed. Crypto markets open.' },
  { id: 'h2',  name: 'Martin Luther King Jr. Day', holiday_date: '2026-01-19', affected_groups: ['USStocks', 'Bonds'], close_early_at: null, note: 'US markets closed. Forex operates normally.' },
  { id: 'h3',  name: "Presidents' Day",    holiday_date: '2026-02-16', affected_groups: ['USStocks', 'Bonds'], close_early_at: null, note: 'US equity and bond markets closed.' },
  { id: 'h4',  name: 'Good Friday',        holiday_date: '2026-04-03', affected_groups: ['Forex', 'Metals', 'Energies', 'WorldIndices', 'USStocks', 'Bonds'], close_early_at: null, note: 'Most global markets closed. Reduced liquidity on Thursday.' },
  { id: 'h5',  name: 'Memorial Day',       holiday_date: '2026-05-25', affected_groups: ['USStocks', 'Bonds', 'Energies'], close_early_at: null, note: 'US markets closed. Energy markets may have adjusted hours.' },
  { id: 'h6',  name: 'Independence Day',   holiday_date: '2026-07-03', affected_groups: ['USStocks', 'Bonds'], close_early_at: '13:00', note: 'Early close at 13:00 ET. Full closure on July 4th.' },
  { id: 'h7',  name: 'Thanksgiving Day',   holiday_date: '2026-11-26', affected_groups: ['USStocks', 'Bonds', 'Energies'], close_early_at: null, note: 'US markets closed. Black Friday has early close at 13:00 ET.' },
  { id: 'h8',  name: 'Christmas Eve',      holiday_date: '2026-12-24', affected_groups: ['Forex', 'Metals', 'Energies', 'WorldIndices', 'USStocks', 'Bonds'], close_early_at: '13:00', note: 'Early close across most markets. Minimal liquidity.' },
  { id: 'h9',  name: 'Christmas Day',      holiday_date: '2026-12-25', affected_groups: ['Forex', 'Metals', 'Energies', 'WorldIndices', 'USStocks', 'Bonds'], close_early_at: null, note: 'All traditional markets closed.' },
  { id: 'h10', name: "New Year's Eve",     holiday_date: '2026-12-31', affected_groups: ['Forex', 'Metals', 'Energies', 'WorldIndices', 'USStocks', 'Bonds'], close_early_at: '17:00', note: 'Early close. Extremely thin liquidity from midday.' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MarketHolidaysPage() {
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
              <Link href="/trading-sessions" className="hover:text-white/70 transition-colors">Trading Sessions</Link>
              <span>/</span>
              <span className="text-white/80">Market Holidays</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Market Holidays 2026</h1>
          <p className="text-xs text-white/30 mt-1">Scheduled market closures and early close events for the current year</p>
        </div>

        <div className="bg-[#111116] border border-[#252530] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#252530] text-white/40">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Holiday</th>
                  <th className="text-left px-4 py-3 font-medium">Affected Groups</th>
                  <th className="text-center px-4 py-3 font-medium">Close Early At</th>
                  <th className="text-left px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HOLIDAYS.map((holiday) => {
                  const isPast = new Date(holiday.holiday_date) < new Date('2026-04-11');
                  return (
                    <tr
                      key={holiday.id}
                      className={`border-b border-[#1a1a22] hover:bg-[#161620] transition-colors ${isPast ? 'opacity-40' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-white/70 whitespace-nowrap">
                        {formatDate(holiday.holiday_date)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                        {holiday.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {holiday.affected_groups.map((group) => (
                            <span
                              key={group}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a22] text-white/50"
                            >
                              {group}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {holiday.close_early_at ? (
                          <span className="font-mono text-amber-400">{holiday.close_early_at}</span>
                        ) : (
                          <span className="text-white/15">Full Day</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/40 max-w-xs">
                        {holiday.note || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
