'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#060D16] text-[#EAF0FA]">
      <nav className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <Link href="/" className="flex items-center gap-3"><Logo height={36} theme="dark" /></Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <div className="space-y-6 text-sm text-[#7A8BA8] leading-relaxed">
          <p><strong className="text-white">1. Acceptance of Terms</strong><br />By accessing and using EMIL Trade Trading Platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our services.</p>
          <p><strong className="text-white">2. Service Description</strong><br />EMIL Trade provides a web-based trading platform for forex, CFDs, commodities, indices, and cryptocurrency trading. The platform includes tools for order execution, charting, analysis, copy trading, and portfolio management.</p>
          <p><strong className="text-white">3. Eligibility</strong><br />You must be at least 18 years old to use our services. You must provide accurate and complete registration information. Trading leveraged products may not be suitable for all investors.</p>
          <p><strong className="text-white">4. Account Security</strong><br />You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.</p>
          <p><strong className="text-white">5. Trading Risks</strong><br />Trading in financial markets involves significant risk of loss. Past performance is not indicative of future results. You should only trade with money you can afford to lose.</p>
          <p><strong className="text-white">6. Fees and Charges</strong><br />Spreads, commissions, swap rates, and other fees apply to trading activities. Fee schedules are available on the platform and may be updated periodically.</p>
          <p><strong className="text-white">7. Intellectual Property</strong><br />All content, software, and technology on this platform are owned by GIO4X and protected by intellectual property laws.</p>
          <p><strong className="text-white">8. Limitation of Liability</strong><br />GIO4X shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
          <p><strong className="text-white">9. Governing Law</strong><br />These terms are governed by the laws of the jurisdiction in which GIO4X operates.</p>
          <p><strong className="text-white">10. Contact</strong><br />For questions regarding these terms, contact us at support@gio4x.com.</p>
        </div>
        <div className="mt-12"><Link href="/" className="text-[#00B4D8] text-sm hover:underline">Back to Home</Link></div>
      </div>
    </div>
  );
}
