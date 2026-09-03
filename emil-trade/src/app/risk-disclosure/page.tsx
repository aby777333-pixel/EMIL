'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function RiskDisclosurePage() {
  return (
    <div className="min-h-screen bg-[#060D16] text-[#EAF0FA]">
      <nav className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <Link href="/" className="flex items-center gap-3"><Logo height={36} theme="dark" /></Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold mb-8">Risk Disclosure Statement</h1>
        <div className="space-y-6 text-sm text-[#7A8BA8] leading-relaxed">
          <div className="rounded-xl border border-[#FF4560]/20 bg-[#FF4560]/5 p-6">
            <p className="font-bold text-[#FF4560] mb-2">HIGH RISK WARNING</p>
            <p>Trading leveraged products such as Forex, CFDs, and cryptocurrencies carries a high level of risk and may not be suitable for all investors. You could lose more than your initial investment.</p>
          </div>
          <p><strong className="text-white">1. Nature of Leveraged Trading</strong><br />Leveraged trading allows you to control a larger position with a smaller amount of capital. While this can amplify profits, it also amplifies losses. A small adverse market movement can result in the loss of your entire investment.</p>
          <p><strong className="text-white">2. Market Volatility</strong><br />Financial markets can be highly volatile. Prices can change rapidly due to economic events, geopolitical developments, natural disasters, and other factors beyond your control.</p>
          <p><strong className="text-white">3. No Guarantee of Profit</strong><br />There is no guarantee that you will make a profit. Past performance of any trading strategy, system, or methodology is not necessarily indicative of future results.</p>
          <p><strong className="text-white">4. Margin Calls</strong><br />If the market moves against your position, you may be required to deposit additional funds (margin call) to maintain your position. Failure to meet margin requirements may result in automatic liquidation of your positions.</p>
          <p><strong className="text-white">5. Counterparty Risk</strong><br />Trading through any financial intermediary carries counterparty risk — the risk that the intermediary may default on its obligations.</p>
          <p><strong className="text-white">6. Technical Risks</strong><br />Electronic trading systems are subject to risks including system failures, connectivity issues, and cyber threats that may affect order execution.</p>
          <p><strong className="text-white">7. Seek Independent Advice</strong><br />Before trading, you should seek independent financial advice to ensure you understand the risks involved and that trading is appropriate for your financial situation.</p>
        </div>
        <div className="mt-12"><Link href="/" className="text-[#00B4D8] text-sm hover:underline">Back to Home</Link></div>
      </div>
    </div>
  );
}
