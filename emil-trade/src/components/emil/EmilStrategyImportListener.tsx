'use client';

// Catches an incoming EMIL Strategy Builder link (#emil-strategy=…) on any page
// — including /auth/login after the sign-in redirect — keeps it for this tab,
// and takes it out of the address bar. The terminal offers the import
// (EmilStrategyImportDialog); nothing is added without the trader confirming.

import { useEffect } from 'react';
import { FRAGMENT_KEY, stashPendingImport } from '@/lib/trading/emil-strategy-pending';

export function EmilStrategyImportListener() {
  useEffect(() => {
    const capture = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const part = hash.split('&').find((p) => p.startsWith(`${FRAGMENT_KEY}=`));
      if (!part) return;
      const rest = hash.split('&').filter((p) => p !== part).join('&');
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${rest ? `#${rest}` : ''}`);
      stashPendingImport(part.slice(FRAGMENT_KEY.length + 1));
    };
    capture();
    window.addEventListener('hashchange', capture);
    return () => window.removeEventListener('hashchange', capture);
  }, []);
  return null;
}
