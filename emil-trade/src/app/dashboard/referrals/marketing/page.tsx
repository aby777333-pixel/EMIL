import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MarketingCreativesGallery from '@/components/portal/ib/MarketingCreativesGallery';
import { loadIbContext } from '@/lib/ib/server';

export default async function IbMarketingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/referrals/marketing');

  const ctx = await loadIbContext(user.id, user.email ?? '');

  return <MarketingCreativesGallery refCode={ctx.refCode} />;
}
