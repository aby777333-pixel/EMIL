// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — KYC Document Upload API
// POST: Upload KYC document  |  GET: Get KYC status
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const VALID_TYPES = [
  'passport', 'national_id', 'drivers_license',
  'utility_bill', 'bank_statement', 'selfie', 'proof_of_funds',
] as const;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: documents, error } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch KYC documents' }, { status: 500 });
    }

    // Get user's overall KYC status
    const { data: profile } = await supabase
      .from('users')
      .select('kyc_status, kyc_level')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      kyc_status: profile?.kyc_status || 'pending',
      kyc_level: profile?.kyc_level || 0,
      documents: documents || [],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, file_url, file_name, expires_at } = body;

    // Validate document type
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({
        error: `Invalid document type. Must be one of: ${VALID_TYPES.join(', ')}`,
      }, { status: 400 });
    }

    if (!file_url) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    // Check for existing document of same type
    const { data: existing } = await supabase
      .from('kyc_documents')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('type', type)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (existing?.status === 'approved') {
      return NextResponse.json({
        error: `A ${type} document is already approved. Contact support to replace it.`,
      }, { status: 409 });
    }

    // Upsert: replace pending, insert new
    const { data: doc, error: insertError } = await supabase
      .from('kyc_documents')
      .upsert({
        ...(existing ? { id: existing.id } : {}),
        user_id: user.id,
        type,
        file_url,
        file_name: file_name || `${type}_document`,
        status: 'pending',
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save KYC document' }, { status: 500 });
    }

    // Update user's KYC status to under_review if they have submitted docs
    await supabase
      .from('users')
      .update({ kyc_status: 'under_review' })
      .eq('id', user.id)
      .eq('kyc_status', 'pending');

    return NextResponse.json({
      document: doc,
      message: 'KYC document uploaded successfully. Review typically takes 1-2 business days.',
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
