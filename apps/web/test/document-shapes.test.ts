import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { aggregateLines, summariseItems } from '../api/_lib/lines'
import {
  buildCompanyDocumentHtml,
  buildEmployeeListHtml,
  buildMemberStatementHtml,
  type EnrichedTransaction,
  type InvoiceRender,
  type MemberSummary,
} from '../api/_lib/reportHtml'
import { generateCompanyItemsExcel, generateEmployeeListExcel } from '../api/_lib/excel'

// ITC1 feedback (2026-09-16): emails must stay short and the Excel keeps every
// single entry. 2026-09-17: a paying company's invoice is the full amount only;
// who consumed what is a separate Verzehrliste, sent only on request.

let seq = 0
const invoice: InvoiceRender = {
  documentNumber: 'K-000001', issuerLegalName: 'ITC1 GmbH', issuerAddress: null, issuerVatId: 'DE1',
  issuerIban: 'DE33741500000380009340', issuerBic: 'BYLADEM1DEG', paymentTerms: null, vatRate: 19,
  netCents: 0, taxCents: 0, grossCents: 0,
}
function tx(o: Partial<EnrichedTransaction> = {}): EnrichedTransaction {
  const price = o.price_cents ?? 50
  const qty = o.quantity ?? 1
  return {
    id: `t${++seq}`, member_id: 'm1', company_id: 'c', item_id: 'espresso', quantity: qty,
    logged_at: `2026-08-${String((seq % 27) + 1).padStart(2, '0')}T09:15:00Z`,
    member_name: 'Anna Keller', work_email: 'anna@example.com', company_name: 'PartSpace',
    item_name: 'Espresso', item_category: 'coffee', unit_label: 'Tasse',
    price_cents: price, total_cents: price * qty,
    ...o,
  }
}

function member(id: string, name: string, entries: EnrichedTransaction[]): MemberSummary {
  const own = entries.map(e => ({ ...e, member_id: id, member_name: name }))
  return { member_id: id, member_name: name, work_email: `${id}@example.com`, entries: own, subtotal_cents: own.reduce((s, e) => s + e.total_cents, 0) }
}

describe('aggregateLines', () => {
  it('sums per item and keeps a mid-month price change as two lines', () => {
    const lines = aggregateLines([
      tx(), tx(), tx({ quantity: 2 }),
      tx({ item_id: 'cap', item_name: 'Cappuccino', price_cents: 70 }),
      tx({ item_id: 'cap', item_name: 'Cappuccino', price_cents: 80 }),
    ])
    expect(lines).toEqual([
      { itemName: 'Espresso', unitLabel: 'Tasse', unitPriceCents: 50, quantity: 4, totalCents: 200 },
      { itemName: 'Cappuccino', unitLabel: 'Tasse', unitPriceCents: 80, quantity: 1, totalCents: 80 },
      { itemName: 'Cappuccino', unitLabel: 'Tasse', unitPriceCents: 70, quantity: 1, totalCents: 70 },
    ])
  })

  it('keeps a free item as a zero line rather than dropping it', () => {
    const lines = aggregateLines([tx({ item_id: 'water', item_name: 'Heißes Wasser', price_cents: 0 })])
    expect(lines).toEqual([{ itemName: 'Heißes Wasser', unitLabel: 'Tasse', unitPriceCents: 0, quantity: 1, totalCents: 0 }])
  })

  it('summarises as "2× Cappuccino · 1× Americano"', () => {
    expect(summariseItems([
      tx({ item_name: 'Americano' }),
      tx({ item_name: 'Cappuccino' }),
      tx({ item_name: 'Cappuccino' }),
    ])).toBe('2× Cappuccino · 1× Americano')
  })
})

describe('member document', () => {
  it('shows one line per item, not one row per coffee with its date', () => {
    const entries = Array.from({ length: 40 }, () => tx())
    const html = buildMemberStatementHtml('Anna Keller', entries, 'August 2026')
    expect(html.match(/>Espresso</g)).toHaveLength(1)
    expect(html).toContain('>40<')
    expect(html).toContain('€ 20,00')
    expect(html).not.toMatch(/\d{2}\.08\.2026/)
  })

  it('points to the Excel only on an invoice, which is the only document that has one', () => {
    expect(buildMemberStatementHtml('Anna Keller', [tx()], 'August 2026')).not.toContain('Excel')
    expect(buildMemberStatementHtml('Anna Keller', [tx()], 'August 2026', { invoice })).toContain('Excel-Datei')
  })
})

describe('company document', () => {
  const people = Array.from({ length: 20 }, (_, i) =>
    member(`m${i}`, `Person ${String(i).padStart(2, '0')}`, [tx({ quantity: i + 1 }), tx({ item_id: 'cap', item_name: 'Cappuccino', price_cents: 70 })]),
  )
  const total = people.reduce((s, p) => s + p.subtotal_cents, 0)
  const euro = (cents: number) => `€ ${(cents / 100).toFixed(2).replace('.', ',')}`

  it('a paying company\'s invoice is the full amount by item and names no employee', () => {
    const html = buildCompanyDocumentHtml('PartSpace', 'Finance', people, 'August 2026', { invoice })
    expect(people.filter(p => html.includes(p.member_name))).toEqual([])
    expect(html).toContain('>Espresso<')
    expect(html).toContain('>Cappuccino<')
    expect(html).toContain(euro(total))
    expect(html).toContain('IBAN')
    expect(html).not.toContain('Verzehrliste')
  })

  it('points to the Verzehrliste only when the company asked for it', () => {
    const html = buildCompanyDocumentHtml('PartSpace', 'Finance', people, 'August 2026', { invoice, employeeList: true })
    expect(html).toContain('Verzehrliste je Person liegt als eigenes Dokument bei')
    expect(people.filter(p => html.includes(p.member_name))).toEqual([])
  })

  it('a paying company\'s statement also names no one, unless the list was requested', () => {
    const plain = buildCompanyDocumentHtml('PartSpace', 'Finance', people, 'August 2026', {})
    expect(people.filter(p => plain.includes(p.member_name))).toEqual([])
    expect(plain).not.toContain('PDF')
    const withList = buildCompanyDocumentHtml('PartSpace', 'Finance', people, 'August 2026', { employeeList: true })
    expect(people.filter(p => withList.includes(`>${p.member_name}<`))).toHaveLength(people.length)
  })

  it('a company whose people pay for themselves gets an overview per person', () => {
    const html = buildCompanyDocumentHtml('EFCO', 'Eva', people, 'August 2026', { layout: 'people' })
    expect(people.filter(p => html.includes(`>${p.member_name}<`))).toHaveLength(people.length)
    expect(html).toContain('Jede Person erh&auml;lt ihre eigene Abrechnung')
  })

  it('the Verzehrliste lists every person with their own item lines and is no invoice', () => {
    const html = buildEmployeeListHtml('PartSpace', people, 'August 2026', { invoiceNumber: 'K-000001' })
    for (const p of people) {
      expect(html.split(`>${p.member_name}<`).length - 1).toBeGreaterThanOrEqual(2) // summary row + detail heading
    }
    expect(html).toContain(euro(total))
    expect(html).toContain('Rechnung Nr. K-000001 und ist selbst keine Rechnung')
    expect(html).not.toContain('IBAN')
  })

  it('labels the shared house account instead of a fictional person', () => {
    const house = member('h', '4process', [tx({ member_kind: 'house' })])
    expect(buildEmployeeListHtml('4process', [house], 'August 2026')).toContain('Sammelkonto (Firma)')
  })
})

describe('company Excel', () => {
  const people = [
    member('a', 'Anna', [tx(), tx(), tx({ item_id: 'cap', item_name: 'Cappuccino', price_cents: 70 })]),
    member('b', 'Ben', [tx({ quantity: 3 })]),
  ]

  it('the invoice Excel has items and every entry, without names', async () => {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await generateCompanyItemsExcel(people))
    expect(wb.worksheets.map(w => w.name)).toEqual(['Artikel', 'Alle Einträge'])
    const items = wb.getWorksheet('Artikel')!
    const rows = items.getRows(2, items.actualRowCount - 2)!.map(r => (r.values as unknown[]).slice(1))
    expect(rows).toEqual([
      ['Espresso', 5, 0.5, 2.5],
      ['Cappuccino', 1, 0.7, 0.7],
    ])
    const text = JSON.stringify(wb.worksheets.map(w => w.getSheetValues()))
    expect(text).not.toContain('Anna')
    expect(text).not.toContain('Ben')
  })

  it('the Verzehrliste Excel: per-person × item sheet sums to the company total', async () => {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await generateEmployeeListExcel(people))
    expect(wb.worksheets.map(w => w.name)).toEqual(['Pro Person', 'Pro Person × Artikel', 'Alle Einträge'])
    const ws = wb.getWorksheet('Pro Person × Artikel')!
    const rows = ws.getRows(2, ws.actualRowCount - 2)!.map(r => (r.values as unknown[]).slice(1))
    expect(rows).toEqual([
      ['Anna', 'Espresso', 2, 0.5, 1],
      ['Anna', 'Cappuccino', 1, 0.7, 0.7],
      ['Ben', 'Espresso', 3, 0.5, 1.5],
    ])
    const last = (ws.getRow(ws.actualRowCount).values as unknown[]).slice(1)
    expect(last[4]).toBeCloseTo(3.2)
  })
})
