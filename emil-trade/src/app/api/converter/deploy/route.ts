// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Script Deployment API
// Deploy converted scripts to live/demo/paper environments
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { conversionFileId, scope, target, targetIds, publishToMarketplace } = body;

  if (!conversionFileId) {
    return NextResponse.json({ error: 'conversionFileId required' }, { status: 400 });
  }

  // Fetch conversion file
  const { data: convFile } = await supabase
    .from('conversion_files')
    .select('*')
    .eq('id', conversionFileId)
    .eq('user_id', user.id)
    .single();

  if (!convFile || convFile.stage !== 'ready') {
    return NextResponse.json({ error: 'Conversion file not found or not ready' }, { status: 404 });
  }

  const analysis = convFile.semantic_analysis as Record<string, unknown>;
  const generated = convFile.generated_output as Record<string, string>;
  const manifest = JSON.parse(generated.deploymentManifest || '{}');

  // Create raptor script
  const { data: script, error: scriptError } = await supabase
    .from('raptor_scripts')
    .insert({
      conversion_file_id: conversionFileId,
      user_id: user.id,
      name: convFile.file_name.replace(/\.(mq5|ex5)$/i, ''),
      description: generated.readme?.slice(0, 500) ?? '',
      kind: analysis.scriptKind ?? 'ea',
      classification: analysis.classification ?? 'custom',
      typescript_code: generated.typescript ?? '',
      pine_script: generated.pineScript ?? '',
      config_component: generated.configComponent ?? '',
      zod_schema: generated.zodSchema ?? '',
      deployment_manifest: manifest,
      risk_flags: analysis.riskFlags ?? [],
      requires_broker_approval: manifest.requiresBrokerApproval ?? false,
    })
    .select()
    .single();

  if (scriptError || !script) {
    return NextResponse.json({ error: 'Failed to create script' }, { status: 500 });
  }

  // Create deployment
  const { data: deployment, error: deployError } = await supabase
    .from('script_deployments')
    .insert({
      script_id: script.id,
      scope: scope ?? 'demo',
      target: target ?? 'single_account',
      target_ids: targetIds ?? [],
      deployed_by: user.id,
    })
    .select()
    .single();

  if (deployError) {
    return NextResponse.json({ error: 'Failed to create deployment' }, { status: 500 });
  }

  // Update conversion file stage
  await supabase.from('conversion_files').update({
    stage: 'deployed',
    updated_at: new Date().toISOString(),
  }).eq('id', conversionFileId);

  // Optionally publish to marketplace
  let listing = null;
  if (publishToMarketplace) {
    const { data: marketListing } = await supabase
      .from('marketplace_listings')
      .insert({
        script_id: script.id,
        author_id: user.id,
        name: script.name,
        description: generated.documentation ?? '',
        short_description: `Converted ${analysis.scriptKind} — ${String(analysis.classification).replace(/_/g, ' ')}`,
        category: analysis.scriptKind as string,
        classification: analysis.classification as string,
        is_published: true,
      })
      .select()
      .single();
    listing = marketListing;
  }

  return NextResponse.json({
    scriptId: script.id,
    deploymentId: deployment?.id,
    scope: deployment?.scope,
    target: deployment?.target,
    requiresBrokerApproval: script.requires_broker_approval,
    marketplaceListing: listing?.id ?? null,
  });
}
