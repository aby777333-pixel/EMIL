'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plug, CheckCircle2, XCircle, Clock, AlertTriangle,
  Settings, ExternalLink, Wifi, WifiOff, Filter, Zap,
  Server, DollarSign, Shield, MessageCircle, BarChart3,
  Globe, Building, Database, Radio, CreditCard, Key,
} from 'lucide-react';
import type { IntegrationSummary, IntegrationCategory, BridgeStatus } from '@/types/integrations';

const CATEGORY_CONFIG: Record<IntegrationCategory, { label: string; icon: React.ReactNode; color: string }> = {
  platform: { label: 'Trading Platforms', icon: <Server className="h-3.5 w-3.5" />, color: '#00b4ff' },
  liquidity: { label: 'Liquidity', icon: <Radio className="h-3.5 w-3.5" />, color: '#00dc82' },
  fix: { label: 'FIX Protocol', icon: <Zap className="h-3.5 w-3.5" />, color: '#8b5cf6' },
  api: { label: 'API & Webhooks', icon: <Key className="h-3.5 w-3.5" />, color: '#f59e0b' },
  psp: { label: 'Payments', icon: <CreditCard className="h-3.5 w-3.5" />, color: '#ff6b35' },
  kyc: { label: 'KYC/AML', icon: <Shield className="h-3.5 w-3.5" />, color: '#ef4444' },
  comms: { label: 'Communications', icon: <MessageCircle className="h-3.5 w-3.5" />, color: '#10b981' },
  analytics: { label: 'Analytics', icon: <BarChart3 className="h-3.5 w-3.5" />, color: '#06b6d4' },
  data: { label: 'Data Providers', icon: <Database className="h-3.5 w-3.5" />, color: '#a855f7' },
  enterprise: { label: 'Enterprise', icon: <Building className="h-3.5 w-3.5" />, color: '#6366f1' },
};

const STATUS_CONFIG: Record<BridgeStatus, { label: string; color: string; icon: React.ReactNode }> = {
  connected: { label: 'Connected', color: '#00dc82', icon: <CheckCircle2 className="h-3 w-3" /> },
  connecting: { label: 'Connecting', color: '#f59e0b', icon: <Clock className="h-3 w-3 animate-spin" /> },
  disconnected: { label: 'Not Connected', color: '#6b7280', icon: <WifiOff className="h-3 w-3" /> },
  error: { label: 'Error', color: '#ef4444', icon: <XCircle className="h-3 w-3" /> },
  maintenance: { label: 'Maintenance', color: '#f59e0b', icon: <AlertTriangle className="h-3 w-3" /> },
};

function IntegrationCard({ integration, onConfigure }: { integration: IntegrationSummary; onConfigure: (id: string) => void }) {
  const catConfig = CATEGORY_CONFIG[integration.category];
  const statusConfig = STATUS_CONFIG[integration.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${catConfig.color}10` }}>
            <div style={{ color: catConfig.color }}>{catConfig.icon}</div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white">{integration.name}</h4>
              {integration.isPremium && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] font-bold">PRO</span>
              )}
            </div>
            <p className="text-[10px] text-white/25">{integration.type}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px]" style={{ color: statusConfig.color }}>
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </div>

      <p className="text-[11px] text-white/30 line-clamp-2 mb-3">{integration.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-[9px] px-2 py-0.5 rounded capitalize" style={{
          backgroundColor: `${catConfig.color}10`, color: catConfig.color,
        }}>{catConfig.label}</span>

        <div className="flex gap-1.5">
          {integration.docsUrl && (
            <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/15 hover:text-white/40 transition-colors">
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => onConfigure(integration.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
              integration.isConfigured
                ? 'bg-white/5 text-white/40 hover:bg-white/10'
                : 'bg-[#00b4ff] text-white hover:bg-[#00b4ff]/80'
            }`}
          >
            <Settings className="h-2.5 w-2.5" />
            {integration.isConfigured ? 'Configure' : 'Connect'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface IntegrationHubProps {
  integrations: IntegrationSummary[];
  onConfigure: (id: string) => void;
}

export function IntegrationHub({ integrations, onConfigure }: IntegrationHubProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<IntegrationCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'disconnected'>('all');

  const categories: (IntegrationCategory | 'all')[] = ['all', ...Object.keys(CATEGORY_CONFIG) as IntegrationCategory[]];

  const filtered = integrations.filter(i => {
    if (filterCategory !== 'all' && i.category !== filterCategory) return false;
    if (filterStatus === 'connected' && i.status !== 'connected') return false;
    if (filterStatus === 'disconnected' && i.status === 'connected') return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) &&
        !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <div className="space-y-5">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">Total Integrations</div>
          <div className="text-xl font-mono font-bold text-white">{integrations.length}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">Connected</div>
          <div className="text-xl font-mono font-bold text-[#00dc82]">{connectedCount}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">Errors</div>
          <div className="text-xl font-mono font-bold text-[#ef4444]">{integrations.filter(i => i.status === 'error').length}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
          <div className="text-[10px] text-white/25 mb-1">Categories</div>
          <div className="text-xl font-mono font-bold text-[#8b5cf6]">{new Set(integrations.map(i => i.category)).size}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input type="text" placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/20 focus:border-[#00b4ff] focus:outline-none" />
        </div>

        <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 overflow-x-auto max-w-xl scrollbar-none">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
              }`}>
              {cat === 'all' ? 'All' : CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>

        <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {(['all', 'connected', 'disconnected'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${
                filterStatus === s ? 'bg-white/10 text-white' : 'text-white/30'
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(i => <IntegrationCard key={i.id} integration={i} onConfigure={onConfigure} />)}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16">
            <Plug className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/20">No integrations match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
