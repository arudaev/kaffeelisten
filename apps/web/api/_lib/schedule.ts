// Report scheduling logic — pure and unit-testable (no network/DB).
//
// The monthly report always covers the PREVIOUS, fully-closed calendar month,
// evaluated in Europe/Berlin. The admin's `auto_report_day` is the day of the
// *following* month on which that closed month is sent (default: the 1st). The
// daily cron re-evaluates this every night; because the run ledger
// (`report_runs`, keyed by report_month) skips an already-completed month, a
// missed day is simply retried on the next fire — automatic catch-up with no
// risk of a double-send.

export interface BerlinDate {
  year: number
  month: number // 1-12
  day: number // 1-31
  daysInMonth: number
}

/** Wall-clock date in Europe/Berlin for the given instant (default: now). */
export function berlinNow(now: Date = new Date()): BerlinDate {
  // en-CA gives ISO-ish YYYY-MM-DD parts we can parse unambiguously.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const get = (t: string): number => Number(parts.find(p => p.type === t)?.value)
  const year = get('year')
  const month = get('month')
  const day = get('day')
  // Day 0 of the next month = last day of this month.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { year, month, day, daysInMonth }
}

/** The month immediately before (year, month) as "YYYY-MM". */
export function previousMonth(year: number, month: number): string {
  const y = month === 1 ? year - 1 : year
  const m = month === 1 ? 12 : month - 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export interface ScheduleSettings {
  autoEnabled: boolean
  autoDay: number | null // null = as early as possible (the 1st)
}

export interface DueResult {
  due: boolean
  targetMonth: string // the closed month a send would cover ("YYYY-MM")
  reason?: string
}

/**
 * Decide whether an automatic report is due right now. `targetMonth` is always
 * the previous (closed) month relative to the Berlin wall-clock date, so a send
 * never reports an open period. `autoDay` is clamped into the current month's
 * length so a value like 31 still fires on the last day of a short month.
 */
export function computeDueReport(now: Date, settings: ScheduleSettings): DueResult {
  const { year, month, day, daysInMonth } = berlinNow(now)
  const targetMonth = previousMonth(year, month)

  if (!settings.autoEnabled) {
    return { due: false, targetMonth, reason: 'Automatic send disabled' }
  }

  const dueDay = clamp(settings.autoDay ?? 1, 1, daysInMonth)
  if (day < dueDay) {
    return { due: false, targetMonth, reason: `Not yet due (send day ${dueDay})` }
  }
  return { due: true, targetMonth }
}
