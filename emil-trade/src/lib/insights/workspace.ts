// ═══════════════════════════════════════════════════════════════
// Workspace preferences (enhancement prompt §35): UI scale, high-contrast
// mode and layout recovery. Purely visual, persisted locally, and fully
// reversible — resetting restores the exact stock terminal.
// ═══════════════════════════════════════════════════════════════

export interface WorkspacePrefs {
  /** UI zoom 0.85–1.15 (body zoom scales the px-based type too). */
  scale: number;
  highContrast: boolean;
}

const KEY = 'raptor_workspace_prefs';
export const SCALE_MIN = 0.85;
export const SCALE_MAX = 1.15;
export const SCALE_STEP = 0.05;

export function loadWorkspacePrefs(): WorkspacePrefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    const scale = typeof p.scale === 'number' ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, p.scale)) : 1;
    return { scale, highContrast: p.highContrast === true };
  } catch {
    return { scale: 1, highContrast: false };
  }
}

export function saveWorkspacePrefs(p: WorkspacePrefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** Apply prefs to the document. zoom is supported in all current
 *  Chromium/WebKit and Firefox 126+; at scale 1 the style is removed. */
export function applyWorkspacePrefs(p: WorkspacePrefs): void {
  const body = document.body as HTMLElement & { style: CSSStyleDeclaration & { zoom?: string } };
  body.style.zoom = p.scale !== 1 ? String(p.scale) : '';
  body.style.filter = p.highContrast ? 'contrast(1.12) brightness(1.06) saturate(1.08)' : '';
}

export function adjustScale(delta: number): WorkspacePrefs {
  const cur = loadWorkspacePrefs();
  const next = { ...cur, scale: Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, cur.scale + delta)) * 100) / 100 };
  saveWorkspacePrefs(next);
  applyWorkspacePrefs(next);
  return next;
}

export function setScale(scale: number): WorkspacePrefs {
  const next = { ...loadWorkspacePrefs(), scale };
  saveWorkspacePrefs(next);
  applyWorkspacePrefs(next);
  return next;
}

export function toggleHighContrast(): WorkspacePrefs {
  const cur = loadWorkspacePrefs();
  const next = { ...cur, highContrast: !cur.highContrast };
  saveWorkspacePrefs(next);
  applyWorkspacePrefs(next);
  return next;
}

/** Layout recovery (§35): clear every layout-affecting key and reload —
 *  brings back the stock terminal after any bad state. Trading data,
 *  alerts, journals, watchlists and EA settings are NOT touched. */
const LAYOUT_KEYS = [
  KEY,
  'raptor_right_panel_hidden',
  'raptor_positions_panel_height',
];

export function resetLayout(): void {
  for (const k of LAYOUT_KEYS) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
  window.location.reload();
}
