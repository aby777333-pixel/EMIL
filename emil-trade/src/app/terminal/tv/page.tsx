'use client';

// Standalone LIVE TV window (multi-monitor). Same login as the terminal.

import TopBar from '@/components/layout/TopBar';
import TermsGateModal from '@/components/trading/TermsGateModal';
import LiveTvPanel from '@/components/trading/media/LiveTvPanel';

export default function TvWindow() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <div className="shrink-0 border-b border-[var(--border)]">
        <TopBar />
      </div>
      <div className="min-h-0 flex-1">
        <LiveTvPanel standalone />
      </div>
      <TermsGateModal />
    </div>
  );
}
