import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/admin');
  }

  // Verify gio4x_admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'gio4x_admin') {
    // Redirect non-admins to their appropriate area
    if (profile?.role === 'broker_admin') {
      redirect('/broker/overview');
    }
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <AdminSidebar userEmail={user.email ?? ''} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header
          className="h-12 flex items-center justify-between px-6 shrink-0"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs transition-colors hover:text-[var(--accent)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />
            <h1
              className="text-sm font-semibold tracking-wide uppercase"
              style={{ color: 'var(--text-primary)' }}
            >
              EMIL Trade Admin
            </h1>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--gold-glow)',
                color: 'var(--gold)',
              }}
            >
              SUPER
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative p-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--loss)]" />
            </button>
            <span className="text-xs mono" style={{ color: 'var(--text-muted)' }}>
              {user.email}
            </span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: 'var(--gold-glow)',
                color: 'var(--gold)',
              }}
            >
              {(user.email ?? 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
