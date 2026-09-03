import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileTabs from '@/components/portal/profile/ProfileTabs';
import KycStatusPill, { type KycStatus } from '@/components/portal/profile/KycStatusPill';

function normalizeKyc(raw: unknown): KycStatus {
  if (typeof raw !== 'string') return 'unverified';
  switch (raw.toLowerCase()) {
    case 'verified':
    case 'approved':
      return 'verified';
    case 'tier2':
    case 'tier_2':
    case 'tier2_verified':
      return 'tier2_verified';
    case 'pending':
    case 'pending_basic':
    case 'submitted':
    case 'under_review':
      return 'pending_basic';
    case 'pending_enhanced':
    case 'enhanced':
      return 'pending_enhanced';
    case 'rejected':
      return 'rejected';
    case 'suspended':
    case 'frozen':
      return 'suspended';
    default:
      return 'unverified';
  }
}

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/profile');

  const { data: profile } = await supabase
    .from('users')
    .select('kyc_status')
    .eq('id', user.id)
    .single();

  const status = normalizeKyc(profile?.kyc_status);

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-light m-0" style={{ color: 'var(--g-text-primary)' }}>
            Profile
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--g-text-secondary)' }}>
            Personal details, identity verification, and account security.
          </p>
        </div>
        <KycStatusPill status={status} />
      </header>

      <ProfileTabs />
      {children}
    </div>
  );
}
