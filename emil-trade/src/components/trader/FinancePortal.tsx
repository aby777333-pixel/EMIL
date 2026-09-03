'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownCircle, ArrowUpCircle, RefreshCw, CreditCard,
  Building, Bitcoin, Clock, CheckCircle2, XCircle,
  AlertCircle, Download, FileText,
} from 'lucide-react';
import type { DepositRequest, WithdrawalRequest, AccountStatement, PaymentMethod } from '@/types/trader';

const METHOD_LABELS: Record<PaymentMethod, { label: string; icon: React.ReactNode }> = {
  card: { label: 'Card (Visa/MC)', icon: <CreditCard className="h-3.5 w-3.5" /> },
  bank_wire: { label: 'Bank Wire', icon: <Building className="h-3.5 w-3.5" /> },
  crypto_btc: { label: 'Bitcoin', icon: <Bitcoin className="h-3.5 w-3.5" /> },
  crypto_eth: { label: 'Ethereum', icon: <Bitcoin className="h-3.5 w-3.5" /> },
  crypto_usdt: { label: 'USDT', icon: <Bitcoin className="h-3.5 w-3.5" /> },
  upi: { label: 'UPI', icon: <CreditCard className="h-3.5 w-3.5" /> },
  fpx: { label: 'FPX', icon: <CreditCard className="h-3.5 w-3.5" /> },
  promptpay: { label: 'PromptPay', icon: <CreditCard className="h-3.5 w-3.5" /> },
  ideal: { label: 'iDEAL', icon: <CreditCard className="h-3.5 w-3.5" /> },
  sofort: { label: 'Sofort', icon: <CreditCard className="h-3.5 w-3.5" /> },
};

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', icon: <Clock className="h-3 w-3" /> },
  processing: { color: '#00b4ff', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  completed: { color: '#00dc82', icon: <CheckCircle2 className="h-3 w-3" /> },
  approved: { color: '#00dc82', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { color: '#ef4444', icon: <XCircle className="h-3 w-3" /> },
  rejected: { color: '#ef4444', icon: <XCircle className="h-3 w-3" /> },
  cancelled: { color: '#6b7280', icon: <XCircle className="h-3 w-3" /> },
};

interface FinancePortalProps {
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  statements: AccountStatement[];
  balance: number;
  equity: number;
  currency: string;
  onDeposit: () => void;
  onWithdraw: () => void;
  onExport: (format: 'csv' | 'pdf') => void;
}

export function FinancePortal({ deposits, withdrawals, statements, balance, equity, currency, onDeposit, onWithdraw, onExport }: FinancePortalProps) {
  const [tab, setTab] = useState<'overview' | 'deposits' | 'withdrawals' | 'statements'>('overview');

  const totalDeposited = deposits.filter(d => d.status === 'completed').reduce((s, d) => s + d.amount, 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === 'completed' || w.status === 'approved').reduce((s, w) => s + w.amount, 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');

  return (
    <div className="space-y-5">
      {/* Balance Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-white/25 mb-1">Balance</div>
          <div className="text-xl font-mono font-bold text-white">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-white/15">{currency}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-white/25 mb-1">Equity</div>
          <div className={`text-xl font-mono font-bold ${equity >= balance ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
            ${equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-white/25 mb-1">Total Deposited</div>
          <div className="text-xl font-mono font-bold text-[#00dc82]">${(totalDeposited / 1000).toFixed(1)}K</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-white/25 mb-1">Total Withdrawn</div>
          <div className="text-xl font-mono font-bold text-[#f59e0b]">${(totalWithdrawn / 1000).toFixed(1)}K</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button onClick={onDeposit} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00dc82] hover:bg-[#00dc82]/80 text-white font-medium text-sm transition-colors">
          <ArrowDownCircle className="h-4 w-4" /> Deposit
        </button>
        <button onClick={onWithdraw} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium text-sm border border-white/10 transition-colors">
          <ArrowUpCircle className="h-4 w-4" /> Withdraw
        </button>
      </div>

      {pendingWithdrawals.length > 0 && (
        <div className="px-4 py-3 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/20">
          <p className="text-xs text-[#f59e0b] flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" />
            {pendingWithdrawals.length} pending withdrawal{pendingWithdrawals.length !== 1 ? 's' : ''} — ${pendingWithdrawals.reduce((s, w) => s + w.amount, 0).toFixed(2)}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {(['overview', 'deposits', 'withdrawals', 'statements'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                tab === t ? 'bg-white/10 text-white' : 'text-white/40'
              }`}
            >{t}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['csv', 'pdf'] as const).map(fmt => (
            <button key={fmt} onClick={() => onExport(fmt)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-white/25 hover:text-white/50 bg-white/[0.03] border border-white/[0.06] transition-colors">
              <Download className="h-2.5 w-2.5" />{fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Statements Table */}
      {(tab === 'overview' || tab === 'statements') && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-3 py-2.5 font-medium">Type</th>
                <th className="text-left px-3 py-2.5 font-medium">Description</th>
                <th className="text-right px-3 py-2.5 font-medium">Amount</th>
                <th className="text-right px-4 py-2.5 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {statements.slice(0, 20).map(stmt => (
                <tr key={stmt.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 text-xs text-white/40">{new Date(stmt.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] capitalize ${
                      stmt.type === 'deposit' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                      stmt.type === 'withdrawal' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                      stmt.type === 'trade' ? 'bg-[#00b4ff]/10 text-[#00b4ff]' :
                      'bg-white/5 text-white/30'
                    }`}>{stmt.type}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white/40">{stmt.description}</td>
                  <td className={`px-3 py-2.5 text-right font-mono text-xs ${stmt.amount >= 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
                    {stmt.amount >= 0 ? '+' : ''}{stmt.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-white/50">{stmt.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deposits List */}
      {tab === 'deposits' && (
        <div className="space-y-2">
          {deposits.map(dep => {
            const status = STATUS_CONFIG[dep.status as keyof typeof STATUS_CONFIG];
            const method = METHOD_LABELS[dep.method];
            return (
              <div key={dep.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 flex items-center gap-3">
                <ArrowDownCircle className="h-4 w-4 text-[#00dc82] shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-white">${dep.amount.toFixed(2)} {dep.currency}</div>
                  <div className="text-[10px] text-white/25 flex items-center gap-1">{method?.icon}{method?.label}</div>
                </div>
                <span className="flex items-center gap-1 text-[10px]" style={{ color: status?.color }}>
                  {status?.icon}{dep.status}
                </span>
                <span className="text-[10px] text-white/15">{new Date(dep.createdAt).toLocaleDateString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Withdrawals List */}
      {tab === 'withdrawals' && (
        <div className="space-y-2">
          {withdrawals.map(wd => {
            const status = STATUS_CONFIG[wd.status as keyof typeof STATUS_CONFIG];
            const method = METHOD_LABELS[wd.method];
            return (
              <div key={wd.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 flex items-center gap-3">
                <ArrowUpCircle className="h-4 w-4 text-[#f59e0b] shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-white">${wd.amount.toFixed(2)} {wd.currency}</div>
                  <div className="text-[10px] text-white/25 flex items-center gap-1">{method?.icon}{method?.label}</div>
                </div>
                <span className="flex items-center gap-1 text-[10px]" style={{ color: status?.color }}>
                  {status?.icon}{wd.status}
                </span>
                {wd.estimatedProcessing && <span className="text-[10px] text-white/15">ETA: {wd.estimatedProcessing}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
