'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, PieChart, TrendingUp, Filter, Download,
  Calendar, Mail, Save, Play, Plus, Clock, FileText,
  Columns, SortAsc, LineChart,
} from 'lucide-react';
import type { SavedReport, ReportConfig } from '@/types/broker';

const DATA_SOURCES = [
  { value: 'clients', label: 'Clients', icon: '👤' },
  { value: 'trades', label: 'Trades', icon: '📊' },
  { value: 'revenue', label: 'Revenue', icon: '💰' },
  { value: 'payments', label: 'Payments', icon: '💳' },
  { value: 'ib', label: 'IB/Affiliates', icon: '🤝' },
  { value: 'compliance', label: 'Compliance', icon: '🛡️' },
];

const CHART_TYPES = [
  { value: 'none', label: 'Table Only', icon: <FileText className="h-3.5 w-3.5" /> },
  { value: 'line', label: 'Line', icon: <LineChart className="h-3.5 w-3.5" /> },
  { value: 'bar', label: 'Bar', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { value: 'pie', label: 'Pie', icon: <PieChart className="h-3.5 w-3.5" /> },
  { value: 'heatmap', label: 'Heatmap', icon: <Columns className="h-3.5 w-3.5" /> },
  { value: 'funnel', label: 'Funnel', icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

const SOURCE_COLUMNS: Record<string, string[]> = {
  clients: ['name', 'email', 'country', 'kyc_status', 'risk_category', 'balance', 'equity', 'total_deposits', 'total_withdrawals', 'pnl', 'volume', 'registered_at', 'last_trade'],
  trades: ['symbol', 'type', 'volume', 'open_price', 'close_price', 'pnl', 'commission', 'swap', 'open_time', 'close_time', 'duration', 'client_name'],
  revenue: ['date', 'type', 'symbol', 'amount', 'client_name', 'trade_count'],
  payments: ['type', 'amount', 'currency', 'status', 'method', 'client_name', 'processed_at'],
  ib: ['ib_name', 'level', 'commission_type', 'rate', 'accrued', 'paid', 'client_count', 'volume'],
  compliance: ['client_name', 'alert_type', 'severity', 'status', 'created_at', 'resolved_at'],
};

interface ReportBuilderProps {
  savedReports: SavedReport[];
  onSave: (report: Partial<SavedReport>) => void;
  onRun: (config: ReportConfig) => void;
  onExport: (format: 'pdf' | 'xlsx' | 'csv') => void;
}

export function ReportBuilder({ savedReports, onSave, onRun, onExport }: ReportBuilderProps) {
  const [config, setConfig] = useState<ReportConfig>({
    dataSource: 'clients',
    columns: ['name', 'email', 'balance', 'pnl'],
    filters: [],
    groupBy: null,
    sortBy: 'balance',
    sortDir: 'desc',
    chartType: 'bar',
    dateRange: null,
  });
  const [reportName, setReportName] = useState('');

  const availableColumns = SOURCE_COLUMNS[config.dataSource] ?? [];

  const toggleColumn = (col: string) => {
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.includes(col)
        ? prev.columns.filter(c => c !== col)
        : [...prev.columns, col],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <h4 className="text-xs font-medium text-white/50 mb-3">Saved Reports</h4>
          <div className="flex flex-wrap gap-2">
            {savedReports.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setConfig(r.config);
                  setReportName(r.name);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors"
              >
                <FileText className="h-3 w-3 text-white/30" />
                <span className="text-xs text-white/60">{r.name}</span>
                {r.scheduleCron && <Clock className="h-2.5 w-2.5 text-[#00b4ff]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* Config Panel */}
        <div className="col-span-4 space-y-4">
          {/* Data Source */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-xs font-medium text-white/50 mb-3">Data Source</h4>
            <div className="grid grid-cols-2 gap-2">
              {DATA_SOURCES.map(ds => (
                <button
                  key={ds.value}
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    dataSource: ds.value as ReportConfig['dataSource'],
                    columns: (SOURCE_COLUMNS[ds.value] ?? []).slice(0, 4),
                  }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    config.dataSource === ds.value
                      ? 'bg-[#00b4ff]/10 border border-[#00b4ff]/30 text-[#00b4ff]'
                      : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60'
                  }`}
                >
                  <span>{ds.icon}</span>
                  {ds.label}
                </button>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-2">
              <Columns className="h-3.5 w-3.5" />
              Columns ({config.columns.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {availableColumns.map(col => (
                <button
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className={`px-2 py-1 rounded text-[10px] transition-colors ${
                    config.columns.includes(col)
                      ? 'bg-[#00b4ff]/10 text-[#00b4ff] border border-[#00b4ff]/20'
                      : 'bg-white/5 text-white/25 border border-transparent hover:text-white/40'
                  }`}
                >
                  {col.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Type */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-xs font-medium text-white/50 mb-3">Visualization</h4>
            <div className="grid grid-cols-3 gap-2">
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => setConfig(prev => ({ ...prev, chartType: ct.value as ReportConfig['chartType'] }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition-all ${
                    config.chartType === ct.value
                      ? 'bg-[#00b4ff]/10 border border-[#00b4ff]/30 text-[#00b4ff]'
                      : 'bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50'
                  }`}
                >
                  {ct.icon}
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-2">
              <SortAsc className="h-3.5 w-3.5" />
              Sort
            </h4>
            <div className="flex gap-2">
              <select
                value={config.sortBy}
                onChange={e => setConfig(prev => ({ ...prev, sortBy: e.target.value }))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/60 focus:outline-none"
              >
                {config.columns.map(col => (
                  <option key={col} value={col}>{col.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <button
                onClick={() => setConfig(prev => ({ ...prev, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' }))}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/40"
              >
                {config.sortDir.toUpperCase()}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="col-span-8">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <input
                type="text"
                placeholder="Report name..."
                value={reportName}
                onChange={e => setReportName(e.target.value)}
                className="bg-transparent text-sm font-medium text-white placeholder:text-white/20 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRun(config)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white text-xs font-medium transition-colors"
                >
                  <Play className="h-3 w-3" />
                  Run
                </button>
                <button
                  onClick={() => onSave({ name: reportName, config, reportType: config.dataSource })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium transition-colors"
                >
                  <Save className="h-3 w-3" />
                  Save
                </button>
                <div className="flex border border-white/[0.06] rounded-lg overflow-hidden">
                  {(['pdf', 'xlsx', 'csv'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => onExport(fmt)}
                      className="px-2 py-1.5 text-[10px] text-white/30 hover:bg-white/5 hover:text-white/60 transition-colors border-r border-white/[0.06] last:border-r-0"
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview placeholder */}
            <div className="p-8 text-center">
              <BarChart3 className="h-12 w-12 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">Click "Run" to generate report</p>
              <p className="text-xs text-white/15 mt-1">
                {config.dataSource} · {config.columns.length} columns · {config.chartType} chart
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
