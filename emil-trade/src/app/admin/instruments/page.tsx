'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Pencil } from 'lucide-react';

interface Instrument {
  symbol: string;
  description: string;
  type: string;
  contract_size: number;
  margin_rate: number;
  swap_long: number;
  swap_short: number;
  spread_markup: number;
  is_active: boolean;
}

const typeColors: Record<string, string> = {
  forex: 'bg-[#0091D5]/15 text-[#0091D5]',
  metal: 'bg-[#C9A84C]/15 text-[#C9A84C]',
  crypto: 'bg-[#A855F7]/15 text-[#A855F7]',
  index: 'bg-[#14B8A6]/15 text-[#14B8A6]',
  energy: 'bg-[#F97316]/15 text-[#F97316]',
  commodity: 'bg-[#C9A84C]/15 text-[#C9A84C]',
  stock: 'bg-[#00C27A]/15 text-[#00C27A]',
};

export default function AdminInstrumentsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInstruments() {
      const supabase = createClient();
      const { data } = await supabase
        .from('instruments')
        .select('symbol, description, type, contract_size, margin_rate, swap_long, swap_short, spread_markup, is_active')
        .order('type')
        .order('symbol');
      if (data) setInstruments(data);
      setLoading(false);
    }
    fetchInstruments();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90">Instruments</h2>
        <span className="text-xs text-white/30 mono">{instruments.length} instruments</span>
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/[0.06] rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/30 uppercase tracking-wider">
              <th className="text-left px-4 py-2.5 font-medium">Symbol</th>
              <th className="text-left px-4 py-2.5 font-medium">Description</th>
              <th className="text-left px-4 py-2.5 font-medium">Type</th>
              <th className="text-right px-4 py-2.5 font-medium">Contract Size</th>
              <th className="text-right px-4 py-2.5 font-medium">Margin Rate</th>
              <th className="text-right px-4 py-2.5 font-medium">Swap Long</th>
              <th className="text-right px-4 py-2.5 font-medium">Swap Short</th>
              <th className="text-right px-4 py-2.5 font-medium">Spread Markup</th>
              <th className="text-center px-4 py-2.5 font-medium">Active</th>
              <th className="text-center px-4 py-2.5 font-medium">Edit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center">
                  <div className="w-5 h-5 border-2 border-[#0091D5] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : instruments.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-white/30">No instruments found</td>
              </tr>
            ) : (
              instruments.map((inst) => (
                <tr key={inst.symbol} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 text-white/90 font-semibold mono">{inst.symbol}</td>
                  <td className="px-4 py-2.5 text-white/50">{inst.description}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase ${typeColors[inst.type] ?? 'bg-white/10 text-white/50'}`}>
                      {inst.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right mono text-white/60">{inst.contract_size.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right mono text-white/60">{(inst.margin_rate * 100).toFixed(2)}%</td>
                  <td className="px-4 py-2.5 text-right mono text-white/60">{inst.swap_long}</td>
                  <td className="px-4 py-2.5 text-right mono text-white/60">{inst.swap_short}</td>
                  <td className="px-4 py-2.5 text-right mono text-white/60">{inst.spread_markup}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${inst.is_active ? 'bg-[#00C27A]' : 'bg-white/20'}`} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                      <Pencil size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
