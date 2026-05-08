import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMonthlyReport } from '../_lib/report'

export const config = { maxDuration: 60 }

function isLastDayOfMonth(): boolean {
  const today = new Date()
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  return tomorrow.getDate() === 1
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers['x-cron-secret'] !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isLastDayOfMonth()) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'Not last day of month' })
  }

  try {
    await runMonthlyReport()
    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/monthly-report]', message)
    return res.status(500).json({ error: message })
  }
}
