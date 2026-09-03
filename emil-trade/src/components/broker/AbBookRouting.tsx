'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Route, Shield, Plus, ToggleLeft, ToggleRight,
  ChevronDown, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import type { AbRoutingRule, RoutingDecision } from '@/types/broker';

interface AbBookRoutingProps {
  rules: AbRoutingRule[];
  recentDecisions: RoutingDecision[];
  onToggleRule: (ruleId: string, active: boolean) => void;
}

export function AbBookRouting({ rules, recentDecisions, onToggleRule }: AbBookRoutingProps) {
  const [showDecisions, setShowDecisions] = useState(false);

  const aBookCount = recentDecisions.filter(d => d.decision === 'a_book').length;
  const bBookCount = recentDecisions.filter(d => d.decision === 'b_book').length;
  const hybridCount = recentDecisions.filter(d => d.decision === 'hybrid').length;
  const total = recentDecisions.length || 1;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Route className="h-5 w-5 text-[#f59e0b]" />
          <div>
            <h3 className="text-sm font-semibold text-white">A/B Book Routing</h3>
            <p className="text-[11px] text-white/30">
              {rules.filter(r => r.isActive).length}/{rules.length} rules active
            </p>
          </div>
        </div>
      </div>

      {/* Routing Distribution Bar */}
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 flex h-3 rounded-full overflow-hidden bg-white/5">
            <div
              className="bg-[#00dc82] transition-all"
              style={{ width: `${(aBookCount / total) * 100}%` }}
              title={`A-Book: ${aBookCount}`}
            />
            <div
              className="bg-[#ef4444] transition-all"
              style={{ width: `${(bBookCount / total) * 100}%` }}
              title={`B-Book: ${bBookCount}`}
            />
            <div
              className="bg-[#f59e0b] transition-all"
              style={{ width: `${(hybridCount / total) * 100}%` }}
              title={`Hybrid: ${hybridCount}`}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1 text-[#00dc82]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00dc82]" />
            A-Book {((aBookCount / total) * 100).toFixed(0)}%
          </span>
          <span className="flex items-center gap-1 text-[#ef4444]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            B-Book {((bBookCount / total) * 100).toFixed(0)}%
          </span>
          <span className="flex items-center gap-1 text-[#f59e0b]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            Hybrid {((hybridCount / total) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Rules */}
      <div className="divide-y divide-white/[0.03]">
        {rules.map(rule => (
          <div key={rule.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
            <button
              onClick={() => onToggleRule(rule.id, !rule.isActive)}
              className="shrink-0"
            >
              {rule.isActive
                ? <ToggleRight className="h-5 w-5 text-[#00dc82]" />
                : <ToggleLeft className="h-5 w-5 text-white/20" />
              }
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white/80">{rule.name}</div>
              <div className="text-[10px] text-white/30">
                Priority {rule.priority} · {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              rule.action === 'a_book' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
              rule.action === 'b_book' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
              'bg-[#f59e0b]/10 text-[#f59e0b]'
            }`}>
              {rule.action === 'a_book' ? 'A-Book' :
               rule.action === 'b_book' ? 'B-Book' :
               `Hybrid ${rule.aBookPct}%`}
            </span>
          </div>
        ))}
      </div>

      {/* Recent Decisions Toggle */}
      <div className="border-t border-white/[0.06]">
        <button
          onClick={() => setShowDecisions(!showDecisions)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          <span>Recent Routing Decisions ({recentDecisions.length})</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDecisions ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showDecisions && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.03]">
                {recentDecisions.slice(0, 20).map(d => (
                  <div key={d.id} className="px-5 py-2 flex items-center gap-3 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      d.decision === 'a_book' ? 'bg-[#00dc82]' :
                      d.decision === 'b_book' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                    }`} />
                    <span className="text-white/60 font-mono">{d.symbol}</span>
                    <span className="text-white/30">{d.clientName}</span>
                    <span className="text-white/20 font-mono">{d.volume} lots</span>
                    <span className="text-white/20 ml-auto">{d.ruleName}</span>
                    <span className="text-white/15">{new Date(d.decidedAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
