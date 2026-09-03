import FeaturePage from '@/components/FeaturePage';

export default function PropTradingPage() {
  return (
    <FeaturePage
      badge="Prop Trading"
      badgeColor="#FF4560"
      title="Prop Trading Challenges"
      subtitle="Prove your skills, get funded"
      description="Run funded account challenges with automated rule enforcement. Traders prove their skills on evaluation accounts, and successful candidates receive funded accounts with profit splits up to 90%."
      features={[
        { title: 'Multiple Challenge Tiers', desc: 'From $10K to $100K account sizes with customizable profit targets, drawdown limits, and duration parameters.' },
        { title: 'Automated Rule Enforcement', desc: 'Daily drawdown, max drawdown, minimum trading days, and profit targets are all monitored and enforced automatically.' },
        { title: 'Scaling Plans', desc: 'Successful traders can scale their accounts — after 3 consecutive profitable months, account size doubles up to $400K.' },
        { title: 'Instant Payouts', desc: 'Automated payout processing with configurable profit splits (80-90%) and multiple withdrawal methods.' },
        { title: 'Real-Time Dashboard', desc: 'Traders see their challenge progress in real-time — current P&L, drawdown status, trading days, and target progress.' },
        { title: 'White-Label Ready', desc: 'Launch your own prop firm brand. Customize challenge parameters, pricing, and branding to match your business model.' },
      ]}
    />
  );
}
