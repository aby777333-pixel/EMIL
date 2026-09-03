'use client';

import { useState } from 'react';
import { FileCheck, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';

interface KycDocument {
  id: string;
  document_type: string;
  status: string;
  file_url: string | null;
  created_at: string;
  reviewed_at: string | null;
  user: { id: string; full_name: string | null; email: string | null };
}

export function KycReviewView({ documents }: { documents: KycDocument[] }) {
  const [selected, setSelected] = useState<KycDocument | null>(null);
  const [filter, setFilter] = useState<string>('pending');

  const filtered = filter === 'all' ? documents : documents.filter((d) => d.status === filter);

  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (row: Record<string, unknown>) => {
        const u = row.user as KycDocument['user'];
        return (
          <div>
            <p className="font-medium text-foreground">{u?.full_name ?? 'Unknown'}</p>
            <p className="text-[10px] text-muted">{u?.email ?? ''}</p>
          </div>
        );
      },
    },
    { key: 'document_type', label: 'Document Type' },
    {
      key: 'created_at',
      label: 'Submitted',
      render: (row: Record<string, unknown>) =>
        new Date(String(row.created_at)).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => (
        <StatusBadge status={String(row.status)} />
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (row: Record<string, unknown>) => (
        <button
          onClick={() => setSelected(row as unknown as KycDocument)}
          className="rounded px-2 py-1 text-[10px] text-accent transition-colors hover:bg-accent/10"
        >
          Review
        </button>
      ),
    },
  ];

  return (
    <>
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-accent text-white'
                : 'text-secondary hover:bg-surface hover:text-foreground'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          sortable
          pageSize={20}
        />
      ) : (
        <EmptyState
          icon={FileCheck}
          title="No documents"
          description={`No ${filter === 'all' ? '' : filter + ' '}KYC documents found.`}
        />
      )}

      {/* Review Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Document Review"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted">User</p>
                <p className="font-medium text-foreground">{selected.user?.full_name ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-muted">Document Type</p>
                <p className="font-medium text-foreground">{selected.document_type}</p>
              </div>
              <div>
                <p className="text-muted">Submitted</p>
                <p className="text-foreground">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted">Status</p>
                <StatusBadge status={selected.status} />
              </div>
            </div>

            {/* Document Viewer */}
            {selected.file_url ? (
              <div className="rounded-lg border border-border bg-surface p-4 text-center">
                <a
                  href={selected.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Document
                </a>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface p-8 text-center text-xs text-muted">
                No document file available
              </div>
            )}

            {/* Action Buttons */}
            {selected.status === 'pending' && (
              <div className="flex items-center justify-end gap-3">
                <button className="flex items-center gap-1.5 rounded-lg bg-loss px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-loss/80">
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button className="flex items-center gap-1.5 rounded-lg bg-profit px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-profit/80">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
