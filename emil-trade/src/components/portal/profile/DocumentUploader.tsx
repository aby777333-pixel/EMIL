'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type DocType = 'passport' | 'national_id' | 'drivers_license' | 'utility_bill' | 'bank_statement' | 'selfie' | 'proof_of_funds';
type DocStatus = 'idle' | 'uploading' | 'review' | 'approved' | 'rejected';

interface DocumentUploaderProps {
  type: DocType;
  title: string;
  description: string;
  /** existing record (if any) so we can show the current state */
  existing?: {
    file_name: string;
    status: DocStatus;
    rejection_reason?: string | null;
  } | null;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * Drag-and-drop document uploader. Posts the file to a private Supabase
 * storage bucket then registers the URL with `/api/v1/kyc`.
 *
 * Bucket: `kyc/<user_id>/<doc_type>/<uuid>.<ext>` per spec. If the
 * bucket is missing the upload returns a friendly error and the user
 * can retry once the storage backend is provisioned.
 */
export default function DocumentUploader({ type, title, description, existing }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{ name: string; status: DocStatus } | null>(
    existing ? { name: existing.file_name, status: existing.status } : null,
  );

  const isFinal = uploaded?.status === 'approved' || uploaded?.status === 'review';

  function pick() { inputRef.current?.click(); }

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError('Only PDF, JPG, PNG, and WEBP files are accepted.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File is larger than the 10 MB limit.');
      return;
    }

    setProgress(8);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Session expired. Please sign in again.');
        return;
      }

      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${user.id}/${type}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('kyc')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadErr) {
        setError(
          uploadErr.message.includes('Bucket')
            ? 'Storage backend not yet provisioned. Contact support.'
            : uploadErr.message,
        );
        setProgress(0);
        return;
      }

      setProgress(78);

      // Register the doc with the API so compliance can review it.
      const res = await fetch('/api/v1/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          file_url: path,
          file_name: file.name,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Failed to register document.');
        setProgress(0);
        return;
      }

      setProgress(100);
      setUploaded({ name: file.name, status: 'review' });
      window.setTimeout(() => setProgress(0), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setProgress(0);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      className="relative rounded-xl border"
      style={{
        background: 'var(--g-bg-surface)',
        borderColor: dragOver ? 'var(--g-accent)' : 'var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'border-color 160ms ease',
      }}
    >
      <div className="flex items-start justify-between p-5 gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="text-[11px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--g-text-secondary)' }}
          >
            {title}
          </div>
          <p className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--g-text-muted)' }}>
            {description}
          </p>
        </div>
        <StatusBadge status={uploaded?.status ?? 'idle'} />
      </div>

      <div className="px-5 pb-5">
        {isFinal && uploaded ? (
          <div
            className="flex items-center justify-between gap-3 rounded-lg p-3 text-[12px]"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={14} style={{ color: 'var(--g-text-secondary)' }} />
              <span className="truncate" style={{ color: 'var(--g-text-primary)' }}>
                {uploaded.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setUploaded(null); pick(); }}
              className="text-[11px] hover:underline"
              style={{ color: 'var(--g-text-secondary)' }}
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={pick}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-6 transition-colors"
            style={{
              background: dragOver ? 'rgba(220,38,38,0.06)' : 'rgba(255,255,255,0.02)',
              border: '1px dashed var(--g-border-soft)',
              color: 'var(--g-text-secondary)',
            }}
          >
            <Upload size={18} />
            <span className="text-[13px]" style={{ color: 'var(--g-text-primary)' }}>
              Drop file or click to upload
            </span>
            <span className="text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
              PDF · JPG · PNG · max 10 MB
            </span>
          </button>
        )}

        {progress > 0 && progress < 100 && (
          <div
            className="mt-3 h-1 rounded overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full"
              style={{
                width: `${progress}%`,
                background: 'var(--g-accent)',
                transition: 'width 220ms ease',
              }}
            />
          </div>
        )}

        {error && (
          <div
            className="mt-3 flex items-start gap-2 text-[12px] leading-snug"
            style={{ color: 'var(--g-pnl-negative)' }}
          >
            <AlertCircle size={13} className="mt-px shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {existing?.status === 'rejected' && existing.rejection_reason && (
          <div
            className="mt-3 rounded-lg p-3 text-[12px]"
            style={{
              background: 'rgba(220,38,38,0.04)',
              border: '1px solid rgba(220,38,38,0.2)',
              color: 'var(--g-pnl-negative)',
            }}
          >
            <strong>Reviewer note:</strong> {existing.rejection_reason}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={ACCEPTED.join(',')}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DocStatus }) {
  if (status === 'idle') return null;
  const map: Record<DocStatus, { label: string; bg: string; fg: string; icon: React.ReactNode }> = {
    idle:        { label: '',          bg: '',                          fg: '',                       icon: null },
    uploading:   { label: 'Uploading', bg: 'rgba(255,255,255,0.04)',    fg: 'var(--g-text-secondary)', icon: null },
    review:      { label: 'Under review', bg: 'rgba(245,158,11,0.12)', fg: '#F59E0B', icon: null },
    approved:    { label: 'Approved',  bg: 'rgba(16,185,129,0.12)',     fg: 'var(--g-buy)',           icon: <CheckCircle2 size={11} /> },
    rejected:    { label: 'Rejected',  bg: 'rgba(220,38,38,0.12)',      fg: 'var(--g-accent)',        icon: <X size={11} /> },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.icon} {s.label}
    </span>
  );
}
