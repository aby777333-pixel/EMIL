'use client';

import { useState } from 'react';
import { Save, Palette, Globe, BarChart3, Bell } from 'lucide-react';

interface SettingsViewProps {
  broker: Record<string, unknown>;
}

export function SettingsView({ broker }: SettingsViewProps) {
  const [name, setName] = useState(String(broker.name ?? ''));
  const [logoUrl, setLogoUrl] = useState(String(broker.logo_url ?? ''));
  const [primaryColor, setPrimaryColor] = useState(String(broker.primary_color ?? '#0091D5'));
  const [domain, setDomain] = useState(String(broker.domain ?? ''));
  const [defaultLeverage, setDefaultLeverage] = useState(String(broker.default_leverage ?? '100'));
  const [defaultSpread, setDefaultSpread] = useState(String(broker.default_spread ?? '1.0'));
  const [marginCallLevel, setMarginCallLevel] = useState(String(broker.margin_call_level ?? '60'));
  const [stopOutLevel, setStopOutLevel] = useState(String(broker.stop_out_level ?? '30'));
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    // Would call Supabase update here
    setTimeout(() => setSaving(false), 1000);
  }

  const sectionClass = 'rounded-xl border border-border bg-elevated p-5 space-y-4';
  const labelClass = 'mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted';
  const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none';

  return (
    <div className="max-w-3xl space-y-6">
      {/* Branding */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Branding</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Broker Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Logo URL</label>
            <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-border" />
              <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Domain */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Domain Configuration</h3>
        </div>
        <div>
          <label className={labelClass}>Custom Domain</label>
          <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="trading.yourdomain.com" className={inputClass} />
          <p className="mt-1 text-[10px] text-muted">Point your CNAME record to platform.gioraptor.com</p>
        </div>
      </div>

      {/* Default Trading Conditions */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Default Trading Conditions</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Default Leverage</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted">1:</span>
              <input type="number" value={defaultLeverage} onChange={(e) => setDefaultLeverage(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Default Spread (pips)</label>
            <input type="number" step="0.1" value={defaultSpread} onChange={(e) => setDefaultSpread(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Margin Call Level (%)</label>
            <input type="number" value={marginCallLevel} onChange={(e) => setMarginCallLevel(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Stop-Out Level (%)</label>
            <input type="number" value={stopOutLevel} onChange={(e) => setStopOutLevel(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Notification Templates */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Notification Templates</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Welcome Email', desc: 'Sent to new clients upon registration' },
            { label: 'KYC Approved', desc: 'Sent when KYC verification is approved' },
            { label: 'Deposit Confirmed', desc: 'Sent when a deposit is processed' },
            { label: 'Withdrawal Processed', desc: 'Sent when a withdrawal is completed' },
            { label: 'Margin Call Warning', desc: 'Sent when account falls below margin call level' },
          ].map((tmpl) => (
            <div key={tmpl.label} className="flex items-center justify-between rounded-lg bg-surface/50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-foreground">{tmpl.label}</p>
                <p className="text-[10px] text-muted">{tmpl.desc}</p>
              </div>
              <button className="rounded px-2 py-1 text-[10px] text-accent transition-colors hover:bg-accent/10">
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-6 py-2.5 text-xs font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
