'use client';

import { motion } from 'framer-motion';
import {
  Puzzle, Star, Download, ExternalLink, Shield,
  BarChart3, CreditCard, BookOpen, MessageCircle,
  Database, Settings, Wrench,
} from 'lucide-react';
import type { PluginListing, PluginCategory } from '@/types/marketplace';

const CATEGORY_CONFIG: Record<PluginCategory, { label: string; icon: React.ReactNode; color: string }> = {
  risk_management: { label: 'Risk Management', icon: <Shield className="h-3.5 w-3.5" />, color: '#ef4444' },
  reporting: { label: 'Reporting', icon: <BarChart3 className="h-3.5 w-3.5" />, color: '#00b4ff' },
  psp_adapter: { label: 'Payment Adapter', icon: <CreditCard className="h-3.5 w-3.5" />, color: '#f59e0b' },
  data_provider: { label: 'Data Provider', icon: <Database className="h-3.5 w-3.5" />, color: '#8b5cf6' },
  education: { label: 'Education', icon: <BookOpen className="h-3.5 w-3.5" />, color: '#00dc82' },
  analytics_tool: { label: 'Analytics', icon: <BarChart3 className="h-3.5 w-3.5" />, color: '#06b6d4' },
  crm_connector: { label: 'CRM', icon: <Settings className="h-3.5 w-3.5" />, color: '#10b981' },
  communication: { label: 'Communication', icon: <MessageCircle className="h-3.5 w-3.5" />, color: '#f97316' },
  utility: { label: 'Utility', icon: <Wrench className="h-3.5 w-3.5" />, color: '#6b7280' },
};

interface PluginGridProps {
  plugins: PluginListing[];
  onInstall: (id: string) => void;
}

export function PluginGrid({ plugins, onInstall }: PluginGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {plugins.map((plugin, i) => {
        const cat = CATEGORY_CONFIG[plugin.category];
        return (
          <motion.div key={plugin.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-white/10 transition-all"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${cat.color}10` }}>
                <div style={{ color: cat.color }}>{cat.icon}</div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white">{plugin.name}</h4>
                <p className="text-[10px] text-white/25">{plugin.developer}</p>
              </div>
            </div>

            <p className="text-[11px] text-white/35 line-clamp-2 mb-3">{plugin.description}</p>

            <div className="flex flex-wrap gap-1 mb-3">
              <span className="px-2 py-0.5 rounded text-[9px]" style={{ backgroundColor: `${cat.color}10`, color: cat.color }}>
                {cat.label}
              </span>
              {plugin.tags.slice(0, 2).map(tag => (
                <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/20">{tag}</span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
              <div className="flex items-center gap-3 text-[10px] text-white/25">
                <span className="flex items-center gap-1 text-[#f59e0b]"><Star className="h-3 w-3 fill-current" />{plugin.rating.toFixed(1)}</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" />{plugin.installCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">
                  {plugin.tier === 'free' ? <span className="text-[#00dc82]">Free</span> :
                   plugin.price ? `$${plugin.price}` : 'Contact'}
                </span>
                <button onClick={() => onInstall(plugin.id)}
                  className="px-2.5 py-1 rounded-lg bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white text-[10px] font-medium transition-colors">
                  Install
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
