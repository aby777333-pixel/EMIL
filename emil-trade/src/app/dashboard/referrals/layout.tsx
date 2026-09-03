import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import IbTabs from '@/components/portal/ib/IbTabs';

export default async function ReferralsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/referrals');

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
          Introducing broker
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Your referral link, downline activity, commissions, and creatives.
        </p>
      </header>
      <IbTabs />
      {children}
    </div>
  );
}
