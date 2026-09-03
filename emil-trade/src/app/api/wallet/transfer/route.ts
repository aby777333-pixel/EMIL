// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Internal Transfer API
// POST: Move funds between two trading accounts owned by the same
// user. Same currency only (cross-currency uses /api/wallet/convert).
// All money math runs through Decimal — no JS Number for currency.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const TransferSchema = z.object({
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive decimal with at most 2 fractional digits.'),
});

interface TransferResult {
  reference: string;
  from_balance: string;
  to_balance: string;
}

export async function POST(request: NextRequest) {
  // 1. Auth.
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonErr('Unauthorized', 401);

  // 2. Validate.
  let body: unknown;
  try { body = await request.json(); } catch { return jsonErr('Invalid JSON body', 400); }
  const parsed = TransferSchema.safeParse(body);
  if (!parsed.success) return jsonErr(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  const input = parsed.data;

  if (input.from_account_id === input.to_account_id) {
    return jsonErr('Source and destination must be different accounts.', 400);
  }

  // 3. Load both accounts and verify ownership.
  const { data: accounts, error: acctErr } = await supabase
    .from('trading_accounts')
    .select('id, account_number, currency, balance, is_active')
    .in('id', [input.from_account_id, input.to_account_id])
    .eq('user_id', user.id);

  if (acctErr || !accounts || accounts.length !== 2) {
    return jsonErr('One or both accounts could not be found.', 404);
  }

  const from = accounts.find((a) => a.id === input.from_account_id);
  const to = accounts.find((a) => a.id === input.to_account_id);
  if (!from || !to) return jsonErr('Account lookup mismatch.', 404);

  if (!from.is_active || !to.is_active) {
    return jsonErr('Both accounts must be active.', 400);
  }
  if (from.currency !== to.currency) {
    return jsonErr(
      `Currency mismatch: ${from.currency} → ${to.currency}. Use Convert to change currency, then transfer.`,
      400,
    );
  }

  // 4. Balance check.
  const amount = new Decimal(input.amount);
  const fromBalance = new Decimal(from.balance ?? 0);
  if (amount.greaterThan(fromBalance)) {
    return jsonErr(`Insufficient balance on source account. You have ${fromBalance.toFixed(2)} ${from.currency}.`, 400);
  }

  // 5. Atomic-ish update — Supabase doesn't expose multi-statement
  //    transactions over PostgREST, so we update each row sequentially
  //    and roll back the source debit if the destination credit fails.
  const newFromBalance = fromBalance.minus(amount);
  const { error: debitErr } = await supabase
    .from('trading_accounts')
    .update({ balance: newFromBalance.toFixed(2), updated_at: new Date().toISOString() })
    .eq('id', from.id)
    .eq('user_id', user.id);
  if (debitErr) return jsonErr('Failed to debit source account.', 500);

  const newToBalance = new Decimal(to.balance ?? 0).plus(amount);
  const { error: creditErr } = await supabase
    .from('trading_accounts')
    .update({ balance: newToBalance.toFixed(2), updated_at: new Date().toISOString() })
    .eq('id', to.id)
    .eq('user_id', user.id);
  if (creditErr) {
    // Roll back the debit.
    await supabase
      .from('trading_accounts')
      .update({ balance: fromBalance.toFixed(2), updated_at: new Date().toISOString() })
      .eq('id', from.id)
      .eq('user_id', user.id);
    return jsonErr('Failed to credit destination account. Source rolled back.', 500);
  }

  // 6. Audit-trail entry.
  const reference = buildReference();
  await supabase
    .from('client_transactions')
    .insert({
      user_id: user.id,
      wallet_id: null,
      type: 'transfer',
      amount: amount.toFixed(2),
      currency: from.currency,
      method: 'internal',
      status: 'completed',
      reference,
      psp_reference: null,
      fee: '0',
      notes: `${from.account_number} → ${to.account_number}`,
    });

  return jsonOk<TransferResult>({
    reference,
    from_balance: newFromBalance.toFixed(2),
    to_balance: newToBalance.toFixed(2),
  });
}

function buildReference(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(-4);
  return `GR-TRF-${ts}${rand}`;
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}
function jsonErr(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
