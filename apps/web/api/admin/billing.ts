// PIN-protected admin billing API (service-role). Backs the invoice ledger view
// and the per-document paid/unpaid toggle (feature E).
//
//   GET   /api/admin/billing            → latest month's documents + month list
//   GET   /api/admin/billing?month=YYYY-MM
//   PATCH /api/admin/billing   body: { id, paid }
//
// Admin-only: returns recipient emails (like /api/admin/data). Never exposes the
// issuer IBAN or any secret.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, requireAdmin } from '../_lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method ?? 'GET'
  if (method !== 'GET' && method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAdmin(req.headers)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

    const supabase = makeAdminClient()

    if (method === 'PATCH') {
      const body = (req.body ?? {}) as { id?: unknown; paid?: unknown }
      const id = String(body.id ?? '').trim()
      if (!id) return res.status(400).json({ error: 'id fehlt.' })
      const paid = Boolean(body.paid)
      const { error } = await supabase.from('billing_documents').update({ paid }).eq('id', id)
      if (error) throw new Error(error.message)
      return res.status(200).json({ ok: true })
    }

    // GET — distinct months (newest first) + the selected month's documents.
    const { data: monthRows, error: monthErr } = await supabase
      .from('billing_documents')
      .select('report_month')
      .order('report_month', { ascending: false })
    if (monthErr) throw new Error(monthErr.message)
    const months = [...new Set((monthRows ?? []).map(r => r.report_month))]

    const requested = Array.isArray(req.query.month) ? req.query.month[0] : req.query.month
    const month = requested && months.includes(requested) ? requested : months[0]

    if (!month) return res.status(200).json({ documents: [], months: [] })

    const { data, error } = await supabase
      .from('billing_documents')
      .select('id, report_month, document_number, recipient_type, recipient_name, recipient_email, total_cents, status, paid, sent_at')
      .eq('report_month', month)
      .order('document_number', { ascending: true })
    if (error) throw new Error(error.message)

    return res.status(200).json({ documents: data ?? [], months })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/billing]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
