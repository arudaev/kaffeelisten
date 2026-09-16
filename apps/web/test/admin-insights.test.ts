import { describe, expect, it } from 'vitest'
import { RESTOCK_LIMIT, computeAdminInsights } from '../api/_lib/adminInsights'
import type { CampusRollup } from '../api/_lib/excel'

const rollup: CampusRollup = {
  month: '2026-09',
  previousMonth: '2026-08',
  items: Array.from({ length: RESTOCK_LIMIT + 2 }, (_, i) => ({
    name: `Artikel ${i}`, category: 'coffee', quantity: 20 - i, totalCents: (20 - i) * 50, previousQuantity: 10,
  })).concat([{ name: 'Nur Vormonat', category: 'coffee', quantity: 0, totalCents: 0, previousQuantity: 4 }]),
  companies: [],
  people: [],
  totals: { entries: 30, quantity: 30, totalCents: 1500, previousTotalCents: 1200, people: 7, companies: 3 },
}

describe('admin insights', () => {
  it('lists the most-consumed items for restocking, capped, never items unused this month', () => {
    const i = computeAdminInsights({ rollup, skipped: [], failedDeliveries: 0, missingFiles: 0, archiveNotSent: false })
    expect(i.restock).toHaveLength(RESTOCK_LIMIT)
    expect(i.restock[0]).toEqual({ name: 'Artikel 0', quantity: 20, previousQuantity: 10 })
    expect(i.restock.some(r => r.name === 'Nur Vormonat')).toBe(false)
    expect(i).toMatchObject({ totalCents: 1500, previousTotalCents: 1200, activePeople: 7, warnings: [] })
  })

  it('turns silent gaps into warnings the administration can act on', () => {
    const i = computeAdminInsights({
      rollup,
      skipped: [
        { recipient: 'company', id: 'c', name: 'PBI', reason: 'no_billing_contact' },
        { recipient: 'member', id: 'h', name: '4process', reason: 'house_account' },
      ],
      failedDeliveries: 2,
      missingFiles: 1,
      archiveNotSent: true,
    })
    expect(i.warnings).toEqual([
      expect.stringContaining('PBI: Firma zahlt, aber es ist keine Rechnungs-E-Mail hinterlegt'),
      expect.stringContaining('2 Dokumente konnten nicht zugestellt werden'),
      expect.stringContaining('1 Anhang fehlt'),
      expect.stringContaining('keine E-Mail-Adresse der Geschäftsführung'),
    ])
  })
})

describe('campus roll-up people count', () => {
  it('does not count a shared company account as a person', async () => {
    const { computeCampusRollup } = await import('../api/_lib/excel')
    const base = {
      company_id: 'c', item_id: 'i', quantity: 1, logged_at: '2026-09-02T09:00:00Z', work_email: null,
      company_name: '4process', item_name: 'Espresso', item_category: 'coffee', unit_label: 'Tasse', price_cents: 50, total_cents: 50,
    }
    const r = computeCampusRollup('2026-09', '2026-08', [
      { ...base, id: '1', member_id: 'house', member_name: '4process', member_kind: 'house' as const },
      { ...base, id: '2', member_id: 'anna', member_name: 'Anna' },
    ], [])
    expect(r.totals.people).toBe(1)
  })
})
