'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Field } from '@/components/auth/Field';
import { PrimaryButton, SecondaryButton } from '@/components/auth/Buttons';
import { InlineError } from '@/components/auth/InlineError';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, type TicketCategory, type TicketPriority } from '@/lib/support/types';

/**
 * New ticket dialog — category select, subject, body, priority. The
 * file-attachment column is left empty for now since attachments need
 * their own private Supabase Storage bucket; the field is wired in the
 * UI as a "soon" affordance so the user knows to expect it.
 */
export default function NewTicketDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCategory('general');
      setPriority('normal');
      setSubject('');
      setBody('');
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function submit() {
    if (submitting) return;
    setError(null);

    if (subject.trim().length < 4) return setError('Subject is too short.');
    if (body.trim().length < 10)   return setError('Add a few more details so we can help faster.');

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Session expired. Sign in again.'); setSubmitting(false); return; }

      const { data: ticket, error: insertErr } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          category,
          priority,
          status: 'open',
        })
        .select('id')
        .single();
      if (insertErr || !ticket) {
        setError(insertErr?.message ?? 'Failed to create ticket.');
        setSubmitting(false);
        return;
      }

      // Seed the thread with the user's initial message.
      await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: 'client',
        body: body.trim(),
        is_internal: false,
      });

      onClose();
      router.push(`/dashboard/support/${ticket.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create ticket.');
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="gentleman fixed inset-0 z-[200] flex items-center justify-center px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
      <div
        role="dialog"
        aria-label="New support ticket"
        className="relative w-full max-w-lg rounded-xl"
        style={{
          background: 'var(--g-bg-elevated)',
          border: '1px solid var(--g-border-hair)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <header
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--g-border-hair)' }}
        >
          <h2 className="text-[14px] font-medium m-0" style={{ color: 'var(--g-text-primary)' }}>
            New support ticket
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded transition-colors hover:bg-white/[0.04]"
            style={{ color: 'var(--g-text-muted)' }}
          >
            <X size={15} />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Picker
              label="Category"
              value={category}
              onChange={(v) => setCategory(v as TicketCategory)}
              options={CATEGORY_OPTIONS.map((c) => ({ id: c.id, label: c.label }))}
            />
            <Picker
              label="Priority"
              value={priority}
              onChange={(v) => setPriority(v as TicketPriority)}
              options={PRIORITY_OPTIONS.map((p) => ({ id: p.id, label: p.label }))}
            />
          </div>

          <Field
            label="Subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief description of the issue"
            maxLength={120}
          />

          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
              Details
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Include any reference numbers, account IDs, or steps to reproduce."
              className="g-field"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              maxLength={4000}
            />
          </div>

          <p className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
            File attachments will land in a follow-up. For now reference any documents
            inline — we&apos;ll ask for uploads in our reply if needed.
          </p>

          {error && <InlineError message={error} />}
        </div>

        <footer
          className="px-5 py-4 border-t flex justify-end gap-3"
          style={{ borderColor: 'var(--g-border-hair)' }}
        >
          <SecondaryButton onClick={onClose} className="!w-auto !px-5">Cancel</SecondaryButton>
          <PrimaryButton onClick={submit} loading={submitting} className="!w-auto !px-5">
            Open ticket
          </PrimaryButton>
        </footer>
      </div>
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="g-field"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} style={{ background: '#16161A' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
