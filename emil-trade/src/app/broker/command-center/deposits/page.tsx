'use client';

import { useState } from 'react';
import { X, Lock, Smartphone } from 'lucide-react';

/* ────────────────────────────────────────────────────── */
/*  Types                                                 */
/* ────────────────────────────────────────────────────── */

interface DepositRow {
  id: string;
  time: string;
  order: string;
  account: string;
  server: 'MT4' | 'MT5';
  amount: number;
  balanceAfter: number;
  type: 'Deposit' | 'Withdrawal';
  comment: string;
  clientName: string;
  openTime: string;
  closeTime: string;
  volume: number;
}

/* ────────────────────────────────────────────────────── */
/*  Mock Data (12 rows)                                   */
/* ────────────────────────────────────────────────────── */

const MOCK_ROWS: DepositRow[] = [
  { id: '1', time: '15:49', order: '77054238', account: '1447829', server: 'MT5', amount: 100000, balanceAfter: 250000, type: 'Deposit', comment: 'Internal transfer', clientName: 'Marcus Webb', openTime: '04.10 00:11:18', closeTime: '04.10 00:11:18', volume: 0.01 },
  { id: '2', time: '15:32', order: '77054201', account: '1400978', server: 'MT4', amount: -5000, balanceAfter: 12400, type: 'Withdrawal', comment: 'Wire transfer', clientName: 'Elena Rossi', openTime: '04.10 00:08:45', closeTime: '04.10 00:08:45', volume: 0.01 },
  { id: '3', time: '14:58', order: '77054189', account: '6201983', server: 'MT5', amount: 25000, balanceAfter: 78500, type: 'Deposit', comment: 'Credit card', clientName: 'James Okonkwo', openTime: '04.10 00:06:12', closeTime: '04.10 00:06:12', volume: 0.01 },
  { id: '4', time: '14:22', order: '77054155', account: '6204934', server: 'MT5', amount: 10000, balanceAfter: 42000, type: 'Deposit', comment: 'Crypto BTC', clientName: 'Liam Chen', openTime: '04.10 00:04:33', closeTime: '04.10 00:04:33', volume: 0.01 },
  { id: '5', time: '13:45', order: '77054120', account: '1446748', server: 'MT4', amount: -2500, balanceAfter: 8200, type: 'Withdrawal', comment: 'Bank wire', clientName: 'Sophie Laurent', openTime: '04.10 00:02:10', closeTime: '04.10 00:02:10', volume: 0.01 },
  { id: '6', time: '13:12', order: '77054098', account: '6207812', server: 'MT5', amount: 50000, balanceAfter: 135000, type: 'Deposit', comment: 'Wire transfer', clientName: 'Ahmed Al-Farsi', openTime: '04.09 23:58:44', closeTime: '04.09 23:58:44', volume: 0.01 },
  { id: '7', time: '12:38', order: '77054071', account: '1403562', server: 'MT4', amount: -15000, balanceAfter: 67300, type: 'Withdrawal', comment: 'Crypto USDT', clientName: 'Natasha Petrov', openTime: '04.09 23:45:20', closeTime: '04.09 23:45:20', volume: 0.01 },
  { id: '8', time: '12:05', order: '77054044', account: '6209001', server: 'MT5', amount: 75000, balanceAfter: 310000, type: 'Deposit', comment: 'Bank wire', clientName: 'David Kim', openTime: '04.09 23:30:15', closeTime: '04.09 23:30:15', volume: 0.01 },
  { id: '9', time: '11:30', order: '77054019', account: '1448210', server: 'MT5', amount: 5000, balanceAfter: 18900, type: 'Deposit', comment: 'Credit card', clientName: 'Maria Santos', openTime: '04.09 23:15:02', closeTime: '04.09 23:15:02', volume: 0.01 },
  { id: '10', time: '10:55', order: '77053988', account: '6205478', server: 'MT4', amount: -8000, balanceAfter: 44500, type: 'Withdrawal', comment: 'Wire transfer', clientName: 'Thomas Muller', openTime: '04.09 22:58:33', closeTime: '04.09 22:58:33', volume: 0.01 },
  { id: '11', time: '10:18', order: '77053960', account: '1449003', server: 'MT5', amount: 200000, balanceAfter: 520000, type: 'Deposit', comment: 'Internal transfer', clientName: 'Yuki Tanaka', openTime: '04.09 22:40:11', closeTime: '04.09 22:40:11', volume: 0.01 },
  { id: '12', time: '09:42', order: '77053935', account: '6208456', server: 'MT4', amount: -12000, balanceAfter: 31200, type: 'Withdrawal', comment: 'Bank wire', clientName: 'Isabella Garcia', openTime: '04.09 22:22:48', closeTime: '04.09 22:22:48', volume: 0.01 },
];

/* ────────────────────────────────────────────────────── */
/*  Helpers                                               */
/* ────────────────────────────────────────────────────── */

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtAmount(n: number) {
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Math.abs(n));
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

/* ────────────────────────────────────────────────────── */
/*  Balance Order Detail Modal                            */
/* ────────────────────────────────────────────────────── */

function DetailModal({ row, onClose }: { row: DepositRow; onClose: () => void }) {
  const isDeposit = row.type === 'Deposit';
  const amountColor = isDeposit ? '#00dc82' : '#ef4444';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-[500px] max-h-[85vh] overflow-y-auto rounded-xl border"
        style={{ backgroundColor: '#111116', borderColor: '#252530' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #252530' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">Balance Order {row.order}</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,220,130,0.1)', color: '#00dc82' }}>
              Balance
            </span>
            <span className="flex items-center gap-1 text-xs text-white/40">
              <Lock size={11} /> {row.account}
            </span>
            <span className="flex items-center gap-1 text-xs text-white/40">
              <Smartphone size={11} /> {row.server}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Amount + Volume */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold" style={{ color: amountColor }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Math.abs(row.amount))}
              </div>
              <div className="text-[11px] text-white/30 mt-0.5">Profit</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60">{row.volume.toFixed(4)} <span className="text-[10px] text-white/30">Volume, lots</span></div>
            </div>
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
            <FieldRow label="Symbol" value="---" />
            <FieldRow label="Volume, USD" value="$0.00" />
            <FieldRow label="Open price" value="---" />
            <FieldRow label="Close price" value="---" />
            <FieldRow label="Open time" value={`${row.openTime} (16 hours)`} />
            <FieldRow label="Close time" value={`${row.closeTime} (16 hours)`} />
          </div>

          <div className="h-px" style={{ backgroundColor: '#252530' }} />

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
            <FieldRow label="Swaps" value="$0.00" />
            <FieldRow label="Commission" value="$0.00" />
            <FieldRow label="Stop loss" value="---" />
            <FieldRow label="Take profit" value="---" />
          </div>

          <div className="h-px" style={{ backgroundColor: '#252530' }} />

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
            <FieldRow label="Taxes" value="$0.00" />
            <FieldRow label="Agent commission" value="$0.00" />
            <FieldRow label="Magic" value="---" />
            <FieldRow label="Expiration date" value="---" />
          </div>

          <div className="h-px" style={{ backgroundColor: '#252530' }} />

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
            <FieldRow label="Gateway, lots" value="---" />
            <FieldRow label="Gateway order" value="---" />
            <FieldRow label="Open price delta" value="---" />
            <FieldRow label="Close price delta" value="---" />
          </div>

          <div className="h-px" style={{ backgroundColor: '#252530' }} />

          <div className="space-y-2 text-[12px]">
            <FieldRow label="Client" value={row.clientName} />
            <FieldRow label="Reason" value={row.type} />
            <FieldRow label="Comment" value={row.comment} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/30">{label}</span>
      <span className="text-white/70">{value}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
/*  Main Page                                             */
/* ────────────────────────────────────────────────────── */

export default function DepositsPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedRow, setSelectedRow] = useState<DepositRow | null>(null);

  const totalDeposits = MOCK_ROWS.filter((r) => r.type === 'Deposit').reduce((s, r) => s + r.amount, 0);
  const totalWithdrawals = MOCK_ROWS.filter((r) => r.type === 'Withdrawal').reduce((s, r) => s + Math.abs(r.amount), 0);
  const netFlow = totalDeposits - totalWithdrawals;

  // Scale totals to match specification values
  const displayDeposits = 139_569_022;
  const displayWithdrawals = 45_200_000;
  const displayNet = displayDeposits - displayWithdrawals;

  const filteredRows =
    activeTab === 'deposit'
      ? MOCK_ROWS.filter((r) => r.type === 'Deposit')
      : activeTab === 'withdraw'
        ? MOCK_ROWS.filter((r) => r.type === 'Withdrawal')
        : MOCK_ROWS;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">DEPOSITS & WITHDRAWALS</h1>
        <p className="text-xs text-white/30 mt-0.5">Real-time fund movement tracking</p>
      </div>

      {/* Top Tabs */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActiveTab('deposit')}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            color: activeTab === 'deposit' ? '#00dc82' : 'rgba(255,255,255,0.4)',
            backgroundColor: activeTab === 'deposit' ? 'rgba(0,220,130,0.08)' : 'transparent',
            border: activeTab === 'deposit' ? '1px solid rgba(0,220,130,0.2)' : '1px solid transparent',
          }}
        >
          Deposit Funds
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            color: activeTab === 'withdraw' ? '#ef4444' : 'rgba(255,255,255,0.4)',
            backgroundColor: activeTab === 'withdraw' ? 'rgba(239,68,68,0.08)' : 'transparent',
            border: activeTab === 'withdraw' ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
          }}
        >
          Withdraw Funds
        </button>
      </div>

      {/* Sub-filter bar */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-md text-[11px] font-medium text-white/60" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          Balances Summary
        </span>
      </div>

      {/* Summary Bar */}
      <div
        className="flex items-center gap-8 px-5 py-3.5 rounded-xl border"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: '#252530' }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Total Deposits</div>
          <div className="text-lg font-bold" style={{ color: '#00dc82' }}>{fmt(displayDeposits)}</div>
        </div>
        <div className="w-px h-10" style={{ backgroundColor: '#252530' }} />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Total Withdrawals</div>
          <div className="text-lg font-bold" style={{ color: '#ef4444' }}>{fmt(displayWithdrawals)}</div>
        </div>
        <div className="w-px h-10" style={{ backgroundColor: '#252530' }} />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Net Flow</div>
          <div className="text-lg font-bold" style={{ color: '#00dc82' }}>+{fmt(displayNet)}</div>
        </div>
      </div>

      {/* Main Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: '#252530' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: '1px solid #252530' }}>
                {['Time', 'Order', 'Account', 'Server', 'Amount', 'Balance After', 'Type', 'Comment'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'deposit' || activeTab === 'withdraw' ? filteredRows : MOCK_ROWS).map((row) => {
                const isDeposit = row.type === 'Deposit';
                const amountColor = isDeposit ? '#00dc82' : '#ef4444';
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-4 py-2.5 text-white/50 font-mono">{row.time}</td>
                    <td className="px-4 py-2.5 text-white/70 font-mono">{row.order}</td>
                    <td className="px-4 py-2.5 text-white/70 font-mono">{row.account}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        style={{
                          backgroundColor: row.server === 'MT5' ? 'rgba(0,145,213,0.1)' : 'rgba(255,165,0,0.1)',
                          color: row.server === 'MT5' ? '#0091D5' : '#ffa500',
                        }}
                      >
                        {row.server}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: amountColor }}>
                      {fmtAmount(row.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-white/60 font-mono">{fmt(row.balanceAfter)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: isDeposit ? 'rgba(0,220,130,0.1)' : 'rgba(239,68,68,0.1)',
                          color: amountColor,
                        }}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-white/40">{row.comment}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedRow && <DetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </div>
  );
}
