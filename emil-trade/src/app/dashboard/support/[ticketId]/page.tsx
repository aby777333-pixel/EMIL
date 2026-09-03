import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import TicketStatusPill from '@/components/portal/support/TicketStatusPill';
import TicketThread, { type TicketMessage, type SenderRole } from '@/components/portal/support/TicketThread';
import { CATEGORY_OPTIONS, displayStatus, type TicketStatus } from '@/lib/support/types';

interface RawMessage {
  id: string;
  sender_role: string | null;
  sender_name: string | null;
  body: string;
  created_at: string;
}

interface RawTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to_name: string | null;
  created_at: string;
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/dashboard/support/${ticketId}`);

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, subject, category, priority, status, assigned_to_name, created_at')
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .single();
  if (!ticket) notFound();

  const t = ticket as RawTicket;

  const { data: messagesRaw } = await supabase
    .from('support_messages')
    .select('id, sender_role, sender_name, body, created_at')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });

  const messages: TicketMessage[] = ((messagesRaw ?? []) as RawMessage[]).map((m) => ({
    id: m.id,
    sender_role: ((m.sender_role ?? 'client') as SenderRole),
    sender_name: m.sender_name,
    body: m.body,
    created_at: m.created_at,
  }));

  // Same display-status logic the list uses, so the badge here matches.
  const lastNonSystem = messages.slice().reverse().find((m) => m.sender_role !== 'system');
  const display = displayStatus(t.status as TicketStatus, lastNonSystem?.sender_role ?? null);
  const closed = t.status === 'closed' || t.status === 'resolved';

  const categoryLabel = CATEGORY_OPTIONS.find((c) => c.id === t.category)?.label ?? t.category;
  const ref = `#${t.id.replace(/-/g, '').slice(-8).toUpperCase()}`;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/dashboard/support"
        className="inline-flex items-center gap-1.5 text-[12px] mb-6 hover:underline"
        style={{ color: 'var(--g-text-secondary)' }}
      >
        <ArrowLeft size={13} /> Back to support
      </Link>

      <header className="mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[20px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
            {t.subject}
          </h1>
          <TicketStatusPill status={display} />
        </div>
        <div
          className="mt-2 flex items-center gap-2 text-[12px] flex-wrap"
          style={{ color: 'var(--g-text-secondary)' }}
        >
          <span className="num">{ref}</span>
          <span style={{ color: 'var(--g-text-muted)' }}>·</span>
          <span>{categoryLabel}</span>
          <span style={{ color: 'var(--g-text-muted)' }}>·</span>
          <span className="uppercase tracking-wider text-[10px]">priority {t.priority}</span>
          {t.assigned_to_name && (
            <>
              <span style={{ color: 'var(--g-text-muted)' }}>·</span>
              <span>Agent {t.assigned_to_name}</span>
            </>
          )}
        </div>
      </header>

      <TicketThread
        ticketId={t.id}
        initialMessages={messages}
        closed={closed}
        currentUserId={user.id}
      />
    </div>
  );
}
