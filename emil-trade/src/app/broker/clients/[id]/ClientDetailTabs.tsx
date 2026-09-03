'use client';

import { useState } from 'react';
import { TabGroup } from '@/components/ui/TabGroup';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Wallet,
  TrendingUp,
  History,
  CreditCard,
  FileCheck,
  MessageSquare,
  ShieldAlert,
  ClipboardList,
  LayoutDashboard,
} from 'lucide-react';

interface ClientDetailTabsProps {
  clientId: string;
  accounts: Record<string, unknown>[];
  positions: Record<string, unknown>[];
  tradeHistory: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  kycDocs: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  riskProfile: Record<string, unknown> | null;
  auditLog: Record<string, unknown>[];
}

function formatCurrency(val: number): string {
  return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ClientDetailTabs({
  clientId,
  accounts,
  positions,
  tradeHistory,
  transactions,
  kycDocs,
  notes,
  riskProfile,
  auditLog,
}: ClientDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [noteText, setNoteText] = useState('');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: 'Accounts', count: accounts.length },
    { id: 'positions', label: 'Positions', count: positions.length },
    { id: 'history', label: 'History', count: tradeHistory.length },
    { id: 'transactions', label: 'Transactions', count: transactions.length },
    { id: 'kyc', label: 'KYC', count: kycDocs.length },
    { id: 'notes', label: 'Notes', count: notes.length },
    { id: 'risk', label: 'Risk' },
    { id: 'audit', label: 'Audit', count: auditLog.length },
  ];

  return (
    <div>
      <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="stat-card">
                <p className="text-xs text-secondary">Total Balance</p>
                <p className="mono text-xl font-semibold text-foreground">
                  {formatCurrency(accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0))}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-secondary">Total Equity</p>
                <p className="mono text-xl font-semibold text-foreground">
                  {formatCurrency(accounts.reduce((s, a) => s + (Number(a.equity) || 0), 0))}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-secondary">Total Trades</p>
                <p className="mono text-xl font-semibold text-foreground">{tradeHistory.length}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-elevated p-4">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Recent Activity</h4>
              {tradeHistory.length > 0 ? (
                <div className="space-y-2">
                  {tradeHistory.slice(0, 5).map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-surface/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{String(t.symbol)}</span>
                        <StatusBadge status={String(t.direction ?? t.type ?? 'trade')} />
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="mono text-secondary">{Number(t.lots ?? t.volume ?? 0).toFixed(2)} lots</span>
                        <span className={`mono font-medium ${Number(t.profit) >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatCurrency(Number(t.profit) || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">No recent activity.</p>
              )}
            </div>
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          accounts.length > 0 ? (
            <DataTable
              columns={[
                { key: 'account_number', label: 'Account #' },
                { key: 'account_type', label: 'Type' },
                { key: 'currency', label: 'Currency' },
                { key: 'balance', label: 'Balance', align: 'right', render: (r) => <span className="mono">{formatCurrency(Number(r.balance) || 0)}</span> },
                { key: 'equity', label: 'Equity', align: 'right', render: (r) => <span className="mono">{formatCurrency(Number(r.equity) || 0)}</span> },
                { key: 'leverage', label: 'Leverage', render: (r) => `1:${r.leverage ?? 100}` },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status ?? 'active')} /> },
              ]}
              data={accounts}
              sortable
            />
          ) : (
            <EmptyState icon={Wallet} title="No accounts" description="This client has no trading accounts yet." />
          )
        )}

        {/* POSITIONS TAB */}
        {activeTab === 'positions' && (
          positions.length > 0 ? (
            <DataTable
              columns={[
                { key: 'symbol', label: 'Symbol' },
                { key: 'direction', label: 'Direction', render: (r) => <StatusBadge status={String(r.direction)} variant={r.direction === 'buy' ? 'success' : 'danger'} /> },
                { key: 'lots', label: 'Lots', align: 'right', render: (r) => <span className="mono">{Number(r.lots).toFixed(2)}</span> },
                { key: 'open_price', label: 'Open Price', align: 'right', render: (r) => <span className="mono">{Number(r.open_price).toFixed(5)}</span> },
                { key: 'current_price', label: 'Current', align: 'right', render: (r) => <span className="mono">{Number(r.current_price).toFixed(5)}</span> },
                { key: 'profit', label: 'P&L', align: 'right', render: (r) => {
                  const pnl = Number(r.profit) || 0;
                  return <span className={`mono font-medium ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(pnl)}</span>;
                }},
                { key: 'opened_at', label: 'Opened', render: (r) => new Date(String(r.opened_at)).toLocaleDateString() },
              ]}
              data={positions}
              sortable
            />
          ) : (
            <EmptyState icon={TrendingUp} title="No open positions" description="No active trades for this client." />
          )
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          tradeHistory.length > 0 ? (
            <DataTable
              columns={[
                { key: 'symbol', label: 'Symbol' },
                { key: 'direction', label: 'Dir', render: (r) => <StatusBadge status={String(r.direction)} variant={r.direction === 'buy' ? 'success' : 'danger'} /> },
                { key: 'lots', label: 'Lots', align: 'right', render: (r) => <span className="mono">{Number(r.lots).toFixed(2)}</span> },
                { key: 'open_price', label: 'Open', align: 'right', render: (r) => <span className="mono">{Number(r.open_price).toFixed(5)}</span> },
                { key: 'close_price', label: 'Close', align: 'right', render: (r) => <span className="mono">{Number(r.close_price).toFixed(5)}</span> },
                { key: 'profit', label: 'P&L', align: 'right', render: (r) => {
                  const pnl = Number(r.profit) || 0;
                  return <span className={`mono font-medium ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(pnl)}</span>;
                }},
                { key: 'closed_at', label: 'Closed', render: (r) => r.closed_at ? new Date(String(r.closed_at)).toLocaleDateString() : '\u2014' },
              ]}
              data={tradeHistory}
              sortable
              pageSize={20}
            />
          ) : (
            <EmptyState icon={History} title="No trade history" description="Completed trades will appear here." />
          )
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          transactions.length > 0 ? (
            <DataTable
              columns={[
                { key: 'type', label: 'Type', render: (r) => <StatusBadge status={String(r.type)} /> },
                { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="mono">{formatCurrency(Number(r.amount) || 0)}</span> },
                { key: 'method', label: 'Method' },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status)} /> },
                { key: 'created_at', label: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString() },
                { key: 'reference', label: 'Reference' },
              ]}
              data={transactions}
              sortable
              pageSize={20}
            />
          ) : (
            <EmptyState icon={CreditCard} title="No transactions" description="Deposit and withdrawal history will appear here." />
          )
        )}

        {/* KYC TAB */}
        {activeTab === 'kyc' && (
          kycDocs.length > 0 ? (
            <DataTable
              columns={[
                { key: 'document_type', label: 'Document Type' },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status)} /> },
                { key: 'created_at', label: 'Submitted', render: (r) => new Date(String(r.created_at)).toLocaleDateString() },
                { key: 'reviewed_at', label: 'Reviewed', render: (r) => r.reviewed_at ? new Date(String(r.reviewed_at)).toLocaleDateString() : '\u2014' },
                { key: 'file_url', label: 'Document', render: (r) => r.file_url ? (
                  <a href={String(r.file_url)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">View</a>
                ) : '\u2014' },
              ]}
              data={kycDocs}
            />
          ) : (
            <EmptyState icon={FileCheck} title="No KYC documents" description="KYC documents will appear once the client uploads them." />
          )
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Add Note Form */}
            <div className="rounded-xl border border-border bg-elevated p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">Add Note</h4>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter a note about this client..."
                className="w-full rounded-lg border border-border bg-surface p-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <button
                  disabled={!noteText.trim()}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
            </div>

            {/* Notes Timeline */}
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note, i) => {
                  const author = note.author as Record<string, unknown> | null;
                  return (
                    <div key={i} className="rounded-xl border border-border bg-elevated p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          {(author?.full_name as string) ?? 'Staff'}
                        </span>
                        <span className="text-[10px] text-muted">
                          {new Date(String(note.created_at)).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-secondary">{String(note.content)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={MessageSquare} title="No notes" description="Staff notes about this client will appear here." />
            )}
          </div>
        )}

        {/* RISK TAB */}
        {activeTab === 'risk' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="stat-card">
                <p className="text-xs text-secondary">Risk Score</p>
                <p className="mono text-2xl font-semibold text-foreground">{String(riskProfile?.score ?? '\u2014')}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-secondary">Risk Category</p>
                <p className="text-lg font-semibold text-foreground">{String(riskProfile?.category ?? 'Unassigned')}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-secondary">Book Assignment</p>
                <p className="text-lg font-semibold text-foreground">
                  {String(riskProfile?.book_type ?? 'A-Book').toUpperCase()}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-elevated p-4">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Risk Factors</h4>
              <div className="space-y-2 text-xs text-secondary">
                <p>Win Rate: <span className="mono text-foreground">{String(riskProfile?.win_rate ?? '\u2014')}%</span></p>
                <p>Average Trade Duration: <span className="mono text-foreground">{String(riskProfile?.avg_trade_duration ?? '\u2014')}</span></p>
                <p>Max Drawdown: <span className="mono text-loss">{String(riskProfile?.max_drawdown ?? '\u2014')}%</span></p>
                <p>Profit Factor: <span className="mono text-foreground">{String(riskProfile?.profit_factor ?? '\u2014')}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT TAB */}
        {activeTab === 'audit' && (
          auditLog.length > 0 ? (
            <DataTable
              columns={[
                { key: 'action', label: 'Action' },
                { key: 'details', label: 'Details', render: (r) => <span className="max-w-xs truncate">{String(r.details ?? r.description ?? '')}</span> },
                { key: 'performed_by', label: 'By' },
                { key: 'created_at', label: 'When', render: (r) => new Date(String(r.created_at)).toLocaleString() },
              ]}
              data={auditLog}
              pageSize={20}
            />
          ) : (
            <EmptyState icon={ClipboardList} title="No audit entries" description="Audit log entries for this client will appear here." />
          )
        )}
      </div>
    </div>
  );
}
