// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Open New Trading Account API
// POST: Provision a new trading_accounts row for the authenticated
// user. Type / platform / base currency / leverage / swap-free
// validated against the canonical lib/accounts/types tables.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  ACCOUNT_TYPES,
  PLATFORMS,
  SUPPORTED_BASE_CURRENCIES,
  LEVERAGE_TIERS,
} from '@/lib/accounts/types';

const TYPE_IDS = ACCOUNT_TYPES.map((t) => t.id) as ['standard', 'ecn', 'raw_spread', 'cent', 'demo'];
const PLATFORM_IDS = PLATFORMS.map((p) => p.id) as ['mt5', 'mt4', 'web', 'native'];

const CreateAccountSchema = z.object({
  account_type: z.enum(TYPE_IDS),
  platform: z.enum(PLATFORM_IDS),
  base_currency: z.enum(SUPPORTED_BASE_CURRENCIES),
  leverage: z.number().int().refine(
    (n) => (LEVERAGE_TIERS as readonly number[]).includes(n),
    'Leverage must be one of the supported tiers.',
  ),
  swap_free: z.boolean().default(false),
  agreed_to_terms: z.literal(true),
});

interface CreateAccountResult {
  id: string;
  account_number: string;
  account_type: string;
  platform: string;
  currency: string;
  leverage: number;
  is_demo: boolean;
}

export async function POST(request: NextRequest) {
  // 1. Auth.
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonErr('Unauthorized', 401);

  // 2. Validate.
  let body: unknown;
  try { body = await request.json(); } catch { return jsonErr('Invalid JSON body', 400); }
  const parsed = CreateAccountSchema.safeParse(body);
  if (!parsed.success) return jsonErr(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  const input = parsed.data;

  const typeSpec = ACCOUNT_TYPES.find((t) => t.id === input.account_type);
  if (!typeSpec) return jsonErr('Unknown account type.', 400);

  // 3. Leverage tier must be allowed for this type.
  if (input.leverage > typeSpec.maxLeverage) {
    return jsonErr(
      `${typeSpec.label} accounts max out at 1:${typeSpec.maxLeverage}.`,
      400,
    );
  }

  // 4. Risk gating — high leverage on live accounts requires verified KYC.
  if (!typeSpec.isDemo && input.leverage >= 500) {
    const { data: profile } = await supabase
      .from('users')
      .select('kyc_status')
      .eq('id', user.id)
      .single();
    const kyc = (profile?.kyc_status ?? '').toString().toLowerCase();
    const verified = kyc === 'verified' || kyc === 'approved' || kyc === 'tier2_verified' || kyc === 'tier2';
    if (!verified) {
      return jsonErr(
        'Leverage above 1:200 on a live account requires a verified ID. Complete KYC to unlock.',
        403,
      );
    }
  }

  // 5. Cap concurrent live accounts to keep operations sane.
  if (!typeSpec.isDemo) {
    const { count: liveCount } = await supabase
      .from('trading_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_demo', false);
    if ((liveCount ?? 0) >= 8) {
      return jsonErr('You have the maximum of 8 active live accounts. Archive one first.', 400);
    }
  }

  // 6. Generate the next account number — collision-resistant via a
  //    short timestamp + random suffix. The dealing-desk side picks up
  //    the row via Realtime and provisions the MT5 login asynchronously.
  const accountNumber = `RAP-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
  const startingBalance = typeSpec.isDemo ? '10000.00' : '0.00';

  const { data: created, error: insertErr } = await supabase
    .from('trading_accounts')
    .insert({
      user_id: user.id,
      account_number: accountNumber,
      account_type: input.account_type,
      platform: input.platform,
      currency: input.base_currency,
      leverage: input.leverage,
      balance: startingBalance,
      credit: 0,
      is_demo: typeSpec.isDemo ?? false,
      is_active: true,
      server: input.platform === 'mt5' ? 'GIORaptor-Live01' : input.platform === 'mt4' ? 'GIORaptor-Legacy' : null,
      swap_free: input.swap_free,
    })
    .select('id, account_number, account_type, platform, currency, leverage, is_demo')
    .single();

  if (insertErr || !created) {
    return jsonErr('Failed to provision account. Please retry or contact support.', 500);
  }

  return jsonOk<CreateAccountResult>(created as CreateAccountResult);
}

function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}
function jsonErr(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
