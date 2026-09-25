import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import {
  computeCampusRollup,
  generateCampusRollupExcel,
  generateEmployeeListExcel,
  generateManifestExcel,
  generateMemberExcel,
} from '../api/_lib/excel'
import type { EnrichedTransaction, MemberSummary } from '../api/_lib/reportHtml'

function tx(o: Partial<EnrichedTransaction>): EnrichedTransaction {
  const price = o.price_cents ?? 50
  const qty = o.quantity ?? 1
  return {
    id: Math.random().toString(36).slice(2), member_id: 'm', company_id: 'c', item_id: 'i',
    quantity: qty, logged_at: '2026-08-05T09:15:00Z',
    member_name: 'Anna', work_email: 'anna@firma.de', company_name: 'EFCO',
    item_name: 'Espresso', item_category: 'coffee', unit_label: 'Tasse',
    price_cents: price, total_cents: price * qty,
    ...o,
  }
}

async function read(buf: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  return wb
}

// Data rows = all rows minus the header and the trailing Gesamt row.
function dataRowCount(ws: ExcelJS.Worksheet): number {
  return ws.actualRowCount - 2
}

function lastRowValues(ws: ExcelJS.Worksheet): unknown[] {
  return (ws.getRow(ws.actualRowCount).values as unknown[]).slice(1)
}

describe('generateMemberExcel', () => {
  it('lists the person’s own entries with a total', async () => {
    const entries = [tx({ quantity: 2, price_cents: 50 }), tx({ item_name: 'Cappuccino', price_cents: 70 })]
    const wb = await read(await generateMemberExcel(entries))
    const ws = wb.getWorksheet('Meine Einträge')!
    expect(dataRowCount(ws)).toBe(2)
    const total = lastRowValues(ws)
    expect(total[0]).toBe('Gesamt')
    expect(total[total.length - 1]).toBe(1.7) // 2×0,50 + 0,70
  })

  it('does not include other people’s columns', async () => {
    const wb = await read(await generateMemberExcel([tx({})]))
    const header = (wb.getWorksheet('Meine Einträge')!.getRow(1).values as unknown[]).slice(1)
    expect(header).not.toContain('Person')
    expect(header).not.toContain('E-Mail')
  })
})

describe('generateEmployeeListExcel', () => {
  const members: MemberSummary[] = [
    { member_id: 'a', member_name: 'Anna', work_email: 'anna@x.de', subtotal_cents: 170,
      entries: [tx({ member_id: 'a', quantity: 2, price_cents: 50 }), tx({ member_id: 'a', price_cents: 70 })] },
    { member_id: 'b', member_name: 'Ben', work_email: null, subtotal_cents: 50,
      entries: [tx({ member_id: 'b', member_name: 'Ben', price_cents: 50 })] },
  ]

  it('itemises every member’s entries, not just one row per person', async () => {
    const wb = await read(await generateEmployeeListExcel(members))
    const lines = wb.getWorksheet('Alle Einträge')!
    expect(dataRowCount(lines)).toBe(3)
  })

  it('line items sum to the same total as the per-person roll-up', async () => {
    const wb = await read(await generateEmployeeListExcel(members))
    const rollup = lastRowValues(wb.getWorksheet('Pro Person')!)
    const lines = lastRowValues(wb.getWorksheet('Alle Einträge')!)
    expect(rollup[rollup.length - 1]).toBe(2.2)
    expect(lines[lines.length - 1]).toBe(2.2)
  })
})

describe('generateManifestExcel', () => {
  it('flags a document whose PDF could not be produced instead of omitting it', async () => {
    const wb = await read(await generateManifestExcel([
      { kindLabel: 'Rechnung (Person)', documentNumber: 'K-000001', recipientName: 'Anna', recipientEmail: 'a@x.de',
        companyName: 'EFCO', netCents: 42, taxCents: 8, grossCents: 50, pdfFile: 'Rechnung-K-000001.pdf', xlsxFile: 'a.xlsx' },
      { kindLabel: 'Rechnung (Person)', documentNumber: 'K-000002', recipientName: 'Ben', recipientEmail: 'b@x.de',
        companyName: 'EFCO', netCents: 42, taxCents: 8, grossCents: 50, pdfFile: null, xlsxFile: 'b.xlsx' },
    ]))
    const ws = wb.getWorksheet('Versandte Dokumente')!
    expect(ws.actualRowCount).toBe(3)
    expect(String(ws.getRow(3).getCell(9).value)).toMatch(/^FEHLT/)
  })

  it('shows a dash rather than a blank for statements, which carry no number', async () => {
    const wb = await read(await generateManifestExcel([
      { kindLabel: 'Aufstellung (Person)', documentNumber: null, recipientName: 'Anna', recipientEmail: 'a@x.de',
        companyName: 'EFCO', netCents: null, taxCents: null, grossCents: 50, pdfFile: 'a.pdf', xlsxFile: 'a.xlsx' },
    ]))
    expect(wb.getWorksheet('Versandte Dokumente')!.getRow(2).getCell(2).value).toBe('—')
  })
})

describe('computeCampusRollup', () => {
  const current = [
    tx({ member_id: 'a', company_id: 'efco', company_name: 'EFCO', quantity: 3, price_cents: 50 }),
    tx({ member_id: 'b', member_name: 'Ben', company_id: 'efco', company_name: 'EFCO', item_name: 'Cappuccino', price_cents: 70 }),
    tx({ member_id: 'c', member_name: 'Cara', company_id: 'pbi', company_name: 'PBI', quantity: 2, price_cents: 50 }),
  ]
  const previous = [
    tx({ member_id: 'a', company_id: 'efco', company_name: 'EFCO', quantity: 1, price_cents: 50 }),
    tx({ member_id: 'z', company_id: 'gone', company_name: 'Level51', quantity: 4, price_cents: 50 }),
  ]
  const r = computeCampusRollup('2026-08', '2026-07', current, previous)

  it('counts items across the whole campus, most consumed first', () => {
    expect(r.items.map(i => [i.name, i.quantity, i.previousQuantity])).toEqual([
      ['Espresso', 5, 5],
      ['Cappuccino', 1, 0],
    ])
  })

  it('compares each company with the previous month', () => {
    const efco = r.companies.find(c => c.companyId === 'efco')!
    expect(efco).toMatchObject({ people: 2, entries: 2, totalCents: 220, previousTotalCents: 50 })
  })

  it('keeps a company that consumed last month but not this one, with zero people', () => {
    const level51 = r.companies.find(c => c.companyId === 'gone')!
    expect(level51).toMatchObject({ entries: 0, totalCents: 0, previousTotalCents: 200, people: 0 })
    expect(r.totals.companies).toBe(2) // only companies with consumption this month
  })

  it('totals the month and the one before', () => {
    expect(r.totals).toMatchObject({ entries: 3, quantity: 6, totalCents: 320, previousTotalCents: 250, people: 3 })
  })

  it('writes a workbook with overview, item, company and person sheets', async () => {
    const wb = await read(await generateCampusRollupExcel(r))
    expect(wb.worksheets.map(w => w.name)).toEqual(['Überblick', 'Pro Artikel', 'Pro Unternehmen', 'Pro Person'])
    expect(dataRowCount(wb.getWorksheet('Pro Artikel')!)).toBe(2)
  })
})
