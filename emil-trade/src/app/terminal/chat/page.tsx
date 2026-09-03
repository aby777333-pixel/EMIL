'use client';

// Standalone LIVE CHAT window (multi-monitor). Same login as the terminal;
// $SYMBOL clicks still drive the shared trading store in this tab.

import TopBar from '@/components/layout/TopBar';
import TermsGateModal from '@/components/trading/TermsGateModal';
import LiveChatPanel from '@/components/trading/media/LiveChatPanel';

export default function ChatWindow() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <div className="shrink-0 border-b border-[var(--border)]">
        <TopBar />
      </div>
      <div className="min-h-0 flex-1">
        <LiveChatPanel standalone />
      </div>
      <TermsGateModal />
    </div>
  );
}
