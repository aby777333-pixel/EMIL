'use client';

import { useEffect, useCallback } from 'react';
import { useDealingDeskStore } from '@/stores/dealer';

// ---------------------------------------------------------------
// Hotkey map: keyboard key -> semantic action name
// ---------------------------------------------------------------

const HOTKEYS: Record<string, string> = {
  F1: 'accept',
  F2: 'requote',
  F3: 'delay',
  F4: 'reject',
  F5: 'force_close',
  ArrowUp: 'select_prev',
  ArrowDown: 'select_next',
  Enter: 'load_order',
  Escape: 'clear',
};

// Keys where we must prevent browser default behaviour
const PREVENT_DEFAULT_KEYS = new Set([
  'F1', 'F2', 'F3', 'F4', 'F5',
  'ArrowUp', 'ArrowDown',
]);

// Ctrl-combo shortcuts (key after Ctrl+)
const CTRL_HOTKEYS: Record<string, string> = {
  b: 'toggle_book',
  e: 'toggle_expert',
  l: 'toggle_blotter',
  n: 'toggle_nexus',
  f: 'emergency_flatten',
};

// Standard keys that map to actions (non-Ctrl)
const CHAR_HOTKEYS: Record<string, string> = {
  '?': 'hotkey_overlay',
};

// ---------------------------------------------------------------
// Hook
// ---------------------------------------------------------------

export function useDealerHotkeys(handlers: Record<string, () => void>) {
  const toggleExpertMode = useDealingDeskStore((s) => s.toggleExpertMode);
  const toggleBlotter = useDealingDeskStore((s) => s.toggleBlotter);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore when typing inside input / textarea / contentEditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // --- Ctrl combos ---
      if (event.ctrlKey || event.metaKey) {
        const ctrlAction = CTRL_HOTKEYS[event.key.toLowerCase()];
        if (ctrlAction) {
          event.preventDefault();
          event.stopPropagation();

          // Built-in ctrl actions
          if (ctrlAction === 'toggle_expert') {
            toggleExpertMode();
            return;
          }
          if (ctrlAction === 'toggle_blotter') {
            toggleBlotter();
            return;
          }

          // Delegate to external handler
          const handler = handlers[ctrlAction];
          if (handler) handler();
          return;
        }
        // Don't intercept other Ctrl combos (Ctrl+C, Ctrl+V, etc.)
        return;
      }

      // --- Character hotkeys (e.g. ?) ---
      const charAction = CHAR_HOTKEYS[event.key];
      if (charAction) {
        const charHandler = handlers[charAction];
        if (charHandler) charHandler();
        return;
      }

      // --- Standard hotkeys ---
      const action = HOTKEYS[event.key];
      if (!action) return;

      if (PREVENT_DEFAULT_KEYS.has(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }

      const handler = handlers[action];
      if (handler) handler();
    },
    [handlers, toggleExpertMode, toggleBlotter],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
