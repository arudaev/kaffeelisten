import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMonthlyReport, fetchReportSettings } from '../_lib/report'
import { computeDueReport } from '../_lib/schedule'

export const config = { maxDuration: 60 }

// The cron fires nightly (see vercel.json). Each fire asks whether an automatic
// report is due: the report always covers the PREVIOUS, fully-closed month
// (evaluated in Europe/Berlin), and `auto_report_day` is the day of this month
// on which that closed month is sent. Because runMonthlyReport is idempotent per
// report_month, a missed day is retried on the next fire (automatic catch-up).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers['authorization']
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { schedule } = await fetchReportSettings()
    const { due, targetMonth, reason } = computeDueReport(new Date(), schedule)

    if (!due) {
      return res.status(200).json({ ok: true, skipped: true, reason, targetMonth })
    }

    const result = await runMonthlyReport(targetMonth)
    return res.status(200).json({ ok: true, targetMonth, status: result.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/monthly-report]', message)
    return res.status(500).json({ error: message })
  }
}
