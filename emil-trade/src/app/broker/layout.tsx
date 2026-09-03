import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BrokerSidebar, BrokerTopBar } from './BrokerSidebar';

export default async function BrokerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/broker/overview');
  }

  // Fetch user profile + broker info
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role, broker_id')
    .eq('id', user.id)
    .single();

  // Fetch broker name if broker_id exists
  let brokerName = 'Broker';
  if (profile?.broker_id) {
    const { data: broker } = await supabase
      .from('brokers')
      .select('name')
      .eq('id', profile.broker_id)
      .single();
    brokerName = broker?.name ?? 'Broker';
  }

  const userEmail = user.email ?? '';
  // Default to LIVE; could come from query param or user preference
  const environment: 'LIVE' | 'SANDBOX' = 'LIVE';

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <BrokerSidebar
        brokerName={brokerName}
        userEmail={userEmail}
        environment={environment}
      />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <BrokerTopBar
          brokerName={brokerName}
          userEmail={userEmail}
          environment={environment}
        />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
