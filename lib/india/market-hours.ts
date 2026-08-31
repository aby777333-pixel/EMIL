// Indian exchange session logic — all computations in IST (Asia/Kolkata).

export type SessionStatus = 'pre_open' | 'open' | 'evening_session' | 'post_close' | 'closed' | 'holiday' | 'weekend'

export function istNow(): { minutes: number; day: number; dateISO: string; clock: string } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const hour = parseInt(get('hour'), 10)
  const minute = parseInt(get('minute'), 10)
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    minutes: hour * 60 + minute,
    day: dayMap[get('weekday')] ?? 0,
    dateISO: `${get('year')}-${get('month')}-${get('day')}`,
    clock: `${get('hour')}:${get('minute')}`,
  }
}

const toMin = (hhmm?: string | null) => {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function sessionStatus(
  session: { preOpen?: string | null; open: string; close: string; postClose?: string | null; eveningClose?: string | null },
  holidayDatesISO: Set<string>,
): { status: SessionStatus; label: string; istClock: string } {
  const { minutes, day, dateISO, clock } = istNow()
  if (day === 0 || day === 6) return { status: 'weekend', label: 'Closed — weekend', istClock: clock }
  if (holidayDatesISO.has(dateISO)) return { status: 'holiday', label: 'Closed — market holiday', istClock: clock }

  const preOpen = toMin(session.preOpen)
  const open = toMin(session.open)!
  const close = toMin(session.close)!
  const postClose = toMin(session.postClose)
  const eveningClose = toMin(session.eveningClose)

  if (preOpen !== null && minutes >= preOpen && minutes < open) return { status: 'pre_open', label: 'Pre-open session', istClock: clock }
  if (minutes >= open && minutes < close) return { status: 'open', label: 'Market open', istClock: clock }
  if (eveningClose !== null && minutes >= close && minutes < eveningClose) return { status: 'evening_session', label: 'Evening session (non-agri)', istClock: clock }
  if (postClose !== null && minutes >= close && minutes < postClose) return { status: 'post_close', label: 'Closing session', istClock: clock }
  return { status: 'closed', label: 'Closed', istClock: clock }
}
