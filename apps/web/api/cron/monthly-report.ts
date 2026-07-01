import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMonthlyReport, fetchReportSettings } from '../_lib/report'

export const config = { maxDuration: 60 }

function isLastDayOfMonth(): boolean {
  const today = new Date()
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  return tomorrow.getDate() === 1
}

// The cron fires every day on the last days of the month (see vercel.json). The
// function decides whether today is the configured send day: a specific day of
// month, or the last day when none is set.
function isSendDay(autoDay: number | null): boolean {
  if (autoDay == null) return isLastDayOfMonth()
  return new Date().getDate() === autoDay
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers['authorization']
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { schedule } = await fetchReportSettings()

    if (!schedule.autoEnabled) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Automatic send disabled' })
    }
    if (!isSendDay(schedule.autoDay)) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Not the configured send day' })
    }

    await runMonthlyReport()
    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/monthly-report]', message)
    return res.status(500).json({ error: message })
  }
}
