// ═══════════════════════════════════════════════════════════════
// Notification Preferences — one control surface for how RAPTOR is
// allowed to INTERRUPT the trader. Governs the three intrusive
// channels (desktop/browser notifications, a short alert sound, and
// spoken voice) with a master mute, a minimum-severity filter and
// quiet hours. In-app toasts are deliberately NOT gated here: they are
// immediate, non-intrusive confirmation and stay always-on.
//
// Pure + defaults-preserve-behaviour: out of the box browser is ON and
// sound/voice OFF with no quiet hours, so every existing call site keeps
// firing exactly as before until the trader changes something.
// ═══════════════════════════════════════════════════════════════

import type { NexusAlertSeverity } from '@/lib/nexus/alert-engine';

export type NotifyChannel = 'browser' | 'sound' | 'voice';

export interface NotifyPrefs {
  master: boolean;                       // global mute for all interrupting channels
  channels: Record<NotifyChannel, boolean>;
  minSeverity: NexusAlertSeverity;       // deliver only alerts at/above this severity
  quietHours: { on: boolean; start: string; end: string; allowCritical: boolean }; // HH:MM local
}

export const SEVERITY_ORDER: NexusAlertSeverity[] = ['info', 'opportunity', 'warning', 'critical'];

export const NOTIFY_DEFAULTS: NotifyPrefs = {
  master: true,
  channels: { browser: true, sound: false, voice: false },
  minSeverity: 'info',
  quietHours: { on: false, start: '22:00', end: '07:00', allowCritical: true },
};

const KEY = 'raptor_notify_prefs_v1';

export function loadNotifyPrefs(): NotifyPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<NotifyPrefs> | null;
    if (!raw) return { ...NOTIFY_DEFAULTS };
    return {
      master: typeof raw.master === 'boolean' ? raw.master : NOTIFY_DEFAULTS.master,
      channels: { ...NOTIFY_DEFAULTS.channels, ...(raw.channels || {}) },
      minSeverity: SEVERITY_ORDER.includes(raw.minSeverity as NexusAlertSeverity) ? raw.minSeverity as NexusAlertSeverity : NOTIFY_DEFAULTS.minSeverity,
      quietHours: { ...NOTIFY_DEFAULTS.quietHours, ...(raw.quietHours || {}) },
    };
  } catch { return { ...NOTIFY_DEFAULTS }; }
}

export function saveNotifyPrefs(p: NotifyPrefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function rank(s: NexusAlertSeverity): number { return SEVERITY_ORDER.indexOf(s); }

/** True if the given local time falls inside the configured quiet window.
 *  Handles overnight ranges (e.g. 22:00 → 07:00). */
export function inQuietHours(p: NotifyPrefs, now: Date): boolean {
  if (!p.quietHours.on) return false;
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = toMin(p.quietHours.start);
  const end = toMin(p.quietHours.end);
  if (start === end) return false;
  return start < end ? (cur >= start && cur < end) : (cur >= start || cur < end);
}

/** The single gate every interrupting channel checks. */
export function canDeliver(channel: NotifyChannel, severity: NexusAlertSeverity, prefs?: NotifyPrefs, now?: Date): boolean {
  const p = prefs ?? loadNotifyPrefs();
  if (!p.master) return false;
  if (!p.channels[channel]) return false;
  if (rank(severity) < rank(p.minSeverity)) return false;
  if (inQuietHours(p, now ?? new Date())) {
    return severity === 'critical' && p.quietHours.allowCritical;
  }
  return true;
}

/** Fire a desktop/browser notification if prefs + permission allow. */
export function deliverBrowserNotification(severity: NexusAlertSeverity, title: string, body: string): void {
  try {
    if (!canDeliver('browser', severity)) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    new Notification(title, { body });
  } catch { /* ignore */ }
}

// ── Alert sound (WebAudio beep) — no asset needed, best-effort ────────
let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}

/** Play a short severity-tuned beep if the sound channel + gating allow. */
export function playAlertSound(severity: NexusAlertSeverity): void {
  if (!canDeliver('sound', severity)) return;
  const ac = ctx();
  if (!ac) return;
  try {
    const freq = severity === 'critical' ? 880 : severity === 'warning' ? 660 : severity === 'opportunity' ? 550 : 440;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.3);
    if (severity === 'critical') {
      // Double-beep for critical.
      const osc2 = ac.createOscillator();
      const g2 = ac.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq;
      g2.gain.setValueAtTime(0.0001, now + 0.36);
      g2.gain.exponentialRampToValueAtTime(0.15, now + 0.38);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
      osc2.connect(g2).connect(ac.destination);
      osc2.start(now + 0.36);
      osc2.stop(now + 0.64);
    }
  } catch { /* ignore */ }
}

/** Speak an alert if the voice channel + gating allow. */
export function speakAlert(severity: NexusAlertSeverity, text: string): void {
  if (!canDeliver('voice', severity)) return;
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(`${severity === 'critical' ? 'Warning. ' : ''}${text}`);
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

/** Convenience: deliver an alert across every interrupting channel at once,
 *  each independently gated. Toasts remain the caller's responsibility. */
export function notifyAll(severity: NexusAlertSeverity, title: string, body: string): void {
  deliverBrowserNotification(severity, title, body);
  playAlertSound(severity);
  speakAlert(severity, title);
}

/** Ask for desktop-notification permission (no-op if already decided). */
export function ensureNotifyPermission(): void {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch { /* ignore */ }
}

export const SEVERITY_LABEL: Record<NexusAlertSeverity, string> = {
  info: 'Info & above (everything)',
  opportunity: 'Opportunity & above',
  warning: 'Warning & above',
  critical: 'Critical only',
};
