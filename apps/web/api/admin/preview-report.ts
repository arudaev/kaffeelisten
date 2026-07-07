// POST /api/admin/preview-report  body: { type, variant?, format?, issuer? }
//   type    'admin'   → the admin/CEO aggregate report (all companies)
//           'company' → a single company's document (report or invoice)
//           'member'  → a single member's document (statement or invoice)
//   variant 'report' | 'invoice'  (ignored for 'admin')
// Renders the email exactly as it would be sent, using the current settings and
// this month's real data (or a small sample when empty). For invoice variants an
// unfilled issuer block is shown with ITC1 placeholder values so the admin can
// still preview it. PIN-protected. Returns { subject, html }.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin } from '../_lib/adminAuth'
import {
  fetchAndEnrich,
  computeSummary,
  fetchReportSettings,
  resolveReportSubject,
  EMAIL_LOGO_PNG_BASE64,
  type EnrichedTransaction,
  type ReportFormat,
} from '../_lib/report'
import {
  buildCompanyEmailHtml,
  buildCompanyDocumentHtml,
  buildMemberStatementHtml,
  renderTemplate,
  formatEuro,
  type MemberSummary,
} from '../_lib/reportHtml'
import {
  splitVat,
  formatDocumentNumber,
  toInvoiceRender,
  PLACEHOLDER_ISSUER,
  type IssuerConfig,
} from '../_lib/billing'

// A tiny stand-in dataset so the preview is meaningful even before any real
// transactions exist for the current month.
function sampleData(): { transactions: EnrichedTransaction[]; monthLabel: string; reportMonth: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const iso = (day: number) => new Date(y, m, day, 9, 30).toISOString()
  const base = (o: Partial<EnrichedTransaction>): EnrichedTransaction => ({
    id: Math.random().toString(36).slice(2),
    member_id: 'm1',
    company_id: 'c1',
    item_id: 'i1',
    quantity: 1,
    logged_at: iso(3),
    member_name: 'Anna Keller',
    work_email: 'anna.keller@itc1.de',
    company_name: 'ITC1 GmbH',
    item_name: 'Cappuccino',
    item_category: 'coffee',
    unit_label: 'Tasse',
    price_cents: 80,
    total_cents: 80,
    ...o,
  })
  const transactions: EnrichedTransaction[] = [
    base({ member_id: 'm1', member_name: 'Anna Keller', work_email: 'anna.keller@itc1.de', item_name: 'Cappuccino', quantity: 3, price_cents: 80, total_cents: 240, logged_at: iso(3) }),
    base({ member_id: 'm1', member_name: 'Anna Keller', work_email: 'anna.keller@itc1.de', item_name: 'Kaffee', quantity: 5, price_cents: 50, total_cents: 250, logged_at: iso(7) }),
    base({ member_id: 'm3', member_name: 'Clara Wolf', work_email: 'clara.wolf@itc1.de', item_name: 'Club-Mate', quantity: 2, price_cents: 120, total_cents: 240, logged_at: iso(9) }),
    base({ member_id: 'm2', member_name: 'Ben Fischer', work_email: 'ben.fischer@gzdn.de', company_id: 'c2', company_name: 'GZDN AG', item_name: 'Club-Mate', quantity: 2, price_cents: 120, total_cents: 240, logged_at: iso(12) }),
  ]
  const monthLabel = new Date(y, m, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const reportMonth = `${y}-${String(m + 1).padStart(2, '0')}`
  return { transactions, monthLabel, reportMonth }
}

// Merge an untrusted client override (the admin's unsaved edits) onto the saved
// format so the preview shows pending changes. Values are coerced/capped; the
// override is never persisted.
function coerceFormat(base: ReportFormat, o: unknown): ReportFormat {
  if (!o || typeof o !== 'object') return base
  const r = o as Record<string, unknown>
  const strOrNull = (v: unknown, fallback: string | null): string | null => {
    if (v === undefined) return fallback
    if (v === null) return null
    const s = String(v).trim().slice(0, 1000)
    return s.length > 0 ? s : null
  }
  const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)
  return {
    accent: typeof r.report_accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.report_accent) ? r.report_accent : base.accent,
    reportSubject: strOrNull(r.report_subject, base.reportSubject),
    reportIntro: strOrNull(r.report_intro, base.reportIntro),
    includePdf: bool(r.report_include_pdf, base.includePdf),
    includeExcel: bool(r.report_include_excel, base.includeExcel),
    memberSubject: strOrNull(r.member_subject, base.memberSubject),
    memberIntro: strOrNull(r.member_intro, base.memberIntro),
  }
}

// Build the issuer used for an invoice preview: the admin's unsaved values where
// present, falling back to ITC1 placeholder values so blanks still render.
function previewIssuer(saved: IssuerConfig | null, o: unknown): IssuerConfig {
  const r = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>
  const pick = (v: unknown, fallback: string): string => {
    const t = v == null ? '' : String(v).trim()
    return t || fallback
  }
  return {
    legalName: pick(r.issuer_legal_name, saved?.legalName ?? PLACEHOLDER_ISSUER.legalName),
    address: pick(r.issuer_address, saved?.address ?? PLACEHOLDER_ISSUER.address ?? ''),
    vatId: pick(r.issuer_vat_id, saved?.vatId ?? PLACEHOLDER_ISSUER.vatId),
    iban: pick(r.issuer_iban, saved?.iban ?? PLACEHOLDER_ISSUER.iban),
    bic: pick(r.issuer_bic, saved?.bic ?? PLACEHOLDER_ISSUER.bic),
    numberPrefix: pick(r.invoice_number_prefix, saved?.numberPrefix ?? PLACEHOLDER_ISSUER.numberPrefix),
    paymentTerms: pick(r.invoice_payment_terms, saved?.paymentTerms ?? PLACEHOLDER_ISSUER.paymentTerms ?? ''),
    vatRate: Number(r.invoice_vat_rate) || saved?.vatRate || PLACEHOLDER_ISSUER.vatRate,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAdmin(req.headers)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

    const body = (req.body ?? {}) as { type?: string; variant?: string; format?: unknown; issuer?: unknown }
    const type = String(req.query.type ?? body.type ?? 'admin')
    if (type !== 'admin' && type !== 'company' && type !== 'member') {
      return res.status(400).json({ error: 'Unbekannter Berichtstyp.' })
    }
    const asInvoice = String(body.variant ?? req.query.variant ?? 'report') === 'invoice'

    const settings = await fetchReportSettings()
    const format = coerceFormat(settings.format, body.format)

    // Use the current month's real data; fall back to a sample when empty.
    let { transactions, monthLabel, reportMonth } = await fetchAndEnrich()
    if (transactions.length === 0) {
      ({ transactions, monthLabel, reportMonth } = sampleData())
    }
    const [yearStr] = reportMonth.split('-')
    // In an iframe cid: images don't resolve — inline the logo as a data URI.
    const logoSrc = `data:image/png;base64,${EMAIL_LOGO_PNG_BASE64}`
    const summaries = computeSummary(transactions)

    // ── Admin/CEO aggregate report ──
    if (type === 'admin') {
      const html = buildCompanyEmailHtml(summaries, transactions, monthLabel, {
        accent: format.accent,
        intro: format.reportIntro ? renderTemplate(format.reportIntro, { monat: monthLabel, jahr: yearStr }) : undefined,
        logoSrc,
      })
      return res.status(200).json({ subject: resolveReportSubject(format, monthLabel, reportMonth), html })
    }

    // ── Single company document ──
    if (type === 'company') {
      const company = summaries[0]
      const members: MemberSummary[] = company.members
      const intro = format.reportIntro ? renderTemplate(format.reportIntro, { monat: monthLabel, jahr: yearStr }) : undefined
      let invoice
      if (asInvoice) {
        const issuer = previewIssuer(settings.issuer, body.issuer)
        const split = splitVat(company.total_cents, issuer.vatRate)
        invoice = toInvoiceRender(issuer, formatDocumentNumber(issuer.numberPrefix, 1), split)
      }
      const html = buildCompanyDocumentHtml(company.company_name, 'Anna Bauer', members, monthLabel, { accent: format.accent, intro, invoice })
      const subject = asInvoice
        ? `Kaffeelisten – Rechnung ${company.company_name} ${monthLabel}`
        : `Kaffeelisten – Aufstellung ${company.company_name} ${monthLabel}`
      return res.status(200).json({ subject, html })
    }

    // ── Single member document ──
    const firstTx = transactions.find(t => t.work_email) ?? transactions[0]
    const memberName = firstTx.member_name
    const firstName = memberName.trim().split(/\s+/)[0] || memberName
    const entries = transactions.filter(t => t.member_id === firstTx.member_id)
    const grossCents = entries.reduce((s, e) => s + e.total_cents, 0)
    const vars = { monat: monthLabel, jahr: yearStr, name: firstName, gesamt: formatEuro(grossCents) }
    let invoice
    if (asInvoice) {
      const issuer = previewIssuer(settings.issuer, body.issuer)
      const split = splitVat(grossCents, issuer.vatRate)
      invoice = toInvoiceRender(issuer, formatDocumentNumber(issuer.numberPrefix, 1), split)
    }
    const subject = format.memberSubject
      ? renderTemplate(format.memberSubject, vars)
      : asInvoice
        ? `Kaffeelisten – Rechnung ${monthLabel}`
        : `Kaffeelisten – Deine Aufstellung ${monthLabel}`
    const html = buildMemberStatementHtml(memberName, entries, monthLabel, {
      accent: format.accent,
      intro: format.memberIntro ? renderTemplate(format.memberIntro, vars) : undefined,
      invoice,
    })
    return res.status(200).json({ subject, html })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[preview-report]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
