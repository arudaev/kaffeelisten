// Every Excel workbook the app produces, sharing one look.
//
// generateExcel and generateLedgerExcel moved here from report.ts with the same
// sheets and columns; the only visible change is a Gesamt row under the admin
// workbook's "Alle Einträge" sheet, which now shares the line-item builder. The
// per-person, per-company, manifest and campus roll-up workbooks were added for
// the phase-3 document matrix, where every document carries a PDF and an Excel.

import ExcelJS from 'exceljs'
import { formatDate, type CompanySummary, type EnrichedTransaction, type MemberSummary } from './reportHtml'
import { aggregateLines } from './lines'

const AMBER      = 'FFD97706'
const AMBER_DARK = 'FFB45309'
const AMBER_50   = 'FFFFFBEB'
const STONE_200  = 'FFE7E5E4'
const STONE_50   = 'FFFAFAF9'
const WHITE      = 'FFFFFFFF'

const EURO = '#,##0.00 "€"'

type Fill = ExcelJS.Fill
type Font = Partial<ExcelJS.Font>

const headerFill: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER },     bgColor: { argb: WHITE } }
const altFill:    Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STONE_50 },  bgColor: { argb: WHITE } }
const totalFill:  Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_50 },  bgColor: { argb: WHITE } }

const headerFont: Font = { bold: true, color: { argb: WHITE },     size: 11 }
const totalFont:  Font = { bold: true, color: { argb: AMBER_DARK }, size: 11 }

const rowBorder: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: STONE_200 } },
}

function newWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Kaffeelisten'
  wb.created = new Date()
  return wb
}

async function toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer())
}

const euros = (cents: number) => Number((cents / 100).toFixed(2))

function addReportWorksheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  // Excel desktop can collapse custom row heights when sheetViews is omitted.
  return wb.addWorksheet(name, { views: [{ state: 'normal' }] })
}

function styleHeaderRow(row: ExcelJS.Row, colCount: number): void {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i)
    cell.fill      = headerFill
    cell.font      = headerFont
    cell.alignment = { vertical: 'middle', wrapText: false }
    cell.border    = { bottom: { style: 'medium', color: { argb: AMBER_DARK } } }
  }
  row.height = 22
}

function styleTotalRow(row: ExcelJS.Row, colCount: number): void {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i)
    cell.fill   = totalFill
    cell.font   = totalFont
    cell.border = { top: { style: 'medium', color: { argb: AMBER } } }
  }
  row.height = 20
}

// A data row with zebra striping, a bottom rule, and money/right-aligned columns.
function styleBodyRow(
  row: ExcelJS.Row,
  index: number,
  colCount: number,
  opts: { money?: number[]; right?: number[]; center?: number[] } = {},
): void {
  if (index % 2 === 1) for (let j = 1; j <= colCount; j++) row.getCell(j).fill = altFill
  for (const j of opts.money ?? []) {
    row.getCell(j).numFmt = EURO
    row.getCell(j).alignment = { horizontal: 'right' }
  }
  for (const j of opts.right ?? []) row.getCell(j).alignment = { horizontal: 'right' }
  for (const j of opts.center ?? []) row.getCell(j).alignment = { horizontal: 'center' }
  for (let j = 1; j <= colCount; j++) row.getCell(j).border = rowBorder
  row.height = 18
}

function alignHeader(row: ExcelJS.Row, opts: { right?: number[]; center?: number[] }): void {
  for (const j of opts.right ?? []) row.getCell(j).alignment = { horizontal: 'right', vertical: 'middle' }
  for (const j of opts.center ?? []) row.getCell(j).alignment = { horizontal: 'center', vertical: 'middle' }
}

function styleMoneyTotal(row: ExcelJS.Row, colCount: number, money: number[], center: number[] = []): void {
  styleTotalRow(row, colCount)
  for (const j of money) {
    row.getCell(j).numFmt = EURO
    row.getCell(j).alignment = { horizontal: 'right' }
  }
  for (const j of center) row.getCell(j).alignment = { horizontal: 'center' }
}

// Berlin wall-clock time. The server runs in UTC, so without the zone a 10:00
// coffee printed as 08:00.
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })

// ─── Admin workbook: the monthly campus report ────────────────────────────────

export async function generateExcel(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
): Promise<Buffer> {
  const wb = newWorkbook()

  // ── Sheet 1: Zusammenfassung ──────────────────────────────────────────────
  const ws1 = addReportWorksheet(wb, 'Zusammenfassung')
  ws1.columns = [
    { key: 'company', width: 34 },
    { key: 'entries', width: 14 },
    { key: 'total',   width: 20 },
  ]

  const hdr1 = ws1.addRow(['Unternehmen', 'Einträge', 'Gesamtbetrag'])
  styleHeaderRow(hdr1, 3)
  alignHeader(hdr1, { center: [2], right: [3] })

  summaries.forEach((c, i) => {
    const row = ws1.addRow([c.company_name, c.total_entries, euros(c.total_cents)])
    styleBodyRow(row, i, 3, { money: [3], center: [2] })
  })

  const tot1 = ws1.addRow([
    'Gesamt',
    summaries.reduce((s, c) => s + c.total_entries, 0),
    euros(summaries.reduce((s, c) => s + c.total_cents, 0)),
  ])
  styleMoneyTotal(tot1, 3, [3], [2])

  // ── Sheet 2: Pro Unternehmen ──────────────────────────────────────────────
  const ws2 = addReportWorksheet(wb, 'Pro Unternehmen')
  ws2.columns = [
    { key: 'company', width: 26 },
    { key: 'person',  width: 26 },
    { key: 'email',   width: 32 },
    { key: 'entries', width: 12 },
    { key: 'total',   width: 18 },
  ]

  const hdr2 = ws2.addRow(['Unternehmen', 'Person', 'E-Mail', 'Einträge', 'Betrag'])
  styleHeaderRow(hdr2, 5)
  alignHeader(hdr2, { center: [4], right: [5] })

  let rowIdx = 0
  summaries.forEach(company => {
    company.members.forEach(member => {
      const row = ws2.addRow([
        company.company_name,
        member.member_name,
        member.work_email ?? '',
        member.entries.length,
        euros(member.subtotal_cents),
      ])
      styleBodyRow(row, rowIdx++, 5, { money: [5], center: [4] })
    })
    const sub = ws2.addRow([`${company.company_name} — Gesamt`, '', '', company.total_entries, euros(company.total_cents)])
    styleMoneyTotal(sub, 5, [5], [4])
    rowIdx++
  })

  // ── Sheet 3: Alle Einträge ────────────────────────────────────────────────
  addLineItemSheet(wb, 'Alle Einträge', transactions, { withPerson: true, withCompany: true })

  return toBuffer(wb)
}

// Every entry, one row each. Shared by the admin, per-company and export workbooks.
function addLineItemSheet(
  wb: ExcelJS.Workbook,
  name: string,
  transactions: EnrichedTransaction[],
  opts: { withPerson: boolean; withCompany: boolean },
): ExcelJS.Worksheet {
  const ws = addReportWorksheet(wb, name)
  const cols: { header: string; key: string; width: number }[] = [
    { header: 'Datum', key: 'date', width: 13 },
    { header: 'Uhrzeit', key: 'time', width: 9 },
  ]
  if (opts.withPerson) {
    cols.push({ header: 'Person', key: 'person', width: 26 }, { header: 'E-Mail', key: 'email', width: 32 })
  }
  if (opts.withCompany) cols.push({ header: 'Unternehmen', key: 'company', width: 26 })
  cols.push(
    { header: 'Artikel', key: 'item', width: 26 },
    { header: 'Kategorie', key: 'category', width: 14 },
    { header: 'Menge', key: 'quantity', width: 9 },
    { header: 'Einzelpreis', key: 'unit_price', width: 16 },
    { header: 'Betrag', key: 'total', width: 14 },
  )
  ws.columns = cols.map(({ key, width }) => ({ key, width }))

  const n = cols.length
  const qty = n - 2
  const unit = n - 1
  const total = n

  const hdr = ws.addRow(cols.map(c => c.header))
  styleHeaderRow(hdr, n)
  alignHeader(hdr, { right: [qty, unit, total] })

  transactions.forEach((t, i) => {
    const values: (string | number)[] = [formatDate(t.logged_at), timeOf(t.logged_at)]
    if (opts.withPerson) values.push(t.member_name, t.work_email ?? '')
    if (opts.withCompany) values.push(t.company_name)
    values.push(t.item_name, t.item_category, t.quantity, euros(t.price_cents), euros(t.total_cents))
    styleBodyRow(ws.addRow(values), i, n, { money: [unit, total], right: [qty] })
  })

  const totalRow = new Array<string | number>(n).fill('')
  totalRow[0] = 'Gesamt'
  totalRow[qty - 1] = transactions.reduce((s, t) => s + t.quantity, 0)
  totalRow[total - 1] = euros(transactions.reduce((s, t) => s + t.total_cents, 0))
  const tot = ws.addRow(totalRow)
  styleMoneyTotal(tot, n, [total])
  tot.getCell(qty).alignment = { horizontal: 'right' }

  return ws
}

// ─── Per-recipient workbooks ──────────────────────────────────────────────────

/** A person's own entries for the month — attached to their invoice, statement or info copy. */
export async function generateMemberExcel(entries: EnrichedTransaction[]): Promise<Buffer> {
  const wb = newWorkbook()
  addLineItemSheet(wb, 'Meine Einträge', entries, { withPerson: false, withCompany: false })
  return toBuffer(wb)
}

/**
 * A company's month: a per-person roll-up plus every member's individual entries.
 * The line items are the point — the company document's HTML shows only one row
 * per person, which is not enough for a company to check what it is paying for.
 */
export async function generateCompanyExcel(members: MemberSummary[]): Promise<Buffer> {
  const wb = newWorkbook()

  const ws = addReportWorksheet(wb, 'Pro Person')
  ws.columns = [
    { key: 'person',  width: 28 },
    { key: 'email',   width: 32 },
    { key: 'entries', width: 12 },
    { key: 'total',   width: 18 },
  ]
  const hdr = ws.addRow(['Person', 'E-Mail', 'Einträge', 'Betrag'])
  styleHeaderRow(hdr, 4)
  alignHeader(hdr, { center: [3], right: [4] })
  members.forEach((m, i) => {
    const row = ws.addRow([m.member_name, m.work_email ?? '', m.entries.length, euros(m.subtotal_cents)])
    styleBodyRow(row, i, 4, { money: [4], center: [3] })
  })
  const tot = ws.addRow([
    'Gesamt', '',
    members.reduce((s, m) => s + m.entries.length, 0),
    euros(members.reduce((s, m) => s + m.subtotal_cents, 0)),
  ])
  styleMoneyTotal(tot, 4, [4], [3])

  // One row per person, item and price: what each person consumed, summed.
  const pi = addReportWorksheet(wb, 'Pro Person × Artikel')
  pi.columns = [
    { key: 'person', width: 28 },
    { key: 'item', width: 30 },
    { key: 'quantity', width: 10 },
    { key: 'unit', width: 14 },
    { key: 'total', width: 14 },
  ]
  const piHdr = pi.addRow(['Person', 'Artikel', 'Menge', 'Einzelpreis', 'Betrag'])
  styleHeaderRow(piHdr, 5)
  alignHeader(piHdr, { right: [3, 4, 5] })
  let piIndex = 0
  for (const m of members) {
    const label = m.entries[0]?.member_kind === 'house' ? 'Sammelkonto (Firma)' : m.member_name
    for (const line of aggregateLines(m.entries)) {
      styleBodyRow(pi.addRow([label, line.itemName, line.quantity, euros(line.unitPriceCents), euros(line.totalCents)]), piIndex++, 5, { money: [4, 5], right: [3] })
    }
  }
  const piTot = pi.addRow([
    'Gesamt', '',
    members.reduce((s, m) => s + m.entries.reduce((q, e) => q + e.quantity, 0), 0),
    '',
    euros(members.reduce((s, m) => s + m.subtotal_cents, 0)),
  ])
  styleMoneyTotal(piTot, 5, [5])

  const allEntries = members
    .flatMap(m => m.entries)
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  addLineItemSheet(wb, 'Alle Einträge', allEntries, { withPerson: true, withCompany: false })

  return toBuffer(wb)
}

// ─── Invoice ledger (kept for the invoice-only views) ─────────────────────────

export interface LedgerDoc {
  documentNumber: string
  recipientName: string
  recipientEmail: string
  netCents: number
  taxCents: number
  grossCents: number
}

// Compact invoice ledger sheet (Nr., recipient, net/VAT/gross).
export async function generateLedgerExcel(docs: LedgerDoc[]): Promise<Buffer> {
  const wb = newWorkbook()
  const ws = addReportWorksheet(wb, 'Rechnungen')
  ws.columns = [
    { key: 'nr', width: 16 },
    { key: 'name', width: 28 },
    { key: 'email', width: 32 },
    { key: 'net', width: 16 },
    { key: 'vat', width: 14 },
    { key: 'gross', width: 16 },
  ]
  const hdr = ws.addRow(['Rechnungsnr.', 'Empfänger', 'E-Mail', 'Netto', 'USt', 'Brutto'])
  styleHeaderRow(hdr, 6)
  alignHeader(hdr, { right: [4, 5, 6] })
  docs.forEach((d, i) => {
    const row = ws.addRow([
      d.documentNumber, d.recipientName, d.recipientEmail,
      euros(d.netCents), euros(d.taxCents), euros(d.grossCents),
    ])
    styleBodyRow(row, i, 6, { money: [4, 5, 6] })
  })
  const tot = ws.addRow([
    'Gesamt', '', '',
    euros(docs.reduce((s, d) => s + d.netCents, 0)),
    euros(docs.reduce((s, d) => s + d.taxCents, 0)),
    euros(docs.reduce((s, d) => s + d.grossCents, 0)),
  ])
  styleMoneyTotal(tot, 6, [4, 5, 6])
  return toBuffer(wb)
}

// ─── Delivery manifest (the CEO archive's table of contents) ──────────────────

export interface ManifestRow {
  kindLabel: string
  documentNumber: string | null
  recipientName: string
  recipientEmail: string
  companyName: string
  netCents: number | null
  taxCents: number | null
  grossCents: number
  pdfFile: string | null     // null → no PDF (failed, or an email-only document)
  xlsxFile: string | null
  // false for statements and information copies, which are sent as email only.
  attachmentsExpected?: boolean
}

/**
 * One row per document sent this month, in both invoice and statement mode.
 * A document whose PDF could not be rendered still appears — flagged — so the
 * archive can never silently omit something that was actually delivered.
 */
export async function generateManifestExcel(rows: ManifestRow[]): Promise<Buffer> {
  const wb = newWorkbook()
  const ws = addReportWorksheet(wb, 'Versandte Dokumente')
  ws.columns = [
    { key: 'kind', width: 22 },
    { key: 'nr', width: 16 },
    { key: 'name', width: 28 },
    { key: 'email', width: 32 },
    { key: 'company', width: 24 },
    { key: 'net', width: 14 },
    { key: 'vat', width: 12 },
    { key: 'gross', width: 14 },
    { key: 'pdf', width: 40 },
    { key: 'xlsx', width: 40 },
  ]
  const hdr = ws.addRow(['Dokument', 'Rechnungsnr.', 'Empfänger', 'E-Mail', 'Unternehmen', 'Netto', 'USt', 'Brutto', 'PDF', 'Excel'])
  styleHeaderRow(hdr, 10)
  alignHeader(hdr, { right: [6, 7, 8] })
  rows.forEach((r, i) => {
    const row = ws.addRow([
      r.kindLabel,
      r.documentNumber ?? '—',
      r.recipientName,
      r.recipientEmail,
      r.companyName,
      r.netCents === null ? '' : euros(r.netCents),
      r.taxCents === null ? '' : euros(r.taxCents),
      euros(r.grossCents),
      r.pdfFile ?? (r.attachmentsExpected === false ? '– (nur E-Mail)' : 'FEHLT – PDF konnte nicht erstellt werden'),
      r.xlsxFile ?? (r.attachmentsExpected === false ? '– (nur E-Mail)' : 'FEHLT – Excel konnte nicht erstellt werden'),
    ])
    styleBodyRow(row, i, 10, { money: [6, 7, 8] })
    for (const [col, file] of [[9, r.pdfFile], [10, r.xlsxFile]] as const) {
      if (file === null && r.attachmentsExpected !== false) row.getCell(col).font = { bold: true, color: { argb: 'FFB91C1C' } }
    }
  })
  return toBuffer(wb)
}

// ─── Campus roll-up (administrative overview for ITC1) ────────────────────────

export interface CampusRollup {
  month: string
  previousMonth: string
  items: { name: string; category: string; quantity: number; totalCents: number; previousQuantity: number }[]
  companies: { companyId: string; name: string; people: number; entries: number; totalCents: number; previousTotalCents: number }[]
  people: { memberId: string; name: string; companyName: string; entries: number; quantity: number; totalCents: number }[]
  totals: { entries: number; quantity: number; totalCents: number; previousTotalCents: number; people: number; companies: number }
}

/**
 * Pure aggregation for the administrative roll-up: what was consumed, by which
 * company and person, and how the month compares with the one before.
 * `previous` must already be priced (snapshot first), or the comparison drifts
 * whenever an item is repriced.
 */
export function computeCampusRollup(
  month: string,
  previousMonth: string,
  current: readonly EnrichedTransaction[],
  previous: readonly EnrichedTransaction[],
): CampusRollup {
  const items = new Map<string, CampusRollup['items'][number]>()
  const itemKey = (t: EnrichedTransaction) => `${t.item_name}\u0000${t.item_category}`
  for (const t of current) {
    const it = items.get(itemKey(t)) ?? { name: t.item_name, category: t.item_category, quantity: 0, totalCents: 0, previousQuantity: 0 }
    it.quantity += t.quantity
    it.totalCents += t.total_cents
    items.set(itemKey(t), it)
  }
  for (const t of previous) {
    const it = items.get(itemKey(t)) ?? { name: t.item_name, category: t.item_category, quantity: 0, totalCents: 0, previousQuantity: 0 }
    it.previousQuantity += t.quantity
    items.set(itemKey(t), it)
  }

  const companies = new Map<string, CampusRollup['companies'][number] & { members: Set<string> }>()
  const companyEntry = (t: EnrichedTransaction) =>
    companies.get(t.company_id) ??
    { companyId: t.company_id, name: t.company_name, people: 0, entries: 0, totalCents: 0, previousTotalCents: 0, members: new Set<string>() }
  for (const t of current) {
    const c = companyEntry(t)
    c.entries += 1
    c.totalCents += t.total_cents
    c.members.add(t.member_id)
    companies.set(t.company_id, c)
  }
  for (const t of previous) {
    const c = companyEntry(t)
    c.previousTotalCents += t.total_cents
    companies.set(t.company_id, c)
  }

  const people = new Map<string, CampusRollup['people'][number]>()
  for (const t of current) {
    const p = people.get(t.member_id) ?? { memberId: t.member_id, name: t.member_name, companyName: t.company_name, entries: 0, quantity: 0, totalCents: 0 }
    p.entries += 1
    p.quantity += t.quantity
    p.totalCents += t.total_cents
    people.set(t.member_id, p)
  }

  const companyList = [...companies.values()]
    .map(({ members, ...c }) => ({ ...c, people: members.size }))
    .sort((a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name, 'de'))

  return {
    month,
    previousMonth,
    items: [...items.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'de')),
    companies: companyList,
    people: [...people.values()].sort((a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name, 'de')),
    totals: {
      entries: current.length,
      quantity: current.reduce((s, t) => s + t.quantity, 0),
      totalCents: current.reduce((s, t) => s + t.total_cents, 0),
      previousTotalCents: previous.reduce((s, t) => s + t.total_cents, 0),
      // Shared company accounts are not people (migration 034).
      people: new Set(current.filter(t => t.member_kind !== 'house').map(t => t.member_id)).size,
      companies: companyList.filter(c => c.entries > 0).length,
    },
  }
}

export async function generateCampusRollupExcel(r: CampusRollup): Promise<Buffer> {
  const wb = newWorkbook()

  // ── Überblick ────────────────────────────────────────────────────────────
  const ov = addReportWorksheet(wb, 'Überblick')
  ov.columns = [{ key: 'label', width: 32 }, { key: 'value', width: 20 }]
  const ovHdr = ov.addRow(['Kennzahl', r.month])
  styleHeaderRow(ovHdr, 2)
  alignHeader(ovHdr, { right: [2] })
  const overview: [string, number, boolean][] = [
    ['Einträge', r.totals.entries, false],
    ['Artikel gesamt', r.totals.quantity, false],
    ['Personen mit Verzehr', r.totals.people, false],
    ['Unternehmen mit Verzehr', r.totals.companies, false],
    ['Umsatz', r.totals.totalCents, true],
    [`Umsatz ${r.previousMonth}`, r.totals.previousTotalCents, true],
    ['Veränderung zum Vormonat', r.totals.totalCents - r.totals.previousTotalCents, true],
  ]
  overview.forEach(([label, value, money], i) => {
    const row = ov.addRow([label, money ? euros(value) : value])
    styleBodyRow(row, i, 2, money ? { money: [2] } : { right: [2] })
  })

  // ── Pro Artikel ──────────────────────────────────────────────────────────
  const wi = addReportWorksheet(wb, 'Pro Artikel')
  wi.columns = [
    { key: 'item', width: 32 }, { key: 'category', width: 14 },
    { key: 'qty', width: 12 }, { key: 'prev', width: 14 }, { key: 'delta', width: 14 }, { key: 'total', width: 16 },
  ]
  const wiHdr = wi.addRow(['Artikel', 'Kategorie', 'Menge', `Menge ${r.previousMonth}`, 'Veränderung', 'Umsatz'])
  styleHeaderRow(wiHdr, 6)
  alignHeader(wiHdr, { right: [3, 4, 5, 6] })
  r.items.forEach((it, i) => {
    const row = wi.addRow([it.name, it.category, it.quantity, it.previousQuantity, it.quantity - it.previousQuantity, euros(it.totalCents)])
    styleBodyRow(row, i, 6, { money: [6], right: [3, 4, 5] })
  })
  const wiTot = wi.addRow([
    'Gesamt', '',
    r.items.reduce((s, it) => s + it.quantity, 0),
    r.items.reduce((s, it) => s + it.previousQuantity, 0),
    '',
    euros(r.items.reduce((s, it) => s + it.totalCents, 0)),
  ])
  styleMoneyTotal(wiTot, 6, [6])

  // ── Pro Unternehmen ──────────────────────────────────────────────────────
  const wc = addReportWorksheet(wb, 'Pro Unternehmen')
  wc.columns = [
    { key: 'company', width: 30 }, { key: 'people', width: 12 }, { key: 'entries', width: 12 },
    { key: 'total', width: 16 }, { key: 'prev', width: 18 }, { key: 'delta', width: 16 },
  ]
  const wcHdr = wc.addRow(['Unternehmen', 'Personen', 'Einträge', 'Umsatz', `Umsatz ${r.previousMonth}`, 'Veränderung'])
  styleHeaderRow(wcHdr, 6)
  alignHeader(wcHdr, { right: [2, 3, 4, 5, 6] })
  r.companies.forEach((c, i) => {
    const row = wc.addRow([c.name, c.people, c.entries, euros(c.totalCents), euros(c.previousTotalCents), euros(c.totalCents - c.previousTotalCents)])
    styleBodyRow(row, i, 6, { money: [4, 5, 6], right: [2, 3] })
  })

  // ── Pro Person ───────────────────────────────────────────────────────────
  const wp = addReportWorksheet(wb, 'Pro Person')
  wp.columns = [
    { key: 'person', width: 28 }, { key: 'company', width: 26 },
    { key: 'entries', width: 12 }, { key: 'qty', width: 12 }, { key: 'total', width: 16 },
  ]
  const wpHdr = wp.addRow(['Person', 'Unternehmen', 'Einträge', 'Artikel', 'Betrag'])
  styleHeaderRow(wpHdr, 5)
  alignHeader(wpHdr, { right: [3, 4, 5] })
  r.people.forEach((p, i) => {
    const row = wp.addRow([p.name, p.companyName, p.entries, p.quantity, euros(p.totalCents)])
    styleBodyRow(row, i, 5, { money: [5], right: [3, 4] })
  })

  return toBuffer(wb)
}

// ─── Admin export ─────────────────────────────────────────────────────────────

/**
 * An export of arbitrary entries (any range, including archived months): every
 * entry, a per-company and per-person summary, and a sheet stating the filters,
 * so a file forwarded out of context still says what it contains.
 */
export async function generateExportExcel(rows: EnrichedTransaction[], description: string): Promise<Buffer> {
  const wb = newWorkbook()
  wb.title = `Kaffeelisten Export – ${description}`

  const info = addReportWorksheet(wb, 'Info')
  info.columns = [{ key: 'k', width: 22 }, { key: 'v', width: 60 }]
  styleHeaderRow(info.addRow(['Kaffeelisten Export', '']), 2)
  const infoRows: [string, string | number][] = [
    ['Auswahl', description],
    ['Einträge', rows.length],
    ['Erstellt', new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })],
  ]
  infoRows.forEach(([k, v], i) => styleBodyRow(info.addRow([k, v]), i, 2))

  addLineItemSheet(wb, 'Einträge', rows, { withPerson: true, withCompany: true })

  const sum = addReportWorksheet(wb, 'Zusammenfassung')
  sum.columns = [
    { key: 'company', width: 26 }, { key: 'person', width: 28 },
    { key: 'entries', width: 12 }, { key: 'qty', width: 12 }, { key: 'total', width: 16 },
  ]
  const hdr = sum.addRow(['Unternehmen', 'Person', 'Einträge', 'Artikel', 'Betrag'])
  styleHeaderRow(hdr, 5)
  alignHeader(hdr, { right: [3, 4, 5] })

  const groups = new Map<string, { company: string; person: string; entries: number; qty: number; cents: number }>()
  for (const t of rows) {
    const key = `${t.company_id}\u0000${t.member_id}`
    const g = groups.get(key) ?? { company: t.company_name, person: t.member_name, entries: 0, qty: 0, cents: 0 }
    g.entries += 1
    g.qty += t.quantity
    g.cents += t.total_cents
    groups.set(key, g)
  }
  const ordered = [...groups.values()]
  ordered
    .sort((a, b) => a.company.localeCompare(b.company, 'de') || b.cents - a.cents)
    .forEach((g, i) => {
      styleBodyRow(sum.addRow([g.company, g.person, g.entries, g.qty, euros(g.cents)]), i, 5, { money: [5], right: [3, 4] })
    })
  const tot = sum.addRow([
    'Gesamt', '', rows.length,
    rows.reduce((s, t) => s + t.quantity, 0),
    euros(rows.reduce((s, t) => s + t.total_cents, 0)),
  ])
  styleMoneyTotal(tot, 5, [5])

  return toBuffer(wb)
}
