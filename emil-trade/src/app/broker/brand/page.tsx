'use client';

import { useState } from 'react';
import { BrandStudio } from '@/components/broker/BrandStudio';
import type { BrandConfig } from '@/types/broker';

const DEFAULT_BRAND: BrandConfig = {
  id: '1', brokerId: 'b1', logoUrl: null, faviconUrl: null,
  primaryColor: '#00b4ff', secondaryColor: '#00dc82', accentColor: '#f59e0b',
  bgPrimary: '#0a0c10', bgSecondary: '#0d1117',
  fontHeading: 'Inter', fontBody: 'Inter', fontMono: 'JetBrains Mono',
  customCss: null, customDomain: null,
  smtpHost: null, smtpFromEmail: null, smtpFromName: null,
  metaTitle: 'My Brokerage', metaDescription: null,
};

export default function BrandPage() {
  const [config, setConfig] = useState(DEFAULT_BRAND);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (updates: Partial<BrandConfig>) => {
    setIsSaving(true);
    setConfig(prev => ({ ...prev, ...updates }));
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Brand Studio</h1>
        <p className="text-xs text-white/30">Customize your white-label platform identity</p>
      </div>
      <BrandStudio config={config} onSave={handleSave} isSaving={isSaving} />
    </div>
  );
}
