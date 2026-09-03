'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import SupportHeader from '@/components/portal/support/SupportHeader';
import TicketsTable, { type TicketRow } from '@/components/portal/support/TicketsTable';
import NewTicketDialog from '@/components/portal/support/NewTicketDialog';
import { displayStatus, type TicketStatus, type TicketCategory, type TicketPriority } from '@/lib/support/types';

interface RawTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to_name: string | null;
  updated_at: string;
}

interface RawMessage {
  ticket_id: string;
  sender_role: string | null;
  created_at: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setLoading(false); return; }

        const { data: rawTickets } = await supabase
          .from('support_tickets')
          .select('id, subject, category, priority, status, assigned_to_name, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(50);

        const ids = (rawTickets ?? []).map((t) => t.id);
        const messageQuery = ids.length > 0
          ? await supabase
              .from('support_messages')
              .select('ticket_id, sender_role, created_at')
              .in('ticket_id', ids)
              .order('created_at', { ascending: false })
          : { data: [] as RawMessage[] };

        const counts = new Map<string, number>();
        const lastSender = new Map<string, 'client' | 'agent' | 'system' | null>();
        for (const m of (messageQuery.data ?? []) as RawMessage[]) {
          counts.set(m.ticket_id, (counts.get(m.ticket_id) ?? 0) + 1);
          if (!lastSender.has(m.ticket_id)) {
            lastSender.set(m.ticket_id, (m.sender_role ?? null) as 'client' | 'agent' | 'system' | null);
          }
        }

        if (cancelled) return;
        setTickets(((rawTickets ?? []) as RawTicket[]).map((t) => ({
          id: t.id,
          ref: shortRef(t.id),
          subject: t.subject,
          category: (t.category ?? 'general') as TicketCategory,
          priority: (t.priority ?? 'normal') as TicketPriority,
          status: displayStatus(
            (t.status ?? 'open') as TicketStatus,
            lastSender.get(t.id) ?? null,
          ),
          assigned_agent_name: t.assigned_to_name,
          message_count: counts.get(t.id) ?? 0,
          updated_at: t.updated_at,
        })));
      } catch {
        /* leave list empty on error */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <SupportHeader
        onNewTicket={() => setDialogOpen(true)}
        liveAgents={2}
        avgResponseMinutes={42}
      />

      {loading ? (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            background: 'var(--g-bg-surface)',
            border: '1px solid var(--g-border-hair)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="g-skeleton" style={{ height: 14, width: '40%' }} />
              <div className="g-skeleton" style={{ height: 11, width: '70%' }} />
            </div>
          ))}
        </div>
      ) : (
        <TicketsTable tickets={tickets} />
      )}

      <NewTicketDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function shortRef(id: string): string {
  return `#${id.replace(/-/g, '').slice(-8).toUpperCase()}`;
}
