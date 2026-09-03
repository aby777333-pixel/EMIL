import FeaturePage from '@/components/FeaturePage';

export default function CopyTradingPage() {
  return (
    <FeaturePage
      badge="Copy Trading"
      badgeColor="#009B4D"
      title="Social & Copy Trading"
      subtitle="Follow top traders, mirror their success"
      description="Browse a marketplace of verified signal providers, analyze their track records, and automatically copy their trades to your account with full risk control. Zero price mismatch between master and follower accounts."
      features={[
        { title: 'Provider Marketplace', desc: 'Browse ranked signal providers with transparent performance metrics — win rate, drawdown, return, and follower count.' },
        { title: 'One-Click Copy', desc: 'Subscribe to any provider and start copying trades instantly. Configure lot multiplier, max drawdown, and symbol filters.' },
        { title: 'Risk Controls', desc: 'Set maximum position size, daily loss limits, and symbol blacklists. Pause or stop copying at any time.' },
        { title: 'Reverse Copy', desc: 'Invert a provider\'s signals — useful if you believe their strategy will underperform in current conditions.' },
        { title: 'Become a Provider', desc: 'Share your strategies and earn commissions. Set your own fee structure — performance fees, subscription fees, or both.' },
        { title: 'Real-Time Sync', desc: 'Zero-latency trade copying with no price mismatch. Orders are placed at the same millisecond as the master account.' },
      ]}
    />
  );
}
