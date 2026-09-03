'use client';

import { useState } from 'react';
import { ReportBuilder } from '@/components/broker/ReportBuilder';
import type { SavedReport, ReportConfig } from '@/types/broker';

const MOCK_SAVED_REPORTS: SavedReport[] = [
  { id: '1', name: 'Daily Trading Summary', description: 'All trades executed today', reportType: 'trades', config: { dataSource: 'trades', columns: ['symbol', 'type', 'volume', 'pnl', 'commission'], filters: [], groupBy: 'symbol', sortBy: 'pnl', sortDir: 'desc', chartType: 'bar', dateRange: null }, scheduleCron: '0 23 * * *', deliveryEmails: ['admin@broker.com'], isShared: true, sharedRoles: ['broker_admin'], lastRunAt: new Date().toISOString(), createdAt: new Date().toISOString() },
  { id: '2', name: 'Client Retention Report', description: '30/60/90 day retention', reportType: 'clients', config: { dataSource: 'clients', columns: ['name', 'country', 'balance', 'total_deposits', 'last_trade'], filters: [], groupBy: null, sortBy: 'balance', sortDir: 'desc', chartType: 'funnel', dateRange: null }, scheduleCron: null, deliveryEmails: [], isShared: false, sharedRoles: [], lastRunAt: null, createdAt: new Date().toISOString() },
  { id: '3', name: 'Revenue by Symbol', description: 'Revenue breakdown per instrument', reportType: 'revenue', config: { dataSource: 'revenue', columns: ['date', 'type', 'symbol', 'amount', 'trade_count'], filters: [], groupBy: 'symbol', sortBy: 'amount', sortDir: 'desc', chartType: 'pie', dateRange: null }, scheduleCron: '0 9 * * 1', deliveryEmails: ['cfo@broker.com'], isShared: true, sharedRoles: ['finance_officer'], lastRunAt: new Date().toISOString(), createdAt: new Date().toISOString() },
];

export default function BiPage() {
  const [savedReports] = useState(MOCK_SAVED_REPORTS);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Business Intelligence</h1>
        <p className="text-xs text-white/30">Build custom reports, schedule delivery, and analyze your business</p>
      </div>
      <ReportBuilder
        savedReports={savedReports}
        onSave={(report) => console.log('Save report:', report)}
        onRun={(config) => console.log('Run report:', config)}
        onExport={(format) => console.log('Export:', format)}
      />
    </div>
  );
}
