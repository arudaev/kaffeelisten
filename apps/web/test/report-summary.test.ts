import { describe, expect, it } from 'vitest'
import { computeSummary, type EnrichedTransaction } from '../api/_lib/report'

function tx(o: Partial<EnrichedTransaction>): EnrichedTransaction {
  return {
    id: 'x', member_id: 'm', company_id: 'c', item_id: 'i',
    quantity: 1, logged_at: '2026-06-01T10:00:00Z',
    member_name: 'A', work_email: null, company_name: 'Co',
    item_name: 'Kaffee', item_category: 'coffee', unit_label: 'Tasse',
    price_cents: 100, total_cents: 100,
    ...o,
  }
}

describe('computeSummary', () => {
  it('groups by company then member and sums subtotals/totals', () => {
    const summaries = computeSummary([
      tx({ company_name: 'Alpha', member_name: 'Anna', total_cents: 300 }),
      tx({ company_name: 'Alpha', member_name: 'Anna', total_cents: 200 }),
      tx({ company_name: 'Alpha', member_name: 'Bert', total_cents: 100 }),
      tx({ company_name: 'Beta', member_name: 'Cara', total_cents: 50 }),
    ])

    // Alpha (600) outranks Beta (50).
    expect(summaries.map(s => s.company_name)).toEqual(['Alpha', 'Beta'])

    const alpha = summaries[0]
    expect(alpha.total_cents).toBe(600)
    expect(alpha.total_entries).toBe(3)
    // Members sorted by subtotal desc: Anna (500) before Bert (100).
    expect(alpha.members.map(m => [m.member_name, m.subtotal_cents])).toEqual([
      ['Anna', 500],
      ['Bert', 100],
    ])
  })

  it('carries the member work email onto the summary', () => {
    const [summary] = computeSummary([
      tx({ company_name: 'Co', member_name: 'Ida', work_email: 'ida@firma.de', total_cents: 100 }),
    ])
    expect(summary.members[0].work_email).toBe('ida@firma.de')
  })

  it('returns an empty array for no transactions', () => {
    expect(computeSummary([])).toEqual([])
  })
})
