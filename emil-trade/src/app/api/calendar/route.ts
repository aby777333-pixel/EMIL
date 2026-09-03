// Economic calendar proxy. Source: ForexFactory's free weekly JSON feed
// (real event data — title, currency, impact, forecast, previous). Proxied
// server-side with a 30-minute cache so the upstream is never hammered and
// the client needs no keys. Fails soft: on any upstream problem the route
// returns an empty list and the UI simply shows no events.

import { NextResponse } from 'next/server';

const FEED = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

interface FFEvent {
  title: string; country: string; date: string;
  impact: string; forecast: string; previous: string;
}

export interface CalendarEvent {
  title: string;
  currency: string;
  impact: 'High' | 'Medium' | 'Low' | 'Holiday';
  timeMs: number;
  forecast: string;
  previous: string;
}

let cache: { at: number; events: CalendarEvent[] } | null = null;
// Upstream attempts are throttled hard (max one per 5 min, success or fail)
// so a failing feed is never hammered — learned from the 429 it hands out.
let lastAttempt = 0;

export async function GET() {
  if (cache && Date.now() - cache.at < 30 * 60_000) {
    return NextResponse.json({ events: cache.events }, { headers: { 'Cache-Control': 'public, s-maxage=1800' } });
  }
  if (Date.now() - lastAttempt < 5 * 60_000) {
    return NextResponse.json({ events: cache?.events ?? [] }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  }
  lastAttempt = Date.now();
  try {
    // The feed's CDN rejects UA-less requests — send a browser-style UA.
    const res = await fetch(FEED, {
      next: { revalidate: 1800 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const raw = (await res.json()) as FFEvent[];
    const events: CalendarEvent[] = (Array.isArray(raw) ? raw : [])
      .map((e) => ({
        title: String(e.title ?? ''),
        currency: String(e.country ?? '').toUpperCase(),
        impact: (['High', 'Medium', 'Low', 'Holiday'].includes(e.impact) ? e.impact : 'Low') as CalendarEvent['impact'],
        timeMs: Date.parse(e.date),
        forecast: String(e.forecast ?? ''),
        previous: String(e.previous ?? ''),
      }))
      .filter((e) => Number.isFinite(e.timeMs));
    cache = { at: Date.now(), events };
    return NextResponse.json({ events }, { headers: { 'Cache-Control': 'public, s-maxage=1800' } });
  } catch {
    return NextResponse.json({ events: cache?.events ?? [] }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  }
}
