'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone, Apple, PlayCircle, Upload, CheckCircle2,
  Clock, XCircle, Settings, Eye, Palette, Shield,
  Bell, Watch, Fingerprint, Wifi, WifiOff, Vibrate,
  Link2, LayoutGrid, ChevronRight, Rocket, RefreshCw,
} from 'lucide-react';
import type { MobileAppConfig, AppStoreSubmission, MobileFeatureFlag } from '@/types/mobile';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#6b7280', icon: <Settings className="h-3 w-3" /> },
  building: { label: 'Building', color: '#00b4ff', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  testing: { label: 'Testing', color: '#8b5cf6', icon: <Eye className="h-3 w-3" /> },
  submitted: { label: 'In Review', color: '#f59e0b', icon: <Clock className="h-3 w-3" /> },
  published: { label: 'Published', color: '#00dc82', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: '#ef4444', icon: <XCircle className="h-3 w-3" /> },
};

const DEFAULT_FEATURES: MobileFeatureFlag[] = [
  { key: 'chart', label: 'TradingView Charts', enabled: true, category: 'trading' },
  { key: 'order_placement', label: 'Order Placement', enabled: true, category: 'trading' },
  { key: 'position_mgmt', label: 'Position Management', enabled: true, category: 'trading' },
  { key: 'watchlist', label: 'Live Watchlist', enabled: true, category: 'trading' },
  { key: 'copy_trading', label: 'Copy Trading', enabled: true, category: 'social' },
  { key: 'social_feed', label: 'Social Feed', enabled: true, category: 'social' },
  { key: 'deposit', label: 'Deposits', enabled: true, category: 'finance' },
  { key: 'withdrawal', label: 'Withdrawals', enabled: true, category: 'finance' },
  { key: 'price_alerts', label: 'Price Alerts', enabled: true, category: 'alerts' },
  { key: 'smart_alerts', label: 'Smart Alerts', enabled: true, category: 'alerts' },
  { key: 'academy', label: 'Education Hub', enabled: true, category: 'education' },
  { key: 'ai_copilot', label: 'AI Copilot', enabled: true, category: 'ai' },
  { key: 'prop_challenges', label: 'Prop Challenges', enabled: true, category: 'trading' },
  { key: 'pamm', label: 'PAMM Investing', enabled: true, category: 'finance' },
];

function PhoneMockup({ config, platform }: { config: MobileAppConfig; platform: 'ios' | 'android' }) {
  return (
    <div className="relative mx-auto" style={{ width: 220 }}>
      {/* Phone Frame */}
      <div className="rounded-[28px] border-2 border-white/10 bg-[#0a0c10] overflow-hidden shadow-2xl">
        {/* Notch / Dynamic Island */}
        {platform === 'ios' && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-20 h-5 bg-black rounded-full" />
          </div>
        )}
        {platform === 'android' && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-3 h-3 bg-white/5 rounded-full" />
          </div>
        )}

        {/* Status Bar */}
        <div className="flex items-center justify-between px-5 py-1 text-[8px] text-white/40">
          <span>9:41</span>
          <div className="flex gap-1">
            <Wifi className="h-2.5 w-2.5" />
            <span>100%</span>
          </div>
        </div>

        {/* App Content Preview */}
        <div className="px-3 pb-4 space-y-2" style={{ minHeight: 380 }}>
          {/* App Header */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: config.primaryColor }}>R</div>
              <span className="text-[10px] font-semibold text-white">{config.appName}</span>
            </div>
            <Bell className="h-3 w-3 text-white/30" />
          </div>

          {/* Balance Card */}
          <div className="rounded-xl p-3" style={{ backgroundColor: `${config.primaryColor}10`, border: `1px solid ${config.primaryColor}20` }}>
            <div className="text-[8px] text-white/30">Total Equity</div>
            <div className="text-lg font-mono font-bold text-white">$15,430.20</div>
            <div className="flex items-center gap-1 text-[8px]" style={{ color: config.accentColor }}>+$342.80 (+2.27%)</div>
          </div>

          {/* Quick Trade Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="py-2 rounded-lg text-center text-[9px] font-medium text-white" style={{ backgroundColor: config.accentColor }}>BUY</div>
            <div className="py-2 rounded-lg text-center text-[9px] font-medium text-white bg-[#ef4444]">SELL</div>
          </div>

          {/* Watchlist */}
          <div className="space-y-1">
            {['EURUSD', 'XAUUSD', 'BTCUSD'].map(sym => (
              <div key={sym} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.03]">
                <span className="text-[9px] font-mono font-bold text-white/70">{sym}</span>
                <div className="text-right">
                  <div className="text-[9px] font-mono text-white/50">1.0852</div>
                  <div className="text-[7px]" style={{ color: config.accentColor }}>+0.12%</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Nav */}
          <div className="flex justify-around pt-2 border-t border-white/[0.04]">
            {['Trade', 'Chart', 'Portfolio', 'Alerts', 'More'].map(tab => (
              <div key={tab} className="text-center">
                <div className="w-4 h-4 mx-auto rounded bg-white/5 mb-0.5" />
                <span className="text-[7px] text-white/20">{tab}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MobileAppManagerProps {
  configs: MobileAppConfig[];
  submissions: AppStoreSubmission[];
  onSave: (config: Partial<MobileAppConfig>) => void;
  onBuild: (platform: 'ios' | 'android') => void;
  onSubmit: (platform: 'ios' | 'android') => void;
}

export function MobileAppManager({ configs, submissions, onSave, onBuild, onSubmit }: MobileAppManagerProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android'>('ios');
  const [tab, setTab] = useState<'preview' | 'config' | 'features' | 'submissions'>('preview');

  const config = configs.find(c => c.platform === selectedPlatform) ?? {
    id: '', brokerId: '', platform: selectedPlatform, appName: 'RAPTOR Trading',
    bundleId: 'com.raptor.trading', version: '1.0.0', buildNumber: 1,
    status: 'draft' as const, storeUrl: null, iconUrl: null, splashUrl: null,
    primaryColor: '#00b4ff', accentColor: '#00dc82', biometricEnabled: true,
    pinEnabled: true, autoLockMinutes: 5, offlineModeEnabled: true,
    widgetsEnabled: true, watchAppEnabled: false, hapticFeedback: true,
    deepLinksEnabled: true, appClipsEnabled: false, features: DEFAULT_FEATURES,
    lastBuildAt: null, publishedAt: null, createdAt: new Date().toISOString(),
  };

  const stat = STATUS_CONFIG[config.status];
  const platformSubmissions = submissions.filter(s => s.platform === selectedPlatform);

  return (
    <div className="space-y-5">
      {/* Platform Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {([
            { key: 'ios', label: 'iOS', icon: <Apple className="h-4 w-4" /> },
            { key: 'android', label: 'Android', icon: <PlayCircle className="h-4 w-4" /> },
          ] as const).map(p => (
            <button key={p.key} onClick={() => setSelectedPlatform(p.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                selectedPlatform === p.key
                  ? 'border-[#00b4ff]/30 bg-[#00b4ff]/5 text-white'
                  : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60'
              }`}>
              {p.icon}
              <span className="text-sm font-medium">{p.label}</span>
              <span className="flex items-center gap-1 text-[10px] ml-2" style={{ color: stat.color }}>
                {stat.icon} {stat.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => onBuild(selectedPlatform)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#8b5cf6]/80 text-white text-xs font-medium transition-colors">
            <Rocket className="h-3 w-3" /> Build
          </button>
          <button onClick={() => onSubmit(selectedPlatform)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00dc82] hover:bg-[#00dc82]/80 text-white text-xs font-medium transition-colors">
            <Upload className="h-3 w-3" /> Submit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {(['preview', 'config', 'features', 'submissions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t}</button>
        ))}
      </div>

      {/* Preview */}
      {tab === 'preview' && (
        <div className="flex justify-center py-8">
          <PhoneMockup config={config} platform={selectedPlatform} />
        </div>
      )}

      {/* Config */}
      {tab === 'config' && (
        <div className="grid grid-cols-2 gap-5">
          {/* App Identity */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-white">
              <Smartphone className="h-4 w-4 text-[#00b4ff]" /> App Identity
            </h4>
            {[
              { label: 'App Name', value: config.appName, key: 'appName' },
              { label: 'Bundle ID', value: config.bundleId, key: 'bundleId' },
              { label: 'Version', value: config.version, key: 'version' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] text-white/30 mb-1 block">{f.label}</label>
                <input type="text" defaultValue={f.value}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#00b4ff] focus:outline-none" />
              </div>
            ))}
          </div>

          {/* Colors */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-white">
              <Palette className="h-4 w-4 text-[#8b5cf6]" /> Colors
            </h4>
            {[
              { label: 'Primary Color', value: config.primaryColor, key: 'primaryColor' },
              { label: 'Accent Color', value: config.accentColor, key: 'accentColor' },
            ].map(f => (
              <div key={f.key} className="flex items-center gap-2">
                <input type="color" defaultValue={f.value} className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 block">{f.label}</label>
                  <input type="text" defaultValue={f.value}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white/60 focus:outline-none" />
                </div>
              </div>
            ))}
          </div>

          {/* Security */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-white">
              <Shield className="h-4 w-4 text-[#00dc82]" /> Security
            </h4>
            {[
              { label: 'Biometric Auth (Face ID / Fingerprint)', checked: config.biometricEnabled, icon: <Fingerprint className="h-3 w-3" /> },
              { label: 'PIN Fallback', checked: config.pinEnabled, icon: <Shield className="h-3 w-3" /> },
              { label: 'Offline Mode', checked: config.offlineModeEnabled, icon: <WifiOff className="h-3 w-3" /> },
            ].map(f => (
              <label key={f.label} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked={f.checked} className="accent-[#00dc82] rounded" />
                <span className="text-white/20">{f.icon}</span>
                <span className="text-xs text-white/60">{f.label}</span>
              </label>
            ))}
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">Auto-Lock (minutes)</label>
              <input type="number" defaultValue={config.autoLockMinutes} min={1} max={60}
                className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none" />
            </div>
          </div>

          {/* Mobile-Exclusive */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-white">
              <LayoutGrid className="h-4 w-4 text-[#f59e0b]" /> Mobile Features
            </h4>
            {[
              { label: 'Home Screen Widgets', checked: config.widgetsEnabled, icon: <LayoutGrid className="h-3 w-3" /> },
              { label: selectedPlatform === 'ios' ? 'Apple Watch App' : 'WearOS App', checked: config.watchAppEnabled, icon: <Watch className="h-3 w-3" /> },
              { label: 'Haptic Feedback', checked: config.hapticFeedback, icon: <Vibrate className="h-3 w-3" /> },
              { label: 'Deep Links', checked: config.deepLinksEnabled, icon: <Link2 className="h-3 w-3" /> },
              { label: selectedPlatform === 'ios' ? 'App Clips' : 'Instant Apps', checked: config.appClipsEnabled, icon: <Rocket className="h-3 w-3" /> },
            ].map(f => (
              <label key={f.label} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked={f.checked} className="accent-[#f59e0b] rounded" />
                <span className="text-white/20">{f.icon}</span>
                <span className="text-xs text-white/60">{f.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {tab === 'features' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <h4 className="text-xs font-medium text-white/50">Feature Flags — toggle which features are available in the mobile app</h4>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {(config.features.length > 0 ? config.features : DEFAULT_FEATURES).map(feat => (
              <div key={feat.key} className="px-5 py-2.5 flex items-center gap-3">
                <input type="checkbox" defaultChecked={feat.enabled} className="accent-[#00b4ff] rounded" />
                <span className="text-xs text-white/70 flex-1">{feat.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/20 capitalize">{feat.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions */}
      {tab === 'submissions' && (
        <div className="space-y-3">
          {platformSubmissions.length === 0 ? (
            <div className="text-center py-16">
              <Upload className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/20">No submissions yet for {selectedPlatform === 'ios' ? 'App Store' : 'Google Play'}</p>
            </div>
          ) : platformSubmissions.map(sub => {
            const subStat = STATUS_CONFIG[sub.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
            return (
              <div key={sub.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-white">v{sub.version} (Build {sub.buildNumber})</span>
                    <span className="flex items-center gap-1 text-[10px] ml-3" style={{ color: subStat.color }}>
                      {subStat.icon} {subStat.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/15">
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Not submitted'}
                  </span>
                </div>
                <p className="text-[11px] text-white/30">{sub.releaseNotes}</p>
                {sub.rejectionReason && (
                  <div className="mt-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/20">
                    <p className="text-[11px] text-red-400">{sub.rejectionReason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
