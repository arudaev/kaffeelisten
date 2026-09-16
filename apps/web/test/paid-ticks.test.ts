import { describe, expect, it } from 'vitest'
import { tickState } from '../src/lib/paidTicks'

describe('Bezahlt column cells', () => {
  it('shows no checkbox for a month without consumption', () => {
    expect(tickState(undefined)).toBe('none')
    expect(tickState({ paid: false, amount_cents: 0 })).toBe('none')
  })
  it('shows an open box when something is owed', () => {
    expect(tickState({ paid: false, amount_cents: 120 })).toBe('open')
  })
  it('keeps a tick visible even without consumption, so it can be undone', () => {
    expect(tickState({ paid: true, amount_cents: 0 })).toBe('paid')
  })
})
