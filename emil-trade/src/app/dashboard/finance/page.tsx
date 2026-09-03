'use client';

import { FinancePortal } from '@/components/trader/FinancePortal';
import type { DepositRequest, WithdrawalRequest, AccountStatement } from '@/types/trader';

const MOCK_DEPOSITS: DepositRequest[] = [
  { id: 'd1', amount: 5000, currency: 'USD', method: 'card', status: 'completed', bonusClaimed: 500, reference: 'DEP-001', createdAt: '2026-03-28T10:30:00Z', completedAt: '2026-03-28T10:31:00Z' },
  { id: 'd2', amount: 10000, currency: 'USD', method: 'bank_wire', status: 'completed', bonusClaimed: 0, reference: 'DEP-002', createdAt: '2026-03-15T14:00:00Z', completedAt: '2026-03-17T09:00:00Z' },
  { id: 'd3', amount: 2000, currency: 'USD', method: 'crypto_usdt', status: 'processing', bonusClaimed: 0, reference: 'DEP-003', createdAt: '2026-04-03T16:45:00Z', completedAt: null },
];

const MOCK_WITHDRAWALS: WithdrawalRequest[] = [
  { id: 'w1', amount: 3000, currency: 'USD', method: 'bank_wire', destination: '****4521', status: 'completed', estimatedProcessing: '1-3 business days', rejectionReason: null, createdAt: '2026-03-20T11:00:00Z', completedAt: '2026-03-22T10:00:00Z' },
  { id: 'w2', amount: 1500, currency: 'USD', method: 'crypto_btc', destination: 'bc1q...x8f2', status: 'pending', estimatedProcessing: '24 hours', rejectionReason: null, createdAt: '2026-04-03T09:00:00Z', completedAt: null },
];

const MOCK_STATEMENTS: AccountStatement[] = Array.from({ length: 20 }, (_, i) => ({
  id: `s${i}`, type: (['trade', 'deposit', 'swap', 'commission', 'trade', 'trade'] as const)[i % 6],
  amount: i % 6 === 1 ? 5000 : (Math.random() - 0.4) * 500,
  balance: 15000 - i * 50 + Math.random() * 200,
  description: i % 6 === 1 ? 'Deposit via Card' : `${['EURUSD','GBPUSD','XAUUSD'][i % 3]} ${i % 2 === 0 ? 'Buy' : 'Sell'} 0.${10 + i} lots`,
  reference: `REF-${1000 + i}`,
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

export default function FinancePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Finance Portal</h1>
        <p className="text-xs text-white/30">Manage your deposits, withdrawals, and account statements</p>
      </div>
      <FinancePortal
        deposits={MOCK_DEPOSITS}
        withdrawals={MOCK_WITHDRAWALS}
        statements={MOCK_STATEMENTS}
        balance={14_832.50}
        equity={15_210.40}
        currency="USD"
        onDeposit={() => console.log('Open deposit modal')}
        onWithdraw={() => console.log('Open withdraw modal')}
        onExport={(format) => console.log('Export', format)}
      />
    </div>
  );
}
