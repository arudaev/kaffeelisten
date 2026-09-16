import { describe, expect, it } from 'vitest'
import { monthLabel, monthRange, percentChange, shiftMonth, todayBerlin } from '../src/lib/dates'

describe('monthRange', () => {
  it('covers the whole month, including February in a leap year', () => {
    expect(monthRange('2026-08')).toEqual({ from: '2026-08-01', to: '2026-08-31' })
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})

describe('shiftMonth', () => {
  it('crosses year boundaries in both directions', () => {
    expect(shiftMonth('2026-01', 1)).toBe('2025-12')
    expect(shiftMonth('2025-12', -1)).toBe('2026-01')
    expect(shiftMonth('2026-08', 0)).toBe('2026-08')
  })
})

describe('todayBerlin', () => {
  it('uses the Berlin day, not the UTC one', () => {
    expect(todayBerlin(new Date('2026-07-31T22:30:00.000Z'))).toBe('2026-08-01')
  })
})

describe('monthLabel', () => {
  it('renders the German month name', () => {
    expect(monthLabel('2026-08')).toBe('August 2026')
  })
})

describe('percentChange', () => {
  it('is signed and rounded, and null with nothing to compare against', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(10, 0)).toBeNull()
  })
})
