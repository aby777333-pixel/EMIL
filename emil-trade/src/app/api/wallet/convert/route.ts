// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Currency Convert API
// POST: Convert balance between two of the user's currency wallets
// at the indicative spot rate from lib/wallet/money.ts. Atomic-ish:
// debit source → credit destination → roll back on failure.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUPPORTED_CURRENCIES, quoteConvert } from '@/lib/wallet/money';

const ConvertSchema = z.object({
  from_currency: z.enum(SUPPORTED_CURRENCIES),
  to_currency: z.enum(SUPPORTED_CURRENCIES),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive decimal with at most 2 fractional digits.'),
});

interface ConvertResult {
  reference: string;
  rate: string;
  from_amount: string;
  to_amount: string;
  spread_bps: number;
}

export async function POST(request: NextRequest) {
  // 1. Auth.
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonErr('Unauthorized', 401);

  // 2. Validate.
  let body: unknown;
  try { body = await request.json(); } catch { return jsonErr('Invalid JSON body', 400); }
  const parsed = ConvertSchema.safeParse(body);
  if (!parsed.success) return jsonErr(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  const input = parsed.data;

  if (input.from_currency === input.to_currency) {
    return jsonErr('Pick two different currencies to convert between.', 400);
  }

  // 3. Quote the conversion.
  const quote = quoteConvert(input.from_currency, input.to_currency, input.amount);
  if (!quote) return jsonErr('Currency pair not supported.', 400);

  const fromAmt = new Decimal(quote.from_amount);
  const toAmt = new Decimal(quote.to_amount);

  // 4. Load source wallet, verify balance.
  const { data: fromWallet, error: fromErr } = await supabase
    .from('client_wallets')
    .select('id, balance')
    .eq('user_id', user.id)
    .eq('currency', input.from_currency)
    .eq('is_active', true)
    .maybeSingle();
  if (fromErr || !fromWallet) {
    return jsonErr(`No active ${input.from_currency} wallet found.`, 404);
  }
  const fromBalance = new Decimal(fromWallet.balance ?? 0);
  if (fromAmt.greaterThan(fromBalance)) {
    return jsonErr(`Insufficient ${input.from_currency} balance. You have ${fromBalance.toFixed(2)}.`, 400);
  }

  // 5. Load or create destination wallet.
  const { data: existingTo } = await supabase
    .from('client_wallets')
    .select('id, balance')
    .eq('user_id', user.id)
    .eq('currency', input.to_currency)
    .maybeSingle();

  let toWalletId = existingTo?.id as string | undefined;
  let toBalance = new Decimal(existingTo?.balance ?? 0);
  if (!toWalletId) {
    const { data: created, error: createErr } = await supabase
      .from('client_wallets')
      .insert({ user_id: user.id, currency: input.to_currency, balance: 0, locked_balance: 0, is_active: true })
      .select('id, balance')
      .single();
    if (createErr || !created) {
      return jsonErr('Failed to create destination wallet.', 500);
    }
    toWalletId = created.id as string;
    toBalance = new Decimal(0);
  }

  // 6. Atomic-ish update with rollback on failure.
  const newFromBalance = fromBalance.minus(fromAmt);
  const newToBalance = toBalance.plus(toAmt);

  const { error: debitErr } = await supabase
    .from('client_wallets')
    .update({ balance: newFromBalance.toFixed(2), updated_at: new Date().toISOString() })
    .eq('id', fromWallet.id)
    .eq('user_id', user.id);
  if (debitErr) return jsonErr('Failed to debit source wallet.', 500);

  const { error: creditErr } = await supabase
    .from('client_wallets')
    .update({ balance: newToBalance.toFixed(2), updated_at: new Date().toISOString() })
    .eq('id', toWalletId)
    .eq('user_id', user.id);
  if (creditErr) {
    await supabase
      .from('client_wallets')
      .update({ balance: fromBalance.toFixed(2), updated_at: new Date().toISOString() })
      .eq('id', fromWallet.id)
      .eq('user_id', user.id);
    return jsonErr('Failed to credit destination wallet. Source rolled back.', 500);
  }

  // 7. Audit-trail entries — one debit, one credit, both linked by reference.
  const reference = buildReference();
  const noteSuffix = `${input.from_currency}→${input.to_currency} @ ${quote.rate}`;
  await supabase.from('client_transactions').insert([
    {
      user_id: user.id,
      wallet_id: fromWallet.id,
      type: 'adjustment',
      amount: fromAmt.toFixed(2),
      currency: input.from_currency,
      method: 'convert',
      status: 'completed',
      reference,
      fee: '0',
      notes: `Convert out · ${noteSuffix}`,
    },
    {
      user_id: user.id,
      wallet_id: toWalletId,
      type: 'adjustment',
      amount: toAmt.toFixed(2),
      currency: input.to_currency,
      method: 'convert',
      status: 'completed',
      reference,
      fee: '0',
      notes: `Convert in · ${noteSuffix}`,
    },
  ]);

  return jsonOk<ConvertResult>({
    reference,
    rate: quote.rate,
    from_amount: fromAmt.toFixed(2),
    to_amount: toAmt.toFixed(2),
    spread_bps: quote.spread_bps,
  });
}

function buildReference(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(-4);
  return `GR-CNV-${ts}${rand}`;
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}
function jsonErr(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
