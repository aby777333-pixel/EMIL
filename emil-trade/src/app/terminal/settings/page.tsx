'use client';

import { useEffect, useRef, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import {
  User, Shield, Bell, Palette, Globe, Key, FileText, Upload, Download, DatabaseBackup,
} from 'lucide-react';
import {
  buildBackup, applyBackup, summarizeBackup, type SettingsBackup, type BackupGroup,
} from '@/lib/trading/settings-backup';
import {
  loadNotifyPrefs, saveNotifyPrefs, ensureNotifyPermission, notifyAll,
  NOTIFY_DEFAULTS, SEVERITY_LABEL, SEVERITY_ORDER, type NotifyPrefs, type NotifyChannel,
} from '@/lib/nexus/notify-prefs';
import type { NexusAlertSeverity } from '@/lib/nexus/alert-engine';

type Tab = 'profile' | 'security' | 'notifications' | 'data' | 'kyc';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: <User size={14} /> },
    { id: 'security' as Tab, label: 'Security', icon: <Shield size={14} /> },
    { id: 'notifications' as Tab, label: 'Notifications', icon: <Bell size={14} /> },
    { id: 'data' as Tab, label: 'Data & Backup', icon: <DatabaseBackup size={14} /> },
    { id: 'kyc' as Tab, label: 'KYC Verification', icon: <FileText size={14} /> },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopBar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-xl font-bold mb-6">Settings</h1>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-all"
                style={{
                  color: tab === t.id ? '#0091D5' : 'var(--text-secondary)',
                  borderBottom: tab === t.id ? '2px solid #0091D5' : '2px solid transparent',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {tab === 'profile' && <ProfileTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'data' && <DataBackupTab />}
          {tab === 'kyc' && <KYCTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  return (
    <div className="space-y-4">
      <SettingCard title="Personal Information">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="First Name" placeholder="John" />
          <InputField label="Last Name" placeholder="Doe" />
          <InputField label="Email" placeholder="john@example.com" type="email" />
          <InputField label="Phone" placeholder="+1 234 567 8901" />
          <InputField label="Country" placeholder="United States" />
          <InputField label="Date of Birth" placeholder="1990-01-01" type="date" />
        </div>
        <button className="mt-4 px-4 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: '#0091D5', color: '#000' }}>
          Save Changes
        </button>
      </SettingCard>
      <SettingCard title="Trading Preferences">
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Default Leverage" options={['1:50', '1:100', '1:200', '1:500']} />
          <SelectField label="Default Lot Size" options={['0.01', '0.1', '0.5', '1.0']} />
          <SelectField label="Chart Type" options={['Candlestick', 'Line', 'Bar', 'Heikin Ashi']} />
          <SelectField label="Timezone" options={['UTC', 'EST', 'GMT', 'IST', 'JST']} />
        </div>
      </SettingCard>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-4">
      <SettingCard title="Change Password">
        <div className="space-y-3 max-w-md">
          <InputField label="Current Password" type="password" placeholder="********" />
          <InputField label="New Password" type="password" placeholder="********" />
          <InputField label="Confirm Password" type="password" placeholder="********" />
        </div>
        <button className="mt-4 px-4 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: '#0091D5', color: '#000' }}>
          Update Password
        </button>
      </SettingCard>
      <SettingCard title="Two-Factor Authentication">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">2FA is not enabled</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Add an extra layer of security to your account</div>
          </div>
          <button className="px-4 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: '#0091D5', color: '#0091D5' }}>
            <Key size={14} className="inline mr-1" /> Enable 2FA
          </button>
        </div>
      </SettingCard>
      <SettingCard title="Active Sessions">
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <div><Globe size={12} className="inline mr-2" />Chrome on Windows — Current session</div>
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: '#00C85320', color: '#00C853' }}>Active</span>
          </div>
        </div>
      </SettingCard>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotifyPrefs>(NOTIFY_DEFAULTS);
  const [perm, setPerm] = useState<string>('default');

  useEffect(() => {
    setPrefs(loadNotifyPrefs());
    try { if (typeof Notification !== 'undefined') setPerm(Notification.permission); } catch { /* ignore */ }
  }, []);

  const update = (patch: Partial<NotifyPrefs>) => setPrefs((p) => { const n = { ...p, ...patch }; saveNotifyPrefs(n); return n; });
  const toggleChannel = (c: NotifyChannel) => setPrefs((p) => {
    const n = { ...p, channels: { ...p.channels, [c]: !p.channels[c] } };
    saveNotifyPrefs(n);
    if (c === 'browser' && n.channels.browser) { ensureNotifyPermission(); try { if (typeof Notification !== 'undefined') setTimeout(() => setPerm(Notification.permission), 400); } catch { /* ignore */ } }
    return n;
  });
  const updateQuiet = (patch: Partial<NotifyPrefs['quietHours']>) => setPrefs((p) => { const n = { ...p, quietHours: { ...p.quietHours, ...patch } }; saveNotifyPrefs(n); return n; });
  const test = () => { ensureNotifyPermission(); notifyAll('warning', 'RAPTOR test notification', 'This is how alerts will reach you.'); try { if (typeof Notification !== 'undefined') setTimeout(() => setPerm(Notification.permission), 400); } catch { /* ignore */ } };

  const CHANNELS: { key: NotifyChannel; label: string; desc: string }[] = [
    { key: 'browser', label: 'Desktop notifications', desc: 'System pop-ups even when the tab is in the background' },
    { key: 'sound', label: 'Alert sound', desc: 'A short beep when an alert fires' },
    { key: 'voice', label: 'Spoken voice', desc: 'Reads warning / critical alerts aloud' },
  ];

  return (
    <div className="space-y-4">
      <SettingCard title="How RAPTOR interrupts you">
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          These control the interrupting channels for every alert (price, condition, account & risk). In-app toasts
          always show as immediate confirmation. The same controls live in the Alerts menu on the chart header.
        </p>
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-sm">Allow interruptions</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Master switch — off silences desktop, sound and voice</div>
          </div>
          <ToggleSwitch on={prefs.master} onChange={() => update({ master: !prefs.master })} />
        </div>
        <div style={{ opacity: prefs.master ? 1 : 0.4, pointerEvents: prefs.master ? 'auto' : 'none' }}>
          {CHANNELS.map((c) => (
            <div key={c.key} className="flex items-center justify-between py-1 border-t" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="text-sm flex items-center gap-2">
                  {c.label}
                  {c.key === 'browser' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                      style={{ backgroundColor: perm === 'granted' ? '#00C85320' : perm === 'denied' ? '#FF525220' : '#F0A50020', color: perm === 'granted' ? '#00C853' : perm === 'denied' ? '#FF5252' : '#F0A500' }}>
                      {perm === 'granted' ? 'allowed' : perm === 'denied' ? 'blocked' : 'ask'}
                    </span>
                  )}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.desc}</div>
              </div>
              <ToggleSwitch on={prefs.channels[c.key]} onChange={() => toggleChannel(c.key)} />
            </div>
          ))}
          <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-sm">Only notify for</div>
            <select value={prefs.minSeverity} onChange={(e) => update({ minSeverity: e.target.value as NexusAlertSeverity })}
              className="px-3 py-1.5 rounded-lg text-xs outline-none border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              {SEVERITY_ORDER.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
      </SettingCard>

      <SettingCard title="Quiet hours">
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-sm">Silence non-critical alerts overnight</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Desktop, sound and voice are muted during this window</div>
          </div>
          <ToggleSwitch on={prefs.quietHours.on} onChange={() => updateQuiet({ on: !prefs.quietHours.on })} />
        </div>
        {prefs.quietHours.on && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input type="time" value={prefs.quietHours.start} onChange={(e) => updateQuiet({ start: e.target.value })}
              className="px-3 py-1.5 rounded-lg text-xs outline-none border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
            <input type="time" value={prefs.quietHours.end} onChange={(e) => updateQuiet({ end: e.target.value })}
              className="px-3 py-1.5 rounded-lg text-xs outline-none border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={prefs.quietHours.allowCritical} onChange={() => updateQuiet({ allowCritical: !prefs.quietHours.allowCritical })} className="accent-[#0091D5]" />
              Still let critical alerts through
            </label>
          </div>
        )}
        <button onClick={test} className="mt-4 px-4 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: '#0091D5', color: '#0091D5' }}>
          Send test notification
        </button>
      </SettingCard>
    </div>
  );
}

function KYCTab() {
  const [step, setStep] = useState(0);
  const steps = ['Identity Document', 'Proof of Address', 'Selfie Verification', 'Review'];

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{
                backgroundColor: i <= step ? '#0091D5' : 'var(--bg-elevated)',
                color: i <= step ? '#000' : 'var(--text-muted)',
              }}
            >
              {i + 1}
            </div>
            <span className="text-[11px]" style={{ color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-px" style={{ backgroundColor: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <SettingCard title="Upload Identity Document">
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Upload a clear photo of your passport, national ID, or driving license.
          </p>
          <div className="border-2 border-dashed rounded-xl p-8 text-center" style={{ borderColor: 'var(--border)' }}>
            <Upload size={32} className="mx-auto mb-3 opacity-30" />
            <div className="text-sm mb-1">Drop your document here or click to upload</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>JPG, PNG, PDF — Max 5MB</div>
          </div>
          <button onClick={() => setStep(1)} className="mt-4 px-4 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: '#0091D5', color: '#000' }}>
            Continue
          </button>
        </SettingCard>
      )}

      {step === 1 && (
        <SettingCard title="Proof of Address">
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Upload a utility bill, bank statement, or government letter dated within the last 3 months.
          </p>
          <div className="border-2 border-dashed rounded-xl p-8 text-center" style={{ borderColor: 'var(--border)' }}>
            <Upload size={32} className="mx-auto mb-3 opacity-30" />
            <div className="text-sm mb-1">Drop your document here</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>JPG, PNG, PDF — Max 5MB</div>
          </div>
          <button onClick={() => setStep(2)} className="mt-4 px-4 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: '#0091D5', color: '#000' }}>
            Continue
          </button>
        </SettingCard>
      )}

      {step === 2 && (
        <SettingCard title="Selfie Verification">
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Take a selfie holding your ID document next to your face.
          </p>
          <div className="border-2 border-dashed rounded-xl p-8 text-center" style={{ borderColor: 'var(--border)' }}>
            <Upload size={32} className="mx-auto mb-3 opacity-30" />
            <div className="text-sm mb-1">Upload selfie with ID</div>
          </div>
          <button onClick={() => setStep(3)} className="mt-4 px-4 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: '#0091D5', color: '#000' }}>
            Submit for Review
          </button>
        </SettingCard>
      )}

      {step === 3 && (
        <SettingCard title="Verification Under Review">
          <div className="text-center py-8">
            <Shield size={40} className="mx-auto mb-4" style={{ color: '#F0A500' }} />
            <div className="text-lg font-bold mb-2">Documents Submitted</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Your KYC documents are being reviewed. This usually takes 1-2 business days.
            </div>
          </div>
        </SettingCard>
      )}
    </div>
  );
}

function DataBackupTab() {
  const [snapshot, setSnapshot] = useState<SettingsBackup | null>(null);
  const [groups, setGroups] = useState<BackupGroup[]>([]);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    const b = buildBackup();
    setSnapshot(b);
    setGroups(summarizeBackup(b));
  };
  useEffect(() => { refresh(); }, []);

  const download = () => {
    const b = buildBackup();
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `raptor-settings-${b.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice({ kind: 'ok', text: `Exported ${b.count} settings to a JSON file.` });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const res = applyBackup(data, overwrite);
      if (!res.ok) { setNotice({ kind: 'err', text: res.error ?? 'Restore failed.' }); return; }
      refresh();
      setNotice({ kind: 'ok', text: `Restored ${res.restored} settings (${res.skipped} skipped). Reload for every change to take effect.` });
    } catch {
      setNotice({ kind: 'err', text: 'Could not read that file — is it a RAPTOR settings backup (.json)?' });
    }
  };

  return (
    <div className="space-y-4">
      <SettingCard title="Back up your settings">
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Save your RAPTOR configuration — alerts, notification preferences, risk governor limits, Shield rules,
          auto-hedge / scan scope, saved workspaces and widget dashboards, watchlists and EMIL tuning — to a portable
          file you can restore on another device or after clearing your browser.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={download} disabled={!snapshot || snapshot.count === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-30" style={{ backgroundColor: '#0091D5', color: '#000' }}>
            <Download size={14} /> Export settings{snapshot ? ` (${snapshot.count})` : ''}
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: '#0091D5', color: '#0091D5' }}>
            <Upload size={14} /> Restore from file
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
          <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={overwrite} onChange={() => setOverwrite((v) => !v)} className="accent-[#0091D5]" />
            Overwrite existing settings on restore
          </label>
        </div>
        {notice && (
          <div className="mt-3 rounded-lg px-3 py-2 text-[11px]"
            style={{ backgroundColor: notice.kind === 'ok' ? 'rgba(0,200,83,0.08)' : 'rgba(255,82,82,0.08)', color: notice.kind === 'ok' ? '#00C853' : '#FF5252', border: `1px solid ${notice.kind === 'ok' ? 'rgba(0,200,83,0.25)' : 'rgba(255,82,82,0.25)'}` }}>
            {notice.text}
          </div>
        )}
      </SettingCard>

      <SettingCard title="What's included">
        {groups.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No saved settings yet — they appear here as you use the terminal.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {groups.map((g) => (
              <div key={g.label} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>{g.label}</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{g.keys.length}</span>
              </div>
            ))}
          </div>
        )}
      </SettingCard>

      <SettingCard title="Never included">
        <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Shield size={14} className="mt-0.5 shrink-0" style={{ color: '#F0A500' }} />
          <p className="leading-relaxed">
            For your safety, backups exclude API keys / tokens and every consent, agreement and terms acceptance.
            Consent stays on the device where you gave it — so after restoring on a new device, autonomous engines
            (Auto-Hedge, Scan, EMIL) remain <span style={{ color: 'var(--text-primary)' }}>disarmed until you re-consent here</span>,
            even if their on-switch was in the backup. Your account, positions and trade history live on the server and are never in this file.
          </p>
        </div>
      </SettingCard>
    </div>
  );
}

function SettingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <h3 className="text-sm font-bold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InputField({ label, type = 'text', placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-xs outline-none border transition-colors focus:border-[#0091D5]"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <select
        className="w-full px-3 py-2 rounded-lg text-xs outline-none border transition-colors focus:border-[#0091D5]"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ToggleSwitch({ on: onProp, onChange }: { on?: boolean; onChange?: () => void } = {}) {
  const [onLocal, setOnLocal] = useState(true);
  const on = onProp ?? onLocal;
  return (
    <button
      onClick={() => (onChange ? onChange() : setOnLocal(!onLocal))}
      className="w-10 h-5 rounded-full transition-all relative"
      style={{ backgroundColor: on ? '#0091D5' : 'var(--bg-elevated)' }}
    >
      <div
        className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
        style={{
          left: on ? 22 : 2,
          backgroundColor: on ? '#000' : 'var(--text-muted)',
        }}
      />
    </button>
  );
}
