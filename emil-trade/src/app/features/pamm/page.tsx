import FeaturePage from '@/components/FeaturePage';

export default function PAMMPage() {
  return (
    <FeaturePage
      badge="PAMM / MAM"
      badgeColor="#0091D5"
      title="PAMM & MAM Accounts"
      subtitle="Professional fund management tools"
      description="Percentage Allocation Management Module (PAMM) and Multi-Account Manager (MAM) tools for fund managers. Manage investor capital with automated profit/loss allocation, transparent reporting, and institutional-grade controls."
      features={[
        { title: 'Fund Marketplace', desc: 'Investors browse ranked PAMM funds with full transparency — returns, drawdown, AUM, fee structure, and manager track record.' },
        { title: 'Automated Allocation', desc: 'Profits and losses are automatically distributed to investors based on their share of the total fund equity.' },
        { title: 'Manager Dashboard', desc: 'Fund managers get a dedicated dashboard with AUM tracking, investor list, allocation breakdown, and fee earnings.' },
        { title: 'Flexible Fee Structures', desc: 'Configure management fees, performance fees (high-water mark), and minimum investment amounts.' },
        { title: 'NAV Calculation', desc: 'Real-time Net Asset Value calculation ensures fair entry and exit pricing for all investors.' },
        { title: 'Investor Protection', desc: 'Maximum drawdown limits, lock-in periods, and transparent reporting protect investor interests.' },
      ]}
    />
  );
}
