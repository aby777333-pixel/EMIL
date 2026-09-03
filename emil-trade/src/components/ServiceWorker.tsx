'use client';

// Registers the RAPTOR service worker (see public/sw.js) so the app is
// installable and has an offline fallback. Production only, and only after
// the page has loaded so it never competes with first paint. The SW is
// intentionally network-first for anything dynamic, so this adds no staleness
// risk to the live terminal. An escape hatch: append ?nosw to unregister.
import { useEffect } from 'react';

export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    // Kill switch for debugging: /?nosw removes any existing worker.
    if (typeof location !== 'undefined' && location.search.includes('nosw')) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      return;
    }

    if (process.env.NODE_ENV !== 'production') return;

    const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); };
    if (document.readyState === 'complete') register();
    else { window.addEventListener('load', register); return () => window.removeEventListener('load', register); }
  }, []);

  return null;
}
