'use client';

import { ComplianceSuite } from '@/components/comply/ComplianceSuite';
import type { AtRiskClient, RegulatoryReport, RegulatoryDeadline } from '@/types/comply';

const MOCK_AT_RISK: AtRiskClient[] = [
  { id: 'ar1', clientName: 'Client Alpha', riskLevel: 'critical', signals: ['5 consecutive losses', '3x deposit in 24h', 'Session >8 hours'], lossesToday: 4200, sessionHours: 8.5, depositsThisWeek: 15000, recommendedAction: 'Mandatory cooling-off period recommended. Contact immediately.', flaggedAt: new Date().toISOString() },
  { id: 'ar2', clientName: 'Client Beta', riskLevel: 'high', signals: ['Increasing position sizes', 'Login at unusual hours'], lossesToday: 1800, sessionHours: 4.2, depositsThisWeek: 5000, recommendedAction: 'Send responsible trading reminder. Monitor closely.', flaggedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'ar3', clientName: 'Client Gamma', riskLevel: 'moderate', signals: ['Trading frequency spike'], lossesToday: 350, sessionHours: 6.0, depositsThisWeek: 2000, recommendedAction: 'Trigger reality check popup on next login.', flaggedAt: new Date(Date.now() - 7200000).toISOString() },
];

const MOCK_REPORTS: RegulatoryReport[] = [
  { id: 'rr1', jurisdiction: 'mifid2', reportName: 'Transaction Reporting (ARM)', reportType: 'transaction', period: 'Apr 3, 2026', status: 'ready', format: 'xml', recordCount: 14523, fileSize: '2.3MB', submittedAt: null, acknowledgedAt: null, deadline: '2026-04-04', daysUntilDeadline: 1, generatedAt: new Date().toISOString() },
  { id: 'rr2', jurisdiction: 'cysec', reportName: 'AML Quarterly Report', reportType: 'aml', period: 'Q1 2026', status: 'generating', format: 'pdf', recordCount: 0, fileSize: null, submittedAt: null, acknowledgedAt: null, deadline: '2026-04-30', daysUntilDeadline: 26, generatedAt: new Date().toISOString() },
  { id: 'rr3', jurisdiction: 'asic', reportName: 'RG 227 OTC CFD Report', reportType: 'otc_cfd', period: 'Q1 2026', status: 'submitted', format: 'csv', recordCount: 8900, fileSize: '1.1MB', submittedAt: '2026-03-28', acknowledgedAt: '2026-03-29', deadline: '2026-04-15', daysUntilDeadline: 11, generatedAt: '2026-03-27' },
  { id: 'rr4', jurisdiction: 'mifid2', reportName: 'Best Execution (RTS 27/28)', reportType: 'best_exec', period: 'Q1 2026', status: 'draft', format: 'csv', recordCount: 0, fileSize: null, submittedAt: null, acknowledgedAt: null, deadline: '2026-04-30', daysUntilDeadline: 26, generatedAt: new Date().toISOString() },
];

const MOCK_DEADLINES: RegulatoryDeadline[] = [
  { id: 'dl1', jurisdiction: 'mifid2', reportName: 'Transaction Report (ARM)', deadline: '2026-04-04', daysRemaining: 0, status: 'due_soon', isRecurring: true, frequency: 'daily' },
  { id: 'dl2', jurisdiction: 'emir', reportName: 'Trade Reporting to TR', deadline: '2026-04-04', daysRemaining: 0, status: 'due_soon', isRecurring: true, frequency: 'daily' },
  { id: 'dl3', jurisdiction: 'asic', reportName: 'DDO Compliance Report', deadline: '2026-04-15', daysRemaining: 11, status: 'upcoming', isRecurring: true, frequency: 'quarterly' },
  { id: 'dl4', jurisdiction: 'cysec', reportName: 'AML Quarterly Report', deadline: '2026-04-30', daysRemaining: 26, status: 'upcoming', isRecurring: true, frequency: 'quarterly' },
  { id: 'dl5', jurisdiction: 'mifid2', reportName: 'Best Execution (RTS 27/28)', deadline: '2026-04-30', daysRemaining: 26, status: 'upcoming', isRecurring: true, frequency: 'quarterly' },
  { id: 'dl6', jurisdiction: 'fca', reportName: 'CASS Client Money', deadline: '2026-03-31', daysRemaining: -4, status: 'overdue', isRecurring: true, frequency: 'monthly' },
];

export default function ComplyPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">RAPTOR COMPLY</h1>
        <p className="text-xs text-white/30">Responsible trading, regulatory reporting, deadline management, and jurisdiction compliance</p>
      </div>
      <ComplianceSuite atRiskClients={MOCK_AT_RISK} reports={MOCK_REPORTS} deadlines={MOCK_DEADLINES}
        onGenerateReport={(j, r) => console.log('Generate', j, r)} onSubmitReport={id => console.log('Submit', id)}
        onContactClient={id => console.log('Contact', id)} />
    </div>
  );
}
