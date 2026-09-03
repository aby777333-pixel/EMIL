// ═══════════════════════════════════════════════════════════════
// EMIL Global Session Engine — real IANA time zones via Intl (DST handled
// by the platform's zone database, never a manual offset). Session windows
// are the conventional FX-desk hours in each venue's LOCAL time; exchange
// holidays and special closures are a future data integration and are
// honestly labelled as not yet covered.
// ═══════════════════════════════════════════════════════════════

export interface SessionDef { id: string; label: string; tz: string; openH: number; closeH: number }

export const SESSIONS: SessionDef[] = [
  { id: 'SYD', label: 'Sydney',   tz: 'Australia/Sydney',  openH: 9, closeH: 17 },
  { id: 'TYO', label: 'Tokyo',    tz: 'Asia/Tokyo',        openH: 9, closeH: 18 },
  { id: 'LON', label: 'London',   tz: 'Europe/London',     openH: 8, closeH: 17 },
  { id: 'NYC', label: 'New York', tz: 'America/New_York',  openH: 8, closeH: 17 },
];

interface TzNow { hour: number; minute: number; weekday: number; hhmm: string }

function nowInZone(tz: string): TzNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { hour, minute, weekday, hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

export interface SessionStatus {
  id: string; label: string;
  open: boolean;
  localTime: string;
  minsToChange: number;      // minutes until open→close or close→open (weekend-aware, approx)
  changeType: 'closes' | 'opens';
}

export interface SessionSnapshot {
  sessions: SessionStatus[];
  overlaps: string[];
  utc: string;
  local: string;
  note: string;
}

export function sessionSnapshot(): SessionSnapshot {
  const sessions: SessionStatus[] = SESSIONS.map((s) => {
    const t = nowInZone(s.tz);
    const isWeekday = t.weekday >= 1 && t.weekday <= 5;
    const open = isWeekday && t.hour >= s.openH && t.hour < s.closeH;
    const nowMin = t.hour * 60 + t.minute;
    let minsToChange: number;
    let changeType: 'closes' | 'opens';
    if (open) {
      minsToChange = s.closeH * 60 - nowMin;
      changeType = 'closes';
    } else {
      changeType = 'opens';
      let mins = s.openH * 60 - nowMin;
      let day = t.weekday;
      if (mins <= 0) { mins += 24 * 60; day = (day + 1) % 7; }
      // Skip Saturday/Sunday for the opening day (approximate weekend handling).
      while (day === 0 || day === 6) { mins += 24 * 60; day = (day + 1) % 7; }
      minsToChange = mins;
    }
    return { id: s.id, label: s.label, open, localTime: t.hhmm, minsToChange, changeType };
  });

  const openIds = sessions.filter((s) => s.open).map((s) => s.id);
  const overlaps: string[] = [];
  if (openIds.includes('SYD') && openIds.includes('TYO')) overlaps.push('Sydney × Tokyo — early-Asia liquidity building');
  if (openIds.includes('TYO') && openIds.includes('LON')) overlaps.push('Tokyo × London — Asia hands off to Europe');
  if (openIds.includes('LON') && openIds.includes('NYC')) overlaps.push('London × New York — the deepest liquidity window of the day');

  return {
    sessions,
    overlaps,
    utc: new Date().toISOString().slice(11, 16) + ' UTC',
    local: new Date().toTimeString().slice(0, 5),
    note: 'Conventional session hours in each venue’s local time (IANA zones, DST-aware). Exchange holidays/special closures not yet integrated.',
  };
}

export function fmtMins(mins: number): string {
  if (mins >= 1440) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}
