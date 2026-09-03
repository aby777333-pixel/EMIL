'use client';

// Standalone GLOBAL MARKET COMMAND CENTER window (multi-monitor workflow).
// Same login/middleware, same account and order gateway as the terminal.
// Runs the platform feed (simulated pricing) until the real LP is connected;
// the same wiring then carries real prices automatically.

import TopBar from '@/components/layout/TopBar';
import BottomDock from '@/components/layout/BottomDock';
import PositionsPanel from '@/components/trading/positions/PositionsPanel';
import AccountBar from '@/components/trading/account-summary/AccountBar';
import TermsGateModal from '@/components/trading/TermsGateModal';
import WorldCommandCenter from '@/components/trading/world/WorldCommandCenter';
import { usePriceEngine } from '@/hooks/usePriceEngine';

export default function WorldCommandWindow() {
  const { ohlcvBuilder, isLiveData } = usePriceEngine();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <div className="shrink-0 border-b border-[var(--border)]">
        <TopBar />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <WorldCommandCenter ohlcvBuilder={ohlcvBuilder} isLiveData={isLiveData} />
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
