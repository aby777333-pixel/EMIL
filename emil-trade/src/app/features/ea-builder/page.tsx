import FeaturePage from '@/components/FeaturePage';

export default function EABuilderPage() {
  return (
    <FeaturePage
      badge="EA Builder"
      badgeColor="#F0A500"
      title="Strategy & EA Builder"
      subtitle="Build, backtest, and deploy automated strategies"
      description="Create custom trading strategies with our drag-and-drop visual builder or code editor. Backtest against historical data, optimize parameters, and deploy to live markets — all without leaving the browser."
      features={[
        { title: 'Visual Drag & Drop Builder', desc: 'No coding required. Build strategies by connecting condition blocks and action blocks in an intuitive visual interface.' },
        { title: 'Code Editor', desc: 'For advanced users — write strategies in our RAPTOR scripting language with syntax highlighting and auto-completion.' },
        { title: 'Backtesting Engine', desc: 'Test strategies against years of historical data with detailed performance reports, equity curves, and trade logs.' },
        { title: 'Strategy Optimization', desc: 'Automatically find optimal parameters by running thousands of backtest permutations.' },
        { title: 'Deploy to Live', desc: 'One-click deployment of tested strategies to live or demo accounts with real-time monitoring.' },
        { title: 'AI-Assisted Generation', desc: 'Describe your strategy idea in plain English and let AI generate the initial code or block configuration.' },
      ]}
    />
  );
}
