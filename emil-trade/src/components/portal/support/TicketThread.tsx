'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, User, Headphones, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PrimaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';

export type SenderRole = 'client' | 'agent' | 'system';

export interface TicketMessage {
  id: string;
  sender_role: SenderRole;
  sender_name: string | null;
  body: string;
  created_at: string;
}

/**
 * Chat-style thread for a single support ticket. Subscribes to a
 * Realtime channel scoped to the ticket id and merges INSERT events
 * into the in-memory list. The reply form posts directly to
 * support_messages (RLS scopes inserts to this user + ticket).
 *
 * Events from `sender_role: 'system'` (e.g. ticket assignment, status
 * changes) render with a muted banner-style row instead of an avatar
 * bubble so the eye doesn't confuse them with human replies.
 */
export default function TicketThread({
  ticketId,
  initialMessages,
  closed,
  currentUserId,
}: {
  ticketId: string;
  initialMessages: TicketMessage[];
  closed: boolean;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Realtime channel for new replies.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const channel = supabase
        .channel(`support_messages:${ticketId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
          (payload) => {
            const row = payload.new as Partial<TicketMessage> & { id: string; created_at: string; body: string };
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [
                ...prev,
                {
                  id: row.id,
                  sender_role: (row.sender_role ?? 'client') as SenderRole,
                  sender_name: row.sender_name ?? null,
                  body: row.body,
                  created_at: row.created_at,
                },
              ];
            });
          },
        )
        .subscribe();

      unsub = () => { supabase.removeChannel(channel); };
      void cancelled;
    })();
    return () => { cancelled = true; unsub?.(); };
  }, [ticketId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !reply.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: insertErr } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: currentUserId,
        sender_role: 'client',
        body: reply.trim(),
        is_internal: false,
      });
      if (insertErr) {
        setError(insertErr.message);
        setSubmitting(false);
        return;
      }
      setReply('');
      // Optimistic re-status if needed: if the ticket was waiting for
      // user reply, flip back to in_progress so agents see fresh activity.
      void supabase
        .from('support_tickets')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', ticketId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        minHeight: 480,
      }}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: '60vh' }}>
        {messages.length === 0 ? (
          <div className="text-center text-[12px] py-10" style={{ color: 'var(--g-text-muted)' }}>
            Conversation will appear here.
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showSenderHeader = !prev || prev.sender_role !== m.sender_role;
            return <Message key={m.id} message={m} showSenderHeader={showSenderHeader} />;
          })
        )}
      </div>

      {closed ? (
        <div
          className="px-5 py-4 border-t text-center text-[12px]"
          style={{
            borderColor: 'var(--g-border-hair)',
            color: 'var(--g-text-muted)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          This ticket is closed. Open a new one if your issue isn&apos;t fully resolved.
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="px-5 py-4 border-t flex flex-col gap-3"
          style={{ borderColor: 'var(--g-border-hair)' }}
        >
          {error && <InlineError message={error} />}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply…"
            rows={3}
            className="g-field"
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
            maxLength={4000}
          />
          <div className="flex justify-end">
            <PrimaryButton
              onClick={submit as unknown as () => void}
              loading={submitting}
              disabled={reply.trim().length === 0}
              className="!w-auto !px-5"
            >
              <Send size={13} className="inline-block mr-1.5 -mt-0.5" />
              Send
            </PrimaryButton>
          </div>
        </form>
      )}
    </div>
  );
}

function Message({
  message,
  showSenderHeader,
}: {
  message: TicketMessage;
  showSenderHeader: boolean;
}) {
  if (message.sender_role === 'system') {
    return (
      <div
        className="text-[11px] uppercase tracking-[0.14em] py-1.5 px-3 rounded-md inline-flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--g-text-muted)' }}
      >
        <Settings size={11} />
        {message.body}
        <span className="num" style={{ marginLeft: 4 }}>· {formatTime(message.created_at)}</span>
      </div>
    );
  }

  const isClient = message.sender_role === 'client';
  return (
    <div className="flex gap-3">
      {showSenderHeader ? (
        <span
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 30, height: 30, borderRadius: 999,
            background: isClient ? 'rgba(220,38,38,0.12)' : 'rgba(16,185,129,0.12)',
            color: isClient ? 'var(--g-accent)' : 'var(--g-buy)',
          }}
        >
          {isClient ? <User size={13} /> : <Headphones size={13} />}
        </span>
      ) : (
        <span style={{ width: 30 }} aria-hidden />
      )}
      <div className="flex-1 min-w-0">
        {showSenderHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-[12px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
              {isClient ? 'You' : message.sender_name || 'Support'}
            </span>
            <span className="num text-[10px]" style={{ color: 'var(--g-text-muted)' }}>
              {formatTime(message.created_at)}
            </span>
          </div>
        )}
        <div
          className="text-[13px] leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--g-text-secondary)' }}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}
