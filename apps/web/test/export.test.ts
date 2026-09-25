import { describe, expect, it } from 'vitest'
import {
  berlinDate,
  buildExportRows,
  describeFilters,
  exportCsv,
  parseExportQuery,
  queryWindow,
  type ExportLookups,
} from '../api/_lib/export'

const lookups: ExportLookups = {
  members: new Map([
    ['anna', { name: 'Anna Keller', work_email: 'anna@efco.de' }],
    ['ben', { name: 'Ben Fischer', work_email: null }],
  ]),
  companies: new Map([['efco', 'EFCO'], ['pbi', 'PBI']]),
  items: new Map([
    ['esp', { name: 'Espresso', unit_label: 'Tasse', category: 'coffee', price_cents: 60 }],
    ['cap', { name: 'Cappuccino', unit_label: 'Tasse', category: 'coffee', price_cents: 90 }],
  ]),
}

const live = (o: Record<string, unknown>) => ({
  id: 'x', member_id: 'anna', company_id: 'efco', item_id: 'esp', quantity: 1,
  unit_price_cents: 50, logged_at: '2026-08-10T09:00:00.000Z', ...o,
})
const archived = (o: Record<string, unknown>) => ({ ...live(o), report_month: '2026-07', ...o })

const all = { from: '2026-01-01', to: '2026-12-31' }

describe('buildExportRows', () => {
  it('reaches months that exist only in the archive', () => {
    const rows = buildExportRows([], [archived({ id: 'may', logged_at: '2026-05-04T08:00:00.000Z', report_month: '2026-05' })], lookups, all)
    expect(rows.map(r => r.id)).toEqual(['may'])
  })

  it('counts an entry present in both tables once', () => {
    const row = { id: 'both', logged_at: '2026-07-10T08:00:00.000Z' }
    const rows = buildExportRows([live(row)], [archived(row)], lookups, all)
    expect(rows).toHaveLength(1)
  })

  it('bills the snapshot price, and keeps the archived item name after a rename', () => {
    const [row] = buildExportRows(
      [],
      [archived({ id: 'a', item_id: 'esp', quantity: 2, unit_price_cents: 50, item_name: 'Espresso (alt)' })],
      lookups,
      all,
    )
    expect(row.price_cents).toBe(50) // not today's 60
    expect(row.total_cents).toBe(100)
    expect(row.item_name).toBe('Espresso (alt)')
  })

  it('filters by company, person and item independently and together', () => {
    const rows = [
      live({ id: '1', company_id: 'efco', member_id: 'anna', item_id: 'esp' }),
      live({ id: '2', company_id: 'efco', member_id: 'anna', item_id: 'cap' }),
      live({ id: '3', company_id: 'pbi', member_id: 'ben', item_id: 'esp' }),
    ]
    const ids = (f: object) => buildExportRows(rows, [], lookups, { ...all, ...f }).map(r => r.id)
    expect(ids({ companyId: 'pbi' })).toEqual(['3'])
    expect(ids({ memberId: 'anna' })).toEqual(['1', '2'])
    expect(ids({ itemId: 'esp' })).toEqual(['1', '3'])
    expect(ids({ companyId: 'efco', itemId: 'cap' })).toEqual(['2'])
  })

  it('applies the date range on the Berlin calendar day, not the UTC one', () => {
    // 23:30 UTC on 31 July is 01:30 on 1 August in Berlin (summer time).
    const lateNight = live({ id: 'late', logged_at: '2026-07-31T23:30:00.000Z' })
    expect(buildExportRows([lateNight], [], lookups, { from: '2026-08-01', to: '2026-08-31' }).map(r => r.id)).toEqual(['late'])
    expect(buildExportRows([lateNight], [], lookups, { from: '2026-07-01', to: '2026-07-31' })).toEqual([])
  })

  it('returns entries oldest first', () => {
    const rows = buildExportRows(
      [live({ id: 'b', logged_at: '2026-08-20T08:00:00.000Z' }), live({ id: 'a', logged_at: '2026-08-02T08:00:00.000Z' })],
      [],
      lookups,
      all,
    )
    expect(rows.map(r => r.id)).toEqual(['a', 'b'])
  })
})

describe('berlinDate / queryWindow', () => {
  it('converts across midnight in winter and summer time', () => {
    expect(berlinDate('2026-01-31T23:30:00.000Z')).toBe('2026-02-01') // UTC+1
    expect(berlinDate('2026-07-31T21:59:00.000Z')).toBe('2026-07-31') // UTC+2
    expect(berlinDate('2026-07-31T22:00:00.000Z')).toBe('2026-08-01')
  })

  it('pads the database window so no Berlin day is cut off', () => {
    const w = queryWindow({ from: '2026-08-01', to: '2026-08-31' })
    expect(w.gte <= '2026-07-31T22:00:00.000Z').toBe(true)
    expect(w.lt > '2026-08-31T22:00:00.000Z').toBe(true)
  })
})

describe('parseExportQuery', () => {
  it('accepts a valid range and format', () => {
    const r = parseExportQuery({ from: '2026-08-01', to: '2026-08-31', format: 'xlsx', company_id: 'efco' })
    expect(r).toEqual({ format: 'xlsx', filters: { from: '2026-08-01', to: '2026-08-31', companyId: 'efco', memberId: undefined, itemId: undefined } })
  })

  it('rejects a missing or malformed range, a reversed range and an unknown format', () => {
    expect(parseExportQuery({ to: '2026-08-31' })).toHaveProperty('error')
    expect(parseExportQuery({ from: '01.08.2026', to: '2026-08-31' })).toHaveProperty('error')
    expect(parseExportQuery({ from: '2026-09-01', to: '2026-08-31' })).toHaveProperty('error')
    expect(parseExportQuery({ from: '2026-08-01', to: '2026-08-31', format: 'docx' })).toHaveProperty('error')
  })
})

describe('exportCsv', () => {
  it('starts with a BOM, uses semicolons and German decimal commas', () => {
    const csv = exportCsv(buildExportRows([live({ quantity: 3, unit_price_cents: 70 })], [], lookups, all))
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('"0,70";"2,10"')
  })

  it('neutralises a formula smuggled in through a name', () => {
    const evil: ExportLookups = { ...lookups, members: new Map([['anna', { name: '=HYPERLINK("http://x")', work_email: null }]]) }
    const csv = exportCsv(buildExportRows([live({})], [], evil, all))
    expect(csv).toContain(`"'=HYPERLINK`)
  })
})

describe('describeFilters', () => {
  it('names the scope for the file and the document header', () => {
    expect(describeFilters({ from: '2026-08-01', to: '2026-08-31', companyId: 'efco', itemId: 'cap' }, lookups))
      .toBe('2026-08-01 bis 2026-08-31 · EFCO · Cappuccino')
  })
})
