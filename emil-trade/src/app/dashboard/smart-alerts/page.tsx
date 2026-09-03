'use client';

import { useState } from 'react';
import { SmartAlerts } from '@/components/trader/SmartAlerts';
import type { SmartAlert } from '@/types/trader';

const MOCK_ALERTS: SmartAlert[] = [
  { id: 'a1', type: 'price', symbol: 'EURUSD', condition: 'above', threshold: '1.0900', delivery: ['in_app', 'push'], isActive: true, triggeredCount: 0, lastTriggered: null, createdAt: '2026-04-01' },
  { id: 'a2', type: 'indicator', symbol: 'XAUUSD', condition: 'RSI below', threshold: '30', delivery: ['in_app', 'email', 'telegram'], isActive: true, triggeredCount: 3, lastTriggered: '2026-04-02T14:30:00Z', createdAt: '2026-03-15' },
  { id: 'a3', type: 'position', symbol: null, condition: 'P&L exceeds', threshold: '$500', delivery: ['in_app', 'push', 'sms'], isActive: true, triggeredCount: 1, lastTriggered: '2026-04-01T09:00:00Z', createdAt: '2026-03-20' },
  { id: 'a4', type: 'calendar', symbol: null, condition: 'High impact event in', threshold: '15 minutes', delivery: ['in_app', 'push'], isActive: false, triggeredCount: 12, lastTriggered: '2026-04-03T13:15:00Z', createdAt: '2026-02-10' },
  { id: 'a5', type: 'pattern', symbol: 'GBPUSD', condition: 'Head & Shoulders detected', threshold: 'H4', delivery: ['in_app', 'email'], isActive: true, triggeredCount: 0, lastTriggered: null, createdAt: '2026-04-03' },
];

export default function SmartAlertsPage() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Smart Alerts</h1>
        <p className="text-xs text-white/30">Price, indicator, pattern, and calendar alerts delivered everywhere</p>
      </div>
      <SmartAlerts
        alerts={alerts}
        onToggle={(id, active) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: active } : a))}
        onDelete={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
        onCreate={(newAlert) => setAlerts(prev => [...prev, { ...newAlert, id: crypto.randomUUID(), triggeredCount: 0, lastTriggered: null, createdAt: new Date().toISOString() }])}
      />
    </div>
  );
}
