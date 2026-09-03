'use client';

// Standalone Trader Widget Suite window (multi-monitor workflow). Opens
// in its own tab behind the same login as the terminal; shares the same
// account, positions, prices and order gateway — trades placed here
// appear in the main platform and vice versa. Runs the platform feed
// (simulated pricing) until the real LP is connected.
// NOTE: distinct from /terminal/widgets (the TradingView Market Widgets
// page in the Tools menu) — this is the actionable widget board.

import TopBar from '@/components/layout/TopBar';
import BottomDock from '@/components/layout/BottomDock';
import PositionsPanel from '@/components/trading/positions/PositionsPanel';
import AccountBar from '@/components/trading/account-summary/AccountBar';
import TermsGateModal from '@/components/trading/TermsGateModal';
import WidgetHub from '@/components/trading/widgets/WidgetHub';
import { usePriceEngine } from '@/hooks/usePriceEngine';

export default function WidgetSuiteWindow() {
  const { ohlcvBuilder } = usePriceEngine();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <div className="shrink-0 border-b border-[var(--border)]">
        <TopBar />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
        <WidgetHub open onClose={() => window.close()} ohlcvBuilder={ohlcvBuilder} standalone />
      </div>

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
