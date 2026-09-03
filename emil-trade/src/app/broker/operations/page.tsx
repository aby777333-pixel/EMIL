'use client';

import { OnboardingWizard } from '@/components/operations/OnboardingWizard';
import type { OnboardingProgress, BrokerEntity, IslamicConfig, LoyaltyConfig, TaxSummary, TaxExport } from '@/types/operations';

const MOCK_PROGRESS: OnboardingProgress = {
  brokerId: 'b1', brokerName: 'RAPTOR Demo Broker', totalSteps: 12, completedSteps: 8, currentStep: 9,
  steps: [
    { step: 1, title: 'Entity Details', description: 'Company name, jurisdiction, license number', status: 'completed', isRequired: true, completedAt: '2026-03-01', fields: [] },
    { step: 2, title: 'Brand Kit', description: 'Logo, colors, fonts, brand identity', status: 'completed', isRequired: true, completedAt: '2026-03-01', fields: [] },
    { step: 3, title: 'Domain Configuration', description: 'Custom domain + SSL auto-provision', status: 'completed', isRequired: true, completedAt: '2026-03-02', fields: [] },
    { step: 4, title: 'LP Connections', description: 'Connect liquidity providers via bridge manager', status: 'completed', isRequired: true, completedAt: '2026-03-03', fields: [] },
    { step: 5, title: 'Symbol Configuration', description: 'Select instruments, set spreads and leverage', status: 'completed', isRequired: true, completedAt: '2026-03-03', fields: [] },
    { step: 6, title: 'Account Groups', description: 'Define client tiers, leverage, and conditions', status: 'completed', isRequired: true, completedAt: '2026-03-04', fields: [] },
    { step: 7, title: 'Payment Methods', description: 'Connect PSPs for deposits and withdrawals', status: 'completed', isRequired: true, completedAt: '2026-03-04', fields: [] },
    { step: 8, title: 'KYC Configuration', description: 'Select KYC providers and verification requirements', status: 'completed', isRequired: true, completedAt: '2026-03-05', fields: [] },
    { step: 9, title: 'Staff Setup', description: 'Invite team members and assign roles', status: 'in_progress', isRequired: true, completedAt: null, fields: [] },
    { step: 10, title: 'Compliance Setup', description: 'Regulatory profile, AML thresholds, reporting', status: 'pending', isRequired: true, completedAt: null, fields: [] },
    { step: 11, title: 'NEXUS Customization', description: 'Brand persona, name, voice, knowledge base', status: 'pending', isRequired: false, completedAt: null, fields: [] },
    { step: 12, title: 'Go-Live Checklist', description: 'Automated pre-launch verification', status: 'pending', isRequired: true, completedAt: null, fields: [] },
  ],
  startedAt: '2026-03-01', estimatedCompletion: '2026-03-10', goLiveReady: false,
  goLiveChecklist: [
    { item: 'Entity details verified', passed: true, required: true },
    { item: 'Brand kit configured', passed: true, required: true },
    { item: 'Domain SSL active', passed: true, required: true },
    { item: 'At least 1 LP connected', passed: true, required: true },
    { item: 'Symbols configured', passed: true, required: true },
    { item: 'PSP connected and tested', passed: true, required: true },
    { item: 'KYC provider configured', passed: true, required: true },
    { item: 'Staff roles assigned', passed: false, required: true },
    { item: 'Compliance profile complete', passed: false, required: true },
    { item: 'Test deposit/withdrawal flow', passed: false, required: true },
    { item: 'NEXUS configured', passed: false, required: false },
  ],
};

const MOCK_ENTITIES: BrokerEntity[] = [
  { id: 'e1', name: 'RAPTOR Markets Ltd', brand: 'RAPTOR', jurisdiction: 'Cyprus (CySEC)', licenseNumber: 'CIF 123/45', status: 'active', clients: 4827, aum: 78_450_000, revenueThisMonth: 234_500, pnlThisMonth: 89_200, domain: 'trade.raptormarkets.com' },
  { id: 'e2', name: 'RAPTOR Global LLC', brand: 'RAPTOR Global', jurisdiction: 'BVI (FSC)', licenseNumber: 'BVI/2024/001', status: 'active', clients: 2100, aum: 34_200_000, revenueThisMonth: 145_000, pnlThisMonth: 52_300, domain: 'trade.raptorglobal.com' },
  { id: 'e3', name: 'RAPTOR MEA Ltd', brand: 'RAPTOR Middle East', jurisdiction: 'UAE (DFSA)', licenseNumber: 'DFSA/2025/789', status: 'setup', clients: 0, aum: 0, revenueThisMonth: 0, pnlThisMonth: 0, domain: 'trade.raptormea.com' },
];

const MOCK_ISLAMIC: IslamicConfig = { isEnabled: true, swapFreeAccountType: 'Islamic Standard', adminFeePerLot: 10, excludedInstruments: ['BTCUSD', 'ETHUSD'], shariahCertificateUrl: null, specialTermsUrl: null };

const MOCK_LOYALTY: LoyaltyConfig = {
  isEnabled: true, xpPerTrade: 10, xpPerLesson: 50, xpPerReferral: 200,
  tierThresholds: [
    { tier: 'rookie', minXp: 0, benefits: ['Standard spreads'] },
    { tier: 'trader', minXp: 500, benefits: ['5% spread discount'] },
    { tier: 'pro', minXp: 2000, benefits: ['10% spread discount', 'Priority support'] },
    { tier: 'expert', minXp: 5000, benefits: ['15% spread discount', 'VIP manager'] },
    { tier: 'elite', minXp: 15000, benefits: ['20% spread discount', 'VIP events'] },
    { tier: 'legend', minXp: 50000, benefits: ['25% spread discount', 'Custom solutions'] },
  ],
  activeChallenges: [], rewards: [],
};

const MOCK_TAX: TaxSummary = { year: 2025, totalRealizedGains: 18420, totalRealizedLosses: -7230, netCapitalGains: 11190, totalCommissions: 890, totalSwaps: -1240, totalFees: 120, tradeCount: 487, costBasisMethod: 'fifo', currency: 'USD' };
const MOCK_EXPORTS: TaxExport[] = [
  { id: 'te1', year: 2025, format: 'us_1099b', status: 'ready', fileSize: '245KB', generatedAt: '2026-01-15' },
  { id: 'te2', year: 2025, format: 'csv_raw', status: 'ready', fileSize: '1.2MB', generatedAt: '2026-01-15' },
  { id: 'te3', year: 2025, format: 'uk_cgt', status: 'generating', fileSize: null, generatedAt: '2026-04-04' },
];

export default function OperationsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">RAPTOR OPERATIONS</h1>
        <p className="text-xs text-white/30">Broker onboarding, multi-entity management, Islamic finance, loyalty engine, and tax center</p>
      </div>
      <OnboardingWizard progress={MOCK_PROGRESS} entities={MOCK_ENTITIES} islamicConfig={MOCK_ISLAMIC}
        loyaltyConfig={MOCK_LOYALTY} taxSummary={MOCK_TAX} taxExports={MOCK_EXPORTS}
        onCompleteStep={s => console.log('Complete step', s)} onGoLive={() => console.log('GO LIVE')} />
    </div>
  );
}
