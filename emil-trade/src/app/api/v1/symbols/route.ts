// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Symbols API
// GET: List all available trading instruments
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: instruments, error } = await supabase
      .from('instruments')
      .select('*')
      .eq('is_active', true)
      .order('type', { ascending: true })
      .order('symbol', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch instruments' }, { status: 500 });
    }

    // Group by type
    const grouped: Record<string, typeof instruments> = {};
    for (const inst of instruments || []) {
      const type = inst.type || 'other';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(inst);
    }

    return NextResponse.json({
      symbols: instruments || [],
      grouped,
      count: instruments?.length || 0,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
