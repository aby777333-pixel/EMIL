'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  country_code: string | null;
  kyc_tier: number | null;
  kyc_status: string | null;
  account_type: string | null;
  client_tier: string | null;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
  last_login_at: string | null;
}

const PER_PAGE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc('admin_get_all_users', {
      p_limit: PER_PAGE,
      p_offset: page * PER_PAGE,
      p_search: search || null,
    });
    if (data) {
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90">Users Management</h2>
        <span className="text-xs text-white/30 mono">{total} total</span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-[#111118] border border-white/[0.06] rounded-md pl-9 pr-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#0091D5]/40"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[#0091D5]/10 text-[#0091D5] text-xs font-medium rounded-md hover:bg-[#0091D5]/20 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-[#111118] border border-white/[0.06] rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/30 uppercase tracking-wider">
              <th className="text-left px-4 py-2.5 font-medium">Email</th>
              <th className="text-left px-4 py-2.5 font-medium">Name</th>
              <th className="text-left px-4 py-2.5 font-medium">Country</th>
              <th className="text-left px-4 py-2.5 font-medium">KYC</th>
              <th className="text-left px-4 py-2.5 font-medium">Acct Type</th>
              <th className="text-left px-4 py-2.5 font-medium">Tier</th>
              <th className="text-center px-4 py-2.5 font-medium">Active</th>
              <th className="text-right px-4 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="w-5 h-5 border-2 border-[#0091D5] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/30">No users found</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <td className="px-4 py-2.5 text-white/70 mono">{user.email}</td>
                  <td className="px-4 py-2.5 text-white/80">{user.full_name ?? '-'}</td>
                  <td className="px-4 py-2.5 text-white/50">{user.country_code ?? '-'}</td>
                  <td className="px-4 py-2.5">
                    <KycBadge status={user.kyc_status} />
                  </td>
                  <td className="px-4 py-2.5 text-white/50">{user.account_type ?? '-'}</td>
                  <td className="px-4 py-2.5 text-white/50">{user.client_tier ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {user.is_suspended ? (
                      <span className="inline-block w-2 h-2 rounded-full bg-[#C1121F]" title="Suspended" />
                    ) : user.is_active ? (
                      <span className="inline-block w-2 h-2 rounded-full bg-[#00C27A]" title="Active" />
                    ) : (
                      <span className="inline-block w-2 h-2 rounded-full bg-white/20" title="Inactive" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right mono text-white/40">
                    {new Date(user.created_at).toLocaleDateString()}
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
          <span className="text-xs text-white/30">
            Page {page + 1} of {totalPages}
          </span>
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

function KycBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-white/20">-</span>;
  const colors: Record<string, string> = {
    pending: 'bg-[#E2A229]/15 text-[#E2A229]',
    approved: 'bg-[#00C27A]/15 text-[#00C27A]',
    verified: 'bg-[#00C27A]/15 text-[#00C27A]',
    rejected: 'bg-[#C1121F]/15 text-[#C1121F]',
    none: 'bg-white/10 text-white/40',
  };
  const cls = colors[status] ?? 'bg-white/10 text-white/50';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase ${cls}`}>
      {status}
    </span>
  );
}
