// GET /api/admin/export?from=YYYY-MM-DD&to=YYYY-MM-DD[&company_id&member_id&item_id]&format=csv|xlsx|pdf
//
// Downloads entries for any range, scoped by company, person or item — including
// months already archived and pruned from the live table. Those months are
// intentionally NOT shown in the admin's Einträge table (api/admin/data.ts reads
// only the live table); this is the one place they can be retrieved.
//
// Admin-only (requireAdmin). Service-role reads.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, requireAdmin } from '../_lib/adminAuth'
import {
  EXPORT_ROW_LIMIT,
  buildExportRows,
  describeFilters,
  exportCsv,
  parseExportQuery,
  queryWindow,
  type ExportLookups,
} from '../_lib/export'
import { generateExportExcel } from '../_lib/excel'
import { launchBrowser, pageToPdf } from '../_lib/pdf'
import { buildExportHtml } from '../_lib/reportHtml'
import { sanitizeFile } from '../_lib/archive'
import { classifyServerError } from '../_lib/errors'

// A PDF export launches Chromium; spreadsheets finish in well under this.
export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const auth = await requireAdmin(req.headers)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

    const parsed = parseExportQuery(req.query as Record<string, unknown>)
    if ('error' in parsed) return res.status(400).json({ error: parsed.error })
    const { filters, format } = parsed

    const supabase = makeAdminClient()
    const window = queryWindow(filters)

    // Narrow at the database where possible; buildExportRows applies the exact
    // Berlin-day range and re-applies every filter.
    const scoped = <Q extends { eq: (c: string, v: string) => Q }>(q: Q): Q => {
      let out = q
      if (filters.companyId) out = out.eq('company_id', filters.companyId)
      if (filters.memberId) out = out.eq('member_id', filters.memberId)
      if (filters.itemId) out = out.eq('item_id', filters.itemId)
      return out
    }

    const [liveRes, archiveRes, membersRes, companiesRes, itemsRes] = await Promise.all([
      scoped(
        supabase.from('transactions')
          .select('id, member_id, company_id, item_id, quantity, unit_price_cents, logged_at')
          .gte('logged_at', window.gte).lt('logged_at', window.lt),
      ),
      scoped(
        supabase.from('transactions_archive')
          .select('id, member_id, company_id, item_id, quantity, unit_price_cents, logged_at, report_month, item_name, unit_label, item_category')
          .gte('logged_at', window.gte).lt('logged_at', window.lt),
      ),
      supabase.from('members').select('id, name, work_email'),
      supabase.from('companies').select('id, name'),
      supabase.from('items').select('id, name, unit_label, category, price_cents'),
    ])
    const firstErr = liveRes.error || archiveRes.error || membersRes.error || companiesRes.error || itemsRes.error
    if (firstErr) throw new Error(firstErr.message)

    const lookups: ExportLookups = {
      members: new Map((membersRes.data ?? []).map(m => [m.id, { name: m.name, work_email: m.work_email }])),
      companies: new Map((companiesRes.data ?? []).map(c => [c.id, c.name])),
      items: new Map((itemsRes.data ?? []).map(i => [i.id, i])),
    }

    const rows = buildExportRows(liveRes.data ?? [], archiveRes.data ?? [], lookups, filters)
    const limit = EXPORT_ROW_LIMIT[format]
    if (rows.length > limit) {
      return res.status(413).json({
        error: `Die Auswahl enthält ${rows.length} Einträge; ${format.toUpperCase()} ist auf ${limit} begrenzt. Bitte den Zeitraum oder Filter eingrenzen${format === 'pdf' ? ' oder CSV/Excel wählen' : ''}.`,
      })
    }

    const description = describeFilters(filters, lookups)
    const stem = sanitizeFile(`kaffeelisten-export-${filters.from}_${filters.to}${
      filters.companyId ? '-' + (lookups.companies.get(filters.companyId) ?? '') : ''
    }${filters.memberId ? '-' + (lookups.members.get(filters.memberId)?.name ?? '') : ''}`)

    res.setHeader('Cache-Control', 'no-store')

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${stem}.csv"`)
      return res.status(200).send(exportCsv(rows))
    }

    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${stem}.xlsx"`)
      return res.status(200).send(await generateExportExcel(rows, description))
    }

    const browser = await launchBrowser()
    try {
      const pdf = await pageToPdf(browser, buildExportHtml(rows, description))
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${stem}.pdf"`)
      return res.status(200).send(pdf)
    } finally {
      await browser.close().catch(() => undefined)
    }
  } catch (err) {
    console.error('[admin/export]', err instanceof Error ? err.message : err)
    { const e = classifyServerError(err); return res.status(e.status).json({ error: e.error }) }
  }
}
