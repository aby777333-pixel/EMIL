// ═══════════════════════════════════════════════════════════════
// Settings Backup & Restore — a lot of the trader's configuration now
// lives in the browser (alerts, notification prefs, risk governor,
// Shield rules, auto-hedge / scan scope + params, saved workspaces and
// widget dashboards, watchlists, EMIL tuning). This snapshots all of it
// to a portable JSON file and restores it on another device or after a
// browser reset.
//
// SAFETY — two classes of key are deliberately NEVER exported or
// restored:
//   • Secrets: API-key caches and tokens.
//   • Consent / legal gates: every *consent*, agreement, terms and
//     disclaimer acceptance. Consent is per-device by design — a restore
//     must never fabricate consent the person on THIS device didn't give.
// Because the autonomous engines gate on their consent key separately, a
// restored "automation on" flag stays disarmed until the user re-consents
// here. That interaction is intentional, not a bug.
// ═══════════════════════════════════════════════════════════════

export const BACKUP_APP = 'raptor';
export const BACKUP_SCHEMA = 1;
const PREFIX = 'raptor_';

export interface SettingsBackup {
  app: string;
  schema: number;
  exportedAt: string;
  count: number;
  keys: Record<string, string>;
}

/** Keys we must not export or restore (secrets + consent/legal gates). */
export function isSensitiveKey(key: string): boolean {
  if (key.startsWith('raptor_key_')) return true;          // API-key operation caches
  if (key.includes('_token')) return true;                  // bearer/session tokens
  if (key.includes('consent')) return true;                 // automation consent gates
  if (key.includes('agreement')) return true;               // NEXUS agreement
  if (key.includes('disclaimer')) return true;              // EA disclaimers
  if (key.includes('terms')) return true;                   // platform terms acceptance
  return false;
}

/** A key qualifies for backup iff it is ours and not sensitive. */
export function isBackupableKey(key: string): boolean {
  return key.startsWith(PREFIX) && !isSensitiveKey(key);
}

/** Snapshot every backupable localStorage key into a portable object. */
export function buildBackup(): SettingsBackup {
  const keys: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !isBackupableKey(k)) continue;
      const v = localStorage.getItem(k);
      if (v != null) keys[k] = v;
    }
  } catch { /* ignore */ }
  return {
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    count: Object.keys(keys).length,
    keys,
  };
}

export interface RestoreResult { ok: boolean; restored: number; skipped: number; error?: string }

/** Restore a backup object. `overwrite` decides whether existing keys are
 *  replaced (true) or only missing keys are filled (false). Sensitive keys in
 *  the file are always skipped, so a hand-edited file can't inject consent or
 *  tokens. */
export function applyBackup(data: unknown, overwrite: boolean): RestoreResult {
  if (!data || typeof data !== 'object') return { ok: false, restored: 0, skipped: 0, error: 'Not a valid backup file.' };
  const b = data as Partial<SettingsBackup>;
  if (b.app !== BACKUP_APP || !b.keys || typeof b.keys !== 'object') {
    return { ok: false, restored: 0, skipped: 0, error: 'This is not a RAPTOR settings backup.' };
  }
  let restored = 0, skipped = 0;
  try {
    for (const [k, v] of Object.entries(b.keys)) {
      if (!isBackupableKey(k) || typeof v !== 'string') { skipped++; continue; }
      if (!overwrite && localStorage.getItem(k) != null) { skipped++; continue; }
      localStorage.setItem(k, v);
      restored++;
    }
  } catch (e) {
    return { ok: false, restored, skipped, error: e instanceof Error ? e.message : 'Restore failed.' };
  }
  return { ok: true, restored, skipped };
}

// ── Human-readable grouping for the UI ────────────────────────────────
export interface BackupGroup { label: string; keys: string[] }

const GROUP_RULES: { label: string; test: (k: string) => boolean }[] = [
  { label: 'Alerts', test: (k) => k.includes('alert') },
  { label: 'Notifications', test: (k) => k.includes('notify') || k.includes('nexus_active') },
  { label: 'Risk & Protection', test: (k) => k.includes('governor') || k.includes('protection') },
  { label: 'Auto-Hedge & Scan', test: (k) => k.includes('hedgeauto') || k.includes('scanauto') || k.includes('hedge_groups') },
  { label: 'Scanner', test: (k) => k.includes('scanner') },
  { label: 'EMIL', test: (k) => k.includes('emil') },
  { label: 'Workspaces & Layout', test: (k) => k.includes('workspace') || k.includes('widget') || k.includes('panel') || k.includes('right_panel') || k.includes('chart_templates') },
  { label: 'Watchlists & Favourites', test: (k) => k.includes('watchlist') || k.includes('fav_') },
  { label: 'Broker config', test: (k) => k.includes('broker') },
  { label: 'EA & Scripts', test: (k) => k.includes('script') || k.includes('ea_input') },
];

/** Group the current backupable keys for a friendly "what's included" list. */
export function summarizeBackup(backup: SettingsBackup): BackupGroup[] {
  const groups: BackupGroup[] = GROUP_RULES.map((r) => ({ label: r.label, keys: [] }));
  const other: string[] = [];
  for (const k of Object.keys(backup.keys)) {
    const rule = GROUP_RULES.findIndex((r) => r.test(k));
    if (rule >= 0) groups[rule].keys.push(k);
    else other.push(k);
  }
  if (other.length) groups.push({ label: 'Other', keys: other });
  return groups.filter((g) => g.keys.length > 0);
}
