'use client';

import { useState } from 'react';
import { ClipboardList, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { TabGroup } from '@/components/ui/TabGroup';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface ReconciliationBreak {
  entity: string;
  platformValue: string;
  lpValue: string;
  difference: string;
  status: string;
}

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState('lp');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, ReconciliationBreak[]>>({});

  const tabs = [
    { id: 'lp', label: 'LP vs Platform' },
    { id: 'deposits', label: 'Deposits' },
    { id: 'ib', label: 'IB Commissions' },
  ];

  function runReconciliation(tabId: string) {
    setRunning(true);
    // Simulate reconciliation process
    setTimeout(() => {
      const hasBreaks = Math.random() > 0.5;
      if (hasBreaks) {
        setResults((prev) => ({
          ...prev,
          [tabId]: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
            entity: tabId === 'lp' ? `EURUSD-${1000 + i}` : tabId === 'deposits' ? `TXN-${5000 + i}` : `IB-${200 + i}`,
            platformValue: `$${(Math.random() * 10000).toFixed(2)}`,
            lpValue: `$${(Math.random() * 10000).toFixed(2)}`,
            difference: `$${(Math.random() * 500 - 250).toFixed(2)}`,
            status: Math.random() > 0.5 ? 'break' : 'resolved',
          })),
        }));
      } else {
        setResults((prev) => ({ ...prev, [tabId]: [] }));
      }
      setRunning(false);
    }, 2000);
  }

  const breakColumns = [
    { key: 'entity', label: 'Entity' },
    {
      key: 'platformValue',
      label: 'Platform Value',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => <span className="mono">{String(row.platformValue)}</span>,
    },
    {
      key: 'lpValue',
      label: tabId2Label(activeTab),
      align: 'right' as const,
      render: (row: Record<string, unknown>) => <span className="mono">{String(row.lpValue)}</span>,
    },
    {
      key: 'difference',
      label: 'Difference',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => {
        const val = parseFloat(String(row.difference).replace('$', ''));
        return (
          <span className={`mono font-medium ${Math.abs(val) > 50 ? 'text-loss' : 'text-gold'}`}>
            {String(row.difference)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Record<string, unknown>) => {
        const s = String(row.status);
        return (
          <StatusBadge
            status={s}
            variant={s === 'break' ? 'danger' : 'success'}
          />
        );
      },
    },
  ];

  function tabId2Label(id: string): string {
    switch (id) {
      case 'lp': return 'LP Value';
      case 'deposits': return 'Bank Value';
      case 'ib': return 'Calculated';
      default: return 'External Value';
    }
  }

  const currentResults = results[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reconciliation</h1>
        <p className="text-xs text-secondary">Compare platform data with external sources</p>
      </div>

      <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-4 space-y-4">
        {/* Run Reconciliation Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {activeTab === 'lp' && 'LP vs Platform Reconciliation'}
              {activeTab === 'deposits' && 'Deposit Reconciliation'}
              {activeTab === 'ib' && 'IB Commission Reconciliation'}
            </h3>
            <p className="text-[11px] text-secondary">
              {activeTab === 'lp' && 'Compare open positions and fills between platform and liquidity providers.'}
              {activeTab === 'deposits' && 'Match deposit records against bank/PSP statements.'}
              {activeTab === 'ib' && 'Verify calculated IB commissions against actual payouts.'}
            </p>
          </div>
          <button
            onClick={() => runReconciliation(activeTab)}
            disabled={running}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {running ? 'Running...' : 'Run Reconciliation'}
          </button>
        </div>

        {/* Results */}
        {currentResults !== undefined ? (
          currentResults.length > 0 ? (
            <div className="space-y-3">
              {/* Summary Banner */}
              <div className="flex items-center gap-3 rounded-xl border border-loss/30 bg-loss/5 p-3">
                <AlertTriangle className="h-5 w-5 text-loss" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {currentResults.filter((r) => r.status === 'break').length} breaks found
                  </p>
                  <p className="text-[11px] text-secondary">
                    {currentResults.filter((r) => r.status === 'resolved').length} resolved
                  </p>
                </div>
              </div>

              <DataTable
                columns={breakColumns}
                data={currentResults as unknown as Record<string, unknown>[]}
                sortable
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-profit/30 bg-profit/5 p-4">
              <CheckCircle className="h-5 w-5 text-profit" />
              <div>
                <p className="text-sm font-semibold text-foreground">All reconciled</p>
                <p className="text-[11px] text-secondary">No discrepancies found.</p>
              </div>
            </div>
          )
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No results yet"
            description="Click 'Run Reconciliation' to compare records."
          />
        )}
      </div>
    </div>
  );
}
