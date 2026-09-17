// Self-contained HTML report template — inline styles, flows naturally across pages.
// Rendered to PDF by Puppeteer.

import { aggregateLines, type DocumentLine } from './lines'
import type { AdminInsights } from './adminInsights'

export interface EnrichedTransaction {
  id: string
  member_id: string
  company_id: string
  item_id: string
  quantity: number
  logged_at: string
  member_name: string
  // 'house' = a company-checkout shared account (migration 034). Optional so
  // hand-built fixtures (previews, tests) default to a real person.
  member_kind?: 'person' | 'house'
  work_email: string | null
  company_name: string
  item_name: string
  item_category: string
  unit_label: string
  price_cents: number
  total_cents: number
}

export interface MemberSummary {
  // Grouping key. Display names are not unique: two colleagues called "Max" must
  // never share a summary, or a per-person document bills one for the other.
  member_id: string
  member_name: string
  work_email: string | null
  entries: EnrichedTransaction[]
  subtotal_cents: number
}

export interface CompanySummary {
  company_id: string
  company_name: string
  members: MemberSummary[]
  total_cents: number
  total_entries: number
}

export function formatEuro(cents: number): string {
  return '€ ' + (cents / 100).toFixed(2).replace('.', ',')
}

// Berlin calendar date. The server runs in UTC, so without the zone an entry
// logged at 00:30 Berlin time printed as the previous day.
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Escape user-provided copy before inlining it into report HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Substitute {monat} / {jahr} / {name} / {gesamt} placeholders in admin copy. */
export function renderTemplate(
  tpl: string,
  vars: { monat?: string; jahr?: string; name?: string; gesamt?: string },
): string {
  return tpl
    .replace(/\{monat\}/gi, vars.monat ?? '')
    .replace(/\{jahr\}/gi, vars.jahr ?? '')
    .replace(/\{name\}/gi, vars.name ?? '')
    .replace(/\{gesamt\}/gi, vars.gesamt ?? '')
}

// ── Invoice rendering (invoice mode) ─────────────────────────────────────────
// Everything ITC1's tax/issuer data needs to turn a statement into a legal
// invoice email. Assembled in report.ts from the app_settings issuer block; the
// document is always issued by ITC1, never by the developers.
export interface InvoiceRender {
  documentNumber: string
  issuerLegalName: string
  issuerAddress: string | null
  issuerVatId: string
  issuerIban: string
  issuerBic: string
  paymentTerms: string | null
  vatRate: number
  netCents: number
  taxCents: number
  grossCents: number
}

// The invoice date, as a Berlin calendar day (the server runs in UTC).
function todayDE(): string {
  return new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Issuer identity + "Rechnung Nr." block shown at the top of an invoice email. */
function issuerBlockHtml(inv: InvoiceRender): string {
  const addr = inv.issuerAddress
    ? inv.issuerAddress.split(/\r?\n/).filter(Boolean).map(l => escapeHtml(l)).join('<br>')
    : ''
  return `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 22px;border-bottom:1px solid #E7E5E4;">
              <tr>
                <td style="vertical-align:top;padding:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#57534E;">
                  <strong style="color:#1C1917;">${escapeHtml(inv.issuerLegalName)}</strong>${addr ? '<br>' + addr : ''}<br>USt-IdNr: ${escapeHtml(inv.issuerVatId)}
                </td>
                <td align="right" style="vertical-align:top;padding:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#57534E;">
                  <strong style="color:#1C1917;font-size:15px;">Rechnung</strong><br>Nr. ${escapeHtml(inv.documentNumber)}<br>${todayDE()}
                </td>
              </tr>
            </table>`
}

/** Net / VAT / gross breakdown plus the prominent "where to transfer" box. */
function vatAndPaymentHtml(inv: InvoiceRender, accent: string): string {
  const rate = Number.isInteger(inv.vatRate) ? String(inv.vatRate) : inv.vatRate.toFixed(2).replace('.', ',')
  return `
            <table class="doc-keep" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:14px 0 0;">
              <tr>
                <td align="right" style="padding:2px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#57534E;">Nettobetrag</td>
                <td align="right" width="120" style="padding:2px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#57534E;">${formatEuro(inv.netCents)}</td>
              </tr>
              <tr>
                <td align="right" style="padding:2px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#57534E;">zzgl. ${rate}% USt</td>
                <td align="right" style="padding:2px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#57534E;">${formatEuro(inv.taxCents)}</td>
              </tr>
              <tr>
                <td align="right" style="padding:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1C1917;border-top:1px solid #E7E5E4;">Gesamtbetrag</td>
                <td align="right" style="padding:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#1C1917;border-top:1px solid #E7E5E4;">${formatEuro(inv.grossCents)}</td>
              </tr>
            </table>

            <table class="doc-keep" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:22px 0 0;">
              <tr>
                <td style="padding:16px 18px;background:#FFFBEB;border:1px solid ${accent};border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:.03em;text-transform:uppercase;color:#92400E;">Zahlbar an</p>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#1C1917;">
                    <strong>${escapeHtml(inv.issuerLegalName)}</strong><br>
                    IBAN: <strong>${escapeHtml(inv.issuerIban)}</strong><br>
                    BIC: ${escapeHtml(inv.issuerBic)}<br>
                    Verwendungszweck: <strong>${escapeHtml(inv.documentNumber)}</strong>
                  </p>
                  ${inv.paymentTerms ? `<p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#78716C;">${escapeHtml(inv.paymentTerms)}</p>` : ''}
                </td>
              </tr>
            </table>`
}

function consolidatedItems(entries: EnrichedTransaction[]): string {
  const map: Record<string, number> = {}
  for (const e of entries) map[e.item_name] = (map[e.item_name] ?? 0) + e.quantity
  // Item names are user-controlled — escape before inlining into the PDF HTML.
  return Object.entries(map).map(([name, qty]) => `${qty}× ${escapeHtml(name)}`).join(' · ')
}

const CELL = 'font-family:Arial,Helvetica,sans-serif;font-size:14px;'
const HEAD = 'padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;color:#A8A29E;border-bottom:1px solid #E7E5E4;'

/** Item × price lines with a total row. Used by every member and company document. */
function linesTableHtml(lines: readonly DocumentLine[], totalLabel: string, compact = false): string {
  const pad = compact ? '7px 0' : '10px 0'
  const size = compact ? 'font-size:13px;' : ''
  const rows = lines
    .map(l => `
        <tr>
          <td style="padding:${pad};border-bottom:1px solid #F5F5F4;${CELL}${size}font-weight:bold;color:#1C1917;">${escapeHtml(l.itemName)}</td>
          <td align="center" style="padding:${pad};border-bottom:1px solid #F5F5F4;${CELL}${size}color:#57534E;">${l.quantity}</td>
          <td align="right" style="padding:${pad};border-bottom:1px solid #F5F5F4;${CELL}${size}color:#57534E;">${formatEuro(l.unitPriceCents)}</td>
          <td align="right" style="padding:${pad};border-bottom:1px solid #F5F5F4;${CELL}${size}font-weight:bold;color:#1C1917;">${formatEuro(l.totalCents)}</td>
        </tr>`)
    .join('')
  const total = lines.reduce((s, l) => s + l.totalCents, 0)
  return `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <th align="left" style="${HEAD}">Artikel</th>
                <th align="center" style="${HEAD}">Menge</th>
                <th align="right" style="${HEAD}">Einzelpreis</th>
                <th align="right" style="${HEAD}">Betrag</th>
              </tr>
              ${rows}
              <tr>
                <td colspan="3" align="right" style="padding:14px 0 0;${CELL}font-size:${compact ? 13 : 15}px;font-weight:bold;color:#1C1917;">${totalLabel}</td>
                <td align="right" style="padding:14px 0 0;${CELL}font-size:${compact ? 14 : 17}px;font-weight:bold;color:#B45309;">${formatEuro(total)}</td>
              </tr>
            </table>`
}

const EXCEL_NOTE = `<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#78716C;">Alle Einzelbuchungen mit Datum und Uhrzeit finden Sie in der angeh&auml;ngten Excel-Datei.</p>`

// PDFs are rendered from the email HTML. In print, drop the email's grey frame and
// its footer bar: they spilled onto an otherwise empty second page whenever the
// content nearly filled one (ITC1, 2026-09-17). The issuer is already named at the
// top, and the totals and payment box never split across pages. Email clients
// ignore @media print.
// Page margins and the "Seite x von y" footer come from pageToPdf (DOC_PAGE_MARKER).
export const DOC_PAGE_MARKER = 'class="doc-page"'
const PRINT_CSS = `<style>
    @media print {
      html, body, .doc-page { background: #ffffff !important; }
      .doc-page-cell { padding: 0 !important; }
      /* Chrome never splits one table cell across pages, and the whole email body
         is one cell: flow the layout tables as blocks so content can continue. */
      .doc-page, .doc-page > tbody, .doc-page > tbody > tr, .doc-page > tbody > tr > td,
      .doc-card, .doc-card > tbody, .doc-card > tbody > tr, .doc-card > tbody > tr > td { display: block !important; }
      .doc-card { margin: 0 auto !important; }
      .doc-card > tbody > tr > td.doc-footer { display: none !important; }
      .doc-keep { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>`

// ── Per-member monthly statement (Phase 2 feature E) ──────────────────────────
// A warm, table-based HTML email sent to each member who consumed that month.
// Contains only that member's own consumption — never another member's or the
// company total. Uses Arial (Outlook-safe) rather than the Inter used in-app.
export function buildMemberStatementHtml(
  memberName: string,
  entries: EnrichedTransaction[],
  monthLabel: string,
  opts: {
    accent?: string
    intro?: string
    invoice?: InvoiceRender
    // A person whose company pays receives an information copy of their own use.
    // It names the payer and must never look like a demand for payment.
    infoOnly?: { payerName: string }
  } = {},
): string {
  if (opts.invoice && opts.infoOnly) {
    // An information copy that carried an invoice number and IBAN would ask the
    // person to pay for something their company is already being invoiced for.
    throw new Error('A member document cannot be both an invoice and an information copy.')
  }
  const accent = opts.accent || '#D97706'
  const invoice = opts.invoice
  const infoOnly = opts.infoOnly
  const firstName = memberName.trim().split(/\s+/)[0] || memberName
  const introHtml = opts.intro
    ? escapeHtml(opts.intro)
    : invoice
      ? `anbei deine Rechnung f&uuml;r deinen Verzehr im ${escapeHtml(monthLabel)}.`
      : infoOnly
        ? `hier ist die &Uuml;bersicht deines Verzehrs im ${escapeHtml(monthLabel)}.`
        : `hier ist deine pers&ouml;nliche Aufstellung f&uuml;r ${escapeHtml(monthLabel)}.`
  const infoNoticeHtml = infoOnly
    ? `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 22px;">
              <tr>
                <td style="padding:14px 18px;background:#F5F5F4;border:1px solid #E7E5E4;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#44403C;">
                  Diese Aufstellung dient <strong>nur zur Information</strong>. Die Kosten tr&auml;gt
                  <strong>${escapeHtml(infoOnly.payerName)}</strong> &ndash; du musst nichts bezahlen.
                </td>
              </tr>
            </table>`
    : ''
  const headerLabel = invoice
    ? 'Rechnung Nr. ' + escapeHtml(invoice.documentNumber)
    : infoOnly
      ? 'Deine &Uuml;bersicht'
      : 'Deine Kaffeeliste'

  // One line per item and price, not per coffee; the Excel keeps every entry.
  const lines = aggregateLines(entries)

  return `<!DOCTYPE html>
<html lang="de" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  ${PRINT_CSS}
</head>
<body style="margin:0;padding:0;background:#FAFAF9;">
<table class="doc-page" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#FAFAF9;">
  <tr>
    <td class="doc-page-cell" align="center" style="padding:24px 16px;">
      <!--[if mso]><table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table class="doc-card" width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E7E5E4;">

        <!-- HEADER -->
        <tr>
          <td style="background:${accent};padding:26px 32px;">
            <p style="margin:0;color:#ffffff;font-size:17px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;letter-spacing:-.01em;line-height:1.2;">Kaffeelisten</p>
            <p style="margin:2px 0 0;color:#FEF3C7;font-size:13px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">${headerLabel} &ndash; ${escapeHtml(monthLabel)}</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:28px 32px 24px;background:#ffffff;">
            ${invoice ? issuerBlockHtml(invoice) : ''}
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1917;">Hallo ${escapeHtml(firstName)},</p>
            <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#57534E;">${introHtml}</p>
            ${infoNoticeHtml}

            ${linesTableHtml(lines, 'Gesamt')}
            ${invoice ? EXCEL_NOTE : ''}
            ${invoice ? vatAndPaymentHtml(invoice, accent) : ''}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="doc-footer" style="background:#F5F5F4;padding:18px 32px;border-top:1px solid #E7E5E4;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#A8A29E;">${invoice ? 'Rechnungssteller: ' + escapeHtml(invoice.issuerLegalName) + ' &middot; erstellt mit Kaffeelisten' : 'ITC1 Deggendorf &middot; Diese Aufstellung dient deiner &Uuml;bersicht.'}</p>
          </td>
        </tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`
}

// ── Company document (per company): report/Aufstellung, or invoice ───────────
// One email to the company billing contact for the month.
//
// A company that PAYS gets the full amount, item by item: an invoice (money to
// ITC1's IBAN) or, while invoice mode is off, a statement. It names no employees.
// What each person consumed is a separate, optional document (the Verzehrliste,
// buildEmployeeListHtml), sent only to companies that asked for it (ITC1,
// 2026-09-17; companies.employee_list_enabled, migration 041).
//
// A company whose people pay for themselves gets an overview of who consumed what
// (layout 'people'): it bills nobody, and each person has their own document.

function sortedPeople(members: MemberSummary[]): MemberSummary[] {
  return [...members].sort((x, y) => y.subtotal_cents - x.subtotal_cents || x.member_name.localeCompare(y.member_name, 'de'))
}

function personLabel(m: MemberSummary): string {
  return m.entries[0]?.member_kind === 'house' ? 'Sammelkonto (Firma)' : m.member_name
}

// Person | what they consumed | amount, one row each, with the total.
function peopleTableHtml(members: MemberSummary[]): string {
  const rows = sortedPeople(members)
    .map(
      m => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F5F5F4;${CELL}font-weight:bold;color:#1C1917;">${escapeHtml(personLabel(m))}</td>
          <td style="padding:10px 0 10px 12px;border-bottom:1px solid #F5F5F4;${CELL}font-size:12px;color:#78716C;">${consolidatedItems(m.entries)}</td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #F5F5F4;${CELL}font-weight:bold;color:#1C1917;">${formatEuro(m.subtotal_cents)}</td>
        </tr>`,
    )
    .join('')
  const totalCents = members.reduce((s, m) => s + m.subtotal_cents, 0)
  return `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <th align="left" style="${HEAD}">Person</th>
                <th align="left" style="${HEAD}padding-left:12px;">Verzehr</th>
                <th align="right" style="${HEAD}">Betrag</th>
              </tr>
              ${rows}
              <tr>
                <td colspan="2" align="right" style="padding:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#1C1917;">Gesamt</td>
                <td align="right" style="padding:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#B45309;">${formatEuro(totalCents)}</td>
              </tr>
            </table>`
}

const SECTION_TITLE = 'margin:32px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#57534E;'

// The shared, Outlook-safe shell of the company documents.
function documentShell(opts: { accent: string; headerLabel: string; monthLabel: string; body: string; footer: string }): string {
  return `<!DOCTYPE html>
<html lang="de" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  ${PRINT_CSS}
</head>
<body style="margin:0;padding:0;background:#FAFAF9;">
<table class="doc-page" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#FAFAF9;">
  <tr>
    <td class="doc-page-cell" align="center" style="padding:24px 16px;">
      <!--[if mso]><table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table class="doc-card" width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E7E5E4;">
        <tr>
          <td style="background:${opts.accent};padding:26px 32px;">
            <p style="margin:0;color:#ffffff;font-size:17px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;letter-spacing:-.01em;line-height:1.2;">Kaffeelisten</p>
            <p style="margin:2px 0 0;color:#FEF3C7;font-size:13px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">${opts.headerLabel} &ndash; ${escapeHtml(opts.monthLabel)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 24px;background:#ffffff;">
            ${opts.body}
          </td>
        </tr>
        <tr>
          <td class="doc-footer" style="background:#F5F5F4;padding:18px 32px;border-top:1px solid #E7E5E4;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#A8A29E;">${opts.footer}</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`
}

export function buildCompanyDocumentHtml(
  companyName: string,
  contactName: string | null,
  members: MemberSummary[],
  monthLabel: string,
  opts: {
    accent?: string
    intro?: string
    invoice?: InvoiceRender
    // 'items' (default): the company pays — the full amount by item, no names.
    // 'people': the company's people pay for themselves — an overview per person.
    layout?: 'items' | 'people'
    // The company asked for the per-person list (migration 041). An invoice then
    // carries it as a separate attachment; a statement, which has no attachments,
    // shows it as its own section below the amount.
    employeeList?: boolean
  } = {},
): string {
  const accent = opts.accent || '#D97706'
  const invoice = opts.invoice
  const layout = invoice ? 'items' : (opts.layout ?? 'items')
  const greeting = contactName?.trim() ? escapeHtml(contactName.trim().split(/\s+/)[0]) : escapeHtml(companyName)
  const company = `<strong style="color:#1C1917;">${escapeHtml(companyName)}</strong>`
  const introHtml = opts.intro
    ? escapeHtml(opts.intro)
    : invoice
      ? `anbei die Rechnung f&uuml;r ${company} &uuml;ber den Verzehr im ${escapeHtml(monthLabel)}.`
      : layout === 'items'
        ? `anbei die Aufstellung f&uuml;r ${company} &uuml;ber den Verzehr im ${escapeHtml(monthLabel)}.`
        : `hier ist die &Uuml;bersicht &uuml;ber den Verzehr bei ${company} im ${escapeHtml(monthLabel)}. Jede Person erh&auml;lt ihre eigene Abrechnung.`

  const allEntries = members.flatMap(m => m.entries)
  const amount = layout === 'items' ? linesTableHtml(aggregateLines(allEntries), 'Gesamt') : peopleTableHtml(members)

  const notes: string[] = []
  if (invoice) {
    notes.push('Alle Einzelbuchungen mit Datum und Uhrzeit finden Sie in der angeh&auml;ngten Excel-Datei.')
    if (opts.employeeList) notes.push('Die Verzehrliste je Person liegt als eigenes Dokument bei.')
  }
  const notesHtml = notes.length
    ? `<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#78716C;">${notes.join(' ')}</p>`
    : ''
  const statementList = !invoice && layout === 'items' && opts.employeeList
    ? `
            <p style="${SECTION_TITLE}">Verzehrliste je Person</p>
            ${peopleTableHtml(members)}`
    : ''

  const body = `
            ${invoice ? issuerBlockHtml(invoice) : ''}
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1917;">Hallo ${greeting},</p>
            <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#57534E;">${introHtml}</p>
            ${amount}
            ${invoice ? vatAndPaymentHtml(invoice, accent) : ''}
            ${notesHtml}
            ${statementList}`

  return documentShell({
    accent,
    headerLabel: invoice ? 'Rechnung Nr. ' + escapeHtml(invoice.documentNumber) : 'Aufstellung',
    monthLabel,
    body,
    footer: invoice
      ? 'Rechnungssteller: ' + escapeHtml(invoice.issuerLegalName) + ' &middot; erstellt mit Kaffeelisten'
      : 'ITC1 Deggendorf &middot; Diese Aufstellung dient der &Uuml;bersicht.',
  })
}

/**
 * The Verzehrliste: what each person at a paying company consumed, sent only to
 * companies that asked for it (migration 041). Its own document, never part of
 * the invoice, and it demands no payment.
 */
export function buildEmployeeListHtml(
  companyName: string,
  members: MemberSummary[],
  monthLabel: string,
  opts: { accent?: string; invoiceNumber?: string | null } = {},
): string {
  const accent = opts.accent || '#D97706'
  const belongsTo = opts.invoiceNumber
    ? ` Sie geh&ouml;rt zur Rechnung Nr. ${escapeHtml(opts.invoiceNumber)} und ist selbst keine Rechnung.`
    : ' Sie ist keine Rechnung.'
  const details = sortedPeople(members)
    .map(m => `
            <div style="page-break-inside:avoid;margin:18px 0 0;">
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1C1917;">${escapeHtml(personLabel(m))}</p>
              ${linesTableHtml(aggregateLines(m.entries), 'Summe', true)}
            </div>`)
    .join('')
  const body = `
            <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#57534E;">Verzehr je Person bei <strong style="color:#1C1917;">${escapeHtml(companyName)}</strong> im ${escapeHtml(monthLabel)}.${belongsTo}</p>
            ${peopleTableHtml(members)}
            <p style="${SECTION_TITLE}">Einzeln je Person</p>
            ${details}`
  return documentShell({
    accent,
    headerLabel: 'Verzehrliste ' + escapeHtml(companyName),
    monthLabel,
    body,
    footer: 'ITC1 Deggendorf &middot; Verzehrliste zur Information, keine Rechnung.',
  })
}

// ── Email-confirmation message ────────────────────────────────────────────────
// Sent when a member is added or their work email changes. Confirms the mailbox
// exists and is watched (MX validation only proves the domain accepts mail), so
// the monthly statement reaches a real, owned address. Same Outlook-safe,
// table-based shell as the member statement above.
export function buildEmailConfirmationHtml(
  memberName: string,
  confirmUrl: string,
  opts: { accent?: string } = {},
): string {
  const accent = opts.accent || '#D97706'
  const firstName = memberName.trim().split(/\s+/)[0] || memberName
  // confirmUrl is a server-built URL (origin + signed token), not user copy, but
  // it lands in href/text attributes — escape it defensively all the same.
  const safeUrl = escapeHtml(confirmUrl)

  return `<!DOCTYPE html>
<html lang="de" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#FAFAF9;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#FAFAF9;">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <!--[if mso]><table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E7E5E4;">

        <!-- HEADER -->
        <tr>
          <td style="background:${accent};padding:26px 32px;">
            <p style="margin:0;color:#ffffff;font-size:17px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;letter-spacing:-.01em;line-height:1.2;">Kaffeelisten</p>
            <p style="margin:2px 0 0;color:#FEF3C7;font-size:13px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">E-Mail-Adresse best&auml;tigen</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:28px 32px 24px;background:#ffffff;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1917;">Hallo ${escapeHtml(firstName)},</p>
            <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#57534E;">deine Arbeits-E-Mail-Adresse wurde bei Kaffeelisten am ITC1 Deggendorf hinterlegt. Bitte best&auml;tige mit einem Klick, dass diese Adresse dir geh&ouml;rt &ndash; so erh&auml;ltst du deine monatliche Aufstellung zuverl&auml;ssig.</p>

            <!-- BUTTON (bulletproof for Outlook) -->
            <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 22px;">
              <tr>
                <td align="center" bgcolor="${accent}" style="border-radius:8px;">
                  <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">E-Mail best&auml;tigen</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#A8A29E;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${safeUrl}" target="_blank" style="color:#B45309;">${safeUrl}</a></p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#F5F5F4;padding:18px 32px;border-top:1px solid #E7E5E4;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#A8A29E;">ITC1 Deggendorf &middot; Wenn du dich nicht bei Kaffeelisten angemeldet hast, ignoriere diese E-Mail einfach.</p>
          </td>
        </tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`
}

// ── Company report email (admin + CEO) ───────────────────────────────────────
// The month-end email body (PDF + Excel are attached separately by report.ts).
// Table-based layout — required for Outlook (Word renderer ignores div/CSS).
export function buildCompanyEmailHtml(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  opts: { accent?: string; intro?: string; logoSrc: string; insights?: AdminInsights },
): string {
  const accent = opts.accent || '#D97706'
  const totalCents = transactions.reduce((s, t) => s + t.total_cents, 0)
  const insightsHtml = opts.insights ? adminInsightsHtml(opts.insights) : ''
  const introHtml = opts.intro
    ? escapeHtml(opts.intro)
    : `Anbei der Monatsbericht f&uuml;r <strong style="color:#1C1917;">${escapeHtml(monthLabel)}</strong> mit allen Eintr&auml;gen des ITC1-Campus.`

  const companyRows = summaries
    .map(c => `
      <tr>
        <td style="padding:8px 16px;border-bottom:1px solid #E7E5E4;color:#1C1917;font-family:Arial,Helvetica,sans-serif;font-size:14px;">${escapeHtml(c.company_name)}</td>
        <td align="right" style="padding:8px 16px;border-bottom:1px solid #E7E5E4;color:#57534E;font-family:Arial,Helvetica,sans-serif;font-size:14px;">${c.total_entries}</td>
        <td align="right" style="padding:8px 16px;border-bottom:1px solid #E7E5E4;font-weight:bold;color:#1C1917;font-family:Arial,Helvetica,sans-serif;font-size:14px;">${formatEuro(c.total_cents)}</td>
      </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="de" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#FAFAF9;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#FAFAF9;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <!--[if mso]><table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E7E5E4;">

        <!-- HEADER -->
        <tr>
          <td style="background:${accent};padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td style="vertical-align:middle;">
                  <p style="margin:0 0 6px 0;color:#fff;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;font-family:Arial,Helvetica,sans-serif;line-height:1.2;opacity:.84;">KAFFEELISTEN &middot; ITC1 DEGGENDORF</p>
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">Monatsbericht ${escapeHtml(monthLabel)}</h1>
                </td>
                <td width="80" align="right" style="vertical-align:middle;">
                  <img src="${opts.logoSrc}" width="72" height="58" alt="Kaffeelisten" style="display:block;border:0;outline:none;">
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:28px 32px;background:#ffffff;">

            <!-- Intro -->
            <p style="margin:0 0 20px 0;color:#57534E;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;">${introHtml}</p>

            <!-- KPI strip -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#FAFAF9;margin-bottom:24px;">
              <tr>
                <td style="padding:8px 16px 4px 16px;font-size:11px;font-weight:bold;color:#78716C;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #E7E5E4;font-family:Arial,Helvetica,sans-serif;">Eintr&auml;ge gesamt</td>
                <td style="padding:8px 16px 4px 16px;font-size:11px;font-weight:bold;color:#78716C;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #E7E5E4;font-family:Arial,Helvetica,sans-serif;">Gesamtbetrag</td>
                <td style="padding:8px 16px 4px 16px;font-size:11px;font-weight:bold;color:#78716C;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #E7E5E4;font-family:Arial,Helvetica,sans-serif;">Unternehmen</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:28px;font-weight:bold;color:#1C1917;font-family:Arial,Helvetica,sans-serif;">${transactions.length}</td>
                <td style="padding:12px 16px;font-size:28px;font-weight:bold;color:#1C1917;font-family:Arial,Helvetica,sans-serif;">${formatEuro(totalCents)}</td>
                <td style="padding:12px 16px;font-size:22px;font-weight:bold;color:#1C1917;font-family:Arial,Helvetica,sans-serif;">${summaries.length}</td>
              </tr>
            </table>

            ${insightsHtml}

            <!-- Section heading -->
            <p style="margin:0 0 10px 0;font-size:12px;font-weight:bold;color:#57534E;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Nach Unternehmen</p>

            <!-- Company table -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:24px;">
              <tr style="background:#FAFAF9;">
                <td style="padding:8px 16px;font-size:11px;font-weight:bold;color:#78716C;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Unternehmen</td>
                <td align="right" style="padding:8px 16px;font-size:11px;font-weight:bold;color:#78716C;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Eintr&auml;ge</td>
                <td align="right" style="padding:8px 16px;font-size:11px;font-weight:bold;color:#78716C;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Betrag</td>
              </tr>
              ${companyRows}
            </table>

            <!-- Attachments note -->
            <p style="margin:0;color:#78716C;font-size:12px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Im Anhang: der Monatsbericht als PDF, alle Einzelbuchungen als Excel und die Campus-Auswertung mit Vormonatsvergleich.</p>
            <p style="margin:12px 0 0 0;color:#78716C;font-size:12px;font-family:Arial,Helvetica,sans-serif;">Die Eintr&auml;ge wurden nach dem Versand archiviert. Die Originaldaten bleiben erhalten.</p>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#FAFAF9;padding:14px 32px;border-top:1px solid #E7E5E4;">
            <p style="margin:0;color:#A8A29E;font-size:11px;font-family:Arial,Helvetica,sans-serif;">Kaffeelisten &middot; ITC1 Deggendorf</p>
          </td>
        </tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`
}

const SECTION = 'margin:0 0 10px 0;font-size:12px;font-weight:bold;color:#57534E;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;'
const TD = 'padding:7px 16px;border-bottom:1px solid #E7E5E4;font-family:Arial,Helvetica,sans-serif;font-size:14px;'

function signedEuro(cents: number): string {
  return (cents > 0 ? '+' : cents < 0 ? '−' : '±') + formatEuro(Math.abs(cents))
}

/** Vormonat, Nachbestellung and Hinweise for the admin email. */
function adminInsightsHtml(i: AdminInsights): string {
  const trend = i.previousTotalCents !== null
    ? `<p style="margin:-12px 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#57534E;">Vormonat: ${formatEuro(i.previousTotalCents)} &middot; Ver&auml;nderung ${signedEuro(i.totalCents - i.previousTotalCents)} &middot; ${i.activePeople} aktive Personen</p>`
    : ''
  const restock = i.restock.length
    ? `
            <p style="${SECTION}">Nachbestellung &ndash; meistverbraucht</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:24px;">
              ${i.restock.map(r => `
              <tr>
                <td style="${TD}color:#1C1917;">${escapeHtml(r.name)}</td>
                <td align="right" style="${TD}font-weight:bold;color:#1C1917;">${r.quantity}&times;</td>
                <td align="right" style="${TD}font-size:12px;color:#78716C;">Vormonat ${r.previousQuantity}&times;</td>
              </tr>`).join('')}
            </table>`
    : ''
  const warnings = i.warnings.length
    ? `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td style="padding:14px 18px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#7F1D1D;">
                  <strong>Bitte pr&uuml;fen</strong>
                  <ul style="margin:6px 0 0;padding-left:18px;">${i.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
                </td>
              </tr>
            </table>`
    : ''
  return trend + warnings + restock
}

/** Short cover email for the CEO's archive ZIP. */
export function buildCeoArchiveEmailHtml(monthLabel: string, documentCount: number, opts: { accent?: string } = {}): string {
  const accent = opts.accent || '#D97706'
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAFAF9;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#FAFAF9;">
  <tr><td align="center" style="padding:24px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E7E5E4;">
      <tr><td style="background:${accent};padding:22px 32px;">
        <p style="margin:0;color:#ffffff;font-size:17px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Kaffeelisten</p>
        <p style="margin:2px 0 0;color:#FEF3C7;font-size:13px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Dokumentenarchiv &ndash; ${escapeHtml(monthLabel)}</p>
      </td></tr>
      <tr><td style="padding:26px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#57534E;">
        <p style="margin:0 0 12px;">Im Anhang liegen unver&auml;nderte Kopien aller ${documentCount} Dokumente, die f&uuml;r ${escapeHtml(monthLabel)} versendet wurden, mit einer &Uuml;bersichtstabelle, dem Monatsbericht und der Campus-Auswertung.</p>
        <p style="margin:0;">Bei R&uuml;ckfragen zu einer Rechnung oder Aufstellung finden Sie die versendete Fassung hier oder im Adminbereich unter &bdquo;Dokumente&ldquo;.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export function buildReportHtml(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
): string {
  const totalCents  = transactions.reduce((s, t) => s + t.total_cents, 0)
  const uniqueUsers = new Set(transactions.map(t => t.member_name)).size
  const createdAt   = new Date().toLocaleDateString('de-DE')

  const overviewRows = summaries.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? '#FFFFFF' : '#FAFAF9'};">
      <td style="padding:9px 16px;color:#A8A29E;font-size:11px;font-weight:600;">${i + 1}.</td>
      <td style="padding:9px 16px;color:#1C1917;font-weight:500;">${escapeHtml(c.company_name)}</td>
      <td style="padding:9px 16px;text-align:center;color:#57534E;">${c.total_entries}</td>
      <td style="padding:9px 16px;text-align:right;font-weight:700;color:#D97706;font-variant-numeric:tabular-nums;">${formatEuro(c.total_cents)}</td>
    </tr>`).join('')

  const companySections = summaries.map(company => {
    const memberRows = company.members.map((m, i) => `
      <tr style="background:${i % 2 === 0 ? '#FFFFFF' : '#FAFAF9'};">
        <td style="padding:9px 16px;font-weight:500;color:#1C1917;">${escapeHtml(m.member_name)}</td>
        <td style="padding:9px 16px;text-align:center;color:#57534E;">${m.entries.length}</td>
        <td style="padding:9px 16px;text-align:right;font-weight:600;color:#1C1917;font-variant-numeric:tabular-nums;">${formatEuro(m.subtotal_cents)}</td>
        <td style="padding:9px 16px;color:#78716C;font-size:11.5px;">${consolidatedItems(m.entries)}</td>
      </tr>`).join('')

    return `
    <div style="margin:0 40px;padding-top:20px;page-break-inside:avoid;break-inside:avoid;">
      <div style="background:#D97706;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-radius:6px 6px 0 0;">
        <span style="font-size:13px;font-weight:700;">${escapeHtml(company.company_name)}</span>
        <span style="font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;">${formatEuro(company.total_cents)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E7E5E4;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;">
        <thead>
          <tr style="background:#F5F5F4;border-bottom:1px solid #E7E5E4;">
            <th style="padding:7px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:22%;">Person</th>
            <th style="padding:7px 16px;text-align:center;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:10%;">Einträge</th>
            <th style="padding:7px 16px;text-align:right;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:14%;">Betrag</th>
            <th style="padding:7px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;">Items</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows}
          <tr style="background:#FFFBEB;border-top:2px solid #D97706;">
            <td colspan="2" style="padding:9px 16px;font-size:12px;font-weight:700;color:#92400E;">Gesamt</td>
            <td style="padding:9px 16px;text-align:right;font-size:13px;font-weight:800;color:#D97706;font-variant-numeric:tabular-nums;">${formatEuro(company.total_cents)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <!-- Defense-in-depth: no scripts, no external fetches. Only inline styles and
       data: images are allowed. Combined with escaping + JS-disabled rendering,
       this neutralizes any markup that slips through in user-provided names. -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src 'none'">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif;
      background: #fff;
      color: #1C1917;
      font-size: 14px;
      line-height: 1.5;
    }
    @page { size: A4 portrait; margin: 0 0 14mm 0; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>

  <!-- ── Header ────────────────────────────────────────────────────────────── -->
  <div style="background:#D97706;padding:22px 40px 20px;display:flex;justify-content:space-between;align-items:center;">
    <!-- Wordmark + cappuccino illustration -->
    <div style="display:flex;align-items:center;gap:18px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" width="64" height="51" style="flex-shrink:0;opacity:.95;">
        <g fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6"/>
          <ellipse cx="83" cy="60" rx="43" ry="6"/>
          <path d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60"/>
          <path d="M126 70h12c10 0 18 8 18 18v0c0 10-8 18-18 18h-12"/>
          <path d="M70 28c-3 6 3 12 0 18"/>
          <path d="M83 22c-3 6 3 12 0 18"/>
          <path d="M96 28c-3 6 3 12 0 18"/>
        </g>
      </svg>
      <div>
        <div style="color:rgba(255,255,255,.75);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:600;margin-bottom:5px;">ITC1 Deggendorf · B4Y3RW4LD</div>
        <div style="color:#fff;font-size:26px;font-weight:800;letter-spacing:-.02em;">Kaffeelisten</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="color:rgba(255,255,255,.75);font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:4px;">Monatsbericht</div>
      <div style="color:#fff;font-size:20px;font-weight:700;">${monthLabel}</div>
      <div style="color:rgba(255,255,255,.65);font-size:11px;margin-top:2px;">${reportMonth}</div>
    </div>
  </div>

  <!-- ── KPI strip ─────────────────────────────────────────────────────────── -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #E7E5E4;">
    <div style="padding:16px 24px;border-right:1px solid #E7E5E4;">
      <div style="font-size:9px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Einträge</div>
      <div style="font-size:26px;font-weight:800;color:#1C1917;margin-top:3px;">${transactions.length}</div>
    </div>
    <div style="padding:16px 24px;border-right:1px solid #E7E5E4;">
      <div style="font-size:9px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Gesamtbetrag</div>
      <div style="font-size:26px;font-weight:800;color:#D97706;margin-top:3px;">${formatEuro(totalCents)}</div>
    </div>
    <div style="padding:16px 24px;border-right:1px solid #E7E5E4;">
      <div style="font-size:9px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Konsumierende</div>
      <div style="font-size:26px;font-weight:800;color:#1C1917;margin-top:3px;">${uniqueUsers}</div>
    </div>
    <div style="padding:16px 24px;">
      <div style="font-size:9px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Unternehmen</div>
      <div style="font-size:26px;font-weight:800;color:#1C1917;margin-top:3px;">${summaries.length}</div>
    </div>
  </div>

  <!-- ── Company overview table ─────────────────────────────────────────────── -->
  <div style="margin:28px 40px 24px;">
    <h2 style="font-size:10px;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;">Übersicht nach Unternehmen</h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #E7E5E4;border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:#F5F5F4;border-bottom:1px solid #E7E5E4;">
          <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:6%;">#</th>
          <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;">Unternehmen</th>
          <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:16%;">Einträge</th>
          <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:20%;">Betrag</th>
        </tr>
      </thead>
      <tbody>
        ${overviewRows}
        <tr style="background:#FFFBEB;border-top:2px solid #D97706;">
          <td colspan="2" style="padding:9px 16px;font-weight:700;color:#92400E;font-size:12px;">Gesamt</td>
          <td style="padding:9px 16px;text-align:center;font-weight:700;color:#92400E;">${transactions.length}</td>
          <td style="padding:9px 16px;text-align:right;font-weight:800;color:#D97706;font-size:14px;font-variant-numeric:tabular-nums;">${formatEuro(totalCents)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Section heading ────────────────────────────────────────────────────── -->
  <div style="margin:0 40px;">
    <h2 style="font-size:10px;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Aufschlüsselung nach Unternehmen</h2>
  </div>

  <!-- ── Company detail sections ────────────────────────────────────────────── -->
  ${companySections}

  <!-- ── Fixed footer on every page ────────────────────────────────────────── -->
  <div style="position:fixed;bottom:0;left:0;right:0;height:14mm;padding:0 40px;border-top:1px solid #E7E5E4;display:flex;justify-content:space-between;align-items:center;background:#fff;">
    <span style="color:#A8A29E;font-size:10.5px;">Kaffeelisten · ${monthLabel} · ${transactions.length} Einträge · ${formatEuro(totalCents)}</span>
    <span style="color:#A8A29E;font-size:10.5px;">Erstellt am ${createdAt}</span>
  </div>

</body>
</html>`
}

// ── Admin export (PDF) ────────────────────────────────────────────────────────
// A plain, printable table of exported entries. Every value is escaped: names,
// items and the filter description are all admin- or member-entered text.
export function buildExportHtml(rows: EnrichedTransaction[], description: string): string {
  const totalCents = rows.reduce((s, t) => s + t.total_cents, 0)
  const totalQty = rows.reduce((s, t) => s + t.quantity, 0)
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
  const cell = 'padding:5px 8px;border-bottom:1px solid #E7E5E4;font-size:10px;color:#1C1917;'
  const num = cell + 'text-align:right;font-variant-numeric:tabular-nums;'
  const head = 'padding:6px 8px;background:#F5F5F4;border-bottom:1px solid #D6D3D1;font-size:9px;font-weight:600;color:#57534E;text-transform:uppercase;letter-spacing:.05em;text-align:left;'
  const body = rows.map(t => `
      <tr>
        <td style="${cell}">${formatDate(t.logged_at)} ${time(t.logged_at)}</td>
        <td style="${cell}">${escapeHtml(t.member_name)}</td>
        <td style="${cell}">${escapeHtml(t.company_name)}</td>
        <td style="${cell}">${escapeHtml(t.item_name)}</td>
        <td style="${num}">${t.quantity}</td>
        <td style="${num}">${formatEuro(t.price_cents)}</td>
        <td style="${num}">${formatEuro(t.total_cents)}</td>
      </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
  <style>@page { size: A4 landscape; margin: 14mm 12mm; } body { margin: 0; font-family: Arial, Helvetica, sans-serif; }</style>
</head>
<body>
  <p style="margin:0;font-size:16px;font-weight:700;color:#1C1917;">Kaffeelisten – Export</p>
  <p style="margin:2px 0 14px;font-size:11px;color:#57534E;">${escapeHtml(description)} &middot; ${rows.length} Eintr&auml;ge</p>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr>
        <th style="${head}">Zeitpunkt</th><th style="${head}">Person</th><th style="${head}">Unternehmen</th>
        <th style="${head}">Artikel</th><th style="${head}text-align:right;">Menge</th>
        <th style="${head}text-align:right;">Einzelpreis</th><th style="${head}text-align:right;">Betrag</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="${cell}font-weight:700;">Gesamt</td>
        <td style="${num}font-weight:700;">${totalQty}</td>
        <td style="${num}"></td>
        <td style="${num}font-weight:700;">${formatEuro(totalCents)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`
}
