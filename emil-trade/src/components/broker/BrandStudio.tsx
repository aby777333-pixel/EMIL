'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Palette, Type, Globe, Upload, Eye, Monitor,
  Smartphone, Moon, Sun, Save, Check,
} from 'lucide-react';
import type { BrandConfig } from '@/types/broker';

interface BrandStudioProps {
  config: BrandConfig;
  onSave: (config: Partial<BrandConfig>) => void;
  isSaving: boolean;
}

export function BrandStudio({ config, onSave, isSaving }: BrandStudioProps) {
  const [draft, setDraft] = useState(config);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  const updateDraft = (updates: Partial<BrandConfig>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    onSave(draft);
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Controls */}
      <div className="col-span-5 space-y-5">
        {/* Colors */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
            <Palette className="h-4 w-4 text-[#00b4ff]" />
            Color Palette
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: 'primaryColor', label: 'Primary' },
              { key: 'secondaryColor', label: 'Secondary' },
              { key: 'accentColor', label: 'Accent' },
              { key: 'bgPrimary', label: 'BG Primary' },
              { key: 'bgSecondary', label: 'BG Secondary' },
            ] as const).map(({ key, label }) => (
              <div key={key}>
                <label className="text-[10px] text-white/30 mb-1 block">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft[key]}
                    onChange={e => updateDraft({ [key]: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft[key]}
                    onChange={e => updateDraft({ [key]: e.target.value })}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white/60 focus:border-[#00b4ff] focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
            <Type className="h-4 w-4 text-[#8b5cf6]" />
            Typography
          </h3>
          <div className="space-y-3">
            {([
              { key: 'fontHeading', label: 'Heading Font' },
              { key: 'fontBody', label: 'Body Font' },
              { key: 'fontMono', label: 'Monospace Font' },
            ] as const).map(({ key, label }) => (
              <div key={key}>
                <label className="text-[10px] text-white/30 mb-1 block">{label}</label>
                <select
                  value={draft[key]}
                  onChange={e => updateDraft({ [key]: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/60 focus:outline-none"
                >
                  {['Inter', 'Geist', 'TT Norms Pro', 'Poppins', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
                    'Source Sans Pro', 'Nunito', 'DM Sans', 'Space Grotesk', 'Plus Jakarta Sans',
                  ].map(f => <option key={f} value={f}>{f}</option>)}
                  {key === 'fontMono' && ['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono']
                    .map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Domain & SMTP */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
            <Globe className="h-4 w-4 text-[#00dc82]" />
            Domain & Email
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">Custom Domain</label>
              <input
                type="text"
                placeholder="trading.mybrokerage.com"
                value={draft.customDomain ?? ''}
                onChange={e => updateDraft({ customDomain: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/60 placeholder:text-white/15 focus:border-[#00b4ff] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">SMTP From Email</label>
              <input
                type="email"
                placeholder="no-reply@mybrokerage.com"
                value={draft.smtpFromEmail ?? ''}
                onChange={e => updateDraft({ smtpFromEmail: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/60 placeholder:text-white/15 focus:border-[#00b4ff] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">Meta Title</label>
              <input
                type="text"
                placeholder="My Brokerage — Trade with Confidence"
                value={draft.metaTitle ?? ''}
                onChange={e => updateDraft({ metaTitle: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/60 placeholder:text-white/15 focus:border-[#00b4ff] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 rounded-lg bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Save className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save Brand Config'}
        </button>
      </div>

      {/* Live Preview */}
      <div className="col-span-7">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Eye className="h-4 w-4 text-white/40" />
              Live Preview
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-md ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-white/30'}`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-md ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-white/30'}`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white/60"
              >
                {themeMode === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Preview Frame */}
          <div
            className={`rounded-xl border border-white/[0.06] overflow-hidden transition-all ${
              previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''
            }`}
            style={{ backgroundColor: themeMode === 'dark' ? draft.bgPrimary : '#ffffff' }}
          >
            {/* Preview Header */}
            <div
              className="px-5 py-3 flex items-center justify-between border-b"
              style={{
                backgroundColor: themeMode === 'dark' ? draft.bgSecondary : '#f9fafb',
                borderColor: themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: draft.primaryColor }}>
                  {draft.metaTitle?.charAt(0) ?? 'B'}
                </div>
                <span className="text-sm font-semibold" style={{
                  color: themeMode === 'dark' ? '#ffffff' : '#111827',
                  fontFamily: draft.fontHeading,
                }}>
                  {draft.metaTitle ?? 'Your Brokerage'}
                </span>
              </div>
              <div className="flex gap-2">
                {['Dashboard', 'Trade', 'Portfolio'].map(item => (
                  <span key={item} className="text-[10px] px-2 py-1 rounded" style={{
                    color: themeMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    fontFamily: draft.fontBody,
                  }}>{item}</span>
                ))}
              </div>
            </div>

            {/* Preview Body */}
            <div className="p-5 space-y-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <div className="text-lg font-bold mb-1" style={{
                  color: draft.primaryColor,
                  fontFamily: draft.fontHeading,
                }}>$125,430.00</div>
                <div className="text-[11px]" style={{
                  color: themeMode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                  fontFamily: draft.fontBody,
                }}>Account Balance</div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: draft.secondaryColor }}>
                  Buy
                </button>
                <button className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-[#ef4444]">
                  Sell
                </button>
              </div>
              <div className="text-xs font-mono" style={{
                color: themeMode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                fontFamily: draft.fontMono,
              }}>
                EURUSD 1.08542 / 1.08544
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
