'use client';

// Standalone SCAN & TRADE window (multi-monitor workflow). Opens in its own
// tab, stays behind the same login/middleware as the terminal and shares the
// same account, positions, Shield rules and order gateway — every execution
// lands in the same database the main platform reads, so both stay in sync.
// Until the real LP is connected this window runs the platform feed
// (simulated pricing) like the terminal; once the LP lands, the same wiring
// carries real prices automatically.

import TopBar from '@/components/layout/TopBar';
import BottomDock from '@/components/layout/BottomDock';
import PositionsPanel from '@/components/trading/positions/PositionsPanel';
import AccountBar from '@/components/trading/account-summary/AccountBar';
import TermsGateModal from '@/components/trading/TermsGateModal';
import ScannerPanel from '@/components/trading/scanner/ScannerPanel';
import { usePriceEngine } from '@/hooks/usePriceEngine';

export default function ScanTradeWindow() {
  const { ohlcvBuilder, isLiveData } = usePriceEngine();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <div className="shrink-0 border-b border-[var(--border)]">
        <TopBar />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <ScannerPanel ohlcvBuilder={ohlcvBuilder} isLiveData={isLiveData} standalone onClose={() => window.close()} />
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
