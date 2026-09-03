// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Wallet Deposit API
// POST: Register a deposit intent. Inserts a `client_transactions`
// row in `pending` state and returns the human-readable reference
// the user pays against.
// All money math runs through Decimal — no JS Number for currency.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { METHOD_MIN, METHOD_MAX, computeDeposit, SUPPORTED_CURRENCIES } from '@/lib/wallet/money';

const DepositSchema = z.object({
  method: z.enum(['bank_wire', 'card', 'upi', 'crypto', 'local', 'voucher']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive decimal with at most 2 fractional digits.'),
  currency: z.enum(SUPPORTED_CURRENCIES),
  network: z.string().optional(),
  receipt_url: z.string().optional(),
});

type DepositInput = z.infer<typeof DepositSchema>;

interface DepositResult {
  reference: string;
  status: 'pending';
  estimated_eta: string;
}

export async function POST(request: NextRequest) {
  // 1. Auth — RLS would also enforce this on insert, but we surface a
  //    clean 401 instead of a generic Postgres error.
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonErr('Unauthorized', 401);

  // 2. Validate input.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr('Invalid JSON body', 400);
  }
  const parsed = DepositSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErr(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  }
  const input: DepositInput = parsed.data;

  const amount = new Decimal(input.amount);
  const min = METHOD_MIN[input.method] ?? new Decimal('0');
  const max = METHOD_MAX[input.method] ?? new Decimal('1000000');
  if (amount.lessThan(min)) {
    return jsonErr(`Minimum deposit for this method is ${min.toFixed(2)} ${input.currency}.`, 400);
  }
  if (amount.greaterThan(max)) {
    return jsonErr(`Maximum deposit for this method is ${max.toFixed(2)} ${input.currency}.`, 400);
  }

  // 3. Resolve / create the matching client_wallet row so the ledger entry has a parent.
  const { data: existingWallet } = await supabase
    .from('client_wallets')
    .select('id')
    .eq('user_id', user.id)
    .eq('currency', input.currency)
    .maybeSingle();

  let walletId = existingWallet?.id as string | undefined;
  if (!walletId) {
    const { data: created, error: insertErr } = await supabase
      .from('client_wallets')
      .insert({ user_id: user.id, currency: input.currency, balance: 0, locked_balance: 0, is_active: true })
      .select('id')
      .single();
    if (insertErr) return jsonErr('Failed to create wallet for currency.', 500);
    walletId = created.id as string;
  }

  // 4. Build the reference + fee breakdown.
  const reference = buildReference(input.method);
  const { fee } = computeDeposit(input.method, input.amount);

  // 5. Insert the pending ledger entry.
  const { error: txErr } = await supabase
    .from('client_transactions')
    .insert({
      user_id: user.id,
      wallet_id: walletId,
      type: 'deposit',
      amount: amount.toFixed(2),
      currency: input.currency,
      method: input.method,
      status: 'pending',
      reference,
      psp_reference: null,
      fee,
      notes: input.network ? `Network: ${input.network}` : null,
    });

  if (txErr) {
    return jsonErr('Failed to record deposit. Please retry or contact support.', 500);
  }

  return jsonOk<DepositResult>({
    reference,
    status: 'pending',
    estimated_eta: estimatedEta(input.method),
  });
}

function buildReference(method: string): string {
  const prefix = method.slice(0, 3).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(-4);
  return `GR-DEP-${prefix}-${ts}${rand}`;
}

function estimatedEta(method: string): string {
  switch (method) {
    case 'bank_wire': return '1–3 business days';
    case 'card':      return 'Instant';
    case 'upi':       return 'Instant';
    case 'crypto':    return '10–30 minutes after network confirmations';
    case 'local':     return 'Varies by region';
    case 'voucher':   return 'Instant';
    default:          return 'Varies';
  }
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

function jsonErr(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
