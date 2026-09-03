import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SettingsView } from './SettingsView';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('users')
    .select('broker_id')
    .eq('id', user!.id)
    .single();

  const brokerId = profile?.broker_id;
  if (!brokerId) {
    return <p className="py-20 text-center text-secondary">No broker assigned.</p>;
  }

  const { data: broker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', brokerId)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Broker Settings</h1>
        <p className="text-xs text-secondary">Configure your brokerage platform</p>
      </div>
      <SettingsView broker={broker ?? {}} />
    </div>
  );
}
