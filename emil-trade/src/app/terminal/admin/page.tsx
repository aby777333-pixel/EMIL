'use client';

// Admin Entitlement Console (MT5-management super-prompt §39 slice).
// Admin-gated (public.platform_admins) feature switches stored in
// public.platform_entitlements, enforced live in the terminal:
//   - algo_trading: OFF forces + locks the global Algo toggle platform-wide
//   - ea_upload:    OFF blocks custom EA uploads (.mq5/.ex5)
// Every change is written to public.admin_audit_log.

import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldX, ScrollText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Entitlement { key: string; enabled: boolean; note: string | null; updated_at: string }
interface AuditRow { action: string; detail: Record<string, unknown>; created_at: string }

const KEY_LABELS: Record<string, string> = {
  algo_trading: 'Algo Trading (platform-wide)',
  ea_upload: 'Custom EA uploads',
};

export default function AdminEntitlementsPage() {
  const [state, setState] = useState<'loading' | 'signed-out' | 'not-admin' | 'ready'>('loading');
  const [rows, setRows] = useState<Entitlement[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadAll = async () => {
    const supabase = createClient();
    const { data: ents } = await supabase.from('platform_entitlements').select('key, enabled, note, updated_at').order('key');
    setRows((ents as Entitlement[]) ?? []);
    const { data: logs } = await supabase.from('admin_audit_log').select('action, detail, created_at').order('created_at', { ascending: false }).limit(20);
    setAudit((logs as AuditRow[]) ?? []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) { setState('signed-out'); return; }
        setUserId(user.id);
        const { data: adminRow } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
        if (!active) return;
        if (!adminRow) { setState('not-admin'); return; }
        await loadAll();
        if (active) setState('ready');
      } catch { if (active) setState('signed-out'); }
    })();
    return () => { active = false; };
  }, []);

  const toggle = async (row: Entitlement) => {
    if (!userId) return;
    setBusy(row.key);
    setMsg(null);
    try {
      const supabase = createClient();
      const next = !row.enabled;
      const { error } = await supabase.from('platform_entitlements').update({ enabled: next, updated_at: new Date().toISOString(), updated_by: userId }).eq('key', row.key);
      if (error) throw error;
      await supabase.from('admin_audit_log').insert({
        user_id: userId,
        action: 'entitlement_toggle',
        detail: { key: row.key, from: row.enabled, to: next },
      });
      await loadAll();
      setMsg(`${KEY_LABELS[row.key] ?? row.key} is now ${next ? 'ENABLED' : 'DISABLED'}. Terminals pick this up within ~1 minute (entitlement cache).`);
    } catch (e) {
      setMsg(`Update failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#060D16', color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="mx-auto max-w-2xl">
        <Link href="/terminal" className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white">
          <ArrowLeft size={14} /> Terminal
        </Link>
        <h1 className="mb-1 flex items-center gap-2 text-[18px] font-bold"><ShieldCheck size={18} style={{ color: '#0091D5' }} /> Admin — Platform Entitlements</h1>
        <p className="mb-5 text-[11px] text-white/40">Feature switches enforced live across every terminal. All changes are audit-logged.</p>

        {state === 'loading' && <div className="py-10 text-center text-[12px] text-white/40">Checking permissions…</div>}
        {state === 'signed-out' && (
          <div className="rounded-lg border p-6 text-center text-[12px] text-white/60" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            You must be signed in to access the admin console.
          </div>
        )}
        {state === 'not-admin' && (
          <div className="flex items-center gap-3 rounded-lg border p-6 text-[12px] text-white/60" style={{ borderColor: 'rgba(255,82,82,0.35)' }}>
            <ShieldX size={18} style={{ color: '#FF5252' }} /> Your account is not a platform administrator. This action has no effect and is not available to you.
          </div>
        )}

        {state === 'ready' && (
          <>
            {msg && <div className="mb-3 rounded-md border p-2.5 text-[11px] text-white/70" style={{ borderColor: 'rgba(0,145,213,0.35)', backgroundColor: 'rgba(0,145,213,0.06)' }}>{msg}</div>}
            <div className="mb-6 overflow-hidden rounded-lg border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              {rows.map((row) => (
                <div key={row.key} className="flex items-center justify-between border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="min-w-0 pr-4">
                    <div className="text-[13px] font-bold">{KEY_LABELS[row.key] ?? row.key}</div>
                    <div className="text-[10px] leading-snug text-white/40">{row.note}</div>
                    <div className="mt-0.5 text-[9px] text-white/25">Updated {new Date(row.updated_at).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => toggle(row)}
                    disabled={busy === row.key}
                    className="shrink-0 rounded-md px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: row.enabled ? 'rgba(0,194,122,0.15)' : 'rgba(255,82,82,0.15)',
                      color: row.enabled ? '#00C27A' : '#FF5252',
                      border: `1px solid ${row.enabled ? 'rgba(0,194,122,0.4)' : 'rgba(255,82,82,0.4)'}`,
                    }}
                  >
                    {busy === row.key ? '…' : row.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              ))}
              {rows.length === 0 && <div className="p-6 text-center text-[11px] text-white/35">No entitlements found.</div>}
            </div>

            <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-white/80"><ScrollText size={14} /> Audit log (latest 20)</h2>
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              {audit.map((a, i) => (
                <div key={i} className="flex items-center justify-between border-b px-4 py-2 text-[10px] last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span className="text-white/70">{a.action} · <span className="text-white/40">{JSON.stringify(a.detail)}</span></span>
                  <span className="shrink-0 pl-3 text-white/30">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              ))}
              {audit.length === 0 && <div className="p-4 text-center text-[10px] text-white/35">No admin actions recorded yet.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
