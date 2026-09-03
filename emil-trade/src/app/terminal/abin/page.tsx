'use client';

// Standalone ABIN window — Advanced Brokerage Intelligence Network.
// Same login/middleware, same account and order gateway as the terminal.
// Runs the platform feed (simulated pricing) until the real LP connects;
// the same wiring then carries real prices automatically.

import TopBar from '@/components/layout/TopBar';
import BottomDock from '@/components/layout/BottomDock';
import PositionsPanel from '@/components/trading/positions/PositionsPanel';
import AccountBar from '@/components/trading/account-summary/AccountBar';
import TermsGateModal from '@/components/trading/TermsGateModal';
import AbinTerminal from '@/components/abin/AbinTerminal';
import { usePriceEngine } from '@/hooks/usePriceEngine';

export default function AbinWindow() {
  const { ohlcvBuilder, isLiveData } = usePriceEngine();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <div className="shrink-0 border-b border-[var(--border)]">
        <TopBar />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <AbinTerminal ohlcvBuilder={ohlcvBuilder} isLiveData={isLiveData} />
      </div>

      {/* Bottom monitoring panel — drag the grip to resize */}
      <BottomDock>
        <PositionsPanel />
      </BottomDock>
      <div className="shrink-0 border-t border-[var(--border)]">
        <AccountBar />
      </div>

      <TermsGateModal />
    </div>
  );
}
