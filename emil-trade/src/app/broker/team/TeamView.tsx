'use client';

import { useState } from 'react';
import { UserCog, UserPlus, Mail } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  last_sign_in_at: string | null;
  status: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  broker_admin: 'Admin',
  dealer: 'Dealer',
  support_agent: 'Support',
  compliance_officer: 'Compliance',
  risk_manager: 'Risk Manager',
};

export function TeamView({ staff }: { staff: StaffMember[] }) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('support_agent');
  const [inviteName, setInviteName] = useState('');

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: Record<string, unknown>) => {
        const name = String(row.full_name ?? 'Unknown');
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
              {initials}
            </div>
            <div>
              <p className="font-medium text-foreground">{name}</p>
              <p className="text-[10px] text-muted">{String(row.email ?? '')}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      label: 'Role',
      render: (row: Record<string, unknown>) => (
        <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
          {ROLE_LABELS[String(row.role)] ?? String(row.role)}
        </span>
      ),
    },
    {
      key: 'last_sign_in_at',
      label: 'Last Login',
      render: (row: Record<string, unknown>) => {
        const d = row.last_sign_in_at as string | null;
        return d ? new Date(d).toLocaleString() : '\u2014';
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status ?? 'active')} />,
    },
  ];

  return (
    <>
      {/* Actions */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/80"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite Member
        </button>
      </div>

      {staff.length > 0 ? (
        <DataTable columns={columns} data={staff as unknown as Record<string, unknown>[]} sortable pageSize={20} />
      ) : (
        <EmptyState icon={UserCog} title="No team members" description="Add staff members to manage your brokerage operations." />
      )}

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member" size="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted">Full Name</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground"
            >
              <option value="support_agent">Support Agent</option>
              <option value="dealer">Dealer</option>
              <option value="compliance_officer">Compliance Officer</option>
              <option value="risk_manager">Risk Manager</option>
              <option value="broker_admin">Admin</option>
            </select>
          </div>
          <button
            disabled={!inviteEmail.trim() || !inviteName.trim()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            <Mail className="h-3.5 w-3.5" />
            Send Invitation
          </button>
        </div>
      </Modal>
    </>
  );
}
