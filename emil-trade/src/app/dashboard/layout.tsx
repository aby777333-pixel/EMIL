import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PortalShell from '@/components/portal/PortalShell';

type KycStatus =
  | 'unverified'
  | 'pending_basic'
  | 'pending_enhanced'
  | 'verified'
  | 'tier2_verified'
  | 'rejected'
  | 'suspended';

// Normalize whatever value the users.kyc_status column holds today
// (`pending`, `approved`, etc.) into the strict KYC state machine the
// VerificationBanner expects. Unknown values default to `unverified`
// so the banner prompts the user to start KYC.
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/dashboard');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, kyc_status')
    .eq('id', user.id)
    .single();

  return (
    <PortalShell
      userName={profile?.full_name ?? ''}
      userEmail={user.email ?? ''}
      kycStatus={normalizeKyc(profile?.kyc_status)}
    >
      <div className="p-4 md:p-6">{children}</div>
    </PortalShell>
  );
}
