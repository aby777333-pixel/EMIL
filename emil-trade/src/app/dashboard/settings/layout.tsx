import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/portal/settings/SettingsTabs';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/settings');

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
          Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
          Account security, regional preferences, notification routing, sessions, and API access.
        </p>
      </header>
      <SettingsTabs />
      {children}
    </div>
  );
}
