import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DocumentUploader from '@/components/portal/profile/DocumentUploader';
import VerificationProgress from '@/components/portal/profile/VerificationProgress';
import type { KycStatus } from '@/components/portal/profile/KycStatusPill';

function normalizeKyc(raw: unknown): KycStatus {
  if (typeof raw !== 'string') return 'unverified';
  switch (raw.toLowerCase()) {
    case 'verified':
    case 'approved': return 'verified';
    case 'tier2':
    case 'tier_2':
    case 'tier2_verified': return 'tier2_verified';
    case 'pending':
    case 'pending_basic':
    case 'submitted':
    case 'under_review': return 'pending_basic';
    case 'pending_enhanced':
    case 'enhanced': return 'pending_enhanced';
    case 'rejected': return 'rejected';
    case 'suspended': return 'suspended';
    default: return 'unverified';
  }
}

interface KycDoc {
  type: string;
  status: 'pending' | 'approved' | 'rejected' | 'review';
  file_name: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export default async function KycPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard/profile/kyc');

  const { data: profile } = await supabase
    .from('users')
    .select('kyc_status')
    .eq('id', user.id)
    .single();
  const status = normalizeKyc(profile?.kyc_status);

  const { data: docsRaw } = await supabase
    .from('kyc_documents')
    .select('type, status, file_name, rejection_reason, created_at, reviewed_at')
    .eq('user_id', user.id);

  const docs = (docsRaw ?? []) as KycDoc[];
  const byType = new Map(docs.map((d) => [d.type, d]));

  // Pull the most recent submitted_at / reviewed_at for the stepper.
  const latest = docs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return (
    <div className="space-y-6">
      <VerificationProgress
        status={status}
        submittedAt={latest?.created_at ?? null}
        reviewedAt={latest?.reviewed_at ?? null}
      />

      <section className="space-y-2">
        <h2 className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
          Identity verification
        </h2>
        <p className="text-[12px]" style={{ color: 'var(--g-text-muted)' }}>
          Three documents required. All files are encrypted and visible only to compliance reviewers.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
          <DocumentUploader
            type="passport"
            title="Government-issued ID"
            description="Passport, national ID, or driver's licence. Both sides if applicable."
            existing={mapExisting(byType.get('passport') ?? byType.get('national_id') ?? byType.get('drivers_license'))}
          />
          <DocumentUploader
            type="utility_bill"
            title="Proof of address"
            description="Utility bill, bank statement, or government letter dated within the last 90 days."
            existing={mapExisting(byType.get('utility_bill') ?? byType.get('bank_statement'))}
          />
          <DocumentUploader
            type="selfie"
            title="Selfie verification"
            description="Clear photo of you holding your ID. The face on the ID must be visible."
            existing={mapExisting(byType.get('selfie'))}
          />
          <DocumentUploader
            type="proof_of_funds"
            title="Source of funds (optional)"
            description="Required only above the standard deposit threshold. Salary slip, dividend statement, etc."
            existing={mapExisting(byType.get('proof_of_funds'))}
          />
        </div>
      </section>
    </div>
  );
}

function mapExisting(d: KycDoc | undefined) {
  if (!d) return null;
  const status =
    d.status === 'pending' ? 'review'
    : d.status === 'approved' ? 'approved'
    : d.status === 'rejected' ? 'rejected'
    : 'review';
  return {
    file_name: d.file_name,
    status: status as 'review' | 'approved' | 'rejected',
    rejection_reason: d.rejection_reason,
  };
}
