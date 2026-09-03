// News guard — client access to the economic calendar (via /api/calendar)
// plus the pure checks behind the 📅 News radar chip and the Shield
// "News guard" rule. Takes currency lists as arguments so it stays free of
// import cycles with the protection engine.

export interface NewsEvent {
  title: string;
  currency: string;
  impact: 'High' | 'Medium' | 'Low' | 'Holiday';
  timeMs: number;
  forecast: string;
  previous: string;
}

let cache: { at: number; events: NewsEvent[] } | null = null;
let inflight: Promise<NewsEvent[]> | null = null;

/** Cached calendar fetch (10 min client cache; the API route caches 30 min
 *  server-side). Always resolves — an empty list on any failure. */
export function getCalendar(): Promise<NewsEvent[]> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return Promise.resolve(cache.events);
  if (inflight) return inflight;
  inflight = fetch('/api/calendar')
    .then((r) => (r.ok ? r.json() : { events: [] }))
    .then((d: { events?: NewsEvent[] }) => {
      const events = Array.isArray(d.events) ? d.events : [];
      cache = { at: Date.now(), events };
      return events;
    })
    .catch(() => cache?.events ?? [])
    .finally(() => { inflight = null; });
  return inflight;
}

function matches(ev: NewsEvent, currencies: string[]): boolean {
  return ev.currency === 'ALL' || currencies.includes(ev.currency);
}

/** High-impact events within ±windowMin minutes of now for the given
 *  currencies — the Shield rule's blocking condition. */
export function highImpactWithin(currencies: string[], events: NewsEvent[], windowMin: number): NewsEvent[] {
  const now = Date.now();
  const w = windowMin * 60_000;
  return events.filter((e) => e.impact === 'High' && matches(e, currencies) && Math.abs(e.timeMs - now) <= w);
}

/** The next upcoming high-impact event for the given currencies (radar chip). */
export function nextHighImpact(currencies: string[], events: NewsEvent[]): NewsEvent | null {
  const now = Date.now();
  const ahead = events
    .filter((e) => e.impact === 'High' && matches(e, currencies) && e.timeMs > now)
    .sort((a, b) => a.timeMs - b.timeMs);
  return ahead[0] ?? null;
}

/** Today's + tomorrow's high-impact events for the given currencies. */
export function upcomingHighImpact(currencies: string[], events: NewsEvent[], hours = 48): NewsEvent[] {
  const now = Date.now();
  return events
    .filter((e) => e.impact === 'High' && matches(e, currencies) && e.timeMs > now - 60 * 60_000 && e.timeMs < now + hours * 3_600_000)
    .sort((a, b) => a.timeMs - b.timeMs);
}

export function fmtEta(timeMs: number): string {
  const mins = Math.round((timeMs - Date.now()) / 60_000);
  if (mins < 0) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 48 * 60) return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
  return `${Math.floor(mins / 1440)}d`;
}
