// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Converter Upload API
// Handles MQL5 file uploads and initiates conversion pipeline
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ConversionPipeline } from '@/lib/converter/pipeline';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file
const MAX_FILES = 50;
const ALLOWED_EXTENSIONS = ['.mq5', '.ex5'];

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const files = formData.getAll('files') as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximum ${MAX_FILES} files per batch` }, { status: 400 });
  }

  // Validate files
  const validationErrors: { file: string; error: string }[] = [];
  for (const file of files) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      validationErrors.push({ file: file.name, error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` });
    }
    if (file.size > MAX_FILE_SIZE) {
      validationErrors.push({ file: file.name, error: `File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB` });
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: validationErrors }, { status: 400 });
  }

  // Create conversion job
  const { data: job, error: jobError } = await supabase
    .from('conversion_jobs')
    .insert({
      user_id: user.id,
      total_files: files.length,
      status: 'processing',
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create conversion job' }, { status: 500 });
  }

  // Process each file
  const pipeline = new ConversionPipeline();
  const results = [];

  for (const file of files) {
    const sourceCode = await file.text();
    const fileId = crypto.randomUUID();

    // Insert file record
    await supabase.from('conversion_files').insert({
      id: fileId,
      job_id: job.id,
      user_id: user.id,
      file_name: file.name,
      file_size: file.size,
      file_type: file.name.endsWith('.ex5') ? 'ex5' : 'mq5',
      original_code: sourceCode,
      stage: 'queued',
    });

    // Run conversion pipeline
    const result = await pipeline.processFile(fileId, file.name, sourceCode);

    // Update file record with results
    await supabase.from('conversion_files').update({
      stage: result.file.stage,
      progress: result.file.progress,
      confidence_score: result.file.confidenceScore,
      semantic_analysis: result.file.semanticAnalysis,
      generated_output: result.file.generatedOutput,
      errors: result.file.errors,
      warnings: result.file.warnings,
      updated_at: new Date().toISOString(),
    }).eq('id', fileId);

    results.push({
      id: fileId,
      fileName: file.name,
      success: result.success,
      stage: result.file.stage,
      confidenceScore: result.file.confidenceScore,
      errors: result.file.errors,
      warnings: result.file.warnings,
    });
  }

  // Update job status
  const completed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const status = failed === results.length ? 'failed' : completed === results.length ? 'completed' : 'partial';

  await supabase.from('conversion_jobs').update({
    completed_files: completed,
    failed_files: failed,
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', job.id);

  return NextResponse.json({
    jobId: job.id,
    totalFiles: files.length,
    completed,
    failed,
    status,
    files: results,
  });
}
