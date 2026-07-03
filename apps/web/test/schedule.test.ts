import { describe, expect, it } from 'vitest'
import { berlinNow, previousMonth, computeDueReport } from '../api/_lib/schedule'

// Midday UTC keeps us clear of the Berlin midnight boundary in every season.
const at = (iso: string) => new Date(iso)

describe('previousMonth', () => {
  it('rolls back within a year', () => {
    expect(previousMonth(2026, 7)).toBe('2026-06')
  })
  it('rolls back across the year boundary', () => {
    expect(previousMonth(2026, 1)).toBe('2025-12')
  })
})

describe('berlinNow', () => {
  it('reports the Berlin wall-clock date and month length', () => {
    const d = berlinNow(at('2026-07-03T12:00:00Z'))
    expect(d).toMatchObject({ year: 2026, month: 7, day: 3, daysInMonth: 31 })
  })
  it('knows February length in a non-leap year', () => {
    expect(berlinNow(at('2026-02-10T12:00:00Z')).daysInMonth).toBe(28)
  })
})

describe('computeDueReport', () => {
  it('targets the previous closed month', () => {
    const r = computeDueReport(at('2026-07-03T12:00:00Z'), { autoEnabled: true, autoDay: 1 })
    expect(r).toEqual({ due: true, targetMonth: '2026-06' })
  })

  it('is not due before the configured send day', () => {
    const r = computeDueReport(at('2026-07-03T12:00:00Z'), { autoEnabled: true, autoDay: 5 })
    expect(r.due).toBe(false)
    expect(r.targetMonth).toBe('2026-06')
  })

  it('defaults to the 1st when autoDay is null', () => {
    expect(computeDueReport(at('2026-07-01T12:00:00Z'), { autoEnabled: true, autoDay: null }).due).toBe(true)
  })

  it('clamps a 31 send day to the last day of a short month', () => {
    // June has 30 days — day 31 can never arrive, so it must fire on the 30th.
    const r = computeDueReport(at('2026-06-30T12:00:00Z'), { autoEnabled: true, autoDay: 31 })
    expect(r).toEqual({ due: true, targetMonth: '2026-05' })
  })

  it('rolls the target across the year boundary', () => {
    const r = computeDueReport(at('2026-01-15T12:00:00Z'), { autoEnabled: true, autoDay: 1 })
    expect(r).toEqual({ due: true, targetMonth: '2025-12' })
  })

  it('is never due when automatic send is disabled', () => {
    const r = computeDueReport(at('2026-07-15T12:00:00Z'), { autoEnabled: false, autoDay: 1 })
    expect(r.due).toBe(false)
    expect(r.reason).toBeTruthy()
  })
})
