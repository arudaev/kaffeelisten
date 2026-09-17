// Live progress of the monthly send, polled by the admin send dialog.
//
//   GET /api/admin/report-progress?month=YYYY-MM
//       → ReportProgress (shared/reportProgress.ts): the run's phase, documents
//         planned and sent per kind, the administration report and CEO archive,
//         failures, and delivery status from the Resend webhook.
//
// Admin-only. Counts documents of the latest run only (sent at or after its start),
// so an earlier send of the same month is not counted twice. Re-sends from the
// Dokumente page are left out.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, requireAdmin } from '../_lib/adminAuth'
import { classifyServerError } from '../_lib/errors'
import { readStoredProgress, summariseProgress, type ProgressRun } from '../../shared/reportProgress'

const MONTH_RE = /^\d{4}-\d{2}$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const auth = await requireAdmin(req.headers)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

    const month = String(Array.isArray(req.query.month) ? req.query.month[0] : req.query.month ?? '')
    if (!MONTH_RE.test(month)) return res.status(400).json({ error: 'month (YYYY-MM) ist erforderlich.' })

    const supabase = makeAdminClient()
    const { data: run, error: runError } = await supabase
      .from('report_runs')
      .select('status, started_at, completed_at, last_error, progress')
      .eq('report_month', month)
      .maybeSingle()
    if (runError) throw new Error(runError.message)

    let deliveries: { kind: string; resend_message_id: string | null }[] = []
    if (run) {
      const { data, error } = await supabase
        .from('document_deliveries')
        .select('kind, resend_message_id')
        .eq('report_month', month)
        .is('resend_of', null)
        .gte('sent_at', run.started_at)
      if (error) throw new Error(error.message)
      deliveries = data ?? []
    }

    const stored = run ? readStoredProgress(run.progress) : null
    const messageIds = [
      ...deliveries.map(d => d.resend_message_id),
      stored?.report.messageId ?? null,
      stored?.archive.messageId ?? null,
    ].filter((id): id is string => !!id)

    let events: { resend_message_id: string; event: string; occurred_at: string }[] = []
    for (let i = 0; i < messageIds.length; i += 100) {
      const { data, error } = await supabase
        .from('email_delivery_events')
        .select('resend_message_id, event, occurred_at')
        .in('resend_message_id', messageIds.slice(i, i + 100))
      if (error) throw new Error(error.message)
      events = events.concat(data ?? [])
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(summariseProgress((run as ProgressRun | null) ?? null, deliveries, events))
  } catch (err) {
    console.error('[admin/report-progress]', err instanceof Error ? err.message : err)
    const { status, error } = classifyServerError(err)
    return res.status(status).json({ error })
  }
}
