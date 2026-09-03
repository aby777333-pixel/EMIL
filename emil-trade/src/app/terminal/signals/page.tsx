'use client';

import TopBar from '@/components/layout/TopBar';
import SignalDashboard from '@/components/signals/SignalDashboard';
import { usePriceEngine } from '@/hooks/usePriceEngine';

export default function SignalsPage() {
  // Start the price engine so the store has live prices
  usePriceEngine();

  return (
    <div
      className="h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="h-[42px] border-b" style={{ borderColor: 'var(--border)' }}>
        <TopBar />
      </div>
      <div style={{ height: 'calc(100vh - 42px)' }}>
        <SignalDashboard />
      </div>
    </div>
  );
}
