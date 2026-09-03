'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  currency: string;
  leverage: number;
  balance: number;
  credit: number;
  is_demo: boolean;
  is_active: boolean;
  created_at: string;
  user_email: string;
}

const PER_PAGE = 20;

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc('admin_get_all_accounts', {
      p_limit: PER_PAGE,
      p_offset: page * PER_PAGE,
      p_type: typeFilter || null,
    });
    if (data) {
      setAccounts(data.accounts ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page, typeFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90">Accounts Management</h2>
        <span className="text-xs text-white/30 mono">{total} total</span>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          className="bg-[#111118] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-[#0091D5]/40"
        >
          <option value="">All Types</option>
          <option value="standard">Standard</option>
          <option value="ecn">ECN</option>
          <option value="vip">VIP</option>
          <option value="cent">Cent</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/[0.06] rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/30 uppercase tracking-wider">
              <th className="text-left px-4 py-2.5 font-medium">Account #</th>
              <th className="text-left px-4 py-2.5 font-medium">User Email</th>
              <th className="text-left px-4 py-2.5 font-medium">Type</th>
              <th className="text-left px-4 py-2.5 font-medium">Currency</th>
              <th className="text-right px-4 py-2.5 font-medium">Leverage</th>
              <th className="text-right px-4 py-2.5 font-medium">Balance</th>
              <th className="text-right px-4 py-2.5 font-medium">Credit</th>
              <th className="text-center px-4 py-2.5 font-medium">Demo</th>
              <th className="text-center px-4 py-2.5 font-medium">Active</th>
              <th className="text-right px-4 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center">
                  <div className="w-5 h-5 border-2 border-[#0091D5] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-white/30">No accounts found</td>
              </tr>
            ) : (
              accounts.map((acct) => (
                <tr key={acct.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 mono text-white/70 font-medium">{acct.account_number}</td>
                  <td className="px-4 py-2.5 mono text-white/50 text-[11px]">{acct.user_email}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-[#0091D5]/10 text-[#0091D5]">
                      {acct.account_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-white/50">{acct.currency}</td>
                  <td className="px-4 py-2.5 text-right mono text-white/60">1:{acct.leverage}</td>
                  <td className={`px-4 py-2.5 text-right mono font-medium ${acct.balance >= 0 ? 'text-[#00C27A]' : 'text-[#C1121F]'}`}>
                    {acct.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-right mono text-white/40">
                    {acct.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {acct.is_demo ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">DEMO</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00C27A]/10 text-[#00C27A]">LIVE</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${acct.is_active ? 'bg-[#00C27A]' : 'bg-white/20'}`} />
                  </td>
                  <td className="px-4 py-2.5 text-right mono text-white/40">
                    {new Date(acct.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/30">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded bg-[#111118] border border-white/[0.06] text-white/50 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded bg-[#111118] border border-white/[0.06] text-white/50 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
