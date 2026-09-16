// Delivered documents: list, re-download, re-send.
//
//   GET  /api/admin/documents[?month=YYYY-MM]
//        → { months, month, deliveries } — every document of every kind delivered
//          that month (migration 037), newest first. Re-sends appear as their own
//          rows with `resend_of` set.
//   GET  /api/admin/documents?id=<delivery>&as=pdf|xlsx|html
//        → the document, regenerated from the archive with its original number and
//          amounts. `html` is for the in-app preview.
//   POST /api/admin/documents   body: { id, action: 'resend' }
//        → re-sends to the original recipient and appends a ledger row.
//
// Admin-only. Invoice copies keep their stored number and amounts; only the
// issuer block reflects today's settings (billing.ts resolveIssuerForReissue).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, requireAdmin } from '../_lib/adminAuth'
import { DeliveryNotFoundError, regenerateDelivery, resendDelivery } from '../_lib/report'
import { launchBrowser, pageToPdf } from '../_lib/pdf'
import { classifyServerError } from '../_lib/errors'
import { carriesAttachments } from '../_lib/documentMatrix'

export const config = { maxDuration: 60 }

const MONTH_RE = /^\d{4}-\d{2}$/
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined

async function renderPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    return await pageToPdf(browser, html)
  } finally {
    await browser.close().catch(() => undefined)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method ?? 'GET'
  if (method !== 'GET' && method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const auth = await requireAdmin(req.headers)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

    if (method === 'POST') {
      const body = (req.body ?? {}) as { id?: unknown; action?: unknown }
      const id = String(body.id ?? '').trim()
      if (!id || body.action !== 'resend') return res.status(400).json({ error: 'id und action: "resend" sind erforderlich.' })
      const { id: newId } = await resendDelivery(id, async html => {
        try {
          return await renderPdf(html)
        } catch (err) {
          // The re-send still goes out with its Excel; the ledger row records has_pdf = false.
          console.error('[admin/documents] PDF render failed:', err instanceof Error ? err.message : err)
          return null
        }
      })
      return res.status(200).json({ ok: true, id: newId })
    }

    const id = first(req.query.id)
    if (id) {
      const as = first(req.query.as) ?? 'pdf'
      if (as !== 'pdf' && as !== 'xlsx' && as !== 'html') return res.status(400).json({ error: 'as muss pdf, xlsx oder html sein.' })
      const doc = await regenerateDelivery(id)
      res.setHeader('Cache-Control', 'no-store')
      if (as === 'html') {
        return res.status(200).json({ subject: doc.subject, html: doc.html, documentHtml: doc.pdfHtml })
      }
      if (!carriesAttachments(doc.delivery.kind)) {
        return res.status(404).json({ error: 'Dieses Dokument wurde nur als E-Mail versendet und hat keinen Anhang.' })
      }
      if (as === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename="${doc.fileStem}.xlsx"`)
        return res.status(200).send(doc.xlsx)
      }
      const pdf = await renderPdf(doc.pdfHtml)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileStem}.pdf"`)
      return res.status(200).send(pdf)
    }

    // List a month's deliveries.
    const supabase = makeAdminClient()
    const { data: monthRows, error: monthErr } = await supabase
      .from('document_deliveries')
      .select('report_month')
      .order('report_month', { ascending: false })
    if (monthErr) throw new Error(monthErr.message)
    const months = [...new Set((monthRows ?? []).map(r => r.report_month))]

    const requested = first(req.query.month)
    if (requested && !MONTH_RE.test(requested)) return res.status(400).json({ error: 'Ungültiger Monat.' })
    const month = requested ?? months[0] ?? null
    if (!month) return res.status(200).json({ months, month: null, deliveries: [] })

    const { data, error } = await supabase
      .from('document_deliveries')
      .select('id, report_month, kind, company_id, member_id, recipient_name, recipient_email, document_number, billing_document_id, gross_cents, has_pdf, has_xlsx, resend_of, sent_at')
      .eq('report_month', month)
      .order('sent_at', { ascending: false })
    if (error) throw new Error(error.message)
    // The company name, so a company document is recognisable by more than its
    // contact ("Office", "Buchhaltung") — the admin searches by company.
    const companyIds = [...new Set((data ?? []).map(d => d.company_id))]
    const { data: companyRows, error: companyErr } = companyIds.length
      ? await supabase.from('companies').select('id, name').in('id', companyIds)
      : { data: [], error: null }
    if (companyErr) throw new Error(companyErr.message)
    const names = new Map((companyRows ?? []).map(c => [c.id, c.name]))
    const deliveries = (data ?? []).map(d => ({ ...d, company_name: names.get(d.company_id) ?? '—' }))
    return res.status(200).json({ months, month, deliveries })
  } catch (err) {
    if (err instanceof DeliveryNotFoundError) return res.status(404).json({ error: 'Dokument nicht gefunden.' })
    console.error('[admin/documents]', err instanceof Error ? err.message : err)
    { const e = classifyServerError(err); return res.status(e.status).json({ error: e.error }) }
  }
}
