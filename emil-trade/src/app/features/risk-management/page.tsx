import FeaturePage from '@/components/FeaturePage';

export default function RiskManagementPage() {
  return (
    <FeaturePage
      badge="Risk Management"
      badgeColor="#FF4560"
      title="Risk Management Tools"
      subtitle="Protect your brokerage and your clients"
      description="Real-time risk monitoring, A/B book management, automated stop-out systems, and customizable margin controls. Designed for brokers who need institutional-grade risk oversight."
      ctaText="Contact Sales"
      ctaHref="/contact"
      features={[
        { title: 'Real-Time Monitoring', desc: 'Track exposure across all accounts, instruments, and markets instantly with live dashboards and alerting.' },
        { title: 'A/B Book Management', desc: 'Route client orders to A-book (pass-through to LP) or B-book (internalized) with configurable rules per client or group.' },
        { title: 'Automated Stop-Out', desc: 'Protect against excessive losses with automated margin calls and stop-outs at configurable levels.' },
        { title: 'Exposure Reports', desc: 'Detailed exposure, P&L, and risk reports at account, group, symbol, and aggregate levels.' },
        { title: 'Leverage Controls', desc: 'Set leverage limits per client, account type, or instrument group. Dynamic leverage based on position size.' },
        { title: 'Price Deviation Alerts', desc: 'Automatic detection of abnormal price movements, slippage, and potential market manipulation.' },
      ]}
    />
  );
}
