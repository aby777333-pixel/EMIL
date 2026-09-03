'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone, Watch, Volume2, Fingerprint, Bell,
  Vibrate, Moon, Mic, Wifi, WifiOff, Zap, Shield,
  Brain, Sun, LayoutGrid, Radio, Eye, Clock,
  Settings, ChevronRight, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import type { MobileTraderConfig, NexusMobileBrief, LiveActivityData, BrokerMobileDashboard, EmergencyControl } from '@/types/raptor-app';
import { pnlColor, formatCurrencyCompact } from '@/lib/utils/format';

function FeatureToggle({ label, icon, enabled, description }: { label: string; icon: React.ReactNode; enabled: boolean; description: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <div className={`p-1.5 rounded-lg ${enabled ? 'bg-[#00dc82]/10' : 'bg-white/5'}`}>
        <span className={enabled ? 'text-[#00dc82]' : 'text-white/15'}>{icon}</span>
      </div>
      <div className="flex-1">
        <span className="text-xs text-white/70">{label}</span>
        <p className="text-[9px] text-white/20">{description}</p>
      </div>
      <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${enabled ? 'bg-[#00dc82] justify-end' : 'bg-white/10 justify-start'}`}>
        <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
      </div>
    </div>
  );
}

interface RaptorAppDashboardProps {
  traderConfig: MobileTraderConfig;
  liveActivity: LiveActivityData | null;
  morningBrief: NexusMobileBrief | null;
  brokerDashboard: BrokerMobileDashboard | null;
  emergencyControls: EmergencyControl[];
}

export function RaptorAppDashboard({ traderConfig, liveActivity, morningBrief, brokerDashboard, emergencyControls }: RaptorAppDashboardProps) {
  const [tab, setTab] = useState<'trader' | 'broker' | 'nexus_mobile'>('trader');

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'trader', label: 'Trader App Config', icon: <Smartphone className="h-3.5 w-3.5" /> },
          { key: 'nexus_mobile', label: 'NEXUS Mobile', icon: <Brain className="h-3.5 w-3.5" /> },
          { key: 'broker', label: 'Broker App', icon: <Shield className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Trader App Config */}
      {tab === 'trader' && (
        <div className="grid grid-cols-12 gap-5">
          {/* Feature Toggles */}
          <div className="col-span-7 space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <h4 className="text-xs font-semibold text-white">Mobile-Exclusive Features</h4>
              </div>
              <FeatureToggle label="NEXUS Voice" icon={<Mic className="h-3.5 w-3.5" />} enabled={traderConfig.nexusVoiceEnabled} description="Speak to NEXUS — voice-in, voice-out trading companion" />
              <FeatureToggle label="Biometric for Orders" icon={<Fingerprint className="h-3.5 w-3.5" />} enabled={traderConfig.biometricForOrders} description="Require Face ID / Fingerprint before placing orders" />
              <FeatureToggle label="iOS Live Activities" icon={<Radio className="h-3.5 w-3.5" />} enabled={traderConfig.liveActivitiesEnabled} description="P&L in Dynamic Island and Lock Screen" />
              <FeatureToggle label="Home Screen Widgets" icon={<LayoutGrid className="h-3.5 w-3.5" />} enabled={traderConfig.homeScreenWidgets.length > 0} description="Account P&L, watchlist, NEXUS signals on home screen" />
              <FeatureToggle label="Apple Watch / WearOS" icon={<Watch className="h-3.5 w-3.5" />} enabled={traderConfig.watchAppEnabled} description="P&L, alerts, NEXUS messages, order confirmation on wrist" />
              <FeatureToggle label="Shake to NEXUS" icon={<Vibrate className="h-3.5 w-3.5" />} enabled={traderConfig.shakeToNexus} description="Shake your phone to instantly open NEXUS" />
              <FeatureToggle label="Offline Mode" icon={<WifiOff className="h-3.5 w-3.5" />} enabled={traderConfig.offlineMode} description="View cached positions and set alerts while offline" />
              <FeatureToggle label="Push Trading" icon={<Bell className="h-3.5 w-3.5" />} enabled={traderConfig.pushTradingEnabled} description="Auto-execute at market when alert triggers (advanced)" />
              <FeatureToggle label="Dark Mode (Forced)" icon={<Moon className="h-3.5 w-3.5" />} enabled={traderConfig.darkModeForced} description="Brand standard — always dark, no light option" />
              <FeatureToggle label="Crisis Mode Push" icon={<AlertTriangle className="h-3.5 w-3.5" />} enabled={traderConfig.crisisModePush} description="NEXUS proactively reaches out on large losses" />
            </div>
          </div>

          {/* Phone Preview + Live Activity */}
          <div className="col-span-5 space-y-4">
            {/* Live Activity Preview */}
            {liveActivity && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-2"><Radio className="h-3.5 w-3.5 text-[#00b4ff]" /> Live Activity Preview</h4>
                <div className="bg-[#1c1c1e] rounded-2xl px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-white">{liveActivity.symbol}</span>
                      {liveActivity.direction && (
                        <span className={`text-[7px] px-1 py-0.5 rounded ${liveActivity.direction === 'buy' ? 'bg-[#00dc82]/20 text-[#00dc82]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                          {liveActivity.direction.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] text-white/30 font-mono">{liveActivity.currentPrice.toFixed(5)}</span>
                  </div>
                  <div className={`text-sm font-mono font-bold ${pnlColor(liveActivity.currentPnl)}`}>
                    {liveActivity.currentPnl >= 0 ? '+' : ''}{formatCurrencyCompact(liveActivity.currentPnl)}
                  </div>
                </div>
              </div>
            )}

            {/* Widget Preview */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-2"><LayoutGrid className="h-3.5 w-3.5 text-[#f59e0b]" /> Widget Previews</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#1c1c1e] rounded-2xl p-3">
                  <div className="text-[8px] text-white/30 mb-1">Portfolio P&L</div>
                  <div className="text-lg font-mono font-bold text-[#00dc82]">+$1,247</div>
                  <div className="text-[8px] text-[#00dc82]">+2.3% today</div>
                </div>
                <div className="bg-[#1c1c1e] rounded-2xl p-3">
                  <div className="text-[8px] text-white/30 mb-1">NEXUS Signal</div>
                  <div className="text-[10px] font-mono text-[#00b4ff]">EURUSD BUY</div>
                  <div className="text-[8px] text-white/20">78% confidence</div>
                </div>
              </div>
            </div>

            {/* Watch Preview */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <h4 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-2"><Watch className="h-3.5 w-3.5 text-[#8b5cf6]" /> Watch Complication</h4>
              <div className="w-32 h-32 mx-auto rounded-full bg-[#1c1c1e] border-4 border-white/5 flex flex-col items-center justify-center">
                <div className="text-[8px] text-white/20">RAPTOR</div>
                <div className="text-lg font-mono font-bold text-[#00dc82]">+$1.2K</div>
                <div className="text-[7px] text-white/15">3 open positions</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEXUS Mobile */}
      {tab === 'nexus_mobile' && morningBrief && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="bg-gradient-to-br from-[#8b5cf6]/5 to-[#00b4ff]/5 border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#00b4ff] flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </motion.div>
              <div>
                <h4 className="text-sm font-semibold text-white">{morningBrief.type === 'morning' ? 'Morning Brief' : 'Evening Debrief'}</h4>
                <p className="text-[10px] text-white/25">NEXUS Mobile · Today</p>
              </div>
            </div>

            <p className="text-xs text-white/50 mb-3">{morningBrief.greeting}</p>
            <p className="text-[11px] text-white/40 leading-relaxed mb-4">{morningBrief.summary}</p>

            {morningBrief.keyPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <Zap className="h-3 w-3 text-[#f59e0b] mt-0.5 shrink-0" />
                <p className="text-[11px] text-white/40">{point}</p>
              </div>
            ))}

            {morningBrief.topSignal && (
              <div className="mt-4 px-3 py-2 rounded-lg bg-[#00b4ff]/5 border border-[#00b4ff]/10">
                <div className="text-[9px] text-[#00b4ff] mb-0.5">Top Signal</div>
                <span className="text-xs font-mono text-white">{morningBrief.topSignal.symbol} {morningBrief.topSignal.direction.toUpperCase()}</span>
                <span className="text-[10px] text-white/25 ml-2">{morningBrief.topSignal.confidence}% confidence</span>
              </div>
            )}

            {morningBrief.pnlToday !== null && (
              <div className="mt-3 text-[11px] text-white/30">
                Today: {morningBrief.tradeCount} trades · <span className={pnlColor(morningBrief.pnlToday)}>{morningBrief.pnlToday >= 0 ? '+' : ''}${morningBrief.pnlToday.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Voice Mode', desc: 'Hands-free NEXUS', icon: <Mic className="h-4 w-4" />, color: '#8b5cf6' },
              { label: 'Morning Brief', desc: 'Daily at your time', icon: <Sun className="h-4 w-4" />, color: '#f59e0b' },
              { label: 'Crisis Push', desc: 'Proactive support', icon: <AlertTriangle className="h-4 w-4" />, color: '#ef4444' },
            ].map(feat => (
              <div key={feat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center">
                <div className="mx-auto w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${feat.color}10`, color: feat.color }}>{feat.icon}</div>
                <div className="text-xs font-medium text-white">{feat.label}</div>
                <div className="text-[9px] text-white/20">{feat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Broker App */}
      {tab === 'broker' && brokerDashboard && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">Revenue Today</div>
              <div className="text-xl font-mono font-bold text-[#00dc82]">{formatCurrencyCompact(brokerDashboard.revenueToday)}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">Active Clients</div>
              <div className="text-xl font-mono font-bold text-white">{brokerDashboard.clientsActive}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-white/25">Pending WD</div>
              <div className="text-xl font-mono font-bold text-[#f59e0b]">{brokerDashboard.pendingWithdrawals}</div>
            </div>
            <div className={`bg-white/[0.02] border rounded-lg p-3 ${brokerDashboard.marginCallAlerts > 0 ? 'border-[#ef4444]/20' : 'border-white/[0.06]'}`}>
              <div className="text-[10px] text-white/25">Margin Alerts</div>
              <div className="text-xl font-mono font-bold text-[#ef4444]">{brokerDashboard.marginCallAlerts}</div>
            </div>
          </div>

          {/* Emergency Controls */}
          <div className="bg-white/[0.02] border border-[#ef4444]/10 rounded-xl p-5">
            <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-[#ef4444]" /> Emergency Controls</h4>
            <div className="space-y-2">
              {emergencyControls.map(ctrl => (
                <div key={ctrl.type} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className={`w-2 h-2 rounded-full ${ctrl.isActive ? 'bg-[#ef4444] animate-pulse' : 'bg-white/10'}`} />
                  <span className="text-xs text-white/50 flex-1 capitalize">{ctrl.type.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-white/20">{ctrl.target}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${ctrl.isActive ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-white/5 text-white/20'}`}>
                    {ctrl.isActive ? 'ACTIVE' : 'Ready'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><Brain className="h-4 w-4 text-[#8b5cf6]" /><span className="text-xs font-medium text-white">NEXUS INSIGHT</span></div>
            <p className="text-[11px] text-white/40">{brokerDashboard.nexusInsightPriority}</p>
          </div>
        </div>
      )}
    </div>
  );
}
