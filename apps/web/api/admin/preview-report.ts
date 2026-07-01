// GET /api/admin/preview-report?type=company|member
// Renders the report email exactly as it would be sent, using the current
// settings and this month's real data (or a small sample when the month is
// empty), so the admin can preview format changes before they go out.
// PIN-protected. Returns { subject, html }.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAdminPin, pinFromHeader } from '../_lib/adminAuth'
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
  buildMemberStatementHtml,
  renderTemplate,
} from '../_lib/reportHtml'

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
    const s = String(v).trim().slice(0, 1000)
    return s.length > 0 ? s : null
  }
  const bool = (v: unknown, fallback: boolean): boolean =>
    typeof v === 'boolean' ? v : fallback
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!(await verifyAdminPin(pinFromHeader(req.headers)))) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = (req.body ?? {}) as { type?: string; format?: unknown }
    const type = String(req.query.type ?? body.type ?? 'company')
    if (type !== 'company' && type !== 'member') {
      return res.status(400).json({ error: 'Unbekannter Berichtstyp.' })
    }

    const settings = await fetchReportSettings()
    const format = coerceFormat(settings.format, body.format)

    // Use the current month's real data; fall back to a sample when empty.
    let { transactions, monthLabel, reportMonth } = await fetchAndEnrich()
    if (transactions.length === 0) {
      ({ transactions, monthLabel, reportMonth } = sampleData())
    }

    // The preview renders in an iframe where cid: images don't resolve — inline
    // the logo as a data URI instead.
    const logoSrc = `data:image/png;base64,${EMAIL_LOGO_PNG_BASE64}`

    if (type === 'company') {
      const summaries = computeSummary(transactions)
      const html = buildCompanyEmailHtml(summaries, transactions, monthLabel, {
        accent: format.accent,
        intro: format.reportIntro ? renderTemplate(format.reportIntro, { monat: monthLabel }) : undefined,
        logoSrc,
      })
      return res.status(200).json({ subject: resolveReportSubject(format, monthLabel, reportMonth), html })
    }

    // member: pick the first member who has a statement to show
    const first = transactions.find(t => t.work_email) ?? transactions[0]
    const memberName = first.member_name
    const firstName = memberName.trim().split(/\s+/)[0] || memberName
    const entries = transactions.filter(t => t.member_id === first.member_id)
    const subject = format.memberSubject
      ? renderTemplate(format.memberSubject, { monat: monthLabel, name: firstName })
      : `Kaffeelisten – Deine Aufstellung ${monthLabel}`
    const html = buildMemberStatementHtml(memberName, entries, monthLabel, {
      accent: format.accent,
      intro: format.memberIntro ? renderTemplate(format.memberIntro, { monat: monthLabel, name: firstName }) : undefined,
    })
    return res.status(200).json({ subject, html })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[preview-report]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
