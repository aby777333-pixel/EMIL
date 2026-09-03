import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ClientDetailTabs } from './ClientDetailTabs';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch client profile
  const { data: client } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (!client) notFound();

  // Fetch trading accounts
  const { data: accounts } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  // Fetch open positions
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', id)
    .eq('status', 'open')
    .order('opened_at', { ascending: false });

  // Fetch trade history (last 100)
  const { data: tradeHistory } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', id)
    .order('closed_at', { ascending: false })
    .limit(100);

  // Fetch transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Fetch KYC documents
  const { data: kycDocs } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  // Fetch notes
  const { data: notes } = await supabase
    .from('client_notes')
    .select('*, author:users!client_notes_author_id_fkey(full_name)')
    .eq('client_id', id)
    .order('created_at', { ascending: false });

  // Fetch audit log
  const { data: auditLog } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity_id', id)
    .eq('entity_type', 'user')
    .order('created_at', { ascending: false })
    .limit(50);

  // Fetch risk info
  const { data: riskProfile } = await supabase
    .from('risk_profiles')
    .select('*')
    .eq('user_id', id)
    .single();

  const initials = client.full_name
    ? client.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="rounded-xl border border-border bg-elevated p-5">
        <div className="flex flex-wrap items-start gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-lg font-bold text-accent">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-lg font-semibold text-foreground">{client.full_name ?? 'Unknown'}</h1>
            <p className="text-xs text-muted">{client.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StatusBadge status={client.kyc_status ?? 'pending'} />
              {client.country && (
                <span className="text-xs text-secondary">{client.country}</span>
              )}
              <span className="text-xs text-muted">
                Joined {new Date(client.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-[10px] uppercase text-muted">Accounts</p>
              <p className="mono text-lg font-semibold text-foreground">{accounts?.length ?? 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-muted">Open Positions</p>
              <p className="mono text-lg font-semibold text-foreground">{positions?.length ?? 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-muted">Risk Score</p>
              <p className="mono text-lg font-semibold text-foreground">{riskProfile?.score ?? '\u2014'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ClientDetailTabs
        clientId={id}
        accounts={accounts ?? []}
        positions={positions ?? []}
        tradeHistory={tradeHistory ?? []}
        transactions={transactions ?? []}
        kycDocs={kycDocs ?? []}
        notes={notes ?? []}
        riskProfile={riskProfile}
        auditLog={auditLog ?? []}
      />
    </div>
  );
}
