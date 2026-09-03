// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Converter Files API
// Fetch conversion files for a job or individual file detail
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobId = req.nextUrl.searchParams.get('jobId');
  const fileId = req.nextUrl.searchParams.get('fileId');

  if (fileId) {
    const { data: file } = await supabase
      .from('conversion_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ file });
  }

  if (jobId) {
    const { data: files } = await supabase
      .from('conversion_files')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ files: files ?? [] });
  }

  // List all user's conversion files
  const { data: files } = await supabase
    .from('conversion_files')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return NextResponse.json({ files: files ?? [] });
}
