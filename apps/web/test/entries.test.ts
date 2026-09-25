import { describe, expect, it } from 'vitest'
import { berlinMonthOf, monthFigures, toEntryRows } from '../src/lib/entries'
import type { DashboardData } from '../src/lib/adminApi'

const data: DashboardData = {
  members: [
    { id: 'max-1', name: 'Max', work_email: 'max1@efco.de', kind: 'person' },
    { id: 'max-2', name: 'Max', work_email: 'max2@pbi.de', kind: 'person' },
    { id: 'house', name: 'Sammelkonto', work_email: null, kind: 'house' },
  ],
  companies: [
    { id: 'efco', name: 'EFCO', active: true },
    { id: 'pbi', name: 'PBI', active: false },
    { id: '4p', name: '4process', active: true },
    { id: 'idle', name: 'Level51', active: true },
  ],
  // Cappuccino was repriced from 70 to 90.
  items: [{ id: 'cap', name: 'Cappuccino', price_cents: 90 }, { id: 'esp', name: 'Espresso', price_cents: 50 }],
  transactions: [
    { id: 't1', member_id: 'max-1', company_id: 'efco', item_id: 'cap', quantity: 2, unit_price_cents: 70, logged_at: '2026-08-10T08:00:00.000Z' },
    { id: 't2', member_id: 'max-2', company_id: 'pbi', item_id: 'esp', quantity: 1, unit_price_cents: null, logged_at: '2026-08-11T08:00:00.000Z' },
    // 00:30 on 1 September in Berlin — a September entry, though UTC says August.
    { id: 't3', member_id: 'house', company_id: '4p', item_id: 'esp', quantity: 3, unit_price_cents: 50, logged_at: '2026-08-31T22:30:00.000Z' },
  ],
}

describe('toEntryRows', () => {
  const rows = toEntryRows(data)

  it('uses the checkout price, falling back to the catalogue only for old rows', () => {
    expect(rows.find(r => r.id === 't1')!.total_cents).toBe(140) // 2 × 0,70, not 2 × 0,90
    expect(rows.find(r => r.id === 't2')!.total_cents).toBe(50)
  })

  it('assigns the Berlin calendar month', () => {
    expect(rows.find(r => r.id === 't3')!.month).toBe('2026-09')
  })

  it('names a company checkout account instead of showing it as a person', () => {
    expect(rows.find(r => r.id === 't3')).toMatchObject({ member_name: 'Sammelkonto', is_house: true })
  })

  it('keeps the name of a company that has since been deactivated', () => {
    expect(rows.find(r => r.id === 't2')!.company_name).toBe('PBI')
  })
})

describe('monthFigures', () => {
  const rows = toEntryRows(data)

  it('counts two people with the same name as two consumers', () => {
    expect(monthFigures(rows, '2026-08').consumers).toBe(2)
  })

  it('counts only companies that actually have entries', () => {
    expect(monthFigures(rows, '2026-08').companiesWithEntries).toBe(2) // not 4
  })

  it('does not count a house account as a consumer, but does count its company and entries', () => {
    const sep = monthFigures(rows, '2026-09')
    expect(sep).toMatchObject({ consumers: 0, companiesWithEntries: 1, entries: 1, quantity: 3, totalCents: 150 })
  })

  it('names the most consumed item by quantity', () => {
    expect(monthFigures(rows, '2026-08').topItem).toEqual({ name: 'Cappuccino', quantity: 2 })
  })

  it('is empty for a month with nothing in it', () => {
    expect(monthFigures(rows, '2026-07')).toMatchObject({ entries: 0, totalCents: 0, topItem: null })
  })
})

describe('berlinMonthOf', () => {
  it('handles winter time too', () => {
    expect(berlinMonthOf('2026-01-31T23:30:00.000Z')).toBe('2026-02')
  })
})

describe('monthFigures throughDay', () => {
  const rows = toEntryRows({
    ...data,
    transactions: [
      { id: 'a', member_id: 'max-1', company_id: 'efco', item_id: 'esp', quantity: 1, unit_price_cents: 50, logged_at: '2026-08-05T08:00:00.000Z' },
      { id: 'b', member_id: 'max-1', company_id: 'efco', item_id: 'esp', quantity: 1, unit_price_cents: 50, logged_at: '2026-08-25T08:00:00.000Z' },
    ],
  })

  it('compares only the same days of a month', () => {
    expect(monthFigures(rows, '2026-08').entries).toBe(2)
    expect(monthFigures(rows, '2026-08', { throughDay: 16 }).entries).toBe(1)
  })

  it('uses the Berlin day, so 23:30 UTC on the 16th counts as the 17th', () => {
    const late = toEntryRows({ ...data, transactions: [
      { id: 'c', member_id: 'max-1', company_id: 'efco', item_id: 'esp', quantity: 1, unit_price_cents: 50, logged_at: '2026-08-16T23:30:00.000Z' },
    ] })
    expect(monthFigures(late, '2026-08', { throughDay: 16 }).entries).toBe(0)
    expect(monthFigures(late, '2026-08', { throughDay: 17 }).entries).toBe(1)
  })
})
