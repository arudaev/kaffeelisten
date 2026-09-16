import { describe, expect, it } from 'vitest'
import { amountOf, mergeLiveAndArchive, unitPriceOf } from '../api/_lib/pricing'

describe('mergeLiveAndArchive', () => {
  it('counts a reported month once, though it sits in both tables until pruned', () => {
    // The real production shape on 2026-09-16: July was archived AND still live.
    const live = [{ id: 't1', item_id: 'espresso', quantity: 2, unit_price_cents: 50, logged_at: '2026-07-10T09:00:00Z' }]
    const archive = [{ id: 't1', item_id: 'espresso', quantity: 2, unit_price_cents: 50, report_month: '2026-07' }]
    const rows = mergeLiveAndArchive(live, archive)
    expect(rows).toHaveLength(1)
    expect(rows.reduce((s, r) => s + amountOf(r, new Map()), 0)).toBe(100) // not 200
  })

  it('prefers the archive copy, which fixed the month and price at reporting time', () => {
    const live = [{ id: 't1', item_id: 'x', quantity: 1, unit_price_cents: null, logged_at: '2026-07-31T23:30:00Z' }]
    const archive = [{ id: 't1', item_id: 'x', quantity: 1, unit_price_cents: 50, report_month: '2026-07' }]
    const [row] = mergeLiveAndArchive(live, archive)
    expect(row.month).toBe('2026-07')
    expect(row.unit_price_cents).toBe(50)
  })

  it('keeps live-only rows (the unreported current month) and archive-only rows (already pruned)', () => {
    const live = [{ id: 'sep', item_id: 'x', quantity: 1, logged_at: '2026-09-02T08:00:00Z' }]
    const archive = [{ id: 'may', item_id: 'x', quantity: 1, report_month: '2026-05' }]
    const months = mergeLiveAndArchive(live, archive).map(r => r.month).sort()
    expect(months).toEqual(['2026-05', '2026-09'])
  })
})

describe('unitPriceOf', () => {
  const catalogue = new Map([['cappuccino', 70]])

  it('prefers the snapshot taken at checkout', () => {
    expect(unitPriceOf({ item_id: 'cappuccino', quantity: 1, unit_price_cents: 50 }, catalogue)).toBe(50)
  })

  it('falls back to the catalogue for rows logged before the snapshot existed', () => {
    expect(unitPriceOf({ item_id: 'cappuccino', quantity: 1, unit_price_cents: null }, catalogue)).toBe(70)
    expect(unitPriceOf({ item_id: 'cappuccino', quantity: 1 }, catalogue)).toBe(70)
  })

  it('treats a snapshot of 0 as a real price, not a missing one', () => {
    // Heißes Wasser is free. A falsy check would wrongly re-price it from the catalogue.
    expect(unitPriceOf({ item_id: 'cappuccino', quantity: 1, unit_price_cents: 0 }, catalogue)).toBe(0)
  })

  it('returns 0 for an item missing from both', () => {
    expect(unitPriceOf({ item_id: 'gone', quantity: 1 }, new Map())).toBe(0)
  })
})

describe('amountOf', () => {
  it('a later price change does not move a snapshotted total', () => {
    const row = { item_id: 'cappuccino', quantity: 3, unit_price_cents: 70 }
    const before = amountOf(row, new Map([['cappuccino', 70]]))
    const afterPriceRise = amountOf(row, new Map([['cappuccino', 90]]))
    expect(before).toBe(210)
    expect(afterPriceRise).toBe(210)
  })

  it('an unsnapshotted row does follow the catalogue (the legacy behaviour, now confined to old rows)', () => {
    const row = { item_id: 'cappuccino', quantity: 3 }
    expect(amountOf(row, new Map([['cappuccino', 90]]))).toBe(270)
  })
})
