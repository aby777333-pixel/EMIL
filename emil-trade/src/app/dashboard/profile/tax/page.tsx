import { FileText } from 'lucide-react';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

export default function TaxPage() {
  return (
    <DashboardCard>
      <div className="flex items-start gap-4 py-4">
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'rgba(220,38,38,0.08)',
            color: 'var(--g-accent)',
          }}
        >
          <FileText size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
            Tax forms
          </div>
          <p className="mt-1 text-sm leading-relaxed max-w-xl" style={{ color: 'var(--g-text-secondary)' }}>
            US persons file a W-8BEN. Non-US residents file a CRS self-certification. Forms are
            generated from the personal info on this profile and signed digitally — no upload required.
          </p>
          <p className="mt-3 text-[12px]" style={{ color: 'var(--g-text-muted)' }}>
            We&apos;ll surface the form your jurisdiction needs once your verified residency
            country is on file. Until then complete the Personal and Documents tabs.
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
