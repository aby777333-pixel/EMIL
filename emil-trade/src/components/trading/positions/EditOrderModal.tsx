'use client';

import { useState } from 'react';
import { X, Pencil, ArrowDownRight } from 'lucide-react';
import { orderService } from '@/lib/trading/order-service';
import { useTradingStore } from '@/stores/trading';
import { formatPrice } from '@/lib/utils/format';
import type { Position } from '@/types/trading';

interface EditOrderModalProps {
  position: Position;
  onClose: () => void;
  onSuccess: () => void;
}

function getDecimals(symbol: string): number {
  if (symbol === 'USDJPY') return 3;
  if (symbol.startsWith('XAU')) return 2;
  if (symbol.startsWith('BTC') || symbol === 'US30' || symbol === 'NAS100') return 1;
  if (symbol.startsWith('ETH')) return 2;
  return 5;
}

type ModalTab = 'modify' | 'partial';

export default function EditOrderModal({ position, onClose, onSuccess }: EditOrderModalProps) {
  const { prices, triggerRefresh } = useTradingStore();
  const [activeTab, setActiveTab] = useState<ModalTab>('modify');
  const [sl, setSl] = useState(position.sl?.toString() ?? '0.00');
  const [tp, setTp] = useState(position.tp?.toString() ?? '0.00');
  const [remarks, setRemarks] = useState('');
  const [partialSize, setPartialSize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dec = getDecimals(position.symbol);
  const tick = prices[position.symbol];
  const marketPrice = position.direction === 'BUY'
    ? (tick?.bid ?? position.current_price)
    : (tick?.ask ?? position.current_price);

  const orderId = position.id.slice(0, 8).toUpperCase();

  async function handleModify() {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const slVal = parseFloat(sl);
      const tpVal = parseFloat(tp);
      const result = await orderService.modifyPosition(
        position.id,
        slVal > 0 ? slVal : undefined,
        tpVal > 0 ? tpVal : undefined,
      );
      if (result?.success) {
        setSuccess('Order modified successfully');
        triggerRefresh();
        onSuccess();
        setTimeout(onClose, 1200);
      } else {
        setError(result?.error || 'Failed to modify order');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error modifying order';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePartialClose() {
    const closeSize = parseFloat(partialSize);
    if (isNaN(closeSize) || closeSize <= 0) {
      setError('Enter a valid close size');
      return;
    }
    if (closeSize > position.size) {
      setError('Close size cannot exceed position size');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const closePrice = position.direction === 'BUY' ? tick?.bid : tick?.ask;
      if (!closePrice || closePrice <= 0) {
        setError('No market price available');
        setIsSubmitting(false);
        return;
      }
      const result = await orderService.closePosition(position.id, closePrice);
      if (result?.success) {
        setSuccess('Position closed successfully');
        triggerRefresh();
        onSuccess();
        setTimeout(onClose, 1200);
      } else {
        setError(result?.error || 'Failed to close position');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error closing position';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function setPartialPercent(pct: number) {
    const val = (position.size * pct) / 100;
    setPartialSize(val.toFixed(2));
  }

  const dirColor = position.direction === 'BUY' ? '#00C27A' : '#C1121F';
  const dirBg = position.direction === 'BUY' ? 'rgba(0,194,122,0.12)' : 'rgba(193,18,31,0.12)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg"
        style={{
          backgroundColor: '#13131D',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(41,171,226,0.05)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, backgroundColor: 'rgba(41,171,226,0.12)' }}
            >
              <Pencil size={18} style={{ color: '#0091D5' }} />
            </div>
            <div>
              <span className="text-[16px] font-semibold block" style={{ color: '#F0F0F0' }}>
                Edit Ongoing Order
              </span>
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                #{orderId}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg transition-all hover:bg-white/5"
            style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.35)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-7 mt-4 rounded-xl overflow-hidden" style={{ backgroundColor: '#0A0A12', border: '1px solid rgba(255,255,255,0.05)' }}>
          {(['modify', 'partial'] as ModalTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-[12px] font-semibold uppercase tracking-wider transition-all"
              style={{
                color: activeTab === tab ? '#0091D5' : 'rgba(255,255,255,0.3)',
                backgroundColor: activeTab === tab ? 'rgba(41,171,226,0.08)' : 'transparent',
              }}
            >
              {tab === 'modify' ? 'Modify SL/TP' : 'Partial Close'}
            </button>
          ))}
        </div>

        {/* Order Info Cards */}
        <div className="px-7 pt-5 pb-2">
          <div className="grid grid-cols-3 gap-3 mb-5">
            {/* Market Price */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#0A0A12', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Market Price
              </div>
              <div className="text-[16px] font-mono font-bold" style={{ color: '#F0F0F0' }}>
                {formatPrice(marketPrice, dec)}
              </div>
            </div>

            {/* Direction + Symbol */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#0A0A12', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Direction
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-bold px-2 py-1 rounded-lg"
                  style={{ backgroundColor: dirBg, color: dirColor }}
                >
                  {position.direction}
                </span>
                <span className="text-[13px] font-semibold" style={{ color: '#fff' }}>
                  {position.symbol}
                </span>
              </div>
            </div>

            {/* Entry */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#0A0A12', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Entry Price
              </div>
              <div className="text-[16px] font-mono font-bold" style={{ color: '#F0F0F0' }}>
                {formatPrice(position.open_price, dec)}
              </div>
            </div>
          </div>

          {/* Volume badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-5"
            style={{ backgroundColor: '#0A0A12', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Volume</span>
            <span className="text-[14px] font-mono font-bold" style={{ color: '#F0F0F0' }}>{position.size.toFixed(2)}</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>lots</span>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-7 pb-6">
          {activeTab === 'modify' && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold block mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Stop Loss
                  </label>
                  <input
                    type="text"
                    value={sl}
                    onChange={(e) => setSl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-[14px] font-mono outline-none transition-all"
                    style={{
                      backgroundColor: '#0A0A12',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#F0F0F0',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#C1121F'; e.currentTarget.style.boxShadow = '0 0 12px rgba(193,18,31,0.15)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-semibold block mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Take Profit
                  </label>
                  <input
                    type="text"
                    value={tp}
                    onChange={(e) => setTp(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-[14px] font-mono outline-none transition-all"
                    style={{
                      backgroundColor: '#0A0A12',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#F0F0F0',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#00C27A'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,194,122,0.15)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="text-[10px] uppercase tracking-wider font-semibold block mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full px-4 py-3 rounded-xl text-[13px] outline-none transition-all placeholder:opacity-20"
                  style={{
                    backgroundColor: '#0A0A12',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#F0F0F0',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(41,171,226,0.4)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                />
              </div>
            </>
          )}

          {activeTab === 'partial' && (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Close Size
                  </label>
                  <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Current: {position.size.toFixed(2)} lots
                  </span>
                </div>
                <input
                  type="text"
                  value={partialSize}
                  onChange={(e) => setPartialSize(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl text-[14px] font-mono outline-none transition-all placeholder:opacity-20"
                  style={{
                    backgroundColor: '#0A0A12',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#F0F0F0',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(41,171,226,0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(41,171,226,0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div className="grid grid-cols-4 gap-2 mb-6">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setPartialPercent(pct)}
                    className="py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                    style={{
                      backgroundColor: '#0A0A12',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(41,171,226,0.12)';
                      e.currentTarget.style.borderColor = 'rgba(41,171,226,0.3)';
                      e.currentTarget.style.color = '#0091D5';
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(41,171,226,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0A0A12';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Error / Success */}
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-[12px] text-center"
              style={{
                backgroundColor: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.15)',
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-[12px] text-center"
              style={{
                backgroundColor: 'rgba(34,197,94,0.08)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.15)',
              }}
            >
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
            >
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={activeTab === 'modify' ? handleModify : handlePartialClose}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                backgroundColor: isSubmitting ? 'rgba(41,171,226,0.08)' : 'rgba(41,171,226,0.15)',
                border: '1px solid rgba(41,171,226,0.3)',
                color: '#0091D5',
                cursor: isSubmitting ? 'wait' : 'pointer',
                boxShadow: '0 4px 16px rgba(41,171,226,0.1)',
              }}
              onMouseEnter={(e) => { if (!isSubmitting) { e.currentTarget.style.backgroundColor = 'rgba(41,171,226,0.25)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(41,171,226,0.2)'; } }}
              onMouseLeave={(e) => { if (!isSubmitting) { e.currentTarget.style.backgroundColor = 'rgba(41,171,226,0.15)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(41,171,226,0.1)'; } }}
            >
              {activeTab === 'modify' ? <Pencil size={14} /> : <ArrowDownRight size={14} />}
              {activeTab === 'modify'
                ? (isSubmitting ? 'Modifying...' : 'Modify Order')
                : (isSubmitting ? 'Closing...' : 'Close Position')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
