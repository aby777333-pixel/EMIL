import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PersonalInfoForm from '@/components/portal/profile/PersonalInfoForm';

export default async function PersonalProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/profile/personal');

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, phone, country, date_of_birth')
    .eq('id', user.id)
    .single();

  return (
    <div className="space-y-4">
      <PersonalInfoForm
        defaults={{
          full_name: profile?.full_name ?? '',
          email: profile?.email ?? user.email ?? '',
          phone: profile?.phone ?? '',
          country: profile?.country ?? '',
          date_of_birth: profile?.date_of_birth ?? '',
        }}
      />
    </div>
  );
}
