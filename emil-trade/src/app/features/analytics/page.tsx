import FeaturePage from '@/components/FeaturePage';

export default function AnalyticsPage() {
  return (
    <FeaturePage
      badge="Analytics"
      badgeColor="#00C853"
      title="Trading Analytics"
      subtitle="Data-driven insights for better performance"
      description="Comprehensive performance analytics with equity curves, win rate breakdowns, Sharpe ratio, profit factor, drawdown analysis, and per-symbol statistics. Understand your trading patterns and improve your edge."
      features={[
        { title: 'Equity Curve', desc: 'Interactive equity curve visualization showing your account growth over time with drawdown highlighting.' },
        { title: 'Performance Metrics', desc: 'Total return, win rate, profit factor, Sharpe ratio, maximum drawdown — all calculated in real-time.' },
        { title: 'Calendar Heatmap', desc: 'See your daily P&L on a calendar heatmap to identify your best and worst trading days and patterns.' },
        { title: 'Per-Symbol Breakdown', desc: 'Analyze performance by instrument — which pairs you trade best, average hold time, and risk-reward ratios.' },
        { title: 'Trade Journal', desc: 'Automated trade logging with notes, screenshots, and tags. Review your decisions and learn from them.' },
        { title: 'Export Reports', desc: 'Download PDF or CSV reports for tax filing, compliance, or personal record-keeping.' },
      ]}
    />
  );
}
