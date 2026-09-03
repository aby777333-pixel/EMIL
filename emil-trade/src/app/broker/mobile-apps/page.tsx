'use client';

import { useState } from 'react';
import { MobileAppManager } from '@/components/mobile/MobileAppManager';
import type { MobileAppConfig, AppStoreSubmission } from '@/types/mobile';

const MOCK_CONFIGS: MobileAppConfig[] = [
  {
    id: 'mc1', brokerId: 'b1', platform: 'ios', appName: 'RAPTOR Trading',
    bundleId: 'com.raptor.trading', version: '2.1.0', buildNumber: 47,
    status: 'published', storeUrl: null, iconUrl: null, splashUrl: null,
    primaryColor: '#00b4ff', accentColor: '#00dc82',
    biometricEnabled: true, pinEnabled: true, autoLockMinutes: 5,
    offlineModeEnabled: true, widgetsEnabled: true, watchAppEnabled: true,
    hapticFeedback: true, deepLinksEnabled: true, appClipsEnabled: true,
    features: [],
    lastBuildAt: '2026-03-28T10:00:00Z', publishedAt: '2026-03-30T14:00:00Z',
    createdAt: '2025-06-01',
  },
  {
    id: 'mc2', brokerId: 'b1', platform: 'android', appName: 'RAPTOR Trading',
    bundleId: 'com.raptor.trading', version: '2.1.0', buildNumber: 47,
    status: 'published', storeUrl: null, iconUrl: null, splashUrl: null,
    primaryColor: '#00b4ff', accentColor: '#00dc82',
    biometricEnabled: true, pinEnabled: true, autoLockMinutes: 5,
    offlineModeEnabled: true, widgetsEnabled: true, watchAppEnabled: false,
    hapticFeedback: true, deepLinksEnabled: true, appClipsEnabled: false,
    features: [],
    lastBuildAt: '2026-03-28T10:00:00Z', publishedAt: '2026-03-30T16:00:00Z',
    createdAt: '2025-06-01',
  },
];

const MOCK_SUBMISSIONS: AppStoreSubmission[] = [
  { id: 'sub1', platform: 'ios', version: '2.1.0', buildNumber: 47, status: 'published', rejectionReason: null, submittedAt: '2026-03-28T12:00:00Z', reviewedAt: '2026-03-30T10:00:00Z', publishedAt: '2026-03-30T14:00:00Z', releaseNotes: 'Added Apple Watch app, improved chart performance, biometric login enhancements', screenshots: [] },
  { id: 'sub2', platform: 'ios', version: '2.0.0', buildNumber: 38, status: 'published', rejectionReason: null, submittedAt: '2026-02-15T12:00:00Z', reviewedAt: '2026-02-17T10:00:00Z', publishedAt: '2026-02-17T14:00:00Z', releaseNotes: 'Major update: copy trading, prop challenges, AI copilot, social feed', screenshots: [] },
  { id: 'sub3', platform: 'android', version: '2.1.0', buildNumber: 47, status: 'published', rejectionReason: null, submittedAt: '2026-03-28T12:00:00Z', reviewedAt: '2026-03-30T14:00:00Z', publishedAt: '2026-03-30T16:00:00Z', releaseNotes: 'Home screen widgets, improved chart performance, biometric login enhancements', screenshots: [] },
];

export default function MobileAppsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Mobile App Manager</h1>
        <p className="text-xs text-white/30">Configure, build, and publish your branded iOS & Android trading apps</p>
      </div>
      <MobileAppManager
        configs={MOCK_CONFIGS}
        submissions={MOCK_SUBMISSIONS}
        onSave={(config) => console.log('Save config', config)}
        onBuild={(platform) => console.log('Build', platform)}
        onSubmit={(platform) => console.log('Submit', platform)}
      />
    </div>
  );
}
