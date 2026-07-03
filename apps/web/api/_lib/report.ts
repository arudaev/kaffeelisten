// Shared report orchestrator: fetch → compute → PDF → Excel → email → archive → reset

import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { Resend } from 'resend'
import {
  buildReportHtml,
  buildCompanyEmailHtml,
  buildMemberStatementHtml,
  renderTemplate,
  formatEuro,
  formatDate,
  type EnrichedTransaction,
  type MemberSummary,
  type CompanySummary,
} from './reportHtml'

import { findPalette } from './palettes'

export type { EnrichedTransaction, MemberSummary, CompanySummary }

export const EMAIL_LOGO_CONTENT_ID = 'kaffeelisten-logo'
export const EMAIL_LOGO_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAGAAAABNCAYAAABZqmHQAAAFhElEQVR4nOycW4xdUxzGvzOM6ZS2o6j77aE0LlHULdEQEhKhiLsHIqQkqFDxJKlHmnjxUNKQIOJFSLRumYgH16pqk5aQKo5rVA2j2k61Osf3Weukx2SfOVusddbqnv8v+bJm9t5zztr/b6/72tMDIyk9MJJiBiTGDEiMGZAYMyAxZkBizIDEmAGJMQMSYwYkJmsDGo1GnTocFWZvZAoDP5VJX61W+wEVJucSsIOaVHSC5tyNipDcAAZzNrVy7HE++duZbOC5OQV/dj6PX4YKkEMJOIz6ps25ZdS8guNHUF+jAuRgwFZqSptzH1EnFRzfQk1FBcjBgLXUWaxS9ik4p3ag6PjH1LmoAMkNYF3/G5O3qEsKTs+ivio4/jJ1KSpALr2gddRxYw/SnCVM3iy4fg11AipALuOABlUrOkETlrW5vhLkUgJOpL74D9efQn2OClBDJrARnsKn/Q9MMLIxYKJis6GJidIIszq5AK5e72853ON/lzTH0+elfn6vz4u0l9fY0jlK7fL6y2uH159emr4Y8WrlF2oVq7i1yIygVRADfzaTR6l9qTpccAeoaXCjXWky3Oh3G1zAJAVPgdyJ3UFWwBst+WwaI5N6/WfLQJnZ7z9XxzRKVluymfqdGvbXq+F+nZpPI0aRCcEMYPCPZfIe3BzNUdRGagXcdMJq3vQ6dAk16HABP506kzoHzhDxPfOSzSAupAEaNN1KzeUNrkSGMI8PMlnE/PUiE0I2wir6qpfn8Uaz610xTxo5z0FmhGyEP4Qr6qpf3+ANq/jX4SbbPqE+o9bz6fsSkeB3qh2YSR0PN1WhmdTZ/rSqwneoC5ERIasgTabdwgBfw5/VCB9DHU0dSWld91DqYGoGdSA1Hc4s1c1qNNUoq/fSbJCbDbHyqJKqh6XZ8CrQ+g7V9dP83w3B9XZ+pn6ifqS0nPkt3HpD3X/GJuZxAJkQpRvKG1Qv51Ovf0FzFEzN5St4+8EFs9k1be2S6rrmA6LeULP72ex2Nruc+q5/ej783i3j5Yvfjdzo+mSc7wIOe6Wgj0a8W3BcD0QdbmZ2kPl8G10g210REVEpKlrU19qDqrHTqMU0SQ/IQzRiBSIyEQ3YxaCuKTjePDZIPUwDbmb6KtP7eP0ziMRENKAUCjqDrx7ci0y38fcXEAGbjBsHX1JUEh6jCYcgAmZAB2iCxg5PUQsRATOgHEupGxEBM6AELAUazGmj8BkIjBlQng1wo/ugWC+oPBp1T0JgzIDy7A+3wBMUM6A8JyPCVhgzoARsfLUPdSsb4/UIjBlQjgVwY4HgmAEd4NN/D5MBPv1PIAIhDVAjNRl5o/WG0otQDP5dTG6nor2NE9IAbSPvR95ozn+o00UMvHZUaOpBq3mXx1xGDW3ATOSN1opHGeBFBee0lUZ9fa0hH0QtZeBvQmSCGcDMbuSNbaJObTPfngNz4Va9RgrO6Zjy/VzsRZhWQjfCr1BXYffiRm5cSd3ZzQB3IvRckFaO5rMUTEdmME/XMhnKKfgi+AYq3ugjTPp5owuQCcyTtrKsohYyX4PIiBgGaFuJ9ogu4c0+jQxgnp5kMsz83I/MCD4Q403u5A3fwR9fY7qZv7+EhPgSeQDzcRsyJNbGrNW+zn2e6YxYo8jx8BvAHofbjXc9MiXagozf2HQRdR2D8Sw1C13C/x8J7dDeznxc4f/vRJZ0ZRczA/IAk3vh3vldTn3AoHyHQPDz9eKGNuOeR10NV7IXt3nFNSu6to2cQdJq0g3UxXAvTmiDrnapjeD/oVKsDbqaKn6fWp5bT2c8ku3j94Zo+N9xbqbTRzHgv2IPxV5TTYztikiMGZAYMyAxZkBizIDEmAGJMQMSYwYkxgxIjBmQGDMgMWZAYsyAxJgBifkbAAD//3bPWa4AAAAGSURBVAMAqkWL0ctGfuYAAAAASUVORK5CYII='

// ─── Supabase (service role — bypasses RLS) ───────────────────────────────────

function makeSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// ─── Report settings (from app_settings, with env bootstrap fallbacks) ─────────

export interface ReportFormat {
  accent: string
  reportSubject: string | null
  reportIntro: string | null
  includePdf: boolean
  includeExcel: boolean
  memberSubject: string | null
  memberIntro: string | null
}

export interface ReportSchedule {
  autoEnabled: boolean
  autoDay: number | null // null = last day of month
}

export interface ReportSettings {
  recipients: string[]
  ccEmails: string[]
  memberStatementsEnabled: boolean
  format: ReportFormat
  schedule: ReportSchedule
}

// Reads the singleton app_settings row and resolves the effective recipients:
//   • to  = report_recipients, falling back to ADMIN_EMAIL env when empty
//   • cc  = [ceo_email] when cc_ceo_on_reports is on and ceo_email is set
export async function fetchReportSettings(): Promise<ReportSettings> {
  const supabase = makeSupabase()
  const { data, error } = await supabase
    .from('app_settings')
    .select('report_recipients, ceo_email, cc_ceo_on_reports, member_statements_enabled, auto_report_enabled, auto_report_day, report_accent, report_subject, report_intro, report_include_pdf, report_include_excel, member_subject, member_intro')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw new Error(`Failed to read app_settings: ${error.message}`)

  const configured = (data?.report_recipients ?? []).filter(Boolean)
  const envFallback = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  const recipients = configured.length > 0 ? configured : envFallback

  const ccEmails =
    data?.cc_ceo_on_reports && data.ceo_email
      ? [data.ceo_email].filter(e => !recipients.includes(e))
      : []

  // Emails use the brand palette's LIGHT accent (email dark-mode is unreliable,
  // so statements always render the light variant). Falls back to the legacy
  // report_accent, then the default.
  let accent = data?.report_accent || '#D97706'
  const { data: themeRow } = await supabase
    .from('app_theme')
    .select('active_palette, custom')
    .eq('id', 1)
    .maybeSingle()
  if (themeRow) {
    accent = findPalette(themeRow.active_palette, themeRow.custom).lightAccent
  }

  return {
    recipients,
    ccEmails,
    memberStatementsEnabled: data?.member_statements_enabled ?? true,
    format: {
      accent,
      reportSubject: data?.report_subject ?? null,
      reportIntro: data?.report_intro ?? null,
      includePdf: data?.report_include_pdf ?? true,
      includeExcel: data?.report_include_excel ?? true,
      memberSubject: data?.member_subject ?? null,
      memberIntro: data?.member_intro ?? null,
    },
    schedule: {
      autoEnabled: data?.auto_report_enabled ?? true,
      autoDay: data?.auto_report_day ?? null,
    },
  }
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

  // The pack version MUST match the installed @sparticuz/chromium-min major
  // (package.json → ^147). A mismatch ships a chromium binary the bundled
  // puppeteer-core can't drive. Bump this URL whenever chromium-min is upgraded.
  const executablePath = process.env.CHROMIUM_PATH
    ?? await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.tar'
      )

  // Drop --disable-web-security: the report HTML is fully self-contained (inline
  // styles + inline SVG), so relaxing the same-origin policy only widens the
  // attack surface if any markup slips through. (--no-sandbox stays; it's
  // required in the serverless runtime and is not what defends against injection.)
  const safeArgs = chromium.args.filter(a => !a.startsWith('--disable-web-security'))

  const browser = await puppeteer.launch({
    args: safeArgs,
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()

    // The report contains no scripts and loads no external resources. Disabling
    // JS and aborting every non-inline request means that even if a crafted
    // member/company/item name embedded a <script> or an external URL, it can
    // neither execute nor exfiltrate/SSRF. Defense-in-depth alongside escaping.
    await page.setJavaScriptEnabled(false)
    await page.setRequestInterception(true)
    page.on('request', req => {
      const url = req.url()
      if (url.startsWith('data:') || url.startsWith('about:')) req.continue()
      else req.abort()
    })

    const html = buildReportHtml(summaries, transactions, monthLabel, reportMonth)
    await page.setContent(html, { waitUntil: 'load' })
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

// Resolve the company report subject line from the configured template (or the
// built-in default). Exported so the preview endpoint shows the same subject.
export function resolveReportSubject(format: ReportFormat, monthLabel: string, reportMonth: string): string {
  const [yearStr, monStr] = reportMonth.split('-')
  if (format.reportSubject) return renderTemplate(format.reportSubject, { monat: monthLabel, jahr: yearStr })
  const monthName = new Date(Number(yearStr), Number(monStr) - 1, 1)
    .toLocaleDateString('de-DE', { month: 'long' })
  return `Kaffeelisten – Monatsbericht ${monthName} ${yearStr}`
}

export async function sendEmail(
  pdfBuffer: Buffer | null,
  xlsxBuffer: Buffer | null,
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
  recipients: string[],
  ccEmails: string[],
  format: ReportFormat,
  idempotencyKey: string,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) throw new Error('Missing RESEND_API_KEY')
  if (recipients.length === 0) {
    throw new Error('No report recipients configured (app_settings.report_recipients / ADMIN_EMAIL)')
  }

  const resend = new Resend(resendKey)

  const [yearStr] = reportMonth.split('-')
  const html = buildCompanyEmailHtml(summaries, transactions, monthLabel, {
    accent: format.accent,
    intro: format.reportIntro ? renderTemplate(format.reportIntro, { monat: monthLabel, jahr: yearStr }) : undefined,
    logoSrc: `cid:${EMAIL_LOGO_CONTENT_ID}`,
  })

  const filename = `kaffeelisten-${reportMonth}`
  const attachments: Array<{ filename: string; content: string; contentType?: string; contentId?: string }> = [
    { filename: 'kaffeelisten-logo.png', content: EMAIL_LOGO_PNG_BASE64, contentType: 'image/png', contentId: EMAIL_LOGO_CONTENT_ID },
  ]
  if (format.includePdf && pdfBuffer) {
    attachments.push({ filename: `${filename}.pdf`, content: pdfBuffer.toString('base64') })
  }
  if (format.includeExcel && xlsxBuffer) {
    attachments.push({ filename: `${filename}.xlsx`, content: xlsxBuffer.toString('base64') })
  }

  const { error } = await resend.emails.send(
    {
      from: 'Kaffeelisten <bericht@kaffeelisten.de>',
      to: recipients,
      ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
      subject: resolveReportSubject(format, monthLabel, reportMonth),
      html,
      attachments,
    },
    // Idempotency key: a retry for the same run won't send a second copy
    // (Resend dedupes within its window). The caller varies the key when an
    // admin explicitly forces a re-send.
    { idempotencyKey: `report-${idempotencyKey}` },
  )
  // Resend returns { data, error } and generally does NOT throw on API errors —
  // so an unchecked call reports failures as success. Surface it so the caller
  // does not archive/prune a report that was never delivered.
  if (error) {
    throw new Error(`Resend company report failed: ${error.message ?? JSON.stringify(error)}`)
  }
}

// ─── Per-member monthly statements (feature E) ────────────────────────────────

export interface MemberStatementResult {
  sent: number
  failed: number
}

// Sends each member who logged ≥1 transaction their own itemized statement.
// Sequential with light throttling to respect Resend rate limits. Individual
// failures are counted and logged (not thrown) so one bad address never aborts
// the run — but the count is returned so the caller can surface it rather than
// silently swallowing delivery failures. `idempotencyKey` scopes the per-member
// Resend idempotency keys to this run so retries don't double-send.
export async function sendMemberStatements(
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
  format: ReportFormat,
  idempotencyKey: string,
): Promise<MemberStatementResult> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) throw new Error('Missing RESEND_API_KEY')
  const resend = new Resend(resendKey)
  const [yearStr] = reportMonth.split('-')

  // Group by member; keep the member's name + work email alongside their entries.
  const byMember = new Map<string, { name: string; email: string | null; entries: EnrichedTransaction[] }>()
  for (const t of transactions) {
    const g = byMember.get(t.member_id) ?? { name: t.member_name, email: t.work_email, entries: [] }
    g.entries.push(t)
    byMember.set(t.member_id, g)
  }

  let sent = 0
  let failed = 0
  for (const [memberId, { name, email, entries }] of byMember) {
    if (!email) continue // no reachable address — skip silently
    const firstName = name.trim().split(/\s+/)[0] || name
    const gesamt = formatEuro(entries.reduce((s, e) => s + e.total_cents, 0))
    const vars = { monat: monthLabel, jahr: yearStr, name: firstName, gesamt }
    const subject = format.memberSubject
      ? renderTemplate(format.memberSubject, vars)
      : `Kaffeelisten – Deine Aufstellung ${monthLabel}`
    const intro = format.memberIntro
      ? renderTemplate(format.memberIntro, vars)
      : undefined
    try {
      const { error } = await resend.emails.send(
        {
          from: 'Kaffeelisten <bericht@kaffeelisten.de>',
          to: [email],
          subject,
          html: buildMemberStatementHtml(name, entries, monthLabel, { accent: format.accent, intro }),
        },
        { idempotencyKey: `member-${idempotencyKey}-${memberId}` },
      )
      if (error) throw new Error(error.message ?? JSON.stringify(error))
      sent++
      // Light throttle — Resend free tier limits requests/second.
      await new Promise(r => setTimeout(r, 120))
    } catch (err) {
      failed++
      console.error(`[member-statement] failed for ${email}:`, err instanceof Error ? err.message : err)
    }
  }
  return { sent, failed }
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

  // Only delete live transactions that have actually been archived. A month that
  // was never reported (and therefore never archived) is retained rather than
  // silently lost — the delete goes through prune_reported_transactions, which
  // filters on existence in transactions_archive.
  const { error: liveErr } = await supabase.rpc('prune_reported_transactions', { p_cutoff: cutoff })
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

// ─── Run ledger (idempotency at the run level) ────────────────────────────────

// A stale 'running' row older than this is treated as a crashed attempt and may
// be retried; a fresh one blocks a concurrent double-fire.
const RUNNING_STALE_MS = 15 * 60 * 1000

interface RunResult {
  status: 'sent' | 'skipped'
  memberStatements?: MemberStatementResult
}

// Acquire the run for a month. Returns false when it should be skipped (already
// completed, or another attempt is actively running) unless force is set.
async function beginReportRun(reportMonth: string, force: boolean): Promise<boolean> {
  const supabase = makeSupabase()
  const { data: existing } = await supabase
    .from('report_runs')
    .select('status, updated_at')
    .eq('report_month', reportMonth)
    .maybeSingle()

  if (existing) {
    // Concurrency lock applies even to a forced re-send: never run two attempts
    // for the same month at once.
    if (
      existing.status === 'running' &&
      Date.now() - new Date(existing.updated_at as string).getTime() < RUNNING_STALE_MS
    ) {
      return false // another invocation is in flight
    }
    // Skip an already-completed month unless the caller forces a re-send.
    if (existing.status === 'completed' && !force) return false
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('report_runs').upsert(
    { report_month: reportMonth, status: 'running', started_at: now, updated_at: now, last_error: null },
    { onConflict: 'report_month' },
  )
  if (error) throw new Error(`report_runs begin failed: ${error.message}`)
  return true
}

async function completeReportRun(reportMonth: string): Promise<void> {
  const supabase = makeSupabase()
  const now = new Date().toISOString()
  await supabase
    .from('report_runs')
    .update({ status: 'completed', completed_at: now, updated_at: now })
    .eq('report_month', reportMonth)
}

async function failReportRun(reportMonth: string, message: string): Promise<void> {
  const supabase = makeSupabase()
  await supabase
    .from('report_runs')
    .update({ status: 'failed', last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
    .eq('report_month', reportMonth)
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

// force: bypass the run ledger's skip-if-completed guard (admin explicit re-send)
// and use a fresh idempotency key so the emails actually go out again.
export async function runMonthlyReport(
  forMonth?: string,
  opts: { force?: boolean } = {},
): Promise<RunResult> {
  const { transactions, reportMonth, monthLabel } = await fetchAndEnrich(forMonth)

  const force = opts.force ?? false
  const acquired = await beginReportRun(reportMonth, force)
  if (!acquired) return { status: 'skipped' }

  // Stable key dedupes retries of this run; a forced re-send gets a unique key so
  // Resend actually delivers it again.
  const idempotencyKey = force ? `${reportMonth}-${Date.now()}` : reportMonth

  try {
    const summaries = computeSummary(transactions)
    const settings = await fetchReportSettings()
    const { format } = settings

    // Build attachments. A PDF failure must NOT sink the whole report — fall back
    // to sending the Excel/email only, so the report still goes out.
    let pdfBuffer: Buffer | null = null
    if (format.includePdf) {
      try {
        pdfBuffer = await generatePdf(summaries, transactions, monthLabel, reportMonth)
      } catch (err) {
        console.error('[report] PDF generation failed — sending without PDF:', err instanceof Error ? err.message : err)
      }
    }
    const xlsxBuffer = format.includeExcel ? await generateExcel(summaries, transactions) : null

    await sendEmail(
      pdfBuffer,
      xlsxBuffer,
      summaries,
      transactions,
      monthLabel,
      reportMonth,
      settings.recipients,
      settings.ccEmails,
      format,
      idempotencyKey,
    )

    // Per-member statements augment (never replace) the company report.
    let memberStatements: MemberStatementResult | undefined
    if (settings.memberStatementsEnabled && transactions.length > 0) {
      memberStatements = await sendMemberStatements(transactions, monthLabel, reportMonth, format, idempotencyKey)
    }

    // Archive BEFORE pruning; prune only deletes rows confirmed in the archive.
    await archiveTransactions(transactions, reportMonth)
    await pruneOldTransactions()
    await deactivateInactiveMembers()

    await completeReportRun(reportMonth)
    return { status: 'sent', memberStatements }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failReportRun(reportMonth, message)
    throw err
  }
}
