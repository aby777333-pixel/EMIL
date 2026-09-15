// The one incoming EMIL Strategy Builder link waiting for the trader in this
// tab. Deliberately dependency-free: the root layout's listener uses it on
// every page, so it must not pull the EA library or the strategy kit in.

const PENDING_KEY = 'emil_strategy_import_pending_v1';

/** Fired on window when a new link has been stashed. */
export const PENDING_EVENT = 'emil-strategy-import-pending';

/** Fragment key the EMIL Strategy Builder uses (IMPORT_FRAGMENT_KEY in the kit). */
export const FRAGMENT_KEY = 'emil-strategy';

export function stashPendingImport(encoded: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, encoded);
    window.dispatchEvent(new Event(PENDING_EVENT));
  } catch {
    /* storage blocked — the import is simply not offered */
  }
}

export function readPendingEncoded(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingImport(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}
