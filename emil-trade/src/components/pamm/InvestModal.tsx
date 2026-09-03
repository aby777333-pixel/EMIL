'use client';

import { useState } from 'react';
import { X, Info, AlertCircle } from 'lucide-react';
import type { PAMMFund } from './mockFunds';

interface InvestModalProps {
  fund: PAMMFund;
  onClose: () => void;
  onConfirm: () => void;
}

export default function InvestModal({ fund, onClose, onConfirm }: InvestModalProps) {
  const [amount, setAmount] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const investAmount = parseFloat(amount) || 0;
  const estimatedShares = investAmount / fund.navPerShare;
  const meetsMinimum = investAmount >= fund.minInvestment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-xl border shadow-2xl"
        style={{
          backgroundColor: '#111118',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2 className="text-base font-semibold text-white">Invest in Fund</h2>
            <p className="text-xs text-white/40 mt-0.5">
              <span className="text-[#0091D5]">{fund.name}</span> by {fund.manager}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 transition-colors">
            <X size={18} className="text-white/50" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Investment Amount */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Investment Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min $${fund.minInvestment.toLocaleString()}`}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm font-mono text-white border outline-none focus:border-[#0091D5]/50 transition-colors"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              />
            </div>
            {investAmount > 0 && !meetsMinimum && (
              <p className="flex items-center gap-1 text-[10px] text-red-400 mt-1">
                <AlertCircle size={10} />
                Minimum investment is ${fund.minInvestment.toLocaleString()}
              </p>
            )}
          </div>

          {/* NAV Info */}
          <div
            className="rounded-lg p-3 grid grid-cols-2 gap-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <div>
              <div className="text-[10px] text-white/40">NAV per Share</div>
              <div className="text-sm font-mono font-semibold text-white">
                ${fund.navPerShare.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/40">Estimated Shares</div>
              <div className="text-sm font-mono font-semibold text-[#0091D5]">
                {investAmount > 0 ? estimatedShares.toFixed(2) : '0.00'}
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div>
            <div className="flex items-center gap-1 text-xs font-medium text-white/60 mb-2">
              <Info size={12} />
              Fee Structure
            </div>
            <div
              className="rounded-lg border divide-y divide-white/[0.04]"
              style={{
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-white/50">Management Fee</span>
                <span className="text-white/70 font-medium">
                  {fund.managementFee}% annually
                </span>
              </div>
              <div
                className="flex items-center justify-between px-3 py-2 text-xs border-t"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <span className="text-white/50">Performance Fee</span>
                <span className="text-white/70 font-medium">
                  {fund.performanceFee}% on profits (HWM)
                </span>
              </div>
            </div>
          </div>

          {/* Lock-up Reminder */}
          <div
            className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-400/10 px-3 py-2 rounded-lg"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>
              This fund has a <strong>{fund.lockupDays}-day lock-up period</strong>. You will not be able
              to redeem your investment during this time.
            </span>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 rounded"
              style={{ accentColor: '#0091D5' }}
            />
            <span className="text-[11px] text-white/40 leading-relaxed">
              I acknowledge the risks involved, understand the fee structure, and agree
              to the fund terms and lock-up period.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-medium text-white/60 hover:text-white/80 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!meetsMinimum || !termsAccepted}
            className="px-5 py-2 rounded text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: '#0091D5', color: '#000' }}
          >
            Confirm Investment
          </button>
        </div>
      </div>
    </div>
  );
}
