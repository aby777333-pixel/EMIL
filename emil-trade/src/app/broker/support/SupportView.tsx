'use client';

import { useState } from 'react';
import { HeadphonesIcon, MessageSquare, Send } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
  messages: { role: string; content: string; created_at: string }[] | null;
  user: { full_name: string | null; email: string | null };
}

export function SupportView({ tickets }: { tickets: Ticket[] }) {
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = statusFilter === 'all' ? tickets : tickets.filter((t) => t.status === statusFilter);

  const columns = [
    {
      key: 'ticket_number',
      label: 'Ticket #',
      render: (row: Record<string, unknown>) => (
        <span className="mono font-medium text-accent">{String(row.ticket_number)}</span>
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (row: Record<string, unknown>) => {
        const u = row.user as Ticket['user'];
        return (
          <div>
            <p className="font-medium text-foreground">{u?.full_name ?? 'Unknown'}</p>
            <p className="text-[10px] text-muted">{u?.email ?? ''}</p>
          </div>
        );
      },
    },
    { key: 'subject', label: 'Subject' },
    { key: 'category', label: 'Category' },
    {
      key: 'priority',
      label: 'Priority',
      render: (row: Record<string, unknown>) => {
        const p = String(row.priority);
        const variant = p === 'urgent' ? 'danger' as const : p === 'high' ? 'warning' as const : p === 'medium' ? 'info' as const : 'default' as const;
        return <StatusBadge status={p} variant={variant} />;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: Record<string, unknown>) => new Date(String(row.created_at)).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: '',
      width: '60px',
      render: (row: Record<string, unknown>) => (
        <button
          onClick={() => setSelected(row as unknown as Ticket)}
          className="rounded px-2 py-1 text-[10px] text-accent transition-colors hover:bg-accent/10"
        >
          Open
        </button>
      ),
    },
  ];

  return (
    <>
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['all', 'open', 'pending', 'in_progress', 'resolved', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-accent text-white' : 'text-secondary hover:bg-surface hover:text-foreground'
            }`}
          >
            {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} sortable pageSize={20} />
      ) : (
        <EmptyState icon={HeadphonesIcon} title="No tickets" description="Support tickets will appear here." />
      )}

      {/* Ticket Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => { setSelected(null); setReply(''); }} title={selected ? `Ticket ${selected.ticket_number}` : ''} size="lg">
        {selected && (
          <div className="space-y-4">
            {/* Ticket Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted">Subject</p>
                <p className="font-medium text-foreground">{selected.subject}</p>
              </div>
              <div>
                <p className="text-muted">Category</p>
                <p className="text-foreground">{selected.category ?? '\u2014'}</p>
              </div>
              <div>
                <p className="text-muted">Priority</p>
                <StatusBadge status={selected.priority} />
              </div>
              <div>
                <p className="text-muted">Status</p>
                <StatusBadge status={selected.status} />
              </div>
            </div>

            {/* Message Thread */}
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border bg-surface/50 p-3">
              {selected.messages && selected.messages.length > 0 ? (
                selected.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 ${
                      msg.role === 'client' ? 'bg-surface' : 'bg-accent/5 border border-accent/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-foreground">
                        {msg.role === 'client' ? selected.user?.full_name ?? 'Client' : 'Support'}
                      </span>
                      <span className="text-[10px] text-muted">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-secondary">{msg.content}</p>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-muted">No messages yet.</p>
              )}
            </div>

            {/* Reply Form */}
            <div className="flex gap-2">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <button
                disabled={!reply.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Reply
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
