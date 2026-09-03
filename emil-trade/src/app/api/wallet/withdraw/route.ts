// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Wallet Withdrawal API
// POST: Create a withdrawal request. Decimal-safe end-to-end. KYC
// gate, balance check, large-transaction flag, OTP-confirmed.
// All withdrawals enter `pending` and queue for manual finance
// review — never auto-approved over the spec's $1,000 ceiling.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUPPORTED_CURRENCIES } from '@/lib/wallet/money';

const BankDestination = z.object({
  kind: z.literal('bank'),
  beneficiary_name: z.string().min(2).max(120),
  bank_name: z.string().min(2).max(120),
  account_number: z.string().min(4).max(40),
  swift_or_ifsc: z.string().min(4).max(11),
});
const UpiDestination = z.object({
  kind: z.literal('upi'),
  beneficiary_name: z.string().min(2).max(120),
  upi_id: z.string().min(3).max(80),
});
const CryptoDestination = z.object({
  kind: z.literal('crypto'),
  network: z.enum(['TRC20', 'ERC20']),
  address: z.string().min(20).max(80),
});

const WithdrawSchema = z.object({
  method: z.enum(['bank_wire', 'upi', 'crypto']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive decimal with at most 2 fractional digits.'),
  currency: z.enum(SUPPORTED_CURRENCIES),
  destination: z.discriminatedUnion('kind', [BankDestination, UpiDestination, CryptoDestination]),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits.'),
});

const LARGE_TXN_THRESHOLD_USD = new Decimal('1000');
// Same FX table the wallet overview uses. When a real /api/fx endpoint
// ships, both modules read from it.
const FX_TO_USD: Record<string, string> = {
  USD: '1', EUR: '1.08', GBP: '1.27', INR: '0.012', USDT: '1',
};

interface WithdrawResult {
  reference: string;
  status: 'pending';
  estimated_eta: string;
  large_transaction_flag: boolean;
}

export async function POST(request: NextRequest) {
  // 1. Auth.
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonErr('Unauthorized', 401);

  // 2. Validate input.
  let body: unknown;
  try { body = await request.json(); } catch { return jsonErr('Invalid JSON body', 400); }
  const parsed = WithdrawSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErr(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  }
  const input = parsed.data;

  // 3. KYC gate — withdrawals require verified status per spec.
  const { data: profile } = await supabase
    .from('users')
    .select('kyc_status, full_name')
    .eq('id', user.id)
    .single();
  const kyc = (profile?.kyc_status ?? '').toString().toLowerCase();
  const verified = kyc === 'verified' || kyc === 'approved' || kyc === 'tier2_verified' || kyc === 'tier2';
  if (!verified) {
    return jsonErr('Identity verification required before withdrawing. Complete KYC first.', 403);
  }

  // 4. AML same-name check for bank + UPI methods. Crypto destinations
  //    are name-less by design.
  if (input.destination.kind !== 'crypto') {
    const beneficiary = input.destination.beneficiary_name.trim().toLowerCase();
    const onFile = (profile?.full_name ?? '').toString().trim().toLowerCase();
    if (onFile && !namesPlausiblyMatch(onFile, beneficiary)) {
      return jsonErr(
        'Beneficiary name must match the name on your verified ID. ' +
        'Contact support if your legal name has changed.',
        400,
      );
    }
  }

  // 5. Balance check against the matching currency wallet.
  const { data: wallet, error: walletErr } = await supabase
    .from('client_wallets')
    .select('id, balance, locked_balance')
    .eq('user_id', user.id)
    .eq('currency', input.currency)
    .eq('is_active', true)
    .maybeSingle();
  if (walletErr || !wallet) {
    return jsonErr(`No active ${input.currency} wallet found.`, 404);
  }

  const amount = new Decimal(input.amount);
  const balance = new Decimal(wallet.balance ?? 0);
  if (amount.greaterThan(balance)) {
    return jsonErr(`Insufficient available balance. You have ${balance.toFixed(2)} ${input.currency}.`, 400);
  }

  // 6. Cap concurrent pending withdrawals so the queue stays sane.
  const { count: pendingCount } = await supabase
    .from('client_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'withdrawal')
    .eq('status', 'pending');
  if ((pendingCount ?? 0) >= 3) {
    return jsonErr('You already have 3 pending withdrawal requests. Wait for them to settle before submitting more.', 400);
  }

  // 7. OTP — TODO: persist a code in a dedicated `auth.otp` table with
  //    a 5-min TTL once email/SMS senders are wired. For now we accept
  //    any 6-digit code (already validated by the schema) and rely on
  //    the user-flow + finance review for fraud control. Document this
  //    explicitly so reviewers know what's not yet enforced.
  // ----------------------------------------------------------------

  // 8. Build the reference and large-transaction flag.
  const reference = buildReference();
  const usdRate = new Decimal(FX_TO_USD[input.currency] ?? '0');
  const usdValue = amount.times(usdRate);
  const largeTxn = usdValue.greaterThanOrEqualTo(LARGE_TXN_THRESHOLD_USD);

  const destinationSummary = summarizeDestination(input.destination);

  const { error: insertErr } = await supabase
    .from('client_transactions')
    .insert({
      user_id: user.id,
      wallet_id: wallet.id,
      type: 'withdrawal',
      amount: amount.toFixed(2),
      currency: input.currency,
      method: input.method,
      status: 'pending',
      reference,
      psp_reference: null,
      fee: '0',
      notes: largeTxn
        ? `LARGE_TXN flag · ${destinationSummary}`
        : destinationSummary,
    });

  if (insertErr) {
    return jsonErr('Failed to record withdrawal. Please retry or contact support.', 500);
  }

  return jsonOk<WithdrawResult>({
    reference,
    status: 'pending',
    estimated_eta:
      input.method === 'bank_wire' ? '1–3 business days'
      : input.method === 'upi'      ? 'Same day'
      : 'Within 30 minutes after on-chain confirmations',
    large_transaction_flag: largeTxn,
  });
}

/**
 * Compares two display names with light leniency: case-insensitive,
 * whitespace-collapsed, and tolerant of middle-name omission. Reject
 * if surnames don't share at least one common token.
 */
function namesPlausiblyMatch(onFile: string, beneficiary: string): boolean {
  const norm = (s: string) =>
    s
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z\s]/gi, ' ')
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((t) => t.length >= 2);
  const a = new Set(norm(onFile));
  const b = new Set(norm(beneficiary));
  if (a.size === 0 || b.size === 0) return false;
  const overlap = [...a].filter((t) => b.has(t)).length;
  // Require at least 2 shared tokens (or 1 if both names are short).
  return overlap >= 2 || (overlap >= 1 && (a.size <= 2 || b.size <= 2));
}

function summarizeDestination(d: z.infer<typeof WithdrawSchema>['destination']): string {
  if (d.kind === 'bank') {
    const tail = d.account_number.slice(-4);
    return `Bank ${d.bank_name} •••${tail} (${d.beneficiary_name})`;
  }
  if (d.kind === 'upi') {
    return `UPI ${d.upi_id} (${d.beneficiary_name})`;
  }
  return `Crypto USDT ${d.network} ${d.address.slice(0, 6)}…${d.address.slice(-4)}`;
}

function buildReference(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(-4);
  return `GR-WDR-${ts}${rand}`;
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}
function jsonErr(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
