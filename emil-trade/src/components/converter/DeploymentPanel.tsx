'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Shield, Monitor, TestTube, FileText, Store, ChevronDown, AlertTriangle } from 'lucide-react';
import type { DeploymentScope, DeploymentTarget, RiskFlag } from '@/types/converter';

interface DeploymentPanelProps {
  scriptName: string;
  riskFlags: RiskFlag[];
  requiresBrokerApproval: boolean;
  onDeploy: (config: { scope: DeploymentScope; target: DeploymentTarget; publishToMarketplace: boolean }) => void;
  isDeploying: boolean;
}

const SCOPE_OPTIONS: { value: DeploymentScope; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'paper', label: 'Paper Trading', icon: <FileText className="h-4 w-4" />, desc: 'Simulated — no real orders' },
  { value: 'demo', label: 'Demo Environment', icon: <TestTube className="h-4 w-4" />, desc: 'Demo accounts only' },
  { value: 'live', label: 'Live Environment', icon: <Monitor className="h-4 w-4" />, desc: 'Real trading — use caution' },
];

const TARGET_OPTIONS: { value: DeploymentTarget; label: string; desc: string }[] = [
  { value: 'single_account', label: 'Single Account', desc: 'Deploy to one specific account' },
  { value: 'account_group', label: 'Account Group', desc: 'Deploy to a group of accounts' },
  { value: 'platform_wide', label: 'Platform Wide', desc: 'Available to all eligible accounts' },
];

export function DeploymentPanel({ scriptName, riskFlags, requiresBrokerApproval, onDeploy, isDeploying }: DeploymentPanelProps) {
  const [scope, setScope] = useState<DeploymentScope>('demo');
  const [target, setTarget] = useState<DeploymentTarget>('single_account');
  const [publishToMarketplace, setPublishToMarketplace] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleDeploy = () => {
    onDeploy({ scope, target, publishToMarketplace });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#00b4ff]/10">
          <Rocket className="h-5 w-5 text-[#00b4ff]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Deploy {scriptName}</h3>
          <p className="text-xs text-white/40">Configure deployment scope and target</p>
        </div>
      </div>

      {/* Risk warnings */}
      {riskFlags.length > 0 && (
        <div className="p-3 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/20">
          <div className="flex items-center gap-2 text-[#f59e0b] mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Risk Flags Detected</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {riskFlags.map(flag => (
              <span key={flag} className="px-2 py-0.5 rounded text-[10px] bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                {flag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {requiresBrokerApproval && (
        <div className="p-3 rounded-lg bg-[#8b5cf6]/5 border border-[#8b5cf6]/20">
          <div className="flex items-center gap-2 text-[#8b5cf6]">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-medium">Broker Approval Required</span>
          </div>
          <p className="text-xs text-white/40 mt-1">This script will be queued for broker review before activation.</p>
        </div>
      )}

      {/* Scope Selection */}
      <div>
        <label className="text-xs text-white/50 mb-2 block">Environment</label>
        <div className="grid grid-cols-3 gap-2">
          {SCOPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setScope(opt.value)}
              className={`
                p-3 rounded-lg border text-left transition-all
                ${scope === opt.value
                  ? 'border-[#00b4ff]/50 bg-[#00b4ff]/5'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                }
              `}
            >
              <div className={`mb-1.5 ${scope === opt.value ? 'text-[#00b4ff]' : 'text-white/30'}`}>
                {opt.icon}
              </div>
              <div className="text-xs font-medium text-white/80">{opt.label}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Target Selection */}
      <div>
        <label className="text-xs text-white/50 mb-2 block">Deployment Target</label>
        <div className="space-y-2">
          {TARGET_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`
                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${target === opt.value
                  ? 'border-[#00b4ff]/50 bg-[#00b4ff]/5'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                }
              `}
            >
              <input
                type="radio"
                name="target"
                checked={target === opt.value}
                onChange={() => setTarget(opt.value)}
                className="accent-[#00b4ff]"
              />
              <div>
                <div className="text-xs font-medium text-white/80">{opt.label}</div>
                <div className="text-[10px] text-white/40">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        Advanced Options
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] cursor-pointer">
              <input
                type="checkbox"
                checked={publishToMarketplace}
                onChange={e => setPublishToMarketplace(e.target.checked)}
                className="accent-[#00b4ff] rounded"
              />
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-[#00dc82]" />
                <div>
                  <div className="text-xs font-medium text-white/80">Publish to RAPTOR Marketplace</div>
                  <div className="text-[10px] text-white/40">Make this script available to other users</div>
                </div>
              </div>
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deploy Button */}
      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className={`
          w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all
          ${isDeploying
            ? 'bg-white/5 text-white/30 cursor-not-allowed'
            : scope === 'live'
              ? 'bg-gradient-to-r from-[#00b4ff] to-[#00dc82] hover:opacity-90 text-white'
              : 'bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white'
          }
        `}
      >
        <Rocket className="h-4 w-4" />
        {isDeploying ? 'Deploying...' : `Deploy to ${scope === 'live' ? 'LIVE' : scope === 'demo' ? 'Demo' : 'Paper'}`}
      </button>
    </div>
  );
}
