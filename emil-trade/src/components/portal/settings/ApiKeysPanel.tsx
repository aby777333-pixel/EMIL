'use client';

import { useState } from 'react';
import { Key, Copy, Check, Plus, Trash2, AlertTriangle } from 'lucide-react';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';
import { Field } from '@/components/auth/Field';
import { PrimaryButton, SecondaryButton } from '@/components/auth/Buttons';

interface ApiKey {
  id: string;
  label: string;
  /** truncated key — full secret is only shown at creation time */
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
}

const SCOPE_OPTIONS = [
  { id: 'read:profile',      label: 'Read profile' },
  { id: 'read:wallet',       label: 'Read wallets + transaction history' },
  { id: 'read:positions',    label: 'Read positions + accounts' },
  { id: 'read:notifications', label: 'Read notifications' },
];

const STORAGE_KEY = 'gio.portal.api_keys';

/**
 * API key management. Only read-only scopes per spec ("personal data
 * export"). Keys are stored client-side in localStorage as a
 * placeholder — a real implementation hashes them server-side and
 * stores in `auth.api_keys` with RLS scoped to the user.
 *
 * The full secret is only displayed at creation time; subsequent
 * loads only show the prefix. This forces partners to record the
 * key in their secrets store immediately.
 */
export default function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKey[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
  });
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read:profile']);
  const [justCreated, setJustCreated] = useState<{ id: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function persist(next: ApiKey[]) {
    setKeys(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function toggleScope(id: string) {
    setScopes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function generate() {
    const id = crypto.randomUUID();
    const secret = `gr_live_${randomString(32)}`;
    const prefix = secret.slice(0, 12);
    const newKey: ApiKey = {
      id,
      label: label.trim() || 'Untitled key',
      prefix,
      scopes: [...scopes],
      created_at: new Date().toISOString(),
      last_used_at: null,
    };
    persist([newKey, ...keys]);
    setJustCreated({ id, secret });
    setLabel('');
    setScopes(['read:profile']);
    setCreating(false);
  }

  function revoke(id: string) {
    persist(keys.filter((k) => k.id !== id));
    if (justCreated?.id === id) setJustCreated(null);
  }

  function copySecret() {
    if (!justCreated) return;
    navigator.clipboard.writeText(justCreated.secret).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  }

  return (
    <div className="space-y-6">
      <DashboardCard
        title="API keys"
        trailing={
          <SecondaryButton
            onClick={() => setCreating((c) => !c)}
            className="!w-auto !px-4 !py-1.5 inline-flex items-center gap-1.5"
          >
            <Plus size={12} /> {creating ? 'Cancel' : 'New key'}
          </SecondaryButton>
        }
      >
        {keys.length === 0 && !creating ? (
          <div className="text-center py-8">
            <Key size={20} className="mx-auto mb-3" style={{ color: 'var(--g-text-muted)' }} />
            <div className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
              No API keys yet
            </div>
            <div className="mt-1 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
              Generate read-only keys to export your data into your own tools.
            </div>
          </div>
        ) : (
          <ul className="list-none m-0 p-0 space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center gap-3 rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--g-border-hair)' }}
              >
                <Key size={14} style={{ color: 'var(--g-text-secondary)' }} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px]" style={{ color: 'var(--g-text-primary)' }}>{k.label}</div>
                  <div className="num text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                    {k.prefix}…••••  ·  {k.scopes.join(', ')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(k.id)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors hover:bg-white/[0.04]"
                  style={{ color: 'var(--g-text-muted)' }}
                  aria-label="Revoke key"
                >
                  <Trash2 size={11} /> Revoke
                </button>
              </li>
            ))}
          </ul>
        )}

        {creating && (
          <div
            className="mt-4 pt-4 border-t space-y-4"
            style={{ borderColor: 'var(--g-border-hair)' }}
          >
            <Field
              label="Key label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. portfolio-export-script"
              maxLength={60}
            />
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
                Scopes
              </div>
              <div className="space-y-2">
                {SCOPE_OPTIONS.map((s) => (
                  <ScopeRow
                    key={s.id}
                    checked={scopes.includes(s.id)}
                    onChange={() => toggleScope(s.id)}
                    title={s.label}
                    id={s.id}
                  />
                ))}
              </div>
            </div>
            <PrimaryButton
              onClick={generate}
              disabled={!label.trim() || scopes.length === 0}
              className="!w-auto !px-5"
            >
              Generate key
            </PrimaryButton>
          </div>
        )}
      </DashboardCard>

      {justCreated && (
        <div
          className="rounded-xl p-4"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={14} style={{ color: '#F59E0B' }} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
                Save this key now — you won&apos;t see it again.
              </div>
              <div
                className="mt-2 num text-[12px] flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: 'rgba(0,0,0,0.4)', wordBreak: 'break-all' }}
              >
                <span className="flex-1" style={{ color: 'var(--g-text-primary)' }}>
                  {justCreated.secret}
                </span>
                <button
                  type="button"
                  onClick={copySecret}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors hover:bg-white/[0.04] shrink-0"
                  style={{ color: copied ? 'var(--g-buy)' : 'var(--g-text-secondary)' }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                Drop the key into your secrets manager (1Password / AWS Secrets Manager / etc.).
                Once you dismiss this card, the secret is unrecoverable.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScopeRow({
  checked,
  onChange,
  title,
  id,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  id: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className="w-full flex items-center gap-2.5 text-left py-1.5"
    >
      <span
        aria-hidden
        className="shrink-0 inline-flex items-center justify-center"
        style={{
          width: 16, height: 16, borderRadius: 4,
          background: checked ? 'var(--g-accent)' : 'transparent',
          border: `1px solid ${checked ? 'var(--g-accent)' : 'var(--g-border-strong)'}`,
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="text-[13px]" style={{ color: 'var(--g-text-primary)' }}>{title}</span>
      <span className="num text-[10px] ml-auto" style={{ color: 'var(--g-text-muted)' }}>{id}</span>
    </button>
  );
}

function randomString(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}
