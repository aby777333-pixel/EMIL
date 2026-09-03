'use client';

import { useMemo, useState } from 'react';
import AccountsHeader from '@/components/portal/accounts/AccountsHeader';
import AccountFilterTabs, { type AccountFilter } from '@/components/portal/accounts/AccountFilterTabs';
import AccountCard, { type PortalAccountFull } from '@/components/portal/accounts/AccountCard';
import {
  LeverageChangeDialog,
  ResetPasswordDialog,
  ArchiveAccountDialog,
} from '@/components/portal/accounts/AccountActionDialogs';
import { createClient } from '@/lib/supabase/client';
import type { LeverageTier } from '@/lib/accounts/types';

interface AccountsClientProps {
  accounts: PortalAccountFull[];
  liveEquity: string;
  demoEquity: string;
}

export default function AccountsClient({ accounts: initial, liveEquity, demoEquity }: AccountsClientProps) {
  const [accounts, setAccounts] = useState(initial);
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [leverageTarget, setLeverageTarget] = useState<PortalAccountFull | null>(null);
  const [pwdTarget, setPwdTarget] = useState<PortalAccountFull | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PortalAccountFull | null>(null);

  const counts = useMemo<Record<AccountFilter, number>>(() => {
    return {
      all: accounts.length,
      live: accounts.filter((a) => a.is_active && !a.is_demo).length,
      demo: accounts.filter((a) => a.is_demo).length,
      archived: accounts.filter((a) => !a.is_active).length,
    };
  }, [accounts]);

  const filtered = useMemo(() => {
    if (filter === 'all') return accounts.filter((a) => a.is_active || !a.is_active); // sort applied below
    if (filter === 'live') return accounts.filter((a) => a.is_active && !a.is_demo);
    if (filter === 'demo') return accounts.filter((a) => a.is_demo);
    return accounts.filter((a) => !a.is_active);
  }, [accounts, filter]);

  async function handleLeverageChange(newLeverage: LeverageTier) {
    if (!leverageTarget) return { ok: false, error: 'No target.' };
    const supabase = createClient();
    const { error } = await supabase
      .from('trading_accounts')
      .update({ leverage: newLeverage, updated_at: new Date().toISOString() })
      .eq('id', leverageTarget.id);
    if (error) return { ok: false, error: error.message };
    setAccounts((list) =>
      list.map((a) => (a.id === leverageTarget.id ? { ...a, leverage: newLeverage } : a)),
    );
    return { ok: true };
  }

  async function handleResetPassword(_kind: 'trading' | 'investor') {
    // TODO: dispatch actual reset via /api/accounts/:id/reset-password once
    // the MT5 manager bridge is wired. For now we simulate success after a
    // small delay so the UX flow is exercised end-to-end.
    void _kind;
    await new Promise((r) => setTimeout(r, 350));
    return { ok: true };
  }

  async function handleArchive(reason: string) {
    if (!archiveTarget) return { ok: false, error: 'No target.' };
    const supabase = createClient();
    const { error } = await supabase
      .from('trading_accounts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        ...(reason ? { archive_reason: reason } : {}),
      })
      .eq('id', archiveTarget.id);
    if (error) return { ok: false, error: error.message };
    setAccounts((list) =>
      list.map((a) => (a.id === archiveTarget.id ? { ...a, is_active: false } : a)),
    );
    return { ok: true };
  }

  return (
    <div>
      <AccountsHeader liveEquity={liveEquity} demoEquity={demoEquity} />
      <AccountFilterTabs value={filter} onChange={setFilter} counts={counts} />

      {filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              onLeverageChange={setLeverageTarget}
              onResetPassword={setPwdTarget}
              onArchive={setArchiveTarget}
            />
          ))}
        </div>
      )}

      <LeverageChangeDialog
        account={leverageTarget}
        open={!!leverageTarget}
        onClose={() => setLeverageTarget(null)}
        onSubmit={handleLeverageChange}
      />
      <ResetPasswordDialog
        account={pwdTarget}
        open={!!pwdTarget}
        onClose={() => setPwdTarget(null)}
        onSubmit={handleResetPassword}
      />
      <ArchiveAccountDialog
        account={archiveTarget}
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onSubmit={handleArchive}
      />
    </div>
  );
}

function EmptyState({ filter }: { filter: AccountFilter }) {
  const copy =
    filter === 'archived' ? 'No archived accounts.' :
    filter === 'demo'     ? 'No demo accounts. Open one to practise risk-free.' :
    filter === 'live'     ? 'No live accounts yet. Open one to start trading real capital.' :
                            'No trading accounts yet.';
  return (
    <div
      className="rounded-xl px-6 py-12 text-center"
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="text-[14px]" style={{ color: 'var(--g-text-secondary)' }}>{copy}</div>
      {filter !== 'archived' && (
        <a
          href="/dashboard/accounts/new"
          className="inline-block mt-4 text-[12px]"
          style={{ color: 'var(--g-accent)' }}
        >
          Open new account →
        </a>
      )}
    </div>
  );
}
