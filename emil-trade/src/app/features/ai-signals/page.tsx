import FeaturePage from '@/components/FeaturePage';

export default function AISignalsPage() {
  return (
    <FeaturePage
      badge="AI Signals"
      badgeColor="#00A5A8"
      title="AI-Powered Trading Signals"
      subtitle="Machine learning meets market analysis"
      description="Our AI engine continuously scans the markets using pattern recognition, sentiment analysis, and statistical models to generate high-probability trade signals with entry, stop-loss, and take-profit levels."
      features={[
        { title: 'Pattern Recognition', desc: 'Neural networks trained on millions of historical patterns to identify high-probability setups across all timeframes.' },
        { title: 'Sentiment Analysis', desc: 'Real-time analysis of news feeds, social media, and economic data to gauge market sentiment and direction.' },
        { title: 'Confidence Scoring', desc: 'Each signal comes with a confidence percentage based on backtested accuracy, helping you prioritize the best opportunities.' },
        { title: 'Multi-Asset Coverage', desc: 'Signals generated for forex, metals, indices, crypto, and energy markets with asset-specific models.' },
        { title: 'Auto-Execute', desc: 'One-click execution directly from the signal card — the order is placed with pre-set SL/TP levels automatically.' },
        { title: 'Real-Time Scanning', desc: 'Continuous market scanning with new signals generated every 30 seconds as market conditions evolve.' },
      ]}
    />
  );
}
