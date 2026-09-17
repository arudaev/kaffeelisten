// Shared report orchestrator: fetch → compute → PDF → Excel → email → archive → reset

import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import { Resend } from 'resend'
import { launchBrowser, pageToPdf, type Browser } from './pdf'
import {
  buildReportHtml,
  buildCompanyEmailHtml,
  buildMemberStatementHtml,
  buildCompanyDocumentHtml,
  buildCeoArchiveEmailHtml,
  renderTemplate,
  formatEuro,
  type EnrichedTransaction,
  type MemberSummary,
  type CompanySummary,
  type InvoiceRender,
} from './reportHtml'

import {
  resolveIssuer,
  resolveIssuerForReissue,
  splitVat,
  toInvoiceRender,
  ensureBillingDocument,
  markBillingDocumentSent,
  markBillingDocumentFailed,
  type IssuerConfig,
} from './billing'
import { findPalette } from './palettes'
import { makeMailer, replyTo } from './mail'
import { databaseConfigError } from '../../shared/environment'
import { mergeLiveAndArchive, unitPriceOf } from './pricing'
import {
  computeCampusRollup,
  generateCampusRollupExcel,
  type CampusRollup,
  generateCompanyExcel,
  generateExcel,
  generateManifestExcel,
  generateMemberExcel,
} from './excel'
import { archiveEntries, countMissingFiles, documentFileStem, sanitizeFile, type IssuedDoc } from './archive'
import {
  planDeliveries,
  type CompanyDelivery,
  type MatrixCompany,
  type MatrixMember,
  type MemberDelivery,
  type SkippedDelivery,
  type CheckoutMode,
  carriesAttachments,
} from './documentMatrix'
import { previousMonth } from './schedule'
import { computeAdminInsights, type AdminInsights } from './adminInsights'
import { mapWithConcurrency } from './concurrency'
import { docGroup, emptyProgress, type StoredProgress } from '../../shared/reportProgress'

// Kept exported from here so existing callers and tests need not change imports.
export { generateExcel }

export type { EnrichedTransaction, MemberSummary, CompanySummary }

export const EMAIL_LOGO_CONTENT_ID = 'kaffeelisten-logo'
export const EMAIL_LOGO_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAGAAAABNCAYAAABZqmHQAAAFhElEQVR4nOycW4xdUxzGvzOM6ZS2o6j77aE0LlHULdEQEhKhiLsHIqQkqFDxJKlHmnjxUNKQIOJFSLRumYgH16pqk5aQKo5rVA2j2k61Osf3Weukx2SfOVusddbqnv8v+bJm9t5zztr/b6/72tMDIyk9MJJiBiTGDEiMGZAYMyAxZkBizIDEmAGJMQMSYwYkJmsDGo1GnTocFWZvZAoDP5VJX61W+wEVJucSsIOaVHSC5tyNipDcAAZzNrVy7HE++duZbOC5OQV/dj6PX4YKkEMJOIz6ps25ZdS8guNHUF+jAuRgwFZqSptzH1EnFRzfQk1FBcjBgLXUWaxS9ik4p3ag6PjH1LmoAMkNYF3/G5O3qEsKTs+ivio4/jJ1KSpALr2gddRxYw/SnCVM3iy4fg11AipALuOABlUrOkETlrW5vhLkUgJOpL74D9efQn2OClBDJrARnsKn/Q9MMLIxYKJis6GJidIIszq5AK5e72853ON/lzTH0+elfn6vz4u0l9fY0jlK7fL6y2uH159emr4Y8WrlF2oVq7i1yIygVRADfzaTR6l9qTpccAeoaXCjXWky3Oh3G1zAJAVPgdyJ3UFWwBst+WwaI5N6/WfLQJnZ7z9XxzRKVluymfqdGvbXq+F+nZpPI0aRCcEMYPCPZfIe3BzNUdRGagXcdMJq3vQ6dAk16HABP506kzoHzhDxPfOSzSAupAEaNN1KzeUNrkSGMI8PMlnE/PUiE0I2wir6qpfn8Uaz610xTxo5z0FmhGyEP4Qr6qpf3+ANq/jX4SbbPqE+o9bz6fsSkeB3qh2YSR0PN1WhmdTZ/rSqwneoC5ERIasgTabdwgBfw5/VCB9DHU0dSWld91DqYGoGdSA1Hc4s1c1qNNUoq/fSbJCbDbHyqJKqh6XZ8CrQ+g7V9dP83w3B9XZ+pn6ifqS0nPkt3HpD3X/GJuZxAJkQpRvKG1Qv51Ovf0FzFEzN5St4+8EFs9k1be2S6rrmA6LeULP72ex2Nruc+q5/ej783i3j5Yvfjdzo+mSc7wIOe6Wgj0a8W3BcD0QdbmZ2kPl8G10g210REVEpKlrU19qDqrHTqMU0SQ/IQzRiBSIyEQ3YxaCuKTjePDZIPUwDbmb6KtP7eP0ziMRENKAUCjqDrx7ci0y38fcXEAGbjBsHX1JUEh6jCYcgAmZAB2iCxg5PUQsRATOgHEupGxEBM6AELAUazGmj8BkIjBlQng1wo/ugWC+oPBp1T0JgzIDy7A+3wBMUM6A8JyPCVhgzoARsfLUPdSsb4/UIjBlQjgVwY4HgmAEd4NN/D5MBPv1PIAIhDVAjNRl5o/WG0otQDP5dTG6nor2NE9IAbSPvR95ozn+o00UMvHZUaOpBq3mXx1xGDW3ATOSN1opHGeBFBee0lUZ9fa0hH0QtZeBvQmSCGcDMbuSNbaJObTPfngNz4Va9RgrO6Zjy/VzsRZhWQjfCr1BXYffiRm5cSd3ZzQB3IvRckFaO5rMUTEdmME/XMhnKKfgi+AYq3ugjTPp5owuQCcyTtrKsohYyX4PIiBgGaFuJ9ogu4c0+jQxgnp5kMsz83I/MCD4Q403u5A3fwR9fY7qZv7+EhPgSeQDzcRsyJNbGrNW+zn2e6YxYo8jx8BvAHofbjXc9MiXagozf2HQRdR2D8Sw1C13C/x8J7dDeznxc4f/vRJZ0ZRczA/IAk3vh3vldTn3AoHyHQPDz9eKGNuOeR10NV7IXt3nFNSu6to2cQdJq0g3UxXAvTmiDrnapjeD/oVKsDbqaKn6fWp5bT2c8ku3j94Zo+N9xbqbTRzHgv2IPxV5TTYztikiMGZAYMyAxZkBizIDEmAGJMQMSYwYkxgxIjBmQGDMgMWZAYsyAxJgBifkbAAD//3bPWa4AAAAGSURBVAMAqkWL0ctGfuYAAAAASUVORK5CYII='

// ─── Supabase (service role — bypasses RLS) ───────────────────────────────────

function makeSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  const envError = databaseConfigError(url, process.env.VERCEL_ENV)
  if (envError) throw new Error(envError)
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
  // Receives the archive ZIP (copies of every document sent). Nobody else does.
  ceoEmail: string | null
  memberStatementsEnabled: boolean
  companyDocumentsEnabled: boolean
  // Members of a company_paid company receive an information copy (migration 036).
  companyPaidMemberReportsEnabled: boolean
  format: ReportFormat
  schedule: ReportSchedule
  // Present only when invoice mode is on, authorised, and the issuer block is
  // complete; otherwise null and every document renders as a statement.
  issuer: IssuerConfig | null
}

// Per-company billing routing: billing_mode (migration 023), the employer-copy
// opt-in (033) and the checkout mode (034). documentMatrix.ts decides what each
// company and its members receive.
export interface CompanyBilling extends MatrixCompany {
  checkout_mode: CheckoutMode
}

// Reads the singleton app_settings row and resolves the effective recipients:
//   • to  = report_recipients, falling back to ADMIN_EMAIL env when empty
//   • cc  = [ceo_email] when cc_ceo_on_reports is on and ceo_email is set
export async function fetchReportSettings(): Promise<ReportSettings> {
  const supabase = makeSupabase()
  const { data, error } = await supabase
    .from('app_settings')
    .select('report_recipients, ceo_email, cc_ceo_on_reports, member_statements_enabled, company_documents_enabled, auto_report_enabled, auto_report_day, report_accent, report_subject, report_intro, report_include_pdf, report_include_excel, member_subject, member_intro, issue_invoices, issuer_legal_name, issuer_address, issuer_vat_id, issuer_iban, issuer_bic, invoice_number_prefix, invoice_payment_terms, invoice_vat_rate, invoice_mode_authorized, company_paid_member_reports_enabled')
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
    ceoEmail: data?.ceo_email?.trim() || null,
    memberStatementsEnabled: data?.member_statements_enabled ?? true,
    companyDocumentsEnabled: data?.company_documents_enabled ?? true,
    companyPaidMemberReportsEnabled: data?.company_paid_member_reports_enabled ?? true,
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
    issuer: resolveIssuer(data),
  }
}

// Reads per-company billing routing. Keyed by company id.
export async function fetchCompanyBilling(): Promise<Map<string, CompanyBilling>> {
  const supabase = makeSupabase()
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, billing_mode, billing_contact_name, billing_contact_email, member_document_copies_enabled, checkout_mode')
  if (error) throw new Error(`Failed to read company billing: ${error.message}`)
  return new Map((data ?? []).map(c => [c.id, c as CompanyBilling]))
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

  // A month is read from BOTH the live table and the archive. Once a reported
  // month's live rows are pruned, reading only the live table returned nothing, so
  // a forced re-send of an older month quietly produced an empty report. The two
  // are merged so each transaction counts once (pricing.ts mergeLiveAndArchive).
  const [liveRes, archiveRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .gte('logged_at', monthStart)
      .lt('logged_at', monthEnd),
    supabase
      .from('transactions_archive')
      .select('*')
      .eq('report_month', reportMonth),
  ])

  if (liveRes.error) throw new Error(`Failed to fetch transactions: ${liveRes.error.message}`)
  if (archiveRes.error) throw new Error(`Failed to fetch archived transactions: ${archiveRes.error.message}`)

  const [membersRes, companiesRes, itemsRes] = await Promise.all([
    supabase.from('members').select('id, name, company_id, work_email, kind'),
    supabase.from('companies').select('id, name'),
    supabase.from('items').select('id, name, unit_label, price_cents, category'),
  ])

  if (membersRes.error) throw new Error(`Failed to fetch members: ${membersRes.error.message}`)
  if (companiesRes.error) throw new Error(`Failed to fetch companies: ${companiesRes.error.message}`)
  if (itemsRes.error) throw new Error(`Failed to fetch items: ${itemsRes.error.message}`)

  const memberMap = new Map((membersRes.data ?? []).map(m => [m.id, m]))
  const companyMap = new Map((companiesRes.data ?? []).map(c => [c.id, c.name as string]))
  const itemMap = new Map((itemsRes.data ?? []).map(i => [i.id, i]))
  const catalogue = new Map((itemsRes.data ?? []).map(i => [i.id, i.price_cents]))

  const rows = mergeLiveAndArchive(liveRes.data ?? [], archiveRes.data ?? [])
    .sort((a, b) => String(a.logged_at).localeCompare(String(b.logged_at)))

  const transactions: EnrichedTransaction[] = rows.map(t => {
    const member = memberMap.get(t.member_id)
    const item = itemMap.get(t.item_id)
    // The checkout snapshot wins over today's catalogue price (pricing.ts), and
    // an archived row's recorded item identity wins over today's catalogue.
    const price_cents = unitPriceOf(t, catalogue)
    return {
      id: t.id,
      member_id: t.member_id,
      company_id: t.company_id,
      item_id: t.item_id,
      quantity: t.quantity,
      logged_at: t.logged_at,
      member_name: member?.name ?? '—',
      member_kind: member?.kind === 'house' ? 'house' : 'person',
      work_email: member?.work_email ?? null,
      company_name: companyMap.get(t.company_id) ?? '—',
      item_name: t.item_name ?? item?.name ?? '—',
      item_category: t.item_category ?? item?.category ?? '—',
      unit_label: t.unit_label ?? item?.unit_label ?? 'Stück',
      price_cents,
      total_cents: price_cents * t.quantity,
    }
  })

  return { transactions, reportMonth, monthLabel }
}

// ─── Summary computation ──────────────────────────────────────────────────────

// Groups by company_id then member_id — never by display name. Names are not
// unique, and per-person documents are built from these summaries, so grouping
// on names would bill two same-named colleagues for each other's entries.
export function computeSummary(transactions: EnrichedTransaction[]): CompanySummary[] {
  const companyMap = new Map<string, Map<string, EnrichedTransaction[]>>()

  for (const t of transactions) {
    if (!companyMap.has(t.company_id)) companyMap.set(t.company_id, new Map())
    const memberMap = companyMap.get(t.company_id)!
    if (!memberMap.has(t.member_id)) memberMap.set(t.member_id, [])
    memberMap.get(t.member_id)!.push(t)
  }

  const summaries: CompanySummary[] = []

  for (const [company_id, members] of companyMap) {
    const memberSummaries: MemberSummary[] = []
    for (const [member_id, entries] of members) {
      const subtotal_cents = entries.reduce((s, e) => s + e.total_cents, 0)
      memberSummaries.push({
        member_id,
        member_name: entries[0].member_name,
        work_email: entries[0].work_email ?? null,
        entries,
        subtotal_cents,
      })
    }
    memberSummaries.sort((a, b) => b.subtotal_cents - a.subtotal_cents)

    summaries.push({
      company_id,
      company_name: [...members.values()][0][0].company_name,
      members: memberSummaries,
      total_cents: memberSummaries.reduce((s, m) => s + m.subtotal_cents, 0),
      total_entries: memberSummaries.reduce((s, m) => s + m.entries.length, 0),
    })
  }

  summaries.sort((a, b) => b.total_cents - a.total_cents)
  return summaries
}

// ─── PDF (HTML → puppeteer) ───────────────────────────────────────────────────

// Standalone aggregate-report PDF (launches and closes its own browser). The
// monthly run instead shares a single browser via launchBrowser/pageToPdf so it
// doesn't pay Chromium cold-start per recipient; this remains for any caller that
// just wants the one summary PDF.
export async function generatePdf(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    return await pageToPdf(browser, buildReportHtml(summaries, transactions, monthLabel, reportMonth))
  } finally {
    await browser.close()
  }
}

// ─── Per-recipient PDFs ───────────────────────────────────────────────────────

// Per-run PDF budget. Attaching a PDF to every email spins Chromium once per page;
// on the serverless ceiling that must stay bounded. Generation stops after a
// wall-clock deadline (leaving time for archive/prune) and a hard count cap — the
// email still sends, just without that attachment. A document sent without its
// PDF is still collected and flagged in the archive manifest (archive.ts), never
// silently dropped.
interface PdfBudget {
  browser: Browser | null
  deadline: number   // epoch ms
  remaining: number
}

// Both report endpoints (send-report.ts, cron/monthly-report.ts) declare
// maxDuration: 300 — Vercel reads that as a literal, so it cannot import this.
// PDF rendering stops 60 s before the limit, leaving time to send the admin
// email, archive and prune. The old 45 s / 120-document budget sat inside a
// 60 s limit and could not render ITC1's ~90 documents, which took ~1 s each
// serially; with PDF_CONCURRENCY pages at once that is now ~25-30 s.
export const REPORT_MAX_DURATION_MS = 300_000
const PDF_RESERVE_MS = 60_000
const PDF_MAX_DOCUMENTS = 500
const PDF_CONCURRENCY = 4

function makePdfBudget(browser: Browser | null): PdfBudget {
  return {
    browser,
    deadline: Date.now() + REPORT_MAX_DURATION_MS - PDF_RESERVE_MS,
    remaining: PDF_MAX_DOCUMENTS,
  }
}

async function renderDocPdf(budget: PdfBudget, html: string): Promise<Buffer | null> {
  if (!budget.browser || budget.remaining <= 0 || Date.now() > budget.deadline) return null
  budget.remaining--
  try {
    return await pageToPdf(budget.browser, html)
  } catch (err) {
    console.error('[pdf] per-recipient render failed:', err instanceof Error ? err.message : err)
    return null
  }
}

// An Excel failure must not stop the email: the document goes out without it and
// the manifest flags the gap.
async function safeExcel(label: string, build: () => Promise<Buffer>): Promise<Buffer | null> {
  try {
    return await build()
  } catch (err) {
    console.error(`[excel] ${label} failed:`, err instanceof Error ? err.message : err)
    return null
  }
}

async function makeZip(files: { name: string; content: Buffer }[]): Promise<Buffer> {
  const zip = new JSZip()
  for (const f of files) zip.file(f.name, f.content)
  return zip.generateAsync({ type: 'nodebuffer' })
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
  // Key figures, restocking guide and warnings for ITC1's administration, plus
  // the campus roll-up workbook. The archive ZIP is NOT attached here: it goes
  // to the CEO alone (sendCeoArchive).
  extras: { insights?: AdminInsights; rollupXlsx?: Buffer | null } = {},
): Promise<string | null> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) throw new Error('Missing RESEND_API_KEY')
  if (recipients.length === 0) {
    throw new Error('No report recipients configured (app_settings.report_recipients / ADMIN_EMAIL)')
  }

  const resend = makeMailer(resendKey)

  const [yearStr] = reportMonth.split('-')
  const html = buildCompanyEmailHtml(summaries, transactions, monthLabel, {
    accent: format.accent,
    intro: format.reportIntro ? renderTemplate(format.reportIntro, { monat: monthLabel, jahr: yearStr }) : undefined,
    logoSrc: `cid:${EMAIL_LOGO_CONTENT_ID}`,
    insights: extras.insights,
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
  if (extras.rollupXlsx) {
    attachments.push({ filename: `Campus-Auswertung-${reportMonth}.xlsx`, content: extras.rollupXlsx.toString('base64') })
  }

  const { data, error } = await resend.emails.send(
    {
      from: 'Kaffeelisten <bericht@kaffeelisten.de>',
      to: recipients,
      ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
      ...(replyTo() ? { replyTo: replyTo()! } : {}),
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
  return data?.id ?? null
}

/**
 * The management archive goes to the CEO only: it holds a copy of every invoice
 * and statement issued to every person, which the wider report recipients have
 * no reason to receive.
 */
export async function sendCeoArchive(
  ceoEmail: string,
  zip: Buffer,
  documentCount: number,
  monthLabel: string,
  reportMonth: string,
  format: ReportFormat,
  idempotencyKey: string,
): Promise<string | null> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) throw new Error('Missing RESEND_API_KEY')
  const { data, error } = await makeMailer(resendKey).emails.send(
    {
      from: 'Kaffeelisten <bericht@kaffeelisten.de>',
      to: [ceoEmail],
      ...(replyTo() ? { replyTo: replyTo()! } : {}),
      subject: `Kaffeelisten – Dokumentenarchiv ${monthLabel}`,
      html: buildCeoArchiveEmailHtml(monthLabel, documentCount, { accent: format.accent }),
      attachments: [{ filename: `Kaffeelisten-Archiv-${reportMonth}.zip`, content: zip.toString('base64') }],
    },
    { idempotencyKey: `ceo-archive-${idempotencyKey}` },
  )
  if (error) throw new Error(`Resend CEO archive failed: ${error.message ?? JSON.stringify(error)}`)
  return data?.id ?? null
}

// ─── Per-person and per-company documents ─────────────────────────────────────

export interface MemberStatementResult {
  sent: number
  failed: number
}

// Everything a delivery needs that is the same for the whole run.
interface DeliveryContext {
  resend: Resend
  supabase: ReturnType<typeof makeSupabase>
  monthLabel: string
  reportMonth: string
  format: ReportFormat
  idempotencyKey: string
  // Present only when invoice mode is on AND authorised (billing.ts resolveIssuer).
  issuer?: IssuerConfig
  budget: PdfBudget
}

const MEMBER_SUBJECT: Record<MemberDelivery['kind'], string> = {
  member_invoice: 'Rechnung',
  member_statement: 'Deine Aufstellung',
  member_info: 'Deine Übersicht',
}

function attachmentsFor(doc: IssuedDoc): Array<{ filename: string; content: string }> {
  const stem = documentFileStem(doc)
  const out: Array<{ filename: string; content: string }> = []
  if (doc.pdf) out.push({ filename: `${stem}.pdf`, content: doc.pdf.toString('base64') })
  if (doc.xlsx) out.push({ filename: `${stem}.xlsx`, content: doc.xlsx.toString('base64') })
  return out
}

// A document ready to send: numbered (if an invoice), rendered to HTML, with its
// files attached once rendering finishes.
interface PreparedDoc {
  to: string
  subject: string
  // The email body, and the HTML rendered to the attached PDF. They differ for
  // company documents: the email stays short, the PDF carries every person.
  html: string
  pdfHtml: string
  idempotencyKey: string
  ledgerId: string | null
  issued: IssuedDoc
  // Rendered in the concurrent phase; the Excel builder is deferred until then.
  buildExcel: () => Promise<Buffer>
}

// Render every prepared document's PDF and Excel a few at a time on the shared
// browser. Serial rendering (~1s per PDF) could not fit ITC1's volume in one run.
async function renderPrepared(ctx: DeliveryContext, prepared: PreparedDoc[]): Promise<void> {
  // Only invoices get files; statements and information copies are email only.
  const withFiles = prepared.filter(p => carriesAttachments(p.issued.kind))
  await mapWithConcurrency(withFiles, PDF_CONCURRENCY, async p => {
    const [pdf, xlsx] = await Promise.all([
      renderDocPdf(ctx.budget, p.pdfHtml),
      safeExcel(`${p.issued.kind} ${p.issued.memberId ?? p.issued.companyId}`, p.buildExcel),
    ])
    p.issued.pdf = pdf
    p.issued.xlsx = xlsx
  })
}

// Append the delivered document to the ledger (migration 037). A ledger failure
// is logged, not thrown: the email has already gone out, and aborting the loop
// would leave the remaining recipients unsent.
async function recordDelivery(ctx: DeliveryContext, p: PreparedDoc, messageId: string | null): Promise<void> {
  const d = p.issued
  const { error } = await ctx.supabase.from('document_deliveries').insert({
    report_month: d.reportMonth,
    kind: d.kind,
    company_id: d.companyId,
    member_id: d.memberId,
    recipient_name: d.recipientName,
    recipient_email: d.recipientEmail,
    document_number: d.documentNumber,
    billing_document_id: p.ledgerId,
    gross_cents: d.grossCents,
    has_pdf: !!d.pdf,
    has_xlsx: !!d.xlsx,
    resend_message_id: messageId,
  })
  if (error) console.error(`[delivery-ledger] could not record ${d.kind} for ${d.recipientEmail}:`, error.message)
}

// Send prepared documents one at a time (Resend rate limits), marking ledger rows.
// Individual failures are counted and logged, not thrown, so one bad address
// never aborts the run. Every successfully sent document is pushed to `collect`,
// with or without its files.
async function sendPrepared(
  ctx: DeliveryContext,
  prepared: readonly PreparedDoc[],
  extraAttachments: (p: PreparedDoc) => Promise<Array<{ filename: string; content: string }>>,
  collect: IssuedDoc[],
  logLabel: string,
): Promise<MemberStatementResult> {
  let sent = 0
  let failed = 0
  for (const p of prepared) {
    const attachments = [...attachmentsFor(p.issued), ...(await extraAttachments(p))]
    try {
      const { data, error } = await ctx.resend.emails.send(
        {
          from: 'Kaffeelisten <bericht@kaffeelisten.de>',
          to: [p.to],
          ...(replyTo() ? { replyTo: replyTo()! } : {}),
          subject: p.subject,
          html: p.html,
          ...(attachments.length ? { attachments } : {}),
        },
        { idempotencyKey: p.idempotencyKey },
      )
      if (error) throw new Error(error.message ?? JSON.stringify(error))
      if (p.ledgerId) await markBillingDocumentSent(ctx.supabase, p.ledgerId, data?.id ?? null)
      await recordDelivery(ctx, p, data?.id ?? null)
      collect.push(p.issued)
      sent++
      // Light throttle — Resend limits requests per second.
      await new Promise(r => setTimeout(r, 120))
    } catch (err) {
      failed++
      if (p.ledgerId) await markBillingDocumentFailed(ctx.supabase, p.ledgerId)
      console.error(`[${logLabel}] failed for ${p.to}:`, err instanceof Error ? err.message : err)
    }
  }
  return { sent, failed }
}

// Sends each planned person their document — an invoice, a statement, or an
// information copy when their company pays (documentMatrix.ts decides which).
export async function sendMemberStatements(
  ctx: DeliveryContext,
  deliveries: readonly MemberDelivery[],
  entriesByMember: ReadonlyMap<string, EnrichedTransaction[]>,
  companyNames: ReadonlyMap<string, string>,
  collect: IssuedDoc[],
): Promise<MemberStatementResult> {
  const [yearStr] = ctx.reportMonth.split('-')
  const prepared: PreparedDoc[] = []

  for (const d of deliveries) {
    const entries = entriesByMember.get(d.memberId) ?? []
    const firstName = d.name.trim().split(/\s+/)[0] || d.name
    const grossCents = entries.reduce((s, e) => s + e.total_cents, 0)
    const vars = { monat: ctx.monthLabel, jahr: yearStr, name: firstName, gesamt: formatEuro(grossCents) }

    // Allocate/reuse the invoice number (idempotent) before rendering, because
    // the number is printed on the document. Only an invoice is numbered.
    let invoiceRender: InvoiceRender | undefined
    let ledgerId: string | null = null
    if (d.kind === 'member_invoice') {
      if (!ctx.issuer) throw new Error('member_invoice planned without an authorised issuer')
      const split = splitVat(grossCents, ctx.issuer.vatRate)
      const doc = await ensureBillingDocument(ctx.supabase, ctx.issuer.numberPrefix, {
        reportMonth: ctx.reportMonth, recipientType: 'member', recipientName: d.name, recipientEmail: d.email,
        companyId: d.companyId, memberId: d.memberId,
        subtotalCents: split.netCents, taxCents: split.taxCents, totalCents: split.grossCents,
      })
      ledgerId = doc.id
      invoiceRender = toInvoiceRender(ctx.issuer, doc.document_number, split)
    }

    const memberHtml = buildMemberStatementHtml(d.name, entries, ctx.monthLabel, {
      accent: ctx.format.accent,
      intro: ctx.format.memberIntro ? renderTemplate(ctx.format.memberIntro, vars) : undefined,
      invoice: invoiceRender,
      infoOnly: d.kind === 'member_info' ? { payerName: d.payerName ?? companyNames.get(d.companyId) ?? '' } : undefined,
    })
    prepared.push({
      to: d.email,
      subject: ctx.format.memberSubject
        ? renderTemplate(ctx.format.memberSubject, vars)
        : `Kaffeelisten – ${MEMBER_SUBJECT[d.kind]} ${ctx.monthLabel}`,
      html: memberHtml,
      pdfHtml: memberHtml,
      idempotencyKey: `member-${ctx.idempotencyKey}-${d.memberId}`,
      ledgerId,
      issued: {
        kind: d.kind,
        reportMonth: ctx.reportMonth,
        companyId: d.companyId,
        companyName: companyNames.get(d.companyId) ?? '—',
        memberId: d.memberId,
        documentNumber: invoiceRender?.documentNumber ?? null,
        recipientName: d.name,
        recipientEmail: d.email,
        netCents: invoiceRender?.netCents ?? null,
        taxCents: invoiceRender?.taxCents ?? null,
        grossCents,
        pdf: null,
        xlsx: null,
      },
      buildExcel: () => generateMemberExcel(entries),
    })
  }

  await renderPrepared(ctx, prepared)
  return sendPrepared(ctx, prepared, async () => [], collect, 'member-document')
}

// Sends each planned company its document: an invoice when it pays and invoice
// mode is authorised, otherwise a statement. Every company document carries an
// Excel itemising every member's entries. Where the company opted in, it also
// carries copies of the documents its own employees received this run, which is
// why members are sent first.
export async function sendCompanyDocuments(
  ctx: DeliveryContext,
  deliveries: readonly CompanyDelivery[],
  summariesByCompany: ReadonlyMap<string, CompanySummary>,
  memberDocs: readonly IssuedDoc[],
  collect: IssuedDoc[],
): Promise<MemberStatementResult> {
  const [yearStr] = ctx.reportMonth.split('-')
  const prepared: PreparedDoc[] = []
  const deliveryFor = new Map<PreparedDoc, CompanyDelivery>()

  for (const d of deliveries) {
    const members: MemberSummary[] = summariesByCompany.get(d.companyId)?.members ?? []
    const grossCents = members.reduce((s, m) => s + m.subtotal_cents, 0)

    let invoice: InvoiceRender | undefined
    let ledgerId: string | null = null
    if (d.kind === 'company_invoice') {
      if (!ctx.issuer) throw new Error('company_invoice planned without an authorised issuer')
      const split = splitVat(grossCents, ctx.issuer.vatRate)
      const doc = await ensureBillingDocument(ctx.supabase, ctx.issuer.numberPrefix, {
        reportMonth: ctx.reportMonth, recipientType: 'company', recipientName: d.contactName || d.companyName,
        recipientEmail: d.email, companyId: d.companyId, memberId: null,
        subtotalCents: split.netCents, taxCents: split.taxCents, totalCents: split.grossCents,
      })
      ledgerId = doc.id
      invoice = toInvoiceRender(ctx.issuer, doc.document_number, split)
    }

    const companyOpts = {
      accent: ctx.format.accent,
      intro: ctx.format.reportIntro ? renderTemplate(ctx.format.reportIntro, { monat: ctx.monthLabel, jahr: yearStr }) : undefined,
      invoice,
    }
    const p: PreparedDoc = {
      to: d.email,
      subject: invoice
        ? `Kaffeelisten – Rechnung ${d.companyName} ${ctx.monthLabel}`
        : `Kaffeelisten – Aufstellung ${d.companyName} ${ctx.monthLabel}`,
      html: buildCompanyDocumentHtml(d.companyName, d.contactName, members, ctx.monthLabel, { ...companyOpts, variant: 'email' }),
      pdfHtml: buildCompanyDocumentHtml(d.companyName, d.contactName, members, ctx.monthLabel, { ...companyOpts, variant: 'document' }),
      idempotencyKey: `companydoc-${ctx.idempotencyKey}-${d.companyId}`,
      ledgerId,
      issued: {
        kind: d.kind,
        reportMonth: ctx.reportMonth,
        companyId: d.companyId,
        companyName: d.companyName,
        memberId: null,
        documentNumber: invoice?.documentNumber ?? null,
        recipientName: d.contactName || d.companyName,
        recipientEmail: d.email,
        netCents: invoice?.netCents ?? null,
        taxCents: invoice?.taxCents ?? null,
        grossCents,
        pdf: null,
        xlsx: null,
      },
      buildExcel: () => generateCompanyExcel(members),
    }
    prepared.push(p)
    deliveryFor.set(p, d)
  }

  await renderPrepared(ctx, prepared)

  // Opt-in employer copies (migration 033): the documents this company's own
  // employees received, with a manifest.
  const employeeCopies = async (p: PreparedDoc) => {
    const d = deliveryFor.get(p)!
    if (!d.includeMemberCopies) return []
    // Copies of files that exist: employees' invoices. Email-only documents have none.
    const own = memberDocs.filter(m => m.companyId === d.companyId && (m.pdf || m.xlsx))
    if (own.length === 0) return []
    try {
      const { files, manifest } = archiveEntries(own)
      files.push({ name: `Übersicht-${sanitizeFile(d.companyName)}-${ctx.reportMonth}.xlsx`, content: await generateManifestExcel(manifest) })
      const zip = await makeZip(files)
      return [{ filename: `Mitarbeitende-${sanitizeFile(d.companyName)}-${ctx.reportMonth}.zip`, content: zip.toString('base64') }]
    } catch (zErr) {
      console.error('[company-copies] zip failed:', zErr instanceof Error ? zErr.message : zErr)
      return []
    }
  }

  return sendPrepared(ctx, prepared, employeeCopies, collect, 'company-document')
}

// ─── Billing run ledger (invoice mode) ────────────────────────────────────────

async function beginBillingRun(reportMonth: string): Promise<void> {
  const supabase = makeSupabase()
  const now = new Date().toISOString()
  const { error } = await supabase.from('billing_runs').upsert(
    { report_month: reportMonth, status: 'running', started_at: now, updated_at: now, last_error: null },
    { onConflict: 'report_month' },
  )
  if (error) throw new Error(`billing_runs begin failed: ${error.message}`)
}

async function completeBillingRun(reportMonth: string): Promise<void> {
  const supabase = makeSupabase()
  const now = new Date().toISOString()
  await supabase.from('billing_runs')
    .update({ status: 'completed', completed_at: now, updated_at: now })
    .eq('report_month', reportMonth)
}

async function failBillingRun(reportMonth: string, message: string): Promise<void> {
  const supabase = makeSupabase()
  await supabase.from('billing_runs')
    .update({ status: 'failed', last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
    .eq('report_month', reportMonth)
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
  //
  // The archive is permanent (never pruned; DELETE revoked in migration 039), so each row carries the price paid
  // and the item's identity as they were at reporting time (migration 031). A
  // month stays reproducible after an item is renamed, repriced or deactivated.
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
        unit_price_cents: t.price_cents,
        item_name: t.item_name,
        unit_label: t.unit_label,
        item_category: t.item_category,
      })),
      { onConflict: 'id,report_month', ignoreDuplicates: true },
    )

  if (archErr) throw new Error(`Archive insert failed: ${archErr.message}`)
}

// ─── Prune the live table (the archive is permanent) ──────────────────────────

// Earliest logged_at kept in the live `transactions` table: the 1st of the month
// two months before `now`. Older, already-archived rows leave the admin's entries
// view but remain in transactions_archive.
export function computeLivePruneCutoff(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()
}

export async function pruneOldTransactions(): Promise<void> {
  const supabase = makeSupabase()
  const cutoff = computeLivePruneCutoff(new Date())

  // Only delete live transactions that have actually been archived. A month that
  // was never reported (and therefore never archived) is retained rather than
  // silently lost — the delete goes through prune_reported_transactions, which
  // filters on existence in transactions_archive.
  const { error: liveErr } = await supabase.rpc('prune_reported_transactions', { p_cutoff: cutoff })
  if (liveErr) throw new Error(`Prune transactions failed: ${liveErr.message}`)

  // transactions_archive is never pruned. It used to be trimmed to the same
  // window "to stay within Supabase free-tier storage", which destroyed all
  // history after ~2-3 months — including the audit trail migration 025 relies
  // on and invoice data §14b UStG requires be kept for 8 years. At ITC1's volume
  // (~2,400 rows/month, a few MB/year) storage was never the constraint.
  // Migration 039 (follow-up PR) revokes DELETE on the archive so this cannot quietly return.
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

  // Never a house account: it is a company-checkout company's ONLY booking target
  // (migration 034). Deactivating it after one quiet month would make every order
  // for that company fail with no_house_account until an admin noticed.
  const { error: updErr } = await supabase
    .from('members')
    .update({ active: false })
    .in('id', toDeactivate)
    .eq('active', true)
    .eq('kind', 'person')

  if (updErr) throw new Error(`deactivateInactiveMembers update failed: ${updErr.message}`)
}

// ─── Run ledger (idempotency at the run level) ────────────────────────────────

// A stale 'running' row older than this is treated as a crashed attempt and may
// be retried; a fresh one blocks a concurrent double-fire.
const RUNNING_STALE_MS = 15 * 60 * 1000

interface RunResult {
  status: 'sent' | 'skipped'
  memberStatements?: MemberStatementResult
  // Recipients who could not be sent a document, and why — e.g. a company that
  // pays but has no billing contact. Intentionally disabled documents are omitted.
  skipped?: SkippedDelivery[]
  // Documents delivered without a PDF or Excel (flagged in the archive manifest).
  missingFiles?: { pdf: number; xlsx: number }
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

// Live progress on report_runs.progress (migration 040), read by the admin send
// dialog. Every write also refreshes updated_at, which keeps a long run from
// looking stale to beginReportRun. A failed write is logged, never thrown: the
// progress display must not break the run.
class RunProgress {
  readonly state: StoredProgress = emptyProgress()
  private readonly supabase = makeSupabase()

  constructor(private readonly reportMonth: string) {}

  async update(change: (state: StoredProgress) => void): Promise<void> {
    change(this.state)
    const { error } = await this.supabase
      .from('report_runs')
      .update({ progress: this.state, updated_at: new Date().toISOString() })
      .eq('report_month', this.reportMonth)
    if (error) console.error('[report] progress not saved:', error.message)
  }
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
  const progress = new RunProgress(reportMonth)
  await progress.update(() => {})

  // Stable key dedupes retries of this run; a forced re-send gets a unique key so
  // Resend actually delivers it again.
  const idempotencyKey = force ? `${reportMonth}-${Date.now()}` : reportMonth

  try {
    const summaries = computeSummary(transactions)
    const settings = await fetchReportSettings()
    const { format } = settings
    const issuer = settings.issuer ?? undefined
    const needDocs = transactions.length > 0 && (settings.companyDocumentsEnabled || settings.memberStatementsEnabled)

    // One Chromium for the whole run: the aggregate summary PDF plus every
    // per-recipient PDF. A launch failure must NOT sink the report — we fall back
    // to sending without PDFs, and the archive manifest flags every missing file.
    let browser: Browser | null = null
    if (format.includePdf || needDocs) {
      try {
        browser = await launchBrowser()
      } catch (err) {
        console.error('[report] Chromium launch failed — sending without PDFs:', err instanceof Error ? err.message : err)
        browser = null
      }
    }

    try {
      // Aggregate report PDF (summary across all companies).
      let pdfBuffer: Buffer | null = null
      if (format.includePdf && browser) {
        try {
          pdfBuffer = await pageToPdf(browser, buildReportHtml(summaries, transactions, monthLabel, reportMonth))
        } catch (err) {
          console.error('[report] aggregate PDF failed — sending without it:', err instanceof Error ? err.message : err)
        }
      }
      const xlsxBuffer = format.includeExcel ? await generateExcel(summaries, transactions) : null

      // Three streams. People first, so their documents can be copied into the
      // opted-in company documents; companies second; the admin/CEO email LAST,
      // because its archive contains copies of everything the first two sent.
      const rollup = transactions.length > 0 ? await loadCampusRollup(reportMonth, transactions) : null
      const rollupXlsx = rollup ? await safeExcel('campus roll-up', () => generateCampusRollupExcel(rollup)) : null
      const budget = makePdfBudget(browser)
      const issuedDocs: IssuedDoc[] = []
      let memberStatements: MemberStatementResult | undefined
      let skipped: SkippedDelivery[] = []
      let archiveZip: Buffer | null = null

      if (needDocs) {
        const companyBilling = await fetchCompanyBilling()
        const plan = planDeliveries(consumersOf(transactions), companyBilling, {
          memberStatementsEnabled: settings.memberStatementsEnabled,
          companyDocumentsEnabled: settings.companyDocumentsEnabled,
          companyPaidMemberReportsEnabled: settings.companyPaidMemberReportsEnabled,
          invoiceMode: !!issuer,
        })
        skipped = plan.skipped
        await progress.update(state => {
          for (const d of [...plan.members, ...plan.companies]) state.planned[docGroup(d.kind)]++
        })
        for (const s of skipped) {
          if (s.reason !== 'disabled' && !s.optional) console.warn(`[report] ${s.recipient} ${s.name} not sent: ${s.reason}`)
        }

        const resendKey = process.env.RESEND_API_KEY
        if (!resendKey) throw new Error('Missing RESEND_API_KEY')
        const ctx: DeliveryContext = {
          resend: makeMailer(resendKey),
          supabase: makeSupabase(),
          monthLabel, reportMonth, format, idempotencyKey, issuer, budget,
        }

        const entriesByMember = new Map<string, EnrichedTransaction[]>()
        for (const t of transactions) {
          const list = entriesByMember.get(t.member_id) ?? []
          list.push(t)
          entriesByMember.set(t.member_id, list)
        }
        const companyNames = new Map([...companyBilling.values()].map(c => [c.id, c.name]))
        const summariesByCompany = new Map(summaries.map(s => [s.company_id, s]))

        const useLedger = !!issuer
        if (useLedger) await beginBillingRun(reportMonth)
        try {
          const memberDocs: IssuedDoc[] = []
          await progress.update(state => { state.phase = 'people' })
          const m = await sendMemberStatements(ctx, plan.members, entriesByMember, companyNames, memberDocs)
          await progress.update(state => { state.phase = 'companies'; state.failed = m.failed })
          const c = await sendCompanyDocuments(ctx, plan.companies, summariesByCompany, memberDocs, issuedDocs)
          await progress.update(state => { state.failed = m.failed + c.failed })
          issuedDocs.unshift(...memberDocs)
          memberStatements = { sent: m.sent + c.sent, failed: m.failed + c.failed }
          if (useLedger) await completeBillingRun(reportMonth)
        } catch (billErr) {
          if (useLedger) await failBillingRun(reportMonth, billErr instanceof Error ? billErr.message : String(billErr))
          throw billErr
        }

        // Roll-up (with the previous month) feeds both the admin email and the archive.
        // CEO/Management archive, in BOTH invoice and statement mode: exact copies
        // of every document sent, a manifest listing all of them (flagging any
        // whose file could not be produced), the monthly report and the campus
        // roll-up with the month-over-month comparison.
        if (issuedDocs.length > 0) {
          try {
            const { files, manifest } = archiveEntries(issuedDocs)
            files.push({ name: `Übersicht-versandte-Dokumente-${reportMonth}.xlsx`, content: await generateManifestExcel(manifest) })
            if (pdfBuffer) files.push({ name: `Monatsbericht-${reportMonth}.pdf`, content: pdfBuffer })
            if (xlsxBuffer) files.push({ name: `Monatsbericht-${reportMonth}.xlsx`, content: xlsxBuffer })
            if (rollupXlsx) files.push({ name: `Campus-Auswertung-${reportMonth}.xlsx`, content: rollupXlsx })
            archiveZip = await makeZip(files)
          } catch (zErr) {
            console.error('[report] management archive failed:', zErr instanceof Error ? zErr.message : zErr)
          }
        }
      }

      const archiveTarget = archiveZip ? settings.ceoEmail : null
      const insights = computeAdminInsights({
        rollup,
        skipped: skipped.filter(s => s.reason !== 'disabled' && !s.optional),
        failedDeliveries: memberStatements?.failed ?? 0,
        missingFiles: (m => m.pdf + m.xlsx)(countMissingFiles(issuedDocs)),
        archiveNotSent: !!archiveZip && !archiveTarget,
      })
      await progress.update(state => {
        state.phase = 'report'
        state.archive.planned = !!archiveZip && !!archiveTarget
      })
      const reportMessageId = await sendEmail(
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
        { insights, rollupXlsx },
      )
      await progress.update(state => { state.report = { planned: true, sent: true, messageId: reportMessageId } })
      if (archiveZip && archiveTarget) {
        try {
          await progress.update(state => { state.phase = 'archive' })
          const archiveMessageId = await sendCeoArchive(archiveTarget, archiveZip, issuedDocs.length, monthLabel, reportMonth, format, idempotencyKey)
          await progress.update(state => { state.archive = { planned: true, sent: true, messageId: archiveMessageId } })
        } catch (err) {
          // The report itself went out; copies stay re-downloadable from Dokumente.
          console.error('[report] CEO archive not sent:', err instanceof Error ? err.message : err)
        }
      }

      // Archive BEFORE pruning; prune only deletes rows confirmed in the archive.
      await progress.update(state => { state.phase = 'finishing' })
      await archiveTransactions(transactions, reportMonth)
      await pruneOldTransactions()
      await deactivateInactiveMembers()

      await progress.update(state => { state.phase = 'done' })
      await completeReportRun(reportMonth)
      return {
        status: 'sent',
        memberStatements,
        skipped: skipped.filter(s => s.reason !== 'disabled' && !s.optional),
        missingFiles: countMissingFiles(issuedDocs),
      }
    } finally {
      if (browser) {
        try { await browser.close() } catch { /* best-effort */ }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await progress.update(state => { state.phase = 'failed' })
    await failReportRun(reportMonth, message)
    throw err
  }
}

// The people who consumed something this month, once each, for the delivery plan.
function consumersOf(transactions: readonly EnrichedTransaction[]): MatrixMember[] {
  const byId = new Map<string, MatrixMember>()
  for (const t of transactions) {
    if (!byId.has(t.member_id)) {
      byId.set(t.member_id, {
        id: t.member_id,
        company_id: t.company_id,
        name: t.member_name,
        email: t.work_email,
        kind: t.member_kind ?? 'person',
      })
    }
  }
  return [...byId.values()]
}

// The administrative roll-up, comparing against the previous month. Failure is
// non-fatal: the report goes out without the comparison.
async function loadCampusRollup(
  reportMonth: string,
  current: EnrichedTransaction[],
): Promise<CampusRollup | null> {
  try {
    const [y, m] = reportMonth.split('-').map(Number)
    const prev = previousMonth(y, m)
    const { transactions: previous } = await fetchAndEnrich(prev)
    return computeCampusRollup(reportMonth, prev, current, previous)
  } catch (err) {
    console.error('[report] campus roll-up failed:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Re-download and re-send a delivered document ─────────────────────────────

export interface RegeneratedDocument {
  delivery: {
    id: string
    report_month: string
    kind: IssuedDoc['kind']
    company_id: string
    member_id: string | null
    recipient_name: string
    recipient_email: string
    document_number: string | null
  }
  subject: string
  html: string
  pdfHtml: string
  fileStem: string
  xlsx: Buffer
}

export class DeliveryNotFoundError extends Error {
  constructor(id: string) {
    super(`Delivery ${id} not found`)
    this.name = 'DeliveryNotFoundError'
  }
}

/**
 * Rebuild a delivered document from the archive (+ live table) for its month.
 *
 * An invoice keeps its stored number and its stored net, VAT and gross amounts —
 * nothing here allocates a document number. Entries are read with their price
 * snapshots, so a later price change does not alter the copy. Only the issuer
 * block reflects today's settings (see resolveIssuerForReissue).
 */
export async function regenerateDelivery(deliveryId: string): Promise<RegeneratedDocument> {
  const supabase = makeSupabase()
  const { data: delivery, error } = await supabase
    .from('document_deliveries')
    .select('id, report_month, kind, company_id, member_id, recipient_name, recipient_email, document_number, billing_document_id')
    .eq('id', deliveryId)
    .maybeSingle()
  if (error) throw new Error(`Failed to read delivery: ${error.message}`)
  if (!delivery) throw new DeliveryNotFoundError(deliveryId)

  const [{ transactions, monthLabel }, settings, { data: company }] = await Promise.all([
    fetchAndEnrich(delivery.report_month),
    fetchReportSettings(),
    supabase.from('companies').select('id, name, billing_contact_name').eq('id', delivery.company_id).maybeSingle(),
  ])
  const companyName: string = company?.name ?? '—'

  let invoice: InvoiceRender | undefined
  if (delivery.document_number) {
    const { data: doc, error: docErr } = await supabase
      .from('billing_documents')
      .select('document_number, subtotal_cents, tax_cents, total_cents')
      .eq('id', delivery.billing_document_id)
      .maybeSingle()
    if (docErr) throw new Error(`Failed to read billing document: ${docErr.message}`)
    if (!doc) throw new Error(`Billing document for ${delivery.document_number} is missing`)
    const { data: issuerRow } = await supabase
      .from('app_settings')
      .select('issue_invoices, issuer_legal_name, issuer_address, issuer_vat_id, issuer_iban, issuer_bic, invoice_number_prefix, invoice_payment_terms, invoice_vat_rate')
      .eq('id', 1)
      .maybeSingle()
    const issuer = resolveIssuerForReissue(issuerRow)
    if (!issuer) throw new Error('Ausstellerdaten sind unvollständig – die Rechnung kann nicht neu erzeugt werden.')
    invoice = toInvoiceRender(issuer, doc.document_number, {
      netCents: doc.subtotal_cents,
      taxCents: doc.tax_cents,
      grossCents: doc.total_cents,
    })
  }

  const accent = settings.format.accent
  const [yearStr] = delivery.report_month.split('-')
  let subject: string
  let html: string
  let pdfHtml: string
  let xlsx: Buffer

  if (delivery.member_id) {
    const entries = transactions.filter(t => t.member_id === delivery.member_id)
    const firstName = delivery.recipient_name.trim().split(/\s+/)[0] || delivery.recipient_name
    const kind = delivery.kind as MemberDelivery['kind']
    const vars = {
      monat: monthLabel,
      jahr: yearStr,
      name: firstName,
      gesamt: formatEuro(entries.reduce((s, e) => s + e.total_cents, 0)),
    }
    subject = settings.format.memberSubject
      ? renderTemplate(settings.format.memberSubject, vars)
      : `Kaffeelisten – ${MEMBER_SUBJECT[kind]} ${monthLabel}`
    html = buildMemberStatementHtml(delivery.recipient_name, entries, monthLabel, {
      accent,
      intro: settings.format.memberIntro ? renderTemplate(settings.format.memberIntro, vars) : undefined,
      invoice,
      infoOnly: kind === 'member_info' ? { payerName: companyName } : undefined,
    })
    pdfHtml = html
    xlsx = await generateMemberExcel(entries)
  } else {
    const summary = computeSummary(transactions).find(s => s.company_id === delivery.company_id)
    const members = summary?.members ?? []
    subject = invoice
      ? `Kaffeelisten – Rechnung ${companyName} ${monthLabel}`
      : `Kaffeelisten – Aufstellung ${companyName} ${monthLabel}`
    const companyOpts = {
      accent,
      intro: settings.format.reportIntro
        ? renderTemplate(settings.format.reportIntro, { monat: monthLabel, jahr: yearStr })
        : undefined,
      invoice,
    }
    html = buildCompanyDocumentHtml(companyName, company?.billing_contact_name ?? null, members, monthLabel, { ...companyOpts, variant: 'email' })
    pdfHtml = buildCompanyDocumentHtml(companyName, company?.billing_contact_name ?? null, members, monthLabel, { ...companyOpts, variant: 'document' })
    xlsx = await generateCompanyExcel(members)
  }

  const fileStem = documentFileStem({
    kind: delivery.kind as IssuedDoc['kind'],
    reportMonth: delivery.report_month,
    companyId: delivery.company_id,
    companyName,
    memberId: delivery.member_id,
    documentNumber: delivery.document_number,
    recipientName: delivery.recipient_name,
    recipientEmail: delivery.recipient_email,
    netCents: null, taxCents: null, grossCents: 0, pdf: null, xlsx: null,
  })

  return { delivery, subject, html, pdfHtml, fileStem, xlsx }
}

/**
 * Re-send a delivered document to its original recipient and append the send to
 * the ledger as a new row pointing at the original. The original row is never
 * modified, so the history of both sends survives.
 */
export async function resendDelivery(
  deliveryId: string,
  renderPdf: (html: string) => Promise<Buffer | null>,
): Promise<{ id: string }> {
  const regen = await regenerateDelivery(deliveryId)
  const withFiles = carriesAttachments(regen.delivery.kind)
  const pdf = withFiles ? await renderPdf(regen.pdfHtml) : null
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) throw new Error('Missing RESEND_API_KEY')

  const attachments = [
    ...(pdf ? [{ filename: `${regen.fileStem}.pdf`, content: pdf.toString('base64') }] : []),
    ...(withFiles ? [{ filename: `${regen.fileStem}.xlsx`, content: regen.xlsx.toString('base64') }] : []),
  ]
  const { data, error } = await makeMailer(resendKey).emails.send(
    {
      from: 'Kaffeelisten <bericht@kaffeelisten.de>',
      to: [regen.delivery.recipient_email],
      ...(replyTo() ? { replyTo: replyTo()! } : {}),
      subject: regen.subject,
      html: regen.html,
      ...(attachments.length ? { attachments } : {}),
    },
    // A deliberate re-send must go out even if an identical one did recently.
    { idempotencyKey: `resend-${deliveryId}-${Date.now()}` },
  )
  if (error) throw new Error(`Resend failed: ${error.message ?? JSON.stringify(error)}`)

  const supabase = makeSupabase()
  const { data: original, error: origErr } = await supabase
    .from('document_deliveries')
    .select('report_month, kind, company_id, member_id, recipient_name, recipient_email, document_number, billing_document_id, gross_cents')
    .eq('id', deliveryId)
    .single()
  if (origErr) throw new Error(`Re-send delivered but could not be recorded: ${origErr.message}`)
  // Copy the original's fields explicitly — never spread the row, which would
  // carry its id or sent_at into the new record.
  const { data: row, error: insErr } = await supabase
    .from('document_deliveries')
    .insert({
      report_month: original.report_month,
      kind: original.kind,
      company_id: original.company_id,
      member_id: original.member_id,
      recipient_name: original.recipient_name,
      recipient_email: original.recipient_email,
      document_number: original.document_number,
      billing_document_id: original.billing_document_id,
      gross_cents: original.gross_cents,
      has_pdf: !!pdf,
      has_xlsx: withFiles,
      resend_message_id: data?.id ?? null,
      resend_of: deliveryId,
    })
    .select('id')
    .single()
  if (insErr) throw new Error(`Re-send delivered but could not be recorded: ${insErr.message}`)
  return { id: row.id }
}
