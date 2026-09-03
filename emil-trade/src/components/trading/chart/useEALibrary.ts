'use client';

// Merged EA library: the 25 built-in EAs plus any uploaded custom EAs
// (persisted in localStorage). Re-renders when a custom EA is added or
// removed, so both the RAPTOR-chart menu and the TradingView-tab menu
// stay in sync.

import { useCallback, useEffect, useRef, useState } from 'react';
import { EA_LIBRARY, type EAConfig } from './ChartToolbar';
import {
  loadCustomEAs, onCustomEAsChanged, convertUploadedEA, saveCustomEA, removeCustomEA,
  checksumOf, findDuplicate, isPineSource,
} from '@/lib/trading/custom-ea';
import { isEnabled } from '@/lib/trading/entitlements';

export function useEALibrary() {
  const [custom, setCustom] = useState<EAConfig[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const sync = () => setCustom(loadCustomEAs() as unknown as EAConfig[]);
    sync();
    return onCustomEAsChanged(sync);
  }, []);

  const all: EAConfig[] = [...custom, ...EA_LIBRARY];

  const handleFile = useCallback(async (file: File): Promise<{ ok: boolean; name?: string; error?: string }> => {
    // Admin entitlement: EA uploads can be disabled platform-wide.
    if (!(await isEnabled('ea_upload'))) {
      return { ok: false, error: 'EA uploads are currently disabled by the administrator.' };
    }
    if (!/\.(mq5|ex5|pine|pinescript|txt)$/i.test(file.name)) {
      return { ok: false, error: 'Please choose a .mq5, .ex5 or .pine file.' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { ok: false, error: 'File too large (max 5 MB).' };
    }
    try {
      // Text formats are read for conversion; .ex5 is binary (filename only).
      const content = /\.(mq5|pine|pinescript|txt)$/i.test(file.name) ? await file.text() : '';
      if (/\.txt$/i.test(file.name) && !isPineSource(file.name, content)) {
        return { ok: false, error: '.txt uploads must contain Pine Script (//@version + indicator()/strategy()).' };
      }
      // §31 duplicate detection by checksum before converting.
      const dup = findDuplicate(checksumOf(content || file.name));
      if (dup) return { ok: false, error: `Already in your library as "${dup.name}" — duplicate upload skipped.` };
      const ea = convertUploadedEA(file.name, content);
      saveCustomEA(ea);
      return { ok: true, name: ea.name };
    } catch {
      return { ok: false, error: 'Could not read the file.' };
    }
  }, []);

  const remove = useCallback((id: string) => removeCustomEA(id), []);

  return { all, custom, fileInputRef, handleFile, remove };
}
