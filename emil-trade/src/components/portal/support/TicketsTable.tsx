'use client';

import Link from 'next/link';
import { ChevronRight, MessageSquare } from 'lucide-react';
import TicketStatusPill from './TicketStatusPill';
import type { DisplayStatus, TicketCategory, TicketPriority } from '@/lib/support/types';
import { CATEGORY_OPTIONS } from '@/lib/support/types';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

export interface TicketRow {
  id: string;
  ref: string;            // human reference shown to user (we surface a short id)
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: DisplayStatus;
  assigned_agent_name: string | null;
  message_count: number;
  updated_at: string;
}

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low:    'var(--g-text-muted)',
  normal: 'var(--g-text-secondary)',
  high:   '#F59E0B',
  urgent: 'var(--g-accent)',
};

export default function TicketsTable({ tickets }: { tickets: TicketRow[] }) {
  if (tickets.length === 0) {
    return (
      <DashboardCard padding="none">
        <div className="px-6 py-16 text-center">
          <MessageSquare size={20} className="mx-auto mb-3" style={{ color: 'var(--g-text-muted)' }} />
          <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
            No tickets yet
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
            Open a ticket and we&apos;ll route it to the right team.
          </div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
              <Th>Ref</Th>
              <Th>Subject</Th>
              <Th>Category</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Agent</Th>
              <Th align="right">Updated</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr
                key={t.id}
                className="border-t transition-colors hover:bg-white/[0.02] cursor-pointer"
                style={{ borderColor: 'var(--g-border-hair)' }}
                onClick={() => { window.location.href = `/dashboard/support/${t.id}`; }}
              >
                <Td>
                  <span className="num text-[11px]" style={{ color: 'var(--g-text-secondary)' }}>
                    {t.ref}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--g-text-primary)' }}>{t.subject}</span>
                    {t.message_count > 1 && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] num"
                        style={{ color: 'var(--g-text-muted)' }}
                      >
                        <MessageSquare size={10} /> {t.message_count}
                      </span>
                    )}
                  </div>
                </Td>
                <Td>
                  <span style={{ color: 'var(--g-text-secondary)' }}>
                    {CATEGORY_OPTIONS.find((c) => c.id === t.category)?.label ?? t.category}
                  </span>
                </Td>
                <Td>
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider"
                    style={{ color: PRIORITY_COLORS[t.priority] }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 5, height: 5, borderRadius: 5,
                        background: 'currentColor',
                      }}
                    />
                    {t.priority}
                  </span>
                </Td>
                <Td>
                  <TicketStatusPill status={t.status} />
                </Td>
                <Td>
                  <span style={{ color: 'var(--g-text-secondary)' }}>
                    {t.assigned_agent_name ?? '—'}
                  </span>
                </Td>
                <Td align="right">
                  <span className="num text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                    {formatRelative(t.updated_at)}
                  </span>
                </Td>
                <Td align="right">
                  <Link
                    href={`/dashboard/support/${t.id}`}
                    className="inline-flex items-center"
                    style={{ color: 'var(--g-text-muted)' }}
                  >
                    <ChevronRight size={14} />
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className="font-normal" style={{ textAlign: align ?? 'left', padding: '10px 14px' }}>
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ textAlign: align ?? 'left', padding: '12px 14px' }}>{children}</td>;
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
