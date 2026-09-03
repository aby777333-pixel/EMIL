'use client';

import { Settings } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white/90">Settings</h2>

      <div className="bg-[#111118] border border-white/[0.06] rounded-lg p-8 flex flex-col items-center justify-center gap-4">
        <Settings size={32} className="text-white/10" />
        <p className="text-sm text-white/30">Broker settings and configuration coming soon.</p>
      </div>
    </div>
  );
}
