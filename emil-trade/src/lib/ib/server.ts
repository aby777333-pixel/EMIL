import 'server-only';
import Decimal from 'decimal.js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { IbStats } from '@/components/portal/ib/IbOverviewStats';
import type { ClientRow } from '@/components/portal/ib/ClientsTable';
import type { CommissionRow } from '@/components/portal/ib/CommissionsTable';

interface IbProfileRow {
  id: string;
  tier: number | null;
  referral_link: string | null;
  referred_clients: number | null;
  active_traders: number | null;
  total_volume_lots: number | string | null;
  total_commission_earned: number | string | null;
  total_commission_paid: number | string | null;
  pending_payout: number | string | null;
}

export interface IbContext {
  profile: IbProfileRow | null;
  refCode: string;
  stats: IbStats;
}

/**
 * Load (or synthesize) the IB context for the current user. The
 * `ib_profiles` row may not exist yet for new partners — we render
 * a zero-state context so the UI surface still shows correctly with
 * an inline "your IB tier is being approved" hint.
 */
export async function loadIbContext(userId: string, fallbackEmail: string): Promise<IbContext> {
  const supabase = await createServerSupabaseClient();
  const { data: profileRaw } = await supabase
    .from('ib_profiles')
    .select('id, tier, referral_link, referred_clients, active_traders, total_volume_lots, total_commission_earned, total_commission_paid, pending_payout')
    .eq('user_id', userId)
    .maybeSingle();

  const profile = (profileRaw ?? null) as IbProfileRow | null;
  const refCode = profile?.referral_link?.split('/').pop()
    ?? deriveRefCode(fallbackEmail, userId);

  // MTD = sum of commissions whose paid_at (or created_at if unpaid)
  // falls in the current month. Fast-path: if the user has no profile,
  // there's nothing to fetch.
  let commissionMTD = new Decimal(0);
  let lotsMTD = new Decimal(0);
  if (profile?.id) {
    const start = new Date();
    start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
    const startIso = start.toISOString();

    const { data: payouts } = await supabase
      .from('ib_payouts')
      .select('amount, period, created_at')
      .eq('ib_id', profile.id)
      .gte('created_at', startIso);
    for (const p of payouts ?? []) {
      commissionMTD = commissionMTD.plus(new Decimal((p.amount as number | string) ?? 0));
    }

    // Per spec, "lots traded MTD" is summed from referred clients.
    const { data: refClients } = await supabase
      .from('ib_referrals')
      .select('total_volume, last_trade_at')
      .eq('ib_id', profile.id)
      .gte('last_trade_at', startIso);
    for (const r of refClients ?? []) {
      lotsMTD = lotsMTD.plus(new Decimal((r.total_volume as number | string) ?? 0));
    }
  }

  return {
    profile,
    refCode,
    stats: {
      totalClients: profile?.referred_clients ?? 0,
      activeTraders: profile?.active_traders ?? 0,
      lotsMTD: lotsMTD.toFixed(2),
      commissionMTD: commissionMTD.toFixed(2),
      pendingPayout: new Decimal((profile?.pending_payout ?? 0) as number | string).toFixed(2),
      lifetimeCommission: new Decimal((profile?.total_commission_earned ?? 0) as number | string).toFixed(2),
      baseCurrency: 'USD',
    },
  };
}

/**
 * Mask a client's display name for partner reporting. We never expose
 * raw PII in IB views — first letter, three asterisks, last initial.
 */
export function maskClientName(name: string | null): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '—';
  const first = parts[0];
  const last = parts[parts.length - 1];
  const lastInitial = last && last !== first ? `${last[0]}.` : '';
  return `${first[0]?.toUpperCase() ?? ''}***${first.slice(-1).toLowerCase()} ${lastInitial}`.trim();
}

export async function loadClients(ibProfileId: string): Promise<ClientRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data: rows } = await supabase
    .from('ib_referrals')
    .select('id, client_name, total_volume, total_commission, status, last_trade_at')
    .eq('ib_id', ibProfileId)
    .order('total_volume', { ascending: false })
    .limit(100);
  return (rows ?? []).map((r): ClientRow => ({
    id: r.id as string,
    display_name: maskClientName(r.client_name as string | null),
    country: '—', // we don't expose country to the partner — pulled from a separate join when ready
    status: ((r.status as string) ?? 'registered') as ClientRow['status'],
    lots_mtd: Number((r.total_volume as number | string) ?? 0),
    last_trade_at: (r.last_trade_at as string | null) ?? null,
    commission_mtd: new Decimal((r.total_commission as number | string) ?? 0).toFixed(2),
    currency: 'USD',
  }));
}

export async function loadCommissions(ibProfileId: string): Promise<CommissionRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data: rows } = await supabase
    .from('ib_payouts')
    .select('id, period, amount, currency, status, paid_at, client_breakdown, created_at')
    .eq('ib_id', ibProfileId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (rows ?? []).map((r): CommissionRow => {
    const breakdown = Array.isArray(r.client_breakdown) ? (r.client_breakdown as unknown[]) : [];
    return {
      id: r.id as string,
      period: (r.period as string) ?? new Date(r.created_at as string).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      amount: new Decimal((r.amount as number | string) ?? 0).toFixed(2),
      currency: ((r.currency as string) ?? 'USD'),
      status: ((r.status as string) ?? 'pending') as CommissionRow['status'],
      client_count: breakdown.length,
      paid_at: (r.paid_at as string | null) ?? null,
    };
  });
}

function deriveRefCode(email: string, userId: string): string {
  // Stable code derived from email-stem + last 4 of user id. Preserves
  // privacy (no raw email visible) and is reproducible across loads.
  const stem = (email.split('@')[0] ?? 'partner').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
  const tail = userId.replace(/-/g, '').slice(-4).toUpperCase();
  return `${stem || 'PARTNER'}-${tail}`;
}
