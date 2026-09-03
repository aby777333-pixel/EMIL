'use client';

// Standalone HEDGE & TRADE window (multi-monitor workflow). Opens in its own
// tab behind the same login as the terminal; shares the same account,
// positions, hedge groups, Shield rules and order gateway — hedges placed
// here appear in the main platform and vice versa. Runs the platform feed
// (simulated pricing) until the real LP is connected; the same wiring then
// carries real prices automatically.

import TopBar from '@/components/layout/TopBar';
import BottomDock from '@/components/layout/BottomDock';
import PositionsPanel from '@/components/trading/positions/PositionsPanel';
import AccountBar from '@/components/trading/account-summary/AccountBar';
import TermsGateModal from '@/components/trading/TermsGateModal';
import HedgePanel from '@/components/trading/hedge/HedgePanel';
import { usePriceEngine } from '@/hooks/usePriceEngine';

export default function HedgeTradeWindow() {
  const { ohlcvBuilder } = usePriceEngine();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <div className="shrink-0 border-b border-[var(--border)]">
        <TopBar />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <HedgePanel ohlcvBuilder={ohlcvBuilder} standalone onClose={() => window.close()} />
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
