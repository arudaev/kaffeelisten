// Shared report orchestrator: fetch → compute → PDF → Excel → email → archive → reset

import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { Resend } from 'resend'
import {
  buildReportHtml,
  formatEuro,
  formatDate,
  type EnrichedTransaction,
  type MemberSummary,
  type CompanySummary,
} from './reportHtml'

export type { EnrichedTransaction, MemberSummary, CompanySummary }

const EMAIL_LOGO_CONTENT_ID = 'kaffeelisten-logo'
const EMAIL_LOGO_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAGAAAABNCAYAAABZqmHQAAAFhElEQVR4nOycW4xdUxzGvzOM6ZS2o6j77aE0LlHULdEQEhKhiLsHIqQkqFDxJKlHmnjxUNKQIOJFSLRumYgH16pqk5aQKo5rVA2j2k61Osf3Weukx2SfOVusddbqnv8v+bJm9t5zztr/b6/72tMDIyk9MJJiBiTGDEiMGZAYMyAxZkBizIDEmAGJMQMSYwYkJmsDGo1GnTocFWZvZAoDP5VJX61W+wEVJucSsIOaVHSC5tyNipDcAAZzNrVy7HE++duZbOC5OQV/dj6PX4YKkEMJOIz6ps25ZdS8guNHUF+jAuRgwFZqSptzH1EnFRzfQk1FBcjBgLXUWaxS9ik4p3ag6PjH1LmoAMkNYF3/G5O3qEsKTs+ivio4/jJ1KSpALr2gddRxYw/SnCVM3iy4fg11AipALuOABlUrOkETlrW5vhLkUgJOpL74D9efQn2OClBDJrARnsKn/Q9MMLIxYKJis6GJidIIszq5AK5e72853ON/lzTH0+elfn6vz4u0l9fY0jlK7fL6y2uH159emr4Y8WrlF2oVq7i1yIygVRADfzaTR6l9qTpccAeoaXCjXWky3Oh3G1zAJAVPgdyJ3UFWwBst+WwaI5N6/WfLQJnZ7z9XxzRKVluymfqdGvbXq+F+nZpPI0aRCcEMYPCPZfIe3BzNUdRGagXcdMJq3vQ6dAk16HABP506kzoHzhDxPfOSzSAupAEaNN1KzeUNrkSGMI8PMlnE/PUiE0I2wir6qpfn8Uaz610xTxo5z0FmhGyEP4Qr6qpf3+ANq/jX4SbbPqE+o9bz6fsSkeB3qh2YSR0PN1WhmdTZ/rSqwneoC5ERIasgTabdwgBfw5/VCB9DHU0dSWld91DqYGoGdSA1Hc4s1c1qNNUoq/fSbJCbDbHyqJKqh6XZ8CrQ+g7V9dP83w3B9XZ+pn6ifqS0nPkt3HpD3X/GJuZxAJkQpRvKG1Qv51Ovf0FzFEzN5St4+8EFs9k1be2S6rrmA6LeULP72ex2Nruc+q5/ej783i3j5Yvfjdzo+mSc7wIOe6Wgj0a8W3BcD0QdbmZ2kPl8G10g210REVEpKlrU19qDqrHTqMU0SQ/IQzRiBSIyEQ3YxaCuKTjePDZIPUwDbmb6KtP7eP0ziMRENKAUCjqDrx7ci0y38fcXEAGbjBsHX1JUEh6jCYcgAmZAB2iCxg5PUQsRATOgHEupGxEBM6AELAUazGmj8BkIjBlQng1wo/ugWC+oPBp1T0JgzIDy7A+3wBMUM6A8JyPCVhgzoARsfLUPdSsb4/UIjBlQjgVwY4HgmAEd4NN/D5MBPv1PIAIhDVAjNRl5o/WG0otQDP5dTG6nor2NE9IAbSPvR95ozn+o00UMvHZUaOpBq3mXx1xGDW3ATOSN1opHGeBFBee0lUZ9fa0hH0QtZeBvQmSCGcDMbuSNbaJObTPfngNz4Va9RgrO6Zjy/VzsRZhWQjfCr1BXYffiRm5cSd3ZzQB3IvRckFaO5rMUTEdmME/XMhnKKfgi+AYq3ugjTPp5owuQCcyTtrKsohYyX4PIiBgGaFuJ9ogu4c0+jQxgnp5kMsz83I/MCD4Q403u5A3fwR9fY7qZv7+EhPgSeQDzcRsyJNbGrNW+zn2e6YxYo8jx8BvAHofbjXc9MiXagozf2HQRdR2D8Sw1C13C/x8J7dDeznxc4f/vRJZ0ZRczA/IAk3vh3vldTn3AoHyHQPDz9eKGNuOeR10NV7IXt3nFNSu6to2cQdJq0g3UxXAvTmiDrnapjeD/oVKsDbqaKn6fWp5bT2c8ku3j94Zo+N9xbqbTRzHgv2IPxV5TTYztikiMGZAYMyAxZkBizIDEmAGJMQMSYwYkxgxIjBmQGDMgMWZAYsyAxJgBifkbAAD//3bPWa4AAAAGSURBVAMAqkWL0ctGfuYAAAAASUVORK5CYII='

// ─── Supabase (service role — bypasses RLS) ───────────────────────────────────

function makeSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// ─── Data fetching ────────────────────────────────────────────────────────────

// forMonth: "2026-05" — defaults to the current calendar month if omitted
export async function fetchAndEnrich(forMonth?: string): Promise<{
  transactions: EnrichedTransaction[]
  reportMonth: string
  monthLabel: string
}> {
  const supabase = makeSupabase()
  const ref = forMonth ?? new Date().toISOString().slice(0, 7)
  const [yearStr, monStr] = ref.split('-')
  const year  = Number(yearStr)
  const month = Number(monStr) - 1          // 0-indexed
  const reportMonth  = `${yearStr}-${monStr}`
  const monthStart   = new Date(year, month, 1).toISOString()
  const monthEnd     = new Date(year, month + 1, 1).toISOString()
  const monthLabel   = new Date(year, month, 1)
    .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const { data: txData, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .gte('logged_at', monthStart)
    .lt('logged_at', monthEnd)
    .order('logged_at', { ascending: true })

  if (txErr) throw new Error(`Failed to fetch transactions: ${txErr.message}`)

  const [membersRes, companiesRes, itemsRes] = await Promise.all([
    supabase.from('members').select('id, name, company_id, work_email'),
    supabase.from('companies').select('id, name'),
    supabase.from('items').select('id, name, unit_label, price_cents, category'),
  ])

  if (membersRes.error) throw new Error(`Failed to fetch members: ${membersRes.error.message}`)
  if (companiesRes.error) throw new Error(`Failed to fetch companies: ${companiesRes.error.message}`)
  if (itemsRes.error) throw new Error(`Failed to fetch items: ${itemsRes.error.message}`)

  const memberMap = new Map((membersRes.data ?? []).map(m => [m.id, m]))
  const companyMap = new Map((companiesRes.data ?? []).map(c => [c.id, c.name as string]))
  const itemMap = new Map((itemsRes.data ?? []).map(i => [i.id, i]))

  const transactions: EnrichedTransaction[] = (txData ?? []).map(t => {
    const member = memberMap.get(t.member_id)
    const item = itemMap.get(t.item_id)
    return {
      ...t,
      member_name: member?.name ?? '—',
      work_email: member?.work_email ?? null,
      company_name: companyMap.get(t.company_id) ?? '—',
      item_name: item?.name ?? '—',
      item_category: item?.category ?? '—',
      unit_label: item?.unit_label ?? 'Stück',
      price_cents: item?.price_cents ?? 0,
      total_cents: (item?.price_cents ?? 0) * t.quantity,
    }
  })

  return { transactions, reportMonth, monthLabel }
}

// ─── Summary computation ──────────────────────────────────────────────────────

export function computeSummary(transactions: EnrichedTransaction[]): CompanySummary[] {
  const companyMap = new Map<string, Map<string, EnrichedTransaction[]>>()

  for (const t of transactions) {
    if (!companyMap.has(t.company_name)) companyMap.set(t.company_name, new Map())
    const memberMap = companyMap.get(t.company_name)!
    if (!memberMap.has(t.member_name)) memberMap.set(t.member_name, [])
    memberMap.get(t.member_name)!.push(t)
  }

  const summaries: CompanySummary[] = []

  for (const [company_name, members] of companyMap) {
    const memberSummaries: MemberSummary[] = []
    for (const [member_name, entries] of members) {
      const subtotal_cents = entries.reduce((s, e) => s + e.total_cents, 0)
      memberSummaries.push({ member_name, work_email: entries[0]?.work_email ?? null, entries, subtotal_cents })
    }
    memberSummaries.sort((a, b) => b.subtotal_cents - a.subtotal_cents)

    summaries.push({
      company_name,
      members: memberSummaries,
      total_cents: memberSummaries.reduce((s, m) => s + m.subtotal_cents, 0),
      total_entries: memberSummaries.reduce((s, m) => s + m.entries.length, 0),
    })
  }

  summaries.sort((a, b) => b.total_cents - a.total_cents)
  return summaries
}

// ─── PDF (HTML → puppeteer) ───────────────────────────────────────────────────

export async function generatePdf(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
): Promise<Buffer> {
  // Dynamic import so the module doesn't load chromium on cold start unless needed
  const chromium = (await import('@sparticuz/chromium-min')).default
  const puppeteer = (await import('puppeteer-core')).default

  const executablePath = process.env.CHROMIUM_PATH
    ?? await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      )

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    const html = buildReportHtml(summaries, transactions, monthLabel, reportMonth)
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

// ─── Excel ────────────────────────────────────────────────────────────────────

const AMBER      = 'FFD97706'
const AMBER_DARK = 'FFB45309'
const AMBER_50   = 'FFFFFBEB'
const STONE_200  = 'FFE7E5E4'
const STONE_50   = 'FFFAFAF9'
const WHITE      = 'FFFFFFFF'

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

export async function generateExcel(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Kaffeelisten'
  wb.created = new Date()

  // ── Sheet 1: Zusammenfassung ──────────────────────────────────────────────
  const ws1 = addReportWorksheet(wb, 'Zusammenfassung')
  ws1.columns = [
    { key: 'company', width: 34 },
    { key: 'entries', width: 14 },
    { key: 'total',   width: 20 },
  ]

  const hdr1 = ws1.addRow(['Unternehmen', 'Einträge', 'Gesamtbetrag'])
  styleHeaderRow(hdr1, 3)
  hdr1.getCell(2).alignment = { horizontal: 'center',  vertical: 'middle' }
  hdr1.getCell(3).alignment = { horizontal: 'right',   vertical: 'middle' }

  summaries.forEach((c, i) => {
    const row = ws1.addRow([
      c.company_name,
      c.total_entries,
      Number((c.total_cents / 100).toFixed(2)),
    ])
    if (i % 2 === 1) { for (let j = 1; j <= 3; j++) row.getCell(j).fill = altFill }
    row.getCell(2).alignment = { horizontal: 'center' }
    row.getCell(3).numFmt    = '#,##0.00 "€"'
    row.getCell(3).alignment = { horizontal: 'right' }
    for (let j = 1; j <= 3; j++) row.getCell(j).border = rowBorder
    row.height = 18
  })

  const grandTotal = summaries.reduce((s, c) => s + c.total_cents, 0)
  const tot1 = ws1.addRow([
    'Gesamt',
    summaries.reduce((s, c) => s + c.total_entries, 0),
    Number((grandTotal / 100).toFixed(2)),
  ])
  styleTotalRow(tot1, 3)
  tot1.getCell(2).alignment = { horizontal: 'center' }
  tot1.getCell(3).numFmt    = '#,##0.00 "€"'
  tot1.getCell(3).alignment = { horizontal: 'right' }

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
  hdr2.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' }
  hdr2.getCell(5).alignment = { horizontal: 'right',  vertical: 'middle' }

  let rowIdx = 0
  summaries.forEach(company => {
    company.members.forEach(member => {
      const row = ws2.addRow([
        company.company_name,
        member.member_name,
        member.work_email ?? '',
        member.entries.length,
        Number((member.subtotal_cents / 100).toFixed(2)),
      ])
      if (rowIdx % 2 === 1) { for (let j = 1; j <= 5; j++) row.getCell(j).fill = altFill }
      row.getCell(4).alignment = { horizontal: 'center' }
      row.getCell(5).numFmt    = '#,##0.00 "€"'
      row.getCell(5).alignment = { horizontal: 'right' }
      for (let j = 1; j <= 5; j++) row.getCell(j).border = rowBorder
      row.height = 18
      rowIdx++
    })
    const sub = ws2.addRow([
      `${company.company_name} — Gesamt`, '', '',
      company.total_entries,
      Number((company.total_cents / 100).toFixed(2)),
    ])
    styleTotalRow(sub, 5)
    sub.getCell(4).alignment = { horizontal: 'center' }
    sub.getCell(5).numFmt    = '#,##0.00 "€"'
    sub.getCell(5).alignment = { horizontal: 'right' }
    rowIdx++
  })

  // ── Sheet 3: Alle Einträge ────────────────────────────────────────────────
  const ws3 = addReportWorksheet(wb, 'Alle Einträge')
  ws3.columns = [
    { key: 'date',       width: 13 },
    { key: 'time',       width: 9  },
    { key: 'person',     width: 26 },
    { key: 'email',      width: 32 },
    { key: 'company',    width: 26 },
    { key: 'item',       width: 22 },
    { key: 'category',   width: 14 },
    { key: 'quantity',   width: 9  },
    { key: 'unit_price', width: 16 },
    { key: 'total',      width: 14 },
  ]

  const hdr3 = ws3.addRow(['Datum', 'Uhrzeit', 'Person', 'E-Mail', 'Unternehmen', 'Item', 'Kategorie', 'Menge', 'Einzelpreis', 'Betrag'])
  styleHeaderRow(hdr3, 10)
  ;[8, 9, 10].forEach(i => { hdr3.getCell(i).alignment = { horizontal: 'right', vertical: 'middle' } })

  transactions.forEach((t, i) => {
    const row = ws3.addRow([
      formatDate(t.logged_at),
      new Date(t.logged_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      t.member_name,
      t.work_email ?? '',
      t.company_name,
      t.item_name,
      t.item_category,
      t.quantity,
      Number((t.price_cents / 100).toFixed(2)),
      Number((t.total_cents  / 100).toFixed(2)),
    ])
    if (i % 2 === 1) { for (let j = 1; j <= 10; j++) row.getCell(j).fill = altFill }
    row.getCell(8).alignment = { horizontal: 'right' }
    row.getCell(9).numFmt    = '#,##0.00 "€"'
    row.getCell(9).alignment = { horizontal: 'right' }
    row.getCell(10).numFmt   = '#,##0.00 "€"'
    row.getCell(10).alignment = { horizontal: 'right' }
    for (let j = 1; j <= 10; j++) row.getCell(j).border = rowBorder
    row.height = 18
  })

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

// ─── Email ────────────────────────────────────────────────────────────────────

export async function sendEmail(
  pdfBuffer: Buffer,
  xlsxBuffer: Buffer,
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL
  if (!resendKey) throw new Error('Missing RESEND_API_KEY')
  if (!adminEmail) throw new Error('Missing ADMIN_EMAIL')

  const resend = new Resend(resendKey)
  const totalCents = transactions.reduce((s, t) => s + t.total_cents, 0)
  const [yearStr, monStr] = reportMonth.split('-')
  const monthName = new Date(Number(yearStr), Number(monStr) - 1, 1)
    .toLocaleDateString('de-DE', { month: 'long' })

  const companyRows = summaries
    .map(c => `
      <tr>
        <td style="padding:8px 16px;border-bottom:1px solid #E7E5E4;color:#1C1917;">${c.company_name}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #E7E5E4;text-align:right;color:#57534E;">${c.total_entries}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #E7E5E4;text-align:right;font-weight:600;color:#1C1917;">${formatEuro(c.total_cents)}</td>
      </tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#FAFAF9;margin:0;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E7E5E4;">
    <div style="background:#D97706;padding:24px 32px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:0;color:rgba(255,255,255,.84);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;line-height:1.2;">KAFFEELISTEN · ITC1 DEGGENDORF</td>
          <td style="padding:0;text-align:right;width:48px;vertical-align:middle;">
            <img src="cid:${EMAIL_LOGO_CONTENT_ID}" width="44" height="35" alt="Kaffeelisten" style="display:inline-block;width:44px;height:35px;border:0;outline:none;text-decoration:none;vertical-align:middle;">
          </td>
        </tr>
      </table>
      <h1 style="color:#fff;margin:12px 0 0;font-size:22px;font-weight:700;line-height:1.2;">Monatsbericht ${monthLabel}</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#57534E;margin:0 0 20px;">Anbei der Monatsbericht für <strong style="color:#1C1917;">${monthLabel}</strong> mit allen Einträgen des ITC1-Campus.</p>
      <table style="width:100%;border-collapse:collapse;background:#FAFAF9;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr>
          <td style="padding:12px 16px;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Einträge gesamt</td>
          <td style="padding:12px 16px;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Gesamtbetrag</td>
          <td style="padding:12px 16px;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Unternehmen</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:24px;font-weight:700;color:#1C1917;">${transactions.length}</td>
          <td style="padding:12px 16px;font-size:24px;font-weight:700;color:#1C1917;">${formatEuro(totalCents)}</td>
          <td style="padding:12px 16px;font-size:18px;font-weight:700;color:#1C1917;">${summaries.length}</td>
        </tr>
      </table>
      <h2 style="font-size:13px;font-weight:600;color:#57534E;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;">Nach Unternehmen</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#FAFAF9;">
            <th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;">Unternehmen</th>
            <th style="padding:8px 16px;text-align:right;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;">Einträge</th>
            <th style="padding:8px 16px;text-align:right;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;">Betrag</th>
          </tr>
        </thead>
        <tbody>${companyRows}</tbody>
      </table>
      <p style="color:#78716C;font-size:12px;margin:0;line-height:1.6;">
        Die vollständigen Daten finden Sie in den beigefügten Dateien:<br>
        <strong>PDF</strong> – Formatierter Bericht für Ablage und Weitergabe.<br>
        <strong>Excel</strong> – Alle Rohdaten für Auswertungen.
      </p>
      <p style="color:#78716C;font-size:12px;margin:12px 0 0;">Die Einträge wurden nach dem Versand archiviert. Die Originaldaten bleiben erhalten.</p>
    </div>
    <div style="background:#FAFAF9;padding:14px 32px;border-top:1px solid #E7E5E4;">
      <p style="color:#A8A29E;font-size:11px;margin:0;">Kaffeelisten · B4Y3RW4LD Hackathon · ITC1 Deggendorf</p>
    </div>
  </div>
</body>
</html>`

  const filename = `kaffeelisten-${reportMonth}`

  await resend.emails.send({
    from: 'Kaffeelisten <onboarding@resend.dev>',
    to: [adminEmail],
    subject: `Kaffeelisten – Monatsbericht ${monthName} ${yearStr}`,
    html,
    attachments: [
      { filename: 'kaffeelisten-logo.png', content: EMAIL_LOGO_PNG_BASE64, contentType: 'image/png', contentId: EMAIL_LOGO_CONTENT_ID },
      { filename: `${filename}.pdf`, content: pdfBuffer.toString('base64') },
      { filename: `${filename}.xlsx`, content: xlsxBuffer.toString('base64') },
    ],
  })
}

// ─── Archive and reset ────────────────────────────────────────────────────────

export async function archiveTransactions(
  transactions: EnrichedTransaction[],
  reportMonth: string,
): Promise<void> {
  if (transactions.length === 0) return
  const supabase = makeSupabase()
  const now = new Date().toISOString()

  // upsert with ignoreDuplicates so re-sending the same month's report
  // never fails — rows already archived are simply skipped.
  const { error: archErr } = await supabase
    .from('transactions_archive')
    .upsert(
      transactions.map(t => ({
        id: t.id,
        member_id: t.member_id,
        company_id: t.company_id,
        item_id: t.item_id,
        quantity: t.quantity,
        logged_at: t.logged_at,
        archived_at: now,
        report_month: reportMonth,
      })),
      { onConflict: 'id,report_month', ignoreDuplicates: true },
    )

  if (archErr) throw new Error(`Archive insert failed: ${archErr.message}`)
}

// ─── Prune old transactions (keep last 3 months) ──────────────────────────────

export async function pruneOldTransactions(): Promise<void> {
  const supabase = makeSupabase()
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()

  const { error: liveErr } = await supabase
    .from('transactions')
    .delete()
    .lt('logged_at', cutoff)
  if (liveErr) throw new Error(`Prune transactions failed: ${liveErr.message}`)

  // Keep transactions_archive within the same 90-day window to stay within
  // Supabase free-tier storage limits.
  const { error: archErr } = await supabase
    .from('transactions_archive')
    .delete()
    .lt('logged_at', cutoff)
  if (archErr) throw new Error(`Prune archive failed: ${archErr.message}`)
}

// ─── Deactivate members inactive for 90+ days ────────────────────────────────

export async function deactivateInactiveMembers(): Promise<void> {
  const supabase = makeSupabase()
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()

  // Find members whose most recent transaction is older than the cutoff.
  // Members with zero transactions ever are intentionally excluded — they may
  // be newly added and simply haven't logged anything yet.
  const { data: txData, error: txErr } = await supabase
    .from('transactions')
    .select('member_id, logged_at')
    .order('logged_at', { ascending: false })

  if (txErr) throw new Error(`deactivateInactiveMembers fetch failed: ${txErr.message}`)

  // Build a map: member_id → most recent logged_at
  const latestByMember = new Map<string, string>()
  for (const row of txData ?? []) {
    if (!latestByMember.has(row.member_id)) {
      latestByMember.set(row.member_id, row.logged_at)
    }
  }

  const toDeactivate = [...latestByMember.entries()]
    .filter(([, last]) => last < cutoff)
    .map(([id]) => id)

  if (toDeactivate.length === 0) return

  const { error: updErr } = await supabase
    .from('members')
    .update({ active: false })
    .in('id', toDeactivate)
    .eq('active', true)

  if (updErr) throw new Error(`deactivateInactiveMembers update failed: ${updErr.message}`)
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function runMonthlyReport(forMonth?: string): Promise<void> {
  const { transactions, reportMonth, monthLabel } = await fetchAndEnrich(forMonth)
  const summaries = computeSummary(transactions)
  const [pdfBuffer, xlsxBuffer] = await Promise.all([
    generatePdf(summaries, transactions, monthLabel, reportMonth),
    generateExcel(summaries, transactions),
  ])
  await sendEmail(pdfBuffer, xlsxBuffer, summaries, transactions, monthLabel, reportMonth)
  await archiveTransactions(transactions, reportMonth)
  await pruneOldTransactions()
  await deactivateInactiveMembers()
}
