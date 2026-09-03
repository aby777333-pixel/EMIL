'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Circle, ChevronRight, Building, Palette,
  Globe, Radio, BarChart3, Users, CreditCard, Shield,
  UserPlus, FileText, Brain, Rocket, Clock, Zap,
} from 'lucide-react';
import type { OnboardingProgress, BrokerEntity, LoyaltyConfig, TaxSummary, TaxExport, IslamicConfig } from '@/types/operations';

const STEP_ICONS = [Building, Palette, Globe, Radio, BarChart3, Users, CreditCard, Shield, UserPlus, FileText, Brain, Rocket];

interface OnboardingWizardProps {
  progress: OnboardingProgress;
  entities: BrokerEntity[];
  islamicConfig: IslamicConfig;
  loyaltyConfig: LoyaltyConfig;
  taxSummary: TaxSummary | null;
  taxExports: TaxExport[];
  onCompleteStep: (step: number) => void;
  onGoLive: () => void;
}

export function OnboardingWizard({ progress, entities, islamicConfig, loyaltyConfig, taxSummary, taxExports, onCompleteStep, onGoLive }: OnboardingWizardProps) {
  const [tab, setTab] = useState<'onboarding' | 'entities' | 'islamic' | 'loyalty' | 'tax'>('onboarding');
  const pct = progress.totalSteps > 0 ? (progress.completedSteps / progress.totalSteps) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit overflow-x-auto">
        {([
          { key: 'onboarding', label: 'Broker Onboarding', icon: <Rocket className="h-3.5 w-3.5" /> },
          { key: 'entities', label: `Multi-Entity (${entities.length})`, icon: <Building className="h-3.5 w-3.5" /> },
          { key: 'islamic', label: 'Islamic Finance', icon: <FileText className="h-3.5 w-3.5" /> },
          { key: 'loyalty', label: 'Loyalty Engine', icon: <Zap className="h-3.5 w-3.5" /> },
          { key: 'tax', label: 'Tax Center', icon: <BarChart3 className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Onboarding */}
      {tab === 'onboarding' && (
        <div className="space-y-5">
          {/* Progress Header */}
          <div className="bg-gradient-to-r from-[#00b4ff]/5 to-[#00dc82]/5 border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{progress.brokerName} — Setup Progress</h3>
                <p className="text-[10px] text-white/25">{progress.completedSteps}/{progress.totalSteps} steps complete · Est. completion: {progress.estimatedCompletion}</p>
              </div>
              <span className="text-2xl font-mono font-bold text-[#00dc82]">{pct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#00b4ff] to-[#00dc82]" />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {progress.steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? Circle;
              const isActive = step.status === 'in_progress';
              const isDone = step.status === 'completed';
              return (
                <motion.div key={step.step} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-4 px-5 py-3 rounded-xl border transition-all ${
                    isActive ? 'border-[#00b4ff]/30 bg-[#00b4ff]/5' :
                    isDone ? 'border-[#00dc82]/10 bg-[#00dc82]/[0.02]' :
                    'border-white/[0.06] bg-white/[0.02]'
                  }`}>
                  <div className={`p-2 rounded-lg ${isDone ? 'bg-[#00dc82]/10' : isActive ? 'bg-[#00b4ff]/10' : 'bg-white/5'}`}>
                    {isDone ? <CheckCircle2 className="h-4 w-4 text-[#00dc82]" /> :
                     <Icon className={`h-4 w-4 ${isActive ? 'text-[#00b4ff]' : 'text-white/20'}`} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/15 font-mono">Step {step.step}</span>
                      <span className={`text-xs font-medium ${isDone ? 'text-[#00dc82]' : isActive ? 'text-white' : 'text-white/40'}`}>{step.title}</span>
                      {!step.isRequired && <span className="text-[8px] text-white/15 bg-white/5 px-1 py-0.5 rounded">Optional</span>}
                    </div>
                    <p className="text-[10px] text-white/20">{step.description}</p>
                  </div>
                  {isDone && <span className="text-[9px] text-[#00dc82]">{step.completedAt ? new Date(step.completedAt).toLocaleDateString() : 'Done'}</span>}
                  {isActive && (
                    <button onClick={() => onCompleteStep(step.step)}
                      className="px-3 py-1.5 rounded-lg bg-[#00b4ff] text-white text-[10px] font-medium hover:bg-[#00b4ff]/80">
                      Complete <ChevronRight className="h-3 w-3 inline" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Go-Live Checklist */}
          {progress.goLiveChecklist.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2"><Rocket className="h-4 w-4 text-[#00dc82]" /> Go-Live Checklist</h4>
              <div className="space-y-1.5">
                {progress.goLiveChecklist.map(item => (
                  <div key={item.item} className="flex items-center gap-2 text-[11px]">
                    {item.passed ? <CheckCircle2 className="h-3 w-3 text-[#00dc82]" /> : <Circle className="h-3 w-3 text-white/10" />}
                    <span className={item.passed ? 'text-white/50' : 'text-white/25'}>{item.item}</span>
                    {item.required && !item.passed && <span className="text-[8px] text-[#ef4444]">Required</span>}
                  </div>
                ))}
              </div>
              {progress.goLiveReady && (
                <button onClick={onGoLive}
                  className="mt-4 w-full py-3 rounded-lg bg-gradient-to-r from-[#00b4ff] to-[#00dc82] text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90">
                  <Rocket className="h-4 w-4" /> GO LIVE
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Multi-Entity */}
      {tab === 'entities' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">Total Entities</div>
              <div className="text-xl font-mono font-bold text-white">{entities.length}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">Total Clients</div>
              <div className="text-xl font-mono font-bold text-[#00b4ff]">{entities.reduce((s, e) => s + e.clients, 0).toLocaleString()}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">Total AUM</div>
              <div className="text-xl font-mono font-bold text-[#00dc82]">${(entities.reduce((s, e) => s + e.aum, 0) / 1e6).toFixed(1)}M</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">Group Revenue MTD</div>
              <div className="text-xl font-mono font-bold text-[#f59e0b]">${(entities.reduce((s, e) => s + e.revenueThisMonth, 0) / 1e3).toFixed(1)}K</div>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-[11px]">
              <thead><tr className="text-[10px] text-white/25 uppercase border-b border-white/[0.04]">
                <th className="text-left px-4 py-2 font-medium">Entity</th><th className="px-3 py-2 font-medium">Jurisdiction</th>
                <th className="text-right px-3 py-2 font-medium">Clients</th><th className="text-right px-3 py-2 font-medium">AUM</th>
                <th className="text-right px-3 py-2 font-medium">Revenue MTD</th><th className="text-center px-4 py-2 font-medium">Status</th>
              </tr></thead>
              <tbody>{entities.map(e => (
                <tr key={e.id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                  <td className="px-4 py-2"><div className="text-white/70">{e.name}</div><div className="text-[9px] text-white/15">{e.domain}</div></td>
                  <td className="px-3 py-2 text-white/30">{e.jurisdiction}</td>
                  <td className="px-3 py-2 text-right font-mono text-white/40">{e.clients.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#00dc82]">${(e.aum / 1e6).toFixed(1)}M</td>
                  <td className="px-3 py-2 text-right font-mono text-[#f59e0b]">${(e.revenueThisMonth / 1e3).toFixed(1)}K</td>
                  <td className="px-4 py-2 text-center"><span className={`text-[9px] px-1.5 py-0.5 rounded ${e.status === 'active' ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-white/5 text-white/20'}`}>{e.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Islamic */}
      {tab === 'islamic' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 max-w-xl">
          <h4 className="text-sm font-semibold text-white mb-4">Islamic Finance Configuration</h4>
          <div className="space-y-3 text-[11px]">
            <div className="flex justify-between"><span className="text-white/30">Swap-Free Accounts</span><span className={islamicConfig.isEnabled ? 'text-[#00dc82]' : 'text-white/15'}>{islamicConfig.isEnabled ? 'Enabled' : 'Disabled'}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Account Type</span><span className="text-white/50">{islamicConfig.swapFreeAccountType}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Admin Fee per Lot</span><span className="font-mono text-white/50">${islamicConfig.adminFeePerLot}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Excluded Instruments</span><span className="text-white/40">{islamicConfig.excludedInstruments.length} symbols</span></div>
            <div className="flex justify-between"><span className="text-white/30">Shariah Certificate</span><span className={islamicConfig.shariahCertificateUrl ? 'text-[#00dc82]' : 'text-white/15'}>{islamicConfig.shariahCertificateUrl ? 'Uploaded' : 'Not uploaded'}</span></div>
          </div>
        </div>
      )}

      {/* Loyalty */}
      {tab === 'loyalty' && (
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3">Tier Structure</h4>
            <div className="flex gap-2">
              {loyaltyConfig.tierThresholds.map(t => (
                <div key={t.tier} className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 text-center">
                  <div className="text-xs font-semibold text-white capitalize">{t.tier}</div>
                  <div className="text-[9px] text-white/20 mt-0.5">{t.minXp.toLocaleString()} XP</div>
                  <div className="mt-2 space-y-0.5">{t.benefits.map(b => <div key={b} className="text-[8px] text-[#00b4ff]">{b}</div>)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"><div className="text-[10px] text-white/25">XP per Trade</div><div className="text-lg font-mono font-bold text-white">{loyaltyConfig.xpPerTrade}</div></div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"><div className="text-[10px] text-white/25">XP per Lesson</div><div className="text-lg font-mono font-bold text-white">{loyaltyConfig.xpPerLesson}</div></div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"><div className="text-[10px] text-white/25">XP per Referral</div><div className="text-lg font-mono font-bold text-white">{loyaltyConfig.xpPerReferral}</div></div>
          </div>
        </div>
      )}

      {/* Tax */}
      {tab === 'tax' && taxSummary && (
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3">Tax Summary — {taxSummary.year}</h4>
            <div className="grid grid-cols-3 gap-3">
              <div><div className="text-[10px] text-white/25">Realized Gains</div><div className="text-sm font-mono text-[#00dc82]">${taxSummary.totalRealizedGains.toLocaleString()}</div></div>
              <div><div className="text-[10px] text-white/25">Realized Losses</div><div className="text-sm font-mono text-[#ef4444]">${Math.abs(taxSummary.totalRealizedLosses).toLocaleString()}</div></div>
              <div><div className="text-[10px] text-white/25">Net Capital Gains</div><div className={`text-sm font-mono font-bold ${taxSummary.netCapitalGains >= 0 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>${taxSummary.netCapitalGains.toLocaleString()}</div></div>
              <div><div className="text-[10px] text-white/25">Commissions</div><div className="text-sm font-mono text-white/40">${taxSummary.totalCommissions.toLocaleString()}</div></div>
              <div><div className="text-[10px] text-white/25">Swaps</div><div className="text-sm font-mono text-white/40">${taxSummary.totalSwaps.toLocaleString()}</div></div>
              <div><div className="text-[10px] text-white/25">Cost Basis</div><div className="text-sm font-mono text-white/40 uppercase">{taxSummary.costBasisMethod}</div></div>
            </div>
          </div>
          <div className="space-y-2">
            {taxExports.map(exp => (
              <div key={exp.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-white/20" />
                <span className="text-xs text-white/50 flex-1">{exp.format.replace('_', ' ').toUpperCase()} — {exp.year}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${exp.status === 'ready' ? 'bg-[#00dc82]/10 text-[#00dc82]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>{exp.status}</span>
                {exp.fileSize && <span className="text-[9px] text-white/15">{exp.fileSize}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
