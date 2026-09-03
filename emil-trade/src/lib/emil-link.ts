// EMIL Trade ↔ EMIL Control Cockpit hand-off.
//
// EMIL Trade is the native trading platform (this app). EMIL — the
// multi-agent intelligence layer — lives in its own app (the EMIL Control
// Cockpit). Every "EMIL" surface inside the terminal opens that cockpit in a
// new tab instead of the retired in-terminal EMIL console.
export const EMIL_COCKPIT_URL =
  process.env.NEXT_PUBLIC_EMIL_COCKPIT_URL?.replace(/\/+$/, '') ||
  'https://serene-frangollo-a3c59c.netlify.app';

/** Open the EMIL Control Cockpit in a new tab (never navigates the terminal away). */
export function openEmilCockpit(path = '/') {
  if (typeof window === 'undefined') return;
  const href = `${EMIL_COCKPIT_URL}${path.startsWith('/') ? path : `/${path}`}`;
  window.open(href, '_blank', 'noopener,noreferrer');
}
