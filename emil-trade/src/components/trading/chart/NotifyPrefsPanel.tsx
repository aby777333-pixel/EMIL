'use client';

// Notification preferences — the one place a trader controls how RAPTOR is
// allowed to interrupt them (desktop notifications, alert sound, spoken
// voice), with a master mute, a minimum-severity filter and quiet hours.
// Collapsed by default so it never crowds the alert list. Self-contained:
// reads/writes localStorage via notify-prefs and gates the shared helpers
// every alert source already calls.

import { useEffect, useState } from 'react';
import { Bell, ChevronDown, ChevronRight, Volume2, Monitor, Mic, Moon } from 'lucide-react';
import {
  loadNotifyPrefs, saveNotifyPrefs, ensureNotifyPermission, notifyAll,
  SEVERITY_LABEL, SEVERITY_ORDER, type NotifyPrefs, type NotifyChannel,
} from '@/lib/nexus/notify-prefs';
import type { NexusAlertSeverity } from '@/lib/nexus/alert-engine';

export default function NotifyPrefsPanel({ onToast }: { onToast: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<NotifyPrefs>(loadNotifyPrefs());
  const [perm, setPerm] = useState<string>('default');

  useEffect(() => {
    setPrefs(loadNotifyPrefs());
    try { if (typeof Notification !== 'undefined') setPerm(Notification.permission); } catch { /* ignore */ }
  }, []);

  const update = (patch: Partial<NotifyPrefs>) => {
    setPrefs((prev) => { const next = { ...prev, ...patch }; saveNotifyPrefs(next); return next; });
  };
  const toggleChannel = (c: NotifyChannel) => {
    setPrefs((prev) => {
      const next = { ...prev, channels: { ...prev.channels, [c]: !prev.channels[c] } };
      saveNotifyPrefs(next);
      if (c === 'browser' && next.channels.browser) {
        ensureNotifyPermission();
        try { if (typeof Notification !== 'undefined') setTimeout(() => setPerm(Notification.permission), 400); } catch { /* ignore */ }
      }
      return next;
    });
  };
  const updateQuiet = (patch: Partial<NotifyPrefs['quietHours']>) => {
    setPrefs((prev) => { const next = { ...prev, quietHours: { ...prev.quietHours, ...patch } }; saveNotifyPrefs(next); return next; });
  };

  const test = () => {
    ensureNotifyPermission();
    notifyAll('warning', 'RAPTOR test notification', 'This is how alerts will reach you.');
    onToast('🔔 Test sent on your enabled channels (browser / sound / voice).');
    try { if (typeof Notification !== 'undefined') setTimeout(() => setPerm(Notification.permission), 400); } catch { /* ignore */ }
  };

  const CHANNELS: { key: NotifyChannel; label: string; icon: typeof Monitor; hint: string }[] = [
    { key: 'browser', label: 'Desktop notifications', icon: Monitor, hint: 'System pop-ups even when the tab is in the background' },
    { key: 'sound', label: 'Alert sound', icon: Volume2, hint: 'A short beep when an alert fires' },
    { key: 'voice', label: 'Spoken voice', icon: Mic, hint: 'Reads warning / critical alerts aloud' },
  ];

  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 text-[11px] font-bold text-white">
        <Bell size={11} style={{ color: '#8b5cf6' }} /> Notification preferences
        <span className="ml-auto flex items-center gap-1 text-[8px] font-normal uppercase text-white/30">
          {prefs.master ? 'on' : 'muted'} {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {/* Master mute */}
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <input type="checkbox" checked={prefs.master} onChange={() => update({ master: !prefs.master })} className="accent-[#8b5cf6]" />
            <span className="text-[11px] font-semibold text-white/80">Allow interruptions</span>
            <span className="ml-auto text-[8px] text-white/30">master switch</span>
          </label>

          {/* Channels */}
          <div className="space-y-1" style={{ opacity: prefs.master ? 1 : 0.4, pointerEvents: prefs.master ? 'auto' : 'none' }}>
            {CHANNELS.map(({ key, label, icon: Icon, hint }) => (
              <label key={key} title={hint} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <input type="checkbox" checked={prefs.channels[key]} onChange={() => toggleChannel(key)} className="mt-0.5 accent-[#8b5cf6]" />
                <Icon size={12} className="mt-0.5 shrink-0 text-white/45" />
                <span className="min-w-0">
                  <span className="block text-[11px] text-white/75">{label}</span>
                  <span className="block text-[8px] leading-snug text-white/30">{hint}</span>
                </span>
                {key === 'browser' && (
                  <span className="ml-auto shrink-0 self-center rounded px-1.5 py-0.5 text-[8px] font-bold uppercase"
                    style={{ backgroundColor: perm === 'granted' ? 'rgba(0,194,122,0.15)' : perm === 'denied' ? 'rgba(255,82,82,0.15)' : 'rgba(255,179,0,0.15)', color: perm === 'granted' ? '#00C27A' : perm === 'denied' ? '#FF5252' : '#FFB300' }}>
                    {perm === 'granted' ? 'allowed' : perm === 'denied' ? 'blocked' : 'ask'}
                  </span>
                )}
              </label>
            ))}
            {perm === 'denied' && prefs.channels.browser && (
              <p className="px-2 text-[8px] leading-snug text-[#FF5252]/80">Desktop notifications are blocked by the browser. Enable them for this site in your browser settings.</p>
            )}

            {/* Minimum severity */}
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="text-[10px] text-white/45">Only notify for</span>
              <select value={prefs.minSeverity} onChange={(e) => update({ minSeverity: e.target.value as NexusAlertSeverity })}
                className="flex-1 rounded border bg-[#060D16] px-1.5 py-1 text-[10px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                {SEVERITY_ORDER.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
              </select>
            </div>

            {/* Quiet hours */}
            <div className="rounded-md px-2 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={prefs.quietHours.on} onChange={() => updateQuiet({ on: !prefs.quietHours.on })} className="accent-[#8b5cf6]" />
                <Moon size={11} className="text-white/45" />
                <span className="text-[11px] text-white/75">Quiet hours</span>
              </label>
              {prefs.quietHours.on && (
                <div className="mt-1.5 space-y-1.5 pl-5">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/45">
                    <input type="time" value={prefs.quietHours.start} onChange={(e) => updateQuiet({ start: e.target.value })}
                      className="rounded border bg-[#060D16] px-1.5 py-0.5 text-[10px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                    <span>to</span>
                    <input type="time" value={prefs.quietHours.end} onChange={(e) => updateQuiet({ end: e.target.value })}
                      className="rounded border bg-[#060D16] px-1.5 py-0.5 text-[10px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-[10px] text-white/60">
                    <input type="checkbox" checked={prefs.quietHours.allowCritical} onChange={() => updateQuiet({ allowCritical: !prefs.quietHours.allowCritical })} className="accent-[#8b5cf6]" />
                    Still let critical alerts through
                  </label>
                </div>
              )}
            </div>

            <button onClick={test} className="w-full rounded-md py-1.5 text-[10px] font-bold text-white" style={{ backgroundColor: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }}>
              Send test notification
            </button>
          </div>
          <p className="text-[8px] leading-snug text-white/25">In-app toasts always show as immediate confirmation; these settings control desktop pop-ups, sound and voice only. Alerts still fire only while the terminal is open (server-side delivery arrives with the live data feed).</p>
        </div>
      )}
    </div>
  );
}
